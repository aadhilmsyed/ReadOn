import { handleComprehensionRequest } from '../controllers/comprehensionController';

export async function comprehensionRoutes() {
  return handleComprehensionRequest();
}
