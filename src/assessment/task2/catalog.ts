export type TaskTwoPatternId = 'ARP' | 'ERP' | 'AVNRT' | 'WENCKEBACH';
export type TaskTwoEcgId = 'sinus-bradycardia' | 'sinus-pause' | 'mobitz-i' | 'mobitz-ii' | 'complete-heart-block';

export const taskTwoPatternOptions = Object.freeze(['ARP', 'ERP', 'AVNRT', 'Wenckebach'] as const);
export const taskTwoEcgOptions = Object.freeze([
  'Sinus bradycardia', 'Sinus pause', 'Mobitz I', 'Mobitz II', 'Complete heart block',
] as const);

export const taskTwoPatternCases = Object.freeze([
  { id: 'ARP' as const, label: 'Case A', correctDiagnosis: 'ARP', explanationConcepts: Object.freeze(['atrial premature stimulus', 'atrial tissue fails to depolarise']) },
  { id: 'ERP' as const, label: 'Case B', correctDiagnosis: 'ERP', explanationConcepts: Object.freeze(['atrial capture remains present', 'His or ventricular conduction fails']) },
  { id: 'AVNRT' as const, label: 'Case C', correctDiagnosis: 'AVNRT', explanationConcepts: Object.freeze(['regular narrow-complex tachycardia', 'near-simultaneous atrial and ventricular activation']) },
]);

export const wenckebachCase = Object.freeze({
  id: 'WENCKEBACH' as const,
  correctDiagnosis: 'Wenckebach',
  explanationConcepts: Object.freeze([
    'progressive AH or PR prolongation',
    'eventual non-conducted atrial beat',
    'grouped beating',
    'cycle resets after the dropped beat',
  ]),
});

export const taskTwoEcgCases = Object.freeze([
  { id: 'sinus-bradycardia' as const, label: 'ECG 1', answer: 'Sinus bradycardia' },
  { id: 'sinus-pause' as const, label: 'ECG 2', answer: 'Sinus pause' },
  { id: 'mobitz-i' as const, label: 'ECG 3', answer: 'Mobitz I' },
  { id: 'mobitz-ii' as const, label: 'ECG 4', answer: 'Mobitz II' },
  { id: 'complete-heart-block' as const, label: 'ECG 5', answer: 'Complete heart block' },
]);
