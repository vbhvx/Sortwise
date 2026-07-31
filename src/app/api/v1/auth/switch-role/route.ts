import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, signToken } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const session = await authenticateUser(email);
    if (!session) {
      return NextResponse.json({ error: 'User or active membership not found' }, { status: 404 });
    }

    const token = signToken(session);
    const response = NextResponse.json({ success: true, session });
    response.cookies.set('sortwise_auth_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 3600,
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

