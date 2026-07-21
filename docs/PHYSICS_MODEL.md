# Physics model

## Implemented reaction equations

The local cell model is the generalized six-parameter `a`/`b` Aliev–Panfilov form implemented in `AlievPanfilovModel.derivatives`:

\[
\frac{du}{dt}=-k\,u(u-a)(u-1)-uv
\]

\[
\frac{dv}{dt}=\left(\epsilon+\frac{\mu_1v}{u+\mu_2}\right)
\left[-v-ku(u-b-1)\right].
\]

Code name `epsilon` denotes the baseline recovery-rate parameter often written
as \(\epsilon_0\) or \(\gamma\). Both states, every model parameter, and model
time are currently dimensionless. The sign convention is that the complete
right-hand sides above are added to the explicit update; there is no separate
ionic-current sign inversion in the code.

The model is embedded in a reduced monodomain-style equation

\[
\frac{du}{dt}=D\nabla^2u+f(u,v),\qquad \frac{dv}{dt}=g(u,v),
\]

using a five-point finite-difference Laplacian and centre-value substitution at
domain and obstacle faces (a discrete no-flux treatment).

Space and time are uncalibrated normalized model coordinates. `dx` is the
distance between adjacent grid samples in model-length units, and `D` has the
corresponding bookkeeping units
`model-length-unit²/model-time-unit`. Until spatial and temporal calibration is
established, propagation speed is reported only in
`model-length-unit/model-time-unit`; these labels do not imply SI or
physiological units.

## Planar propagation-speed measurement

The PR 2 protocol defines activation as the first rising crossing of the
configurable dimensionless threshold `u = 0.5`. Consecutive samples that
bracket the threshold give a linearly interpolated activation time:

\[
t_a=t_0+(t_1-t_0)\frac{u_* - u_0}{u_1-u_0}.
\]

Five interior longitudinal stations and three transverse rows are sampled.
Station activation time is the row mean and implemented position is `x × dx`.
Ordinary least squares fits `activation time = intercept + slope × position`;
apparent speed is
`1 / slope`. The result includes residuals, R-squared, transverse spread,
adjacent segment speeds and numerical diagnostics. Missing/nonmonotone
activation, poor linearity, non-planarity, denominator guarding and non-finite
state are rejected.

The result's safeguard-specific status is `clipped` or `unclipped`. `Unclipped`
does not mean generally or scientifically validated. A clipped value
characterizes only the safeguard-modified implementation; it is not evidence
about the unconstrained equation or physiological conduction.

## Spatial and temporal refinement trends

PR 3 holds the normalized physical domain, stimulus, probes, diffusion,
parameters and activation threshold fixed while varying one discretization
axis at a time. A physical nodal coordinate must satisfy

\[
i = x / \Delta x
\]

as an integer grid index, and a grid with `N` nodes has extent
`(N - 1) × dx`. The planar stimulus is therefore specified as the physical
strip `x ∈ [0,2]`, rather than as a fixed number of cells.

For a three-level scalar sequence `q₀, q₁, q₂` with refinement ratio `r = 2`,
the reported quantities are

\[
\rho=\frac{|q_2-q_1|}{|q_1-q_0|},\qquad
p_{app}=\frac{\log(|q_1-q_0|/|q_2-q_1|)}{\log r},
\]

and the descriptive Richardson estimate

\[
q_R=q_2+\frac{q_2-q_1}{r^{p_{app}}-1}.
\]

These are observed quantity-of-interest refinement trends for propagation
speed. They are not formal verification of the solver's theoretical order:
there is no analytic or manufactured reference solution, and the planar runs
activate recovery clipping.

The contraction, apparent-order, finest-pair-change, radial-deviation and
activation-spread thresholds are project-defined regression/characterization
gates for these protocols. They are not literature-derived physiological
tolerances or validation criteria.

## Radial grid-isotropy measurement

The radial protocol initializes a centered physical circle and records nodal
first-crossing activation times. At 32 equal polar angles, activation time at
each continuous sample position is bilinearly interpolated from its four nodal
activation times. Directional apparent speed between radii `r₁` and `r₂` is

\[
c_\theta=\frac{r_2-r_1}{T(r_2,\theta)-T(r_1,\theta)}.
\]

The maximum relative deviation from the angular mean characterizes directional
grid bias. The current radial protocol completes without safeguard activation,
but that fact alone does not establish equation verification, physiological
calibration or general scientific validity.

## Variant and provenance

Aliev and Panfilov introduced the two-variable lineage in 1996:

- R. R. Aliev and A. V. Panfilov, *A simple two-variable model of cardiac
  excitation*, Chaos, Solitons & Fractals 7(3), 1996,
  <https://doi.org/10.1016/0960-0779(95)00089-5>.

The original formulation uses the excitation threshold in both polynomial
terms. This repository instead has separate `a` and `b` parameters. That later
generalized structure appears, for example, in:

- S. Göktepe and E. Kuhl, *Computational modeling of cardiac
  electrophysiology: a novel finite element approach*, International Journal
  for Numerical Methods in Engineering, 2009,
  <https://doi.org/10.1002/nme.2571>.
That source supports the equation family, not the complete parameter tuple in
this project. The current defaults mix values seen in different generalized
examples. No primary source was located for the exact six-value combination.

| Parameter | Meaning | Current value | Source | Status | Notes |
|---|---|---:|---|---|---|
| `a` | excitation threshold in the fast cubic | 0.05 | Göktepe & Kuhl 2009 | exact value/role in cited generalized preset | not the original 1996 threshold preset |
| `b` | recovery-nullcline shift | 0.15 | Göktepe & Kuhl 2009 | exact value/role in cited generalized preset | separate `b` is a later generalization |
| `k` | fast reaction scale | 8 | Aliev & Panfilov 1996; Göktepe & Kuhl 2009 | exact published value | value overlap does not validate this tuple |
| `epsilon` | baseline recovery rate \(\epsilon_0\) | 0.01 | no exact source located for this project tuple | adapted/unverified | the cited generalized preset uses 0.002 |
| `mu1` | state-dependent recovery numerator scale | 0.2 | Aliev & Panfilov 1996; Göktepe & Kuhl 2009 | exact published value | dimensionless |
| `mu2` | recovery denominator offset | 0.3 | Aliev & Panfilov 1996; Göktepe & Kuhl 2009 | exact published value | provides margin above the supported voltage floor |

**Complete default tuple:** Current project configuration; physiological and
numerical calibration not yet established.

The optional voltage/time mappings reported with the original canine
calibration must not be applied to this hybrid project tuple. Simulation time
is therefore not yet validated physiological milliseconds.

## Project-supported parameter domain

These are implementation policies for the current supported solver state
interval, not universal mathematical or physiological necessities:

- every parameter must be finite;
- `0 < a < 1` keeps the excitation threshold between the fast cubic roots;
- `b >= 0` supports the implemented recovery-nullcline family;
- `k > 0` and `epsilon > 0` are positive reaction-rate scales;
- `mu1 >= 0` supports the selected state-dependent recovery convention;
- `mu2 >= 0.20000100298023225` keeps `u + mu2 >= 1e-6` throughout the
  unchanged supported solver interval after the `-0.2` bound is represented in
  a `Float32Array` (`Math.fround(-0.2)`).

The model copies and freezes validated parameters at construction so later
caller mutation cannot bypass these checks.

## Equilibrium and qualitative behaviour

The documented resting state is `(u,v)=(0,0)`. Both derivatives vanish there.
The reaction Jacobian at rest is

\[
J(0,0)=\begin{bmatrix}-ka&0\\ \epsilon k(b+1)&-\epsilon\end{bmatrix},
\]

whose default eigenvalues are `-0.4` and `-0.01`. A small positive
subthreshold perturbation therefore initially decreases in `u` while `v`
increases. Larger excitation can cross the fast threshold, rise, and recover;
quantitative action-potential duration and refractory calibration remain
unestablished.

## Numerical safeguards and diagnostics

The mathematical equations above do **not** include the following defensive
modifications. Their unchanged values are named in `numericalSafeguards`:

- the recovery denominator uses `max(u + mu2, 1e-6)`;
- voltage is clipped to `[-0.2, 1.5]` after each solver update;
- recovery is clipped to `[0, 2]` after each solver update.

Accepted parameters make the denominator floor unreachable for solver-produced
states, but a direct out-of-domain model call can still activate it as a
defensive failure mechanism. Activation is counted. Clipping changes the
unconstrained PDE/ODE solution and must not be treated as evidence of numerical
stability. The engine exposes copied diagnostics for denominator guarding, all
four clip directions, and non-finite state detection. Reset clears them
deterministically. In development, the worker warns once per initialization or
reset if clipping occurs.

The deterministic default focal-scenario regression records 99,714 recovery
upper clips over its first 500 solver steps (with zero denominator guards,
voltage clips, recovery-low clips, or non-finite states). This is an audit
baseline for the unchanged current behavior, not a validation target; later
equation/parameter/timestep review must determine its cause before interpreting
the bounded trajectory scientifically.

## Limitations

The current parameterization is not calibrated to human atrial or ventricular
conduction velocity, action-potential duration, ECG amplitude, or clinical
outcomes. Diffusion/convergence, conduction velocity, re-entry, lesion block,
and pseudo-ECG verification are separate later phases.

The displayed pseudo-ECG projects temporal voltage changes through a simple
spatial weight field. It is not a bidomain/torso forward model.
