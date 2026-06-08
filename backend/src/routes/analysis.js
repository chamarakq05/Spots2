const express = require('express');
const router = express.Router();
const { getH2H, getTeamForm, getTeamStats } = require('../services/apiFootball');
const { getOdds } = require('../services/oddsApi');
const { calculateFormScore, analyzeH2H, analyzeOddsMovement } = require('../services/predictionEngine');

// GET /api/analysis/h2h?team1=33&team2=40
router.get('/h2h', async (req, res) => {
  try {
    const { team1, team2 } = req.query;
    if (!team1 || !team2) return res.status(400).json({ error: 'team1 and team2 required' });

    const [h2hData, homeForm, awayForm] = await Promise.all([
      getH2H(team1, team2),
      getTeamForm(team1, 5),
      getTeamForm(team2, 5)
    ]);

    const h2hAnalysis = analyzeH2H(h2hData, parseInt(team1), parseInt(team2));
    const homeFormScore = calculateFormScore(homeForm, parseInt(team1));
    const awayFormScore = calculateFormScore(awayForm, parseInt(team2));

    res.json({
      success: true,
      data: {
        h2h: { analysis: h2hAnalysis, matches: h2hData.slice(0, 5) },
        homeForm: { analysis: homeFormScore, matches: homeForm.slice(0, 5) },
        awayForm: { analysis: awayFormScore, matches: awayForm.slice(0, 5) }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/analysis/team/:teamId?league=39&season=2024
router.get('/team/:teamId', async (req, res) => {
  try {
    const { league, season } = req.query;
    const currentSeason = season || new Date().getFullYear();
    
    const [form, stats] = await Promise.all([
      getTeamForm(req.params.teamId, 10),
      league ? getTeamStats(req.params.teamId, league, currentSeason) : Promise.resolve(null)
    ]);

    const formScore = calculateFormScore(form, parseInt(req.params.teamId));

    res.json({
      success: true,
      data: {
        form: { analysis: formScore, matches: form },
        stats
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
