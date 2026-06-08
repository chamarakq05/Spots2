const axios = require('axios');

const apiFootball = axios.create({
  baseURL: 'https://v3.football.api-sports.io',
  headers: {
    'x-rapidapi-key': process.env.API_FOOTBALL_KEY,
    'x-rapidapi-host': 'v3.football.api-sports.io'
  }
});

// Cache simple in-memory (replace with Redis in production)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key) {
  const item = cache.get(key);
  if (item && Date.now() - item.timestamp < CACHE_TTL) return item.data;
  return null;
}
function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

// Live matches
async function getLiveMatches() {
  const cached = getCached('live_matches');
  if (cached) return cached;
  const res = await apiFootball.get('/fixtures?live=all');
  const data = res.data.response;
  setCache('live_matches', data);
  return data;
}

// Today's matches (upcoming)
async function getTodayMatches() {
  const cached = getCached('today_matches');
  if (cached) return cached;
  const today = new Date().toISOString().split('T')[0];
  const res = await apiFootball.get(`/fixtures?date=${today}&status=NS`);
  const data = res.data.response;
  setCache('today_matches', data);
  return data;
}

// H2H
async function getH2H(team1Id, team2Id) {
  const key = `h2h_${team1Id}_${team2Id}`;
  const cached = getCached(key);
  if (cached) return cached;
  const res = await apiFootball.get(`/fixtures/headtohead?h2h=${team1Id}-${team2Id}&last=10`);
  const data = res.data.response;
  setCache(key, data);
  return data;
}

// Team statistics
async function getTeamStats(teamId, leagueId, season) {
  const key = `teamstats_${teamId}_${leagueId}_${season}`;
  const cached = getCached(key);
  if (cached) return cached;
  const res = await apiFootball.get(`/teams/statistics?team=${teamId}&league=${leagueId}&season=${season}`);
  const data = res.data.response;
  setCache(key, data);
  return data;
}

// Team recent form (last 5)
async function getTeamForm(teamId, last = 5) {
  const key = `form_${teamId}_${last}`;
  const cached = getCached(key);
  if (cached) return cached;
  const res = await apiFootball.get(`/fixtures?team=${teamId}&last=${last}`);
  const data = res.data.response;
  setCache(key, data);
  return data;
}

// Fixture by ID (single match details)
async function getFixture(fixtureId) {
  const key = `fixture_${fixtureId}`;
  const cached = getCached(key);
  if (cached) return cached;
  const res = await apiFootball.get(`/fixtures?id=${fixtureId}`);
  const data = res.data.response[0];
  setCache(key, data);
  return data;
}

// Standings
async function getStandings(leagueId, season) {
  const key = `standings_${leagueId}_${season}`;
  const cached = getCached(key);
  if (cached) return cached;
  const res = await apiFootball.get(`/standings?league=${leagueId}&season=${season}`);
  const data = res.data.response;
  setCache(key, data);
  return data;
}

module.exports = {
  getLiveMatches,
  getTodayMatches,
  getH2H,
  getTeamStats,
  getTeamForm,
  getFixture,
  getStandings
};
