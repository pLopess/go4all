'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useUser } from '@/context/UserContext';
import { Trash2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CupomPage() {
  const { currentUser } = useUser();
  const router = useRouter();
  const [picks, setPicks] = useState<any[]>([]);
  const [wagerAmount, setWagerAmount] = useState<string>('20.00');
  const [isProposing, setIsProposing] = useState(false);

  useEffect(() => {
    const fetchPicks = async () => {
      const { data } = await supabase.from('cupom_picks').select('*').order('created_at', { ascending: true });
      if (data) setPicks(data);
    };
    fetchPicks();

    const channel = supabase.channel('cupom_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cupom_picks' }, () => {
        fetchPicks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRemove = async (id: string) => {
    await supabase.from('cupom_picks').delete().eq('id', id);
  };

  const handlePropose = async () => {
    if (picks.length === 0 || !currentUser) return;
    setIsProposing(true);

    const amount = parseFloat(wagerAmount) || 0;
    const combinedOdd = picks.reduce((acc, pick) => acc * parseFloat(pick.odd), 1);
    const potentialReturn = amount * combinedOdd;

    try {
      // 1. Cria a proposta
      const { data: proposal, error: propError } = await supabase.from('proposals').insert({
        proposed_by: currentUser,
        combined_odd: combinedOdd,
        amount: amount,
        potential_return: potentialReturn,
        status: 'voting'
      }).select().single();

      if (propError || !proposal) throw propError;

      // 2. Copia as picks para proposal_picks
      const proposalPicks = picks.map(p => ({
        proposal_id: proposal.id,
        game_id: p.game_id,
        home_team: p.home_team,
        away_team: p.away_team,
        market_type: p.market_type,
        selection: p.selection,
        selection_label: p.selection_label,
        odd: p.odd
      }));
      await supabase.from('proposal_picks').insert(proposalPicks);

      // 3. Limpa o cupom compartilhado
      await supabase.from('cupom_picks').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Deleta todos

      // Redireciona para a aba de Votar
      router.push('/votar');

    } catch (e) {
      console.error(e);
      alert('Erro ao criar proposta.');
    } finally {
      setIsProposing(false);
    }
  };

  const oddCombinada = picks.reduce((acc, pick) => acc * parseFloat(pick.odd), 1);
  const retornoPotencial = (oddCombinada * (parseFloat(wagerAmount) || 0)).toFixed(2);

  return (
    <div className="pb-24">
      <h2 className="text-xl font-bold mb-6">Cupom da Rodada</h2>
      
      {picks.length === 0 ? (
        <div className="text-center text-neutral-500 py-10 bg-neutral-900 rounded-2xl border border-neutral-800">
          Nenhuma seleção ainda.<br/> Vá para Jogos e adicione picks!
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {picks.map(pick => (
            <div key={pick.id} className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl flex justify-between items-center">
              <div>
                <div className="text-xs text-neutral-400 mb-1">{pick.home_team} vs {pick.away_team}</div>
                <div className="font-bold">{pick.selection_label} <span className="text-blue-500 ml-1">@{pick.odd}</span></div>
                <div className="text-[10px] text-neutral-500 mt-1">Adicionado por {pick.added_by}</div>
              </div>
              <button onClick={() => handleRemove(pick.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {picks.length > 0 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
          <div className="flex justify-between items-center mb-4">
            <span className="text-neutral-400">Odd Combinada</span>
            <span className="font-bold text-lg">{oddCombinada.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between items-center mb-4 bg-neutral-800 p-3 rounded-xl border border-neutral-700">
            <span className="text-sm font-medium">Valor da Aposta (R$)</span>
            <input 
              type="number" 
              value={wagerAmount}
              onChange={(e) => setWagerAmount(e.target.value)}
              className="bg-transparent text-right font-bold text-lg text-white outline-none w-24"
              placeholder="0.00"
            />
          </div>

          <div className="flex justify-between items-center mb-6">
            <span className="text-neutral-400">Retorno Potencial</span>
            <span className="font-bold text-blue-500 text-xl">R$ {retornoPotencial}</span>
          </div>

          <button 
            onClick={handlePropose}
            disabled={isProposing}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-colors disabled:opacity-50 flex justify-center"
          >
            {isProposing ? <Loader2 className="animate-spin" size={24} /> : 'Propor para Votação'}
          </button>
        </div>
      )}
    </div>
  );
}
