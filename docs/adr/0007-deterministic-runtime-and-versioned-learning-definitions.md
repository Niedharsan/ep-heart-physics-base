# ADR 0007: Deterministic runtime clocks and versioned learning definitions

## Decision

Keep three responsibilities explicit:

1. the solver clock advances the reaction-diffusion state by integer step count;
2. signal samplers run at declared integer solver-step cadences and produce
   timestamped measurement samples;
3. the render clock publishes accumulated samples and copied state snapshots on
   a wall-time cadence without advancing scientific state.

Wall time may schedule work and measure throughput, but it must not decide when
a scientific scenario action or measurement occurs. Model-time scenario events
are compiled to integer steps with `ceil(modelTime / stableDt)`, so an event is
never applied earlier than requested.

Scenarios, electrodes, measurements and lessons use JSON-safe version-1
definitions. References contain both an id and a definition version. Catalogs
are validated and frozen before use. Scenario normalized indices retain the
existing grid-count convention, with the upper bound clamped to the last node,
to preserve the current scenario setups during this architecture change.

## Reason

The previous solver returned one pseudo-ECG value on every numerical step and
the worker published that value on the same timer that advanced the solver.
That coupled numerical integration, signal cadence and display scheduling.
Explicit step-index scheduling makes deterministic replay independent of
browser rendering opportunities and solver batch grouping.

Versioned declarative content creates a reviewable foundation for student
lessons without embedding React callbacks, wall-clock state or mutable authoring
objects in the engine.

## Consequences

- `MonodomainSolver.step()` advances only PDE state.
- `SimulationRuntime` owns scenario execution, measurement samplers and pending
  signal samples, but contains no browser or React dependency.
- The worker owns separate solver and render timers; the UI receives signal
  batches independently from state snapshots.
- The current pseudo-ECG remains an explicitly approximate, arbitrary-unit
  measurement sampled every solver step. Changing that cadence requires a
  later signal-method verification and re-baseline.
- This decision does not add lesson authoring, persistence, scoring, arbitrary
  schemas, patient data or 3D coordinates.
