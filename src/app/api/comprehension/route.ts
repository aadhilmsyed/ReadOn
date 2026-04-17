import { type NextRequest } from 'next/server';

import { comprehensionContextHeaders, forwardComprehensionRequest } from './serviceClient';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.text();

  return forwardComprehensionRequest('/comprehension/questions', {
    method: 'POST',
    body,
    headers: comprehensionContextHeaders(request),
  });
}
