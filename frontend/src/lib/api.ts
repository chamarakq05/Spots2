import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 15000,
});

// Matches
export const matchesApi = {
  getLive: () => api.get('/matches/live').then(r => r.data),
  getToday: () => api.get('/matches/today').then(r => r.data),
  getById: (id: number) => api.get(`/matches/${id}`).then(r => r.data),
};

// Odds
export const oddsApi = {
  getLive: (sport = 'soccer') => api.get(`/odds/live?sport=${sport}`).then(r => r.data),
  getBySport: (sport: string) => api.get(`/odds/${sport}`).then(r => r.data),
};

// Analysis
export const analysisApi = {
  getH2H: (team1: number, team2: number) =>
    api.get(`/analysis/h2h?team1=${team1}&team2=${team2}`).then(r => r.data),
  getTeam: (teamId: number, leagueId?: number) =>
    api.get(`/analysis/team/${teamId}${leagueId ? `?league=${leagueId}` : ''}`).then(r => r.data),
};

// Predictions
export const predictionsApi = {
  generate: (params: {
    homeTeamId: number;
    awayTeamId: number;
    fixtureId?: number;
    leagueId?: number;
    oddsSport?: string;
  }) => api.post('/predictions/generate', params).then(r => r.data),
};
