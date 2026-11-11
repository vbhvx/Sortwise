import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';

const DEV_FALLBACK_SECRET = 'sortwise-fallback-secret-2026';

// The fallback only applies outside production (local dev and tests).
function getSigningSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production');
    }
    return DEV_FALLBACK_SECRET;
  }
  return secret;
}
const COOKIE_NAME = 'sortwise_auth_token';

export interface AuthSession {
  userId: string;
  email: string;
  fullName: string;
  organizationId: string;
  organizationName: string;
  role: Role;
}

export function signToken(payload: AuthSession): string {
  return jwt.sign(payload, getSigningSecret(), { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthSession | null {
  try {
    return jwt.verify(token, getSigningSecret()) as AuthSession;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<AuthSession | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function getSessionFromRequest(request: NextRequest): AuthSession | null {
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const session = verifyToken(token);
    if (session) return session;
  }

  const cookieToken = request.cookies.get(COOKIE_NAME)?.value;
  if (cookieToken) {
    return verifyToken(cookieToken);
  }

  return null;
}

export async function authenticateUser(email: string): Promise<AuthSession | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: {
        include: {
          organization: true,
        },
      },
    },
  });

  if (!user || !user.isActive || user.memberships.length === 0) {
    return null;
  }

  const primaryMembership = user.memberships[0];

  return {
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    organizationId: primaryMembership.organizationId,
    organizationName: primaryMembership.organization.name,
    role: primaryMembership.role,
  };
}

