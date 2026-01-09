/**
 * Visualization route handler for Next.js API
 */

import { NextRequest } from 'next/server';
import { handleVisualizationRequest } from '../controllers/visualization.controller';

export async function POST(request: NextRequest) {
  return handleVisualizationRequest(request);
}

