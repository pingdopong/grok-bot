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
| `docs/fork/`    | Why this fork exists, what we changed, and how to sync.              |

`upstream-mirror` is a branch holding upstream's history untouched, so
`git diff upstream-mirror..main` is the complete set of this fork's changes at any moment.

## Requirements

To work on the code:

- Node.js 26.5.x (pinned in `.node-version`)
- pnpm 10.27.x

To **run or package** the application, additionally:

- macOS on Apple Silicon
- A local copy of the pinned Grok Bot 0.18.0 artifact

> **The upstream download URL is gone.** As of 2026-08-31 the pinned DMG URL
> returns HTTP 403 from every network tested, so `bootstrap` cannot fetch it.
> Packaging now requires you to supply the artifact yourself — point
> `GROK_BOT_018_APP` at an existing installed copy, or place the DMG in
> `apps/desktop/.cache/downloads/`. This repository does not host it; see
> [`docs/fork/PACKAGING.md`](docs/fork/PACKAGING.md).

## What runs where

The application is a macOS arm64 `.app`, and its renderer comes out of the pinned DMG. That makes
the platform boundary sharper than "packaging is macOS-only" suggests:

| Task                                   | Windows                             | macOS arm64            |
| -------------------------------------- | ----------------------------------- | ---------------------- |
| `pnpm install`, `lint`, `format:check` | yes                                 | yes                    |
| `typecheck`, `source:typecheck`        | yes                                 | yes                    |
| `test`                                 | yes                                 | yes                    |
| `frontend:build`                       | yes                                 | yes                    |
| `publication:check`                    | no — needs `/usr/bin/git` and `tar` | yes                    |
| Vite dev server for `frontend/`        | **no**                              | yes, after `bootstrap` |
| `bootstrap-windows` + `build`          | **yes**                             | not applicable         |
| `run:windows`                          | **yes** — renders the login screen  | not applicable         |
| `bootstrap`, `package`, `verify`       | no                                  | yes                    |

Two things are easy to miss:

- `apps/desktop/scripts/lib/system-tools.mjs` hardcodes `/usr/bin/hdiutil`, `/usr/bin/codesign`
  and `/usr/bin/plutil`. There is no non-macOS packaging path — Windows never produces an
  installer or a distributable binary.
- **The Vite dev server is not a way around that.** Its `configureServer` hook reads
  `apps/desktop/src/app/dist/renderer/index.html`, which only `bootstrap`/`bootstrap-windows`
  produces.

So on Windows you get a real development loop over the reconstructed TypeScript — edit,
typecheck, test, build — and, unlike before, a build that actually completes and an application
that renders a UI: the window opens on the login screen, confirmed via the renderer DOM
(`"Grok Bot"` heading, `"Sign in"` button) and a screenshot in
[`docs/fork/assets/`](docs/fork/assets/grok-bot-windows-render.png). Real login, and anything
past that first screen, has not been exercised — see
[`docs/fork/WINDOWS.md`](docs/fork/WINDOWS.md) for the full trace and
[ADR 0008](docs/fork/decisions/0008-suporte-a-windows.md) for the decisions behind this support.

## Build

```sh
pnpm install
pnpm turbo run format:check lint typecheck source:typecheck frontend:build test
```

Packaging is documented in [`docs/fork/PACKAGING.md`](docs/fork/PACKAGING.md); upstream's own
build notes are preserved in [`apps/desktop/README.md`](apps/desktop/README.md).
