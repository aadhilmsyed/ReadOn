import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  const serviceName = process.env.SERVICE_NAME || 'readon-main';
  const serviceVersion = process.env.SERVICE_VERSION || 'unknown';

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      level: 'INFO',
      message: 'service_meta',
      service: serviceName,
      version: serviceVersion,
      now: new Date().toISOString(),
      path: '/meta',
    }),
  );

  return NextResponse.json({
    service: serviceName,
    version: serviceVersion,
    environment: process.env.NODE_ENV || 'unknown',
    now: new Date().toISOString(),
  });
}

