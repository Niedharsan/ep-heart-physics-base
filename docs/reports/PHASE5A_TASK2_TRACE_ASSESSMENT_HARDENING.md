# Phase 5A — Task 2 trace and assessment hardening

## Scope
This correction phase replaces the shared Task 2 placeholder waveform with ten deterministic, case-specific educational traces and hardens explanation marking. It does not modify the solver, numerical model, worker, pacing, or physics-verification code.

## Trace architecture
- `traceCatalog.ts` contains one immutable configuration per SNRT, ARP, ERP, AVNRT, Wenckebach, sinus bradycardia, sinus pause, Mobitz I, Mobitz II, and complete heart block case.
- `traceRendererModel.ts` converts trace events into deterministic SVG path data.
- `TraceStrip.tsx` is the reusable accessible renderer. Each SVG has a title and description, channel labels where relevant, and the visible statement “Synthetic educational tracing — not patient data.”
- No random values, timers, solver output, or deployment-host assumptions are used by trace generation.

## Marking
- Task 2 remains capped at exactly 22 marks.
- Diagnoses retain deterministic scoring and partial credit.
- Explanation marks use groups of clinically equivalent phrases plus relationship checks.
- Bare unordered keyword lists do not receive explanation marks.
- Wenckebach, Mobitz I, and Mobitz 1 remain accepted diagnosis synonyms.

## Verification
Focused tests cover trace uniqueness, deterministic render data, metadata, ARP/ERP separation, Mobitz I/II structure, AV dissociation, paraphrase credit, keyword-dump rejection, and the 22-mark ceiling. Existing Task 1 files are not changed.

## Deployment portability
`vite.config.ts` remains unchanged with `base: './'`. The patch adds no domain, origin, Vercel, pathname, or hosting-provider assumptions. Existing routing is preserved because no routing defect was demonstrated in this scope.
