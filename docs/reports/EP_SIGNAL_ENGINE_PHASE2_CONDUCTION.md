# EP Signal Engine Phase 2 — Activation and Conduction Timeline

## Purpose

Phase 2 adds a deterministic physiological event engine underneath the existing EP assessment code. It does not render traces and does not replace any current task. Its output is a validated activation timeline that Phase 3 will convert into sampled surface ECG and intracardiac electrogram channels.

The engine is intended for reproducible education and assessment scenarios. It is not a patient-specific diagnostic model and does not replace tissue-scale monodomain, bidomain, eikonal or ionic simulations.

## Research basis

The design follows four established modelling principles:

1. **Directed conduction networks with stateful nodes and pathways.** Human AV-node network models represent interacting elements with separate refractory periods and conduction delays that depend on activation history. This supports a directed multigraph rather than hard-coded beat coordinates.
2. **Independent fast and slow AV-nodal pathways.** Functional dual-pathway models use a fast pathway with shorter conduction delay and longer refractoriness, and a slow pathway with longer delay and shorter refractoriness. Independent pathway state is therefore stored on each directed arc.
3. **Recovery, facilitation and fatigue.** Experimental AV-nodal models found that all three history-dependent terms are needed to reproduce rate-dependent conduction and Wenckebach behaviour. Phase 2 exposes an explicit, bounded `av-nodal-history` delay law.
4. **Strength-duration pacing capture.** Capture threshold depends on pulse amplitude and duration. The engine uses the classical rheobase/chronaxie relation `I_threshold = I_rheobase × (1 + chronaxie / pulseWidth)` and permits multiple tissue targets per pacing stimulus.

Primary references:

- Climent AM et al. Functional mathematical model of dual pathway AV nodal conduction. *Am J Physiol Heart Circ Physiol*. 2011. PMID 21257912.
- Talajic M et al. A unified model of atrioventricular nodal conduction predicts dynamic changes in Wenckebach periodicity. *Circ Res*. 1991. PMID 2018992.
- Karlsson M et al. Non-invasive characterization of human AV-nodal conduction delay and refractory period during atrial fibrillation. *Front Physiol*. 2021. PMID 34777001.
- Ingemansson MP et al. Characterisation of human AV-nodal properties using a network model. *Med Biol Eng Comput*. 2017. PMID 28702812.
- Geddes LA. Accuracy limitations of chronaxie values. *IEEE Trans Biomed Eng*. 2004. PMID 14723507.
- Kiełbasa G et al. Strength-duration curves for left bundle branch area pacing. *Heart Rhythm*. 2024. PMID 38759916.
- Boyle PM et al. Simulation methods and validation criteria for modeling cardiac ventricular electrophysiology. *PLoS Comput Biol*. 2014. PMCID PMC4262432.

## Architecture

### Directed multigraph

A conduction network contains:

- versioned node definitions;
- directional conduction arcs;
- node refractory models;
- pathway refractory models;
- fixed, recovery-dependent or AV-history-dependent delays;
- optional initial activation and fatigue state.

Parallel arcs are valid and are required for dual AV-nodal pathways. Bidirectional conduction is represented explicitly as two arcs so antegrade and retrograde properties can differ.

### Nodes

Supported node categories include:

- sinoatrial node;
- atrial myocardium;
- AV node;
- His bundle;
- bundle branches and fascicles;
- Purkinje network;
- ventricular myocardium;
- accessory pathways;
- pacing electrodes and custom structures.

Each node has an absolute refractory period. It may also have a relative refractory period and an increased pacing-capture threshold during relative refractoriness.

### Pathway delay laws

#### Fixed delay

`D = D_fixed`

Used where the scenario requires an explicit calibrated conduction interval.

#### Recovery-dependent delay

`D = clamp(D_min + A × exp(-(Δt - ERP)+ / τ), D_min, D_max)`

Conduction slows as a pathway approaches recovery and approaches `D_min` after long intervals.

#### AV-nodal history delay

The AV-nodal law combines:

- exponential recovery delay;
- exponentially decaying fatigue;
- bounded fatigue accumulation after successful propagation;
- short-cycle facilitation;
- explicit minimum and maximum delay limits.

This law is phenomenological. Scenario parameters must be calibrated against accepted teaching cases or reference data before clinical review status is assigned.

### Event queue

The simulator uses a stable time-priority queue. Equal-time events preserve deterministic insertion order. Every accepted activation launches outgoing pathway attempts in sorted arc-ID order.

The queue records:

- accepted activations;
- rejected activations;
- pathway blocks;
- target-node refractory blocks;
- simultaneous wavefront collisions;
- pacing capture and non-capture;
- events outside the recording window;
- final node and pathway state.

A configurable queue limit prevents malformed zero-refractory cycles from running indefinitely.

### Pacing

A single pacing stimulus may target multiple tissues, allowing later modelling of:

- myocardial-only capture;
- selective His or bundle capture;
- non-selective conduction-system plus myocardial capture;
- para-Hisian output transitions;
- capture loss during refractoriness.

Each target has its own rheobase, chronaxie and latency.

## Validation added

Phase 2 rejects or warns about:

- unsupported schema versions;
- duplicate or malformed IDs;
- missing node references;
- self-loop arcs;
- non-positive delays;
- negative refractory periods;
- invalid recovery, fatigue or facilitation ranges;
- relative refractory periods shorter than absolute periods;
- invalid pacing amplitude, duration, latency, rheobase or chronaxie;
- duplicate pacing targets;
- events outside the requested duration;
- isolated nodes;
- simulations with no activation source.

## Automated tests

The Phase 2 test suite verifies:

1. deterministic sinus-to-His-to-ventricle propagation;
2. fast-to-slow AV pathway switching after a premature atrial activation;
3. progressive history-dependent AV delay and a dropped His response;
4. strength-duration capture, relative-refractory threshold elevation and successful late capture;
5. safe termination of a re-entry loop through refractoriness;
6. graph validation and queue-limit protection.

## Deliberate limitations

Phase 2 does not yet calculate voltage morphology. It does not claim that a graph node is equivalent to a cellular or tissue model. Purkinje-myocardial junctions, spatial activation fields and catheter potentials will be represented in later phases and validated against offline higher-fidelity simulations.

## Phase 3 handoff

Phase 3 will consume `EpConductionTimeline.physiologicalEvents` and generate sampled source signals:

- atrial, His, Purkinje and ventricular source kernels;
- spatially delayed unipolar potentials;
- bipolar subtraction from electrode geometry;
- surface P-QRS-T morphology;
- deterministic baseline wander and acquisition noise;
- calibrated filters and gain;
- `Float64Array` channel output satisfying the Phase 1 signal contracts.
