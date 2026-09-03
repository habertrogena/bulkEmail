import { config } from 'dotenv';
import { resolve } from 'node:path';

// Must be imported before anything else in main.ts — module decorators
// (e.g. GlobalJwtModule reading process.env.JWT_SECRET) run at import time,
// so env vars need to be loaded before AppModule's require chain starts.
// .env lives at the monorepo root, not apps/api.
config({ path: resolve(__dirname, '../../../.env') });
