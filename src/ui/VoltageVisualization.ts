export type VoltageDisplayMode = 'wavefront' | 'voltage' | 'monochrome';

export interface VoltageVisualizationOptions {
  readonly mode: VoltageDisplayMode;
  readonly brightness: number;
  readonly frontWidth: number;
}

type Rgba = readonly [number, number, number, number];

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  if (edge0 === edge1) return value < edge0 ? 0 : 1;
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function scaleChannel(value: number, brightness: number): number {
  return Math.round(clamp01(value * brightness) * 255);
}

function interpolateStops(
  value: number,
  stops: readonly (readonly [number, number, number])[],
): readonly [number, number, number] {
  const scaled = clamp01(value) * (stops.length - 1);
  const low = Math.floor(scaled);
  const high = Math.min(stops.length - 1, low + 1);
  const fraction = scaled - low;
  const first = stops[low]!;
  const second = stops[high]!;
  return [
    first[0] + (second[0] - first[0]) * fraction,
    first[1] + (second[1] - first[1]) * fraction,
    first[2] + (second[2] - first[2]) * fraction,
  ];
}

const voltageStops = [
  [0.012, 0.026, 0.070],
  [0.030, 0.115, 0.250],
  [0.020, 0.380, 0.580],
  [0.100, 0.800, 0.760],
  [0.920, 0.940, 0.700],
] as const;

export function mapVoltageToRgba(
  value: number,
  options: VoltageVisualizationOptions,
): Rgba {
  const normalized = clamp01(value);
  const brightness = Math.max(0, options.brightness);

  if (options.mode === 'wavefront') {
    const width = Math.max(0.01, options.frontWidth);
    const centre = 0.48;
    const distance = Math.abs(normalized - centre);
    const core = 1 - smoothstep(width * 0.15, width, distance);
    const halo = 1 - smoothstep(width, width * 2.8, distance);
    const plateau = smoothstep(0.72, 1, normalized) * 0.08;

    return [
      scaleChannel(0.015 + core * 0.70 + halo * 0.04 + plateau * 0.08, brightness),
      scaleChannel(0.035 + core * 0.94 + halo * 0.44 + plateau * 0.12, brightness),
      scaleChannel(0.090 + core * 0.98 + halo * 0.84 + plateau * 0.28, brightness),
      255,
    ];
  }

  if (options.mode === 'monochrome') {
    const intensity = 0.025 + Math.pow(normalized, 0.75) * 0.90;
    return [
      scaleChannel(intensity * 0.82, brightness),
      scaleChannel(intensity * 0.94, brightness),
      scaleChannel(intensity, brightness),
      255,
    ];
  }

  const [red, green, blue] = interpolateStops(normalized, voltageStops);
  return [
    scaleChannel(red, brightness),
    scaleChannel(green, brightness),
    scaleChannel(blue, brightness),
    255,
  ];
}
