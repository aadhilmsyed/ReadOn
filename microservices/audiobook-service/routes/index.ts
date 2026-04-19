import { handleAudiobookRequest } from '../controllers/audiobookController';

/** Thin route adapter; pass parsed JSON body when wired to an HTTP server. */
export async function audiobookRoutes(body: unknown) {
  return handleAudiobookRequest(body);
}
