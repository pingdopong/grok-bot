# Contributing

This is a fork of an archived upstream project. The rules below exist to keep the
difference between us and upstream small and explainable — that difference is the
entire maintenance cost of a fork.

Upstream's own contributor guide is preserved at
[`apps/desktop/CONTRIBUTING.md`](apps/desktop/CONTRIBUTING.md).

## Upstream first — in principle

A bug in upstream code should be fixed upstream, not here. Upstream is
**archived** and cannot accept pull requests today, so in practice fixes land
here. That does not make it routine: write the fix so it _could_ be sent
upstream, and record it in `docs/fork/CUSTOMIZATIONS.md` with an honest answer to
"is this upstreamable?".

If upstream is ever unarchived, that list is the backlog we work through to
shrink the fork.

## Take the cheapest customization that works

In ascending cost (GUIDE-FORK-WHITELABEL-UPSTREAM §4):

1. configuration upstream already supports;
2. **a new file** upstream does not have;
3. an official extension point;
4. **editing an upstream file** — a permanent tax, because every edit is a
   conflict candidate forever.

Prefer adding a file over editing one. When you must edit an upstream file,
concentrate the change and mark it `[FORK]` in place, then list it in
`docs/fork/CUSTOMIZATIONS.md`.

**Never run the formatter over `apps/desktop/`.** It is excluded on purpose; see
`docs/fork/decisions/0004-nao-reformatar-a-arvore-upstream.md`.

## Working setup

Every task gets its own worktree and branch; `main` only advances through a pull
request.

```sh
git worktree add ../grok-bot.worktrees/<task> -b <type>/<task>
cd ../grok-bot.worktrees/<task>
pnpm install
```

**Run `pnpm install` in each new worktree before your first commit.** Worktrees
share `.git/hooks`, so the Lefthook hooks fire everywhere — but they resolve
`oxlint` and `oxfmt` from the worktree's own `node_modules`, and the commit fails
without them.

Requires Node 26.5.x (pinned in `.node-version`) and pnpm 10.27.x.

## Before opening a pull request

```sh
pnpm turbo run format:check lint typecheck source:typecheck frontend:build test
```

`publication:check` needs `/usr/bin/git` and `/usr/bin/tar`; it runs in CI on
Linux and macOS, not in Git Bash on Windows. Packaging (`bootstrap`, `package`,
`verify`) is macOS/arm64 only and runs through the manual-dispatch workflow.

Do not weaken checksum, bundle-identity, code-signing, or clean-export checks to
make a build pass. That rule is upstream's and it still holds here.

## What needs a written decision

Some changes need an ADR in `docs/fork/decisions/` before the code:

- anything that changes the fork's relationship to upstream (sync strategy,
  layout, formatting policy);
- anything that touches distribution. Read
  `docs/fork/decisions/0006-gate-juridico-de-distribuicao.md` first: this
  repository distributes no artifacts, and that is a deliberate, blocking
  decision — not an oversight to fix.
