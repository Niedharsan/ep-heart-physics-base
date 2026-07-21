# ADR 0001: Numerical engine boundary

## Decision

Keep all numerical simulation independent of React and execute it in a Web Worker. Communicate through typed command/event messages.

## Reason

This prevents UI rendering from controlling numerical time, supports profiling and creates a path to WebGPU/WASM without rewriting the product shell.
