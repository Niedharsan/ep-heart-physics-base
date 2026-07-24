# Assessment Phase 7B — Persistent Timed Session Hardening

## Scope

This phase hardens browser-based mock and real-exam sessions.

## Changes

- Introduces a versioned persistent assessment-session contract.
- Uses a fixed 20-minute deadline established at first start.
- Reloading the page does not restart or extend the timer.
- Active, submitted and expired states are explicit.
- Submission and expiry are terminal and lock the session.
- Mock and real-exam sessions use separate task-specific storage keys.
- Malformed browser data is rejected rather than trusted.
- Adds deterministic unit tests for creation, expiry, submission, remaining time and parsing.

## Security boundary

Browser persistence prevents accidental refresh-based timer resets but is not secure against deliberate local-storage modification. Production examination use still requires authenticated students and instructors, server-side release state, server timestamps and server-recorded submissions.
