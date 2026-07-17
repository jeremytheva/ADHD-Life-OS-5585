# Architecture Decision Record (ADR) Process

## When to write an ADR

Create an ADR for a consequential, durable technical choice: a trust-boundary change, persistence or data-model strategy, external integration, framework/runtime change, accessibility standard, or decision that is difficult to reverse. Do not require an ADR for routine bug fixes or local refactors.

## Location and naming

Store records in `docs/adr/` using zero-padded sequential names such as `0001-use-explicit-nocodebackend-proxy.md`. Do not renumber existing ADRs. Link related issues and pull requests.

## Required format

```markdown
# ADR-0001: Short decision title

- Status: Proposed | Accepted | Superseded | Deprecated
- Date: YYYY-MM-DD
- Decision makers: ...

## Context

## Decision

## Consequences

## Alternatives considered

## Validation and rollout
```

State the problem, constraints, decision, positive and negative consequences, rejected alternatives, security/privacy/accessibility impact, and validation or rollback plan. Be concise and factual.

## Lifecycle

Open an ADR as **Proposed** with the implementation pull request when review is needed. Mark it **Accepted** when the decision is approved and implemented. Do not rewrite history when a decision changes: add a new ADR that supersedes the prior record and update its status and links.
