import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const cookieStore = await request.cookies;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          // Set cookie for the browser
          response.cookies.set({ name, value, ...options });
          // Update response
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
        },
        remove(name, options) {
          // Set cookie for the browser with empty value and max-age=0
          response.cookies.set({ name, value: '', ...options, maxAge: 0 });
          // Update response
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
        },
      },
    }
  );

  // Refresh the auth token
  await supabase.auth.getUser();

  const { data } = await supabase.auth.getSession();

  // If user is not signed in and the current path is not /auth/* or home page
  if (!data.session && 
      !request.nextUrl.pathname.startsWith('/auth') && 
      request.nextUrl.pathname !== '/') {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // If user is signed in and tries to access auth pages
  if (data.session && request.nextUrl.pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}; 