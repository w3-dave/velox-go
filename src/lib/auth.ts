import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "./prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user && user.id) {
        token.id = user.id;

        // Create a session record for session management
        const sessionToken = crypto.randomUUID();
        const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await prisma.session.create({
          data: {
            sessionToken,
            userId: user.id,
            expires,
          },
        });

        token.sessionToken = sessionToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        // @ts-expect-error - adding sessionToken to session
        session.sessionToken = token.sessionToken;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Create a personal organization for new users
      if (user.id && user.email) {
        const slug = user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
        await prisma.organization.create({
          data: {
            name: user.name || "Personal",
            slug: `${slug}-${Date.now()}`,
            type: "INDIVIDUAL",
            members: {
              create: {
                userId: user.id,
                role: "OWNER",
              },
            },
          },
        });
      }
    },
  },
});
