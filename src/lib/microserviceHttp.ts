import { serviceDownMessage, LOCAL_SERVICE_URLS, START_COMMANDS } from '@shared/http/serviceUnavailable';

function normalizeBase(raw: string | undefined, fallback: string): string {
  const u = raw?.trim();
  if (!u || u === 'REPLACE_ME' || u === 'NULL') {
    return fallback.replace(/\/$/, '');
  }
  return u.replace(/\/$/, '');
}

export function phonicsServiceBaseUrl(): string {
  return normalizeBase(process.env.READON_PHONICS_SERVICE_URL, LOCAL_SERVICE_URLS.phonics);
}

export function phonicsDownError(cause: string) {
  const base = phonicsServiceBaseUrl();
  return serviceDownMessage('Phonics service', base, START_COMMANDS.phonics, cause);
}
