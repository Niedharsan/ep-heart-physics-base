# PR 4 report: deterministic paired-stimulus propagated capture

## Scope

This PR adds a framework-independent verification protocol. It does not change
the reaction equations, diffusion update, worker, scenarios or interface. It
does not add 3D, re-entry, lesions or ECG functionality.

The result is not clinical validation, a physiologically calibrated effective
refractory period, or evidence of Epicardio equivalence.

## Scientific basis and measurement definition

Standard S1–S2 refractory protocols vary the interval between a conditioning
stimulus and a premature stimulus, then determine whether the premature
response propagates to a sensing site. Relevant references include:

- the openCARP ERP restitution example, which detects capture near a sensing
  electrode and narrows a failure/capture bracket by bisection:
  <https://opencarp.org/documentation/examples/02_ep_tissue/03f_erp_restitution>;
- Connolly et al., *Biophysical Journal* (2018), a tissue S1–S2 computational
  study using propagated capture and bisection:
  <https://doi.org/10.1016/j.bpj.2018.11.003>;
- Kandel and Roth (2013), a review of strength–interval behavior emphasizing
  that initiation and propagation depend on both interval and stimulus
  strength: <https://doi.org/10.1155/2013/134163>.

The current engine instantaneously assigns voltage in the stimulus region.
Consequently, local post-S2 voltage is guaranteed by the operator and cannot
classify capture. PR 4 requires a separate second wave at every downstream
probe after the S1 waveform has crossed downward through the measurement
threshold.

## Fixed protocol

| Item | Value |
|---|---:|
| Domain | `48 × 12` model-length units |
| Grid | `97 × 25`, `dx=0.5` model-length unit |
| Diffusion | `0.8` model-length-unit²/model-time-unit |
| Requested/effective timestep | `0.02` model-time unit |
| S1 | model time `0` |
| S2 | selected coupling interval |
| Stimulus | full-height `x ∈ [0,2]`, instantaneous assigned `u=1` |
| Threshold | rising/falling `u=0.5` |
| Downstream stations | `x=[6,12,18]` |
| Transverse rows | `y=[3,6,9]` |
| Observation after S2 | `20` model-time units |
| Planarity gate | transverse S2 activation spread `≤0.02` |

The protocol records each probe's S1 rise, S1 fall and S2 rise; pre-S2 voltage
and recovery at `x=1` across the three rows; per-trial diagnostics; and copied,
immutable protocol metadata. Denominator guarding and non-finite state abort a
trial. A timestep silently capped by the diffusion limit is rejected.

## Transition search and result

Known failure/capture endpoints at `24` and `25` model-time units are narrowed
by deterministic integer-timestep bisection. Additional anchors at `22` and
`26` check the expected sides of the transition. This avoids an exhaustive,
redundant restart at every timestep while returning the same resolution.

The current regression bracket is:

- longest failing interval: `24.30` model-time units;
- shortest captured interval: `24.32` model-time units;
- resolution: `0.02` model-time unit.

At `24.32`, the mean S2 latencies at `x=[6,12,18]` are approximately
`[6.083,11.068,15.616]` model-time units and are strictly ordered downstream.
Exact repeated studies return identical structured results.

## Limitations and deferred work

Recovery-upper clipping occurs extensively, so the result is explicitly marked
`implementation-characterization-compromised-by-clipping`. It does not verify
the unconstrained equations.

This single S1–S2 protocol does not include a conditioning train, restitution
over multiple basic cycle lengths, a current stimulus with duration, diastolic
strength calibration, amplitude sweeps, dx/dt/threshold sensitivity, or
comparison with an ionic-model reference. Model time is not calibrated to
milliseconds, and the bracket must not be reported as a clinical refractory
period.
