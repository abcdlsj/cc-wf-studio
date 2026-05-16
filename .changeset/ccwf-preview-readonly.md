---
"@cc-wf-studio/cli": minor
"cc-wf-studio": patch
---

Add `ccwf preview <file>` — a lightweight, read-only viewer that opens the cc-wf-studio overview (Mermaid + per-node Markdown panes) for a single workflow in a local browser.

Unlike the heavyweight `ccwf canvas` (which mirrors the full VSCode editor through a WebSocket-backed message channel), `preview` serves a single static HTML page with the workflow JSON injected at boot. No editor, no `Save` button, no extension RPCs — just the existing `WorkflowOverview` React component rendered standalone. The page subscribes to a Server-Sent Events channel when `--watch` is in effect, and reloads itself whenever the source file changes on disk.

Internals:

- New `overview.html` + `src/overview-entry.tsx` + `src/overview-polyfill.ts` entry in `cc-wf-studio-webview`. Polyfill intercepts the one bridge call the read-only surface makes (`OPEN_EXTERNAL_URL` for markdown links) and reroutes it through `window.open`. Vite emits two rollup inputs (`main` for the canvas, `overview` for preview).
- `@cc-wf-studio/cli` ships an HTTP server (`src/preview/server.ts`) and an `fs.watch`-based debounced file watcher (`src/preview/watcher.ts`). No new runtime dependencies; the `ws` package stays canvas-only.
- The `vscode` accessor previously embedded in `main.tsx` moved to `services/vscode-api.ts`. `main.tsx` re-exports it for backward compat, but the new overview entry imports it directly so it no longer drags in the canvas bootstrap.

Flags: `--port`, `--host`, `--no-open`, `--watch`, `--keep-alive`. Localhost-bound by default with a random URL token on both the entry URL and the `/events/<token>` SSE channel. The browser keeps a Server-Sent Events stream open for the lifetime of the page; the server auto-shuts down 30 seconds after the last viewer disconnects (the countdown only starts once at least one client has connected, so a `--no-open` boot that nobody opens stays alive). Pass `--keep-alive` to keep the server running until you Ctrl+C (multiple tabs / LAN sharing / reconnect later).
