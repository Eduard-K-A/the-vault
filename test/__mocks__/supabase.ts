interface SupabaseInvokeResult {
  data: unknown;
  error: { message: string; context?: unknown } | null;
}

const functionResults = new Map<string, SupabaseInvokeResult>();

function createTableQuery(table: string) {
  return {
    select: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ data: [], error: null })),
      in: jest.fn(() => Promise.resolve({ data: [], error: null })),
      limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
    })),
    upsert: jest.fn(() => Promise.resolve({ data: null, error: null })),
    insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
    update: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    table,
  };
}

export const mockSupabaseClient = {
  auth: {
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(() => Promise.resolve({ error: null })),
    getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    setSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
  },
  functions: {
    invoke: jest.fn(async (name: string) => {
      return functionResults.get(name) ?? { data: {}, error: null };
    }),
  },
  from: jest.fn((table: string) => createTableQuery(table)),
};

export function createClient(): typeof mockSupabaseClient {
  return mockSupabaseClient;
}

export function setFunctionResult(functionName: string, result: SupabaseInvokeResult): void {
  functionResults.set(functionName, result);
}

export function resetSupabaseMocks(): void {
  functionResults.clear();
  mockSupabaseClient.auth.signInWithPassword.mockReset();
  mockSupabaseClient.auth.signUp.mockReset();
  mockSupabaseClient.auth.signOut.mockReset().mockResolvedValue({ error: null });
  mockSupabaseClient.auth.getSession.mockReset().mockResolvedValue({ data: { session: null }, error: null });
  mockSupabaseClient.auth.setSession.mockReset().mockResolvedValue({ data: { session: null }, error: null });
  mockSupabaseClient.functions.invoke.mockReset().mockImplementation(async (name: string) => {
    return functionResults.get(name) ?? { data: {}, error: null };
  });
  mockSupabaseClient.from.mockReset().mockImplementation((table: string) => createTableQuery(table));
}

export type SupabaseClient = typeof mockSupabaseClient;
