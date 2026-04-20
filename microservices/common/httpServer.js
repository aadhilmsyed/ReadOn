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

function createReadOnHttpServer({ serviceName, routeHandler }) {
  const serviceVersion = process.env.SERVICE_VERSION || 'unknown';
  const logger = createLogger({ serviceName, serviceVersion });

  const requireDbMount = parseBooleanEnv('READON_READY_REQUIRE_CLOUDSQL_MOUNT', false);
  const cloudSqlConnectionName = process.env.CLOUDSQL_CONNECTION_NAME || '';

  return http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const path = url.pathname || '/';

    logger.info('request', { method: req.method, path });

    if (path === '/health') {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        return sendJson(res, 405, { error: 'method_not_allowed' });
      }
      return sendJson(res, 200, { status: 'ok', service: serviceName, version: serviceVersion, now: new Date().toISOString() });
    }

    if (path === '/live') {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        return sendJson(res, 405, { error: 'method_not_allowed' });
      }
      return sendJson(res, 200, { status: 'ok', path: '/live', service: serviceName, version: serviceVersion, now: new Date().toISOString() });
    }

    if (path === '/meta') {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        return sendJson(res, 405, { error: 'method_not_allowed' });
      }
      return sendJson(res, 200, {
        service: serviceName,
        version: serviceVersion,
        environment: process.env.NODE_ENV || 'unknown',
        now: new Date().toISOString(),
      });
    }

    if (path === '/ready') {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        return sendJson(res, 405, { error: 'method_not_allowed' });
      }
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

    if (routeHandler) {
      try {
        const handled = await routeHandler({
          req,
          res,
          url,
          path,
          sendJson,
          logger,
          serviceName,
          serviceVersion,
        });

        if (handled) {
          return;
        }
      } catch (err) {
        logger.error('route_handler_failed', err, { path });
        return sendJson(res, 500, { error: 'internal_error' });
      }
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return sendJson(res, 405, { error: 'method_not_allowed' });
    }

    // For now, the skeleton exposes only operational endpoints.
    return sendJson(res, 501, notImplementedResponse(serviceName, path));
  });
}

function startReadOnService({ serviceName, routeHandler }) {
  // Cloud Run sets PORT (typically 8080). Local dev sets per-service PORT in that service’s `.env`.
  const port = Number(process.env.PORT || 8080);
  const host = process.env.HOST || '0.0.0.0';

  const server = createReadOnHttpServer({ serviceName, routeHandler });
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
