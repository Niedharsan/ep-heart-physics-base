# First Codex High-mode task

Audit and strengthen this repository as the base of a real browser cardiac-electrophysiology engine.

## Required sequence

1. Run the current app and `npm run check`.
2. Read all documents and ADRs.
3. Inspect the Aliev-Panfilov equations, explicit diffusion update, stability cap, no-flux boundary handling, stimulus, lesions, worker timing and pseudo-ECG.
4. List scientific and software weaknesses by severity. Do not silently rewrite the engine before presenting the audit.
5. Propose small pull requests for:
   - equation/parameter verification;
   - planar conduction-velocity measurement;
   - radial symmetry and dx/dt convergence tests;
   - refractory capture testing;
   - deterministic obstacle re-entry setup;
   - lesion-complete versus lesion-gap block tests;
   - improved pseudo-ECG formulation;
   - profiling and memory-transfer improvements.
6. Implement only the first approved pull request.
7. Run type-check, lint, tests, benchmark and production build.
8. Report exact results and remaining limitations.

## Constraints

- Do not claim Epicardio equivalence.
- Do not add 3D yet.
- Do not add AI.
- Do not replace physical simulation with prerecorded waveforms.
- Do not redesign the interface except where needed for verification.
- Do not copy external simulator code without licence review and attribution.
