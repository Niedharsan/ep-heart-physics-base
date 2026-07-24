# Assessment Phase 8A — Live Clinical Trace Architecture

## Scope

This phase replaces the small schematic spike strips used by Tasks 2–5 with one reusable live ECG/EGM renderer.

## Delivered

- Shared `RunningEgmStrip` playback component.
- Continuous looping recordings with freeze and replay controls.
- Deterministic surface-ECG and intracardiac-EGM morphology synthesis.
- Surface, intracardiac and stimulus channel styling.
- Clinical paper grid, calibration pulse, channel rail and live scan line.
- Shared normalisation adapter for the existing Task 2–5 data-driven trace catalogues.
- Larger full-width Task 2 cards so multi-channel recordings remain legible.
- Student-safe state labels remain visible where required, while answer annotations stay hidden in student/mock/exam views.
- Instructor annotations remain available.
- Practice traces reveal teaching annotations after the task has been marked.
- Deterministic model and server-rendered UI tests.

## Scientific boundary

All recordings remain deterministic synthetic educational traces. They are not patient data and are not validated for clinical diagnosis or treatment decisions.

## Remaining later phases

- Phase 8B: shared session controller, storage/routing/marking cleanup and lazy loading.
- Phase 8C: authenticated server-side examination release, timing, submissions, results and production E2E coverage.
