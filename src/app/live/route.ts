import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  // "Live" is a lightweight liveness signal for Cloud Run.
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      level: 'INFO',
      message: 'health_check',
      service: process.env.SERVICE_NAME || 'readon-main',
      version: process.env.SERVICE_VERSION || 'unknown',
      path: '/live',
      now: new Date().toISOString(),
    }),
  );

  return NextResponse.json(
    {
      status: 'ok',
      path: '/live',
      now: new Date().toISOString(),
    },
    { status: 200 },
  );
}

