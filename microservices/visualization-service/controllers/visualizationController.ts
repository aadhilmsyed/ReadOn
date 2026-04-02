import { buildVisualizationModel } from '../models/visualizationModel';
import { notImplemented } from '@shared/notImplemented';

export async function handleVisualizationRequest() {
  buildVisualizationModel();
  return notImplemented('visualization-service controller');
}
