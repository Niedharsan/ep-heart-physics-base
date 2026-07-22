# UI and runtime correction report

## Scope

This correction keeps the numerical engine independent from React and addresses
reset, telemetry, canvas geometry, pointer mapping and spatial-input validation.
It does not change the reaction-diffusion equations or make a medical-validation
claim.

## Implemented guarantees

- Initialization and reset stop the worker loop, reset the throughput meter and
  emit a newly copied snapshot immediately.
- Snapshot voltage and mask arrays, lesion records and diagnostics cannot alias
  later solver mutations. Typed-array payloads remain mutable to their receiver.
- Canvas dimensions use physical nodal extents `(width - 1) dx` and
  `(height - 1) dx`; rendering is not tied to the previous fixed CSS ratio.
- Pointer coordinates are clamped before mapping to the inclusive nodal domain.
- Circular obstacles, circular and rectangular stimuli, lesions and stimulus
  amplitudes are validated before state is mutated.

## Browser inspection

Inspected locally in the in-app browser on 2026-07-22 with Vite development
mode. Starting advanced model time and produced a non-zero measured step rate.
Reset immediately showed model time `0.0`, solver rate `0 steps/s` and paused
state. The 160 × 104 grid rendered at ratio 1.5437, matching `159 / 103`.
The obstacle scenario emitted a fresh time-zero frame and an edge interaction
produced no browser error. No application error was present in the browser log.

## Verification results

Recorded on 2026-07-22 on an Apple M3 Pro:

- `npm run check`: passed type checking, lint, 65 tests in 12 files and the
  production Vite build; the production bundle contained a 198.83 kB main
  JavaScript asset (63.08 kB gzip) and a 12.92 kB worker asset.
- `npm run benchmark`: 762 solver steps/s for the documented 160 × 104 CPU
  reference case. This is an observation, not a universal acceptance gate.
- focused deterministic replay: passed for identical inputs.

## Remaining limitations

- Worker scheduling, signal sampling and rendering still need explicit,
  independently configurable clocks.
- The browser inspection is functional evidence, not a pixel-perfect visual
  regression test or a performance benchmark.
- Inputs are validated against the current rectangular nodal domain; arbitrary
  geometry and 3D coordinates are outside this phase.
