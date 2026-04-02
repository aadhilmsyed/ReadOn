const http = require('http');
const { createLogger } = require('./logger');

function sendJson(res, statusCode, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
}

function parseBooleanEnv(name, defaultValue) {
  const raw = process.env[name];
  if (raw === undefined) return defaultValue;
  return raw.toLowerCase() === 'true';
}

function cloudSqlMountPath(connectionName) {
  return `/cloudsql/${connectionName}`;
}

function notImplementedResponse(serviceName, path) {
  return {
    status: 'not-implemented',
    service: serviceName,
    path,
    message: 'This endpoint is intentionally not implemented in the architecture skeleton.',
  };
}

function createReadOnHttpServer({ serviceName }) {
  const serviceVersion = process.env.SERVICE_VERSION || 'unknown';
  const logger = createLogger({ serviceName, serviceVersion });

  const requireDbMount = parseBooleanEnv('READON_READY_REQUIRE_CLOUDSQL_MOUNT', false);
  const cloudSqlConnectionName = process.env.CLOUDSQL_CONNECTION_NAME || '';

  return http.createServer((req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const path = url.pathname || '/';

    logger.info('request', { method: req.method, path });

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return sendJson(res, 405, { error: 'method_not_allowed' });
    }

    if (path === '/health') {
      return sendJson(res, 200, { status: 'ok', service: serviceName, version: serviceVersion, now: new Date().toISOString() });
    }

    if (path === '/live') {
      return sendJson(res, 200, { status: 'ok', path: '/live', service: serviceName, version: serviceVersion, now: new Date().toISOString() });
    }

    if (path === '/meta') {
      return sendJson(res, 200, {
        service: serviceName,
        version: serviceVersion,
        environment: process.env.NODE_ENV || 'unknown',
        now: new Date().toISOString(),
      });
    }

    if (path === '/ready') {
      if (requireDbMount && cloudSqlConnectionName) {
        try {
          // eslint-disable-next-line no-var-requires
          const fs = require('fs');
          const mountPath = cloudSqlMountPath(cloudSqlConnectionName);
          const exists = fs.existsSync(mountPath);
          if (!exists) {
            return sendJson(res, 503, {
              status: 'not-ready',
              service: serviceName,
              version: serviceVersion,
              missing: 'cloudsql_mount',
              mountPath,
            });
          }
        } catch (err) {
          logger.error('readiness_mount_check_failed', err);
          return sendJson(res, 503, {
            status: 'not-ready',
            service: serviceName,
            version: serviceVersion,
            missing: 'cloudsql_mount',
          });
        }
      }

      return sendJson(res, 200, {
        status: 'ready',
        service: serviceName,
        version: serviceVersion,
        dbMountCheck: requireDbMount ? 'enabled' : 'disabled',
        dbMountConnectionNameConfigured: Boolean(cloudSqlConnectionName),
        now: new Date().toISOString(),
      });
    }

    // For now, the skeleton exposes only operational endpoints.
    return sendJson(res, 501, notImplementedResponse(serviceName, path));
  });
}

function startReadOnService({ serviceName }) {
  const port = Number(process.env.PORT || 8080);
  const host = process.env.HOST || '0.0.0.0';

  const server = createReadOnHttpServer({ serviceName });
  server.listen(port, host, () => {
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        level: 'INFO',
        message: 'service_listening',
        service: serviceName,
        version: process.env.SERVICE_VERSION || 'unknown',
        host,
        port,
        now: new Date().toISOString(),
      }),
    );
  });

  return server;
}

module.exports = { startReadOnService };

