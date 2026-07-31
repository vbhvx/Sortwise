import { NextRequest, NextResponse } from 'next/server';
import { getSession, signToken, authenticateUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  let session = await getSession();

  // If no session exists yet, default to Reviewer for convenient initial demo
  if (!session) {
    session = await authenticateUser('reviewer@apexquality.com');
  }

  // Also return available test personas so reviewer can switch roles easily
  const users = await prisma.user.findMany({
    include: {
      memberships: {
        include: {
          organization: true,
        },
      },
    },
  });

  const personas = users.map((u) => ({
    userId: u.id,
    email: u.email,
    fullName: u.fullName,
    title: u.title,
    department: u.department,
    role: u.memberships[0]?.role,
  }));

  const response = NextResponse.json({
    session,
    availablePersonas: personas,
  });

  if (session && !request.cookies.get('sortwise_auth_token')) {
    response.cookies.set('sortwise_auth_token', signToken(session), {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
  }

  return response;
}

