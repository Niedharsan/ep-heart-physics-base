# Solver reference-verification report

## Scope

This correction adds Float64 reference storage, corrects the rectangular nodal
outer no-flux stencil, verifies masked-obstacle faces, and adds analytic and
manufactured smooth-solution studies. It does not add 3D, physiological
calibration, detailed ECG, or clinical validation.

## Boundary audit

The existing physical-coordinate utilities define an `N`-node domain as
`(N-1)dx`, but the old outer stencil substituted the boundary centre for an
out-of-domain neighbour. The corrected nodal Neumann closure reflects the
first interior value. Direct tests cover edges, corners, constants, a discrete
cosine eigenmode, obstacle-value independence, uniform fields, a complete
masked wall and an interior-obstacle conservation case.

## Precision comparison

After 400 identical focal-stimulus steps on a `48×32` grid, deterministic
Float32 and Float64 runs differ by:

| State | RMS difference | Maximum absolute difference |
|---|---:|---:|
| Voltage | `5.8838187368599665e-8` | `3.606786371790349e-7` |
| Recovery | `2.4017676999692766e-7` | `1.4160564845155932e-6` |

This is a storage-precision comparison, not an independent reference solver.

## Analytic diffusion result

The Float64 `33×33`, `dx=0.03125`, `dt=0.00025`, final-time `0.05` cosine-mode
decay has voltage RMS error `2.5636247817536754e-6` and maximum error
`4.976448105709075e-6`. Recovery remains exactly zero in the test. All
diagnostic guard, clip and non-finite counts are zero.

## Manufactured reaction–diffusion result

For node counts `[17,33,65]`, with `dt=0.05 dx²/D`, voltage RMS errors are
`[1.7358448766922737e-5,4.2248929850481405e-6,1.0410982154526265e-6]`.
Pairwise spatial orders are `[2.03865132344385,2.020808622455867]` by RMS and
`[1.9992438056414812,1.9998124740708456]` by maximum error.

Recovery RMS errors are
`[6.430953047530847e-7,1.5650633031671757e-7,3.8564044683113306e-8]`.
Pairwise spatial orders are `[2.0388115443865797,2.0208927343006238]` by RMS
and `[1.9982493510516437,1.9995626465102931]` by maximum error.

For spatially constant fields at `dt=[0.02,0.01,0.005]`, voltage RMS errors are
`[2.1709882451831356e-4,1.0960237455254203e-4,5.5070333152440496e-5]`, with
orders `[0.9860728596510911,0.9929318135218222]`. Recovery RMS errors are
`[3.7504154726322716e-5,1.8748257498715775e-5,9.373034167439731e-6]`, with
orders `[1.0002939120160856,1.0001684679344787]`.

The analysis layer retains divergent, stagnant and oscillatory sequences; CI
acceptance is evaluated separately. Current gates require contracting errors,
spatial order at least `1.8` for RMS and `1.7` for maximum error, and temporal
order between `0.9` and `1.1`.

## Rebaseline and limitations

The corrected boundary leaves the PR 4 transition at failure `31.58` and
capture `31.60`, but changes capture latencies to approximately
`[5.584,11.001,15.580]`. PR 2 and PR 3 regression outputs are checked by the
full suite. These tests cover smooth isotropic rectangular-grid cases. They do
not verify anisotropic diffusion, irregular geometry, physiological units or
clinical behavior.

## Verification record

On 2026-07-22, `npm run check` passed type checking, lint, 53 tests and the
Vite production build. The test suite includes deterministic replay. A separate
`npm run benchmark` run measured `890` solver steps/s on a `160×104` Float32
grid on an Apple M3 Pro running Darwin 24.6.0. This is a local reference
measurement, not a universal performance requirement.
