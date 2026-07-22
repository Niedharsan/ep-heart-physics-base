# Architecture

## Boundary

The numerical engine is framework-independent TypeScript under `src/engine`. React is a consumer of snapshots and controls only.

## Runtime flow

`React controls → typed worker messages → Web Worker → MonodomainSolver → snapshot + pseudo-ECG → Canvas UI`

## Current modules

- `geometry/RectangularTissue`: conductive mask and lesions
- `models/AlievPanfilov`: local reaction dynamics
- `numerics/MonodomainSolver`: explicit reaction–diffusion update
- `signals/PseudoEcg`: approximate signal projection
- `verification/ActivationTime`: shared first-rising threshold interpolation
- `verification/PhysicalCoordinates`: exact normalized-coordinate/grid mapping
- `verification/PlanarConductionVelocity`: planar propagation-speed measurement and fit gates
- `verification/ConvergenceTrend`: pure three-level quantity-of-interest trend analysis
- `verification/PlanarRefinementStudy`: physically fixed spatial and temporal planar studies
- `verification/RadialSymmetry`: equal-angle radial activation and grid-isotropy measurement
- `verification/RefractoryCapture`: framework-independent S1–S2 propagated-capture characterization
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
