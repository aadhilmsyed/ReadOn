import { config } from 'dotenv';
import path from 'node:path';

if (process.env.READON_SKIP_SERVICE_DOTENV !== '1') {
  const p = path.join(process.cwd(), 'microservices/phonics-service', '.env');
  config({ path: p, override: false });
}

/** No-op export so this module can be imported for side effects only. */
export const phonicsServiceEnvLoaded = true;
