import { useEffect, useMemo, useRef, useState } from 'react';
import type { EngineSnapshot, ScenarioId, WorkerCommand, WorkerEvent } from './engine/core/types';
import { alievPanfilovPresets } from './engine/models/AlievPanfilov';
import { EcgCanvas } from './ui/EcgCanvas';
import { VoltageCanvas } from './ui/VoltageCanvas';
import './styles.css';

const initialScenario: ScenarioId = 'focal-rhythm';

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

export default function App() {
  const workerRef = useRef<Worker | null>(null);
  const [snapshot, setSnapshot] = useState<EngineSnapshot | null>(null);
  const [ecgSamples, setEcgSamples] = useState<number[]>([]);
  const [running, setRunning] = useState(false);
  const [scenario, setScenario] = useState<ScenarioId>(initialScenario);
  const [interactionMode, setInteractionMode] = useState<'stimulate' | 'ablate'>('stimulate');
  const [stableDt, setStableDt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [solverStepsPerBatch, setSolverStepsPerBatch] = useState<number>(runtimeClocks.solverStepsPerBatch);

  const scenarioLabel = useMemo(() => {
    const labels: Record<ScenarioId, string> = {
      'planar-wave': 'Planar wave',
      'focal-rhythm': 'Focal rhythm',
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

  function toggleRunning(): void {
    const nextRunning = !running;
    send({ type: nextRunning ? 'start' : 'pause' });
    setRunning(nextRunning);
  }

  function reset(nextScenario = scenario): void {
    send({ type: 'reset', scenario: nextScenario });
    setEcgSamples([]);
    setRunning(false);
  }

  return (
    <main className="app-shell">
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
              reset(nextScenario);
            }}
          >
            <option value="focal-rhythm">Focal rhythm</option>
            <option value="planar-wave">Planar wave</option>
            <option value="obstacle-reentry">Obstacle / re-entry scaffold</option>
          </select>
        </label>
        <label>
          Interaction
          <select value={interactionMode} onChange={(event) => setInteractionMode(event.target.value as 'stimulate' | 'ablate')}>
            <option value="stimulate">Stimulate tissue</option>
            <option value="ablate">Create lesion</option>
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
      </section>

      {error && <div className="error-banner">Engine error: {error}</div>}

      <section className="workspace-grid">
        <article className="panel tissue-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">TISSUE VOLTAGE</span>
              <h2>{scenarioLabel}</h2>
            </div>
            <p>Click the field to {interactionMode === 'stimulate' ? 'stimulate' : 'ablate'}.</p>
          </div>
          <VoltageCanvas
            snapshot={snapshot}
            interactionMode={interactionMode}
            onPoint={(x, y) => {
              if (interactionMode === 'stimulate') {
                send({ type: 'stimulate', stimulus: { x, y, radius: 4, amplitude: 1 } });
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
            <p>This is a reduced excitable-tissue prototype, not a validated human-heart digital twin or medical device.</p>
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
        Built as a clean foundation for Codex High-mode audit, numerical verification and staged expansion toward 3D ECG/EGM, pacing and physical ablation.
      </footer>
    </main>
  );
}
