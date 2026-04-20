import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const AUTH_COOKIE = process.env.READON_AUTH_COOKIE_NAME?.trim() || 'readon_session';

function secretKey(): Uint8Array | null {
  const raw = process.env.READON_AUTH_SECRET?.trim();
  if (!raw || raw === 'REPLACE_ME') return null;
  return new TextEncoder().encode(raw);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const secret = secretKey();

  if (pathname.startsWith('/auth')) {
    if (!secret) return NextResponse.next();
    const token = request.cookies.get(AUTH_COOKIE)?.value;
    if (token) {
      try {
        await jwtVerify(token, secret, { algorithms: ['HS256'] });
        return NextResponse.redirect(new URL('/', request.url));
      } catch {
        /* invalid session — allow auth page */
      }
    }
    return NextResponse.next();
  }

  const pageProtected =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/phonics') ||
    pathname.startsWith('/comprehension') ||
    pathname.startsWith('/visualization') ||
    pathname.startsWith('/audiobook') ||
    pathname.startsWith('/story/');

  const apiProtected =
    pathname.startsWith('/api/dashboard') ||
    pathname.startsWith('/api/phonics') ||
    pathname.startsWith('/api/comprehension') ||
    pathname.startsWith('/api/features/') ||
    pathname.startsWith('/api/audiobook') ||
    pathname.startsWith('/api/images');

  if (!pageProtected && !apiProtected) {
    return NextResponse.next();
  }

  if (!secret) {
    if (apiProtected) {
      return NextResponse.json({ error: 'server_misconfigured', message: 'READON_AUTH_SECRET is not set.' }, { status: 503 });
    }
    if (pageProtected) {
      const url = request.nextUrl.clone();
      url.pathname = '/auth';
      url.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) {
    if (apiProtected) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = '/auth';
    url.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  try {
    await jwtVerify(token, secret, { algorithms: ['HS256'] });
    return NextResponse.next();
  } catch {
    if (apiProtected) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = '/auth';
    url.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/phonics/:path*',
    '/comprehension/:path*',
    '/visualization/:path*',
    '/audiobook/:path*',
    '/story/:path*',
    '/auth',
    '/api/dashboard/:path*',
    '/api/phonics/:path*',
    '/api/comprehension/:path*',
    '/api/features/:path*',
    '/api/audiobook/:path*',
    '/api/images/:path*',
  ],
};
