import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { initDb, saveUserToken } from '@/lib/db';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/calendar.readonly',
          ].join(' '),
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        // Persist refresh token so background cron jobs can call Google APIs
        const email = user?.email ?? (token.email as string | undefined);
        if (account.refresh_token && email) {
          try {
            await initDb();
            await saveUserToken(email, account.refresh_token);
          } catch {
            // Non-fatal — briefing will skip calendar if token is unavailable
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      (session as unknown as Record<string, unknown>).accessToken = token.accessToken;
      return session;
    },
  },
});
