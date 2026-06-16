type ObservabilityContext = Record<string, unknown>;

interface ObservabilitySink {
  captureException: (error: Error, context: ObservabilityContext) => void;
}

let sink: ObservabilitySink | null = null;
let initialized = false;

const SECRET_KEYS = ['accessToken', 'refreshToken', 'token', 'password', 'authorization'];

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      SECRET_KEYS.some((secretKey) => key.toLowerCase().includes(secretKey.toLowerCase()))
        ? '[REDACTED]'
        : sanitizeValue(entry),
    ]),
  );
}

export function configureObservability(nextSink: ObservabilitySink | null): void {
  sink = nextSink;
}

export function initializeObservability(metadata?: ObservabilityContext): void {
  if (initialized) {
    return;
  }

  initialized = true;
  const releaseContext = sanitizeObservabilityContext(metadata ?? {});

  configureObservability({
    captureException(error, context) {
      console.error('[observability] captured exception', error.message, {
        ...releaseContext,
        ...context,
      });
    },
  });
}

export function sanitizeObservabilityContext(context: ObservabilityContext): ObservabilityContext {
  return sanitizeValue(context) as ObservabilityContext;
}

export function captureException(error: unknown, context: ObservabilityContext = {}): void {
  const normalizedError = error instanceof Error ? error : new Error(String(error));
  const sanitizedContext = sanitizeObservabilityContext(context);

  if (sink) {
    sink.captureException(normalizedError, sanitizedContext);
    return;
  }

  console.error('[observability] uncaptured exception', normalizedError.message, sanitizedContext);
}
