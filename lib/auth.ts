import NextAuth, { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth/next";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

const providers = [
  GoogleProvider({
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    authorization: {
      params: {
        scope: "openid email profile https://www.googleapis.com/auth/webmasters.readonly",
        access_type: "offline",
        prompt: "consent",
      },
    },
  }),
];

if (process.env.NODE_ENV !== "production") {
  providers.push(
    CredentialsProvider({
      name: "Dev Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        passcode: { label: "Passcode", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.passcode) {
          return null;
        }
        if (credentials.passcode !== env.QA_PASSCODE) {
          return null;
        }
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        return user;
      },
    }),
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers,
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    async signIn() {
      // Allow sign in
      return true;
    },
    async session({ session, user }) {
      if (!session.user) {
        return session;
      }

      session.user.id = user.id;

      const memberships = await prisma.workspaceMember.findMany({
        where: { userId: user.id },
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      session.memberships = memberships.map((membership) => ({
        workspaceId: membership.workspaceId,
        workspaceName: membership.workspace.name,
        workspaceSlug: membership.workspace.slug,
        role: membership.role,
      }));
      session.activeWorkspaceId = session.memberships[0]?.workspaceId ?? null;
      session.activeRole = session.memberships[0]?.role ?? null;

      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
export const auth = () => getServerSession(authOptions);
export default handler;
