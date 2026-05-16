/**
 * `ccwf preview` HTTP server (+ optional Server-Sent Events for --watch).
 *
 * Unlike `ccwf canvas`, this server is read-only: there's no WebSocket and no
 * message-channel emulation. It just:
 *   - serves the bundled `overview.html` with an injected
 *     `<script>window.__CC_WF_PREVIEW__ = {...}</script>`
 *   - serves `/assets/*` from the same dist directory
 *   - (when `--watch`) holds long-lived `/events/:token` SSE connections that
 *     the page reloads on when the source file changes
 *
 * Threat model: localhost binding + URL token. Sufficient for single-user
 * developer-machine use, NOT a public-facing endpoint.
 */

import { randomBytes } from 'node:crypto';
import * as fs from 'node:fs/promises';
import { type IncomingMessage, type Server, type ServerResponse, createServer } from 'node:http';
import * as path from 'node:path';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
};

export interface PreviewServerOptions {
  /** Absolute path to the directory containing built webview assets (`overview.html`, `assets/*`). */
  webviewDistDir: string;
  /** Initial bootstrap config baked into `window.__CC_WF_PREVIEW__`. */
  bootstrap: PreviewBootstrap;
  /** Bind host. Default `127.0.0.1` — never bind to 0.0.0.0 without a token check. */
  host?: string;
  /** Preferred port. `0` (default) asks the OS for any free port. */
  port?: number;
  /**
   * Auto-shutdown after every SSE client disconnects, in ms. The timer starts
   * once at least one client has connected (so `--no-open` runs that nobody
   * ever opens don't shut themselves down). Set to `0` or omit to disable.
   */
  autoShutdownAfterMs?: number;
  /**
   * Invoked when the auto-shutdown timer fires. The server has already closed
   * by the time this runs; the CLI uses it to exit the process.
   */
  onAutoShutdown?: () => void;
}

export interface PreviewBootstrap {
  workflow: unknown;
  locale: string;
  /** Optional SSE URL for live-reload (set automatically when --watch). */
  sseUrl?: string;
}

export interface PreviewServerHandle {
  host: string;
  port: number;
  token: string;
  /** URL the user should open in their browser (`http://host:port/?token=...`). */
  url: string;
  /** Update the in-memory bootstrap; the page reads the new copy on its next reload. */
  setBootstrap(next: PreviewBootstrap): void;
  /** Push a `workflow-changed` SSE event to every connected client. */
  broadcastWorkflowChanged(): void;
  /** Shut down the HTTP server, close every open SSE client, and resolve. */
  close(): Promise<void>;
}

function tokenFromQuery(req: IncomingMessage): string | null {
  if (!req.url) return null;
  const idx = req.url.indexOf('?');
  if (idx < 0) return null;
  const params = new URLSearchParams(req.url.slice(idx + 1));
  return params.get('token');
}

function injectBootstrap(html: string, bootstrap: PreviewBootstrap): string {
  const inline = `<script>window.__CC_WF_PREVIEW__ = ${JSON.stringify(bootstrap)};</script>\n`;
  // Inject before the first <script type="module"> tag the built overview.html emits.
  // Fallback: prepend to </head> if no module script is found.
  const moduleTag = html.match(/<script[^>]+type="module"[^>]*>/);
  if (moduleTag) {
    return html.replace(moduleTag[0], `${inline}${moduleTag[0]}`);
  }
  return html.replace('</head>', `${inline}</head>`);
}

function isWithinDirectory(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

export async function startPreviewServer(
  options: PreviewServerOptions
): Promise<PreviewServerHandle> {
  const host = options.host ?? '127.0.0.1';
  const token = randomBytes(16).toString('hex');
  let bootstrap: PreviewBootstrap = options.bootstrap;
  const sseClients = new Set<ServerResponse>();
  const autoShutdownAfterMs = options.autoShutdownAfterMs ?? 0;
  let hasEverConnected = false;
  let shutdownTimer: NodeJS.Timeout | null = null;
  let shuttingDown = false;

  const cancelShutdownTimer = (): void => {
    if (shutdownTimer) {
      clearTimeout(shutdownTimer);
      shutdownTimer = null;
    }
  };

  const armShutdownTimerIfIdle = (): void => {
    if (
      autoShutdownAfterMs <= 0 ||
      shuttingDown ||
      !hasEverConnected ||
      sseClients.size > 0 ||
      shutdownTimer !== null
    ) {
      return;
    }
    shutdownTimer = setTimeout(() => {
      shutdownTimer = null;
      if (shuttingDown || sseClients.size > 0) return;
      shuttingDown = true;
      // Best-effort teardown: rip down any lingering keep-alive sockets first
      // (browsers and curl both leave HTTP/1.1 connections idle for many
      // seconds otherwise, which would block httpServer.close from resolving
      // and the caller's process.exit from happening promptly), then fire the
      // callback without awaiting close — the CLI hands us a process.exit, so
      // any remaining handles are torn down by the runtime.
      try {
        httpServer.closeAllConnections?.();
      } catch {
        // ignore
      }
      void closeInternal();
      options.onAutoShutdown?.();
    }, autoShutdownAfterMs);
  };

  const closeInternal = async (): Promise<void> => {
    cancelShutdownTimer();
    for (const client of sseClients) {
      try {
        client.end();
      } catch {
        // ignore
      }
    }
    sseClients.clear();
    try {
      httpServer.closeAllConnections?.();
    } catch {
      // ignore
    }
    await new Promise<void>((resolve, reject) => {
      httpServer.close((error) => (error ? reject(error) : resolve()));
    });
  };

  const serveStatic = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const rawUrl = req.url ?? '/';
    const pathname = rawUrl.split('?')[0];

    if (pathname === '/' || pathname === '/index.html') {
      if (tokenFromQuery(req) !== token) {
        res.statusCode = 403;
        res.setHeader('content-type', 'text/plain; charset=utf-8');
        res.end('Forbidden: token missing or invalid.\n');
        return;
      }
      try {
        const raw = await fs.readFile(path.join(options.webviewDistDir, 'overview.html'), 'utf-8');
        const html = injectBootstrap(raw, bootstrap);
        res.statusCode = 200;
        res.setHeader('content-type', MIME_TYPES['.html']);
        res.setHeader('cache-control', 'no-store');
        res.end(html);
      } catch (error) {
        res.statusCode = 500;
        res.end(`Failed to load overview.html: ${(error as Error).message}\n`);
      }
      return;
    }

    if (pathname.startsWith('/events/')) {
      const expectedPath = `/events/${token}`;
      if (pathname !== expectedPath) {
        res.statusCode = 403;
        res.end('Forbidden\n');
        return;
      }
      res.statusCode = 200;
      res.setHeader('content-type', 'text/event-stream; charset=utf-8');
      res.setHeader('cache-control', 'no-store');
      res.setHeader('connection', 'keep-alive');
      // Flush a comment to nudge intermediaries (corporate proxies) into
      // releasing the response headers immediately.
      res.write(': ccwf-preview connected\n\n');
      sseClients.add(res);
      hasEverConnected = true;
      // A new client is keeping the server alive; cancel any pending auto-shutdown.
      cancelShutdownTimer();
      const heartbeat = setInterval(() => {
        try {
          res.write(': heartbeat\n\n');
        } catch {
          // best-effort
        }
      }, 30000);
      req.on('close', () => {
        clearInterval(heartbeat);
        sseClients.delete(res);
        // Last browser left? Start the auto-shutdown countdown.
        armShutdownTimerIfIdle();
      });
      return;
    }

    const relative = pathname.replace(/^\/+/, '');
    const target = path.resolve(options.webviewDistDir, relative);
    if (!isWithinDirectory(options.webviewDistDir, target)) {
      res.statusCode = 403;
      res.end('Forbidden\n');
      return;
    }
    try {
      const contents = await fs.readFile(target);
      const ext = path.extname(target).toLowerCase();
      res.statusCode = 200;
      res.setHeader('content-type', MIME_TYPES[ext] ?? 'application/octet-stream');
      res.end(contents);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        res.statusCode = 404;
        res.end('Not Found\n');
      } else {
        res.statusCode = 500;
        res.end(`Server error: ${(error as Error).message}\n`);
      }
    }
  };

  const httpServer: Server = createServer((req, res) => {
    serveStatic(req, res).catch((error) => {
      res.statusCode = 500;
      res.end(`Server error: ${(error as Error).message}\n`);
    });
  });

  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(options.port ?? 0, host, () => {
      httpServer.off('error', reject);
      resolve();
    });
  });

  const address = httpServer.address();
  if (!address || typeof address === 'string') {
    throw new Error('Preview server did not return an inet address.');
  }
  const port = address.port;

  return {
    host,
    port,
    token,
    url: `http://${host}:${port}/?token=${token}`,
    setBootstrap(next) {
      bootstrap = next;
    },
    broadcastWorkflowChanged() {
      const message = 'event: workflow-changed\ndata: {}\n\n';
      for (const client of sseClients) {
        try {
          client.write(message);
        } catch {
          // best-effort; closed sockets get cleaned up on their own.
        }
      }
    },
    async close() {
      shuttingDown = true;
      await closeInternal();
    },
  };
}
