function formatError(err) {
  if (!err) return undefined;
  if (typeof err === 'string') return err;
  return {
    name: err.name,
    message: err.message,
    stack: err.stack,
  };
}

function logJson(level, message, extra) {
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(extra || {}),
  };
  // Structured logs for Cloud Logging.
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(payload));
}

function createLogger({ serviceName, serviceVersion }) {
  return {
    info(message, extra) {
      logJson('INFO', message, { serviceName, serviceVersion, ...(extra || {}) });
    },
    warn(message, extra) {
      logJson('WARN', message, { serviceName, serviceVersion, ...(extra || {}) });
    },
    error(message, err, extra) {
      logJson('ERROR', message, { serviceName, serviceVersion, ...(extra || {}), error: formatError(err) });
    },
  };
}

module.exports = { createLogger };

