const GEMINI_GENERATE_CONTENT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-2.5-flash';
const MAX_QUESTION_LENGTH = 1000;

const ALLOWED_SCENARIOS = Object.freeze([
  'manual-pacing',
  'planar-wave',
  'focal-rhythm',
  'obstacle-reentry',
] as const);

type AllowedScenario = typeof ALLOWED_SCENARIOS[number];

interface TutorRequestBody {
  readonly question?: unknown;
  readonly evidence?: unknown;
}

interface GeminiResponseBody {
  readonly candidates?: readonly {
    readonly content?: { readonly parts?: readonly { readonly text?: unknown }[] };
  }[];
  readonly error?: { readonly message?: unknown } | null;
}

type TutorAction =
  | Readonly<{ type: 'start' | 'pause' | 'reset'; scenario: null }>
  | Readonly<{ type: 'load_scenario'; scenario: AllowedScenario }>;

export interface TutorResponseBody {
  readonly answer: string;
  readonly evidenceUsed: readonly string[];
  readonly limitations: readonly string[];
  readonly proposedActions: readonly TutorAction[];
}

function corsHeaders(request: Request): HeadersInit {
  const allowedOrigin = process.env.EP_TUTOR_ALLOWED_ORIGIN;
  const requestOrigin = request.headers.get('origin');
  if (!allowedOrigin || !requestOrigin || requestOrigin !== allowedOrigin) return {};

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function jsonResponse(request: Request, body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: corsHeaders(request) });
}

function isEvidenceV1(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { schemaVersion?: unknown; scenario?: unknown; tissue?: unknown };
  return candidate.schemaVersion === 1
    && typeof candidate.scenario === 'string'
    && !!candidate.tissue
    && typeof candidate.tissue === 'object';
}

function readOutputText(payload: GeminiResponseBody): string | null {
  const parts = payload.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;
  const text = parts
    .map((part) => typeof part.text === 'string' ? part.text : '')
    .join('')
    .trim();
  return text.length > 0 ? text : null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isAllowedScenario(value: unknown): value is AllowedScenario {
  return typeof value === 'string'
    && ALLOWED_SCENARIOS.includes(value as AllowedScenario);
}

function isAllowedAction(value: unknown): value is TutorAction {
  if (!value || typeof value !== 'object') return false;
  const action = value as { type?: unknown; scenario?: unknown };
  if (action.type === 'load_scenario') return isAllowedScenario(action.scenario);
  if (action.type === 'start' || action.type === 'pause' || action.type === 'reset') {
    return action.scenario === null;
  }
  return false;
}

export function parseTutorResponse(text: string): TutorResponseBody | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object') return null;
  const response = parsed as Partial<TutorResponseBody>;
  if (
    typeof response.answer !== 'string'
    || !isStringArray(response.evidenceUsed)
    || !isStringArray(response.limitations)
    || !Array.isArray(response.proposedActions)
    || response.proposedActions.length > 1
    || !response.proposedActions.every(isAllowedAction)
  ) return null;

  return {
    answer: response.answer,
    evidenceUsed: response.evidenceUsed,
    limitations: response.limitations,
    proposedActions: response.proposedActions,
  };
}

export function OPTIONS(request: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return jsonResponse(request, { error: 'EP tutor is not configured on this deployment.' }, 503);
  }

  let body: TutorRequestBody;
  try {
    body = await request.json() as TutorRequestBody;
  } catch {
    return jsonResponse(request, { error: 'Request body must be valid JSON.' }, 400);
  }

  if (typeof body.question !== 'string' || body.question.trim().length === 0) {
    return jsonResponse(request, { error: 'A tutor question is required.' }, 400);
  }

  const question = body.question.trim();
  if (question.length > MAX_QUESTION_LENGTH) {
    return jsonResponse(request, { error: `Question exceeds ${MAX_QUESTION_LENGTH} characters.` }, 400);
  }

  if (!isEvidenceV1(body.evidence)) {
    return jsonResponse(request, { error: 'Tutor evidence does not match schema version 1.' }, 400);
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const upstream = await fetch(
    `${GEMINI_GENERATE_CONTENT_BASE_URL}/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{
            text: [
              'You are the educational EP tutor for a cardiac electrophysiology simulation.',
              'Answer only from the structured simulator evidence and stable electrophysiology principles.',
              'Never claim that this reduced 2D model is a patient-specific, diagnostic, clinically validated, or whole-heart simulation.',
              'Do not invent measurements that are absent from the evidence.',
              'If the evidence cannot support a conclusion, say so explicitly.',
              'You may propose at most one simulator action, and only when it directly helps answer the learner request.',
              'Allowed actions are start, pause, reset, or load_scenario using one of the four built-in scenarios.',
              'Never propose stimulation coordinates, lesions, numerical parameter changes, solver settings, assessment scoring, or any other action.',
              'The user must approve a proposal before the browser executes it.',
              'Keep the answer concise and useful to a learner.',
            ].join(' '),
          }],
        },
        contents: [{
          role: 'user',
          parts: [{
            text: `Question:\n${question}\n\nStructured simulator evidence (JSON):\n${JSON.stringify(body.evidence)}`,
          }],
        }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: {
              answer: { type: 'string' },
              evidenceUsed: { type: 'array', items: { type: 'string' } },
              limitations: { type: 'array', items: { type: 'string' } },
              proposedActions: {
                type: 'array',
                maxItems: 1,
                items: {
                  type: 'object',
                  properties: {
                    type: {
                      type: 'string',
                      enum: ['start', 'pause', 'reset', 'load_scenario'],
                    },
                    scenario: {
                      type: 'string',
                      nullable: true,
                      enum: [...ALLOWED_SCENARIOS],
                    },
                  },
                  required: ['type', 'scenario'],
                },
              },
            },
            required: ['answer', 'evidenceUsed', 'limitations', 'proposedActions'],
          },
        },
      }),
    },
  );

  const payload = await upstream.json().catch(() => null) as GeminiResponseBody | null;
  if (!upstream.ok || !payload) {
    const upstreamMessage = payload?.error?.message;
    const message = typeof upstreamMessage === 'string'
      ? upstreamMessage
      : 'AI provider request failed.';
    return jsonResponse(request, { error: message }, 502);
  }

  const outputText = readOutputText(payload);
  if (!outputText) {
    return jsonResponse(request, { error: 'AI provider returned no tutor response.' }, 502);
  }

  const tutorResponse = parseTutorResponse(outputText);
  if (!tutorResponse) {
    return jsonResponse(request, { error: 'AI provider returned invalid structured output.' }, 502);
  }

  return jsonResponse(request, tutorResponse);
}
