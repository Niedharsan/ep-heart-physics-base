import { RunningEgmStrip } from './traces/RunningEgmStrip';
import { vtLocalizationTraceCatalog } from './task5/vtLocalizationTraceCatalog';
import type { VtLocalizationTaskId } from './task5/vtLocalizationPractice';

export function VtLocalizationLiveTrace({
  taskId,
  instructor,
}: {
  readonly taskId: VtLocalizationTaskId;
  readonly instructor: boolean;
}) {
  return (
    <div className="vt-localization-live-trace" data-vt-localization-live-trace={taskId}>
      <RunningEgmStrip
        definition={vtLocalizationTraceCatalog[taskId]}
        annotationView={instructor ? 'instructor' : 'student'}
        autoPlay
        compact
        svgClassName="vt-localization-live-svg"
      />
    </div>
  );
}
