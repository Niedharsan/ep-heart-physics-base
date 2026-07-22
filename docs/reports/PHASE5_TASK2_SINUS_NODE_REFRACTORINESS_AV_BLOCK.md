# Phase 5: Task 2 sinus-node, refractoriness and AV-block assessment

## Assessment allocation
The supplied assessment specification allocates 22 marks: SNRT location (1), SNRT purpose (2), ARP/ERP/AVNRT identification and explanation (3 each), Wenckebach identification (5), and five ECG interpretations (1 each).

## Implemented
- Task 2 route and navigation from the assessment workspace;
- synthetic educational trace cards for SNRT, ARP, ERP, AVNRT, Wenckebach and five ECG patterns;
- deterministic marking functions with section-level feedback;
- accepted Wenckebach/Mobitz I synonym;
- local-device attempt persistence;
- instructor preview with hidden answer concepts;
- focused tests covering the complete 22-mark cap and partial-credit behaviour.

## Source boundary
The assessment allocation and named diagnoses come directly from the supplied assessment document. The document does not provide a detailed marking rubric for the explanations. The explanation concepts in this implementation are therefore explicit implementation decisions and must be approved by the client/domain expert before release.

## Limitations
All displayed tracings are original synthetic teaching graphics, not patient records and not validated diagnostic ECG/EGM simulations. They are suitable for workflow review only. Local answer keys are UI-hidden rather than cryptographically secure.
