# Security

This is a fork. Its security posture is not the upstream project's, and reports
about **this** build should come here, not to upstream.

## Reporting

Report privately through GitHub's **Report a vulnerability** flow on this
repository's Security tab. Please do not open a public issue for a suspected
vulnerability.

## Scope

This repository builds nothing that is distributed. There is no release, no
installer, no update feed, and no signing key. A vulnerability here affects
people who build from source, not a shipped product.

What is in scope: this fork's own code — `packages/`, `scripts/`, the CI
workflows, and the `[FORK]`-marked edits inside `apps/desktop/`.

What is **not** in scope, and should be understood before reporting:

- **Inherited advisories in pinned dependencies.** `apps/desktop/SECURITY.md`
  records that the reconstruction is compatibility-bound to Electron 42.1,
  Undici 5, Connect 1, AI SDK 4, and an OpenTelemetry stack that `npm audit`
  flags. Those pins are part of the reconstruction's fidelity, and upstream is
  archived, so they will not be bumped casually. They are tracked, not ignored.
- **The upstream reconstruction's own behavior.** Findings about the
  reconstructed runtime belong upstream in principle — but upstream is archived
  and cannot accept them. Report them here and we will record them.

## What this fork changed that is security-relevant

- The preserved upstream installers were removed from the tracked tree. Nothing
  in this repository redistributes third-party binaries.
- The macOS bundle identifier no longer claims Anysphere's reverse-DNS
  namespace.
- The inherited CI workflow was removed and replaced. No workflow in this
  repository publishes anything or holds a signing credential.
- Dependency updates for `apps/desktop` are deliberately excluded from
  Dependabot, because the pinned graph is verified by the reconstruction's own
  production-activation checks. Changing it is a contract change, not routine
  maintenance.
