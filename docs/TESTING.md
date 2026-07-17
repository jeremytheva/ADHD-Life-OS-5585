# Testing and Validation

## Required commands

Run these commands before opening a pull request:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Use `npm ci` to install the exact lockfile-defined dependencies. `npm run build` includes linting, but it remains a separate required CI step so failures are easy to identify.

## Test approach

Tests use Node's built-in `node:test` runner and live in `test/`. Add focused, deterministic tests for services, navigation behavior, persistence/repository contracts, and NoCodeBackend handler behavior. Do not call a real NoCodeBackend environment or use real credentials in tests.

## Proxy contract coverage

For handler changes, cover rejected routes/methods/origins, malformed or oversized payloads, upstream request shaping, response validation, error codes/statuses, cookies as applicable, and correlation IDs. The proxy is a security boundary, not merely a transport helper.

## Manual checks

For UI changes, exercise keyboard navigation, labels, focus, responsive layout, reduced motion, contrast, and the relevant low-stimulation experience. Include a screenshot for perceptible application changes in the pull request.
