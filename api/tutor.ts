const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = 'gpt-5-mini';
const MAX_QUESTION_LENGTH = 1000;

interface TutorRequestBody {
  readonly question?: unknown;
  readonly evidence?: unknown;
}

interface OpenAIResponseBody {
  readonly output_text?: unknown;
  readonly output?: readonly unknown[];
  readonly error?: { readonly message?: unknown } | null;
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
  return Response.json(body, {
    status,
    headers: corsHeaders(request),
  });
}

function isEvidenceV1(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { schemaVersion?: unknown; scenario?: unknown; tissue?: unknown };
  return candidate.schemaVersion === 1
    && typeof candidate.scenario === 'string'
    && !!candidate.tissue
    && typeof candidate.tissue === 'object';
}

function readOutputText(payload: OpenAIResponseBody): string | null {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text;
  }

  if (!Array.isArray(payload.output)) return null;

  for (const item of payload.output) {
    if (!item || typeof item !== 'object' || !('content' in item)) continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== 'object') continue;
      const candidate = part as { type?: unknown; text?: unknown };
      if (candidate.type === 'output_text' && typeof candidate.text === 'string') {
        return candidate.text;
      }
    }
  }

  return null;
}

export function OPTIONS(request: Request): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request),
  });
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.OPENAI_API_KEY;
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

  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;
  const upstream = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      store: false,
      instructions: [
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
      input: [{
        role: 'user',
        content: [{
          type: 'input_text',
          text: `Question:\n${question}\n\nStructured simulator evidence (JSON):\n${JSON.stringify(body.evidence)}`,
        }],
      }],
      text: {
        format: {
          type: 'json_schema',
          name: 'ep_tutor_response',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              answer: { type: 'string' },
              evidenceUsed: {
                type: 'array',
                items: { type: 'string' },
              },
              limitations: {
                type: 'array',
                items: { type: 'string' },
              },
              proposedActions: {
                type: 'array',
                maxItems: 1,
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    type: {
                      type: 'string',
                      enum: ['start', 'pause', 'reset', 'load_scenario'],
                    },
                    scenario: {
                      type: ['string', 'null'],
                      enum: ['manual-pacing', 'planar-wave', 'focal-rhythm', 'obstacle-reentry', null],
                    },
                  },
                  required: ['type', 'scenario'],
                },
              },
            },
            required: ['answer', 'evidenceUsed', 'limitations', 'proposedActions'],
          },
        },
      },
    }),
  });

  const payload = await upstream.json().catch(() => null) as OpenAIResponseBody | null;
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

  try {
    return jsonResponse(request, JSON.parse(outputText));
  } catch {
    return jsonResponse(request, { error: 'AI provider returned invalid structured output.' }, 502);
  }
}
