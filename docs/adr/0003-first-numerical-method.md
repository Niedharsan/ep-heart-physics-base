# ADR 0003: First numerical method

## Decision

Use an explicit five-point finite-difference diffusion operator with no-flux boundaries and a calculated stability cap.

## Reason

The method is easy to inspect, test and port to GPU compute. Scientific verification is more important than early complexity.

## Consequence

The timestep may be small, and CPU scaling will eventually require WebGPU/WASM or a different solver strategy.
