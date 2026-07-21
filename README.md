# EP Heart Physics Base

A GitHub-ready starting repository for a browser-based cardiac electrophysiology simulator. It is designed to be opened in Codex and improved in staged, reviewable milestones.

## What is implemented

- TypeScript/Vite/React shell
- Engine separated from React UI
- Web Worker simulation loop
- Reduced Aliev–Panfilov reaction–diffusion model
- Explicit 2D five-point diffusion operator with a calculated stability limit
- No-flux boundaries
- Typed-array voltage/recovery state
- Physical stimulation and non-conductive circular lesions
- Planar-wave and focal-rhythm scenarios
- Obstacle/re-entry development scaffold
- Signal-derived pseudo-ECG lead
- Voltage-field canvas
- Unit tests and benchmark scaffold
- GitHub Actions and Pages deployment
- Architecture, physics, validation and roadmap documents

## Scientific status

This is an **education/research prototype**, not a digital twin, medical device, diagnostic system or clinically validated simulator. The reduced model is useful for excitable-wave dynamics, but it is not a calibrated human ionic model. The pseudo-ECG is an approximation, not a torso-conduction forward solution.

## Run locally

```bash
npm install
npm run dev
```

Open the URL shown by Vite.

## Full verification command

```bash
npm run check
```

## Open the prebuilt version without npm

After a production build:

```bash
cd dist
python3 -m http.server 5173
```

Then open `http://localhost:5173`.

## Recommended first Codex task

Ask Codex High mode to audit the code against `docs/VALIDATION_PLAN.md`, correct numerical/scientific weaknesses, and create a sequence of small pull requests. It should not begin 3D work until the 2D propagation tests are credible.
