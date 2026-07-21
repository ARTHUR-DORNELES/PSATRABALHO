// =====================================================================
// Auth.js (NextAuth v5) — login Google restrito a @profissionaissa.com.
// Mesmo padrão do psa-bonus-dashboard, simplificado (login por redirect).
// Em dev, deixe AUTH_ENABLED=false para entrar sem configurar OAuth.
// =====================================================================
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const ALLOWED_DOMAIN = "profissionaissa.com";

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      const email = (profile?.email ?? "").toLowerCase();
      return email.endsWith(`@${ALLOWED_DOMAIN}`);
    },
    async session({ session, token }) {
      if (session.user && token.email) session.user.email = token.email;
      return session;
    },
  },
  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "jwt" },
  trustHost: true,
});
