import { describe, expect, it } from 'vitest';
import { taskFourCases } from '../assessment/task4/catalog';
import { taskFourClinicalRubric, taskFourClinicalSources } from '../assessment/task4/clinicalRubric';
import { taskFourTraceCatalog, taskFourTraceIds } from '../assessment/task4/traceCatalog';
import { buildTaskFourTraceRenderModel } from '../assessment/task4/traceRendererModel';

describe('Task 4 clinical content', () => {
  it('provides one deterministic synthetic trace for every case', () => {
    expect(taskFourTraceIds).toHaveLength(4);
    expect(taskFourCases.map((item) => item.traceId).sort()).toEqual([...taskFourTraceIds].sort());
    expect(new Set(taskFourTraceIds.map((id) => JSON.stringify(taskFourTraceCatalog[id].channels))).size).toBe(4);
  });

  it('keeps instructor annotations hidden from student render models', () => {
    for (const traceId of taskFourTraceIds) {
      const definition = taskFourTraceCatalog[traceId];
      const student = buildTaskFourTraceRenderModel(definition, 'student');
      const instructor = buildTaskFourTraceRenderModel(definition, 'instructor');
      expect(student.annotations.length).toBeLessThanOrEqual(instructor.annotations.length);
    }
    expect(buildTaskFourTraceRenderModel(taskFourTraceCatalog['vav-after-ventricular-overdrive-pacing'], 'student').annotations.map((item) => item.label).join(' ')).not.toContain('115');
    expect(buildTaskFourTraceRenderModel(taskFourTraceCatalog['vav-after-ventricular-overdrive-pacing'], 'instructor').annotations.map((item) => item.label).join(' ')).toContain('115');
  });

  it('encodes the conventional PPI-TCL and His-refractory PVC teaching metadata', () => {
    const metadata = taskFourTraceCatalog['vav-after-ventricular-overdrive-pacing'].teachingMetadata;
    expect(metadata.kind).toBe('ventricular-overdrive-pacing');
    if (metadata.kind !== 'ventricular-overdrive-pacing' || metadata.response !== 'VAV') throw new Error('Wrong metadata');
    expect(metadata.ppiMinusTclMs).toBe(140);
    expect(metadata.ppiMinusTclMs).toBeGreaterThan(115);
    expect(metadata.nextManeuver).toBe('his-refractory-pvc');
  });

  it('documents evidence sources and exact rubric criterion counts', () => {
    expect(taskFourClinicalSources.length).toBeGreaterThanOrEqual(5);
    expect(taskFourClinicalRubric.sections['avrt-concentric']).toHaveLength(5);
    expect(taskFourClinicalRubric.sections['avrt-eccentric']).toHaveLength(5);
    expect(taskFourClinicalRubric.sections['vaav-pattern']).toHaveLength(5);
    expect(taskFourClinicalRubric.sections['vav-pattern']).toHaveLength(10);
  });
});
