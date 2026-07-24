import { useMemo } from 'react';
import type { GeneratedEpSignalSet } from '../epSignal/contracts';
import { buildEpSignalRenderScene } from '../epSignal/renderingEngine';
import type { EpSignalStripRenderProfile } from '../epSignal/renderingContracts';

interface EcgCanvasProps {
  readonly samples: readonly number[];
}

const SAMPLE_RATE_HZ = 100;
const WINDOW_SECONDS = 6;
const CHANNEL_ID = 'pseudo-ecg-primary';
const TARGET_PEAK_MV = 0.8;

function normalizeDisplaySamples(samples: readonly number[]): Float64Array {
  if (samples.length === 0) return new Float64Array();
  let maximumAbsolute = 0;
  for (const sample of samples) {
    if (Number.isFinite(sample)) {
      maximumAbsolute = Math.max(maximumAbsolute, Math.abs(sample));
    }
  }
  const scale = maximumAbsolute > 1e-12 ? TARGET_PEAK_MV / maximumAbsolute : 1;
  return Float64Array.from(samples, (sample) => Number.isFinite(sample) ? sample * scale : 0);
}

function createSignalSet(samples: Float64Array): GeneratedEpSignalSet {
  const durationMs = Math.max(10, samples.length * 1000 / SAMPLE_RATE_HZ);
  return Object.freeze({
    schemaVersion: 1,
    scenarioId: 'live-tissue-pseudo-ecg',
    scenarioVersion: '1.0.0',
    engineVersion: 'live-simulator-adapter-1',
    deterministicSeed: 0,
    sampleRateHz: SAMPLE_RATE_HZ,
    durationMs,
    sampleCount: samples.length,
    channels: Object.freeze([
      Object.freeze({
        channelId: CHANNEL_ID,
        unit: 'mV',
        samples,
      }),
    ]),
    events: Object.freeze([]),
  });
}

function createProfile(durationMs: number): EpSignalStripRenderProfile {
  return Object.freeze({
    schemaVersion: 1,
    id: 'live-pseudo-ecg-clinical-strip',
    paperSpeedMmPerSecond: 25,
    startTimeMs: 0,
    durationMs,
    marginsMm: Object.freeze({ top: 4, right: 4, bottom: 8, left: 18 }),
    channelGapMm: 0,
    grid: Object.freeze({ minorSpacingMm: 1, majorSpacingMm: 5 }),
    calibration: Object.freeze({
      enabled: true,
      amplitudeMv: 1,
      leadInMs: 40,
      plateauMs: 200,
      leadOutMs: 40,
      rightGapMm: 2,
    }),
    minimumHorizontalStepMm: 0.18,
    timeMarkerIntervalMs: 1000,
    showEventMarkers: false,
    channels: Object.freeze([
      Object.freeze({
        channelId: CHANNEL_ID,
        label: 'Pseudo-ECG',
        gainMmPerMv: 10,
        heightMm: 24,
        strokeWidthMm: 0.35,
      }),
    ]),
  });
}

export function EcgCanvas({ samples }: EcgCanvasProps) {
  const visibleSamples = samples.slice(-SAMPLE_RATE_HZ * WINDOW_SECONDS);
  const scene = useMemo(() => {
    if (visibleSamples.length < 2) return null;
    const normalized = normalizeDisplaySamples(visibleSamples);
    const signalSet = createSignalSet(normalized);
    return buildEpSignalRenderScene({
      signalSet,
      profile: createProfile(signalSet.durationMs),
    });
  }, [visibleSamples]);

  if (scene === null) {
    return (
      <div className="clinical-ecg-frame clinical-ecg-empty" role="img" aria-label="Pseudo ECG lead waiting for signal">
        <span>Start the simulation or trigger a pacing pulse to record the pseudo-ECG.</span>
      </div>
    );
  }

  return (
    <div className="clinical-ecg-frame">
      <div className="clinical-ecg-toolbar" aria-hidden="true">
        <span>25 mm/s</span>
        <span>10 mm/mV display scale</span>
        <span>6 s rolling strip</span>
      </div>
      <svg
        className="clinical-ecg-svg"
        viewBox={`0 0 ${scene.widthMm} ${scene.heightMm}`}
        role="img"
        aria-label="Live pseudo ECG on a clinical paper grid"
        preserveAspectRatio="none"
      >
        <defs>
          {scene.channels.map((channel) => (
            <clipPath key={channel.channelId} id={`live-clip-${channel.channelId}`}>
              <rect
                x={channel.clipRect.x}
                y={channel.clipRect.y}
                width={channel.clipRect.width}
                height={channel.clipRect.height}
              />
            </clipPath>
          ))}
        </defs>

        <rect className="clinical-ecg-paper" x="0" y="0" width={scene.widthMm} height={scene.heightMm} />

        <g aria-hidden="true">
          {scene.gridLines.map((line, index) => (
            <line
              key={`${line.orientation}-${line.positionMm}-${index}`}
              className={`clinical-grid-line clinical-grid-${line.kind}`}
              x1={line.orientation === 'vertical' ? line.positionMm : scene.plotRect.x}
              y1={line.orientation === 'vertical' ? scene.plotRect.y : line.positionMm}
              x2={line.orientation === 'vertical' ? line.positionMm : scene.plotRect.x + scene.plotRect.width}
              y2={line.orientation === 'vertical' ? scene.plotRect.y + scene.plotRect.height : line.positionMm}
            />
          ))}
        </g>

        {scene.calibrationPulses.map((pulse) => (
          <path key={pulse.channelId} className="clinical-ecg-calibration" d={pulse.pathData} />
        ))}

        {scene.channels.map((channel) => (
          <g key={channel.channelId}>
            <text className="clinical-ecg-label" x="1.2" y={channel.baselineY} dominantBaseline="middle">
              {channel.label}
            </text>
            <path
              className="clinical-ecg-trace"
              d={channel.pathData}
              clipPath={`url(#live-clip-${channel.channelId})`}
              strokeWidth={channel.strokeWidthMm}
            />
          </g>
        ))}

        {scene.timeMarkers.map((marker) => (
          <text
            key={marker.timeMs}
            className="clinical-ecg-time"
            x={marker.xMm}
            y={scene.heightMm - 2}
            textAnchor="middle"
          >
            {marker.label}
          </text>
        ))}
      </svg>
      <p className="clinical-ecg-boundary">
        Display-normalized pseudo-ECG in arbitrary source units; grid, sweep speed and calibration geometry are renderer-accurate.
      </p>
    </div>
  );
}
