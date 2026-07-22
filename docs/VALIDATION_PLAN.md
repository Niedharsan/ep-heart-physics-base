# Validation plan

## Existing automated checks

- independently calculated reaction derivatives across resting, excited,
  boundary and custom-parameter states
- model parameter-domain and immutable-snapshot validation
- immutable source-named 1996-classic and 2009-generalized presets
- resting equilibrium and subthreshold reaction direction
- unclipped model-only finite short trajectory
- denominator-guard activation and Float32 boundary reachability
- typed/resettable guard, clip, proposed-state-extrema and non-finite diagnostics
- deterministic default-scenario safeguard characterization
- rising-threshold activation interpolation and linear-fit unit tests
- deterministic five-station/three-row planar propagation-speed measurement
- explicit planarity, fit-quality and missing-activation gates, with
  denominator/non-finite rejection and clipping-status reporting
- physically fixed three-level spatial and temporal propagation-speed trends
- contraction, apparent-order and finest-pair change gates for the derived
  propagation-speed quantity of interest
- deterministic 32-angle radial grid-isotropy characterization with bilinear
  nodal activation-time interpolation
- deterministic S1–S2 failure/capture transition bracket using nine
  downstream probes, timestep-indexed bisection and explicit safeguard status
- selectable Float32 runtime and Float64 reference state storage with
  deterministic within-mode replay and quantified cross-mode differences
- analytic cosine-mode diffusion decay with homogeneous Neumann boundaries
- manufactured reaction–diffusion RMS and maximum-error studies demonstrating
  approximately second-order spatial and first-order temporal convergence
- explicit outer-domain edge/corner and masked-obstacle no-flux tests,
  including uniform-field preservation, wall isolation and an interior
  obstacle conservation check
- reporting-preserving order analysis separated from CI acceptance gates
- zero clip counts, denominator guards and non-finite states in every PR2–PR4
  scientific integration protocol, with observed state extrema reported
- positive stable timestep
- resting equilibrium
- excitation and spread after stimulus
- lesion mask creation
- deterministic replay
- finite numerical state
- reference throughput measurement

## Required before claiming credible 2D propagation

1. planar-wave fixed-grid and three-resolution sensitivity measurements are
   rebaselined with zero clipping; analytic and manufactured-solution checks
   now establish expected order for the tested smooth problems;
2. radial-wave symmetry is characterized for one grid; refinement of the
   symmetry metric remains desirable;
3. separate dx and dt quantity-of-interest trends are characterized; formal
   order verification against an analytic/manufactured solution remains;
4. no-flux domain and obstacle-boundary verification is present for the
   documented rectangular nodal grid and mask convention; irregular geometry
   and anisotropic-flux verification remain;
5. paired-stimulus capture/failure is characterized for one unclipped fixed-grid
   protocol; stimulus-strength, dx/dt and threshold sensitivity remain;
6. obstacle re-entry initiation and persistence with deterministic setup;
7. lesion-complete versus lesion-gap conduction tests;
8. energy/state bounds over long runs;
9. comparison with a trusted reference implementation or published benchmark;
10. browser performance measurements on documented hardware.

No clinical or medical validation claim is permitted from these tests.
