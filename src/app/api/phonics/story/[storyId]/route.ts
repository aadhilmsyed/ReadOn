/**
 * TEMPORARY LOCAL UAT — forwards to phonics microservice controller.
 */
import '../../loadPhonicsEnv';
import { NextResponse } from 'next/server';

import { handleGetStoryPhonics } from '@phonics/routes/handlers';

export async function GET(
  _request: Request,
  context: { params: { storyId: string } },
) {
  const { storyId } = context.params;
  const result = await handleGetStoryPhonics(storyId);
  return NextResponse.json(result.body, { status: result.status });
}
