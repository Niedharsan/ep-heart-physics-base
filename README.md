# EP Heart Physics

Browser-based cardiac electrophysiology simulation and learning platform built with TypeScript, React and Web Workers.

**Live demo:** https://niedharsan.github.io/ep-heart-physics-base/

> **AI status:** the Gemini 2.5 Flash simulator tutor is implemented and tested on `feat/ai-tutor-tools` in [PR #12](https://github.com/Niedharsan/ep-heart-physics-base/pull/12), stacked on the read-only tutor work in [PR #11](https://github.com/Niedharsan/ep-heart-physics-base/pull/11). The public GitHub Pages build includes the tutor interface, but GitHub Pages does not host the server-side `/api/tutor` function, so visitors cannot invoke Gemini or consume API credits there. Assessment pages also include a post-submission **Ask why** panel; that assessment-tutor panel is currently a UI boundary and is not yet connected to Gemini.

## What it does

EP Heart Physics combines a deterministic 2D cardiac-tissue simulation with interactive pacing and lesion experiments, live ECG/EGM interpretation, structured electrophysiology assessments and an evidence-grounded AI tutor for the simulator.

The simulator is not driven by prerecorded animations. Tissue state evolves through a reduced Aliev–Panfilov reaction–diffusion model, and displayed signals are derived from the evolving simulation state.

## AI-assisted EP tutor

The simulator tutor uses **Gemini 2.5 Flash through a server-side REST API** to explain the current simulation and, when useful, suggest one supported simulator action.

The AI layer is separated from the scientific engine:

- the browser sends a compact typed summary of the current simulator state rather than raw voltage or tissue arrays;
- Gemini receives the learner's question together with that structured evidence;
- responses use a structured JSON contract containing the answer, evidence used, limitations and at most one proposed action;
- proposed actions are limited to **start**, **pause**, **reset** or **load an existing scenario**;
- the browser validates a proposed action before showing it to the learner;
- no action runs automatically;
- the AI cannot alter solver parameters, create lesions, choose arbitrary stimulation coordinates, change assessment scoring or write directly to simulation state;
- `GEMINI_API_KEY` remains server-side.

```text
Learner question
      │
      ▼
React EP tutor + typed simulation evidence
      │
      ▼
server-side /api/tutor
      │
      ▼
Gemini 2.5 Flash
      │
      ▼
structured answer + optional validated action
      │
      ▼
user approval → existing simulator control path

Web Worker → reaction–diffusion solver → simulation state
```

## Simulation

- reduced Aliev–Panfilov excitable-tissue model
- explicit 2D five-point diffusion with stability constraints
- no-flux boundary handling
- Web Worker numerical runtime separated from React rendering
- typed-array voltage and recovery state
- focal and planar stimulation
- programmable pacing sites
- non-conductive lesions and obstacle experiments
- voltage-field visualization
- pseudo-ECG / intracardiac-style signal derivation
- deterministic, versioned scenarios

## Learning and assessment

The educational layer includes:

- interval measurement and basic EP-study tasks
- sinus-node, refractoriness and AV-block interpretation
- tachycardia and AH-change interpretation
- intracardiac manoeuvres
- VT and para-Hisian pacing
- VT/PVC localisation tasks
- live synthetic ECG/EGM traces with freeze, replay, speed control, enlargement and measurement tools
- deterministic marking, timed sessions and practice/instructor views
- a post-submission **Ask why** assessment-tutor panel, currently present as UI but not yet connected to Gemini

The current Task 3 assessment contains six deterministic synthetic ECG/EGM cases covering tachycardia localisation, AH change, cannon waves, adenosine and AVNRT, for a total of 23 marks.

## Verification

The repository includes scientific and numerical verification covering:

- equation and parameter checks
- reference-solver comparison
- planar conduction velocity
- grid/time-step refinement
- radial propagation symmetry
- refractory capture behaviour
- runtime determinism and scenario versioning

The AI layer is also covered by deterministic tests for response validation and allowed/blocked simulator actions. Live local smoke testing has been performed against Gemini 2.5 Flash without exposing the API key to the frontend.

Detailed reports are available in [`docs/`](docs/).

## Architecture

```text
React UI / assessment experience
            │
            ▼
    typed application state
            │
            ▼
      Web Worker runtime
            │
            ▼
reaction–diffusion solver
            │
      ┌─────┴──────────┐
      ▼                ▼
field rendering   derived signals
```

The numerical engine, learning content, assessment logic and AI layer are separated so educational or AI features cannot silently alter the physics model.

## Run locally

Run the deterministic frontend with:

```bash
npm install
npm run dev
```

To run the simulator tutor locally on the AI branch, create an ignored `.env.local` containing:

```text
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash
```

Then run the frontend and server function together with:

```bash
npx vercel dev
```

Run the complete verification suite with:

```bash
npm run check
```

This performs TypeScript checking, linting, tests and a production build.

## Technology

- TypeScript
- React
- Vite
- Web Workers
- Gemini 2.5 Flash / Google Generative Language REST API
- typed JSON model contracts and validated tool proposals
- Vitest
- GitHub Actions
- GitHub Pages

## Scientific scope

EP Heart Physics is an **educational and research prototype**. It is not a medical device, diagnostic system, patient-specific digital twin or clinically validated simulator.

The reduced electrophysiology model is intended for studying excitable-wave behaviour and teaching electrophysiology concepts. The pseudo-ECG/EGM signals are simplified derived measurements rather than a validated torso-conduction forward model.

## Documentation

- [`docs/PHYSICS_MODEL.md`](docs/PHYSICS_MODEL.md) — model equations, numerical assumptions and limitations
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — software boundaries and runtime design
- [`docs/VALIDATION_PLAN.md`](docs/VALIDATION_PLAN.md) — scientific verification strategy
- [`docs/PERFORMANCE_BUDGET.md`](docs/PERFORMANCE_BUDGET.md) — performance targets and constraints
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — planned scientific and product extensions
- [`docs/adr/`](docs/adr/) — architecture decision records

## License and attribution

See [`LICENSE-NOTICE.md`](LICENSE-NOTICE.md) for repository licensing and third-party attribution notes.
