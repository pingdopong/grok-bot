# grok-bot

A fork of [`b-nnett/grok-bot-0.18-reconstructed`](https://github.com/b-nnett/grok-bot-0.18-reconstructed),
restructured as a Turborepo monorepo.

> **Not affiliated with Anysphere Incorporated, Cursor, xAI, or SpaceX.** This is an unofficial fork
> of an unofficial reconstruction. It is not an official Grok Bot build, and no endorsement is
> claimed or implied. See [ATTRIBUTION.md](ATTRIBUTION.md).

## Status

- **No binaries are distributed from this repository.** There is no release, no installer, and no
  update feed. CI carries no publishing job.
- Upstream is **archived** (read-only since 2026-08-23), so there is no sync cadence to keep.
- Upstream grants **no source-code licence** — see [`apps/desktop/NOTICE.md`](apps/desktop/NOTICE.md)
  and [`apps/desktop/PROVENANCE.md`](apps/desktop/PROVENANCE.md). Anyone considering distribution
  must complete an independent rights review first.
- The preserved upstream installers were removed from this fork's tree; the provenance record for
  them is kept.

## Layout

| Path            | What it is                                                           |
| --------------- | -------------------------------------------------------------------- |
| `apps/desktop/` | The upstream reconstruction. Unchanged except where marked `[FORK]`. |

`upstream-mirror` is a branch holding upstream's history untouched, so
`git diff upstream-mirror..main` is the complete set of this fork's changes at any moment.

## Requirements

- Node.js 26.5.x (pinned in `.node-version`)
- pnpm 10.27.x
- macOS on Apple Silicon — **for packaging only**

## Build

```sh
pnpm install
pnpm turbo run typecheck source:typecheck test frontend:build
```

Those four tasks run on Windows, macOS and Linux. Packaging the desktop application
(`bootstrap`, `package`, `verify`) is macOS/arm64 only and is documented in
[`apps/desktop/README.md`](apps/desktop/README.md).
