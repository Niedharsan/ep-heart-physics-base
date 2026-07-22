# Phase 2: manual multi-site pacing behaviour

## Scope

This phase fixes the ambiguity observed when users click multiple sites and then
start the simulation.

## Behavioural changes

- `manual-pacing` is the default scenario and contains no automatic source.
- Clicks while paused place numbered pacing sites without directly overwriting
  voltage state.
- Starting the simulation delivers simultaneous finite-duration current pulses
  at all armed sites.
- Clicks while running deliver an immediate finite-duration current pulse.
- Reset retains manual pacing sites and re-arms them; Clear sites removes them.
- Worker stimulation is routed through `SimulationRuntime`, not direct voltage
  assignment.
- Multiple simultaneous sources use a maximum current at overlapping nodes,
  avoiding accidental current summation at overlaps.

## Scientific boundary

The result is correct for a homogeneous isotropic 2D reaction-diffusion sheet:
point-source waves expand approximately radially, collide and annihilate, and
may fail in refractory tissue. It is not yet Epicardio-equivalent whole-heart
propagation. Anatomical geometry, fibre anisotropy, regional conduction,
specialized conduction pathways and physiological calibration remain later
phases.
