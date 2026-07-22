# PR 5 report: deterministic obstacle circulation

## Scope

This PR adds a framework-independent verification protocol for initiation and
persistence of repeated wave circulation around the existing circular
non-conductive obstacle. It reuses the current solver, mask, stimulus operator,
physical-coordinate helpers, activation interpolation and bilinear-sampling
structure.

It does not alter the solver, reaction model, worker, UI scenario, lesions,
pseudo-ECG or 3D scope. The existing UI option remains an unverified visual
scaffold and is not silently relabeled by this PR.

## Scientific basis

Cross-field S1–S2 protocols create a free wave end by applying a partial second
stimulus during the refractory tail of an earlier wave. Relevant sources are:

- the official openCARP re-entry induction example, which distinguishes
  initiation from maintenance and demonstrates protocol-dependent outcomes:
  <https://opencarp.org/documentation/examples/02_ep_tissue/21_reentry_induction>;
- the official openCARP DREAM example, which describes S1–S2 creation of
  unidirectional block:
  <https://opencarp.org/documentation/examples/03_eikonal/03b_dream_reentry>;
- a computational cross-field example in *Scientific Reports*:
  <https://pmc.ncbi.nlm.nih.gov/articles/PMC8547700/>;
- Azzolin et al., who separate post-induction persistence from the induction
  procedure in computational arrhythmia classification:
  <https://pmc.ncbi.nlm.nih.gov/articles/PMC8047415/>.

These sources motivate the protocol structure, not the project-specific
geometry, timing or numerical gates.

## Fixed normalized protocol

| Item | Value |
|---|---:|
| Grid | `128 × 96`, `dx=1` model-length unit |
| Physical extent | `127 × 95` model-length units |
| Diffusion | `0.8` model-length-unit²/model-time-unit |
| Requested/effective timestep | `0.08` model-time unit |
| Obstacle | centre `(64,48)`, radius `12` model-length units |
| S1 at time zero | `u=1`, rectangle `x=[0,127]`, `y=[48,95]` |
| Positive S2 | time `28`, `u=1`, rectangle `x=[0,50]`, `y=[0,47]` |
| Terminating control S2 | time `24`, otherwise unchanged |
| Circumferential probes | eight equal-angle samples at radius `16` |
| Activation threshold | rising `u=0.5` |
| Endpoint activity threshold | `u≥0.1` in conductive cells |
| Observation endpoint | model time `220` |

Probe zero is the west anchor. The accepted cyclic order is
west → southwest → south → southeast → east → northeast → north → northwest
→ west. The analyzer also supports the reverse order, but all accepted circuits
must share one direction.

## Objective persistence gates

A completed circuit contains exactly one rising crossing at every non-anchor
probe, in cyclic order, between consecutive west-anchor crossings. The fixed
protocol requires:

- at least two completed circuits;
- one consistent direction;
- finite, strictly increasing per-probe crossing times;
- circuit-period relative spread `(max period - min period) / mean period`
  no greater than `0.10`;
- at least one conductive cell with `u≥0.1` at model time `220`;
- the last completed circuit no more than one mean circuit period before the
  observation endpoint.

The 10% and endpoint-recency limits are project regression gates, not
literature-derived physiological thresholds.

## Deterministic result

The positive protocol produces two complete circuits in the declared order.
Their periods are approximately `68.733` and `66.547` model-time units. At
model time `220`, `2,911` conductive cells remain at or above `u=0.1`.
Repeated complete executions return exactly equal structured results.

With S2 moved to model time `24`, no complete circuit is detected and the final
active-cell count is zero. This demonstrates that the analyzer distinguishes
the sustained configured behavior from a nearby terminating protocol; it does
not establish a physiological vulnerable window.

## Numerical status and limitations

The positive run records `1,179,395` recovery-upper clips, with no denominator
guard or non-finite state. It is therefore labeled
`implementation-characterization-compromised-by-clipping`. It is not evidence
for persistence of the unclipped equations.

The model has no physiological space/time calibration, anisotropy, regional
tissue, ionic-cell detail or calibrated current stimulus. The circular mask is
a rasterized no-flux obstacle. The protocol has not yet undergone obstacle-size,
domain-size, dx/dt, threshold, stimulus-strength or timing-window sensitivity.
It is not clinical validation, a clinical inducibility result, or Epicardio
equivalence.
