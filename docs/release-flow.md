# Release Flow

This repository uses **[Changesets](https://github.com/changesets/changesets)** to manage versioning and publishing across the pnpm workspace. There is a **single release branch (`main`)** — all releases originate from PRs merged into `main`.

## TL;DR for contributors

1. Open a feature/fix PR against `main`.
2. If your change affects a published package, run `pnpm changeset` locally and commit the generated `.changeset/<name>.md` file.
3. Merge your PR. A bot will open or update a `chore(release): version packages` PR collecting all pending changesets.
4. Merging that bot PR cuts the actual release: tags, npm publish for `@cc-wf-studio/*`, and a GitHub Release with the VSIX attached for `cc-wf-studio`.

## Branch model

- `main` is the only long-lived release branch. Feature work branches off `main` and merges back via PR.
- There is no `production` branch. (Removed in the monorepo restructure.)

## What each package looks like at release

| Package | npm | GitHub Release tag | VSIX attached |
|---|---|---|---|
| `@cc-wf-studio/core` | ✅ public | `@cc-wf-studio/core@x.y.z` | — |
| `@cc-wf-studio/cli` | ✅ public | `@cc-wf-studio/cli@x.y.z` | — |
| `@cc-wf-studio/mcp` | ✅ public | `@cc-wf-studio/mcp@x.y.z` | — |
| `cc-wf-studio` (VSCode extension) | ❌ private | `cc-wf-studio@x.y.z` | ✅ `cc-wf-studio-x.y.z.vsix` |

`cc-wf-studio` is marked `"private": true` so Changesets versions and tags it but does not push it to npm. The VSIX is built and uploaded to the corresponding GitHub Release by the workflow.

> **Marketplace / Open VSX** auto-publish is **not** wired up in this Phase 1 setup. Publishing the VSIX to the VSCode Marketplace and Open VSX is currently a manual step performed by a maintainer after the VSIX has been generated.

## End-to-end flow

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant Branch as feature branch
    participant Main as main
    participant CSBot as changesets/action
    participant VPR as "Version Packages" PR
    participant NPM as npm registry
    participant GH as GitHub Release

    Dev->>Branch: Implement change
    Dev->>Branch: pnpm changeset (adds .changeset/xxx.md)
    Dev->>Main: PR merge

    Main->>CSBot: workflow runs
    alt unreleased .changeset/*.md exist
        CSBot->>VPR: Open/update "Version Packages" PR<br/>(bumps versions, updates CHANGELOG.md)
    end

    Note over Dev,VPR: maintainer reviews bot PR

    Dev->>VPR: review → merge
    VPR->>Main: version bump commit lands

    Main->>CSBot: workflow runs again
    CSBot->>CSBot: consumes changesets (no pending left)
    CSBot->>NPM: publishes public packages<br/>(@cc-wf-studio/*)
    CSBot->>GH: tags + Releases per package
    CSBot->>GH: cc-wf-studio (private) gets tag + Release
    Note over GH: workflow detects cc-wf-studio@x.y.z tag,<br/>builds VSIX, uploads to its Release
```

## Independent versions

Each workspace package is versioned independently — there is no `fixed` or `linked` group in `.changeset/config.json`. The intent:

```mermaid
flowchart LR
    Core["@cc-wf-studio/core<br/>0.x.y"]
    CLI["@cc-wf-studio/cli<br/>0.x.y"]
    MCP["@cc-wf-studio/mcp<br/>0.x.y"]
    VSCode["cc-wf-studio<br/>3.x.y (continued)"]

    Core -.->|workspace:* dep| CLI
    Core -.->|workspace:* dep| MCP
    Core -.->|workspace:* dep| VSCode

    note["・New packages start at 0.x<br/>・cc-wf-studio continues from 3.34.x<br/>・workspace:* resolves to real versions on publish"]
```

Notes:

- `cc-wf-studio` keeps its existing 3.34.x version stream so the Marketplace listing remains continuous.
- New packages start at low pre-1.0 versions until their APIs settle (the [Changesets docs](https://github.com/changesets/changesets/blob/main/docs/decisions.md) cover when to graduate).
- `workspace:*` dependencies between local packages are replaced with the actual published versions when `changeset publish` runs.

## Required secrets

The release workflow requires these repository secrets:

| Secret | Purpose |
|---|---|
| `RELEASE_BOT_APP_ID` | GitHub App ID used to author release commits/PRs as a bot (so subsequent workflows can be triggered). |
| `RELEASE_BOT_PRIVATE_KEY` | Private key for the above GitHub App. |
| `NPM_TOKEN` | Token for publishing `@cc-wf-studio/*` to npm. **Required even though Phase 1 ships only skeletons** — Changesets will silently skip the publish step if all bumped packages are private, but the token is still validated when `changeset publish` runs. |

## Authoring a changeset

```bash
pnpm changeset
```

The interactive prompt asks:

1. Which packages changed? (Use space to select.)
2. What bump level? (`patch` / `minor` / `major`).
3. A summary used for the changelog entry.

Commit the generated file alongside your code change. CI will pick it up on merge.

## What doesn't trigger a release

- Pushes to branches other than `main`.
- Merges that contain no `.changeset/*.md` (no version bump → no PR opened).
- Pure docs / chore PRs where you intentionally omit a changeset.

## Previous release flow (for reference)

Before the monorepo restructure, releases were driven by **`semantic-release`** on push to a separate `production` branch:

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant Main as main
    participant Prod as production
    participant SR as semantic-release
    participant GH as GitHub Release

    Dev->>Main: feature/fix PR merge<br/>(conventional commit prefix)
    Dev->>Prod: PR main → production
    Prod->>SR: push trigger
    SR->>SR: parse commit messages → next version
    SR->>Prod: commit chore(release): X.Y.Z [skip ci]
    SR->>GH: create Release vX.Y.Z + attach VSIX
    Prod->>Main: auto-sync production → main
```

Both the `production` branch and `semantic-release` are removed; the equivalent capability is now provided by Changesets on `main`.
