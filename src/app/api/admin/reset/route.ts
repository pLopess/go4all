import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; 
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: NextRequest) {
  try {
    const { password, initialBalance } = await req.json();

    const validPassword = process.env.ADMIN_SECRET || 'GO4ALL_ADMIN_2026';

    if (!password || password.trim() !== validPassword.trim()) {
      return NextResponse.json({ error: 'Senha incorreta. Verifique se não copiou espaços em branco junto com a senha.' }, { status: 401 });
    }

    const dummyId = '00000000-0000-0000-0000-000000000000';

    await supabase.from('votes').delete().neq('id', dummyId); 
    await supabase.from('cupom_picks').delete().neq('id', dummyId);
    await supabase.from('bankroll_transactions').delete().neq('id', dummyId);
    await supabase.from('proposals').delete().neq('id', dummyId);
    
    // Inserir saldo inicial escolhido
    const balance = typeof initialBalance === 'number' ? initialBalance : 138.25;

    await supabase.from('bankroll_transactions').insert({
      type: 'deposit',
      amount: balance,
      balance_after: balance,
      description: 'Saldo inicial restaurado via Admin Wipe'
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Admin reset error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
