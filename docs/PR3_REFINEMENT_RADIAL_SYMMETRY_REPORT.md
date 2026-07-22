# PR 3 report: planar refinement trends and radial symmetry

Date: 2026-07-22

## Scope and claim boundary

PR 3 adds framework-independent spatial/timestep sensitivity and radial
grid-isotropy measurements. It does not change the solver, equations, model
parameters, diffusion, safeguards, worker, UI, pseudo-ECG or scenarios.

The planar results are an observed self-convergence trend for a derived
quantity of interest. They are not formal method-order verification because no
analytic/manufactured solution is used. The corrective rebaseline uses the
source-named generalized preset and all runs have zero clipping. No value is
converted to physiological units.

The contraction, apparent-order, finest-pair-change, radial-deviation and
activation-spread thresholds are project-defined regression/characterization
gates for these protocols. They are not literature-derived physiological
tolerances or validation criteria.

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

The shared `dx=0.25, dt=0.005` result is evaluated once per study, so the two
series require five unique runs. Requested and effective timesteps must match;
a stability-capped protocol is rejected.

| Metric | Spatial trend | Temporal trend | Gate |
|---|---:|---:|---:|
| Change contraction | 0.29800854288459605 | 0.5040609692246568 | ≤ 0.75 |
| Apparent order | 1.7465744064798407 | 0.9883298479117784 | ≥ 0.5 |
| Finest-pair relative change | 1.0788192881169771% | 0.2019085344709225% | ≤ 2% |
| Descriptive Richardson estimate | 1.6032191149680070 | 1.6024206548797024 | reported only |

All planar runs have zero denominator guards, clips and non-finite states.
The prior clipped trends are superseded.

## Radial grid-isotropy protocol

The radial study uses a `48 × 48` model-length-unit domain (`97 × 97`,
`dx=0.5`), `dt=0.02`, centre `(24,24)`, physical stimulus radius 2, radii 8
and 14, 32 equal angles, and a model-time timeout of 20. Continuous polar
sample activation times are bilinearly interpolated from nodal activation
times. The outer ring retains 10 model-length units of boundary clearance.

```text
mean directional speed              1.4962693390258603 model-length-unit/model-time-unit
maximum relative speed deviation    0.2619278922195735%
inner activation-time spread        0.012571544072587315 model-time unit
outer activation-time spread        0.03233894737290122 model-time unit
safeguard status                     unclipped
all numerical diagnostics           0
```

The deviation passes the 1% gate and outer spread passes the `2dt = 0.04`
gate. Exact replay is required. `Unclipped` describes only safeguard
activation; it is not a medical, physiological or general validation claim.

## Verification cost

On an Apple M3 Pro with 18 GB RAM, the PR 3 targeted Vitest file completed in
approximately 23 seconds while executing each full planar and radial protocol
twice for deterministic replay. This is a local observation, not a universal
performance target.

## Deferred work

- analytic/manufactured-solution code verification and formal observed order;
- refinement of the radial symmetry metric;
- activation-threshold sensitivity;
- no-flux boundary verification;
- Float64 comparison and analytic/manufactured-solution verification;
- physiological calibration, anisotropic diffusion, 3D, ECG, re-entry and
  lesion verification.
