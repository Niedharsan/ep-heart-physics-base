# Build report — 2026-07-10

The packaged base was checked with:

```bash
npm run check
```

Results at packaging time:

- TypeScript strict type-check: passed
- ESLint: passed with no warnings
- Vitest: 7 tests passed
- Reference benchmark: approximately 1,300 solver steps/second on a 160 × 104 grid in the packaging environment; this is not a universal performance guarantee
- Vite production build: passed
- Production source maps: disabled
- Prebuilt `dist/`: included for local review without npm

Known scientific limitations are documented in `docs/PHYSICS_MODEL.md` and `docs/VALIDATION_PLAN.md`.
