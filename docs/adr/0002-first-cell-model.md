# ADR 0002: First cell model

## Decision

Use the generalized dimensionless six-parameter `a`/`b` Aliev–Panfilov model
documented in `docs/PHYSICS_MODEL.md` for the initial excitable-wave
implementation. Preserve the current project defaults while their physiological
and numerical calibration remains unestablished.

## Reason

It is small enough for transparent browser prototyping while supporting excitation, recovery and propagating/re-entrant wave dynamics.

## Consequence

It must not be represented as a quantitatively calibrated human-cell ionic model. Detailed atrial/ventricular models remain future work.

The implementation is not an exact transcription or preset of the original
1996 formulation: it uses separate `a` and `b` roles, and the complete default
tuple has no verified single published source. The denominator floor and state
clipping are numerical safeguards rather than terms in the published equation;
their activation must remain observable through engine diagnostics.
