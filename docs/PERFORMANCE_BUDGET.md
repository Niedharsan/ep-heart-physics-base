# Performance budget

## Current target

- interactive default grid: 160 × 104
- numerical updates in a dedicated Web Worker
- UI snapshot frequency near display refresh, independent of numerical timestep
- no React element per grid cell
- typed arrays for numerical state

## Next target

After scientific verification, reach real-time or faster operation on a 256 × 256 grid on a documented modern laptop browser. Profile numerical execution, worker transfer, canvas rendering and garbage collection separately.

The benchmark test reports measured throughput and intentionally avoids a fabricated universal pass threshold.
