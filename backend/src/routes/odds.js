const express = require('express');
const router = express.Router();
const { getOdds, getLiveOdds, getScores, getMatchOdds } = require('../services/oddsApi');

// GET /api/odds/live?sport=soccer
router.get('/live', async (req, res) => {
  try {
    const sport = req.query.sport || 'soccer';
    const data = await getLiveOdds(sport);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/odds/:sport?regions=uk,eu&markets=h2h,spreads
router.get('/:sport', async (req, res) => {
  try {
    const { regions, markets } = req.query;
    const data = await getOdds(req.params.sport, regions, markets);
    res.json({ success: true, data, count: data.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/odds/:sport/event/:eventId
router.get('/:sport/event/:eventId', async (req, res) => {
  try {
    const data = await getMatchOdds(req.params.sport, req.params.eventId);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
