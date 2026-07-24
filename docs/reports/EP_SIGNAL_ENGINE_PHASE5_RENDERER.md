# EP Signal Engine Phase 5 — Professional Strip Renderer

## Scope

Phase 5 converts the deterministic `Float64Array` signals produced by Phases 1–4 into renderer-independent physical geometry and deterministic SVG. It does not replace assessment traces or modify the assessment UI.

## Added

- millimetre-based signal-strip scene model
- configurable paper speed and per-channel gain
- stacked surface ECG and intracardiac EGM channel layout
- one-millimetre minor grid and configurable major grid
- per-channel calibration pulses with physical amplitude and duration
- exact start/end interpolation for arbitrary render windows
- extrema-preserving deterministic path reduction
- independent clipping rectangles for every channel
- event markers and physical time labels
- complete deterministic SVG generation with XML escaping and accessibility label
- clinical-light and monochrome SVG themes
- strict validation of dimensions, channels, sample lengths, grid ratios, time windows and calibration margins

## Signal mapping

For a sample at time `t` and voltage `v`:

- `x_mm = plot_left + (t - start_time) * paper_speed`
- `y_mm = baseline - polarity * v * gain`

Time is converted from milliseconds to seconds. The geometry therefore preserves the configured millimetres-per-second and millimetres-per-millivolt scales independently of screen pixels.

## Path reduction

When `minimumHorizontalStepMm` is greater than zero, samples are grouped into deterministic physical-width bins. The first, minimum, maximum and last sample in each bin are retained in chronological order. This reduces SVG size while preserving narrow positive and negative extrema that simple point skipping could erase.

## API

- `buildEpSignalRenderScene(request)` creates renderer-independent geometry.
- `renderEpSignalSceneToSvg(scene, options)` serializes a scene.
- `renderEpSignalSetToSvg(request, options)` provides the combined convenience operation.
- `validateEpSignalStripRenderProfile(profile, signalSet)` returns structured validation issues.

## Verification

The Phase 5 test suite covers:

1. physical time and voltage scaling
2. calibration-pulse dimensions
3. minor/major grid classification
4. deterministic extrema-preserving path reduction
5. event and time-marker placement
6. deterministic accessible SVG and channel clipping
7. rejection of malformed rendering configurations

The installer runs the focused Phase 1–5 tests and then the complete repository `npm run check` pipeline before committing.

## Scientific boundary

This renderer displays the signal engine output without inventing waveform templates. It is not a clinical ECG system, diagnostic medical device, calibrated hardware recorder or evidence of clinical equivalence. Assessment-trace migration remains a later phase so renderer validation stays separate from educational content changes.
