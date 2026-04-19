const { startReadOnService } = require('../common/httpServer');
const { verifyDatabaseConnection } = require('./db/client');
const { handleComprehensionRoutes } = require('./routes');

startReadOnService({
  serviceName: process.env.SERVICE_NAME || 'comprehension-service',
  routeHandler: handleComprehensionRoutes,
});

verifyDatabaseConnection()
  .then((status) => {
    const level = status.ok ? 'INFO' : 'WARN';
    const message = status.ok ? 'database_connection_ready' : 'database_connection_not_ready';

    // eslint-disable-next-line no-console
    console.log(JSON.stringify({
      level,
      message,
      service: process.env.SERVICE_NAME || 'comprehension-service',
      ...status,
      now: new Date().toISOString(),
    }));
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({
      level: 'WARN',
      message: 'database_connection_check_failed',
      service: process.env.SERVICE_NAME || 'comprehension-service',
      error: {
        code: err.code,
        message: err.message,
      },
      now: new Date().toISOString(),
    }));
  });
