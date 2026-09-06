import { useRef, useState } from 'react';
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import {
  catheterDefinitions,
  catheterTargets,
} from './task1/catalog';
import type { CatheterId } from './task1/catalog';

export interface SpatialCatheterPlacement {
  readonly xPercent: number;
  readonly yPercent: number;
}

export type SpatialCatheterPlacements = Readonly<Partial<Record<CatheterId, SpatialCatheterPlacement>>>;

export interface SpatialCatheterPlacementResult {
  readonly score: number;
  readonly maximumScore: 4;
  readonly feedback: readonly string[];
}

const PLACEMENT_TOLERANCE_PERCENT = 10;
const KEYBOARD_STEP_PERCENT = 2;
const SPAWN_POSITIONS: Readonly<Record<CatheterId, SpatialCatheterPlacement>> = Object.freeze({
  hra: Object.freeze({ xPercent: 12, yPercent: 11 }),
  hbe: Object.freeze({ xPercent: 36, yPercent: 11 }),
  rva: Object.freeze({ xPercent: 60, yPercent: 11 }),
  cs: Object.freeze({ xPercent: 84, yPercent: 11 }),
});

function clamp(value: number): number {
  return Math.max(4, Math.min(96, value));
}

export function markSpatialCatheterPlacements(
  placements: SpatialCatheterPlacements,
): SpatialCatheterPlacementResult {
  const feedback: string[] = [];
  let score = 0;

  for (const catheter of catheterDefinitions) {
    const placement = placements[catheter.id];
    const target = catheterTargets.find((candidate) => candidate.id === catheter.correctTargetId);
    const correct = placement !== undefined
      && target !== undefined
      && Math.hypot(
        placement.xPercent - target.xPercent,
        placement.yPercent - target.yPercent,
      ) <= PLACEMENT_TOLERANCE_PERCENT;

    if (correct) score += 1;
    else if (!placement) feedback.push(`${catheter.shortLabel}: place this catheter before checking.`);
    else feedback.push(`${catheter.shortLabel}: position requires review.`);
  }

  return Object.freeze({
    score,
    maximumScore: 4,
    feedback: Object.freeze(feedback),
  });
}

export function CatheterPlacementExercise({ instructor = false }: { readonly instructor?: boolean }) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [selectedCatheterId, setSelectedCatheterId] = useState<CatheterId>('hra');
  const [draggingCatheterId, setDraggingCatheterId] = useState<CatheterId | null>(null);
  const [placements, setPlacements] = useState<SpatialCatheterPlacements>({});
  const [result, setResult] = useState<SpatialCatheterPlacementResult | null>(null);

  function selectCatheter(catheterId: CatheterId): void {
    setSelectedCatheterId(catheterId);
    setPlacements((current) => current[catheterId]
      ? current
      : { ...current, [catheterId]: SPAWN_POSITIONS[catheterId] });
    setResult(null);
  }

  function updatePlacement(catheterId: CatheterId, xPercent: number, yPercent: number): void {
    setPlacements((current) => ({
      ...current,
      [catheterId]: Object.freeze({
        xPercent: clamp(xPercent),
        yPercent: clamp(yPercent),
      }),
    }));
    setResult(null);
  }

  function updateFromPointer(
    catheterId: CatheterId,
    event: ReactPointerEvent<HTMLButtonElement>,
  ): void {
    const board = boardRef.current;
    if (!board) return;
    const rectangle = board.getBoundingClientRect();
    updatePlacement(
      catheterId,
      ((event.clientX - rectangle.left) / Math.max(1, rectangle.width)) * 100,
      ((event.clientY - rectangle.top) / Math.max(1, rectangle.height)) * 100,
    );
  }

  function handlePointerDown(
    catheterId: CatheterId,
    event: ReactPointerEvent<HTMLButtonElement>,
  ): void {
    setSelectedCatheterId(catheterId);
    setDraggingCatheterId(catheterId);
    event.currentTarget.setPointerCapture(event.pointerId);
    updateFromPointer(catheterId, event);
  }

  function handlePointerMove(
    catheterId: CatheterId,
    event: ReactPointerEvent<HTMLButtonElement>,
  ): void {
    if (draggingCatheterId !== catheterId) return;
    updateFromPointer(catheterId, event);
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLButtonElement>): void {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDraggingCatheterId(null);
  }

  function handleKeyDown(
    catheterId: CatheterId,
    event: ReactKeyboardEvent<HTMLButtonElement>,
  ): void {
    const placement = placements[catheterId];
    if (!placement) return;
    const offsets: Partial<Record<string, readonly [number, number]>> = {
      ArrowLeft: [-KEYBOARD_STEP_PERCENT, 0],
      ArrowRight: [KEYBOARD_STEP_PERCENT, 0],
      ArrowUp: [0, -KEYBOARD_STEP_PERCENT],
      ArrowDown: [0, KEYBOARD_STEP_PERCENT],
    };
    const offset = offsets[event.key];
    if (!offset) return;
    event.preventDefault();
    updatePlacement(
      catheterId,
      placement.xPercent + offset[0],
      placement.yPercent + offset[1],
    );
  }

  return (
    <article className="assessment-panel catheter-placement-exercise">
      <div className="assessment-panel-heading">
        <div>
          <span>SKILLS CHECK · CATHETER POSITIONING</span>
          <h2>Place the diagnostic catheters</h2>
        </div>
        <strong>{result ? `${result.score}/4 correct` : `${Object.keys(placements).length}/4 placed`}</strong>
      </div>
      <p className="prompt-copy">
        Select HRA, HBE, RVA or CS to add it to the field. Drag each catheter to its anatomical recording position, then check your placements.
      </p>

      <div className="catheter-chip-row" aria-label="Available diagnostic catheters">
        {catheterDefinitions.map((catheter) => (
          <button
            key={catheter.id}
            type="button"
            className={selectedCatheterId === catheter.id ? 'active' : ''}
            onClick={() => selectCatheter(catheter.id)}
          >
            {catheter.shortLabel}
            <small>{placements[catheter.id] ? 'Placed' : 'Add'}</small>
          </button>
        ))}
      </div>

      <div
        ref={boardRef}
        className="catheter-drag-board"
        role="group"
        aria-label="Schematic heart for draggable catheter placement"
      >
        <div className="heart-outline" aria-hidden="true">
          <span className="ra-shape" />
          <span className="rv-shape" />
          <span className="la-shape" />
          <span className="lv-shape" />
          <span className="septum-line" />
          <span className="cs-track" />
        </div>
        <span className="heart-chamber-label chamber-ra">RA</span>
        <span className="heart-chamber-label chamber-rv">RV</span>
        <span className="heart-chamber-label chamber-la">LA</span>
        <span className="heart-chamber-label chamber-lv">LV</span>

        {instructor && catheterTargets.map((target) => (
          <span
            key={target.id}
            className="catheter-reference-target"
            style={{ left: `${target.xPercent}%`, top: `${target.yPercent}%` }}
          >
            {target.label}
          </span>
        ))}

        {catheterDefinitions.map((catheter) => {
          const placement = placements[catheter.id];
          if (!placement) return null;
          return (
            <button
              key={catheter.id}
              type="button"
              className={`draggable-catheter ${selectedCatheterId === catheter.id ? 'active' : ''}`}
              style={{ left: `${placement.xPercent}%`, top: `${placement.yPercent}%` }}
              aria-label={`${catheter.label}. Drag with the pointer or move with the arrow keys.`}
              onPointerDown={(event) => handlePointerDown(catheter.id, event)}
              onPointerMove={(event) => handlePointerMove(catheter.id, event)}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onKeyDown={(event) => handleKeyDown(catheter.id, event)}
            >
              <span aria-hidden="true" />
              {catheter.shortLabel}
            </button>
          );
        })}
      </div>

      <div className="catheter-placement-actions">
        <button
          className="assessment-primary"
          type="button"
          onClick={() => setResult(markSpatialCatheterPlacements(placements))}
        >
          Check catheter positions
        </button>
        <button
          type="button"
          onClick={() => {
            setPlacements({});
            setResult(null);
            setSelectedCatheterId('hra');
          }}
        >
          Reset positions
        </button>
      </div>

      {result && (
        <div className={`marking-result ${result.score === result.maximumScore ? 'pass' : 'review'}`} aria-live="polite">
          <strong>{result.score}/{result.maximumScore} catheters correctly positioned</strong>
          {result.feedback.map((item) => <p key={item}>{item}</p>)}
        </div>
      )}
    </article>
  );
}
