# Phase 6 Task 4 — Task 3 integration and hardening

## Scope

This final Phase 6 task integrates the completed Task 3 assessment into the login-free client preview. It adds local Task 3 attempt history, a structured feedback package, client-preview capability updates and focused integration tests. It does not change the simulator, worker, electrophysiology model, clinical rubric, trace morphology or the 23-mark allocation.

## Task 3 persistence

- Marking Task 3 saves a local-device attempt containing an identifier, timestamp and immutable score result.
- At most 20 attempts are retained, newest first.
- Browser storage is optional so server-side/static rendering does not require `window`.
- Invalid JSON and structurally invalid stored attempts are ignored.
- Clearing Task 3 history removes only the Task 3 storage key.
- Resetting current answers does not erase saved history.

## Feedback package

The Task 3 page can copy a structured JSON package after marking. It contains the current responses, score, view, notes, browser string, timestamp and educational disclaimer. It intentionally excludes the clinical rubric, accepted-answer lists, expected chamber sides and instructor answer keys.

## Client-preview integration

The assessment module card now states that Tasks 1, 2 and 3 are available. The Task 3 arrhythmia content is removed from the planned list, while Task 4, Task 5 and weekly/instructor workflows remain clearly labelled as future work. The client review guide links directly to the Task 3 feedback panel.

## Acceptance criteria

- Task 3 marking saves a local immutable score attempt;
- no more than 20 Task 3 attempts are retained;
- corrupted storage cannot break rendering;
- Task 3 attempt history can be cleared independently;
- feedback copying requires a marked result;
- copied feedback contains responses and scores but no answer-key data;
- student markup continues to hide instructor annotations and clinical answers;
- the client landing page accurately advertises Tasks 1–3;
- later assessment work remains labelled planned;
- no engine, worker, pacing, physics, clinical-rubric or trace-definition file changes.

## Changed files

- `src/assessment/task3/TaskThreeAssessment.tsx`
- `src/assessment/task3/store.ts`
- `src/assessment/task3/feedback.ts`
- `src/clientPreview/routes.ts`
- `src/clientPreview/ClientPreviewHome.tsx`
- `src/tests/taskThreeAssessmentUi.test.tsx`
- `src/tests/taskThreePersistence.test.ts`
- `src/tests/clientPreview.test.ts`
- `docs/reports/PHASE6_TASK4_INTEGRATION_HARDENING.md`
