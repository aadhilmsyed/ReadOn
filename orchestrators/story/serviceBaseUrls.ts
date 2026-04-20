import { LOCAL_SERVICE_URLS } from '@shared/http/serviceUnavailable';

function trimUrl(raw: string | undefined, fallback: string): string {
  const u = (raw ?? '').trim();
  if (!u || u === 'REPLACE_ME' || u === 'NULL') return fallback.replace(/\/$/, '');
  return u.replace(/\/$/, '');
}

export function phonicsServiceBase(): string {
  return trimUrl(process.env.READON_PHONICS_SERVICE_URL, LOCAL_SERVICE_URLS.phonics);
}

export function comprehensionServiceBase(): string {
  return trimUrl(process.env.READON_COMPREHENSION_SERVICE_URL, LOCAL_SERVICE_URLS.comprehension);
}

export function imageGenerationServiceBase(): string {
  const a = process.env.READON_IMAGE_GENERATION_SERVICE_URL?.trim();
  const b = process.env.READON_VISUALIZATION_SERVICE_URL?.trim();
  const raw = a || b;
  return trimUrl(raw, LOCAL_SERVICE_URLS.imageGeneration);
}

export function audiobookServiceBase(): string {
  return trimUrl(process.env.READON_AUDIOBOOK_SERVICE_URL, LOCAL_SERVICE_URLS.audiobook);
}
