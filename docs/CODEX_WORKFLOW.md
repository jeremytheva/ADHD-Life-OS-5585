# Codex Workflow

## Before editing

1. Read `AGENTS.md` and any more-specific `AGENTS.md` in the target directory tree.
2. Inspect the existing implementation, related tests, package scripts, and documentation.
3. Define a small scope and identify required checks before changing files.

## Implementation rules

- Make the minimum coherent change; do not mix cleanup or dependency upgrades with unrelated work.
- Follow React/Vite conventions and use existing validation schemas and service boundaries.
- Treat `api/ncb/` as a security-sensitive trust boundary. Never expose secrets through Vite variables or introduce an unrestricted proxy.
- Add deterministic tests and documentation when changing visible behavior, data contracts, security behavior, or contributor workflows.

## Completion workflow

1. Run `git diff --check`.
2. Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.
3. For perceptible web UI changes, capture a screenshot after manual verification.
4. Review `git status --short`; commit only intended files with an imperative message.
5. Open a pull request using the repository template and record scope, checks, risks, and documentation.
