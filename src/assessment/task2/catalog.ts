import type { TaskTwoTraceId } from './traceCatalog';

export type TaskTwoPatternId = 'ARP' | 'ERP' | 'AVNRT' | 'WENCKEBACH';
export type TaskTwoEcgId = 'sinus-bradycardia' | 'sinus-pause' | 'mobitz-i' | 'mobitz-ii' | 'complete-heart-block';

export const taskTwoPatternOptions = Object.freeze(['ARP', 'ERP', 'AVNRT', 'Wenckebach'] as const);
export const taskTwoEcgOptions = Object.freeze([
  'Sinus bradycardia', 'Sinus pause', 'Mobitz I', 'Mobitz II', 'Complete heart block',
] as const);

export interface TaskTwoPatternCase {
  readonly id: Exclude<TaskTwoPatternId, 'WENCKEBACH'>;
  readonly label: string;
  readonly correctDiagnosis: string;
  readonly traceId: TaskTwoTraceId;
}

export const taskTwoPatternCases: readonly TaskTwoPatternCase[] = Object.freeze([
  Object.freeze({ id: 'ARP', label: 'Case A', correctDiagnosis: 'ARP', traceId: 'arp' }),
  Object.freeze({ id: 'ERP', label: 'Case B', correctDiagnosis: 'ERP', traceId: 'erp' }),
  Object.freeze({ id: 'AVNRT', label: 'Case C', correctDiagnosis: 'AVNRT', traceId: 'avnrt' }),
]);

export const wenckebachCase = Object.freeze({
  id: 'WENCKEBACH' as const,
  correctDiagnosis: 'Wenckebach',
  traceId: 'wenckebach' as const,
});

export const taskTwoEcgCases = Object.freeze([
  Object.freeze({ id: 'sinus-bradycardia' as const, label: 'ECG 1', answer: 'Sinus bradycardia', traceId: 'sinus-bradycardia' as const }),
  Object.freeze({ id: 'sinus-pause' as const, label: 'ECG 2', answer: 'Sinus pause', traceId: 'sinus-pause' as const }),
  Object.freeze({ id: 'mobitz-i' as const, label: 'ECG 3', answer: 'Mobitz I', traceId: 'mobitz-i' as const }),
  Object.freeze({ id: 'mobitz-ii' as const, label: 'ECG 4', answer: 'Mobitz II', traceId: 'mobitz-ii' as const }),
  Object.freeze({ id: 'complete-heart-block' as const, label: 'ECG 5', answer: 'Complete heart block', traceId: 'complete-heart-block' as const }),
]);
