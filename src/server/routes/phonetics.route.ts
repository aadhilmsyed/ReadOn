/**
 * Phonetics route handler for Next.js API
 */

import { NextRequest } from 'next/server';
import { handlePhoneticsRequest } from '../controllers/phonetics.controller';

export async function POST(request: NextRequest) {
  return handlePhoneticsRequest(request);
}

