import { type NextRequest } from 'next/server';

import { comprehensionContextHeaders, forwardComprehensionRequest } from '../../../serviceClient';

export const runtime = 'nodejs';

export async function POST(request: NextRequest, { params }: { params: { resultId: string } }) {
  const body = await request.text();

  return forwardComprehensionRequest(`/comprehension/questions/${encodeURIComponent(params.resultId)}/answers`, {
    method: 'POST',
    body,
    headers: comprehensionContextHeaders(request),
  });
}
