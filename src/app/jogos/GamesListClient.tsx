'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, CalendarOff } from 'lucide-react';

export default function GamesListClient({ initialGames }: { initialGames: any[] }) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filtra os jogos (Limita a 3 dias se não houver busca)
  const filteredGames = initialGames.filter(game => {
    const matchSearch = game.home_team.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        game.away_team.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (searchTerm) return matchSearch;

    const gameDate = new Date(game.commence_time);
    
    // Permite jogos que começaram a até 2 horas atrás (em andamento)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 2);
    maxDate.setHours(23, 59, 59, 999);

    return matchSearch && gameDate >= twoHoursAgo && gameDate <= maxDate;
  });

  // Agrupa por data (DD/MM/YYYY)
  const groupedGames = filteredGames.reduce((groups: any, game: any) => {
    const date = new Date(game.commence_time);
    const dateStr = date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
    if (!groups[dateStr]) {
      groups[dateStr] = [];
    }
    groups[dateStr].push(game);
    return groups;
  }, {});

  return (
    <div className="space-y-6">
      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
        <input 
          type="text"
          placeholder="Buscar seleção..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-3 outline-none focus:border-blue-500 transition-colors text-sm"
        />
      </div>

      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold">Próximos Jogos</h2>
      </div>
      
      {/* Lista Agrupada */}
      {Object.keys(groupedGames).map(dateStr => (
        <div key={dateStr} className="space-y-4">
          <h3 className="text-sm font-bold text-neutral-400 capitalize tracking-wider pl-3 border-l-2 border-blue-600">{dateStr}</h3>
          
          {groupedGames[dateStr].map((game: any) => {
            const homeOdds = game.bookmakers?.[0]?.markets?.[0]?.outcomes?.find((o: any) => o.name === game.home_team)?.price || '-';
            const drawOdds = game.bookmakers?.[0]?.markets?.[0]?.outcomes?.find((o: any) => o.name === 'Draw')?.price || '-';
            const awayOdds = game.bookmakers?.[0]?.markets?.[0]?.outcomes?.find((o: any) => o.name === game.away_team)?.price || '-';

            const timeStr = new Date(game.commence_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            return (
              <div key={game.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-lg">
                <div className="p-4 border-b border-neutral-800">
                  <div className="text-xs text-neutral-400 mb-2 font-medium uppercase tracking-wider">{timeStr}</div>
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>{game.home_team}</span>
                    <span className="text-neutral-500 mx-2">vs</span>
                    <span>{game.away_team}</span>
                  </div>
                </div>
                
                <div className="p-4 bg-neutral-900/50">
                  <div className="flex gap-2">
                    <div className="flex-1 bg-neutral-800 p-2 rounded-xl text-center">
                      <div className="text-xs text-neutral-400 mb-1">1</div>
                      <div className="font-bold text-blue-500">{homeOdds}</div>
                    </div>
                    <div className="flex-1 bg-neutral-800 p-2 rounded-xl text-center">
                      <div className="text-xs text-neutral-400 mb-1">X</div>
                      <div className="font-bold text-blue-500">{drawOdds}</div>
                    </div>
                    <div className="flex-1 bg-neutral-800 p-2 rounded-xl text-center">
                      <div className="text-xs text-neutral-400 mb-1">2</div>
                      <div className="font-bold text-blue-500">{awayOdds}</div>
                    </div>
                  </div>
                  
                  <Link href={`/jogos/${game.id}`} className="block w-full mt-3 text-center text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 py-3 rounded-xl transition-colors shadow-lg shadow-blue-900/20">
                    Abrir Painel da Partida
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {Object.keys(groupedGames).length === 0 && (
        <div className="text-center py-16 bg-neutral-900/50 rounded-3xl border border-neutral-800/50 flex flex-col items-center">
          <div className="bg-neutral-800/50 p-4 rounded-full mb-4">
            <CalendarOff size={32} className="text-neutral-400" />
          </div>
          <h3 className="text-lg font-bold text-neutral-300 mb-1">Nenhum jogo encontrado</h3>
          <p className="text-sm text-neutral-500">
            {searchTerm ? `Não encontramos resultados para "${searchTerm}".` : 'Não há jogos agendados para os próximos dias.'}
          </p>
        </div>
      )}
    </div>
  );
}
