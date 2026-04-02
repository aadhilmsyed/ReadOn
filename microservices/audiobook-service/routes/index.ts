import { handleAudiobookRequest } from '../controllers/audiobookController';

export async function audiobookRoutes() {
  return handleAudiobookRequest();
}
