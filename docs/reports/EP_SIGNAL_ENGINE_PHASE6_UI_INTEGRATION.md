# EP Signal Engine Phase 6 — Visible Renderer Integration

## Scope

This phase connects the professional Phase 5 renderer geometry to the simulator's visible pseudo-ECG panel.

## Changes

- Replaces the legacy dark auto-scaled `canvas` trace with responsive SVG.
- Uses `buildEpSignalRenderScene` for signal geometry.
- Shows 1 mm / 5 mm clinical paper grid geometry.
- Shows a 1 mV, 200 ms calibration pulse at 25 mm/s and 10 mm/mV.
- Keeps a six-second rolling display.
- Adds time labels, responsive sizing, an empty state, and a scientific-boundary note.
- Adds server-rendered UI regression tests.

## Scientific boundary

The tissue simulator still emits a dimensionless pseudo-ECG. The adapter display-normalizes it to fit the strip. Therefore the waveform amplitude is not a physiological millivolt prediction, even though the renderer's paper speed, gain geometry, grid and calibration dimensions are internally consistent.
