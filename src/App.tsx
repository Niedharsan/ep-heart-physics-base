import { useEffect, useMemo, useRef, useState } from 'react';
import { buildTutorEvidence } from './ai/buildTutorEvidence';
import { TutorPanel } from './ai/TutorPanel';
import type {
  CurrentStimulus,
  EngineSnapshot,
  ScenarioId,
  WorkerCommand,
  WorkerEvent,
} from './engine/core/types';
import { ClientModuleNav } from './clientPreview/ClientModuleNav';
import { alievPanfilovPresets } from './engine/models/AlievPanfilov';
import { EcgCanvas } from './ui/EcgCanvas';
import {
  resolveSimulatorGuidance,
  summarizeTissueActivity,
} from './ui/TissueActivity';
import { VoltageCanvas } from './ui/VoltageCanvas';
import type { VoltageDisplayMode } from './ui/VoltageVisualization';
import './styles.css';

interface PacingSite {
  readonly id: number;
  readonly x: number;
  readonly y: number;
}

const initialScenario: ScenarioId = 'manual-pacing';

const baseConfig = {
  grid: { width: 160, height: 104, dx: 1 },
  diffusion: 0.8,
  requestedDt: 0.08,
  statePrecision: 'float32',
  model: alievPanfilovPresets.goktepeKuhl2009Figure4Generalized,
} as const;

const runtimeClocks = {
  solverIntervalMs: 4,
  solverStepsPerBatch: 2,
  renderIntervalMs: 16,
} as const;

const manualPulse = {
  radius: 4,
  amplitude: 4,
  durationModelTime: 0.24,
} as const;

export default function App() {
  const workerRef = useRef<Worker | null>(null);
  const nextPacingSiteId = useRef(1);
  const pulseFeedbackTimerRef = useRef<number | null>(null);
  const [snapshot, setSnapshot] = useState<EngineSnapshot | null>(null);
  const [ecgSamples, setEcgSamples] = useState<number[]>([]);
  const [running, setRunning] = useState(false);
  const [scenario, setScenario] = useState<ScenarioId>(initialScenario);
  const [interactionMode, setInteractionMode] = useState<'stimulate' | 'ablate'>('stimulate');
  const [stableDt, setStableDt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [solverStepsPerBatch, setSolverStepsPerBatch] = useState<number>(runtimeClocks.solverStepsPerBatch);
  const [displayMode, setDisplayMode] = useState<VoltageDisplayMode>('wavefront');
  const [showGrid, setShowGrid] = useState(false);
  const [brightness, setBrightness] = useState(1);
  const [frontWidth, setFrontWidth] = useState(0.14);
  const [pacingSites, setPacingSites] = useState<readonly PacingSite[]>([]);
  const [pacingSitesArmed, setPacingSitesArmed] = useState(false);
  const [pulseFeedbackVisible, setPulseFeedbackVisible] = useState(false);

  const scenarioLabel = useMemo(() => {
    const labels: Record<ScenarioId, string> = {
      'manual-pacing': 'Manual pacing',
      'planar-wave': 'Planar wave',
      'focal-rhythm': 'Automatic focal rhythm',
      'obstacle-reentry': 'Obstacle / re-entry scaffold',
    };
    return labels[scenario];
  }, [scenario]);

  const tissueActivity = useMemo(
    () => summarizeTissueActivity(snapshot),
    [snapshot],
  );

  const tutorEvidence = useMemo(() => buildTutorEvidence({
    scenario,
    running,
    stableDt,
    snapshot,
    tissueActivity,
    pacingSiteCount: pacingSites.length,
    ecgSamples,
  }), [
    scenario,
    running,
    stableDt,
    snapshot,
    tissueActivity,
    pacingSites.length,
    ecgSamples,
  ]);

  const simulatorGuidance = useMemo(() => resolveSimulatorGuidance({
    scenario,
    interactionMode,
    running,
    pacingSiteCount: pacingSites.length,
    pacingSitesArmed,
    activity: tissueActivity,
  }), [
    scenario,
    interactionMode,
    running,
    pacingSites.length,
    pacingSitesArmed,
    tissueActivity,
  ]);

  const statusLabel = running
    ? tissueActivity.visibleActiveCellCount > 0
      ? 'WAVE ACTIVE'
      : 'RUNNING · RESTING'
    : 'PAUSED';

  useEffect(() => {
    const worker = new Worker(new URL('./engine/workers/simulation.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    worker.onmessage = (message: MessageEvent<WorkerEvent>) => {
      const event = message.data;
      if (event.type === 'ready') {
        setStableDt(event.stableDt);
        setError(null);
      } else if (event.type === 'snapshot') {
        setSnapshot(event.snapshot);
      } else if (event.type === 'signal-samples') {
        const values = event.samples
          .filter((sample) => sample.measurementId === 'pseudo-ecg-primary')
          .map((sample) => sample.value);
        setEcgSamples((current) => [...current, ...values].slice(-600));
      } else if (event.type === 'error') {
        setError(event.message);
        setRunning(false);
      }
    };
    worker.postMessage({
      type: 'initialize',
      config: baseConfig,
      clocks: runtimeClocks,
      scenario: initialScenario,
    } satisfies WorkerCommand);
    return () => {
      worker.terminate();
      if (pulseFeedbackTimerRef.current !== null) {
        window.clearTimeout(pulseFeedbackTimerRef.current);
      }
    };
  }, []);

  function send(command: WorkerCommand): void {
    workerRef.current?.postMessage(command);
  }

  function showPulseFeedback(): void {
    setPulseFeedbackVisible(true);
    if (pulseFeedbackTimerRef.current !== null) {
      window.clearTimeout(pulseFeedbackTimerRef.current);
    }
    pulseFeedbackTimerRef.current = window.setTimeout(() => {
      setPulseFeedbackVisible(false);
      pulseFeedbackTimerRef.current = null;
    }, 700);
  }

  function sendCurrentStimulus(site: Pick<PacingSite, 'x' | 'y'>): void {
    const stimulus: CurrentStimulus = {
      x: site.x,
      y: site.y,
      ...manualPulse,
    };
    send({ type: 'stimulate', stimulus });
  }

  function emitPacingPulse(): void {
    if (pacingSites.length === 0) return;
    pacingSites.forEach(sendCurrentStimulus);
    setPacingSitesArmed(false);
    showPulseFeedback();
  }

  function pulseAllSites(): void {
    if (pacingSites.length === 0) return;
    emitPacingPulse();
    if (!running) {
      send({ type: 'start' });
      setRunning(true);
    }
  }

  function toggleRunning(): void {
    const nextRunning = !running;
    if (nextRunning && scenario === 'manual-pacing' && pacingSitesArmed && pacingSites.length > 0) {
      emitPacingPulse();
    }
    send({ type: nextRunning ? 'start' : 'pause' });
    setRunning(nextRunning);
  }

  function reset(nextScenario = scenario, clearSites = false): void {
    send({ type: 'reset', scenario: nextScenario });
    setEcgSamples([]);
    setRunning(false);
    setPulseFeedbackVisible(false);

    if (clearSites || nextScenario !== 'manual-pacing') {
      setPacingSites([]);
      setPacingSitesArmed(false);
    } else {
      setPacingSitesArmed(pacingSites.length > 0);
    }
  }

  function addPacingSite(x: number, y: number): void {
    const site: PacingSite = {
      id: nextPacingSiteId.current,
      x,
      y,
    };
    nextPacingSiteId.current += 1;
    setPacingSites((current) => [...current, site].slice(-8));

    if (running) {
      sendCurrentStimulus(site);
      showPulseFeedback();
      setPacingSitesArmed(false);
    } else {
      setPacingSitesArmed(true);
    }
  }

  return (
    <main className="app-shell simulator-shell">
      <ClientModuleNav current="simulator" />

      <header className="topbar">
        <div className="topbar-copy">
          <p className="eyebrow">EP HEART · TISSUE SIMULATOR</p>
          <h1>Cardiac tissue simulator</h1>
          <p className="subtitle">Place pacing sites, trigger propagation and compare the signal-derived pseudo-ECG.</p>
        </div>
        <div
          className={`status-pill ${running ? 'running' : ''} ${tissueActivity.visibleActiveCellCount > 0 ? 'active-wave' : ''}`}
          role="status"
          aria-live="polite"
        >
          <span /> {statusLabel}
        </div>
      </header>

      <section className="control-panel" aria-label="Simulation controls">
        <div className="control-group control-actions">
          <button className="primary" onClick={toggleRunning}>{running ? 'Pause' : 'Start'}</button>
          <button className="secondary" onClick={() => reset()}>Reset</button>
        </div>

        <div className="control-group control-selectors">
          <label>
            Scenario
            <select
              value={scenario}
              onChange={(event) => {
                const nextScenario = event.target.value as ScenarioId;
                setScenario(nextScenario);
                reset(nextScenario, true);
              }}
            >
              <option value="manual-pacing">Manual pacing</option>
              <option value="focal-rhythm">Automatic focal rhythm</option>
              <option value="planar-wave">Planar wave</option>
              <option value="obstacle-reentry">Obstacle / re-entry scaffold</option>
            </select>
          </label>

          <label>
            Interaction
            <select value={interactionMode} onChange={(event) => setInteractionMode(event.target.value as 'stimulate' | 'ablate')}>
              <option value="stimulate">{scenario === 'manual-pacing' ? 'Place pacing sites' : 'Stimulate tissue'}</option>
              <option value="ablate">Create lesion</option>
            </select>
          </label>

          <label>
            Display
            <select
              value={displayMode}
              onChange={(event) => setDisplayMode(event.target.value as VoltageDisplayMode)}
            >
              <option value="wavefront">Activation wave</option>
              <option value="voltage">Voltage map</option>
              <option value="monochrome">Monochrome</option>
            </select>
          </label>
        </div>

        {scenario === 'manual-pacing' && (
          <div className="control-group pacing-controls">
            <button
              className="pulse-action"
              disabled={pacingSites.length === 0}
              onClick={pulseAllSites}
            >
              {running ? 'Pulse sites' : 'Pulse & run'}
            </button>
            <button
              className="secondary"
              disabled={pacingSites.length === 0}
              onClick={() => {
                setPacingSites([]);
                setPacingSitesArmed(false);
              }}
            >
              Clear sites
            </button>
            <span className={`pacing-status ${pacingSitesArmed ? 'armed' : ''}`}>
              {pacingSites.length} site{pacingSites.length === 1 ? '' : 's'}
              {pacingSitesArmed ? ' · ready' : ''}
            </span>
          </div>
        )}

        <details className="advanced-controls">
          <summary>Display & solver settings</summary>
          <div className="advanced-control-grid">
            <label className="speed-control">
              Steps/batch: {solverStepsPerBatch}
              <input
                type="range"
                min="1"
                max="32"
                value={solverStepsPerBatch}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setSolverStepsPerBatch(value);
                  send({ type: 'set-solver-steps-per-batch', solverStepsPerBatch: value });
                }}
              />
            </label>

            <label className="visual-control">
              Brightness: {brightness.toFixed(1)}
              <input
                type="range"
                min="0.6"
                max="1.8"
                step="0.1"
                value={brightness}
                onChange={(event) => setBrightness(Number(event.target.value))}
              />
            </label>

            {displayMode === 'wavefront' && (
              <label className="visual-control">
                Front width: {frontWidth.toFixed(2)}
                <input
                  type="range"
                  min="0.06"
                  max="0.30"
                  step="0.01"
                  value={frontWidth}
                  onChange={(event) => setFrontWidth(Number(event.target.value))}
                />
              </label>
            )}

            <label className="toggle-control">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(event) => setShowGrid(event.target.checked)}
              />
              Debug grid
            </label>
          </div>
        </details>
      </section>

      {error && <div className="error-banner">Engine error: {error}</div>}

      <section className="workspace-grid">
        <article className="panel tissue-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">TISSUE VOLTAGE</span>
              <h2>{scenarioLabel}</h2>
            </div>
            <p>{simulatorGuidance.detail}</p>
          </div>

          <div className="tissue-display-meta">
            <div className="tissue-legend" aria-label="Activation-wave colour legend">
              <span><i className="legend-resting" /> Resting / low voltage</span>
              <span><i className="legend-front" /> Activation front</span>
              <span><i className="legend-depolarized" /> Higher-voltage tissue</span>
            </div>
            <div className={`tissue-activity state-${tissueActivity.state}`} aria-live="polite">
              <span />
              <strong>{tissueActivity.label}</strong>
              {snapshot && <small>{tissueActivity.visibleActiveCellCount.toLocaleString()} visible active cells</small>}
            </div>
          </div>

          <div className="tissue-canvas-stage">
            <VoltageCanvas
              snapshot={snapshot}
              interactionMode={interactionMode}
              displayMode={displayMode}
              showGrid={showGrid}
              brightness={brightness}
              frontWidth={frontWidth}
              pacingSites={scenario === 'manual-pacing' ? pacingSites : []}
              pacingSitesPulsing={pulseFeedbackVisible}
              onPoint={(x, y) => {
                if (interactionMode === 'stimulate') {
                  if (scenario === 'manual-pacing') {
                    addPacingSite(x, y);
                  } else {
                    sendCurrentStimulus({ x, y });
                    showPulseFeedback();
                  }
                } else {
                  send({ type: 'ablate', lesion: { x, y, radius: 5 } });
                }
              }}
            />
            <div className={`tissue-guidance tone-${simulatorGuidance.tone}`}>
              <span>{simulatorGuidance.step}</span>
              <strong>{simulatorGuidance.title}</strong>
              <p>{simulatorGuidance.detail}</p>
            </div>
          </div>
        </article>

        <aside className="panel metrics-panel">
          <span className="panel-kicker">LIVE ENGINE</span>
          <dl>
            <div><dt>Model time</dt><dd>{snapshot?.time.toFixed(1) ?? '0.0'}</dd></div>
            <div><dt>Tissue state</dt><dd>{tissueActivity.label}</dd></div>
            <div><dt>Visible active cells</dt><dd>{tissueActivity.visibleActiveCellCount.toLocaleString()}</dd></div>
            <div><dt>Peak voltage</dt><dd>{tissueActivity.peakVoltage.toFixed(3)}</dd></div>
            <div><dt>Stable dt</dt><dd>{stableDt?.toFixed(4) ?? '—'}</dd></div>
            <div><dt>Grid</dt><dd>{snapshot ? `${snapshot.width} × ${snapshot.height}` : '—'}</dd></div>
            <div><dt>Solver rate</dt><dd>{Math.round(snapshot?.simulationStepsPerSecond ?? 0)} steps/s</dd></div>
            <div><dt>Lesions</dt><dd>{snapshot?.lesions.length ?? 0}</dd></div>
          </dl>
          <div className="notice">
            <strong>Scientific boundary</strong>
            <p>This is a homogeneous 2D excitable-tissue prototype. Manual pacing uses finite-duration current, but this is not anatomical whole-heart propagation.</p>
          </div>
        </aside>
      </section>

      <section className="panel ecg-panel">
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">SIGNAL-DERIVED OUTPUT</span>
            <h2>Pseudo-ECG lead</h2>
          </div>
          <p>No prerecorded beat template.</p>
        </div>
        <EcgCanvas samples={ecgSamples} />
      </section>

      <TutorPanel evidence={tutorEvidence} />

      <footer>
        Manual multi-site pacing uses simultaneous finite-duration current pulses. Anatomical geometry, fibres and regional conduction remain later phases.
      </footer>
    </main>
  );
}
