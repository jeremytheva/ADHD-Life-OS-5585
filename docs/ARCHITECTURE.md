# Architecture

## System shape

The frontend is a React 18 single-page application built by Vite. UI components live in `src/components/` and `src/pages/`; contexts hold cross-cutting UI state; services contain application behavior; and domain schemas/types define record and form boundaries.

## Data flow

Browser data clients call same-origin `/api/ncb/data/*` and `/api/ncb/auth/*` routes. Vite development middleware invokes the same `api/ncb/handler.js` handler used by deployment paths. The handler matches explicit route and method allowlists, validates query/body input, adds server-only authorization, forwards an approved request to NoCodeBackend, validates data responses, and returns structured errors with correlation IDs.

```
React UI -> services/repositories -> browser data client
         -> /api/ncb/{auth,data} -> allowlisted handler -> NoCodeBackend
```

## Boundaries

- `src/` is browser code; no server secret belongs there.
- `api/ncb/` is the backend-for-frontend trust boundary.
- `src/domains/schemas.js` validates form, request, and response record shapes.
- `test/` contains Node contract and behavior tests that avoid a live backend.

## Extension guidance

For a new collection or route, define the schema first, add it to the explicit proxy contract, update the repository/client behavior, and add handler contract coverage. Do not create a catch-all proxy or bypass runtime response validation.
