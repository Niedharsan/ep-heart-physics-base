import type { GeneratedEpSignalChannel } from './contracts';
import type {
  EpCalibrationPulseGeometry,
  EpGridLineGeometry,
  EpRenderChannelProfile,
  EpRenderedChannelGeometry,
  EpRenderedEventMarker,
  EpRenderedTimeMarker,
  EpRenderPointMm,
  EpSignalRenderScene,
  EpSignalStripRenderRequest,
  EpSvgRenderOptions,
} from './renderingContracts';
import { assertValidEpSignalStripRenderProfile } from './renderingValidation';

const EPSILON = 1e-9;

function formatNumber(value: number): string {
  const normalized = Math.abs(value) < 5e-8 ? 0 : value;
  return normalized.toFixed(4).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

function pathFromPoints(points: readonly EpRenderPointMm[]): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${formatNumber(point.x)} ${formatNumber(point.y)}`).join(' ');
}

function sampleAt(channel: GeneratedEpSignalChannel, sampleRateHz: number, timeMs: number): number {
  const samplePosition = timeMs * sampleRateHz / 1000;
  const lower = Math.max(0, Math.min(channel.samples.length - 1, Math.floor(samplePosition)));
  const upper = Math.max(0, Math.min(channel.samples.length - 1, lower + 1));
  if (lower === upper) return channel.samples[lower]!;
  const fraction = samplePosition - lower;
  return channel.samples[lower]! * (1 - fraction) + channel.samples[upper]! * fraction;
}

interface TimedSample {
  readonly timeMs: number;
  readonly valueMv: number;
  readonly sourceOrder: number;
}

function windowSamples(
  channel: GeneratedEpSignalChannel,
  sampleRateHz: number,
  startTimeMs: number,
  endTimeMs: number,
): readonly TimedSample[] {
  const samples: TimedSample[] = [];
  let sourceOrder = 0;
  samples.push({ timeMs: startTimeMs, valueMv: sampleAt(channel, sampleRateHz, startTimeMs), sourceOrder });
  sourceOrder += 1;

  const firstInteriorIndex = Math.floor(startTimeMs * sampleRateHz / 1000) + 1;
  const lastInteriorIndex = Math.ceil(endTimeMs * sampleRateHz / 1000) - 1;
  for (let index = firstInteriorIndex; index <= lastInteriorIndex; index += 1) {
    if (index < 0 || index >= channel.samples.length) continue;
    const timeMs = index * 1000 / sampleRateHz;
    if (timeMs <= startTimeMs + EPSILON || timeMs >= endTimeMs - EPSILON) continue;
    samples.push({ timeMs, valueMv: channel.samples[index]!, sourceOrder });
    sourceOrder += 1;
  }

  samples.push({ timeMs: endTimeMs, valueMv: sampleAt(channel, sampleRateHz, endTimeMs), sourceOrder });
  return samples;
}

function selectExtremaPreservingSamples(
  samples: readonly TimedSample[],
  startTimeMs: number,
  paperSpeedMmPerSecond: number,
  minimumHorizontalStepMm: number,
): readonly TimedSample[] {
  if (minimumHorizontalStepMm <= 0 || samples.length <= 2) return samples;

  const bins = new Map<number, TimedSample[]>();
  for (const sample of samples) {
    const xMm = (sample.timeMs - startTimeMs) * paperSpeedMmPerSecond / 1000;
    const bin = Math.floor((xMm + EPSILON) / minimumHorizontalStepMm);
    const current = bins.get(bin);
    if (current) current.push(sample);
    else bins.set(bin, [sample]);
  }

  const selected: TimedSample[] = [];
  const seen = new Set<number>();
  const add = (sample: TimedSample): void => {
    if (!seen.has(sample.sourceOrder)) {
      seen.add(sample.sourceOrder);
      selected.push(sample);
    }
  };

  for (const binSamples of bins.values()) {
    const first = binSamples[0]!;
    const last = binSamples[binSamples.length - 1]!;
    let minimum = first;
    let maximum = first;
    for (const sample of binSamples) {
      if (sample.valueMv < minimum.valueMv) minimum = sample;
      if (sample.valueMv > maximum.valueMv) maximum = sample;
    }
    [first, minimum, maximum, last]
      .sort((left, right) => left.sourceOrder - right.sourceOrder)
      .forEach(add);
  }

  selected.sort((left, right) => left.sourceOrder - right.sourceOrder);
  return selected;
}

function createGridLines(
  plotX: number,
  plotY: number,
  plotWidth: number,
  plotHeight: number,
  minorSpacingMm: number,
  majorSpacingMm: number,
): readonly EpGridLineGeometry[] {
  const lines: EpGridLineGeometry[] = [];
  const classify = (offset: number): 'minor' | 'major' => {
    const multiple = offset / majorSpacingMm;
    return Math.abs(multiple - Math.round(multiple)) < 1e-8 ? 'major' : 'minor';
  };

  const verticalCount = Math.floor(plotWidth / minorSpacingMm + EPSILON);
  for (let index = 0; index <= verticalCount; index += 1) {
    const offset = index * minorSpacingMm;
    lines.push({ orientation: 'vertical', kind: classify(offset), positionMm: plotX + offset });
  }
  if (Math.abs(verticalCount * minorSpacingMm - plotWidth) > EPSILON) {
    lines.push({ orientation: 'vertical', kind: classify(plotWidth), positionMm: plotX + plotWidth });
  }

  const horizontalCount = Math.floor(plotHeight / minorSpacingMm + EPSILON);
  for (let index = 0; index <= horizontalCount; index += 1) {
    const offset = index * minorSpacingMm;
    lines.push({ orientation: 'horizontal', kind: classify(offset), positionMm: plotY + offset });
  }
  if (Math.abs(horizontalCount * minorSpacingMm - plotHeight) > EPSILON) {
    lines.push({ orientation: 'horizontal', kind: classify(plotHeight), positionMm: plotY + plotHeight });
  }
  return Object.freeze(lines);
}

function calibrationPulse(
  channel: EpRenderChannelProfile,
  baselineY: number,
  plotX: number,
  paperSpeedMmPerSecond: number,
  amplitudeMv: number,
  leadInMs: number,
  plateauMs: number,
  leadOutMs: number,
  rightGapMm: number,
): EpCalibrationPulseGeometry {
  const leadInWidth = leadInMs * paperSpeedMmPerSecond / 1000;
  const plateauWidth = plateauMs * paperSpeedMmPerSecond / 1000;
  const leadOutWidth = leadOutMs * paperSpeedMmPerSecond / 1000;
  const totalWidth = leadInWidth + plateauWidth + leadOutWidth;
  const startX = plotX - rightGapMm - totalWidth;
  const polarity = channel.invertPolarity === true ? 1 : -1;
  const raisedY = baselineY + polarity * amplitudeMv * channel.gainMmPerMv;
  const points: EpRenderPointMm[] = [
    { x: startX, y: baselineY },
    { x: startX + leadInWidth, y: baselineY },
    { x: startX + leadInWidth, y: raisedY },
    { x: startX + leadInWidth + plateauWidth, y: raisedY },
    { x: startX + leadInWidth + plateauWidth, y: baselineY },
    { x: startX + totalWidth, y: baselineY },
  ];
  return Object.freeze({
    channelId: channel.channelId,
    pathData: pathFromPoints(points),
    points: Object.freeze(points),
    amplitudeMm: amplitudeMv * channel.gainMmPerMv,
    plateauWidthMm: plateauWidth,
  });
}

function renderChannel(
  source: GeneratedEpSignalChannel,
  profile: EpRenderChannelProfile,
  sampleRateHz: number,
  startTimeMs: number,
  endTimeMs: number,
  plotX: number,
  plotWidth: number,
  rowTop: number,
  paperSpeedMmPerSecond: number,
  minimumHorizontalStepMm: number,
): EpRenderedChannelGeometry {
  const baselineY = rowTop + profile.heightMm / 2;
  const polarity = profile.invertPolarity === true ? -1 : 1;
  const sourceSamples = windowSamples(source, sampleRateHz, startTimeMs, endTimeMs);
  const selected = selectExtremaPreservingSamples(
    sourceSamples,
    startTimeMs,
    paperSpeedMmPerSecond,
    minimumHorizontalStepMm,
  );
  const points = selected.map((sample) => ({
    x: plotX + (sample.timeMs - startTimeMs) * paperSpeedMmPerSecond / 1000,
    y: baselineY - polarity * sample.valueMv * profile.gainMmPerMv,
  }));
  return Object.freeze({
    channelId: profile.channelId,
    label: profile.label,
    gainMmPerMv: profile.gainMmPerMv,
    baselineY,
    clipRect: Object.freeze({ x: plotX, y: rowTop, width: plotWidth, height: profile.heightMm }),
    strokeWidthMm: profile.strokeWidthMm,
    pathData: pathFromPoints(points),
    points: Object.freeze(points),
    sourceSampleCount: sourceSamples.length,
    renderedPointCount: points.length,
  });
}

function createTimeMarkers(
  startTimeMs: number,
  endTimeMs: number,
  intervalMs: number | null,
  plotX: number,
  paperSpeedMmPerSecond: number,
): readonly EpRenderedTimeMarker[] {
  if (intervalMs === null) return Object.freeze([]);
  const markers: EpRenderedTimeMarker[] = [];
  const first = Math.ceil(startTimeMs / intervalMs) * intervalMs;
  for (let timeMs = first; timeMs <= endTimeMs + EPSILON; timeMs += intervalMs) {
    markers.push(Object.freeze({
      timeMs,
      xMm: plotX + (timeMs - startTimeMs) * paperSpeedMmPerSecond / 1000,
      label: `${formatNumber(timeMs / 1000)} s`,
    }));
  }
  return Object.freeze(markers);
}

export function buildEpSignalRenderScene(request: EpSignalStripRenderRequest): EpSignalRenderScene {
  const { signalSet, profile } = request;
  assertValidEpSignalStripRenderProfile(profile, signalSet);

  const plotWidth = profile.durationMs * profile.paperSpeedMmPerSecond / 1000;
  const plotHeight = profile.channels.reduce((sum, channel) => sum + channel.heightMm, 0)
    + profile.channelGapMm * Math.max(0, profile.channels.length - 1);
  const widthMm = profile.marginsMm.left + plotWidth + profile.marginsMm.right;
  const heightMm = profile.marginsMm.top + plotHeight + profile.marginsMm.bottom;
  const plotX = profile.marginsMm.left;
  const plotY = profile.marginsMm.top;
  const endTimeMs = profile.startTimeMs + profile.durationMs;
  const sourceById = new Map(signalSet.channels.map((channel) => [channel.channelId, channel]));

  const channels: EpRenderedChannelGeometry[] = [];
  const pulses: EpCalibrationPulseGeometry[] = [];
  let rowTop = plotY;
  for (const channelProfile of profile.channels) {
    const source = sourceById.get(channelProfile.channelId)!;
    const rendered = renderChannel(
      source,
      channelProfile,
      signalSet.sampleRateHz,
      profile.startTimeMs,
      endTimeMs,
      plotX,
      plotWidth,
      rowTop,
      profile.paperSpeedMmPerSecond,
      profile.minimumHorizontalStepMm,
    );
    channels.push(rendered);
    if (profile.calibration.enabled) {
      pulses.push(calibrationPulse(
        channelProfile,
        rendered.baselineY,
        plotX,
        profile.paperSpeedMmPerSecond,
        profile.calibration.amplitudeMv,
        profile.calibration.leadInMs,
        profile.calibration.plateauMs,
        profile.calibration.leadOutMs,
        profile.calibration.rightGapMm,
      ));
    }
    rowTop += channelProfile.heightMm + profile.channelGapMm;
  }

  const allowedKinds = profile.eventKinds === undefined ? null : new Set(profile.eventKinds);
  const eventMarkers: EpRenderedEventMarker[] = profile.showEventMarkers
    ? signalSet.events
      .filter((event) => event.timeMs >= profile.startTimeMs - EPSILON && event.timeMs <= endTimeMs + EPSILON)
      .filter((event) => allowedKinds === null || allowedKinds.has(event.kind))
      .map((event) => Object.freeze({
        event,
        xMm: plotX + (event.timeMs - profile.startTimeMs) * profile.paperSpeedMmPerSecond / 1000,
      }))
    : [];

  return Object.freeze({
    schemaVersion: 1,
    profileId: profile.id,
    scenarioId: signalSet.scenarioId,
    widthMm,
    heightMm,
    plotRect: Object.freeze({ x: plotX, y: plotY, width: plotWidth, height: plotHeight }),
    gridLines: createGridLines(
      plotX,
      plotY,
      plotWidth,
      plotHeight,
      profile.grid.minorSpacingMm,
      profile.grid.majorSpacingMm,
    ),
    channels: Object.freeze(channels),
    calibrationPulses: Object.freeze(pulses),
    eventMarkers: Object.freeze(eventMarkers),
    timeMarkers: createTimeMarkers(
      profile.startTimeMs,
      endTimeMs,
      profile.timeMarkerIntervalMs,
      plotX,
      profile.paperSpeedMmPerSecond,
    ),
  });
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function svgThemeCss(theme: EpSvgRenderOptions['theme']): string {
  if (theme === 'monochrome') {
    return '.ep-bg{fill:#fff}.ep-grid-minor{stroke:#ddd}.ep-grid-major{stroke:#999}.ep-trace,.ep-cal{fill:none;stroke:#111}.ep-event{stroke:#555}.ep-label,.ep-time{fill:#111;font-family:system-ui,sans-serif}';
  }
  return '.ep-bg{fill:#fff}.ep-grid-minor{stroke:#f1dada}.ep-grid-major{stroke:#dda6a6}.ep-trace,.ep-cal{fill:none;stroke:#151515}.ep-event{stroke:#765}.ep-label,.ep-time{fill:#151515;font-family:system-ui,sans-serif}';
}

export function renderEpSignalSceneToSvg(scene: EpSignalRenderScene, options: EpSvgRenderOptions): string {
  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeXml(options.ariaLabel)}" width="${formatNumber(scene.widthMm)}mm" height="${formatNumber(scene.heightMm)}mm" viewBox="0 0 ${formatNumber(scene.widthMm)} ${formatNumber(scene.heightMm)}">`);
  parts.push(`<style>${svgThemeCss(options.theme)}</style>`);
  if (options.includeBackground) {
    parts.push(`<rect class="ep-bg" x="0" y="0" width="${formatNumber(scene.widthMm)}" height="${formatNumber(scene.heightMm)}"/>`);
  }
  parts.push('<defs>');
  for (const channel of scene.channels) {
    parts.push(`<clipPath id="clip-${escapeXml(channel.channelId)}"><rect x="${formatNumber(channel.clipRect.x)}" y="${formatNumber(channel.clipRect.y)}" width="${formatNumber(channel.clipRect.width)}" height="${formatNumber(channel.clipRect.height)}"/></clipPath>`);
  }
  parts.push('</defs>');

  for (const line of scene.gridLines) {
    const className = line.kind === 'major' ? 'ep-grid-major' : 'ep-grid-minor';
    const width = line.kind === 'major' ? '0.18' : '0.08';
    if (line.orientation === 'vertical') {
      parts.push(`<line class="${className}" x1="${formatNumber(line.positionMm)}" y1="${formatNumber(scene.plotRect.y)}" x2="${formatNumber(line.positionMm)}" y2="${formatNumber(scene.plotRect.y + scene.plotRect.height)}" stroke-width="${width}"/>`);
    } else {
      parts.push(`<line class="${className}" x1="${formatNumber(scene.plotRect.x)}" y1="${formatNumber(line.positionMm)}" x2="${formatNumber(scene.plotRect.x + scene.plotRect.width)}" y2="${formatNumber(line.positionMm)}" stroke-width="${width}"/>`);
    }
  }

  for (const marker of scene.eventMarkers) {
    parts.push(`<line class="ep-event" x1="${formatNumber(marker.xMm)}" y1="${formatNumber(scene.plotRect.y)}" x2="${formatNumber(marker.xMm)}" y2="${formatNumber(scene.plotRect.y + scene.plotRect.height)}" stroke-width="0.12" stroke-dasharray="0.8 0.8" data-event-id="${escapeXml(marker.event.id)}"/>`);
  }

  for (const pulse of scene.calibrationPulses) {
    const channel = scene.channels.find((candidate) => candidate.channelId === pulse.channelId)!;
    parts.push(`<path class="ep-cal" d="${pulse.pathData}" stroke-width="${formatNumber(channel.strokeWidthMm)}" stroke-linejoin="miter"/>`);
  }

  for (const channel of scene.channels) {
    parts.push(`<text class="ep-label" x="1" y="${formatNumber(channel.baselineY)}" font-size="3" dominant-baseline="middle">${escapeXml(channel.label)}</text>`);
    parts.push(`<path class="ep-trace" d="${channel.pathData}" clip-path="url(#clip-${escapeXml(channel.channelId)})" stroke-width="${formatNumber(channel.strokeWidthMm)}" stroke-linecap="round" stroke-linejoin="round"/>`);
  }

  const timeLabelY = scene.plotRect.y + scene.plotRect.height + Math.max(3, (scene.heightMm - scene.plotRect.y - scene.plotRect.height) * 0.65);
  for (const marker of scene.timeMarkers) {
    parts.push(`<text class="ep-time" x="${formatNumber(marker.xMm)}" y="${formatNumber(timeLabelY)}" font-size="2.5" text-anchor="middle">${escapeXml(marker.label)}</text>`);
  }
  parts.push('</svg>');
  return parts.join('');
}

export function renderEpSignalSetToSvg(
  request: EpSignalStripRenderRequest,
  options: EpSvgRenderOptions,
): { readonly scene: EpSignalRenderScene; readonly svg: string } {
  const scene = buildEpSignalRenderScene(request);
  return Object.freeze({ scene, svg: renderEpSignalSceneToSvg(scene, options) });
}
