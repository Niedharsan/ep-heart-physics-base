# EP Heart Physics

Browser-based cardiac electrophysiology simulation and learning platform built with TypeScript, React and Web Workers.

**Live demo:** https://niedharsan.github.io/ep-heart-physics/

The GitHub Pages demo hosts the browser application. The Gemini tutor requires the server-side `/api/tutor` function (or a configured external tutor endpoint) because the API key is never exposed to the frontend.

## What it does

EP Heart Physics combines a deterministic 2D cardiac-tissue simulation with interactive pacing, lesion experiments, signal interpretation, structured electrophysiology assessment and an AI-assisted EP tutor.

The simulator is not driven by prerecorded animations. Tissue state evolves through a reduced Aliev–Panfilov reaction–diffusion model, and displayed signals are derived from the evolving simulation state.

## AI-assisted EP tutor

The tutor uses **Gemini 2.5 Flash through a server-side REST API** to explain the current simulation and, when useful, suggest a small set of simulator actions.

The AI layer is deliberately separated from the scientific engine:

- the browser converts the live simulator state into a compact, typed evidence object rather than sending raw voltage or tissue arrays;
- Gemini receives the learner's question together with that structured simulation data;
- the API requires a structured JSON response containing the answer, simulation evidence used, limitations and at most one proposed action;
- proposed actions are restricted to **start**, **pause**, **reset** or **load an existing scenario**;
- the browser validates the proposed action again before exposing it to the user;
- no action runs automatically — the learner must explicitly run it;
- the AI cannot alter solver parameters, create lesions, choose arbitrary stimulation coordinates, modify assessment scoring or directly write to simulation state;
- `GEMINI_API_KEY` remains server-side and is never exposed to the Vite frontend.

This creates a controlled tool-use workflow in which the language model handles explanation and high-level guidance while numerical simulation and scientific state transitions remain deterministic and testable.

### AI architecture

```text
Learner question
      │
      ▼
React EP tutor
      │
      ├── compact typed simulation evidence
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
user approval
      │
      ▼
existing simulator control path

Web Worker → reaction–diffusion solver → simulation state
             ▲
             └── never controlled directly by the model
```

The AI integration demonstrates API integration, structured model I/O, evidence grounding, tool whitelisting, human-in-the-loop execution and separation between probabilistic AI reasoning and deterministic scientific computation. It is intentionally a focused single-assistant design rather than a multi-agent system.

### Simulation

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

### Verification

The repository includes scientific and numerical verification work covering:

- equation and parameter checks
- reference-solver comparison
- planar conduction velocity
- grid/time-step refinement
- radial propagation symmetry
- refractory capture behaviour
- runtime determinism and scenario versioning

The AI layer is also covered by deterministic tests for response validation and allowed/blocked simulator actions. Live local smoke testing has been performed against Gemini 2.5 Flash without exposing the API key to the frontend.

Detailed reports are available in [`docs/`](docs/).

### Learning and assessment

The browser application also includes a separate educational layer with:

- simulator and assessment routes
- structured EP interpretation tasks
- versioned scenario and measurement definitions
- deterministic session control
- domain-approved rubric requirements for scored free-text tasks
- live clinical-trace assessment support where configured

The numerical engine, learning content, assessment logic and AI tutor are deliberately separated so educational or AI features cannot silently alter the physics model.

## Core architecture

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

The engine is framework-independent and runs outside the React render loop. Simulation, signal sampling and UI publication operate on separate clocks.

## Run locally

Install dependencies and run the deterministic frontend with:

```bash
npm install
npm run dev
```

To run the EP tutor locally, create an ignored `.env.local` containing:

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
