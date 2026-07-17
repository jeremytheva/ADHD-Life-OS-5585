# Contributing

## Start here

Read `AGENTS.md`, the product and architecture documents, and the issue template that matches the work. Create a focused branch and keep commits scoped to the requested change.

## Development setup

```bash
npm ci
npm run dev
```

Use Node.js 20 or later for the supported CI workflow. The application expects a NoCodeBackend environment only for live auth/data interactions; unit and contract tests do not require it.

## Contribution expectations

- Use functional React components, preserve accessible interactions, and keep the experience low-stimulation.
- Validate browser inputs and data contracts through the existing schemas rather than accepting arbitrary objects.
- Keep server credentials out of browser code and retain the same-origin NoCodeBackend proxy boundary.
- Add tests for changed behavior, update relevant documentation, and do not commit generated artifacts, lockfile hand edits, `.env` files, or secrets.
- Complete the pull request template honestly, including validation, scope, accessibility, security, and rollout details.

## Review suggestions

Reviewers should verify that scope is contained; behavior and docs agree; tests cover changed contracts; accessibility is considered; and proxy/security controls are not weakened. Prefer follow-up issues for unrelated improvements over expanding a pull request.
