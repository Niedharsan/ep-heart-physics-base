# Assessment Phase 8B1 — Shared Timed Session Controller

## Delivered

- One shared Practice, Mock and Real Exam session controller for Tasks 1–5.
- Timed tasks remain disabled until the learner presses Start.
- Mock and Real Exam use the same fixed 20-minute duration.
- The deadline survives refreshes and cannot be extended by reloading.
- Timed answers and marked results are persisted locally for refresh-safe continuation.
- Submission and timeout are terminal and lock all answer controls.
- Timeout marks the answers available at expiry, including incomplete responses.
- Practice remains untimed, repeatable and immediately editable.
- Task navigation preserves the active assessment mode.
- Existing task-specific clinical marking and feedback remain unchanged.
- Server-rendering and persistence regression tests cover the shared framework.

## Security boundary

This phase provides consistent browser-based classroom behaviour. Browser storage is not secure against deliberate modification. A genuine high-stakes exam still requires authenticated users, server timestamps, server-controlled release, server submissions and server result storage.
