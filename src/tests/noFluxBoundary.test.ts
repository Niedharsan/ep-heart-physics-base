import { describe, expect, it } from 'vitest';
import { alievPanfilovPresets, AlievPanfilovModel } from '../engine/models/AlievPanfilov';
import { fivePointNoFluxLaplacianAt } from '../engine/numerics/FivePointNoFluxLaplacian';
import { MonodomainSolver } from '../engine/numerics/MonodomainSolver';

describe('nodal outer no-flux stencil', () => {
  it('reflects the interior neighbour at every outer face and corner', () => {
    const width = 5;
    const height = 5;
    const state = new Float64Array(width * height);
    const mask = new Uint8Array(width * height).fill(1);
    state.fill(1);
    state[2 * width + 1] = 2;
    expect(fivePointNoFluxLaplacianAt(state, mask, width, height, 1, 0, 2)).toBe(2);

    state.fill(1);
    state[1] = 2;
    state[width] = 3;
    expect(fivePointNoFluxLaplacianAt(state, mask, width, height, 1, 0, 0)).toBe(6);
  });

  it('preserves constants and matches the discrete cosine Neumann eigenmode at every node', () => {
    const width = 17;
    const height = 13;
    const dx = 0.25;
    const mask = new Uint8Array(width * height).fill(1);
    const constant = new Float64Array(width * height).fill(0.37);
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
      expect(fivePointNoFluxLaplacianAt(constant, mask, width, height, dx, x, y)).toBe(0);
    }

    const modeX = 2;
    const modeY = 3;
    const mode = new Float64Array(width * height);
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
      mode[y * width + x] = Math.cos(modeX * Math.PI * x / (width - 1))
        * Math.cos(modeY * Math.PI * y / (height - 1));
    }
    const eigenvalue = -4 * (
      Math.sin(modeX * Math.PI / (2 * (width - 1))) ** 2
      + Math.sin(modeY * Math.PI / (2 * (height - 1))) ** 2
    ) / (dx * dx);
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
      expect(fivePointNoFluxLaplacianAt(mode, mask, width, height, dx, x, y))
        .toBeCloseTo(eigenvalue * mode[y * width + x]!, 11);
    }
  });
});

describe('masked obstacle no-flux stencil', () => {
  it('uses centre substitution at a masked face and ignores stored obstacle values', () => {
    const width = 8;
    const height = 8;
    const state = new Float64Array(width * height).fill(1);
    const mask = new Uint8Array(width * height).fill(1);
    const center = 3 * width + 3;
    mask[center - 1] = 0;
    state[center] = 2;
    state[center + 1] = 4;
    state[center - width] = 3;
    state[center + width] = 5;
    state[center - 1] = 1000;
    expect(fivePointNoFluxLaplacianAt(state, mask, width, height, 1, 3, 3)).toBe(6);
    state[center - 1] = -1000;
    expect(fivePointNoFluxLaplacianAt(state, mask, width, height, 1, 3, 3)).toBe(6);
  });

  it('preserves a uniform conductive field and prevents one-step leakage through a wall', () => {
    const width = 8;
    const height = 8;
    const mask = new Uint8Array(width * height).fill(1);
    const uniform = new Float64Array(width * height).fill(0.4);
    for (let y = 2; y <= 5; y += 1) for (let x = 2; x <= 5; x += 1) {
      if ((x - 3.5) ** 2 + (y - 3.5) ** 2 <= 2) mask[y * width + x] = 0;
    }
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
      if (mask[y * width + x] === 1) {
        expect(fivePointNoFluxLaplacianAt(uniform, mask, width, height, 1, x, y)).toBe(0);
      }
    }

    mask.fill(1);
    const separated = new Float64Array(width * height);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < 4; x += 1) separated[y * width + x] = 1;
      mask[y * width + 4] = 0;
    }
    for (let y = 0; y < height; y += 1) {
      expect(fivePointNoFluxLaplacianAt(separated, mask, width, height, 1, 5, y)).toBe(0);
    }
  });

  it('conserves conductive-state mass for an interior obstacle in direct and solver updates', () => {
    const solver = new MonodomainSolver({
      grid: { width: 17, height: 17, dx: 1 },
      diffusion: 0.1,
      requestedDt: 0.01,
      stepsPerFrame: 1,
      model: alievPanfilovPresets.goktepeKuhl2009Figure4Generalized,
      statePrecision: 'float64',
    });
    solver.addObstacle(8, 8, 2);
    for (let y = 2; y < 15; y += 1) for (let x = 2; x < 15; x += 1) {
      const index = solver.tissue.index(x, y);
      if (solver.tissue.mask[index] === 1) solver.voltage[index] = 0.1 + 0.01 * ((3 * x + 5 * y) % 17);
    }
    let laplacianSum = 0;
    for (let y = 0; y < 17; y += 1) for (let x = 0; x < 17; x += 1) {
      laplacianSum += fivePointNoFluxLaplacianAt(
        solver.voltage, solver.tissue.mask, 17, 17, 1, x, y,
      );
    }
    expect(Math.abs(laplacianSum)).toBeLessThan(1e-12);

    const model = new AlievPanfilovModel(alievPanfilovPresets.goktepeKuhl2009Figure4Generalized);
    const sourceU = new Float64Array(solver.tissue.size);
    const sourceV = new Float64Array(solver.tissue.size);
    for (let index = 0; index < solver.tissue.size; index += 1) {
      if (solver.tissue.mask[index] !== 1) continue;
      const [reactionU, reactionV] = model.derivatives(solver.voltage[index]!, solver.recovery[index]!);
      sourceU[index] = -reactionU;
      sourceV[index] = -reactionV;
    }
    let before = 0;
    for (let index = 0; index < solver.tissue.size; index += 1) {
      if (solver.tissue.mask[index] === 1) before += solver.voltage[index]!;
    }
    solver.step({ voltage: sourceU, recovery: sourceV });
    let after = 0;
    for (let index = 0; index < solver.tissue.size; index += 1) {
      if (solver.tissue.mask[index] === 1) after += solver.voltage[index]!;
    }
    expect(after).toBeCloseTo(before, 12);
  });
});
