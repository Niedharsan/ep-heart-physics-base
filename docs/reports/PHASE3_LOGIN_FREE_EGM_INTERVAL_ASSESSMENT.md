# Phase 3: login-free running EGM interval assessment

## Scope

This phase adds a separate assessment workspace without changing solver physics,
Web Worker execution, deterministic runtime clocks or the existing tissue simulator.
Open it with `/assessment` or `/?mode=assessment`.

## Implemented

- deterministic synthetic running EGM display;
- surface lead II, HRA, HBE, RVA and distal CS channels;
- configurable cycle length, AH, HV, PR and retrograde VA timing;
- draggable start and end calipers;
- landmark-aware marking for AH, HV, PR, RR and VA;
- zero score for an anatomically incorrect landmark pair;
- configurable measurement tolerance;
- typed measurement plus caliper-derived measurement validation;
- normal/abnormal marking where an approved range exists;
- local-browser attempt history without accounts;
- client feedback package copied as JSON;
- dedicated deterministic unit tests.

## Source boundary

The uploaded *Basic EP Study* chapter explicitly states:

- AH is measured from the intrinsic atrial electrogram on the His catheter to
  the earliest onset of the His electrogram, with 55-125 ms considered normal.
- HV is measured from the His electrogram to the earliest ventricular
  activation, with 35-55 ms considered normal.
- RR/cycle length should be recorded for the cycle preceding basic interval
  measurement because AH is rate dependent.

The uploaded assessment task document requires normal measurements and normal
activation-pattern explanation. It also defines later tasks for SNRT, refractory
periods, AVNRT, Wenckebach, atrial tachycardia, AVRT, VAAV/VAV, VT and para-Hisian
pacing. Those are deliberately not implemented in this phase.

PR, RR and VA normal ranges are not inferred in this phase. The marking engine
supports ranges, but they remain unset until an approved instructor table is
provided or a directly supporting source is identified.

## Scientific limitations

The traces are synthetic educational waveforms. They are not recordings from a
patient, are not a validated clinical simulator and must not be used for diagnosis,
medical decision-making or device programming.
