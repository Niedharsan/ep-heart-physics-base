# Phase 7 — complete Task 4 AVRT/VAAV/VAV assessment

## Scope

This combined Phase 7 delivery implements the complete 25-mark Task 4 workflow in one reviewed patch:

- concentric AVRT EGM interpretation: 5 marks;
- eccentric AVRT EGM interpretation: 5 marks;
- VAAV response and ventricular-overdrive-pacing manoeuvre: 5 marks;
- VAV response, PPI-TCL reasoning and His-refractory PVC next step: 10 marks.

It includes the content contract, pure marking, evidence-reviewed rubric, four deterministic synthetic traces, React UI, `task=4` routing, instructor annotations, local persistence, structured feedback, navigation, client-preview integration and focused tests.

## Clinical interpretation boundary

The conventional educational interpretations are deliberately qualified:

- concentric or eccentric activation sequence suggests an accessory-pathway region but is not independently definitive;
- VAAV after ventricular entrainment strongly supports atrial tachycardia, while recognised pseudo-VAAV exceptions exist;
- VAV keeps AVNRT and orthodromic AVRT in the differential;
- RV-apical PPI-TCL greater than 115 ms favours AVNRT and a value at or below 115 ms favours orthodromic AVRT in the conventional studied setting, but pacing distance and decremental conduction can mislead;
- a His-refractory PVC that advances/resets atrial timing or terminates tachycardia without atrial capture supports accessory-pathway participation; absence of an effect does not absolutely exclude a pathway.

These are synthetic educational tracings, not patient data, a validated clinical simulator or a diagnostic device.

## Persistence and feedback

Task 4 stores at most 20 score-only attempts in local browser storage. Corrupted or unavailable storage fails safely. Feedback JSON contains the current responses, score, notes and browser metadata but does not include the clinical rubric, accepted phrases or answer-key annotations.

## Deferred

Task 5 remains separate: two VT ECGs and a para-Hisian pacing EGM, worth 15 marks.
