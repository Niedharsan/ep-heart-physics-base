# EP Signal Engine Phase 3 — Waveform Synthesis

## Scope

Phase 3 converts validated physiological events into deterministic sampled voltages while leaving the assessment UI unchanged.

## Added

- Versioned waveform-model contracts.
- Spatial activation sources with position, dipole direction, amplitude and morphology kernels.
- Gaussian, Gaussian-derivative and difference-of-Gaussians kernels.
- Surface-lead weighting for P/QRS/T morphology.
- Unipolar inverse-distance dipole fields.
- Bipolar electrograms calculated as the exact difference between two unipolar contact fields.
- Near-field/far-field behavior through geometry and explicit surface weighting.
- Deterministic biphasic pacing artifacts.
- Direct output into the Phase 1 `GeneratedEpSignalSet`/`Float64Array` contract.
- Explicit reporting of unmatched physiological events.
- Validation for source geometry, amplitudes, kernels, versions and acquisition parameters.

## Scientific boundary

This layer is a reduced-order educational signal model. It does not claim to solve the bidomain or monodomain equations. Tissue-scale activation timing comes from Phase 2. The source model is designed to support deterministic EP teaching traces, controlled morphology studies and later comparison against higher-fidelity offline reference simulations.

## Deferred

- Hardware high-pass, low-pass and notch filters.
- Baseline wander, mains interference and stochastic noise.
- ADC quantization and clipping.
- Professional paper-speed renderer.
- Replacement of assessment SVG traces.

Those remain separate so morphology generation can be tested independently from acquisition artifacts and display behavior.
