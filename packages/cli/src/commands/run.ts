/**
 * `ccwf run <file>` — for now, a thin wrapper over `ccwf export`.
 *
 * Today this just calls `runExport` and appends a "next step" hint pointing
 * the user at Claude Code (or the chosen agent). In a later phase, `run` will
 * spawn `claude` itself and let the agent perform the skill export +
 * execution. The contract for `<file>` and the flags (`--agent`, `--cwd`,
 * `--overwrite`) is intentionally identical to `ccwf export` so the future
 * change is backward-compatible.
 */

import { spawn } from 'node:child_process';
import * as path from 'node:path';
import { Command } from 'commander';
import { findBinaryInPath } from '../utils/find-binary.js';
import { WorkflowLoadError } from '../utils/load-workflow.js';
import { asSupportedAgent, runExport } from './export.js';

interface CommanderRunOptions {
  agent: string;
  overwrite: boolean;
  cwd?: string;
  launch: boolean;
}

const NEXT_STEP_HINTS: Record<string, (slash: string) => string> = {
  'claude-code': (slash) => `launch Claude Code and run \`/${slash}\``,
  antigravity: (slash) => `open Antigravity and run the "${slash}" skill`,
  codex: (slash) => `start Codex CLI and run \`$${slash}\``,
  copilot: (slash) => `start Copilot CLI and run \`/${slash}\``,
  cursor: (slash) => `open Cursor and trigger the "${slash}" skill`,
  gemini: (slash) => `start Gemini CLI and run \`${slash}\``,
  'roo-code': (slash) => `open Roo Code and run \`:${slash}\``,
};

export function registerRunCommand(program: Command): void {
  program
    .command('run')
    .description(
      'Materialise the workflow (same as ccwf export) and print follow-up instructions for the target agent.'
    )
    .argument('<file>', 'Path to a workflow JSON file.')
    .option(
      '--agent <name>',
      'Target agent (claude-code | antigravity | codex | copilot | cursor | gemini | roo-code).',
      'claude-code'
    )
    .option('--overwrite', 'Overwrite existing files instead of erroring.', false)
    .option(
      '--cwd <dir>',
      'Output root. Defaults to process.cwd(). Useful for tests / scripted runs.'
    )
    .option(
      '--launch',
      'After writing files, also spawn the agent CLI (best-effort, claude-code only for now).',
      false
    )
    .action(async (file: string, options: CommanderRunOptions) => {
      try {
        const agent = asSupportedAgent(options.agent);
        const result = await runExport({
          file,
          agent,
          overwrite: options.overwrite,
          cwd: options.cwd,
        });

        process.stdout.write(`✓ Wrote ${result.writtenPaths.length} file(s):\n`);
        for (const writtenPath of result.writtenPaths) {
          process.stdout.write(`  - ${path.relative(result.rootDir, writtenPath)}\n`);
        }

        const hint = NEXT_STEP_HINTS[agent](result.slashName);
        process.stdout.write(`\nNext: in ${result.rootDir}, ${hint}.\n`);

        if (options.launch) {
          if (agent !== 'claude-code') {
            process.stderr.write(
              `warn: --launch is currently only supported for --agent claude-code. Skipping launch.\n`
            );
            return;
          }
          const claudeBin = await findBinaryInPath('claude');
          if (!claudeBin) {
            process.stderr.write(
              `warn: --launch requested but \`claude\` was not found on PATH. Files were written; please launch Claude Code manually and run /${result.slashName}.\n`
            );
            return;
          }
          process.stdout.write(`\nLaunching: ${claudeBin} (cwd ${result.rootDir})\n`);
          const child = spawn(claudeBin, [], {
            cwd: result.rootDir,
            stdio: 'inherit',
            shell: false,
          });
          await new Promise<void>((resolve) => {
            child.on('exit', (code) => {
              if (typeof code === 'number' && code !== 0) {
                process.exitCode = code;
              }
              resolve();
            });
            child.on('error', (error) => {
              process.stderr.write(`error: failed to launch claude: ${error.message}\n`);
              process.exitCode = 1;
              resolve();
            });
          });
        }
      } catch (error) {
        if (error instanceof WorkflowLoadError) {
          process.stderr.write(`error: ${error.message}\n`);
          process.exit(error.exitCode);
        }
        throw error;
      }
    });
}
