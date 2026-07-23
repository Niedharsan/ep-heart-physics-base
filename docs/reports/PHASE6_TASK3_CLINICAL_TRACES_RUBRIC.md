# Phase 6 Task 2 — Task 3 clinical rubric and deterministic traces

## Scope

This focused task supplies the evidence-reviewed production rubric and six deterministic synthetic ECG/EGM definitions required by Task 3. It does not add the React route, assessment form, attempt persistence, client-preview navigation, simulator coupling, authentication, backend storage, or any Task 4/5 content.

## Added educational traces

- left-sided focal atrial tachycardia with a positive V1 P wave;
- right-sided focal atrial tachycardia with a negative V1 P wave;
- left-sided focal atrial tachycardia with a negative-positive V1 P wave;
- a 10 ms A1A2 decrement with AH prolongation from 90 to 130 ms (40 ms, below the conventional jump criterion);
- a 10 ms A1A2 decrement with AH prolongation from 90 to 150 ms (60 ms, meeting the conventional jump criterion);
- typical slow-fast AVNRT with short-RP/pseudo-r-prime morphology and antegrade slow-pathway conduction.

Every definition is frozen, JSON-safe, deterministic and labelled `Synthetic educational tracing — not patient data.` Instructor-only annotations contain the answer cues; the student render model suppresses them.

## Clinical content boundary

The assessment specification defines the item count and marks but not the answer keys. The production rubric is therefore based on an explicit evidence review:

- Kistler et al. (JACC 2006, doi:10.1016/j.jacc.2006.03.058) for the broad V1 P-wave left/right localisation boundary;
- Fishberger et al. (PMID:16836714) for the conventional at-least-50-ms AH-jump criterion;
- Merck Manual Professional for cannon a-wave physiology;
- American Heart Association adult advanced life support guidance for therapeutic/diagnostic adenosine use;
- ESC and AVNRT ECG literature for typical slow-fast AVNRT, short RP and pseudo-r-prime morphology.

These are simplified synthetic teaching patterns, not validated patient ECGs, not a clinical localisation algorithm and not a diagnostic device. The repository's `domain-approved` state means the rubric passed this documented evidence review and structural validation; it does not claim independent electrophysiologist or client sign-off.

## AH-threshold correction

Phase 6 Task 1 structurally required both supplied AH cases to be marked as an AH jump. This task corrects that assumption: the 40 ms example is below the conventional 50 ms criterion and is scored as `identifiesAhJump: false`; the 60 ms example meets the criterion and is scored as `true`. Both still retain a separate mark for below/above-50-ms classification, preserving the four-mark allocation.

## Marking contract

The production rubric preserves exactly 23 marks:

- atrial tachycardia diagnosis and side: 6;
- AH criterion decision and threshold class: 4;
- cannon wave: 5 evidence-linked concepts;
- adenosine: 5 evidence-linked concepts;
- AVNRT diagnosis, antegrade pathway and explanation: 3.

## Changed files

- `src/assessment/task3/catalog.ts`
- `src/assessment/task3/marking.ts`
- `src/assessment/task3/clinicalRubric.ts`
- `src/assessment/task3/traceCatalog.ts`
- `src/assessment/task3/traceRendererModel.ts`
- `src/tests/taskThreeAssessment.test.ts`
- `src/tests/taskThreeClinicalContent.test.ts`
- `docs/reports/PHASE6_TASK3_CLINICAL_TRACES_RUBRIC.md`

## Acceptance criteria

- all six trace-bearing Task 3 items map one-to-one to a trace;
- all traces are structurally distinct, immutable, deterministic and JSON-safe;
- student rendering hides answer annotations;
- the two AH examples encode a 10 ms coupling decrement and calculate exactly 40 ms and 60 ms AH changes;
- the production clinical rubric validates and scores a complete response at exactly 23;
- existing Task 1, Task 2, engine, worker, pacing, physics-verification, Vite and CI files remain unchanged.

## Deferred

- Task 3 React UI and route;
- local-attempt persistence and instructor/student presentation;
- browser interaction and accessibility verification;
- Task 4 and Task 5.
