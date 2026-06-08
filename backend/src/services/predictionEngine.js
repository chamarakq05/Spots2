/**
 * Prediction Engine
 * Analyzes H2H, team form, home/away stats, and odds movement
 * to generate match predictions with confidence scores
 */

// Calculate form points from last N matches
function calculateFormScore(matches, teamId) {
  let points = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  let played = 0;

  matches.slice(0, 5).forEach(match => {
    const isHome = match.teams.home.id === teamId;
    const homeGoals = match.goals.home || 0;
    const awayGoals = match.goals.away || 0;
    const status = match.fixture.status.short;

    if (!['FT', 'AET', 'PEN'].includes(status)) return;
    played++;

    if (isHome) {
      goalsFor += homeGoals;
      goalsAgainst += awayGoals;
      if (homeGoals > awayGoals) points += 3;
      else if (homeGoals === awayGoals) points += 1;
    } else {
      goalsFor += awayGoals;
      goalsAgainst += homeGoals;
      if (awayGoals > homeGoals) points += 3;
      else if (homeGoals === awayGoals) points += 1;
    }
  });

  return {
    points,
    played,
    goalsFor,
    goalsAgainst,
    avgGoalsFor: played > 0 ? (goalsFor / played).toFixed(2) : 0,
    avgGoalsAgainst: played > 0 ? (goalsAgainst / played).toFixed(2) : 0,
    formPercentage: played > 0 ? ((points / (played * 3)) * 100).toFixed(1) : 0
  };
}

// Analyze H2H history
function analyzeH2H(h2hMatches, homeTeamId, awayTeamId) {
  let homeWins = 0, awayWins = 0, draws = 0;
  let totalGoals = 0;
  const recentMatches = h2hMatches.slice(0, 10);

  recentMatches.forEach(match => {
    const hGoals = match.goals.home || 0;
    const aGoals = match.goals.away || 0;
    totalGoals += hGoals + aGoals;

    const isHomeTeamHome = match.teams.home.id === homeTeamId;
    const homeTeamGoals = isHomeTeamHome ? hGoals : aGoals;
    const awayTeamGoals = isHomeTeamHome ? aGoals : hGoals;

    if (homeTeamGoals > awayTeamGoals) homeWins++;
    else if (awayTeamGoals > homeTeamGoals) awayWins++;
    else draws++;
  });

  const total = recentMatches.length || 1;
  return {
    total: recentMatches.length,
    homeWins,
    awayWins,
    draws,
    homeWinPct: ((homeWins / total) * 100).toFixed(1),
    awayWinPct: ((awayWins / total) * 100).toFixed(1),
    drawPct: ((draws / total) * 100).toFixed(1),
    avgGoalsPerGame: (totalGoals / total).toFixed(2)
  };
}

// Odds movement analysis
function analyzeOddsMovement(bookmakers) {
  if (!bookmakers || bookmakers.length === 0) return null;

  const h2hMarkets = bookmakers
    .map(b => b.markets?.find(m => m.key === 'h2h'))
    .filter(Boolean);

  if (h2hMarkets.length === 0) return null;

  let homeOddsArr = [], drawOddsArr = [], awayOddsArr = [];

  h2hMarkets.forEach(market => {
    market.outcomes?.forEach(o => {
      if (o.name === 'Home' || o.price) {
        // Match by position
      }
    });
    const outcomes = market.outcomes || [];
    if (outcomes[0]) homeOddsArr.push(parseFloat(outcomes[0].price));
    if (outcomes[1]) drawOddsArr.push(parseFloat(outcomes[1].price));
    if (outcomes[2]) awayOddsArr.push(parseFloat(outcomes[2].price));
  });

  const avg = arr => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
  const min = arr => arr.length ? Math.min(...arr) : 0;
  const max = arr => arr.length ? Math.max(...arr) : 0;

  const homeAvg = avg(homeOddsArr);
  const drawAvg = avg(drawOddsArr);
  const awayAvg = avg(awayOddsArr);

  // Convert odds to implied probability
  const homeImplied = homeAvg > 0 ? ((1 / homeAvg) * 100).toFixed(1) : 0;
  const drawImplied = drawAvg > 0 ? ((1 / drawAvg) * 100).toFixed(1) : 0;
  const awayImplied = awayAvg > 0 ? ((1 / awayAvg) * 100).toFixed(1) : 0;

  return {
    home: { avg: homeAvg.toFixed(2), min: min(homeOddsArr).toFixed(2), max: max(homeOddsArr).toFixed(2), impliedProb: homeImplied },
    draw: { avg: drawAvg.toFixed(2), min: min(drawOddsArr).toFixed(2), max: max(drawOddsArr).toFixed(2), impliedProb: drawImplied },
    away: { avg: awayAvg.toFixed(2), min: min(awayOddsArr).toFixed(2), max: max(awayOddsArr).toFixed(2), impliedProb: awayImplied },
    bookmakerCount: bookmakers.length
  };
}

// Main prediction function
function generatePrediction({ homeForm, awayForm, h2h, oddsAnalysis, homeTeamStats, awayTeamStats }) {
  let homeScore = 0;
  let awayScore = 0;
  let factors = [];

  // Form factor (30%)
  if (homeForm && awayForm) {
    const homePct = parseFloat(homeForm.formPercentage);
    const awayPct = parseFloat(awayForm.formPercentage);
    homeScore += homePct * 0.30;
    awayScore += awayPct * 0.30;
    factors.push({
      name: 'Recent Form',
      weight: '30%',
      homeValue: `${homePct}%`,
      awayValue: `${awayPct}%`,
      advantage: homePct > awayPct ? 'home' : homePct < awayPct ? 'away' : 'neutral'
    });
  }

  // H2H factor (25%)
  if (h2h) {
    const homePct = parseFloat(h2h.homeWinPct);
    const awayPct = parseFloat(h2h.awayWinPct);
    homeScore += homePct * 0.25;
    awayScore += awayPct * 0.25;
    factors.push({
      name: 'Head to Head',
      weight: '25%',
      homeValue: `${h2h.homeWins}W/${h2h.draws}D/${h2h.awayWins}L`,
      awayValue: `${h2h.awayWins}W/${h2h.draws}D/${h2h.homeWins}L`,
      advantage: homePct > awayPct ? 'home' : homePct < awayPct ? 'away' : 'neutral'
    });
  }

  // Home advantage factor (15%)
  homeScore += 15;
  factors.push({
    name: 'Home Advantage',
    weight: '15%',
    homeValue: '+15pts',
    awayValue: '—',
    advantage: 'home'
  });

  // Odds implied probability factor (30%)
  if (oddsAnalysis) {
    const homeOddsProb = parseFloat(oddsAnalysis.home.impliedProb);
    const awayOddsProb = parseFloat(oddsAnalysis.away.impliedProb);
    homeScore += homeOddsProb * 0.30;
    awayScore += awayOddsProb * 0.30;
    factors.push({
      name: 'Market Odds',
      weight: '30%',
      homeValue: `${homeOddsProb}%`,
      awayValue: `${awayOddsProb}%`,
      advantage: homeOddsProb > awayOddsProb ? 'home' : 'away'
    });
  }

  // Normalize to get prediction
  const total = homeScore + awayScore;
  const homeWinProb = total > 0 ? ((homeScore / total) * 100).toFixed(1) : 50;
  const awayWinProb = total > 0 ? ((awayScore / total) * 100).toFixed(1) : 50;

  // Draw probability (based on H2H draws and low-scoring matches)
  let drawProb = 0;
  if (h2h) drawProb = parseFloat(h2h.drawPct) * 0.4;
  if (oddsAnalysis) drawProb += parseFloat(oddsAnalysis.draw.impliedProb) * 0.6;

  // Normalize all three
  const rawTotal = parseFloat(homeWinProb) + parseFloat(awayWinProb) + drawProb;
  const finalHome = ((parseFloat(homeWinProb) / rawTotal) * 100).toFixed(1);
  const finalDraw = ((drawProb / rawTotal) * 100).toFixed(1);
  const finalAway = ((parseFloat(awayWinProb) / rawTotal) * 100).toFixed(1);

  // Determine prediction
  let prediction, confidence;
  const probs = [
    { result: 'Home Win', prob: parseFloat(finalHome) },
    { result: 'Draw', prob: parseFloat(finalDraw) },
    { result: 'Away Win', prob: parseFloat(finalAway) }
  ];
  probs.sort((a, b) => b.prob - a.prob);
  prediction = probs[0].result;
  confidence = probs[0].prob;

  // BTTS (Both Teams To Score)
  let bttsProb = 50;
  if (homeForm && awayForm) {
    const homeScores = parseFloat(homeForm.avgGoalsFor) > 1 ? 60 : 40;
    const awayScores = parseFloat(awayForm.avgGoalsFor) > 0.8 ? 60 : 40;
    bttsProb = (homeScores + awayScores) / 2;
  }

  // Over/Under 2.5
  let over25Prob = 50;
  if (h2h) {
    const avgGoals = parseFloat(h2h.avgGoalsPerGame);
    over25Prob = avgGoals > 2.5 ? 65 : avgGoals > 2.0 ? 55 : 40;
  }

  return {
    prediction,
    confidence: confidence.toFixed(1),
    probabilities: {
      homeWin: finalHome,
      draw: finalDraw,
      awayWin: finalAway
    },
    additionalBets: {
      btts: { prob: bttsProb.toFixed(1), recommendation: bttsProb > 55 ? 'Yes' : 'No' },
      over25: { prob: over25Prob.toFixed(1), recommendation: over25Prob > 55 ? 'Over 2.5' : 'Under 2.5' }
    },
    factors,
    generatedAt: new Date().toISOString()
  };
}

module.exports = { calculateFormScore, analyzeH2H, analyzeOddsMovement, generatePrediction };
