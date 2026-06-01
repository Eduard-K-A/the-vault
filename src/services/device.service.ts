import * as SecureStore from 'expo-secure-store';

import { generateUUID } from '@/utils/generateUUID';

const DEVICE_ID_KEY = 'posly_device_id_v1';

let cachedDeviceId: string | null = null;

export async function hydrateDeviceIdentity(): Promise<string> {
  if (cachedDeviceId) {
    return cachedDeviceId;
  }

  const persisted = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (persisted && persisted.trim().length > 0) {
    cachedDeviceId = persisted;
    return cachedDeviceId;
  }

  cachedDeviceId = generateUUID();
  await SecureStore.setItemAsync(DEVICE_ID_KEY, cachedDeviceId);
  return cachedDeviceId;
}

export function getDeviceIdentity(): string {
  if (!cachedDeviceId) {
    cachedDeviceId = generateUUID();
  }

  return cachedDeviceId;
}

