# Phase 4A: channel-aware assessment foundation

## Scope

This phase corrects the interval-assessment foundation without changing tissue
physics, Web Worker execution, deterministic simulation clocks, EGM timing values,
normal ranges, or numerical acceptance tests.

## Implemented

- each caliper endpoint now records both model time and EGM channel id;
- the canvas maps horizontal pointer position to time and vertical position to a
  specific trace;
- caliper handles are rendered as prominent row-specific crosshairs with a faint
  full-height timing guide;
- marking requires both the expected timing window and allowed channel pair;
- a correct time on the wrong channel receives zero marks for the complete item;
- crossed start/end handles are ordered chronologically while retaining their
  associated channels;
- student preview hides scenario value sliders, tolerance controls, normal-range
  values, mechanism labels, reference instructions, and expected values;
- instructor preview is available through
  `/?mode=assessment&view=instructor` and exposes configuration deliberately;
- student feedback export removes expected-value fields from the normal UI export;
- local attempt storage is migrated to a version-2 key with channel-aware endpoint
  validation;
- a versioned generic assessment-question schema now supports interval,
  diagnosis, short-answer, sequence-ordering, and catheter-placement question
  shapes for later phases;
- student question projections remove the answer-key property before rendering.

## Current channel rules

- AH: HBE atrial deflection to HBE His onset;
- HV: HBE His onset to HBE ventricular onset;
- PR: surface II P onset to surface II ventricular onset;
- RR: consecutive surface II ventricular onsets;
- VA: RVA ventricular onset to HBE retrograde atrial onset.

These rules are explicit implementation choices for the current synthetic channels.
Future clinical-content phases must review each scenario against its approved source
and may use multiple allowed channels where clinically appropriate.

## Student/instructor boundary

The default assessment URL is the student preview:

`/?mode=assessment`

The instructor configuration preview is:

`/?mode=assessment&view=instructor`

The instructor link is not shown inside the normal student UI. However, this remains
a static login-free browser application. Answer data required for client-side marking
is delivered in the JavaScript bundle and therefore cannot be cryptographically
secret from a technically capable user. Secure examinations require a later backend,
authentication, and server-side marking phase.

## Source boundary

No new clinical ranges or arrhythmia rules are introduced in this phase. Existing AH
and HV ranges remain unchanged. The explicit project marking rule that an incorrect
landmark gives zero marks is extended to include an incorrect EGM channel.

## Storage migration

Previous local attempts used `ep-heart-assessment-attempts-v1` and did not contain
channel ids. Phase 4A uses `ep-heart-assessment-attempts-v2`; old attempts are not
silently reinterpreted as channel-aware attempts.

## Validation targets

Focused tests cover:

- correct channel plus correct timing;
- correct timing on a wrong channel;
- correct channels at wrong times;
- crossed caliper handles;
- student answer-key projection;
- generic future question shapes;
- student/instructor view resolution;
- existing deterministic waveform, interval, range, and configuration checks.
