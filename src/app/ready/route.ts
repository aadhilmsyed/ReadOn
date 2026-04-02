import { NextResponse } from 'next/server';
import * as fs from 'fs';

export const runtime = 'nodejs';

function cloudSqlMountPath(connectionName: string) {
  // Cloud Run mounts Cloud SQL sockets under: /cloudsql/<INSTANCE_CONNECTION_NAME>
  return `/cloudsql/${connectionName}`;
}

export async function GET() {
  const serviceName = process.env.SERVICE_NAME || 'readon-main';
  const serviceVersion = process.env.SERVICE_VERSION || 'unknown';
  const connectionName = process.env.CLOUDSQL_CONNECTION_NAME || '';

  // By default, keep readiness stable for the skeleton.
  // If you later decide DB connectivity must be required, set:
  //   READON_READY_REQUIRE_CLOUDSQL_MOUNT=true
  const requireDbMount = (process.env.READON_READY_REQUIRE_CLOUDSQL_MOUNT || 'false').toLowerCase() === 'true';

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      level: 'INFO',
      message: 'health_check',
      service: serviceName,
      version: serviceVersion,
      path: '/ready',
      requireDbMount,
      dbMountConnectionNameConfigured: Boolean(connectionName),
      now: new Date().toISOString(),
    }),
  );

  if (requireDbMount && connectionName) {
    try {
      const mountPath = cloudSqlMountPath(connectionName);
      const exists = fs.existsSync(mountPath);
      if (!exists) {
        return NextResponse.json(
          {
            status: 'not-ready',
            service: serviceName,
            version: serviceVersion,
            missing: 'cloudsql_mount',
            mountPath,
          },
          { status: 503 },
        );
      }
    } catch {
      return NextResponse.json(
        {
          status: 'not-ready',
          service: serviceName,
          version: serviceVersion,
          missing: 'cloudsql_mount',
        },
        { status: 503 },
      );
    }
  }

  return NextResponse.json(
    {
      status: 'ready',
      service: serviceName,
      version: serviceVersion,
      dbMountCheck: requireDbMount ? 'enabled' : 'disabled',
      dbMountConnectionNameConfigured: Boolean(connectionName),
      now: new Date().toISOString(),
    },
    { status: 200 },
  );
}

