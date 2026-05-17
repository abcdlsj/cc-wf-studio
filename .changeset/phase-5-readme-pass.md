---
---

Documentation-only pass introducing per-package READMEs and the monorepo's root README. No package code changes; no version bumps.

- Adds the monorepo's root `README.md`, mirroring the published VSCode extension README so visitors landing from external links (X, blog posts, etc.) keep the existing marketing hero. Image paths point at `packages/vscode/resources/` since the monorepo restructure relocated the assets.
- Adds a `packages/core/README.md` that documents every module under `@cc-wf-studio/core` and the canonical "validate → migrate → render → plan" usage flow.
- Cross-links `packages/cli/README.md` and `packages/mcp/README.md` to the monorepo README so anyone landing on either npm page (once published) can discover the sibling interfaces.

The full three-interface overview (Mermaid data-flow diagram + per-interface quick start) will land alongside the first `@cc-wf-studio/cli` and `@cc-wf-studio/mcp` npm publish — until those packages exist, the README intentionally keeps the VSCode extension as the only install path.
