# Roadmap

## Current foundation

Implemented and under active verification:

- deterministic 2D reaction–diffusion simulation
- finite-current pacing and lesion/obstacle experiments
- Web Worker numerical runtime separated from the React UI
- voltage-field and derived signal visualisation
- equation, reference-solver, conduction-velocity, refinement, symmetry and refractory-capture verification
- versioned scenarios, measurements and learning definitions
- EP assessment workspace with Tasks 1–5 and domain-approved rubric requirements
- local attempt/session handling and structured feedback packages
- continuous integration and GitHub Pages deployment

## Next — richer electrophysiology

- additional electrode and catheter models
- improved unipolar/bipolar EGM derivation
- position-dependent timing and morphology
- more explicit S1/S2 and entrainment protocols
- deterministic lesion-gap and re-entry demonstrations

## Next — educational product

- case-authoring workflow
- richer calipers and annotations
- instructor publishing and shared result review
- authenticated persistence where required
- expanded validated assessment content

## Planned — AI tutor and scenario interpreter

AI should sit above the deterministic simulator rather than replace it.

The intended boundary is:

1. deterministic code produces simulation state, measurements, events and assessment evidence;
2. a typed context builder exposes only structured, bounded evidence to the AI service;
3. AI explains mechanisms, answers learner questions and can propose validated scenario actions;
4. schema validation and deterministic code decide what can actually be executed or scored.

AI must not directly modify numerical state, invent measurements, change approved rubrics or provide patient-specific clinical advice.

## Longer term — geometry and performance

- WASM/WebGPU acceleration where profiling justifies it
- licensed anatomical geometry
- regional conduction/refractory properties
- specialised conduction-system coupling
- 3D visualisation and fibre orientation

These extensions remain subordinate to numerical verification and explicit scientific assumptions.
