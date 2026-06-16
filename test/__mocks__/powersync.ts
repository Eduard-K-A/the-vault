import React from 'react';

type QueryRow = Record<string, unknown>;

interface CrudTransaction {
  crud: Array<{ table: string; op: unknown; id: string; opData?: Record<string, unknown> | null }>;
  complete: jest.Mock<Promise<void>, []>;
}

interface PowerSyncStatus {
  connected: boolean;
  connecting: boolean;
  hasSynced: boolean;
  lastSyncedAt: Date | null;
  dataFlowStatus: {
    downloading: boolean;
    uploading: boolean;
    downloadError: Error | null;
  };
}

const defaultStatus: PowerSyncStatus = {
  connected: true,
  connecting: false,
  hasSynced: true,
  lastSyncedAt: null,
  dataFlowStatus: {
    downloading: false,
    uploading: false,
    downloadError: null,
  },
};

let queryData: QueryRow[] = [];
let optionalRows = new Map<string, unknown>();
let allRows = new Map<string, unknown[]>();
let nextCrudTransaction: CrudTransaction | null = null;
let uploadQueueCount = 0;
let currentStatus: PowerSyncStatus = { ...defaultStatus, dataFlowStatus: { ...defaultStatus.dataFlowStatus } };

export const executeMock = jest.fn<Promise<void>, [string, unknown[] | undefined]>(() => Promise.resolve());
export const getOptionalMock = jest.fn<Promise<unknown>, [string, unknown[] | undefined]>(async (sql, params) => {
  const key = JSON.stringify([sql, params ?? []]);
  return optionalRows.has(key) ? optionalRows.get(key) : null;
});
export const getAllMock = jest.fn<Promise<unknown[]>, [string, unknown[] | undefined]>(async (sql, params) => {
  const key = JSON.stringify([sql, params ?? []]);
  return allRows.get(key) ?? [];
});
export const writeTransactionMock = jest.fn(
  <T>(callback: (tx: { execute: typeof executeMock; getOptional: typeof getOptionalMock }) => Promise<T> | T) => {
    return Promise.resolve(callback({ execute: executeMock, getOptional: getOptionalMock }));
  },
);

export const mockPowerSyncDatabase = {
  init: jest.fn<Promise<void>, []>(() => Promise.resolve()),
  connect: jest.fn<Promise<void>, [unknown]>(() => Promise.resolve()),
  disconnect: jest.fn<Promise<void>, []>(() => Promise.resolve()),
  disconnectAndClear: jest.fn<Promise<void>, [unknown]>(() => Promise.resolve()),
  waitForFirstSync: jest.fn<Promise<void>, []>(() => Promise.resolve()),
  waitForStatus: jest.fn<Promise<void>, [unknown]>(() => Promise.resolve()),
  getUploadQueueStats: jest.fn<Promise<{ count: number }>, []>(async () => ({ count: uploadQueueCount })),
  getNextCrudTransaction: jest.fn<Promise<CrudTransaction | null>, []>(async () => nextCrudTransaction),
  execute: executeMock,
  getOptional: getOptionalMock,
  getAll: getAllMock,
  writeTransaction: writeTransactionMock,
  get connected() {
    return currentStatus.connected;
  },
  get connecting() {
    return currentStatus.connecting;
  },
  get currentStatus() {
    return currentStatus;
  },
};

export class PowerSyncDatabase {
  init = mockPowerSyncDatabase.init;
  connect = mockPowerSyncDatabase.connect;
  disconnect = mockPowerSyncDatabase.disconnect;
  disconnectAndClear = mockPowerSyncDatabase.disconnectAndClear;
  waitForFirstSync = mockPowerSyncDatabase.waitForFirstSync;
  waitForStatus = mockPowerSyncDatabase.waitForStatus;
  getUploadQueueStats = mockPowerSyncDatabase.getUploadQueueStats;
  getNextCrudTransaction = mockPowerSyncDatabase.getNextCrudTransaction;
  execute = mockPowerSyncDatabase.execute;
  getOptional = mockPowerSyncDatabase.getOptional;
  getAll = mockPowerSyncDatabase.getAll;
  writeTransaction = mockPowerSyncDatabase.writeTransaction;
  get connected() {
    return mockPowerSyncDatabase.connected;
  }
  get connecting() {
    return mockPowerSyncDatabase.connecting;
  }
  get currentStatus() {
    return mockPowerSyncDatabase.currentStatus;
  }
}

export class Schema {
  constructor(public tables: Record<string, unknown>) {}
}

export class Table {
  constructor(
    public columns: Record<string, unknown>,
    public options?: Record<string, unknown>,
  ) {}
}

export const column = {
  text: 'text',
  integer: 'integer',
  real: 'real',
};

export const UpdateType = {
  DELETE: 'DELETE',
};

export const PowerSyncContext = React.createContext(mockPowerSyncDatabase);

export function usePowerSync() {
  return mockPowerSyncDatabase;
}

export function useQuery<T>(): { data: T[] } {
  return { data: queryData as T[] };
}

export function setPowerSyncQueryData(rows: QueryRow[]): void {
  queryData = rows;
}

export function setPowerSyncOptionalRow(sql: string, params: unknown[] | undefined, row: unknown): void {
  optionalRows.set(JSON.stringify([sql, params ?? []]), row);
}

export function setPowerSyncAllRows(sql: string, params: unknown[] | undefined, rows: unknown[]): void {
  allRows.set(JSON.stringify([sql, params ?? []]), rows);
}

export function setPowerSyncUploadQueueCount(count: number): void {
  uploadQueueCount = count;
}

export function setPowerSyncStatus(status: Partial<PowerSyncStatus>): void {
  currentStatus = {
    ...currentStatus,
    ...status,
    dataFlowStatus: {
      ...currentStatus.dataFlowStatus,
      ...(status.dataFlowStatus ?? {}),
    },
  };
}

export function setNextCrudTransaction(transaction: CrudTransaction | null): void {
  nextCrudTransaction = transaction;
}

export function createCrudTransaction(crud: CrudTransaction['crud']): CrudTransaction {
  return {
    crud,
    complete: jest.fn<Promise<void>, []>(() => Promise.resolve()),
  };
}

export function resetPowerSyncMocks(): void {
  queryData = [];
  optionalRows = new Map<string, unknown>();
  allRows = new Map<string, unknown[]>();
  nextCrudTransaction = null;
  uploadQueueCount = 0;
  currentStatus = { ...defaultStatus, dataFlowStatus: { ...defaultStatus.dataFlowStatus } };
  executeMock.mockReset().mockResolvedValue(undefined);
  getOptionalMock.mockReset().mockImplementation(async (sql, params) => {
    const key = JSON.stringify([sql, params ?? []]);
    return optionalRows.has(key) ? optionalRows.get(key) : null;
  });
  getAllMock.mockReset().mockImplementation(async (sql, params) => {
    const key = JSON.stringify([sql, params ?? []]);
    return allRows.get(key) ?? [];
  });
  writeTransactionMock.mockReset().mockImplementation(
    <T>(callback: (tx: { execute: typeof executeMock; getOptional: typeof getOptionalMock }) => Promise<T> | T) => {
      return Promise.resolve(callback({ execute: executeMock, getOptional: getOptionalMock }));
    },
  );
  mockPowerSyncDatabase.init.mockReset().mockResolvedValue(undefined);
  mockPowerSyncDatabase.connect.mockReset().mockResolvedValue(undefined);
  mockPowerSyncDatabase.disconnect.mockReset().mockResolvedValue(undefined);
  mockPowerSyncDatabase.disconnectAndClear.mockReset().mockResolvedValue(undefined);
  mockPowerSyncDatabase.waitForFirstSync.mockReset().mockResolvedValue(undefined);
  mockPowerSyncDatabase.waitForStatus.mockReset().mockResolvedValue(undefined);
  mockPowerSyncDatabase.getUploadQueueStats.mockReset().mockImplementation(async () => ({ count: uploadQueueCount }));
  mockPowerSyncDatabase.getNextCrudTransaction.mockReset().mockImplementation(async () => nextCrudTransaction);
}
