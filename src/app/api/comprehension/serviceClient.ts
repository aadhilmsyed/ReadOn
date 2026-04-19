import { NextResponse } from 'next/server';

function createRequestId() {
  return `req_${Date.now().toString(36)}`;
}

function errorBody(code: string, message: string, retryable: boolean, details: Array<{ field: string; issue: string }> = []) {
  return {
    error: {
      code,
      message,
      requestId: createRequestId(),
      retryable,
      details,
    },
  };
}

const DEFAULT_COMPREHENSION_URL = 'http://127.0.0.1:8080';

function comprehensionServiceUrl(path: string) {
  const baseUrl = (process.env.READON_COMPREHENSION_SERVICE_URL || DEFAULT_COMPREHENSION_URL).trim();

  if (!baseUrl || baseUrl === 'REPLACE_ME' || baseUrl === 'NULL') {
    return null;
  }

  return `${baseUrl.replace(/\/$/, '')}${path}`;
}

export async function forwardComprehensionRequest(path: string, init: RequestInit = {}) {
  const url = comprehensionServiceUrl(path);

  if (!url) {
    return NextResponse.json(
      errorBody(
        'service_url_not_configured',
        'READON_COMPREHENSION_SERVICE_URL is not set to a reachable URL (default is http://127.0.0.1:8080).',
        false,
      ),
      { status: 503 },
    );
  }

  try {
    const headers = new Headers(init.headers);
    headers.set('accept', 'application/json');

    if (init.body && !headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }

    const response = await fetch(url, {
      ...init,
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(Number(process.env.READON_COMPREHENSION_FETCH_TIMEOUT_MS ?? 60000)),
    });

    const contentType = response.headers.get('content-type') || '';
    const body = contentType.includes('application/json') ? await response.json() : await response.text();

    return NextResponse.json(body, { status: response.status });
  } catch {
    return NextResponse.json(
      errorBody('microservice_unavailable', 'Comprehension service is unavailable.', true),
      { status: 502 },
    );
  }
}

export function comprehensionContextHeaders(request: Request) {
  const headers = new Headers();

  for (const name of ['x-readon-user-id', 'x-readon-story-id', 'x-readon-story-title']) {
    const value = request.headers.get(name);

    if (value) {
      headers.set(name, value);
    }
  }

  return headers;
}
