'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function BankrollBadge() {
  const [balance, setBalance] = useState<number | null>(null);

  const fetchBalance = async () => {
    const { data } = await supabase
      .from('bankroll_transactions')
      .select('balance_after')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setBalance(parseFloat(data.balance_after));
    } else {
      setBalance(0);
    }
  };

  useEffect(() => {
    fetchBalance();

    const handleGlobalUpdate = () => {
      fetchBalance();
    };

    window.addEventListener('balanceUpdated', handleGlobalUpdate);

    const channel = supabase.channel('bankroll_badge_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bankroll_transactions' }, () => {
        fetchBalance();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proposals' }, () => {
        fetchBalance();
      })
      .subscribe();

    return () => {
      window.removeEventListener('balanceUpdated', handleGlobalUpdate);
      supabase.removeChannel(channel);
    };
  }, []);

  if (balance === null) {
    return (
      <div className="bg-neutral-800 px-3 py-1 rounded-full text-sm font-semibold animate-pulse text-neutral-800">
        R$ 0.00
      </div>
    );
  }

  return (
    <div className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${balance >= 0 ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
      R$ {balance.toFixed(2)}
    </div>
  );
}
