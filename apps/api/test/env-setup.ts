import { config } from 'dotenv';
import { resolve } from 'node:path';

// .env lives at the monorepo root, not apps/api — jest's cwd is apps/api.
config({ path: resolve(__dirname, '../../../.env') });
