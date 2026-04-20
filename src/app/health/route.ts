import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  const serviceName = process.env.SERVICE_NAME || 'readon-main';
  const serviceVersion = process.env.SERVICE_VERSION || 'unknown';

  // Lightweight structured log for Cloud Run visibility.
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      level: 'INFO',
      message: 'health_check',
      service: serviceName,
      version: serviceVersion,
      path: '/health',
      now: new Date().toISOString(),
    }),
  );

  return NextResponse.json(
    {
      status: 'ok',
      service: serviceName,
      version: serviceVersion,
      now: new Date().toISOString(),
    },
    { status: 200 },
  );
}

