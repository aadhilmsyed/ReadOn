import { buildAudiobookModel } from '../models/audiobookModel';
import { notImplemented } from '@shared/notImplemented';

export async function handleAudiobookRequest() {
  buildAudiobookModel();
  return notImplemented('audiobook-service controller');
}
