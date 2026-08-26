import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'commander@trenchline.org' },
        password: { label: 'Password', type: 'password' },
        name: { label: 'Player / Commander Name', type: 'text', placeholder: 'Commander Valerius' }
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          return null;
        }

        const email = credentials.email.toLowerCase().trim();

        // Find or auto-create demo user for frictionless gameplay
        let user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          const hashedPassword = credentials.password
            ? await bcrypt.hash(credentials.password, 10)
            : null;

          user = await prisma.user.create({
            data: {
              email,
              name: credentials.name || email.split('@')[0],
              password: hashedPassword,
            },
          });
        } else if (credentials.password && user.password) {
          const isValid = await bcrypt.compare(credentials.password, user.password);
          if (!isValid) {
            throw new Error('Invalid credentials');
          }
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'trenchline_grimdark_secret_salt_2026',
};
