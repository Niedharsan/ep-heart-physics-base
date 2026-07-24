# PR 3 report: planar refinement trends and radial symmetry

Date: 2026-07-22

## Scope and claim boundary

PR 3 adds framework-independent spatial/timestep sensitivity and radial
grid-isotropy measurements. The corrective extension adds threshold and grid-
phase sensitivity plus reporting-preserving analysis. It does not change the solver, equations, model
parameters, diffusion, safeguards, worker, UI, pseudo-ECG or scenarios.

The planar results are an observed self-convergence trend for a derived
quantity of interest. They are not formal method-order verification because no
analytic/manufactured solution is used. The corrective rebaseline uses the
source-named generalized preset and all runs have zero clipping. No value is
converted to physiological units.

Descriptive analysis is separate from acceptance. Finite positive oscillatory,
stationary and non-contracting sequences remain structured results with notes
and nullable order/Richardson fields; the acceptance layer records why they do
not pass. The contraction, apparent-order, finest-pair-change, radial-deviation
and activation-spread thresholds are project-defined regression/
characterization gates, not literature-derived physiological tolerances.

References supporting this bounded approach:

- Chaste cardiac EP verification case study: threshold interpolation,
  factor-two refinement and Richardson analysis,
  <https://chaste.github.io/docs/paper-tutorials/cardiacepverification/conductionvelocitycasestudy/>;
- openCARP tuneCV: conduction-velocity dependence on mesh and timestep,
  <https://opencarp.org/documentation/examples/02_ep_tissue/03a_study_prep_tunecv>;
- Niederer et al. N-version benchmark: spatial/temporal discretization and
  first-activation comparison, <https://pmc.ncbi.nlm.nih.gov/articles/PMC3263775/>;
- Pathmanathan and Gray: distinction between code and solution verification,
  <https://doi.org/10.1002/cnm.2615>;
- FDA cardiac EP verification resources: exact-solution convergence as the
  stronger future verification standard,
  <https://cdrh-rst.fda.gov/verification-test-problems-cardiac-electrophysiology-modeling-software>.

## Physically fixed planar protocol

Both studies use a `48 × 12` model-length-unit nodal domain, `D = 0.8`
model-length-unit²/model-time-unit, the sourced generalized preset, a
full-height physical stimulus strip `x ∈ [0,2]`, first rising `u=0.5`
activation, stations `x=[12,18,24,30,36]`, rows `y=[3,6,9]`, and model-time
timeout 30. Physical coordinates must map exactly to grid nodes.

Spatial refinement holds `dt=0.005` fixed:

| `dx` | Grid | Apparent speed | Recovery-high clips |
|---:|---:|---:|---:|
| 1 | 49 × 13 | 1.5209197267468286 | 0 |
| 0.5 | 97 × 25 | 1.5786931942039200 | 0 |
| 0.25 | 193 × 49 | 1.5959101810581984 | 0 |

Temporal refinement holds `dx=0.25` fixed:

| `dt` | Apparent speed | Recovery-high clips |
|---:|---:|---:|
| 0.01 | 1.5895046105537185 | 0 |
| 0.005 | 1.5959101810581984 | 0 |
| 0.0025 | 1.5991389791351234 | 0 |

The shared `dx=0.25, dt=0.005, threshold=0.5` result is evaluated once per
study. Including threshold sensitivity, the study requires seven unique runs.
Requested and effective timesteps must match; a stability-capped protocol is
rejected.

| Metric | Spatial trend | Temporal trend | Gate |
|---|---:|---:|---:|
| Change contraction | 0.29800854288459605 | 0.5040609692246568 | ≤ 0.75 |
| Apparent order | 1.7465744064798407 | 0.9883298479117784 | ≥ 0.5 |
| Finest-pair relative change | 1.0788192881169771% | 0.2019085344709225% | ≤ 2% |
| Descriptive Richardson estimate | 1.6032191149680070 | 1.6024206548797024 | reported only |

All planar runs have zero denominator guards, clips and non-finite states.
The prior clipped trends are superseded.

### Activation-threshold sensitivity

The threshold study holds `dx=0.25`, `dt=0.005` and all other inputs fixed.

| Dimensionless threshold | Apparent speed |
|---:|---:|
| 0.3 | 1.5959105017070088 |
| 0.5 | 1.5959101810581984 |
| 0.7 | 1.5959101893172305 |

Mean speed is `1.5959102906941458`; relative span is
`2.00919069362559e-7`, and maximum relative deviation from the mean is
`1.322210052727194e-7`. This unexpectedly small sensitivity is a result for
this traveling-wave protocol and linear crossing interpolation, not a general
or physiological threshold claim.

## Radial grid-isotropy protocol

The strengthened radial study uses a `48 × 48` physical domain, fixed
`dt=0.005`, physical stimulus radius 2, radii 8 and 14, 32 equal angles and a
timeout of 20. Each `dx` is tested at physical centre `(24,24)` and at the
diagonal half-cell shift `(24+dx/2,24+dx/2)`. Continuous polar-sample
activation times are bilinearly interpolated from nodal activation times.

| `dx` | Centre phase | Mean speed | RMS relative angular speed error | Maximum relative error | Outer activation spread | Legacy gate |
|---:|---|---:|---:|---:|---:|---|
| 1 | node | 1.4653777402674317 | 0.0057398108968606445 | 0.008875504000896322 | 0.08516537139719915 | fail |
| 1 | half-cell | 1.4645844919192605 | 0.0046256000533946165 | 0.0064927175249994305 | 0.10007832899622748 | fail |
| 0.5 | node | 1.513801899835566 | 0.001677172674605818 | 0.002565589454382644 | 0.030813874370419825 | pass |
| 0.5 | half-cell | 1.5143245610822662 | 0.0014917770154141072 | 0.0022697931248350733 | 0.03317910063961094 | pass |
| 0.25 | node | 1.527389613045027 | 0.00035693662943277 | 0.0005492175186774571 | 0.008853074766776103 | pass |
| 0.25 | half-cell | 1.5273811114433564 | 0.0003615049751037008 | 0.0005019339386516158 | 0.009069400673704209 | pass |

The retained matrix gate is maximum relative speed deviation `≤0.02` and outer
activation spread `≤0.08`. Both coarse cases fail only the outer-spread part;
the failures are preserved rather than thrown away or hidden by relaxing the
gate.

Node-centred mean-speed refinement has contraction `0.2805978117254204` and
apparent order `1.8334243369102852`. Half-cell-shifted refinement has
contraction `0.26249562135311755` and apparent order
`1.9296347372698581`. Their centre-phase relative speed differences are
`[0.0005414734288770438,0.00034520437204050967,0.000005566114407539175]`
from coarse to fine. The result also retains all signed per-angle speed errors,
per-radius centred activation errors and their RMS values. Every case has zero
guards, clips and non-finite states. `Unclipped` is not a medical,
physiological or general validation claim.

## Verification cost

On an Apple M3 Pro, the strengthened PR 3 targeted Vitest file completed in
approximately 50 seconds while executing the aggregate planar and radial
studies twice for deterministic replay. This is a local observation, not a
universal performance target.

On 2026-07-22, `npm run check` passed type checking, lint, 54 tests and the
production build. A separate benchmark measured `908` Float32 solver steps/s
on the documented `160×104` grid on the same Apple M3 Pro. Benchmark variation
between runs is expected; no universal throughput gate is inferred.

## Deferred work

- independent/reference-solver comparison for propagating waves;
- angular sample-count and radius sensitivity;
- wider threshold sensitivity across additional waveforms and protocols;
- physiological calibration, anisotropic diffusion, 3D, ECG, re-entry and
  lesion verification.
