/**
 * Text-to-speech route handler for Next.js API
 */

import { NextRequest } from 'next/server';
import { handleTextToSpeechRequest } from '../controllers/text-to-speech.controller';

export async function POST(request: NextRequest) {
  return handleTextToSpeechRequest(request);
}

