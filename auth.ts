import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { initDb, saveUserToken } from '@/lib/db';

async function refreshGoogleToken(
  refreshToken: string
): Promise<{ accessToken: string; expiresAt: number } | null> {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.AUTH_GOOGLE_ID!,
        client_secret: process.env.AUTH_GOOGLE_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    const data = await res.json() as { access_token?: string; expires_in?: number };
    if (!res.ok || !data.access_token) return null;
    return {
      accessToken: data.access_token,
      expiresAt: Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
    };
  } catch {
    return null;
  }
}

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
      // ── Initial sign-in ──────────────────────────────────────────────────
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at; // seconds since epoch
        token.error = undefined;

        // Persist refresh token so background jobs (Telegram cron) can use it
        const email = user?.email ?? (token.email as string | undefined);
        if (account.refresh_token && email) {
          try {
            await initDb();
            await saveUserToken(email, account.refresh_token);
          } catch {
            // Non-fatal — calendar still works for this session
          }
        }
        return token;
      }

      // ── Subsequent requests: return early if token is still valid ─────────
      const expiresAt = token.expiresAt as number | undefined;
      if (!expiresAt || Date.now() < expiresAt * 1000 - 60_000) {
        return token;
      }

      // ── Access token expired — try to refresh ────────────────────────────
      const storedRefresh = token.refreshToken as string | undefined;
      if (!storedRefresh) {
        return { ...token, error: 'RefreshAccessTokenError' };
      }

      const refreshed = await refreshGoogleToken(storedRefresh);
      if (!refreshed) {
        return { ...token, error: 'RefreshAccessTokenError' };
      }

      return {
        ...token,
        accessToken: refreshed.accessToken,
        expiresAt: refreshed.expiresAt,
        error: undefined,
      };
    },

    async session({ session, token }) {
      const s = session as unknown as Record<string, unknown>;
      s.accessToken = token.accessToken;
      s.error = token.error; // surface RefreshAccessTokenError to the client
      return session;
    },
  },
});
