import type { TaskFiveRubric } from './marking';

export const taskFiveClinicalRubric: TaskFiveRubric = Object.freeze({
  rubricVersion: 1,
  approvalStatus: 'domain-approved',
  evidenceBoundary: Object.freeze([
    'The two VT examples use conventional idiopathic morphology patterns: RVOT VT with an LBBB-like inferior-axis pattern and left posterior fascicular VT with an RBBB-like left/superior-axis pattern.',
    'Para-Hisian pacing compares retrograde atrial timing and sequence during His/right-bundle plus ventricular capture versus ventricular-only capture after reducing output.',
    'An unchanged stimulus-to-atrial interval and unchanged atrial sequence after loss of His/right-bundle capture supports retrograde accessory-pathway conduction; prolongation with unchanged sequence supports AV-nodal conduction; a sequence change can indicate both routes.',
    'Para-Hisian pacing has recognised limitations: AV-nodal conduction may mask distant or slowly conducting pathways, and the manoeuvre performed outside tachycardia does not prove pathway participation in the tachycardia circuit.',
  ]),
  sections: Object.freeze({
    'vt-rvot': Object.freeze([
      Object.freeze({
        id: 'rvot-origin',
        label: 'Identify right-ventricular-outflow-tract ventricular tachycardia.',
        acceptedStatements: Object.freeze([
          'right ventricular outflow tract ventricular tachycardia',
          'right ventricular outflow tract VT',
          'RVOT ventricular tachycardia',
          'RVOT VT',
          'outflow tract ventricular tachycardia',
          'outflow tract VT',
        ]),
      }),
      Object.freeze({
        id: 'rvot-morphology',
        label: 'State the LBBB-like morphology with an inferior axis.',
        acceptedStatements: Object.freeze([
          'left bundle branch block morphology with inferior axis',
          'LBBB morphology with inferior axis',
          'LBBB pattern with inferior axis',
          'left bundle pattern and inferior axis',
          'LBBB inferior axis',
        ]),
      }),
    ]),
    'vt-fascicular': Object.freeze([
      Object.freeze({
        id: 'fascicular-origin',
        label: 'Identify left posterior fascicular ventricular tachycardia.',
        acceptedStatements: Object.freeze([
          'left posterior fascicular ventricular tachycardia',
          'left posterior fascicular VT',
          'posterior fascicular ventricular tachycardia',
          'posterior fascicular VT',
          'fascicular ventricular tachycardia',
          'fascicular VT',
          'verapamil sensitive fascicular VT',
        ]),
      }),
      Object.freeze({
        id: 'fascicular-rbbb',
        label: 'State the RBBB-like morphology.',
        acceptedStatements: Object.freeze([
          'right bundle branch block morphology',
          'RBBB morphology',
          'RBBB pattern',
          'right bundle pattern',
        ]),
      }),
      Object.freeze({
        id: 'fascicular-axis',
        label: 'State the leftward or superior axis.',
        acceptedStatements: Object.freeze([
          'left axis deviation',
          'leftward axis',
          'superior axis',
          'left superior axis',
        ]),
      }),
    ]),
    'para-hisian': Object.freeze([
      Object.freeze({
        id: 'pacing-site',
        label: 'Pace adjacent to the His bundle and proximal right bundle branch.',
        acceptedStatements: Object.freeze([
          'pace adjacent to the His bundle',
          'pacing near the His bundle',
          'para Hisian pacing near the His',
          'pace the His bundle region',
          'pace near the His and proximal right bundle',
        ]),
      }),
      Object.freeze({
        id: 'high-output-capture',
        label: 'Begin with high output that captures ventricle plus His/right bundle.',
        acceptedStatements: Object.freeze([
          'high output captures the ventricle and His bundle',
          'high output captures ventricle plus His',
          'high output captures RV and His',
          'His right bundle and ventricular capture',
          'His bundle capture with ventricular capture',
        ]),
      }),
      Object.freeze({
        id: 'loss-of-his-capture',
        label: 'Reduce output to lose His/right-bundle capture while maintaining ventricular capture.',
        acceptedStatements: Object.freeze([
          'reduce output to lose His capture while maintaining ventricular capture',
          'lower output loses His capture but keeps ventricular capture',
          'loss of His bundle capture with continued ventricular capture',
          'RV only capture after reducing output',
          'ventricular only capture at lower output',
        ]),
      }),
      Object.freeze({
        id: 'qrs-transition',
        label: 'Confirm the QRS widens or changes when His/right-bundle capture is lost.',
        acceptedStatements: Object.freeze([
          'QRS widens when His capture is lost',
          'wider QRS with loss of His capture',
          'QRS morphology changes after loss of His capture',
          'capture transition is confirmed by QRS widening',
        ]),
      }),
      Object.freeze({
        id: 'sa-comparison',
        label: 'Compare stimulus-to-atrial intervals between the two capture states.',
        acceptedStatements: Object.freeze([
          'compare stimulus to atrial intervals',
          'compare the S A interval',
          'compare SA intervals',
          'measure stimulus atrial timing in both capture states',
          'compare stimulus to atrium timing',
        ]),
      }),
      Object.freeze({
        id: 'sequence-comparison',
        label: 'Compare the retrograde atrial activation sequence.',
        acceptedStatements: Object.freeze([
          'compare the retrograde atrial activation sequence',
          'compare atrial activation sequence',
          'assess whether the atrial sequence changes',
          'compare retrograde sequence between capture states',
        ]),
      }),
      Object.freeze({
        id: 'accessory-pathway-response',
        label: 'Unchanged S-A timing and sequence after loss of His capture supports an accessory pathway response.',
        acceptedStatements: Object.freeze([
          'unchanged SA interval and atrial sequence supports an accessory pathway',
          'unchanged stimulus to atrial interval and sequence indicates accessory pathway conduction',
          'no change in SA timing or atrial sequence is an accessory pathway response',
          'fixed SA interval with unchanged sequence supports retrograde accessory pathway',
          'accessory pathway response',
        ]),
      }),
      Object.freeze({
        id: 'av-nodal-response',
        label: 'S-A prolongation with unchanged sequence supports an AV-nodal response.',
        acceptedStatements: Object.freeze([
          'SA prolongation with unchanged atrial sequence supports AV nodal conduction',
          'longer stimulus to atrial interval with unchanged sequence indicates AV node conduction',
          'increase in SA interval with unchanged sequence is an AV nodal response',
          'AV nodal response',
        ]),
      }),
      Object.freeze({
        id: 'mixed-response',
        label: 'A change in atrial activation sequence can indicate both accessory-pathway and AV-nodal conduction.',
        acceptedStatements: Object.freeze([
          'change in atrial activation sequence indicates both accessory pathway and AV nodal conduction',
          'different atrial sequence suggests dual retrograde routes',
          'sequence change suggests both pathway and AV node conduction',
          'mixed accessory pathway and AV nodal response',
        ]),
      }),
      Object.freeze({
        id: 'limitation',
        label: 'State that AV-nodal conduction can mask a distant/slow pathway or that the manoeuvre does not prove pathway participation during tachycardia.',
        acceptedStatements: Object.freeze([
          'AV nodal conduction can mask a distant accessory pathway',
          'AV node conduction may mask a slowly conducting pathway',
          'a negative response does not exclude an accessory pathway',
          'para Hisian pacing does not prove pathway participation in tachycardia',
          'the manoeuvre cannot prove the pathway is part of the tachycardia circuit',
          'distant or slowly conducting pathways can be missed',
        ]),
      }),
    ]),
  }),
});
