import { buildComprehensionModel } from '../models/comprehensionModel';
import { notImplemented } from '@shared/notImplemented';

export async function handleComprehensionRequest() {
  buildComprehensionModel();
  return notImplemented('comprehension-service controller');
}
