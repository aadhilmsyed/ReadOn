import { handlePhonicsRequest } from '../controllers/phonicsController';

export async function phonicsRoutes() {
  return handlePhonicsRequest();
}
