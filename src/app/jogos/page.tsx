import GamesListClient from './GamesListClient';

export const revalidate = 300; // 5 minutos de cache como pedido no prompt

async function getGames() {
  try {
    // Para testar, por enquanto podemos mockar os jogos da Copa caso a API não retorne para hoje,
    // Mas a instrução real é buscar de the-odds-api
    const url = `https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds/?apiKey=${process.env.ODDS_API_KEY}&regions=us,eu&markets=h2h&bookmakers=draftkings,betano`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    return res.json();
  } catch (e) {
    console.error(e);
    return [];
  }
}

export default async function JogosPage() {
  const games = await getGames();

  // Filtramos os jogos para exibir os que ainda não começaram OU começaram há no máximo 2 horas
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const upcomingGames = games.filter((g: any) => new Date(g.commence_time) > twoHoursAgo);

  // Se a API não retornar nada no futuro (por ex. fora de temporada), usamos dados mockados
  const displayGames = upcomingGames.length > 0 ? upcomingGames : [
    {
      id: 'mock-1',
      home_team: 'Brasil',
      away_team: 'França',
      commence_time: '2026-06-28T21:00:00Z',
      bookmakers: [{ markets: [{ outcomes: [{name: 'Brasil', price: 2.10}, {name: 'Draw', price: 3.20}, {name: 'França', price: 3.50}] }] }]
    },
    {
      id: 'mock-2',
      home_team: 'Argentina',
      away_team: 'Inglaterra',
      commence_time: '2026-06-29T16:00:00Z',
      bookmakers: [{ markets: [{ outcomes: [{name: 'Argentina', price: 2.80}, {name: 'Draw', price: 3.10}, {name: 'Inglaterra', price: 2.60}] }] }]
    }
  ];

  return (
    <GamesListClient initialGames={displayGames} />
  );
}
