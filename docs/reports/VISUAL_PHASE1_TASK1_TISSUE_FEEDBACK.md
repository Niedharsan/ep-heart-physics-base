# Visual Remediation Phase 1 — Task 1

## Scope

This task improves simulator feedback without changing the validated solver, worker, pacing parameters, numerical model, scenarios, pseudo-ECG calculation or assessment modules.

## Problems addressed

- Resting tissue appeared almost black and looked broken.
- High-voltage tissue disappeared visually after the narrow activation front passed.
- Manual pacing required the user to infer the sequence of placing sites, starting the engine and pulsing.
- Pressing the pulse control while paused did not provide an obvious running-state transition.
- Pacing-site markers were too small and gave no clear stimulus flash.
- The interface said “simulating” even when the tissue was simply running at rest.
- There was no visible legend or live tissue-state summary.

## Delivered changes

- Brighter resting-state colour in activation-wave mode.
- Distinct cyan activation front and warm higher-voltage plateau.
- Deterministic tissue-state summary based on the displayed voltage field.
- Step-by-step overlay for site placement, pulsing, active propagation and resting state.
- “Pulse & run” behaviour when the engine is paused.
- Larger numbered pacing markers with a short pulse halo.
- Visible legend and active-cell count.
- More informative running status: paused, running/resting or wave active.
- Focused tests for colour mapping, state detection and guidance.

## Explicit non-goals

- No numerical solver changes.
- No Web Worker changes.
- No modification of current-stimulus amplitude, radius or duration.
- No layout redesign of the full simulator page; that remains Task 2.
- No pseudo-ECG redesign; that remains Task 2.
- No assessment or authentication changes.

## Review boundary

The state labels describe the visible voltage field. They are educational display categories, not anatomical or clinical tissue classifications.
