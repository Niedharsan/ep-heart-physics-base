const UINT32_MAX_PLUS_ONE = 0x1_0000_0000;
const MASK_64 = (1n << 64n) - 1n;
const MULTIPLIER = 6364136223846793005n;

function normalizeUint32(name: string, value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff_ffff) {
    throw new Error(`${name} must be an unsigned 32-bit integer.`);
  }
  return value >>> 0;
}

export interface DeterministicRandom {
  nextUint32(): number;
  nextFloat(): number;
  nextSignedFloat(): number;
}

export function createDeterministicRandom(seed: number, stream = 54): DeterministicRandom {
  const normalizedSeed = normalizeUint32('seed', seed);
  const normalizedStream = normalizeUint32('stream', stream);
  const increment = ((BigInt(normalizedStream) << 1n) | 1n) & MASK_64;
  let state = 0n;

  const nextUint32 = (): number => {
    const previousState = state;
    state = (previousState * MULTIPLIER + increment) & MASK_64;
    const xorshifted = Number((((previousState >> 18n) ^ previousState) >> 27n) & 0xffff_ffffn) >>> 0;
    const rotation = Number((previousState >> 59n) & 31n);
    return ((xorshifted >>> rotation) | (xorshifted << ((-rotation) & 31))) >>> 0;
  };

  nextUint32();
  state = (state + BigInt(normalizedSeed)) & MASK_64;
  nextUint32();

  return Object.freeze({
    nextUint32,
    nextFloat: () => nextUint32() / UINT32_MAX_PLUS_ONE,
    nextSignedFloat: () => nextUint32() / 0x8000_0000 - 1,
  });
}
