# PR 1 report: equation and parameter verification

Date: 2026-07-11

## Outcome

The engine implements the generalized dimensionless six-parameter `a`/`b`
Aliev–Panfilov reaction form documented in `PHYSICS_MODEL.md`. It is not an
exact transcription or parameter preset of Aliev and Panfilov 1996. The full
default tuple `{a: 0.05, b: 0.15, k: 8, epsilon: 0.01, mu1: 0.2, mu2: 0.3}`
has no verified single published source and remains:

> Current project configuration; physiological and numerical calibration not
> yet established.

The original lineage is cited using
<https://doi.org/10.1016/0960-0779(95)00089-5>. The separate `a`/`b` equation
structure and the cited values other than the current `epsilon` are traced to
Göktepe and Kuhl 2009, <https://doi.org/10.1002/nme.2571>. The code field
`epsilon` is documented as the baseline recovery-rate parameter often written
as epsilon-zero or gamma; it was not renamed in this narrow PR.

## Implemented verification

- Independent committed derivative fixtures cover rest, small excitation,
  intermediate state, high excitation, supported-domain edge and a custom
  parameter set.
- Model-only tests verify exact rest, subthreshold direction and a finite short
  Euler trajectory without solver clipping.
- Construction validates every required runtime key, finite values and the
  documented project-supported domains with field-specific errors.
- Validated parameters are copied and frozen.
- The `mu2` minimum accounts for Float32 storage of the unchanged voltage
  lower bound.
- The unchanged denominator floor and four unchanged clipping bounds are one
  named safeguard policy.
- Typed diagnostics count denominator guarding, each clipping direction and
  non-finite state detection; reset is deterministic and snapshots are frozen.
- Worker snapshots carry diagnostics, while development workers warn once per
  initialize/reset when clipping first occurs.

## Guard and clipping findings

For accepted parameters and solver-produced states, the denominator guard is
unreachable. A deliberate direct out-of-domain model call activates and counts
it as a defensive mechanism.

The unchanged application default focal scenario produces the following exact
diagnostics after 500 solver steps:

```text
denominatorGuardCount  0
voltageClipLowCount    0
voltageClipHighCount   0
recoveryClipLowCount   0
recoveryClipHighCount  99,714
nonFiniteStateCount    0
```

This is a deterministic audit regression baseline, not evidence of stability
or physiological validity. Clipped output differs from the unconstrained
PDE/ODE solution. Determining whether equations, parameters or timestep policy
should change is explicitly deferred for review in a later PR.

## Lockfile

All 207 internal package-mirror artifact URLs were replaced by public
`registry.npmjs.org` URLs. A semantic comparison confirmed that package
versions, integrity hashes and dependency edges were unchanged. `npm ci` from
the public registry succeeds.

## Scope preserved

This PR does not change governing equations, default parameters, state scaling,
stimulus behavior, clipping bounds, timestep policy, diffusion, conduction
velocity, re-entry, pseudo-ECG, performance behavior, UI design or 3D scope.
It makes existing numerical modifications observable; it does not claim
clinical validation or equivalence to another simulator.

## Changed files

- `package-lock.json`
- `docs/PHYSICS_MODEL.md`
- `docs/VALIDATION_PLAN.md`
- `docs/adr/0002-first-cell-model.md`
- `docs/PR1_EQUATION_PARAMETER_VERIFICATION_REPORT.md`
- `src/engine/core/numericalDiagnostics.ts`
- `src/engine/core/types.ts`
- `src/engine/models/AlievPanfilov.ts`
- `src/engine/numerics/MonodomainSolver.ts`
- `src/engine/workers/simulation.worker.ts`
- `src/tests/alievPanfilov.test.ts`
- `src/tests/solver.test.ts`

## Deferred proposals

- Decide whether to adopt a complete published generalized preset or calibrate
  a new project preset; any change requires explicit review.
- Decide nomenclature (`epsilon`, epsilon-zero or gamma) with a broader API
  compatibility plan.
- Investigate the frequent recovery upper clipping before using long bounded
  trajectories as scientific evidence.
- Continue with the separately planned diffusion, conduction-velocity,
  convergence, refractory, re-entry, lesion and pseudo-ECG PRs only after this
  equation/parameter review is accepted.

## Final verification

- Public-registry `npm ci`: passed.
- `npm run check`: passed with 19 tests before PR 2 began.
- Standalone benchmark: 779 solver steps/s on the 160 × 104 reference workload
  in this run; this is a local observation, not a universal target.
- Live development application: initialized and simulated at stable `dt=0.08`
  without a worker error.
