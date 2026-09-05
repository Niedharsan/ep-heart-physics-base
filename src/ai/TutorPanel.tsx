import { useMemo, useState } from 'react';
import { askTutor } from './tutorClient';
import type { TutorEvidenceV1, TutorResponseV1 } from './types';
import './TutorPanel.css';

interface TutorPanelProps {
  readonly evidence: TutorEvidenceV1;
}

const exampleQuestions = Object.freeze([
  'What is happening in the tissue right now?',
  'Why might propagation stop near a lesion?',
  'What should I look for in the pseudo-ECG?',
]);

export function TutorPanel({ evidence }: TutorPanelProps) {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState<TutorResponseV1 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const evidenceLabel = useMemo(() => {
    const activity = evidence.tissue.state.replaceAll('-', ' ');
    return `${evidence.scenario} · ${activity} · ${evidence.lesionCount} lesion${evidence.lesionCount === 1 ? '' : 's'}`;
  }, [evidence]);

  async function submitQuestion(nextQuestion = question): Promise<void> {
    const normalizedQuestion = nextQuestion.trim();
    if (!normalizedQuestion || loading) return;

    setQuestion(normalizedQuestion);
    setLoading(true);
    setError(null);

    try {
      const tutorResponse = await askTutor({ question: normalizedQuestion, evidence });
      setResponse(tutorResponse);
    } catch (requestError) {
      setResponse(null);
      setError(requestError instanceof Error ? requestError.message : 'Tutor request failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel tutor-panel" aria-label="Ask EP tutor">
      <div className="tutor-panel-heading">
        <div>
          <span className="panel-kicker">AI TUTOR · READ ONLY</span>
          <h2>Ask EP</h2>
        </div>
        <span className="tutor-evidence-label">{evidenceLabel}</span>
      </div>

      <p className="tutor-boundary">
        The tutor receives a structured summary of the current simulation. It cannot modify the solver, pacing, lesions or assessment scores.
      </p>

      <div className="tutor-question-row">
        <textarea
          value={question}
          maxLength={1000}
          rows={3}
          placeholder="Ask about the current propagation pattern, lesion, scenario or pseudo-ECG…"
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              event.preventDefault();
              void submitQuestion();
            }
          }}
        />
        <button
          className="primary"
          disabled={loading || question.trim().length === 0}
          onClick={() => void submitQuestion()}
        >
          {loading ? 'Thinking…' : 'Ask tutor'}
        </button>
      </div>

      <div className="tutor-examples" aria-label="Example tutor questions">
        {exampleQuestions.map((example) => (
          <button key={example} type="button" onClick={() => void submitQuestion(example)}>
            {example}
          </button>
        ))}
      </div>

      {error && (
        <div className="tutor-error" role="alert">
          <strong>Tutor unavailable</strong>
          <span>{error}</span>
          <small>The simulator remains fully functional because AI is isolated from the numerical engine.</small>
        </div>
      )}

      {response && (
        <div className="tutor-response" aria-live="polite">
          <p>{response.answer}</p>

          {response.evidenceUsed.length > 0 && (
            <div>
              <strong>Evidence used</strong>
              <ul>{response.evidenceUsed.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          )}

          {response.limitations.length > 0 && (
            <div>
              <strong>Limitations</strong>
              <ul>{response.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
