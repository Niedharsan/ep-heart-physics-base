# PR 2 report: planar propagation-speed measurement

Date: 2026-07-22

## Scope

PR 2 adds a deterministic, framework-independent measurement of a planar
activation front. It does not retune diffusion or model parameters and does not
establish physiological conduction velocity. Space and time are uncalibrated
normalized model coordinates, so results use the bookkeeping label
`model-length-unit/model-time-unit`; it is not an SI or physiological unit.

The protocol uses established verification conventions: interior probes,
first rising threshold crossing, sub-timestep interpolation and activation time
versus distance. Myokit documents first positive-direction threshold crossings
and border exclusion; openCARP documents distance-over-activation-time
measurement and dependence on spatial discretization and timestep scheme.
Pathmanathan and Gray provide the solution-verification framing, while Niederer
et al. provide resolution-aware benchmarking context. These sources do not
prescribe this exact five-station OLS protocol. References:

- Myokit conduction-velocity documentation,
  <https://myokit.readthedocs.io/en/stable/api_simulations/DataBlock.html>;
- openCARP tuneCV documentation,
  <https://opencarp.org/documentation/examples/02_ep_tissue/03a_study_prep_tunecv>;
- Pathmanathan and Gray, cardiac electrophysiology verification case study,
  <https://doi.org/10.1002/cnm.2615>;
- Niederer et al., N-version cardiac electrophysiology benchmark,
  <https://doi.org/10.1098/rsta.2011.0139>.

## Fixed-grid protocol

| Setting | Value |
|---|---|
| Grid | 96 × 24 cells |
| `dx` | 1 model-length unit |
| Diffusion `D` | 0.8 model-length-unit²/model-time-unit |
| Requested/effective `dt` | 0.08 model-time unit |
| Model | `goktepeKuhl2009Figure4Generalized` |
| Stimulus | existing full-height `x=0..2` planar-wave stimulus |
| Activation | first rising `u=0.5` crossing |
| Stations | `x = 24, 36, 48, 60, 72` |
| Rows | `y = 6, 12, 18` |
| Fit gate | R-squared ≥ 0.999 |
| Planarity gate | transverse spread ≤ one timestep |
| Timeout | model time 80 |

Five mean station activation times are regressed against the implemented
coordinate `x × dx`.
The reciprocal slope is the reported speed. Three rows at each station detect
loss of planarity without constructing a full activation map.

## Observed deterministic result

```text
speed                       1.4314066762683364 model-length-unit/model-time-unit
mean activation times       15.4260398144, 23.8090092013, 32.1922757350,
                            40.5757901926, 48.9594581438
R-squared                    0.9999999997219826
maximum absolute residual   0.0002487270341031689 model-time unit
maximum transverse spread   0
safeguard status             unclipped
observed recovery range      [0, 2.310099013947633]
recoveryClipHighCount       0
all other diagnostics       0
```

Repeated execution returns an identical typed result, including a deeply
copied and frozen protocol snapshot, within the same runtime. The test computes
an explicit relative error against the recorded full-precision speed and allows
at most 2% as an implementation-regression sentinel, not as a physiological
target.

## Scientific limitation

The previous clipped result at speed `1.42511135536906` is superseded. The
source-named preset and removal of the unsourced recovery clamp produce zero
clips, guards and non-finite states. `Unclipped` only describes safeguard
activation; it does not verify the PDE/ODE or justify conversion to cm/s or
m/s.

Independent exploratory review also found material timestep sensitivity at
fixed `dx`: approximately 1.42512 at `dt=0.08`, 1.47041 at `dt=0.04`, and
1.49438 at `dt=0.02`. These are not PR 2 acceptance fixtures; they demonstrate
why spatial/temporal convergence is the next required PR.

## Changed files

- `src/engine/verification/PlanarConductionVelocity.ts`
- `src/tests/conductionVelocity.test.ts`
- `docs/ARCHITECTURE.md`
- `docs/PHYSICS_MODEL.md`
- `docs/VALIDATION_PLAN.md`
- `docs/PR1_EQUATION_PARAMETER_VERIFICATION_REPORT.md`
- `docs/PR2_PLANAR_CONDUCTION_VELOCITY_REPORT.md`

No solver, model, scenario, worker, React, ECG or 3D behavior changed.
