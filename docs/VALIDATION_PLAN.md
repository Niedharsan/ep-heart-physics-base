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
- physically fixed three-level spatial and temporal propagation-speed trends
- contraction, apparent-order and finest-pair change gates for the derived
  propagation-speed quantity of interest
- deterministic 32-angle radial grid-isotropy characterization with bilinear
  nodal activation-time interpolation
- deterministic S1–S2 failure/capture transition bracket using nine
  downstream probes, timestep-indexed bisection and explicit safeguard status
- deterministic cross-field obstacle-circulation protocol with bilinear
  circumferential probes, repeated-circuit persistence gates and a terminating
  nearby-timing control
- positive stable timestep
- resting equilibrium
- excitation and spread after stimulus
- lesion mask creation
- deterministic replay
- finite numerical state
- reference throughput measurement

## Required before claiming credible 2D propagation

1. planar-wave fixed-grid and three-resolution sensitivity measurements are
   complete, but clipped runs cannot verify the unconstrained equations;
2. radial-wave symmetry is characterized for one grid; refinement of the
   symmetry metric remains desirable;
3. separate dx and dt quantity-of-interest trends are characterized; formal
   order verification against an analytic/manufactured solution remains;
4. no-flux boundary verification;
5. paired-stimulus capture/failure is characterized for one clipped fixed-grid
   protocol; stimulus-strength, dx/dt and threshold sensitivity remain;
6. obstacle circulation initiation and two-circuit persistence are
   characterized for one clipped fixed-grid protocol and distinguished from a
   terminating nearby-timing control; geometry and dx/dt sensitivity remain;
7. lesion-complete versus lesion-gap conduction tests;
8. energy/state bounds over long runs;
9. comparison with a trusted reference implementation or published benchmark;
10. browser performance measurements on documented hardware.

No clinical or medical validation claim is permitted from these tests.
