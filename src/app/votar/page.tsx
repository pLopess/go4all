'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useUser } from '@/context/UserContext';
import { Check, X, Clock, ExternalLink, Trash, Plus, Upload, Loader2, Sparkles, Inbox } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { fetchUpcomingGamesAction } from '@/app/actions/getGames';
import { MEMBERS } from '@/lib/constants';

function VotarContent() {
  const { currentUser } = useUser();
  const [proposals, setProposals] = useState<any[]>([]);
  const [votes, setVotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [forceApproveId, setForceApproveId] = useState<string | null>(null);
  const [forceRejectId, setForceRejectId] = useState<string | null>(null);
  const [isConfirmingId, setIsConfirmingId] = useState<string | null>(null);

  // Form states
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newOdd, setNewOdd] = useState('');
  const [newAmount, setNewAmount] = useState('10');
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [availableGames, setAvailableGames] = useState<any[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>('');
  
  const searchParams = useSearchParams();
  const urlGameId = searchParams.get('game_id');
  const urlHome = searchParams.get('home');
  const urlAway = searchParams.get('away');

  useEffect(() => {
    fetchUpcomingGamesAction().then(setAvailableGames);
    
    if (urlGameId) {
      setIsCreating(true);
      setSelectedGameId(urlGameId);
      if (urlHome) setNewTitle(`Aposta em ${urlHome}`);
    }
  }, [urlGameId, urlHome]);

  const fetchProposalsAndVotes = async () => {
    const { data: pData } = await supabase
      .from('proposals')
      .select('*, proposal_picks(*)')
      .in('status', ['voting', 'approved'])
      .order('created_at', { ascending: false });
    
    if (pData) setProposals(pData);

    if (pData && pData.length > 0) {
      const pIds = pData.map(p => p.id);
      const { data: vData } = await supabase
        .from('votes')
        .select('*')
        .in('proposal_id', pIds);
      if (vData) setVotes(vData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProposalsAndVotes();
    const channel = supabase.channel('voting_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proposals' }, fetchProposalsAndVotes)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, fetchProposalsAndVotes)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleVote = async (proposalId: string, vote: 'yes' | 'no') => {
    if (!currentUser) return;
    await supabase.from('votes').upsert({ proposal_id: proposalId, member_name: currentUser, vote }, { onConflict: 'proposal_id, member_name' });
    
    const currentVotes = votes.filter(v => v.proposal_id === proposalId);
    const newVotes = [...currentVotes.filter(v => v.member_name !== currentUser), { proposal_id: proposalId, member_name: currentUser, vote }];
    const yesVotes = newVotes.filter(v => v.vote === 'yes').length;
    const noVotes = newVotes.filter(v => v.vote === 'no').length;
    
    let newStatus = 'voting';
    if (yesVotes >= 3) newStatus = 'approved';
    else if (noVotes >= 3 || (yesVotes === 2 && noVotes === 2)) newStatus = 'rejected';

    if (newStatus !== 'voting') {
      await supabase.from('proposals').update({ status: newStatus }).eq('id', proposalId);
    }
  };

  const handleForceApprove = async (proposalId: string) => {
    await supabase.from('proposals').update({ status: 'approved' }).eq('id', proposalId);
    setForceApproveId(null);
  };

  const handleForceReject = async (proposalId: string) => {
    await supabase.from('proposals').update({ status: 'rejected' }).eq('id', proposalId);
    setForceRejectId(null);
  };

  const handleConfirmBet = async (proposalId: string, amount: number, combinedOdd: number) => {
    if (isConfirmingId) return;
    setIsConfirmingId(proposalId);
    try {
      await supabase.from('proposals').update({ status: 'placed' }).eq('id', proposalId);
      const { data: lastTx } = await supabase.from('bankroll_transactions').select('balance_after').order('created_at', { ascending: false }).limit(1).single();
      const currentBalance = lastTx ? parseFloat(lastTx.balance_after) : 0;
      await supabase.from('bankroll_transactions').insert({
        proposal_id: proposalId,
        type: 'bet',
        amount: -amount,
        balance_after: currentBalance - amount,
        description: `Aposta confirmada: odd @${combinedOdd}`
      });
      window.dispatchEvent(new Event('balanceUpdated'));
    } finally {
      setIsConfirmingId(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsOcrLoading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = reader.result as string;
        const res = await fetch('/api/ai/extract-bet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64 })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        setNewTitle(data.title || '');
        if (data.topics && Array.isArray(data.topics)) {
          setNewDesc(data.topics.join('\n'));
        } else {
          setNewDesc(data.description || '');
        }
        setNewOdd(data.odd?.toString() || '');

        // Tenta vincular o jogo automaticamente pelo nome dos times
        if (data.home_team || data.away_team) {
          fetchUpcomingGamesAction().then(games => {
            const match = games.find((g: any) => 
              (data.home_team && g.home_team.toLowerCase().includes(data.home_team.toLowerCase())) ||
              (data.away_team && g.away_team.toLowerCase().includes(data.away_team.toLowerCase()))
            );
            if (match) setSelectedGameId(match.id);
          });
        }
      } catch (err: any) {
        alert(err.message || 'Erro ao extrair imagem.');
      } finally {
        setIsOcrLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitProposal = async () => {
    if (!newTitle || !newOdd || !newAmount || !currentUser) return alert('Preencha os dados mínimos.');
    setIsSubmitting(true);
    try {
      const pAmount = parseFloat(newAmount);
      const pOdd = parseFloat(newOdd);
      const potential = (pAmount * pOdd).toFixed(2);

      // Cria proposta
      const { data: propData, error: propErr } = await supabase.from('proposals').insert({
        amount: pAmount,
        combined_odd: pOdd,
        potential_return: potential,
        status: 'voting',
        proposed_by: currentUser
      }).select().single();

      if (propErr) throw propErr;

      // Cria a "pick" única da proposta
      const linkedGame = availableGames.find(g => g.id === selectedGameId);
      
      await supabase.from('proposal_picks').insert({
        proposal_id: propData.id,
        game_id: selectedGameId || 'custom_bet',
        home_team: linkedGame ? linkedGame.home_team : urlHome || newTitle,
        away_team: linkedGame ? linkedGame.away_team : urlAway || '',
        market_type: selectedGameId ? 'Aposta Vinculada ao Jogo' : 'Aposta Manual',
        selection: 'custom',
        selection_label: newDesc,
        odd: pOdd
      });

      // Limpa formuário
      setNewTitle('');
      setNewDesc('');
      setNewOdd('');
      setNewAmount('10');
      setIsCreating(false);
    } catch (e: any) {
      alert('Erro ao criar proposta: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-neutral-500">Carregando votações...</div>;

  return (
    <div className="pb-28">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black">Mesa de Votação</h2>
        {isCreating && (
          <button onClick={() => setIsCreating(false)} className="bg-neutral-800 hover:bg-neutral-700 p-2 rounded-full text-neutral-400 transition-colors">
            <X size={20} />
          </button>
        )}
      </div>

      {!isCreating && (
        <button 
          onClick={() => setIsCreating(true)} 
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-5 rounded-2xl shadow-xl shadow-blue-900/40 transition-all flex items-center justify-center gap-3 mb-8 text-lg border border-blue-500/30 hover:scale-[1.02]"
        >
          <Plus size={24} strokeWidth={3} /> Nova Proposta de Aposta
        </button>
      )}

      {isCreating && (
        <div className="bg-neutral-900 border border-blue-800/50 rounded-2xl p-5 mb-8 shadow-lg shadow-blue-900/10">
          <h3 className="font-bold text-blue-400 mb-4 flex items-center gap-2">
            <Sparkles size={18} /> Propor Aposta (IA)
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">Upload de Print Betano</label>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-4 border-2 border-dashed border-neutral-700 hover:border-blue-500 rounded-xl flex flex-col items-center justify-center text-neutral-400 hover:text-blue-400 transition-colors bg-neutral-950/50"
                disabled={isOcrLoading}
              >
                {isOcrLoading ? (
                  <>
                    <Loader2 className="animate-spin mb-2" size={24} />
                    <span className="text-sm">Lendo imagem...</span>
                  </>
                ) : (
                  <>
                    <Upload size={24} className="mb-2" />
                    <span className="text-sm">Toque para anexar imagem</span>
                  </>
                )}
              </button>
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
            </div>

            <div>
              <label className="block text-xs text-neutral-400 mb-1">Vincular a uma Partida (Opcional)</label>
              <select 
                value={selectedGameId} 
                onChange={e => setSelectedGameId(e.target.value)} 
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500 text-neutral-300"
              >
                <option value="">Nenhuma partida específica</option>
                {availableGames.map(g => (
                  <option key={g.id} value={g.id}>{g.home_team} vs {g.away_team}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Título Resumido</label>
                <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Ex: Brasil Vence" className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Odd Final</label>
                <input type="number" step="0.01" value={newOdd} onChange={e => setNewOdd(e.target.value)} placeholder="1.85" className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500" />
              </div>
            </div>

            <div>
              <label className="block text-xs text-neutral-400 mb-1">Tópicos da Aposta (um por linha)</label>
              <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Ex: Brasil vence no tempo normal&#10;Mais de 1.5 gols no jogo" className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500 h-24 resize-none" />
            </div>

            <div>
              <label className="block text-xs text-neutral-400 mb-1">Valor da Aposta (R$)</label>
              <input type="number" value={newAmount} onChange={e => setNewAmount(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500 text-blue-400 font-bold" />
            </div>

            <button onClick={handleSubmitProposal} disabled={isSubmitting || isOcrLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl mt-2 transition-colors flex items-center justify-center disabled:opacity-50">
              {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Enviar para Votação'}
            </button>
          </div>
        </div>
      )}

      {proposals.length === 0 ? (
        <div className="text-center text-neutral-500 py-16 bg-neutral-900/50 rounded-3xl border border-neutral-800/50 flex flex-col items-center">
          <div className="bg-neutral-800/50 p-4 rounded-full mb-4">
            <Inbox size={32} className="text-neutral-400" />
          </div>
          <h3 className="text-lg font-bold text-neutral-300 mb-1">Mesa Vazia</h3>
          <p className="text-sm">Nenhuma proposta em votação no momento.<br/>Seja o primeiro a sugerir uma aposta!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {proposals.map(proposal => {
            const propVotes = votes.filter(v => v.proposal_id === proposal.id);
            const myVote = propVotes.find(v => v.member_name === currentUser)?.vote;

            return (
              <div key={proposal.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-lg">
                <div className="p-4 border-b border-neutral-800 flex justify-between items-start">
                  <div>
                    <div className="text-xs text-neutral-400 mb-1">Proposto por <span className="text-blue-400 font-medium">{proposal.proposed_by}</span></div>
                    <div className="font-bold">Aposta de R$ {proposal.amount}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-neutral-400 mb-1">Retorno Potencial</div>
                    <div className="font-bold text-cyan-400">R$ {proposal.potential_return}</div>
                  </div>
                </div>

                <div className="p-4 bg-neutral-950">
                  <div className="space-y-2">
                    {proposal.proposal_picks?.map((pick: any) => (
                      <div key={pick.id} className="text-sm">
                        <div className="font-bold text-blue-400 mb-1">{pick.home_team}</div>
                        <div className="flex justify-between items-start text-neutral-300 mt-2">
                          <div className="space-y-1.5 flex-1">
                            {pick.selection_label.split('\n').map((line: string, i: number) => line.trim() && (
                              <div key={i} className="flex items-start gap-2">
                                <span className="text-blue-500 shrink-0 mt-0.5">•</span> 
                                <span className="leading-snug">{line.trim()}</span>
                              </div>
                            ))}
                          </div>
                          <span className="font-bold text-blue-500 ml-4">@{pick.odd}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-neutral-800 flex justify-between text-sm">
                    <span className="text-neutral-400">Odd Final</span>
                    <span className="font-bold">x{proposal.combined_odd}</span>
                  </div>
                </div>

                <div className="p-4 bg-neutral-900 border-t border-neutral-800">
                  <h4 className="text-xs font-semibold uppercase text-neutral-500 tracking-wider mb-3">Status dos Votos</h4>
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {MEMBERS.map(member => {
                      const v = propVotes.find(vote => vote.member_name === member);
                      let bg = 'bg-neutral-800 border-neutral-700 text-neutral-500';
                      let Icon = Clock;
                      if (v?.vote === 'yes') { bg = 'bg-cyan-600/20 border-cyan-500 text-cyan-400'; Icon = Check; }
                      else if (v?.vote === 'no') { bg = 'bg-red-600/20 border-red-500 text-red-400'; Icon = X; }
                      return (
                        <div key={member} className={`flex flex-col items-center justify-center p-2 rounded-xl border ${bg}`}>
                          <Icon size={16} className="mb-1" />
                          <span className="text-[10px] font-bold uppercase">{member}</span>
                        </div>
                      );
                    })}
                  </div>

                  {proposal.status === 'voting' && (
                    <div className="pt-2 space-y-3">
                      {!myVote ? (
                        <div className="flex gap-2">
                          <button onClick={() => handleVote(proposal.id, 'no')} className="flex-1 py-3 bg-neutral-800 hover:bg-red-600/20 text-red-400 border border-neutral-700 rounded-xl font-bold flex items-center justify-center gap-2">
                            <X size={18} /> Rejeitar
                          </button>
                          <button onClick={() => handleVote(proposal.id, 'yes')} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                            <Check size={18} /> Aprovar
                          </button>
                        </div>
                      ) : (
                        <div className="text-center py-2 text-sm text-neutral-400 font-medium">
                          Você já votou ({myVote === 'yes' ? 'Aprovado' : 'Rejeitado'}).
                        </div>
                      )}
                      
                      {forceApproveId === proposal.id ? (
                        <div className="bg-amber-500/10 p-3 rounded-xl text-center mt-2">
                          <div className="flex gap-2"><button onClick={() => setForceApproveId(null)} className="flex-1 py-2 bg-neutral-800 text-xs font-bold rounded-lg">Cancelar</button><button onClick={() => handleForceApprove(proposal.id)} className="flex-1 py-2 bg-amber-600 text-white text-xs font-bold rounded-lg">Sim, Aprovar Agora</button></div>
                        </div>
                      ) : forceRejectId === proposal.id ? (
                         <div className="bg-red-500/10 p-3 rounded-xl text-center mt-2">
                          <div className="flex gap-2"><button onClick={() => setForceRejectId(null)} className="flex-1 py-2 bg-neutral-800 text-xs font-bold rounded-lg">Cancelar</button><button onClick={() => handleForceReject(proposal.id)} className="flex-1 py-2 bg-red-600 text-white text-xs font-bold rounded-lg">Sim, Excluir</button></div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center mt-4 pt-3 border-t border-neutral-800/50">
                          <button onClick={() => setForceRejectId(proposal.id)} className="text-[11px] text-red-500/70 hover:text-red-400 uppercase font-bold flex items-center gap-1"><Trash size={12} /> Excluir Proposta</button>
                          <button onClick={() => setForceApproveId(proposal.id)} className="text-[11px] text-amber-500/70 hover:text-amber-400 underline font-medium">Forçar aprovação</button>
                        </div>
                      )}
                    </div>
                  )}

                  {proposal.status === 'approved' && (
                    <div className="mt-4 pt-4 border-t border-neutral-800">
                      <div className="bg-cyan-600/10 text-cyan-400 p-3 rounded-xl text-center text-sm font-bold mb-3">Aprovada! 🎉</div>
                      <a href="https://www.betano.bet.br" target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 bg-neutral-800 py-3 rounded-xl text-sm font-medium mb-2">Abrir Betano <ExternalLink size={16} /></a>
                      <button onClick={() => handleConfirmBet(proposal.id, proposal.amount, proposal.combined_odd)} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl">Confirmar Aposta</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
export default function VotarPage() { return <Suspense fallback={<div className='p-10 text-center text-neutral-500'>Carregando...</div>}><VotarContent /></Suspense>; }
