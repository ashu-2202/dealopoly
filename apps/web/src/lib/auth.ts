import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { getDb, users, accounts, sessions, verificationTokens, eq } from "@dealopoly/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(getDb(), {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: {
    strategy: "jwt",
  },
  // Avoid UntrustedHost error in local development and production proxies
  trustHost: true,
  // Ensure secret is present even if not set in .env during dev
  secret:
    process.env["AUTH_SECRET"] ??
    process.env["NEXTAUTH_SECRET"] ??
    "dealopoly-secret-key-for-jwt-session-encryption-2026",
  providers: [
    GitHub({
      clientId: process.env["AUTH_GITHUB_ID"] ?? process.env["GITHUB_ID"] ?? "",
      clientSecret: process.env["AUTH_GITHUB_SECRET"] ?? process.env["GITHUB_SECRET"] ?? "",
      allowDangerousEmailAccountLinking: true,
    }),
    Google({
      clientId: process.env["AUTH_GOOGLE_ID"] ?? process.env["GOOGLE_CLIENT_ID"] ?? "",
      clientSecret: process.env["AUTH_GOOGLE_SECRET"] ?? process.env["GOOGLE_CLIENT_SECRET"] ?? "",
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      id: "credentials",
      name: "Player Account",
      credentials: {
        username: { label: "Username / Display Name", type: "text" },
        email: { label: "Email", type: "email" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.username) {
          return null;
        }

        const email = String(credentials.email).toLowerCase().trim();
        const username = String(credentials.username).trim();
        const database = getDb();

        try {
          // Find existing user by email
          const existingUsers = await database
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

          if (existingUsers && existingUsers[0]) {
            const u = existingUsers[0];
            return {
              id: String(u.id),
              name: u.name,
              email: u.email,
              image: u.image,
            };
          }

          // Create new user in Neon Postgres
          const inserted = await database
            .insert(users)
            .values({
              name: username,
              email,
              customTag: `${username}#${Math.floor(1000 + Math.random() * 9000)}`,
              gamesPlayed: 0,
              gamesWon: 0,
            })
            .returning();

          const newUser = inserted[0];
          if (!newUser) return null;

          return {
            id: String(newUser.id),
            name: newUser.name,
            email: newUser.email,
            image: newUser.image,
          };
        } catch (err: unknown) {
          console.error("[Auth Error]", err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = String(token.id);
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
