import { cleanup } from '@testing-library/react-native';

import { resetExpoModuleMocks } from './test/__mocks__/expoModules';
import { resetNavigationMocks } from './test/__mocks__/navigation';
import { resetPowerSyncMocks } from './test/__mocks__/powersync';
import { resetSupabaseMocks } from './test/__mocks__/supabase';
import { resetAllStores } from './test/helpers/resetStores';

jest.mock('@react-navigation/native', () => require('./test/__mocks__/navigation'));

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
  resetPowerSyncMocks();
  resetSupabaseMocks();
  resetExpoModuleMocks();
  resetNavigationMocks();
  resetAllStores();
});
