# Product Overview

ADHD Life-OS is a low-stimulation life-management MVP for organizing tasks, routines, projects, inbox captures, timelines, housework, modes, and accessibility preferences. The product prioritizes supportive language, manageable next actions, and flexible daily structure rather than punitive overdue states.

## Current behavior

- Users can work with task, project, routine, housework, inbox, onboarding, and accessibility experiences in the React application.
- Task prioritization supports metadata such as energy, duration, interest, aversiveness, and location to generate Quick Wins, Momentum Builders, and Brave Frog recommendations.
- Authentication and domain data requests use explicit, same-origin NoCodeBackend proxy contracts. Failed domain-data requests return structured errors rather than silently replacing data with browser storage.
- Optional navigation modules are driven by saved onboarding preferences, while core navigation remains available.

## Planned integrations and non-promises

- Calendar and other external-event synchronization are planned integration areas, not currently enabled integrations.
- Product descriptions of intelligent scheduling and recommendations describe in-app logic; they do not promise third-party calendar access, background synchronization, or remote AI services.
- No product claim should imply that browser storage is a fallback for NoCodeBackend domain records.

## Product principles

1. Reduce cognitive load with clear hierarchy and small next steps.
2. Preserve user agency through adjustable preferences and flexible workflows.
3. Use encouraging, non-shaming language.
4. Protect user data through minimal exposure and validated service boundaries.
5. Make accessibility and responsive interaction part of normal product quality.
