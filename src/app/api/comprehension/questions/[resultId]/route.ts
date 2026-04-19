import { forwardComprehensionRequest } from '../../serviceClient';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: { resultId: string } }) {
  return forwardComprehensionRequest(`/comprehension/questions/${encodeURIComponent(params.resultId)}`, {
    method: 'GET',
  });
}
