#!/usr/bin/env node
/**
 * `ccwf` — cc-wf-studio command-line entry.
 *
 * Subcommands are wired in subsequent commits:
 *   - render <file>                 (commit 4)
 *   - validate <file>               (commit 5)
 *   - mcp --file <file>             (commit 6)
 *   - run <file> [--overwrite]      (commit 7)
 */

import { Command } from 'commander';

const program = new Command();

program
  .name('ccwf')
  .description('Command-line tool for cc-wf-studio workflows.')
  .version('0.0.0');

program.parseAsync(process.argv).catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exit(1);
});
