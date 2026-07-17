# GitHub Configuration

## Issue intake

Issue Forms are configured under `.github/ISSUE_TEMPLATE/`:

- `implementation.yml` captures user outcome, scope, validation, and proxy-security considerations.
- `bug.yml` captures reproducible behavior while reminding reporters to redact secrets and personal data.
- `technical-debt.yml` records maintainability, reliability, and security remediation work.
- `config.yml` disables blank issues and directs security reports and questions to appropriate channels.

Repository maintainers should create the `enhancement`, `bug`, and `technical-debt` labels referenced by these forms if they do not already exist.

## Pull requests

`.github/pull_request_template.md` requires a summary, scope, validation record, security/data/accessibility confirmation, and documentation/rollout notes. Attach screenshots for perceptible UI changes.

## Continuous integration

`pull-request-validation.yml` runs for pull requests targeting `main` and can be dispatched manually. It checks out code, installs the lockfile-defined graph with `npm ci`, then runs `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` on Node.js 20. Enable the workflow as a required branch-protection check after its first successful run.
