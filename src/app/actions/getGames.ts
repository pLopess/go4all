'use server';

export async function fetchUpcomingGamesAction() {
  try {
    const url = `https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds/?apiKey=${process.env.ODDS_API_KEY}&regions=us,eu&markets=h2h&bookmakers=draftkings,betano`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    
    const games = await res.json();
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const upcomingGames = games.filter((g: any) => new Date(g.commence_time) > twoHoursAgo);
    
    if (upcomingGames.length === 0) {
      // Retorna mock se não houver pra não quebrar
      return [
        { id: 'mock-1', home_team: 'Brasil', away_team: 'França' },
        { id: 'mock-2', home_team: 'Argentina', away_team: 'Inglaterra' }
      ];
    }
    
    return upcomingGames.map((g: any) => ({
      id: g.id,
      home_team: g.home_team,
      away_team: g.away_team
    }));
  } catch (e) {
    console.error(e);
    return [];
  }
}
