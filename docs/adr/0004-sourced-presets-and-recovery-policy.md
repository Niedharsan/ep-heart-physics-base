# ADR 0004: Sourced presets and unconstrained recovery state

## Status

Accepted. This supersedes ADR 0002 only where ADR 0002 preserved the original
unsourced default tuple and treated `v≤2` as a safeguard.

## Decision

Keep the generalized six-parameter `a`/`b` equation, but replace the hybrid
default with the complete Göktepe–Kuhl 2009 Figure 4 generalized preset:

`a=0.05, b=0.15, k=8, epsilon=0.002, mu1=0.2, mu2=0.3`.

Expose that preset and the classic Aliev–Panfilov 1996 preset as immutable,
source-named values. The classic preset uses `a=b=0.15`, so the generalized
recovery equation reduces to the original single-threshold form.

Remove recovery-state clamping from solver updates. Continue to reject
non-finite states immediately and count denominator-guard activation. Retain
the existing voltage clamp temporarily, expose proposed-state extrema, and
require scientific verification protocols to report zero clipping.

## Evidence

The previous `epsilon=0.01` had no source for the complete tuple; the cited
generalized preset uses `0.002`. The old `recoveryMaximum=2` also had no sourced
justification and intersects the model's own positive recovery nullcline. For
`b=0.15, k=8`, its maximum over `u∈[0,1]` is
`k(1+b)²/4 = 2.645`.

Independent unclamped runs of the superseded hybrid tuple reached `v=2.313382`
in the PR2 protocol and `v=2.334206` in the PR4 protocol without a denominator
guard or non-finite state. With the sourced generalized preset, the rebaselined
PR2 and PR4 maxima are `2.310099` and `2.335535`. The former cap therefore
modified finite trajectories rather than containing divergence.

## Consequences

PR2–PR4 quantities are rebaselined and their prior clipped values are
superseded. This source consistency does not calibrate model time or space and
does not validate the explicit finite-difference discretization, physiology,
clinical use, or equivalence to another simulator. Float64 comparison,
manufactured solutions and broader sensitivity studies remain separate work.
