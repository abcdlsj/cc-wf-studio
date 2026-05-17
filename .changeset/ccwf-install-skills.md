---
"@cc-wf-studio/cli": minor
---

Bundle a Claude Code Skill (`ccwf-cli`) and ship `ccwf install-skills` to install it.

The Skill teaches AI coding agents — Claude Code in particular — when to reach for the `ccwf` CLI and which subcommand fits the user's request. Its description is intentionally broad (any mention of viewing, validating, executing, or converting a workflow file under `.vscode/workflows/` or any `*workflow*.json`), and `allowed-tools` whitelists `Bash(ccwf:*)` + `Bash(npx @cc-wf-studio/cli:*)` so Claude can invoke the CLI without per-command permission prompts. The body of `SKILL.md` is a reference: prerequisites, the validate → preview → run / export workflow, one section per subcommand (including the new `install-skills` itself), a user-phrasing → subcommand mapping table, and tips around the per-session UUID URL slug + auto-shutdown behaviour.

`ccwf install-skills` copies the bundled `SKILL.md` (and any future supporting files under `packages/cli/skills/`) into `~/.claude/skills/ccwf-cli/` by default, or `./.claude/skills/ccwf-cli/` with `--project`. `--overwrite` is required when a destination already exists; `--dry-run` prints the plan without writing. No new runtime dependencies; the resolver looks at `<pkg>/dist/skills/` for installed runs and `<pkg>/skills/` for tsx-based development runs, mirroring how `preview` / `canvas` discover the bundled webview.

The CLI build chain now includes a `sync:skills` step (`packages/cli/skills/` → `packages/cli/dist/skills/`), and `dist/skills/` is part of the npm tarball via the existing `"files": ["dist", "README.md"]` declaration.
