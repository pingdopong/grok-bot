# Attribution

This repository is a fork maintained by Ping do Pong. It is **not** affiliated with, endorsed by,
or connected to Anysphere Incorporated, Cursor, xAI, or SpaceX.

## Origin

| | |
| --- | --- |
| Upstream | `https://github.com/b-nnett/grok-bot-0.18-reconstructed` |
| Fork baseline (upstream commit) | `a9f633e09d49a85829b8236331b9e21f7e612634` |
| Upstream package version at baseline | `0.18.0-reconstructed.1` |
| Upstream release tags | none published |
| Upstream repository state | archived read-only on 2026-08-23 |
| Forked on | 2026-08-30 |

Upstream publishes no release tags, so the baseline is recorded as a pinned commit SHA rather than
a tag. The `upstream-mirror` branch in this repository holds that history untouched and is never
edited; `git diff upstream-mirror..main` is therefore the complete set of our changes at any
moment.

Because upstream is archived, there is no sync cadence to keep. A scheduled job watches for the
repository being unarchived or receiving new commits, and opens an issue if either happens.

## Upstream rights and obligations

`NOTICE.md` states that upstream asserts and grants no source-code licence, and that anyone
publishing or distributing the repository must independently review copyright, trademark,
third-party dependency, and service-terms obligations. That statement is unchanged here and
applies to this fork in full.

`NOTICE.md` and `PROVENANCE.md` are preserved byte for byte. Upstream ships no `LICENSE` file and
none has been added here, because we are not in a position to license code we did not author.

This fork **does not distribute built artifacts**. No release, installer, or update feed is
published from this repository, and its CI contains no publishing job. The packaging workflow is
manual-dispatch only and retains its output as a CI artifact.

"Grok Bot" and the marks of Anysphere, Cursor, xAI, and SpaceX belong to their respective owners
and appear here only to describe the origin of the code.

## Changes made in this fork

Every edit to a file authored upstream is marked in place with a `[FORK]` comment and listed in
`docs/fork/CUSTOMIZATIONS.md`.

- **Removed the inherited CI workflow** (`.github/workflows/check.yml`). It triggered on every
  push to every branch. This fork builds its own workflows instead.
- **Added this file.**
