/**
 * Questions route handler for Next.js API
 */

import { NextRequest } from 'next/server';
import { handleQuestionsRequest } from '../controllers/questions.controller';

export async function POST(request: NextRequest) {
  return handleQuestionsRequest(request);
}

