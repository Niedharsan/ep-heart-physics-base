# EP Signal Engine — Phase 1 Foundation

## Scope

This phase introduces the versioned scientific contracts and validation gates for a future professional ECG/EGM engine. It deliberately does **not** replace any assessment trace yet.

## Architecture decision

The production application will use an independently implemented TypeScript/WebAssembly signal engine. openCARP may be used offline for reference simulations and validation, but it will not be bundled into the browser application. This keeps the shipped engine lightweight and avoids making the commercial product dependent on openCARP's academic-use licence. ECGSYN's published model may inform independent surface-ECG design and validation, but its GPLv3 source code will not be copied into the product.

The final pipeline is:

1. versioned scenario definition;
2. physiological activation/conduction event graph;
3. surface-potential and intracardiac-potential synthesis;
4. unipolar and bipolar electrode projection;
5. acquisition filters, gain, noise and sampling;
6. validated `Float64Array` channel output;
7. high-DPI clinical renderer and assessment tools.

## Phase 1 contracts

The new `src/epSignal` module defines:

- explicit millisecond, hertz, millimetre and millivolt conventions;
- surface ECG, unipolar EGM, bipolar EGM, stimulus and reference channels;
- three-dimensional electrode-contact geometry;
- acquisition filters, sample rate, duration, sweep speed and gain;
- physiological events and measurement landmarks;
- deterministic scenario seeds;
- semantic scenario and engine versions;
- source provenance and review status;
- generated `Float64Array` signal sets;
- scenario and generated-output validation.

Sampling starts at `t = 0` and includes every sample instant not exceeding the configured duration. When the duration lies on the sampling grid, the final endpoint is included. For duration `T` milliseconds and sample rate `f` hertz:

`sampleCount = floor(T × f / 1000) + 1`

This convention is now testable and cannot silently vary between generators or renderers.

## Validation gates

A scenario is rejected before generation when it contains, among other defects:

- duplicate channel, event, measurement or source identifiers;
- invalid electrode coordinates or zero-length bipoles;
- channel/geometry mismatches;
- impossible filters or Nyquist violations;
- events outside recording duration;
- unknown event-channel references;
- inconsistent measurement values and event times;
- invalid semantic versions or deterministic seeds.

Generated recordings are rejected before rendering when they contain:

- missing or unexpected channels;
- mismatched scenario, engine, seed, duration or sample rate;
- incorrect sample counts;
- non-`Float64Array` storage;
- non-finite values.

Low surface or intracardiac sample rates produce explicit warnings rather than being silently accepted.

## Determinism

The phase adds a cross-runtime PCG32 pseudo-random stream. Later baseline noise, respiratory modulation and controlled beat-to-beat variation will use this stream, allowing a scenario to reproduce identical arrays in tests, client review and deployed builds.

## Research basis

1. openCARP documents bidomain extracellular potentials as the most accurate reference approach, with pseudo-bidomain and recovery methods offering lower-cost alternatives for electrograms and ECGs.
2. openCARP's lead-field workflow separates static electrode sensitivity from dynamic cardiac sources, allowing repeated ECG reconstruction from simulated transmembrane voltages.
3. ECGSYN describes a three-ODE dynamical surface-ECG model with configurable PQRST morphology and RR variability. Its PhysioNet implementation is GPLv3, so its code is a validation reference rather than a production dependency.
4. WFDB provides a mature signal-plus-annotation storage model suitable for future import/export adapters.
5. HRS EP-laboratory standards describe modern EP systems as high-resolution multichannel recording systems with adjustable amplifiers and filters.
6. Computational and experimental studies show that bipolar EGM morphology depends on electrode spacing, electrode size, wavefront direction and local conduction; therefore electrode geometry is part of the engine contract rather than a cosmetic label.

## Remaining sequential phases

1. **Completed by this patch:** contracts, deterministic sampling and validation.
2. Activation/conduction event engine with refractoriness, block, capture and pathway routing.
3. Surface ECG synthesis with lead-specific P-QRS-T morphology.
4. Intracardiac unipolar potentials and geometry-aware bipolar derivation.
5. Acquisition pipeline: filters, notch, gain, baseline wander and deterministic noise.
6. High-DPI clinical renderer with sweep, freeze, zoom, pan, gain and calipers.
7. One fully validated pilot assessment conversion.
8. Conversion of remaining Tasks 2–5 and removal of schematic event-shape renderers.
9. openCARP/reference-recording comparison, numerical tolerances and EP-specialist sign-off.

No later phase should bypass Phase 1 validation.

## Primary references

- openCARP. *Extracellular potentials and ECGs.* https://opencarp.org/documentation/examples/02_ep_tissue/07_extracellular
- openCARP. *Lead field ECG.* https://opencarp.org/documentation/examples/02_ep_tissue/09_leadfield
- openCARP. *Getting started and licensing scope.* https://opencarp.org/getting-started
- McSharry PE, Clifford GD, Tarassenko L, Smith LA. *A dynamical model for generating synthetic electrocardiogram signals.* IEEE Trans Biomed Eng. 2003;50:289–294.
- PhysioNet. *ECGSYN v1.0.0.* https://physionet.org/content/ecgsyn/1.0.0/
- PhysioNet. *WFDB Programmer's Guide: file types.* https://physionet.org/physiotools/wpg/wpg_39.htm
- Kligfield P, et al. *Recommendations for the Standardization and Interpretation of the Electrocardiogram, Part I.* Circulation. 2007;115:1306–1324.
- Link MS, et al. *Heart Rhythm Society Expert Consensus Statement on Electrophysiology Laboratory Standards.* Heart Rhythm. 2014;11:e9–e51.
- Gaeta S, et al. *Mechanism and magnitude of bipolar electrogram directional sensitivity.* Heart Rhythm. 2020;17:777–785.
- Takigawa M, et al. *Detailed Analysis of the Relation Between Bipolar Electrode Spacing and Far- and Near-Field Electrograms.* JACC Clin Electrophysiol. 2019;5:66–77.
