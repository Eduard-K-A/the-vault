import type { BusinessSummary, UserRole } from '@/types/models';

export interface ValidateJoinCodeResponse {
  business_id: string;
  business_name: string;
}

export function normalizeJoinCode(joinCode: string): string {
  return joinCode.trim().toUpperCase();
}

export function buildJoinedBusinessSummary(
  response: ValidateJoinCodeResponse,
  role: UserRole,
): BusinessSummary {
  return {
    businessId: response.business_id,
    businessName: response.business_name,
    role,
    branchId: null,
    branchName: null,
  };
}

export function mergeBusinessSummary(
  summaries: BusinessSummary[],
  summary: BusinessSummary,
): BusinessSummary[] {
  return summaries.some((entry) => entry.businessId === summary.businessId) ? summaries : [...summaries, summary];
}

export function isValidateJoinCodeResponse(value: unknown): value is ValidateJoinCodeResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const response = value as Record<string, unknown>;
  return typeof response.business_id === 'string' && typeof response.business_name === 'string';
}

function readClonedText(context: Record<string, unknown>): Promise<string> | null {
  const clone = context.clone;
  if (typeof clone !== 'function') {
    return null;
  }

  const cloned = clone.call(context) as { text?: unknown };
  return typeof cloned.text === 'function' ? cloned.text.call(cloned) : null;
}

export async function isSupabaseFunctionNotFoundError(error: unknown): Promise<boolean> {
  if (!error || typeof error !== 'object' || !('context' in error)) {
    return false;
  }

  const context = (error as { context?: unknown }).context;
  if (!context || typeof context !== 'object') {
    return false;
  }

  const response = context as Record<string, unknown>;
  if (response.status !== 404) {
    return false;
  }

  const bodyText = readClonedText(response);
  const text = bodyText ? await bodyText.catch(() => '') : '';
  try {
    const parsed = JSON.parse(text) as { code?: unknown };
    return parsed.code === 'NOT_FOUND';
  } catch {
    return false;
  }
}
