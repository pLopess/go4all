import BetBuilderClient from './BetBuilderClient';
import { notFound } from 'next/navigation';

export const revalidate = 300;

async function getGame(id: string) {
  try {
    const url = `https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds/?apiKey=${process.env.ODDS_API_KEY}&regions=us,eu&markets=h2h&bookmakers=draftkings,betano`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const games = await res.json();
    return games.find((g: any) => g.id === id) || null;
  } catch (e) {
    console.error(e);
    return null;
  }
}

export default async function JogoDetailPage({ params }: { params: { id: string } }) {
  let game = await getGame(params.id);

  // Fallback mockado para os testes do Check-in caso a API esteja vazia
  if (!game) {
    const mockGames = [
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
    game = mockGames.find(g => g.id === params.id);
  }

  if (!game) {
    notFound();
  }

  return (
    <BetBuilderClient game={game} />
  );
}
