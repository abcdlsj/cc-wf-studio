---
"@cc-wf-studio/mcp": minor
"@cc-wf-studio/core": patch
"cc-wf-studio": patch
---

Introduce `@cc-wf-studio/mcp`: a transport-agnostic MCP server toolkit that ships the cc-wf-studio workflow tool definitions, a `WorkflowIoAdapter` contract, and a new standalone stdio bin `cc-wf-mcp --file <path>` for editing workflow JSON files outside the VSCode canvas. The VSCode extension's in-process HTTP server is refactored to consume the same factory through a `CanvasWorkflowAdapter` (no user-visible behavior changes — tool names, arguments, and response shapes are preserved). `@cc-wf-studio/core` adds `.js` extensions on its relative imports so the new bin can resolve the package under Node ESM without a bundler.
