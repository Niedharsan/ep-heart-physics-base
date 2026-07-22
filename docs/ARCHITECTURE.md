# Architecture

## Boundary

The numerical engine is framework-independent TypeScript under `src/engine`. React is a consumer of snapshots and controls only.

## Runtime flow

`React controls → typed worker messages → Web Worker → MonodomainSolver → snapshot + pseudo-ECG → Canvas UI`

## Current modules

- `geometry/RectangularTissue`: conductive mask and lesions
- `models/AlievPanfilov`: local reaction dynamics and immutable source-named presets
- `numerics/MonodomainSolver`: explicit reaction–diffusion update, selectable
  Float32/Float64 state storage and proposed-state extrema
- `numerics/FivePointNoFluxLaplacian`: framework-independent nodal outer and
  masked-obstacle no-flux operator
- `signals/PseudoEcg`: approximate signal projection
- `verification/ActivationTime`: shared first-rising threshold interpolation
- `verification/PhysicalCoordinates`: exact normalized-coordinate/grid mapping
- `verification/PlanarConductionVelocity`: planar propagation-speed measurement and fit gates
- `verification/ConvergenceTrend`: pure three-level quantity-of-interest trend analysis
- `verification/PlanarRefinementStudy`: physically fixed spatial and temporal planar studies
- `verification/RadialSymmetry`: equal-angle radial activation and grid-isotropy measurement
- `verification/RadialSensitivityStudy`: reusable multi-resolution and
  sub-cell-centre radial matrix
- `verification/RefractoryCapture`: framework-independent S1–S2 propagated-capture characterization
- `verification/AnalyticDiffusion`: Float64 cosine-mode diffusion decay
- `verification/ManufacturedReactionDiffusion`: Float64 forced-solution spatial
  and temporal error studies
- `verification/ObservedOrder`: descriptive analysis that retains unsuccessful
  trends; `VerificationAcceptance` owns CI policy
- `verification/ConvergenceTrend`: propagation quantity-of-interest analysis
  that retains non-contracting and oscillatory sequences; acceptance policy is
  shared through `VerificationAcceptance`
- `core/scenarios`: deterministic scenario scheduling
- `workers/simulation.worker`: timing and transfer boundary
- `ui`: rendering and user interactions

## Upgrade path

1. numerical verification and convergence;
2. anisotropy and regional tissue;
3. better lead-field ECG and intracardiac electrodes;
4. pacing protocols and refractory capture tests;
5. atrial geometry and re-entry mechanisms;
6. GPU/WebGPU backend;
7. 3D mesh and catheter visualisation;
8. server-optional cohort features.
