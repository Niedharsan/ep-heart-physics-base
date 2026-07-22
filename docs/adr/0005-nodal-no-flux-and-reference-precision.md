# ADR 0005: Nodal no-flux boundary and reference precision

## Status

Accepted.

## Context

The grid is documented as nodal: a width of `N` represents physical extent
`(N-1)dx`. The previous outer-boundary stencil substituted the boundary value
for an out-of-domain neighbour. That is a one-sided, cell-centred-style flux
closure and did not match the stated nodal convention. Formal verification was
also limited to Float32 state storage and propagation-derived quantities.

## Decision

For a nodal homogeneous Neumann outer boundary, use even reflection of the
interior node (`u[-1]=u[1]`, with the analogous rule on every face). Continue
using centre-value substitution on a conductive node's face when the adjacent
mask node is non-conductive; this encodes zero transfer across that mask face.

Make state-storage precision a required solver configuration value. Use
Float32 for the browser runtime and Float64 for verification references.
JavaScript operations remain binary64 in both modes. Allow optional per-step
source arrays so manufactured solutions can exercise the production update
without embedding verification equations in runtime configuration.

Keep measured errors and observed-order analysis separate from acceptance
gates. Non-contracting and oscillatory results remain reportable data rather
than being discarded by analysis exceptions.

## Consequences

The corrected outer stencil changes boundary-adjacent dynamics and therefore
requires deterministic rebaselining. PR 4 downstream latencies shift slightly,
although its failure/capture bracket does not. The explicit diffusion
stability bound remains conservative for the reflected stencil.

Float64 mode reduces state-rounding effects but is not an independent method,
arbitrary precision, or proof of scientific validity. Manufactured forcing is
a verification mechanism and is not part of an educational scenario.

## References

- IEEE 754-2019, floating-point arithmetic:
  <https://standards.ieee.org/ieee/754/6210/>.
- NIST DLMF, trigonometric functions and identities used by the cosine mode:
  <https://dlmf.nist.gov/4>.
- Salari and Knupp, *Code Verification by the Method of Manufactured
  Solutions*, SAND2000-1444:
  <https://www.osti.gov/biblio/759450>.
