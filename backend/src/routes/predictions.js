const express = require('express');
const router = express.Router();
const { getH2H, getTeamForm, getTeamStats, getFixture } = require('../services/apiFootball');
const { getOdds } = require('../services/oddsApi');
const { calculateFormScore, analyzeH2H, analyzeOddsMovement, generatePrediction } = require('../services/predictionEngine');

// POST /api/predictions/generate
// Body: { fixtureId, homeTeamId, awayTeamId, leagueId, season, oddsEventId, oddsSport }
router.post('/generate', async (req, res) => {
  try {
    const { fixtureId, homeTeamId, awayTeamId, leagueId, season, oddsSport } = req.body;

    if (!homeTeamId || !awayTeamId) {
      return res.status(400).json({ error: 'homeTeamId and awayTeamId are required' });
    }

    const currentSeason = season || new Date().getFullYear();

    // Fetch all data in parallel
    const [h2hData, homeFormData, awayFormData, oddsData] = await Promise.all([
      getH2H(homeTeamId, awayTeamId).catch(() => []),
      getTeamForm(homeTeamId, 5).catch(() => []),
      getTeamForm(awayTeamId, 5).catch(() => []),
      getOdds(oddsSport || 'soccer_epl').catch(() => [])
    ]);

    // Analyze data
    const h2hAnalysis = analyzeH2H(h2hData, parseInt(homeTeamId), parseInt(awayTeamId));
    const homeForm = calculateFormScore(homeFormData, parseInt(homeTeamId));
    const awayForm = calculateFormScore(awayFormData, parseInt(awayTeamId));

    // Find matching odds if available
    let oddsAnalysis = null;
    if (oddsData.length > 0) {
      // Try to match by team names (simplified)
      const matchedEvent = oddsData[0]; // Use first as fallback
      if (matchedEvent?.bookmakers) {
        oddsAnalysis = analyzeOddsMovement(matchedEvent.bookmakers);
      }
    }

    const prediction = generatePrediction({
      homeForm,
      awayForm,
      h2h: h2hAnalysis,
      oddsAnalysis
    });

    res.json({
      success: true,
      data: {
        prediction,
        analysis: {
          h2h: h2hAnalysis,
          homeForm,
          awayForm,
          odds: oddsAnalysis
        },
        metadata: {
          homeTeamId,
          awayTeamId,
          fixtureId,
          generatedAt: new Date().toISOString()
        }
      }
    });
  } catch (err) {
    console.error('Prediction error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
