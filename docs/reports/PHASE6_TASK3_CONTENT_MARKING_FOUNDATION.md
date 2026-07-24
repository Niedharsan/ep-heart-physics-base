# Phase 6 Task 1 — Task 3 content and marking foundation

## Scope

This first Phase 6 task defines the repository contract and pure marking foundation for assessment Task 3. It adds no React route, ECG/EGM renderer, local storage, simulator behaviour or deployment assumption.

## Assessment allocation

Task 3 is capped at exactly 23 marks:

- three atrial-tachycardia ECG interpretations with left/right localisation: 6 marks;
- two AH-jump EGM interpretations, one below and one above the 50 ms threshold: 4 marks;
- cannon-wave description of approximately 50 words: 5 marks;
- adenosine-use description of approximately 50 words: 5 marks;
- AVNRT ECG interpretation, pathway selection and explanation: 3 marks.

## Source boundary

The assessment specification supplies the topics and section totals, but not the case-specific ECG answers, accepted synonyms or the five one-mark concepts for each written response. This patch does not silently invent those answer keys.

The product catalog therefore marks every Task 3 item as `requires-domain-approval`. The pure marking function accepts a separate rubric only when it declares `approvalStatus: 'domain-approved'`. A later content task must provide the approved case-specific rubric together with the corresponding synthetic educational traces.

The 50-word instruction is recorded as a target and the deterministic word count is returned with the score. Word count does not add or remove marks because the supplied allocation does not define a word-count penalty or tolerance.

## Acceptance criteria

- the section allocation totals exactly 23;
- each of the three atrial-tachycardia cases has two independently scored marks;
- each AH-jump case has one mark for identifying the jump and one for its threshold class;
- cannon-wave and adenosine rubrics each require exactly five one-mark criteria;
- AVNRT ECG scoring is divided into diagnosis, pathway and explanation;
- marking refuses an unapproved or structurally incomplete rubric;
- repeated marking of identical inputs is deterministic;
- no score can exceed 23;
- no existing Task 1, Task 2, engine, worker, pacing, physics-verification, Vite or CI file is changed.

## Changed files

- `src/assessment/task3/catalog.ts`
- `src/assessment/task3/marking.ts`
- `src/tests/taskThreeAssessment.test.ts`
- `docs/reports/PHASE6_TASK3_CONTENT_MARKING_FOUNDATION.md`

## Deferred to later focused tasks

- approved case-specific clinical answer keys;
- deterministic synthetic Task 3 ECG/EGM traces;
- the `task=3` React route and assessment interface;
- Task 3 local-attempt persistence and client-preview integration.
