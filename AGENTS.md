# Codex repository instructions

## Purpose

This repository is a scientific software foundation for a browser-based educational cardiac electrophysiology simulator. Prioritise numerical correctness, explicit assumptions, deterministic behaviour and reviewable changes over visual polish.

## Mandatory working rules

1. Read `docs/PHYSICS_MODEL.md`, `docs/VALIDATION_PLAN.md` and the ADRs before altering the solver.
2. Never describe the current engine as medically validated, clinically accurate or equivalent to Epicardio.
3. Keep the numerical engine independent from React.
4. Run `npm run check` before completing a task.
5. Do not weaken tests merely to make them pass.
6. Document units and scaling; identify dimensionless variables clearly.
7. Prefer small commits and small pull requests.
8. Add an ADR for major model, numerical-method or architecture changes.
9. Record licences before importing external code, meshes or datasets.
10. Benchmark honestly on documented hardware; do not fabricate performance results.

## Immediate priority

Verify and improve the 2D reaction-diffusion base before adding 3D geometry, detailed ECG, catheters or educational case features.
