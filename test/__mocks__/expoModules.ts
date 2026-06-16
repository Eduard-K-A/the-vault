const secureStore = new Map<string, string>();

export const documentDirectory = 'file:///mock-document-directory/';

export const getItemAsync = jest.fn(async (key: string): Promise<string | null> => secureStore.get(key) ?? null);
export const setItemAsync = jest.fn(async (key: string, value: string): Promise<void> => {
  secureStore.set(key, value);
});
export const deleteItemAsync = jest.fn(async (key: string): Promise<void> => {
  secureStore.delete(key);
});

export const readAsStringAsync = jest.fn(async (): Promise<string> => '');
export const writeAsStringAsync = jest.fn(async (): Promise<void> => undefined);
export const shareAsync = jest.fn(async (): Promise<void> => undefined);

export function setSecureStoreItem(key: string, value: string): void {
  secureStore.set(key, value);
}

export function getSecureStoreSnapshot(): Record<string, string> {
  return Object.fromEntries(secureStore.entries());
}

export function resetExpoModuleMocks(): void {
  secureStore.clear();
  getItemAsync.mockClear();
  setItemAsync.mockClear();
  deleteItemAsync.mockClear();
  readAsStringAsync.mockClear();
  writeAsStringAsync.mockClear();
  shareAsync.mockClear();
}
