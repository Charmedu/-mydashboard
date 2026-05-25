import type { NextAuthConfig } from 'next-auth';

export const authConfig: NextAuthConfig = {
  pages: { signIn: '/' },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isApiAuth = nextUrl.pathname.startsWith('/api/auth');
      if (isApiAuth) return true;
      return isLoggedIn;
    },
  },
};
