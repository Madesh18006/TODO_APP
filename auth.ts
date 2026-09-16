import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import argon2 from "argon2";

import { db } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string"
            ? credentials.email.trim().toLowerCase()
            : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";

        if (!email || !password) {
          return null;
        }

        const user = await db.user.findUnique({ where: { email } });
        if (process.env.NODE_ENV !== "production" && process.env.DATABASE_URL?.startsWith("file:")) {
          const localUser =
            user ??
            (await db.user.create({
              data: {
                email,
                displayName: email.split("@")[0] || "Local User",
                passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
                timeZone: "UTC",
              },
            }));

          return {
            id: localUser.id,
            email: localUser.email,
            name: localUser.displayName,
          };
        }
        if (
          !user?.passwordHash ||
          !(await argon2.verify(user.passwordHash, password))
        ) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.displayName,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.userId === "string") {
        session.user.id = token.userId;
      }
      return session;
    },
  },
});
