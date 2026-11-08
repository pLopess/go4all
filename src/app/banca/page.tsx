'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { BrainCircuit, TrendingUp, TrendingDown, Target, Loader2, Check, X } from 'lucide-react';

export default function BancaPage() {
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [activeBets, setActiveBets] = useState<any[]>([]);
  
  const [winRate, setWinRate] = useState(0);
  const [roi, setRoi] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [resolvingIds, setResolvingIds] = useState<string[]>([]);

  const fetchData = async () => {
    // 1. Fetch transactions
    const { data: txs } = await supabase
      .from('bankroll_transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (txs) {
      setTransactions(txs);
      setBalance(txs.length > 0 ? parseFloat(txs[0].balance_after) : 138.25);
      
      const totalBets = txs.filter(t => t.type === 'bet').reduce((acc, t) => acc + Math.abs(parseFloat(t.amount)), 0);
      const totalWins = txs.filter(t => t.type === 'win').reduce((acc, t) => acc + parseFloat(t.amount), 0);
      
      const profit = totalWins - totalBets;
      setTotalProfit(profit);
      
      if (totalBets > 0) {
        setRoi((profit / totalBets) * 100);
      }
      
      // Calculate win rate from proposals
      const { data: proposals } = await supabase
        .from('proposals')
        .select('status');
        
      if (proposals) {
        const won = proposals.filter(p => p.status === 'won').length;
        const lost = proposals.filter(p => p.status === 'lost').length;
        const totalResolved = won + lost;
        setWinRate(totalResolved > 0 ? (won / totalResolved) * 100 : 0);
      }
    }

    // 2. Fetch active bets
    const { data: active } = await supabase
      .from('proposals')
      .select('*, proposal_picks(*)')
      .eq('status', 'placed')
      .order('created_at', { ascending: false });

    if (active) setActiveBets(active);
  };

  useEffect(() => {
    fetchData();

    const channel = supabase.channel('banca_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bankroll_transactions' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proposals' }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleResolveBet = async (proposalId: string, result: 'won' | 'lost', potentialReturn: any) => {
    if (resolvingIds.includes(proposalId)) return;
    setResolvingIds(prev => [...prev, proposalId]);

    try {
      const retAmount = parseFloat(potentialReturn) || 0;
      
      // Atualizar status da proposta
      const { error: updateError } = await supabase.from('proposals').update({ status: result }).eq('id', proposalId);
      if (updateError) {
        alert("Erro ao atualizar proposta: " + updateError.message);
        return;
      }

      // Atualização otimista local para esconder o card imediatamente
      setActiveBets(prev => prev.filter(b => b.id !== proposalId));

      if (result === 'won') {
        const { data: lastTx } = await supabase.from('bankroll_transactions').select('balance_after').order('created_at', { ascending: false }).limit(1).single();
        const currentBalance = lastTx ? parseFloat(lastTx.balance_after) : balance;
        const newBalance = currentBalance + retAmount;

        const { error: insertError } = await supabase.from('bankroll_transactions').insert({
          proposal_id: proposalId,
          type: 'win',
          amount: retAmount,
          balance_after: newBalance,
          description: `Aposta ganha: retorno de R$ ${retAmount.toFixed(2)}`
        });
        if (insertError) alert("Erro ao atualizar banca: " + insertError.message);
      } else {
        const { data: lastTx } = await supabase.from('bankroll_transactions').select('balance_after').order('created_at', { ascending: false }).limit(1).single();
        const currentBalance = lastTx ? parseFloat(lastTx.balance_after) : balance;

        const { error: insertError } = await supabase.from('bankroll_transactions').insert({
          proposal_id: proposalId,
          type: 'loss',
          amount: 0,
          balance_after: currentBalance,
          description: `Aposta perdida`
        });
        if (insertError) alert("Erro ao atualizar banca: " + insertError.message);
      }

      window.dispatchEvent(new Event('balanceUpdated'));
      fetchData(); // Forçar sincronização
    } catch (e: any) {
      alert("Erro ao resolver aposta: " + e.message);
    } finally {
      setResolvingIds(prev => prev.filter(id => id !== proposalId));
    }
  };

  const generateAiAnalysis = async () => {
    setIsGeneratingAi(true);
    try {
      const res = await fetch('/api/ai/bankroll-consultant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ balance, transactions, activeBets })
      });
      const data = await res.json();
      setAiAnalysis(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  return (
    <div className="pb-24 space-y-6">
      <h2 className="text-xl font-bold">Gestão de Banca</h2>

      {/* Métricas Globais */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl">
          <div className="text-xs text-neutral-400 mb-1 flex items-center gap-1"><TrendingUp size={14}/> Lucro Total</div>
          <div className={`text-lg font-bold ${totalProfit >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
            R$ {totalProfit.toFixed(2)}
          </div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl">
          <div className="text-xs text-neutral-400 mb-1 flex items-center gap-1"><Target size={14}/> Win Rate</div>
          <div className="text-lg font-bold text-blue-400">{winRate.toFixed(1)}%</div>
        </div>
      </div>

      {/* Consultor de IA */}
      <div className="bg-neutral-900 border border-blue-500/30 rounded-2xl p-4 overflow-hidden relative">
        <div className="absolute inset-0 bg-blue-500/5 mix-blend-overlay"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-3">
            <h3 className="font-bold flex items-center gap-2">
              <BrainCircuit className="text-blue-500" /> Consultor IA
            </h3>
            {aiAnalysis && (
              <span className="text-[10px] uppercase font-bold bg-blue-600/20 text-blue-400 px-2 py-1 rounded-lg">
                {aiAnalysis.risk_level}
              </span>
            )}
          </div>

          {!aiAnalysis ? (
            <button 
              onClick={generateAiAnalysis}
              disabled={isGeneratingAi}
              className="w-full bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 font-semibold py-3 rounded-xl transition-all flex justify-center items-center gap-2 text-sm"
            >
              {isGeneratingAi ? <Loader2 className="animate-spin" size={18} /> : 'Analisar Desempenho'}
            </button>
          ) : (
            <div className="space-y-3 text-sm">
              <p className="text-neutral-300 leading-relaxed">
                <span className="font-semibold text-blue-400">Estratégia: </span>
                {aiAnalysis.strategy}
              </p>
              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                <p className="italic text-neutral-400">💬 "{aiAnalysis.shoutout}"</p>
              </div>
              <button onClick={generateAiAnalysis} className="text-xs text-blue-500 underline text-center w-full mt-2">Atualizar Análise</button>
            </div>
          )}
        </div>
      </div>

      {/* Apostas Pendentes */}
      {activeBets.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-sm uppercase tracking-wider text-neutral-400">Apostas em Aberto (Para Resolver)</h3>
          {activeBets.map(bet => (
            <div key={bet.id} className="bg-neutral-900 border border-amber-500/30 p-4 rounded-2xl shadow-lg">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-bold text-amber-400">R$ {bet.amount} @{bet.combined_odd}</div>
                  <div className="text-xs text-neutral-400">Retorno: R$ {bet.potential_return}</div>
                </div>
                <div className="text-right text-xs text-neutral-500">
                  Por {bet.proposed_by}
                </div>
              </div>
              <div className="flex gap-2 pt-3 border-t border-neutral-800">
                <button onClick={() => handleResolveBet(bet.id, 'lost', bet.potential_return)} className="flex-1 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-500/20 rounded-xl text-sm font-bold flex justify-center items-center gap-1 transition-colors">
                  <X size={16}/> Perdeu
                </button>
                <button onClick={() => handleResolveBet(bet.id, 'won', bet.potential_return)} className="flex-1 py-2 bg-cyan-600/10 hover:bg-cyan-600/20 text-cyan-400 border border-cyan-500/20 rounded-xl text-sm font-bold flex justify-center items-center gap-1 transition-colors">
                  <Check size={16}/> Ganhou
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Histórico */}
      <div className="space-y-3">
        <h3 className="font-bold text-sm uppercase tracking-wider text-neutral-400">Histórico Recente</h3>
        {transactions.slice(0, 10).map(tx => (
          <div key={tx.id} className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl flex justify-between items-center">
            <div>
              <div className="text-xs text-neutral-400">{new Date(tx.created_at).toLocaleDateString()}</div>
              <div className="text-sm font-medium">{tx.description}</div>
            </div>
            <div className="text-right">
              <div className={`font-bold ${tx.amount > 0 ? 'text-cyan-400' : tx.amount < 0 ? 'text-red-400' : 'text-neutral-500'}`}>
                {tx.amount > 0 ? '+' : ''}{tx.amount}
              </div>
              <div className="text-[10px] text-neutral-500">Saldo: R$ {tx.balance_after}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
