import type { TutorRequestV1, TutorResponseV1 } from './types';

const defaultTutorEndpoint = '/api/tutor';

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export function isTutorResponseV1(value: unknown): value is TutorResponseV1 {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<TutorResponseV1>;
  return typeof candidate.answer === 'string'
    && isStringArray(candidate.evidenceUsed)
    && isStringArray(candidate.limitations);
}

export async function askTutor(
  request: TutorRequestV1,
  endpoint = import.meta.env.VITE_EP_TUTOR_ENDPOINT || defaultTutorEndpoint,
): Promise<TutorResponseV1> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'error' in payload
      && typeof (payload as { error?: unknown }).error === 'string'
      ? (payload as { error: string }).error
      : `Tutor request failed with HTTP ${response.status}.`;
    throw new Error(message);
  }

  if (!isTutorResponseV1(payload)) {
    throw new Error('Tutor endpoint returned an invalid response contract.');
  }

  return payload;
}
