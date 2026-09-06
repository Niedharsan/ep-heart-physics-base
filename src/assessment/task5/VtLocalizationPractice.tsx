import { useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import class6Case19 from './assets/class6-vt-case-19.svg';
import class6Case20 from './assets/class6-vt-case-20.svg';
import class6Case21 from './assets/class6-vt-case-21.svg';
import {
  EMPTY_VT_LOCALIZATION_RESPONSE,
  classSixVtLocalizationCases,
  markVtLocalizationResponse,
} from './vtLocalizationPractice';
import type {
  VtLocalizationCase,
  VtLocalizationMark,
  VtLocalizationResponse,
} from './vtLocalizationPractice';
import './vtLocalizationPractice.css';

const caseImages: Readonly<Record<VtLocalizationCase['id'], string>> = Object.freeze({
  'class6-page19': class6Case19,
  'class6-page20': class6Case20,
  'class6-page21': class6Case21,
});

type ResponseState = Readonly<Record<VtLocalizationCase['id'], VtLocalizationResponse>>;
type MarkState = Readonly<Record<VtLocalizationCase['id'], VtLocalizationMark | null>>;

function initialResponses(): ResponseState {
  return Object.freeze({
    'class6-page19': { ...EMPTY_VT_LOCALIZATION_RESPONSE },
    'class6-page20': { ...EMPTY_VT_LOCALIZATION_RESPONSE },
    'class6-page21': { ...EMPTY_VT_LOCALIZATION_RESPONSE },
  });
}

function initialMarks(): MarkState {
  return Object.freeze({
    'class6-page19': null,
    'class6-page20': null,
    'class6-page21': null,
  });
}

function responseComplete(response: VtLocalizationResponse): boolean {
  return response.morphology !== ''
    && response.verticalOrigin !== ''
    && response.septalLateral !== ''
    && response.outflowClassification !== '';
}

function fieldStatus(mark: VtLocalizationMark | null, correct: boolean): string | undefined {
  if (mark === null) return undefined;
  return correct ? 'correct' : 'incorrect';
}

export function VtLocalizationPractice({ instructor = false }: { readonly instructor?: boolean }) {
  const [responses, setResponses] = useState<ResponseState>(() => initialResponses());
  const [marks, setMarks] = useState<MarkState>(() => initialMarks());

  const total = useMemo(() => (
    classSixVtLocalizationCases.reduce(
      (sum, item) => sum + (marks[item.id]?.score ?? 0),
      0,
    )
  ), [marks]);
  const checkedCases = classSixVtLocalizationCases.filter((item) => marks[item.id] !== null).length;

  const update = <K extends keyof VtLocalizationResponse>(
    caseId: VtLocalizationCase['id'],
    key: K,
    value: VtLocalizationResponse[K],
  ): void => {
    setResponses((current) => ({
      ...current,
      [caseId]: { ...current[caseId], [key]: value },
    }));
    setMarks((current) => ({ ...current, [caseId]: null }));
  };

  const checkCase = (item: VtLocalizationCase): void => {
    const response = responses[item.id];
    if (!responseComplete(response)) return;
    setMarks((current) => ({
      ...current,
      [item.id]: markVtLocalizationResponse(response, item.answer),
    }));
  };

  const resetAll = (): void => {
    setResponses(initialResponses());
    setMarks(initialMarks());
  };

  return (
    <section className="vt-localization-practice" aria-labelledby="vt-localization-practice-title">
      <div className="assessment-panel-heading vt-localization-heading">
        <div>
          <span>CLASS 6 · ECG PRACTICE · PAGES 19-21</span>
          <h2 id="vt-localization-practice-title">VT/PVC localisation practice</h2>
          <p>
            Use the course sequence: bundle-branch morphology, superior/inferior origin,
            septal/lateral location, then RVOT/LVOT/other.
          </p>
        </div>
        <div className="vt-localization-total" aria-live="polite">
          {checkedCases === 0 ? '3 cases' : `${total}/${checkedCases * 4} checked`}
        </div>
      </div>

      <div className="prototype-warning">
        These are the Class 6 teaching examples from the supplied slide deck. The localisation rules are intentionally course-specific and simplified; they are not a complete clinical VT/PVC diagnostic algorithm.
      </div>

      <div className="vt-localization-grid">
        {classSixVtLocalizationCases.map((item) => {
          const response = responses[item.id];
          const mark = marks[item.id];
          const showAnswer = instructor || mark !== null;
          return (
            <article className="assessment-panel vt-localization-card" key={item.id}>
              <div className="assessment-panel-heading">
                <div>
                  <span>PAGE {item.slidePage}</span>
                  <h3>{item.title}</h3>
                </div>
                {mark !== null && (
                  <strong className={mark.score === 4 ? 'vt-case-score pass' : 'vt-case-score'}>
                    {mark.score}/4
                  </strong>
                )}
              </div>

              <div className="vt-localization-image-shell">
                <img
                  src={caseImages[item.id]}
                  alt={`ECG tracing for ${item.title}`}
                  loading="lazy"
                />
              </div>

              <div className="vt-localization-fields">
                <label data-status={fieldStatus(mark, mark?.fields.morphology ?? false)}>
                  1. RBBB or LBBB morphology
                  <select
                    value={response.morphology}
                    onChange={(event: ChangeEvent<HTMLSelectElement>) => (
                      update(item.id, 'morphology', event.target.value as VtLocalizationResponse['morphology'])
                    )}
                  >
                    <option value="">Choose…</option>
                    <option value="RBBB">RBBB</option>
                    <option value="LBBB">LBBB</option>
                  </select>
                </label>

                <label data-status={fieldStatus(mark, mark?.fields.verticalOrigin ?? false)}>
                  2. Superior or inferior
                  <select
                    value={response.verticalOrigin}
                    onChange={(event: ChangeEvent<HTMLSelectElement>) => (
                      update(item.id, 'verticalOrigin', event.target.value as VtLocalizationResponse['verticalOrigin'])
                    )}
                  >
                    <option value="">Choose…</option>
                    <option value="Superior">Superior</option>
                    <option value="Inferior">Inferior</option>
                  </select>
                </label>

                <label data-status={fieldStatus(mark, mark?.fields.septalLateral ?? false)}>
                  3. Septal or lateral
                  <select
                    value={response.septalLateral}
                    onChange={(event: ChangeEvent<HTMLSelectElement>) => (
                      update(item.id, 'septalLateral', event.target.value as VtLocalizationResponse['septalLateral'])
                    )}
                  >
                    <option value="">Choose…</option>
                    <option value="Septal">Septal</option>
                    <option value="Lateral">Lateral</option>
                  </select>
                </label>

                <label data-status={fieldStatus(mark, mark?.fields.outflowClassification ?? false)}>
                  4. PVC: RVOT, LVOT or other
                  <select
                    value={response.outflowClassification}
                    onChange={(event: ChangeEvent<HTMLSelectElement>) => (
                      update(item.id, 'outflowClassification', event.target.value as VtLocalizationResponse['outflowClassification'])
                    )}
                  >
                    <option value="">Choose…</option>
                    <option value="RVOT">RVOT</option>
                    <option value="LVOT">LVOT</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
              </div>

              <button
                className="assessment-primary"
                type="button"
                disabled={!responseComplete(response)}
                onClick={() => checkCase(item)}
              >
                Check case
              </button>

              {showAnswer && (
                <div className="vt-localization-answer" aria-live="polite">
                  <strong>{item.finalInterpretation}</strong>
                  {item.rationale.map((reason) => <p key={reason}>{reason}</p>)}
                  {instructor && <small>{item.sourceBoundary}</small>}
                </div>
              )}
            </article>
          );
        })}
      </div>

      <div className="vt-localization-footer">
        <button type="button" onClick={resetAll}>Reset Class 6 practice</button>
        <span>Each case is 4 teaching checks; this extension does not change the formal Task 5 mark allocation.</span>
      </div>
    </section>
  );
}
