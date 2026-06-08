const express = require('express');
const router = express.Router();
const { getLiveMatches, getTodayMatches, getFixture, getStandings } = require('../services/apiFootball');

// GET /api/matches/live
router.get('/live', async (req, res) => {
  try {
    const matches = await getLiveMatches();
    res.json({ success: true, data: matches, count: matches.length });
  } catch (err) {
    console.error('Live matches error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/matches/today
router.get('/today', async (req, res) => {
  try {
    const matches = await getTodayMatches();
    res.json({ success: true, data: matches, count: matches.length });
  } catch (err) {
    console.error('Today matches error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/matches/:id
router.get('/:id', async (req, res) => {
  try {
    const fixture = await getFixture(req.params.id);
    if (!fixture) return res.status(404).json({ success: false, error: 'Match not found' });
    res.json({ success: true, data: fixture });
  } catch (err) {
    console.error('Fixture error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/matches/standings/:leagueId?season=2024
router.get('/standings/:leagueId', async (req, res) => {
  try {
    const season = req.query.season || new Date().getFullYear();
    const data = await getStandings(req.params.leagueId, season);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
