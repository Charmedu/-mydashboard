import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // Exclude public API routes from auth middleware:
  // - api/auth     → NextAuth sign-in/callback
  // - api/telegram → webhook (Telegram POSTs), cron, setup
  // - api/gmail    → test/diagnostic endpoint
  matcher: ['/((?!api/auth|api/telegram|api/gmail|_next/static|_next/image|favicon.ico).*)'],
};
