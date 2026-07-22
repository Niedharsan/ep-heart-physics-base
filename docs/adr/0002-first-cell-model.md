# ADR 0002: First cell model

## Decision

Use the generalized dimensionless six-parameter `a`/`b` Aliev–Panfilov model
documented in `docs/PHYSICS_MODEL.md` for the initial excitable-wave
implementation. The initial default decision was later corrected by ADR 0004,
which selects a complete source-named generalized preset.

## Reason

It is small enough for transparent browser prototyping while supporting excitation, recovery and propagating/re-entrant wave dynamics.

## Consequence

It must not be represented as a quantitatively calibrated human-cell ionic model. Detailed atrial/ventricular models remain future work.

The generalized implementation is not an exact transcription of the original
1996 single-threshold formulation. ADR 0004 records the subsequent preset and
recovery-state-policy correction.
