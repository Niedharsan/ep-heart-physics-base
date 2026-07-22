# Architecture

## Boundary

The numerical engine is framework-independent TypeScript under `src/engine`. React is a consumer of snapshots and controls only.

## Runtime flow

`React controls → typed worker messages → Web Worker → SimulationRuntime → MonodomainSolver + measurement samplers → independent signal batches/state snapshots → Canvas UI`

The solver clock advances an integer number of numerical steps. Measurement
samplers are due by integer solver-step index. A separate render clock publishes
copied snapshots and drains accumulated signal samples. Browser wall time never
determines scientific scenario or sampling events.

## Current modules

- `geometry/RectangularTissue`: conductive mask and lesions
- `geometry/SpatialInputValidation`: shared finite, in-domain validation for
  nodal points, circular regions and rectangles before solver mutation
- `models/AlievPanfilov`: local reaction dynamics and immutable source-named presets
- `numerics/MonodomainSolver`: explicit reaction–diffusion update, selectable
  Float32/Float64 state storage and proposed-state extrema
- `numerics/FivePointNoFluxLaplacian`: framework-independent nodal outer and
  masked-obstacle no-flux operator
- `numerics/RectangularStimulusCurrent`: reusable endpoint-exclusive current
  source writer for the solver RHS; it does not overwrite state
- `signals/PseudoEcg`: approximate signal projection
- `definitions`: validated, frozen, JSON-safe version-1 scenario, electrode and
  measurement definitions with exact id/version references
- `runtime/SimulationRuntime`: framework-independent scenario execution,
  integer solver-step clock, signal-sampler clocks and sample backlog
- `verification/ActivationTime`: shared first-rising threshold interpolation
- `verification/PhysicalCoordinates`: exact normalized-coordinate/grid mapping
- `verification/PlanarConductionVelocity`: planar propagation-speed measurement and fit gates
- `verification/ConvergenceTrend`: pure three-level quantity-of-interest trend analysis
- `verification/PlanarRefinementStudy`: physically fixed spatial and temporal planar studies
- `verification/RadialSymmetry`: equal-angle radial activation and grid-isotropy measurement
- `verification/RadialSensitivityStudy`: reusable multi-resolution and
  sub-cell-centre radial matrix
- `verification/RefractoryCapture`: framework-independent conditioned S1–S2
  propagated-capture characterization, exhaustive reference scan and no-S2
  control
- `verification/AnalyticDiffusion`: Float64 cosine-mode diffusion decay
- `verification/ManufacturedReactionDiffusion`: Float64 forced-solution spatial
  and temporal error studies
- `verification/ObservedOrder`: descriptive analysis that retains unsuccessful
  trends; `VerificationAcceptance` owns CI policy
- `verification/ConvergenceTrend`: propagation quantity-of-interest analysis
  that retains non-contracting and oscillatory sequences; acceptance policy is
  shared through `VerificationAcceptance`
- `core/scenarios`: deterministic scenario scheduling
- `workers/SimulationTelemetry`: resettable throughput accounting and immutable
  snapshot construction
- `workers/simulation.worker`: timing and transfer boundary; initialize and
  reset stop execution, reset telemetry and emit a fresh snapshot immediately
- `learning`: versioned lesson definitions referencing engine scenarios and
  measurements without importing React
- `ui/CanvasGeometry`: physical nodal-grid aspect ratio and clamped pointer
  mapping to the inclusive nodal coordinate domain
- `ui`: rendering and user interactions

ESLint rejects React, React DOM and UI imports from `src/engine` and
`src/learning`.

## Upgrade path

1. numerical verification and convergence;
2. anisotropy and regional tissue;
3. better lead-field ECG and intracardiac electrodes;
4. pacing protocols and refractory capture tests;
5. atrial geometry and re-entry mechanisms;
6. GPU/WebGPU backend;
7. 3D mesh and catheter visualisation;
8. server-optional cohort features.
