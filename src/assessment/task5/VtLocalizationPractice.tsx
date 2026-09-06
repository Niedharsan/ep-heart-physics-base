import { appHref } from '../../appHref';
import './vtLocalizationPractice.css';

export function VtLocalizationPractice({ instructor = false }: { readonly instructor?: boolean }) {
  const view = instructor ? '&view=instructor' : '';
  return (
    <section className="assessment-panel vt-localization-practice" aria-labelledby="vt-localization-practice-title">
      <div className="assessment-panel-heading vt-localization-heading">
        <div>
          <span>CLASS 6 · PAGES 19-21 · 12 ADDITIONAL MARKS</span>
          <h2 id="vt-localization-practice-title">VT/PVC localisation continues as Tasks 6-8</h2>
          <p>
            The three Class 6 ECG examples are now separate scored assessment tasks rather than an unscored Task 5 extension.
          </p>
        </div>
      </div>
      <div className="vt-localization-footer">
        <a className="assessment-primary" href={appHref(`mode=assessment&task=6${view}`)}>Task 6 · 4 marks</a>
        <a href={appHref(`mode=assessment&task=7${view}`)}>Task 7 · 4 marks</a>
        <a href={appHref(`mode=assessment&task=8${view}`)}>Task 8 · 4 marks</a>
        <span>Tasks 6-8 add 12 marks to the assessment content.</span>
      </div>
    </section>
  );
}
