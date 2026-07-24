# EP Signal Engine Phase 4 — Acquisition and recorder model

Phase 4 adds a deterministic post-synthesis acquisition pipeline while preserving the untouched physiological waveform output from Phase 3.

## Included

- independent one-pole high-pass and low-pass filters;
- narrow biquad 50/60 Hz notch filter;
- deterministic Gaussian white noise;
- baseline wander and mains contamination;
- optional DC removal;
- symmetric recorder saturation with clipped-sample telemetry;
- optional ADC quantization;
- immutable `Float64Array` output compatible with the Phase 1 contract.

## Boundary

This phase does not render traces and does not modify assessments. Filtered/contaminated signals are a separate transformation, allowing scientific tests to compare ideal morphology against recorder output.
