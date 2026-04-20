const fs = require('fs');
const pathModule = require('path');

const controller = require('../controllers/comprehensionController');

async function readJsonBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const rawBody = Buffer.concat(chunks).toString('utf8');
  if (!rawBody) {
    return {};
  }

  return JSON.parse(rawBody);
}

function methodNotAllowed(sendJson, res) {
  return sendJson(res, 405, {
    error: {
      code: 'method_not_allowed',
      message: 'Method not allowed.',
      requestId: `req_${Date.now().toString(36)}`,
      retryable: false,
      details: [],
    },
  });
}

function badJson(sendJson, res) {
  return sendJson(res, 400, {
    error: {
      code: 'validation_error',
      message: 'Request body must be valid JSON.',
      requestId: `req_${Date.now().toString(36)}`,
      retryable: false,
      details: [{ field: 'body', issue: 'invalid_json' }],
    },
  });
}

/** Maps DB / repository errors to developer-actionable JSON (avoids vague generic message when we know the cause). */
function sendPersistenceAwareError(sendJson, res, err) {
  const requestId = `req_${Date.now().toString(36)}`;
  const code = err && err.code;
  const msg = err && err.message ? String(err.message) : 'unknown_error';

  if (code === 'DATABASE_CONFIG_MISSING') {
    return sendJson(res, 503, {
      error: {
        code,
        message: msg,
        requestId,
        retryable: false,
        details: [
          {
            field: 'env',
            issue:
              'Set DATABASE_URL in microservices/comprehension-service/.env for local TCP, or use READON_DATABASE_NAME + Cloud SQL socket on Cloud Run.',
          },
        ],
      },
    });
  }

  if (
    code === 'ECONNREFUSED'
    || code === 'ENOENT'
    || (msg.includes('connect ENOENT') && msg.includes('cloudsql'))
    || (msg.includes('/cloudsql/') && msg.includes('ENOENT'))
  ) {
    return sendJson(res, 503, {
      error: {
        code: 'database_connection_failed',
        message: msg,
        requestId,
        retryable: true,
        details: [
          {
            field: 'hint',
            issue:
              'Local: use DATABASE_URL with TCP (or Cloud SQL Auth Proxy). If DATABASE_URL is set, it is preferred over socket host.',
          },
        ],
      },
    });
  }

  if (code === '28P01' || msg.toLowerCase().includes('password authentication')) {
    return sendJson(res, 503, {
      error: {
        code: 'database_auth_failed',
        message: msg,
        requestId,
        retryable: false,
        details: [],
      },
    });
  }

  return sendJson(res, 500, {
    error: {
      code: 'persistence_error',
      message: msg,
      requestId,
      retryable: true,
      details: [{ field: 'cause', issue: msg.slice(0, 400) }],
    },
  });
}

function sendText(res, statusCode, contentType, body) {
  res.writeHead(statusCode, {
    'content-type': contentType,
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
}

function swaggerUiHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>ReadOn Comprehension Service Swagger</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      body { margin: 0; background: #ffffff; }
      .topbar { display: none; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.onload = function () {
        window.ui = SwaggerUIBundle({
          url: '/swagger/comprehensionservice.yaml',
          dom_id: '#swagger-ui',
          deepLinking: true,
          presets: [SwaggerUIBundle.presets.apis],
          layout: 'BaseLayout'
        });
      };
    </script>
  </body>
</html>`;
}

function headerValue(req, name) {
  const value = req.headers[name.toLowerCase()];

  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

function getRequestContext(req, url) {
  return {
    userId: headerValue(req, 'x-readon-user-id') || url.searchParams.get('userId') || null,
    storyId: headerValue(req, 'x-readon-story-id') || null,
    title: headerValue(req, 'x-readon-story-title') || null,
  };
}

async function handleComprehensionRoutes({ req, res, url, path, sendJson, logger }) {
  if (path === '/swagger') {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      methodNotAllowed(sendJson, res);
      return true;
    }

    sendText(res, 200, 'text/html; charset=utf-8', swaggerUiHtml());
    return true;
  }

  if (path === '/swagger/comprehensionservice.yaml') {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      methodNotAllowed(sendJson, res);
      return true;
    }

    const swaggerPath = pathModule.join(__dirname, '..', 'swagger', 'comprehensionservice.yaml');
    const body = fs.readFileSync(swaggerPath, 'utf8');
    sendText(res, 200, 'application/yaml; charset=utf-8', body);
    return true;
  }

  if (path === '/comprehension/questions') {
    if (req.method !== 'POST') {
      methodNotAllowed(sendJson, res);
      return true;
    }

    try {
      const result = await controller.generateQuestions(await readJsonBody(req), getRequestContext(req, url));
      sendJson(res, result.statusCode, result.body);
    } catch (err) {
      if (err instanceof SyntaxError) {
        badJson(sendJson, res);
      } else {
        logger.error('comprehension_generate_failed', err);
        sendPersistenceAwareError(sendJson, res, err);
      }
    }

    return true;
  }

  if (path === '/comprehension/history') {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      methodNotAllowed(sendJson, res);
      return true;
    }

    try {
      const result = await controller.getHistory(getRequestContext(req, url));
      sendJson(res, result.statusCode, result.body);
    } catch (err) {
      logger.error('comprehension_history_failed', err);
      sendPersistenceAwareError(sendJson, res, err);
    }
    return true;
  }

  const resultMatch = path.match(/^\/comprehension\/questions\/([^/]+)$/);
  if (resultMatch) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      methodNotAllowed(sendJson, res);
      return true;
    }

    try {
      const result = await controller.getResult(resultMatch[1]);
      sendJson(res, result.statusCode, result.body);
    } catch (err) {
      logger.error('comprehension_get_failed', err);
      sendPersistenceAwareError(sendJson, res, err);
    }
    return true;
  }

  const answersMatch = path.match(/^\/comprehension\/questions\/([^/]+)\/answers$/);
  if (answersMatch) {
    if (req.method !== 'POST') {
      methodNotAllowed(sendJson, res);
      return true;
    }

    try {
      const result = await controller.submitAnswers(
        answersMatch[1],
        await readJsonBody(req),
        getRequestContext(req, url),
      );
      sendJson(res, result.statusCode, result.body);
    } catch (err) {
      if (err instanceof SyntaxError) {
        badJson(sendJson, res);
      } else {
        logger.error('comprehension_answers_failed', err);
        sendPersistenceAwareError(sendJson, res, err);
      }
    }

    return true;
  }

  return false;
}

module.exports = { handleComprehensionRoutes };
