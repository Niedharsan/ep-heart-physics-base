# PR 4 report: normalized paired-stimulus propagated capture

Date: 2026-07-22

## Scope and claim boundary

This corrective PR replaces direct voltage assignment in the verification
protocol with a finite-duration current source, adds a three-pulse S1
conditioning train, adds a matched no-S2 control, and confirms cached bisection
against an exhaustive timestep-resolved reference scan.

The result is a normalized implementation characterization. It is not a
physiological or effective refractory period, clinical validation, or evidence
of Epicardio equivalence. It adds no re-entry, ECG or 3D functionality.

## Scientific basis

S1–S2 protocols condition tissue with regular S1 stimuli, vary the premature
S2 coupling interval, and assess propagated capture at a separate sensing
location. Relevant implementation references include:

- the openCARP ERP restitution example, which uses an S1 train, sensing-site
  capture and bisection:
  <https://opencarp.org/documentation/examples/02_ep_tissue/03f_erp_restitution>;
- the openCARP parameter reference, which separates pulse start, duration,
  strength, count and BCL: <https://opencarp.org/parameters/master/>;
- Göktepe and Kuhl (2009), which includes an external source term in the
  generalized model: <https://doi.org/10.1002/nme.2571>.

The current amplitude/duration pair below is selected for this normalized
protocol after zero-clipping exploration. It is not copied as a calibrated
pair from those sources.

## Fixed protocol

| Item | Value |
|---|---:|
| Domain | `48 × 12` model-length units |
| Grid | `97 × 25`, `dx=0.5` |
| Diffusion | `0.8` model-length-unit²/model-time-unit |
| Requested/effective timestep | `0.02` model-time unit |
| Current region | full-height `x ∈ [0,2]` |
| Current amplitude | `5` dimensionless-voltage/model-time-unit |
| Pulse duration | `0.20` model-time unit, 10 endpoint-exclusive steps |
| Integrated numerical strength | `1` dimensionless-voltage unit |
| Conditioning pulses | `3` |
| Basic cycle length | `40` model-time units |
| S1 onset times | `[0,40,80]` model-time units |
| Threshold | rising/falling `u=0.5` |
| Downstream stations | `x=[6,12,18]` |
| Transverse rows | `y=[3,6,9]` |
| Observation after S2 | `20` model-time units |
| Reference scan | inclusive `[20,22]` at `0.02`, 101 trials |
| Coarse anchors | `[18,24]` |

The source enters `du/dt`; it never assigns `u`. S2 coupling is measured from
the final S1 onset. Three conditioning beats do not establish periodic steady
state.

## Conditioning and no-S2 control

Every S1 beat propagates planarly through all nine probes. Station-mean rising
activation times are:

| Beat | Onset | Station means |
|---:|---:|---|
| 1 | 0 | `[2.7654299561998372,6.614114502405336,10.461566255499903]` |
| 2 | 40 | `[43.02932481506389,47.28222582298443,51.51714474440201]` |
| 3 | 80 | `[82.86490809569807,86.87073128625115,90.87820847455244]` |

The matched no-S2 control records final-S1 rise and fall at every probe and no
subsequent rising crossing. This rejects residual or self-sustained activation
as the explanation for an S2 capture result.

## Exhaustive transition result

All 101 reference coupling intervals are retained in order. The sequence has
one monotone failure-to-capture transition:

- longest failing interval: `21.22` model-time units;
- shortest captured interval: `21.24` model-time units;
- resolution: `0.02` model-time unit.

Cached integer-step bisection returns exactly the same `21.22/21.24` bracket.
It evaluates nine unique in-range coupling intervals before the exhaustive
reference pass; both layers then share the trial cache.
The analyzer preserves nonmonotone synthetic sequences and reports them as
failed acceptance rather than throwing away their outcomes.

At the first captured interval, S2 station-mean activation times are
`[27.136566415514093,32.12672672184151,36.6962358518251]`, giving onset-to-
activation latencies `[5.896566415514093,10.88672672184151,15.4562358518251]`.
Transverse spreads are exactly zero in this full-height planar setup.

Immediately before S2 at `21.24`, the stimulus-strip sample means are
`u=0.017987007275223732` and `v=0.9299807548522949` across the three rows.

## Numerical safeguards and reproducibility

The aggregate proposed-state range is:

- voltage: `[0,1.1901960123838653]`;
- recovery: `[0,2.3978387300831683]`.

Denominator-guard, voltage-clip, recovery-clip and non-finite counts are all
zero. Repeated complete studies return identical structured results.

On 2026-07-22, `npm run check` passed type checking, lint, 58 tests,
deterministic replay and the production build in 81.98 seconds wall time. A
separate run measured `831` Float32 solver steps/s on the documented `160×104`
benchmark grid on an Apple M3 Pro. These are local observations, not universal
performance requirements.

## Limitations

- current strength and duration have not undergone strength-duration
  sensitivity analysis;
- `dx`, `dt`, threshold, BCL and conditioning-count sensitivity remain;
- three S1 pulses do not prove steady state;
- model time and current are dimensionless and uncalibrated;
- the phenomenological two-variable model is not an ionic reference;
- the transition is not a physiological refractory-period measurement.
