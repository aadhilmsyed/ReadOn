const { startReadOnService } = require('../common/httpServer');

startReadOnService({
  serviceName: process.env.SERVICE_NAME || 'phonics-service',
});

