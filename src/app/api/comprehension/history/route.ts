import { type NextRequest } from 'next/server';

import { comprehensionContextHeaders, forwardComprehensionRequest } from '../serviceClient';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const query = url.searchParams.toString();

  return forwardComprehensionRequest(`/comprehension/history${query ? `?${query}` : ''}`, {
    method: 'GET',
    headers: comprehensionContextHeaders(request),
  });
}
