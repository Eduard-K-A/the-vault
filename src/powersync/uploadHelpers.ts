interface FunctionEnvelope {
  op: unknown;
  payload: Record<string, unknown>;
}

interface ResponseLike {
  status?: number;
  statusText?: string;
  clone?: () => { text?: () => Promise<string> };
  text?: () => Promise<string>;
}

interface SessionClientLike {
  auth?: {
    getSession?: () => Promise<{
      data?: {
        session?: {
          access_token?: string;
        } | null;
      };
    }>;
  };
}

interface UploadFailureInput {
  table: string;
  op: unknown;
  id: string;
  functionName: string;
  details: string;
}

interface CrudPayloadInput {
  table: string;
  id: string;
  opData?: Record<string, unknown> | null;
}

function getResponseLike(error: unknown): ResponseLike | null {
  if (!error || typeof error !== 'object' || !('context' in error)) {
    return null;
  }

  const context = (error as { context?: unknown }).context;
  return context && typeof context === 'object' ? (context as ResponseLike) : null;
}

async function readResponseBody(response: ResponseLike): Promise<string> {
  const readableResponse = response.clone?.() ?? response;
  const reader = readableResponse.text;
  if (!reader) {
    return '';
  }

  return reader.call(readableResponse).catch(() => '');
}

function tryParseJsonObject(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function formatHttpFunctionError(status: string | number, statusText: string, bodyText: string): string {
  const body = tryParseJsonObject(bodyText);
  const code = typeof body?.code === 'string' ? body.code : null;
  const message = typeof body?.message === 'string' ? body.message : null;
  const label = code ?? statusText;
  const summary = message ?? bodyText;
  const missingFunctionHint =
    Number(status) === 404 && code === 'NOT_FOUND'
      ? ' Deploy the Edge Function to the configured Supabase project or update the connector function name.'
      : '';

  const base = `HTTP ${status}${label ? ` ${label}` : ''}${summary ? `: ${summary}` : ''}`;
  return `${base}${missingFunctionHint ? `.${missingFunctionHint}` : ''}`.trim();
}

export function buildFunctionInvokeOptions(envelope: FunctionEnvelope, accessToken: string) {
  return {
    body: envelope,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  };
}

export function buildUploadFailureMessage(input: UploadFailureInput): string {
  return `[powersync] upload failed table=${input.table} op=${String(input.op)} id=${input.id} function=${input.functionName}: ${input.details}`;
}

export function buildCrudUploadPayload(
  input: CrudPayloadInput,
  localRow?: Record<string, unknown> | null,
): Record<string, unknown> {
  return {
    ...(input.opData ?? {}),
    ...(localRow ?? {}),
    id: input.id,
    table: input.table,
  };
}

export function getUploadFunctionName(table: string, op: unknown, deleteOp: unknown): string | null {
  if (op === deleteOp) {
    return table === 'businesses' ? 'delete-business' : null;
  }

  return table === 'profiles'
    ? 'upsert-profile'
    : table === 'sales'
      ? 'commit_sale'
    : table === 'refunds'
      ? 'create_refund'
    : table === 'inventory_adjustments'
      ? 'apply_inventory_adjustment'
    : table === 'products'
      ? 'save_product'
    : table === 'branches'
      ? 'create-branch'
    : table === 'business_members'
      ? 'add-member'
    : table === 'businesses'
      ? 'create-business'
    : null;
}

export async function getFunctionAccessToken(
  client: SessionClientLike,
  fallbackAccessToken: string | null,
): Promise<string | null> {
  const sessionResult = await client.auth?.getSession?.().catch(() => null);
  return sessionResult?.data?.session?.access_token ?? fallbackAccessToken;
}

export async function describeFunctionError(error: unknown): Promise<string> {
  const response = getResponseLike(error);
  if (response) {
    const status = response.status ?? 'unknown';
    const statusText = response.statusText ?? '';
    const body = await readResponseBody(response);
    return formatHttpFunctionError(status, statusText, body);
  }

  return error instanceof Error ? error.message : String(error);
}
