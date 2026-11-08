import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const validPassword = process.env.ADMIN_SECRET || 'GO4ALL_ADMIN_2026';
  
  if (password?.trim() === validPassword.trim()) {
    return NextResponse.json({ success: true });
  }
  
  return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 });
}
