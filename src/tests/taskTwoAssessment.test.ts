import { describe, expect, it } from 'vitest';
import { markEcgAnswers, markPatternRecognition, markSnrt, markTaskTwo, markWenckebach } from '../assessment/task2/marking';

const complete={snrtLocation:'High right atrial electrogram, last paced atrial complex to first returning sinus atrial complex',snrtPurpose:'Assesses sinus node dysfunction by measuring recovery time after atrial overdrive pacing',patterns:{ARP:{diagnosis:'ARP',explanation:'atrial premature stimulus where atrial tissue fails to depolarise'},ERP:{diagnosis:'ERP',explanation:'atrial capture remains present but His or ventricular conduction fails'},AVNRT:{diagnosis:'AVNRT',explanation:'regular narrow-complex tachycardia with near-simultaneous atrial and ventricular activation'}},wenckebach:{diagnosis:'Mobitz I',explanation:'progressive AH or PR prolongation with eventual non-conducted atrial beat, grouped beating, and cycle resets after the dropped beat'},ecgAnswers:['Sinus bradycardia','Sinus pause','Mobitz I','Mobitz II','Complete heart block']} as const;
describe('Task 2 assessment',()=>{
 it('caps the complete rubric at 22 marks',()=>expect(markTaskTwo(complete).score).toBe(22));
 it('scores SNRT location and two purpose concepts',()=>expect(markSnrt(complete.snrtLocation,complete.snrtPurpose)).toMatchObject({score:3,maximumScore:3}));
 it('does not award SNRT purpose marks for a vague answer',()=>expect(markSnrt('HRA','because it is useful').score).toBe(1));
 it('scores ARP, ERP and AVNRT independently',()=>expect(markPatternRecognition(complete.patterns)).toMatchObject({score:9,maximumScore:9}));
 it('requires explanation concepts as well as diagnosis',()=>expect(markPatternRecognition({...complete.patterns,ARP:{diagnosis:'ARP',explanation:''}}).score).toBe(7));
 it('scores Wenckebach across diagnosis and four defining concepts',()=>expect(markWenckebach(complete.wenckebach)).toMatchObject({score:5,maximumScore:5}));
 it('accepts Mobitz I as a Wenckebach synonym',()=>expect(markWenckebach({...complete.wenckebach,diagnosis:'Mobitz I'}).score).toBe(5));
 it('awards one mark per ECG diagnosis',()=>expect(markEcgAnswers(complete.ecgAnswers)).toMatchObject({score:5,maximumScore:5}));
});
