# EP Heart Physics

Browser-based cardiac electrophysiology simulation and learning platform built with TypeScript, React and Web Workers.

**Live demo:** https://niedharsan.github.io/ep-heart-physics/

## What it does

EP Heart Physics combines a deterministic 2D cardiac-tissue simulation with interactive pacing, lesion experiments, signal interpretation and structured electrophysiology assessment.

The simulator is not driven by prerecorded animations. Tissue state evolves through a reduced Aliev–Panfilov reaction–diffusion model, and displayed signals are derived from the evolving simulation state.

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

Detailed reports are available in [`docs/`](docs/).

### Learning and assessment

The browser application also includes a separate educational layer with:

- simulator and assessment routes
- structured EP interpretation tasks
- versioned scenario and measurement definitions
- deterministic session control
- domain-approved rubric requirements for scored free-text tasks
- live clinical-trace assessment support where configured

The numerical engine, learning content and assessment logic are deliberately separated so educational features cannot silently alter the physics model.

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

The engine is framework-independent and runs outside the React render loop. Simulation, signal sampling and UI publication operate on separate clocks.

## Run locally

```bash
npm install
npm run dev
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
