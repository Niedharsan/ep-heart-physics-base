# Phase 6 Task 3 — Task 3 React assessment UI

## Scope

This focused task exposes the approved Task 3 content through the login-free React assessment interface. It adds the `task=3` route, six student/instructor trace views, response controls, deterministic marking and a 23-mark score presentation.

It does not add Task 3 attempt persistence, change the client-preview landing-page capability list, modify any solver/worker/pacing/physics code, or change Vite/CI configuration.

## Student/instructor boundary

The Task 3 trace definitions contain answer-bearing titles, descriptions and instructor annotations. Student SVG accessibility metadata therefore uses neutral case titles and descriptions supplied by the assessment page rather than the answer-bearing catalog text.

Because the marker awards diagnosis marks, the student page also replaces answer-bearing catalog prompts such as `atrial tachycardia ECG` and `AVNRT ECG` with neutral tachycardia prompts.

Student rendering excludes:

- left/right answer labels;
- AH interval values and threshold annotations;
- slow-fast AVNRT mechanism annotations;
- written-response rubric criteria.

Instructor rendering exposes those references with the existing warning that a static login-free build is not secure examination infrastructure.

## Assessment workflow

- Three atrial-tachycardia ECG cases: diagnosis plus left/right chamber side, 6 marks.
- Two AH-change EGM cases: conventional jump decision plus relation to 50 ms, 4 marks.
- Cannon-wave response with deterministic word count, 5 marks.
- Adenosine response with deterministic word count, 5 marks.
- AVNRT ECG diagnosis, antegrade pathway and explanation, 3 marks.
- Total remains capped at exactly 23 marks by the existing pure marker.

## Navigation

The interval trainer and Tasks 1–3 now expose consistent assessment navigation links. Instructor links preserve `view=instructor`. The assessment router resolves `task=3` through a pure exported route helper covered by focused tests.

## Changed files

- `src/assessment/AssessmentApp.tsx`
- `src/assessment/assessment.css`
- `src/assessment/task1/TaskOneAssessment.tsx`
- `src/assessment/task2/TaskTwoAssessment.tsx`
- `src/assessment/task3/TaskThreeAssessment.tsx`
- `src/assessment/task3/TaskThreeTraceStrip.tsx`
- `src/tests/taskThreeAssessmentUi.test.tsx`
- `docs/reports/PHASE6_TASK3_REACT_ASSESSMENT_UI.md`

## Acceptance criteria

- `?mode=assessment&task=3` renders Task 3;
- unknown task values retain the interval trainer fallback;
- all six approved synthetic traces render deterministically;
- student markup does not contain answer-bearing catalog metadata or instructor annotations;
- instructor markup exposes annotations and rubric references;
- scoring presents all five section subtotals and the exact 23-mark total;
- no Task 3 attempt is persisted in this task;
- Task 1, Task 2 and interval marking behaviour remains unchanged;
- `npm run check` passes before commit.

## Deferred to Phase 6 Task 4

- Task 3 local-attempt persistence and history;
- client-preview landing-page capability update;
- final cross-task feedback/export integration;
- final Phase 6 accessibility and regression hardening.
