# Phase 3B: unified client preview integration

## Scope

This phase provides a single login-free entry point for client review. It does not
change tissue physics, Web Worker execution, EGM waveform generation, interval
marking, local attempt storage or any numerical acceptance test.

## Routes

- `/` — client preview landing page;
- `/?mode=simulator` — existing 2D tissue simulator;
- `/?mode=assessment` — existing running EGM interval assessment;
- `/?mode=assessment#feedback` — assessment feedback panel.

Path aliases `/simulator` and `/assessment` remain recognized by the client router,
but query-string routes are recommended for static preview hosting because they do
not require server-side rewrite configuration.

## Delivered client-review behaviour

- one landing page listing every currently working module;
- persistent module navigation in the simulator and EGM assessment;
- explicit development and clinical-use disclaimers;
- clear separation of available capabilities from planned requirements;
- direct link to the structured feedback panel;
- deterministic route-resolution tests.

## Explicitly not implemented

The landing page labels the following as planned rather than complete:

- catheter-positioning and CS-labelling assessment;
- arrhythmia/ECG pattern recognition;
- SNRT, refractory-period and pacing-manoeuvre exercises;
- weekly quizzes, instructor publishing and shared result review.

## Deployment boundary

The branch can be deployed as a static Vite site. A client-facing deployment should
run `npm run check` before build and retain the development-preview disclaimer.
