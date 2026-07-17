# Data Model

## Authoritative data boundary

NoCodeBackend is the domain-data system of record. The browser only reaches it through the proxy. Domain endpoint errors are surfaced as structured `NoCodeBackendError` values; they are not converted into local-storage records.

## Collections

| Collection | Purpose | Key relationships |
| --- | --- | --- |
| `user-preferences` | Day setup, theme, notifications, onboarding | one per `user_id` |
| `tasks` | Actionable items and task metadata | belongs to `user_id`, optionally `project_id` |
| `projects` | Project goals and organization | belongs to `user_id` |
| `subtasks` | Steps for a task | belongs to `user_id` and `task_id` |
| `routines` | Repeating routines | belongs to `user_id` |
| `routine-steps` | Ordered routine actions | belongs to `user_id` and `routine_id` |
| `routine-sessions` | In-progress/completed routine execution | belongs to `user_id` and `routine_id` |
| `housework-tasks` | Home-mode recurring chores | belongs to `user_id` |
| `housework-completions` | Chore completion history | belongs to `user_id` and `task_id` |
| `inbox-items` | Captured thoughts to process | belongs to `user_id` |

## Contract rules

Records are strict Zod objects with server-managed identifiers and timestamps. Create and patch payloads are validated independently; patches cannot change identifiers, ownership, or creation timestamps and must contain at least one allowed field. Collection queries accept only documented filters (`user_id`, `routine_id`, `task_id`, and supported `status`).

When evolving a record, update `src/domains/schemas.js`, the corresponding services/repositories, proxy contract tests, and this document. Consider backward compatibility for existing remote records before deployment.
