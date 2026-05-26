import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // Exclude public API routes from auth middleware:
  // - api/auth     → NextAuth sign-in/callback
  // - api/telegram → webhook (Telegram POSTs), send (Vercel cron), setup (one-time config)
  matcher: ['/((?!api/auth|api/telegram|_next/static|_next/image|favicon.ico).*)'],
};
