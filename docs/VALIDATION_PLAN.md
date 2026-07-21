# Validation plan

## Existing automated checks

- independently calculated reaction derivatives across resting, excited,
  boundary and custom-parameter states
- model parameter-domain and immutable-snapshot validation
- resting equilibrium and subthreshold reaction direction
- unclipped model-only finite short trajectory
- denominator-guard activation and Float32 boundary reachability
- typed/resettable guard, clip and non-finite diagnostics
- deterministic default-scenario safeguard characterization
- rising-threshold activation interpolation and linear-fit unit tests
- deterministic five-station/three-row planar propagation-speed measurement
- explicit planarity, fit-quality and missing-activation gates, with
  denominator/non-finite rejection and clipping-status reporting
- positive stable timestep
- resting equilibrium
- excitation and spread after stimulus
- lesion mask creation
- deterministic replay
- finite numerical state
- reference throughput measurement

## Required before claiming credible 2D propagation

1. planar-wave fixed-grid measurement complete; measurement across at least
   three spatial resolutions remains required;
2. radial-wave symmetry error;
3. convergence trend as dx and dt are refined;
4. no-flux boundary verification;
5. refractory capture/failure protocol;
6. obstacle re-entry initiation and persistence with deterministic setup;
7. lesion-complete versus lesion-gap conduction tests;
8. energy/state bounds over long runs;
9. comparison with a trusted reference implementation or published benchmark;
10. browser performance measurements on documented hardware.

No clinical or medical validation claim is permitted from these tests.
