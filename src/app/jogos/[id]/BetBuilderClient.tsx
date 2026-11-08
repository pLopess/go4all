'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, Target, Users, CheckCircle2, Send } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useUser } from '@/context/UserContext';

export default function BetBuilderClient({ game }: { game: any }) {
  const { currentUser } = useUser();
  const [scorePredictions, setScorePredictions] = useState<any[]>([]);
  const [localProposals, setLocalProposals] = useState<any[]>([]);

  // Form states
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);

  const homeTeam = game.home_team;
  const awayTeam = game.away_team;
  const dateObj = new Date(game.commence_time);
  
  const homeOdd = game.bookmakers?.[0]?.markets?.[0]?.outcomes?.find((o: any) => o.name === homeTeam)?.price || '-';
  const drawOdd = game.bookmakers?.[0]?.markets?.[0]?.outcomes?.find((o: any) => o.name === 'Draw')?.price || '-';
  const awayOdd = game.bookmakers?.[0]?.markets?.[0]?.outcomes?.find((o: any) => o.name === awayTeam)?.price || '-';

  const fetchScores = async () => {
    const { data } = await supabase.from('match_scores').select('*').eq('game_id', game.id).order('created_at', { ascending: false });
    if (data) setScorePredictions(data);
  };

  const fetchLocalProposals = async () => {
    const { data: picks } = await supabase.from('proposal_picks').select('proposal_id').eq('game_id', game.id);
    if (picks && picks.length > 0) {
      const pIds = picks.map((p: any) => p.proposal_id);
      const { data: props } = await supabase.from('proposals').select('*, proposal_picks(*)').in('id', pIds).in('status', ['voting', 'approved']);
      if (props) setLocalProposals(props);
    }
  };

  useEffect(() => {
    fetchScores();
    fetchLocalProposals();

    const channel = supabase.channel(`game_${game.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_scores', filter: `game_id=eq.${game.id}` }, fetchScores)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proposals' }, fetchLocalProposals)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [game.id]);

  const handleSubmitScore = async () => {
    if (!currentUser || homeScore === '' || awayScore === '') return;
    setIsSubmittingScore(true);
    try {
      await supabase.from('match_scores').upsert({
        game_id: game.id,
        member_name: currentUser,
        home_score: parseInt(homeScore, 10),
        away_score: parseInt(awayScore, 10)
      }, { onConflict: 'game_id, member_name' });
    } finally {
      setIsSubmittingScore(false);
    }
  };

  const myPrediction = scorePredictions.find(p => p.member_name === currentUser);

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/jogos" className="p-2 bg-neutral-800 hover:bg-neutral-700 transition-colors rounded-full text-neutral-300">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h2 className="text-xl font-bold leading-tight">{homeTeam} vs {awayTeam}</h2>
          <div className="text-sm text-neutral-400 flex items-center gap-2">
            <span>{dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às {dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      </div>

      {/* Grid de Odds de Referência */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 mb-8">
        <h3 className="font-semibold text-neutral-300 mb-3 text-sm uppercase tracking-wider">Cotações (1X2)</h3>
        
        <div className="flex gap-2">
          <div className="flex-1 p-3 rounded-xl bg-neutral-800 border border-neutral-700 flex flex-col items-center">
            <span className="text-xs text-neutral-400 mb-1">1 ({homeTeam})</span>
            <span className="font-bold text-blue-500">{homeOdd}</span>
          </div>
          <div className="flex-1 p-3 rounded-xl bg-neutral-800 border border-neutral-700 flex flex-col items-center">
            <span className="text-xs text-neutral-400 mb-1">X (Empate)</span>
            <span className="font-bold text-blue-500">{drawOdd}</span>
          </div>
          <div className="flex-1 p-3 rounded-xl bg-neutral-800 border border-neutral-700 flex flex-col items-center">
            <span className="text-xs text-neutral-400 mb-1">2 ({awayTeam})</span>
            <span className="font-bold text-blue-500">{awayOdd}</span>
          </div>
        </div>
      </div>

      {/* Palpite do Placar */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 mb-8 shadow-lg shadow-black/40">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold flex items-center gap-2 text-lg"><Target size={20} className="text-blue-500"/> Palpite do Placar</h3>
          <span className="text-xs bg-neutral-800 px-2 py-1 rounded-md text-neutral-400">{scorePredictions.length} Palpites</span>
        </div>
        
        {!myPrediction ? (
          <div className="bg-neutral-950/50 p-4 rounded-xl border border-neutral-800 border-dashed">
            <p className="text-sm text-neutral-400 text-center mb-4">Deixe o seu palpite para ver a aposta da galera!</p>
            
            <div className="flex items-center justify-center gap-4 mb-5">
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-bold uppercase truncate max-w-[80px] text-center">{homeTeam}</span>
                <input 
                  type="number" 
                  min="0"
                  max="20"
                  value={homeScore}
                  onChange={(e) => setHomeScore(e.target.value)}
                  className="w-16 h-16 text-center text-3xl font-black bg-neutral-800 border-2 border-neutral-700 rounded-xl focus:border-blue-500 outline-none"
                />
              </div>
              <div className="text-xl font-black text-neutral-600">X</div>
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-bold uppercase truncate max-w-[80px] text-center">{awayTeam}</span>
                <input 
                  type="number"
                  min="0" 
                  max="20"
                  value={awayScore}
                  onChange={(e) => setAwayScore(e.target.value)}
                  className="w-16 h-16 text-center text-3xl font-black bg-neutral-800 border-2 border-neutral-700 rounded-xl focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <button 
              onClick={handleSubmitScore}
              disabled={isSubmittingScore || homeScore === '' || awayScore === ''}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-900/30"
            >
              <Send size={18} /> Enviar Palpite
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl shadow-inner">
              <span className="text-blue-400 font-bold">Seu Palpite</span>
              <div className="text-xl font-black text-blue-400">
                {myPrediction.home_score} <span className="text-blue-600 mx-1">x</span> {myPrediction.away_score}
              </div>
            </div>

            <div className="pt-2">
              <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Palpites da Banca</h4>
              {scorePredictions.filter(p => p.member_name !== currentUser).length === 0 ? (
                <p className="text-sm text-neutral-500">Ninguém mais deu palpite ainda.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {scorePredictions.filter(p => p.member_name !== currentUser).map(p => (
                    <div key={p.id} className="bg-neutral-800/50 p-3 rounded-xl flex items-center justify-between border border-neutral-800">
                      <span className="text-xs font-bold text-neutral-400">{p.member_name}</span>
                      <span className="text-sm font-black text-white">{p.home_score} <span className="text-neutral-500 mx-0.5">-</span> {p.away_score}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Feed Local de Apostas */}
      <div className="mb-10">
        <h3 className="font-bold flex items-center gap-2 mb-4"><Users size={18} className="text-blue-500"/> Propostas neste Jogo</h3>
        
        {localProposals.length === 0 ? (
          <div className="bg-neutral-900/50 border border-neutral-800/50 border-dashed rounded-2xl p-6 text-center">
            <p className="text-sm text-neutral-500 mb-4">Nenhuma aposta criada para este jogo ainda.</p>
            <Link href={`/votar?game_id=${game.id}&home=${encodeURIComponent(homeTeam)}&away=${encodeURIComponent(awayTeam)}`} className="inline-flex items-center gap-2 text-sm font-bold text-blue-500 hover:text-blue-400 bg-blue-900/20 px-4 py-2 rounded-xl">
              Seja o Primeiro a Propor
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {localProposals.map(prop => (
              <div key={prop.id} className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl flex justify-between items-center shadow-lg">
                <div>
                  <div className="text-xs text-neutral-400 mb-1">Por <span className="font-bold text-blue-400">{prop.proposed_by}</span></div>
                  <div className="font-bold text-sm">{prop.proposal_picks[0]?.selection_label.split('\n')[0]}...</div>
                  <div className="text-xs text-neutral-500 mt-1">Odd @{prop.combined_odd} • R$ {prop.amount}</div>
                </div>
                <Link href="/votar" className="bg-neutral-800 hover:bg-neutral-700 text-white p-3 rounded-xl transition-colors">
                  <CheckCircle2 size={20} className={prop.status === 'approved' ? 'text-cyan-500' : 'text-neutral-400'} />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Botão de Call To Action Geral */}
      <div className="mt-6">
        <Link href={`/votar?game_id=${game.id}&home=${encodeURIComponent(homeTeam)}&away=${encodeURIComponent(awayTeam)}`} className="block w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-center py-4 rounded-2xl shadow-xl shadow-blue-900/30 transition-all text-lg hover:scale-[1.02]">
          Propor Aposta na Mesa
        </Link>
      </div>
    </div>
  );
}
