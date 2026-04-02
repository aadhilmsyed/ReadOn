import { handleVisualizationRequest } from '../controllers/visualizationController';

export async function visualizationRoutes() {
  return handleVisualizationRequest();
}
