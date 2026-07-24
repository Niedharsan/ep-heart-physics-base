import { describe, expect, it } from 'vitest';
import {
  buildEpSignalRenderScene,
  renderEpSignalSetToSvg,
  validateEpSignalStripRenderProfile,
} from '../epSignal';
import type {
  EpSignalStripRenderProfile,
  GeneratedEpSignalSet,
} from '../epSignal';

function makeSignalSet(): GeneratedEpSignalSet {
  const leadSamples = new Float64Array(1001);
  leadSamples[100] = 1;
  leadSamples[101] = -2;
  return {
    schemaVersion: 1,
    scenarioId: 'phase5.test',
    scenarioVersion: '1.0.0',
    engineVersion: '0.5.0',
    deterministicSeed: 7,
    sampleRateHz: 1000,
    durationMs: 1000,
    sampleCount: 1001,
    channels: [
      { channelId: 'lead-ii', unit: 'mV', samples: leadSamples },
      {
        channelId: 'his',
        unit: 'mV',
        samples: Float64Array.from(leadSamples, (value) => value * 0.5),
      },
    ],
    events: [
      {
        id: 'event-1',
        kind: 'his-activation',
        timeMs: 100,
        beatIndex: 0,
      },
    ],
  };
}

function makeProfile(minimumHorizontalStepMm = 0): EpSignalStripRenderProfile {
  return {
    schemaVersion: 1,
    id: 'phase5-render',
    paperSpeedMmPerSecond: 25,
    startTimeMs: 0,
    durationMs: 1000,
    marginsMm: { top: 5, right: 5, bottom: 8, left: 16 },
    channelGapMm: 2,
    grid: { minorSpacingMm: 1, majorSpacingMm: 5 },
    calibration: {
      enabled: true,
      amplitudeMv: 1,
      leadInMs: 40,
      plateauMs: 200,
      leadOutMs: 40,
      rightGapMm: 1,
    },
    minimumHorizontalStepMm,
    timeMarkerIntervalMs: 500,
    showEventMarkers: true,
    channels: [
      {
        channelId: 'lead-ii',
        label: 'II',
        gainMmPerMv: 10,
        heightMm: 24,
        strokeWidthMm: 0.25,
      },
      {
        channelId: 'his',
        label: 'HIS',
        gainMmPerMv: 5,
        heightMm: 20,
        strokeWidthMm: 0.2,
      },
    ],
  };
}

describe('EP signal rendering', () => {
  it('maps time and voltage into physical millimetre geometry', () => {
    const scene = buildEpSignalRenderScene({
      signalSet: makeSignalSet(),
      profile: makeProfile(),
    });

    expect(scene.plotRect.width).toBe(25);
    expect(scene.widthMm).toBe(46);
    expect(scene.heightMm).toBe(59);
    expect(scene.channels[0]!.baselineY).toBe(17);
    expect(scene.channels[1]!.baselineY).toBe(41);

    const positivePeak = scene.channels[0]!.points.find(
      (point) => Math.abs(point.x - 18.5) < 1e-12,
    );
    expect(positivePeak?.y).toBe(7);
  });

  it('builds a correctly dimensioned one-millivolt calibration pulse', () => {
    const scene = buildEpSignalRenderScene({
      signalSet: makeSignalSet(),
      profile: makeProfile(),
    });

    expect(scene.calibrationPulses).toHaveLength(2);
    expect(scene.calibrationPulses[0]!.amplitudeMm).toBe(10);
    expect(scene.calibrationPulses[0]!.plateauWidthMm).toBe(5);
    expect(scene.calibrationPulses[0]!.points[0]!.x).toBeGreaterThanOrEqual(0);
    expect(scene.calibrationPulses[0]!.points.at(-1)!.x).toBeLessThan(scene.plotRect.x);
  });

  it('creates one-millimetre grid lines and classifies five-millimetre lines as major', () => {
    const scene = buildEpSignalRenderScene({
      signalSet: makeSignalSet(),
      profile: makeProfile(),
    });
    const vertical = scene.gridLines.filter((line) => line.orientation === 'vertical');

    expect(vertical[0]).toEqual({ orientation: 'vertical', kind: 'major', positionMm: 16 });
    expect(vertical[1]).toEqual({ orientation: 'vertical', kind: 'minor', positionMm: 17 });
    expect(vertical[5]).toEqual({ orientation: 'vertical', kind: 'major', positionMm: 21 });
  });

  it('preserves narrow extrema while reducing dense paths deterministically', () => {
    const first = buildEpSignalRenderScene({
      signalSet: makeSignalSet(),
      profile: makeProfile(1),
    });
    const second = buildEpSignalRenderScene({
      signalSet: makeSignalSet(),
      profile: makeProfile(1),
    });
    const channel = first.channels[0]!;

    expect(channel.renderedPointCount).toBeLessThan(channel.sourceSampleCount);
    expect(channel.points.some((point) => point.y === 7)).toBe(true);
    expect(channel.points.some((point) => point.y === 37)).toBe(true);
    expect(first.channels[0]!.pathData).toBe(second.channels[0]!.pathData);
  });

  it('places event and time annotations using the same physical time axis', () => {
    const scene = buildEpSignalRenderScene({
      signalSet: makeSignalSet(),
      profile: makeProfile(),
    });

    expect(scene.eventMarkers[0]!.xMm).toBe(18.5);
    expect(scene.timeMarkers.map((marker) => marker.timeMs)).toEqual([0, 500, 1000]);
    expect(scene.timeMarkers.map((marker) => marker.xMm)).toEqual([16, 28.5, 41]);
  });

  it('emits deterministic accessible SVG with per-channel clipping', () => {
    const request = { signalSet: makeSignalSet(), profile: makeProfile(0.5) };
    const options = {
      theme: 'clinical-light' as const,
      includeBackground: true,
      ariaLabel: 'EP strip <test>',
    };
    const first = renderEpSignalSetToSvg(request, options).svg;
    const second = renderEpSignalSetToSvg(request, options).svg;

    expect(first).toBe(second);
    expect(first).toContain('aria-label="EP strip &lt;test&gt;"');
    expect(first).toContain('clip-lead-ii');
    expect(first).toContain('data-event-id="event-1"');
    expect(first).toContain('width="46mm"');
  });

  it('rejects invalid dimensions, missing channels and impossible calibration margins', () => {
    const profile = makeProfile();
    const invalid: EpSignalStripRenderProfile = {
      ...profile,
      paperSpeedMmPerSecond: 0,
      marginsMm: { ...profile.marginsMm, left: 1 },
      calibration: { ...profile.calibration, rightGapMm: 2 },
      grid: { minorSpacingMm: 2, majorSpacingMm: 5 },
      channels: [
        {
          ...profile.channels[0]!,
          channelId: 'missing',
          gainMmPerMv: -1,
        },
      ],
    };
    const issues = validateEpSignalStripRenderProfile(invalid, makeSignalSet());
    const codes = new Set(issues.map((entry) => entry.code));

    expect(codes).toContain('renderer.paper-speed');
    expect(codes).toContain('renderer.grid-ratio');
    expect(codes).toContain('renderer.channel-missing');
    expect(codes).toContain('renderer.channel-gain');
    expect(codes).toContain('renderer.calibration-margin');
  });
});
