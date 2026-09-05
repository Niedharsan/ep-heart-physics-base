import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseTutorResponse, POST } from '../../api/tutor';

const evidence = {
  schemaVersion: 1,
  scenario: 'manual-pacing',
  running: false,
  tissue: { state: 'resting' },
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('Gemini tutor API', () => {
  it('calls generateContent with a server-side key and preserves the response contract', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'unit-test-key');
    vi.stubEnv('GEMINI_MODEL', 'gemini-2.5-flash');
    const tutorResponse = {
      answer: 'The tissue is resting.',
      evidenceUsed: ['tissue.state is resting'],
      limitations: ['This is a reduced 2D model.'],
      proposedActions: [],
    };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify(tutorResponse) }] } }],
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(new Request('http://localhost/api/tutor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'What is happening?', evidence }),
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(tutorResponse);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/gemini-2.5-flash:generateContent');
    expect(request.headers).toEqual(expect.objectContaining({
      'x-goog-api-key': 'unit-test-key',
    }));
    expect(request.body).not.toContain('unit-test-key');
  });

  it('rejects unsupported actions and more than one proposed action', () => {
    expect(parseTutorResponse(JSON.stringify({
      answer: 'No.',
      evidenceUsed: [],
      limitations: [],
      proposedActions: [{ type: 'ablate', scenario: null }],
    }))).toBeNull();

    expect(parseTutorResponse(JSON.stringify({
      answer: 'No.',
      evidenceUsed: [],
      limitations: [],
      proposedActions: [
        { type: 'start', scenario: null },
        { type: 'reset', scenario: null },
      ],
    }))).toBeNull();
  });

  it('accepts only a built-in scenario for load_scenario', () => {
    expect(parseTutorResponse(JSON.stringify({
      answer: 'Load the planar-wave scenario.',
      evidenceUsed: [],
      limitations: [],
      proposedActions: [{ type: 'load_scenario', scenario: 'planar-wave' }],
    }))?.proposedActions).toEqual([{ type: 'load_scenario', scenario: 'planar-wave' }]);

    expect(parseTutorResponse(JSON.stringify({
      answer: 'No.',
      evidenceUsed: [],
      limitations: [],
      proposedActions: [{ type: 'load_scenario', scenario: 'custom' }],
    }))).toBeNull();
  });
});
