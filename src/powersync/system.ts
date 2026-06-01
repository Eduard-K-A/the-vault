import { PowerSyncDatabase } from '@powersync/react-native';

import { AppSchema } from '@/powersync/schema';

export const powersync = new PowerSyncDatabase({
  schema: AppSchema,
  database: {
    dbFilename: 'powersync.db',
  },
});

