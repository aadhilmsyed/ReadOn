import { buildPhonicsModel } from '../models/phonicsModel';
import { notImplemented } from '@shared/notImplemented';

export async function handlePhonicsRequest() {
  buildPhonicsModel();
  return notImplemented('phonics-service controller');
}
