# ADR 0006: Finite-duration verification stimulus current

## Status

Accepted.

## Context

The original paired-stimulus protocol assigned voltage directly with
`u=max(u,1)`. This guaranteed local excitation, had no duration or current
units, and prevented strength-duration reasoning. It also used one S1 pulse and
confirmed its transition only by bisection.

## Decision

For the paired-stimulus verification protocol, add a rectangular monophasic
source to the voltage right-hand side through the solver's existing optional
source arrays. A pulse is specified by integer onset and duration steps, uses
the endpoint-exclusive interval `[onset,onset+duration)`, and writes only to
conductive nodes in its validated rectangular region.

The default protocol uses dimensionless current amplitude 5, duration 0.20,
three S1 pulses, and basic cycle length 40. S2 coupling is measured from final
S1 onset. A matched no-S2 control and an exhaustive dt-resolved reference scan
are required. Cached bisection is an optimization only and must exactly match
the exhaustive transition.

## Consequences

The protocol now has explicit current and duration semantics and no longer
forces voltage state. All prior direct-assignment PR 4 baselines are
superseded. The chosen pulse and short conditioning train are project-defined
normalized characterization settings; they are not physiological pacing,
steady-state conditioning or an effective refractory-period measurement.

The application scenarios retain their existing interaction operators in this
PR. Generalizing scenario scheduling and UI pacing is separate work.

## References

- openCARP ERP restitution example, conditioning train and propagated-capture
  bisection: <https://opencarp.org/documentation/examples/02_ep_tissue/03f_erp_restitution>.
- openCARP parameter reference for pulse start, duration, strength, count and
  basic cycle length: <https://opencarp.org/parameters/master/>.
- Göktepe and Kuhl (2009), external stimulus term in the generalized model:
  <https://doi.org/10.1002/nme.2571>.
