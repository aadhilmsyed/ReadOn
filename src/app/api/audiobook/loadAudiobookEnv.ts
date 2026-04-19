import { config } from 'dotenv';
import path from 'node:path';

if (process.env.READON_SKIP_SERVICE_DOTENV !== '1') {
  config({ path: path.join(process.cwd(), 'microservices', 'audiobook-service', '.env'), override: false });
}

export const audiobookServiceEnvLoaded = true;
