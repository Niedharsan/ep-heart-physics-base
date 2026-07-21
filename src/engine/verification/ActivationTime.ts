export function interpolateUpwardCrossing(
  previousValue: number,
  currentValue: number,
  previousTime: number,
  currentTime: number,
  threshold: number,
): number | null {
  for (const [name, value] of Object.entries({ previousValue, currentValue, previousTime, currentTime, threshold })) {
    if (!Number.isFinite(value)) throw new Error(`Activation crossing ${name} must be finite.`);
  }
  if (!(currentTime > previousTime)) throw new Error('Activation crossing currentTime must be greater than previousTime.');
  if (!(previousValue < threshold && currentValue >= threshold)) return null;
  const fraction = (threshold - previousValue) / (currentValue - previousValue);
  return previousTime + fraction * (currentTime - previousTime);
}
