import { useEffect, useMemo, useRef, useState } from 'react';
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

  const scenarioLabel = useMemo(() => {
    const labels: Record<ScenarioId, string> = {
      'manual-pacing': 'Manual pacing',
      'planar-wave': 'Planar wave',
      'focal-rhythm': 'Automatic focal rhythm',
      'obstacle-reentry': 'Obstacle / re-entry scaffold',
    };
    return labels[scenario];
  }, [scenario]);

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
    return () => worker.terminate();
  }, []);

  function send(command: WorkerCommand): void {
    workerRef.current?.postMessage(command);
  }

  function sendCurrentStimulus(site: Pick<PacingSite, 'x' | 'y'>): void {
    const stimulus: CurrentStimulus = {
      x: site.x,
      y: site.y,
      ...manualPulse,
    };
    send({ type: 'stimulate', stimulus });
  }

  function pulseAllSites(): void {
    pacingSites.forEach(sendCurrentStimulus);
    setPacingSitesArmed(false);
  }

  function toggleRunning(): void {
    const nextRunning = !running;
    if (nextRunning && scenario === 'manual-pacing' && pacingSitesArmed && pacingSites.length > 0) {
      pulseAllSites();
    }
    send({ type: nextRunning ? 'start' : 'pause' });
    setRunning(nextRunning);
  }

  function reset(nextScenario = scenario, clearSites = false): void {
    send({ type: 'reset', scenario: nextScenario });
    setEcgSamples([]);
    setRunning(false);

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
      setPacingSitesArmed(false);
    } else {
      setPacingSitesArmed(true);
    }
  }

  return (
    <main className="app-shell">
      <ClientModuleNav current="simulator" />

      <header className="topbar">
        <div>
          <p className="eyebrow">EP HEART PHYSICS BASE · EDUCATION / RESEARCH PROTOTYPE</p>
          <h1>Browser cardiac electrophysiology engine</h1>
          <p className="subtitle">Reduced reaction–diffusion tissue model, Web Worker execution and signal-derived pseudo-ECG.</p>
        </div>
        <div className={`status-pill ${running ? 'running' : ''}`}>
          <span /> {running ? 'SIMULATING' : 'PAUSED'}
        </div>
      </header>

      <section className="control-panel">
        <button className="primary" onClick={toggleRunning}>{running ? 'Pause' : 'Start'}</button>
        <button onClick={() => reset()}>Reset</button>

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

        {scenario === 'manual-pacing' && (
          <>
            <button disabled={pacingSites.length === 0} onClick={pulseAllSites}>Pulse sites</button>
            <button
              disabled={pacingSites.length === 0}
              onClick={() => {
                setPacingSites([]);
                setPacingSitesArmed(false);
              }}
            >
              Clear sites
            </button>
            <span className="pacing-status">
              {pacingSites.length} site{pacingSites.length === 1 ? '' : 's'}
              {pacingSitesArmed ? ' armed' : ''}
            </span>
          </>
        )}
      </section>

      {error && <div className="error-banner">Engine error: {error}</div>}

      <section className="workspace-grid">
        <article className="panel tissue-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">TISSUE VOLTAGE</span>
              <h2>{scenarioLabel}</h2>
            </div>
            <p>
              {scenario === 'manual-pacing' && interactionMode === 'stimulate'
                ? 'Click to place sites; Start delivers simultaneous finite-duration current pulses.'
                : `${displayMode === 'wavefront' ? 'Activation-front view' : 'Scientific field view'} · Click to ${interactionMode === 'stimulate' ? 'stimulate' : 'ablate'}.`}
            </p>
          </div>

          <VoltageCanvas
            snapshot={snapshot}
            interactionMode={interactionMode}
            displayMode={displayMode}
            showGrid={showGrid}
            brightness={brightness}
            frontWidth={frontWidth}
            pacingSites={scenario === 'manual-pacing' ? pacingSites : []}
            onPoint={(x, y) => {
              if (interactionMode === 'stimulate') {
                if (scenario === 'manual-pacing') {
                  addPacingSite(x, y);
                } else {
                  sendCurrentStimulus({ x, y });
                }
              } else {
                send({ type: 'ablate', lesion: { x, y, radius: 5 } });
              }
            }}
          />
        </article>

        <aside className="panel metrics-panel">
          <span className="panel-kicker">LIVE ENGINE</span>
          <dl>
            <div><dt>Model time</dt><dd>{snapshot?.time.toFixed(1) ?? '0.0'}</dd></div>
            <div><dt>Stable dt</dt><dd>{stableDt?.toFixed(4) ?? '—'}</dd></div>
            <div><dt>Grid</dt><dd>{snapshot ? `${snapshot.width} × ${snapshot.height}` : '—'}</dd></div>
            <div><dt>Solver rate</dt><dd>{Math.round(snapshot?.simulationStepsPerSecond ?? 0)} steps/s</dd></div>
            <div><dt>Lesions</dt><dd>{snapshot?.lesions.length ?? 0}</dd></div>
          </dl>
          <div className="notice">
            <strong>Scientific boundary</strong>
            <p>This is a homogeneous 2D excitable-tissue prototype. Manual pacing now uses finite-duration current, but this is not yet anatomical whole-heart propagation.</p>
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

      <footer>
        Manual multi-site pacing uses simultaneous finite-duration current pulses. Anatomical geometry, fibres and regional conduction remain later phases.
      </footer>
    </main>
  );
}
