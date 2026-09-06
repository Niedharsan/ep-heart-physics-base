import './assessmentTutor.css';

interface AssessmentTutorPlaceholderProps {
  /** Unlock only after the learner has submitted the relevant assessment task. */
  readonly unlocked?: boolean;
}

export function AssessmentTutorPlaceholder({ unlocked = false }: AssessmentTutorPlaceholderProps) {
  return (
    <section className="assessment-tutor-migration" aria-label="Assessment AI tutor">
      <div>
        <span className="assessment-panel-kicker">AI TUTOR · ASSESSMENT MODE</span>
        <h2>Ask why</h2>
        <p>
          Ask about the reasoning after you submit a task. The tutor will explain the marked answer or process using the evidence from your attempt; it will not reveal answers before submission.
        </p>
        {!unlocked && <p className="assessment-tutor-lock-note">Complete and submit this task to unlock explanations.</p>}
      </div>
      <div className="assessment-tutor-migration-controls">
        <textarea
          aria-label="Assessment tutor question"
          disabled={!unlocked}
          placeholder="Ask why an answer was correct or needs review…"
        />
        <button type="button" disabled={!unlocked}>Ask tutor</button>
      </div>
    </section>
  );
}
