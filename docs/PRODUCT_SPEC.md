# Product specification

## Purpose

EP Heart Physics is a browser-based educational cardiac electrophysiology platform combining deterministic tissue simulation, derived electrophysiology signals and structured interpretation/assessment workflows.

## Core product principles

1. **Physics is generated, not played back.** Tissue activation evolves from the numerical model rather than prerecorded animations.
2. **Interventions modify the simulated system.** Pacing and lesions act on the numerical state through explicit, reviewable mechanisms.
3. **Signals are evidence from the simulation or approved educational cases.** The UI does not silently invent measurements.
4. **The numerical engine is independent from React.** Simulation state evolves in a Web Worker and is published to the UI through typed boundaries.
5. **Learning content is versioned and deterministic where scoring matters.** Scored rubrics require explicit domain approval.
6. **Scientific assumptions and limitations are documented.** Verification work is treated as part of the product rather than an afterthought.

## Current product surfaces

### Simulator

- deterministic 2D reaction–diffusion tissue model
- focal/planar stimulation and programmable pacing sites
- lesion and obstacle experiments
- voltage/activation visualisation
- derived pseudo-ECG / intracardiac-style signals
- versioned scenarios and measurements

### EP assessment workspace

- structured electrophysiology interpretation tasks
- channel-aware measurements
- Tasks 1–5 covering EP measurements, pacing manoeuvres and ECG/EGM interpretation
- domain-approved rubric requirements for scored free-text content
- local attempt/session history and structured feedback packages

## Planned AI boundary

AI may interpret structured simulation/assessment evidence, explain mechanisms, answer learner questions and propose schema-valid scenario actions. It must not replace the solver, invent measurements, alter domain-approved rubrics or make patient-specific clinical decisions.

## Explicit non-goals

- patient-specific anatomy or digital-twin claims
- clinical decision support or diagnosis
- quantitative clinical 12-lead ECG accuracy
- detailed human ionic-current modelling in the current reduced model
- electromechanical contraction
- regulatory or medical-device validation
