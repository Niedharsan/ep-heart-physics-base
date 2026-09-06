import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RunningEgmStrip } from '../assessment/traces/RunningEgmStrip';
import type { ClinicalTraceDefinition } from '../assessment/traces/clinicalTrace';

const trace: ClinicalTraceDefinition = {
  id: 'ui-test',
  title: 'Live EGM test',
  description: 'Multi-channel live tracing',
  durationMs: 4000,
  teachingLabel: 'Synthetic educational tracing.',
  channels: [
    {
      id: 'lead-ii',
      label: 'II',
      signalClass: 'surface',
      events: [{ id: 'q1', kind: 'qrs', timeMs: 1000, widthScale: 1, amplitudeScale: 1 }],
    },
    {
      id: 'his',
      label: 'His',
      signalClass: 'intracardiac',
      events: [{ id: 'h1', kind: 'his', timeMs: 920, widthScale: 1, amplitudeScale: 1 }],
    },
  ],
  annotations: [
    { id: 'answer', label: 'ANSWER OVERLAY', timeMs: 900, endTimeMs: 1000, channelId: 'his', visibility: 'instructor' },
    { id: 'state', label: 'STUDENT STATE', timeMs: 1600, channelId: 'his', visibility: 'student' },
  ],
};

describe('RunningEgmStrip', () => {
  it('renders live controls, grid calibration and multi-channel paths', () => {
    const markup = renderToStaticMarkup(<RunningEgmStrip definition={trace} autoPlay />);

    expect(markup).toContain('data-running-egm="ui-test"');
    expect(markup).toContain('LIVE RECORDING');
    expect(markup).toContain('Freeze');
    expect(markup).toContain('Replay');
    expect(markup).toContain('Enlarge tracing');
    expect(markup).toContain('1 mV');
    expect(markup).toContain('signal-surface');
    expect(markup).toContain('signal-intracardiac');
  });

  it('preserves student state labels while keeping answer annotations protected', () => {
    const hidden = renderToStaticMarkup(<RunningEgmStrip definition={trace} />);
    const student = renderToStaticMarkup(
      <RunningEgmStrip definition={trace} annotationView="student" />,
    );
    const instructor = renderToStaticMarkup(
      <RunningEgmStrip definition={trace} annotationView="instructor" />,
    );

    expect(hidden).not.toContain('ANSWER OVERLAY');
    expect(hidden).not.toContain('STUDENT STATE');
    expect(student).toContain('STUDENT STATE');
    expect(student).not.toContain('ANSWER OVERLAY');
    expect(instructor).toContain('STUDENT STATE');
    expect(instructor).toContain('ANSWER OVERLAY');
    expect(instructor).toContain('Teaching overlays visible.');
  });
});
