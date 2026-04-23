import { existsSync } from 'node:fs';
import path from 'node:path';

import { TextToSpeechClient } from '@google-cloud/text-to-speech';

/** Same cap as Google TTS input limits; keeps client and API aligned. */
export const AUDIOBOOK_TTS_MAX_BYTES = 5000;

export interface AudiobookSpeechResult {
  audioBuffer: Buffer;
  mimeType: string;
}

function validateSourceText(sourceText: string): string {
  const trimmed = sourceText.trim();
  if (!trimmed) {
    throw new Error('Audiobook text is required.');
  }
  const bytes = Buffer.byteLength(trimmed, 'utf8');
  if (bytes > AUDIOBOOK_TTS_MAX_BYTES) {
    throw new Error(
      `Text is too long for narration (max ${AUDIOBOOK_TTS_MAX_BYTES} UTF-8 bytes; got ${bytes}).`,
    );
  }
  return trimmed;
}

/**
 * Returns a key file path when a usable JSON key exists; otherwise null so the
 * client uses Application Default Credentials (Cloud Run attached service account).
 */
function resolveOptionalKeyFilePath(): string | null {
  const explicit = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (explicit) {
    const resolved = path.isAbsolute(explicit) ? explicit : path.join(process.cwd(), explicit);
    if (existsSync(resolved)) {
      return resolved;
    }
    return null;
  }
  const candidates = [
    path.join(process.cwd(), 'credentials', 'google-application-credentials.json'),
    path.join(process.cwd(), 'microservices', 'audiobook-service', 'google-tts-service-account.json'),
    path.join(__dirname, '..', 'google-tts-service-account.json'),
  ];
  for (const c of candidates) {
    if (existsSync(c)) {
      return c;
    }
  }
  return null;
}

/**
 * Runs Google Cloud TTS for read-aloud. Lives in the audiobook microservice only
 * (not the Next.js orchestrator) so this service can run standalone.
 */
export async function synthesizeGoogleTts(sourceText: string): Promise<AudiobookSpeechResult> {
  const text = validateSourceText(sourceText);
  const keyFile = resolveOptionalKeyFilePath();
  const client = keyFile ? new TextToSpeechClient({ keyFilename: keyFile }) : new TextToSpeechClient();
  const languageCode = process.env.GOOGLE_TTS_LANGUAGE_CODE ?? 'en-US';
  const voiceName = process.env.GOOGLE_TTS_VOICE_NAME ?? 'en-US-Neural2-J';

  const [response] = await client.synthesizeSpeech({
    input: { text },
    voice: { languageCode, name: voiceName },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: Number(process.env.GOOGLE_TTS_SPEAKING_RATE ?? '1'),
    },
  });

  const content = response.audioContent;
  if (!content) {
    throw new Error('Google TTS returned no audio content.');
  }

  const audioBuffer = Buffer.isBuffer(content) ? content : Buffer.from(content as Uint8Array);
  return { audioBuffer, mimeType: 'audio/mpeg' };
}
