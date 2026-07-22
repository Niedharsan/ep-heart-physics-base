# Student-learning architecture report

## Scope

This phase separates scientific stepping, signal sampling and render
publication and adds versioned definitions for the existing scenarios, an
explicit approximate electrode/measurement and one starter lesson. It does not
add 3D, an authoring interface, persistence, scoring or a new ECG formulation.

## Clock semantics

- `MonodomainSolver.step()` advances only the reaction-diffusion state.
- `SimulationRuntime` advances a requested integer batch, evaluates scenario
  actions at integer step indices and samples measurements at declared integer
  step cadences.
- The worker runs solver batches and render publication on separate timers.
  Render publication drains pending timestamped samples and copies a state
  snapshot; it does not advance the model.
- Model-time schedules use ceil-to-next-step quantization. The focal 65-unit
  interval therefore maps to step 813 at stable dt 0.08 (model time 65.04).

The default pseudo-ECG cadence remains one sample per solver step to preserve
the existing temporal-difference semantics. A later signal-science PR must
establish normalization before changing that cadence.

## Definition boundary

Every scenario, electrode, measurement and lesson contains `schemaVersion`,
`id` and `definitionVersion`. References contain both id and version. Engine
catalog validation rejects duplicates, unresolved references, invalid normalized
coordinates, unsupported stimulus amplitudes and invalid sampling cadences. The
catalogs are deeply frozen after validation.

The first lesson explicitly teaches observation of focal propagation and the
limitations of the approximate arbitrary-unit pseudo-ECG. These definitions are
content foundations, not evidence of educational effectiveness or clinical
validity.

## Remaining limitations

- Only one approximate distributed lead and one pseudo-ECG measurement exist.
- Scenario coordinates use the documented grid-count normalization convention
  to preserve the existing setups; a future physical-coordinate schema needs a
  separately reviewed migration.
- Wall-timer callback counts and browser frame times are intentionally excluded
  from deterministic scientific acceptance.
- No external interchange standard compliance is claimed.

## Verification results

Recorded on 2026-07-22 on an Apple M3 Pro:

- `npm run check`: passed type checking, lint, 72 tests in 15 files and the
  production Vite build. The production bundle contained a 199.03 kB main
  JavaScript asset (63.15 kB gzip) and a 19.92 kB worker asset.
- `npm run benchmark`: 619 solver steps/s for the documented 160 × 104 CPU
  reference case. This single observation is not a universal acceptance gate.
- deterministic precision replay and runtime batch/render-drain invariance:
  six focused checks passed.
- the local Vite application remained reachable after the runtime refactor.
