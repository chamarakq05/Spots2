const axios = require('axios');

const oddsApi = axios.create({
  baseURL: 'https://api.the-odds-api.com/v4',
});

const API_KEY = process.env.THE_ODDS_API_KEY;

const cache = new Map();
const CACHE_TTL = 3 * 60 * 1000; // 3 min (odds change fast)

function getCached(key) {
  const item = cache.get(key);
  if (item && Date.now() - item.timestamp < CACHE_TTL) return item.data;
  return null;
}
function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

// Sports list
async function getSports() {
  const cached = getCached('sports');
  if (cached) return cached;
  const res = await oddsApi.get('/sports', { params: { apiKey: API_KEY } });
  setCache('sports', res.data);
  return res.data;
}

// Odds for a sport
async function getOdds(sport = 'soccer_epl', regions = 'uk,eu', markets = 'h2h,spreads,totals') {
  const key = `odds_${sport}_${regions}_${markets}`;
  const cached = getCached(key);
  if (cached) return cached;
  const res = await oddsApi.get(`/sports/${sport}/odds`, {
    params: { apiKey: API_KEY, regions, markets, oddsFormat: 'decimal' }
  });
  setCache(key, res.data);
  return res.data;
}

// Live odds
async function getLiveOdds(sport = 'soccer') {
  const key = `live_odds_${sport}`;
  const cached = getCached(key);
  if (cached) return cached;
  const res = await oddsApi.get(`/sports/${sport}/odds`, {
    params: {
      apiKey: API_KEY,
      regions: 'uk,eu',
      markets: 'h2h',
      oddsFormat: 'decimal',
      live: true
    }
  });
  setCache(key, res.data);
  return res.data;
}

// Scores (recent results)
async function getScores(sport = 'soccer_epl', daysFrom = 1) {
  const key = `scores_${sport}_${daysFrom}`;
  const cached = getCached(key);
  if (cached) return cached;
  const res = await oddsApi.get(`/sports/${sport}/scores`, {
    params: { apiKey: API_KEY, daysFrom }
  });
  setCache(key, res.data);
  return res.data;
}

// Match odds by event ID
async function getMatchOdds(sport, eventId) {
  const key = `match_odds_${eventId}`;
  const cached = getCached(key);
  if (cached) return cached;
  const res = await oddsApi.get(`/sports/${sport}/events/${eventId}/odds`, {
    params: {
      apiKey: API_KEY,
      regions: 'uk,eu',
      markets: 'h2h,spreads,totals',
      oddsFormat: 'decimal'
    }
  });
  setCache(key, res.data);
  return res.data;
}

module.exports = { getSports, getOdds, getLiveOdds, getScores, getMatchOdds };
