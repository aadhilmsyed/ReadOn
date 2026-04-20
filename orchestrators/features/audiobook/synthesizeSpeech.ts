import { serviceDownMessage, LOCAL_SERVICE_URLS, START_COMMANDS } from '@shared/http/serviceUnavailable';

export interface AudiobookSpeechResult {
  audioBuffer: Buffer;
  mimeType: string;
}

function audiobookServiceBaseUrl(): string | null {
  const raw = process.env.READON_AUDIOBOOK_SERVICE_URL?.trim();
  if (!raw || raw === 'REPLACE_ME' || raw === 'NULL') {
    return null;
  }
  return raw.replace(/\/$/, '');
}

/**
 * Calls the audiobook microservice over HTTP (same contract as `POST /api/audiobook/tts`).
 * The main app must not import Google TTS directly so local dev matches Cloud Run boundaries.
 */
export async function synthesizeAudiobookSpeech(sourceText: string): Promise<AudiobookSpeechResult> {
  const base = audiobookServiceBaseUrl();
  const fallback = LOCAL_SERVICE_URLS.audiobook;
  const url = `${(base ?? fallback)}/tts`;

  const timeoutMs = Number(process.env.READON_AUDIOBOOK_FETCH_TIMEOUT_MS ?? 120000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'audio/mpeg, application/json' },
      body: JSON.stringify({ text: sourceText }),
      cache: 'no-store',
      signal: AbortSignal.timeout(Number.isFinite(timeoutMs) ? timeoutMs : 120000),
    });

    const mimeType = res.headers.get('content-type') || 'audio/mpeg';

    if (!res.ok) {
      if (mimeType.includes('application/json')) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error || `Audiobook service returned ${res.status}`);
      }
      const text = await res.text();
      throw new Error(text || `Audiobook service returned ${res.status}`);
    }

    const buf = Buffer.from(await res.arrayBuffer());
    return { audioBuffer: buf, mimeType };
  } catch (e) {
    const cause = e instanceof Error ? e.message : String(e);
    const displayBase = base ?? fallback;
    throw new Error(
      serviceDownMessage(
        'Audiobook (read-aloud) service',
        displayBase,
        START_COMMANDS.audiobook,
        !base ? `${cause} (set READON_AUDIOBOOK_SERVICE_URL=${fallback} in the repo root .env)` : cause,
      ),
    );
  }
}
