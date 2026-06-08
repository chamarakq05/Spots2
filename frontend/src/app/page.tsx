'use client';

import { useState, useEffect, useCallback } from 'react';
import { matchesApi, analysisApi, predictionsApi, oddsApi } from '@/lib/api';
import { 
  Activity, ChevronRight, TrendingUp, BarChart2, 
  Zap, Clock, Target, Shield, Home, Plane,
  RefreshCw, Star, ArrowRight, AlertCircle
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────
interface Team {
  id: number;
  name: string;
  logo: string;
}
interface Match {
  fixture: { id: number; date: string; status: { short: string; elapsed?: number } };
  teams: { home: Team; away: Team };
  goals: { home: number | null; away: number | null };
  league: { id: number; name: string; logo: string; country: string };
  score?: any;
}
interface Prediction {
  prediction: string;
  confidence: string;
  probabilities: { homeWin: string; draw: string; awayWin: string };
  additionalBets: {
    btts: { prob: string; recommendation: string };
    over25: { prob: string; recommendation: string };
  };
  factors: Array<{ name: string; weight: string; homeValue: string; awayValue: string; advantage: string }>;
}

// ─── Helpers ────────────────────────────────────────────
function getStatusColor(status: string) {
  if (['1H','2H','ET','BT','P','LIVE'].includes(status)) return 'text-neon-green';
  if (status === 'HT') return 'text-neon-yellow';
  if (['FT','AET','PEN'].includes(status)) return 'text-slate-500';
  return 'text-neon-blue';
}
function getFormDot(result: string) {
  if (result === 'W') return 'bg-neon-green';
  if (result === 'L') return 'bg-neon-red';
  return 'bg-neon-yellow';
}
function getPredictionColor(pred: string) {
  if (pred === 'Home Win') return 'text-neon-green';
  if (pred === 'Away Win') return 'text-neon-orange';
  return 'text-neon-yellow';
}
function confidenceLabel(c: number) {
  if (c >= 70) return { text: 'HIGH', color: 'text-neon-green border-neon-green/30 bg-neon-green/10' };
  if (c >= 55) return { text: 'MED', color: 'text-neon-yellow border-neon-yellow/30 bg-neon-yellow/10' };
  return { text: 'LOW', color: 'text-slate-400 border-slate-600 bg-slate-800/50' };
}

// ─── Sub-components ─────────────────────────────────────

function LiveDot() {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="live-dot w-2 h-2 rounded-full bg-neon-green inline-block" />
      <span className="text-neon-green text-xs font-mono font-medium tracking-widest">LIVE</span>
    </span>
  );
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`shimmer rounded-lg ${className}`} />;
}

function MatchCard({ match, selected, onClick }: { match: Match; selected: boolean; onClick: () => void }) {
  const isLive = ['1H','2H','ET','HT','BT','P'].includes(match.fixture.status.short);
  const isFinished = ['FT','AET','PEN'].includes(match.fixture.status.short);
  const kickoff = new Date(match.fixture.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border transition-all duration-200 p-3.5 group
        ${selected
          ? 'border-neon-green/50 bg-neon-green/5 glow-green'
          : 'border-pitch-700/60 bg-pitch-900/60 hover:border-pitch-600 hover:bg-pitch-800/80'
        }`}
    >
      {/* League */}
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[10px] text-slate-500 font-medium tracking-wider uppercase truncate">
          {match.league.name}
        </span>
        {isLive ? (
          <span className="flex items-center gap-1">
            <span className="live-dot w-1.5 h-1.5 rounded-full bg-neon-green" />
            <span className="text-[10px] text-neon-green font-mono">{match.fixture.status.elapsed}&apos;</span>
          </span>
        ) : isFinished ? (
          <span className="text-[10px] text-slate-500 font-mono">FT</span>
        ) : (
          <span className="text-[10px] text-neon-blue font-mono">{kickoff}</span>
        )}
      </div>

      {/* Teams + Score */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <img src={match.teams.home.logo} alt="" className="w-6 h-6 object-contain flex-shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <span className="text-sm font-semibold text-slate-200 truncate">{match.teams.home.name}</span>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {(isLive || isFinished) ? (
            <span className="text-sm font-mono font-bold text-white px-2 py-0.5 bg-pitch-700 rounded">
              {match.goals.home ?? 0} – {match.goals.away ?? 0}
            </span>
          ) : (
            <span className="text-xs text-slate-500 font-mono px-2">vs</span>
          )}
        </div>

        <div className="flex-1 flex items-center gap-2 justify-end min-w-0">
          <span className="text-sm font-semibold text-slate-200 truncate text-right">{match.teams.away.name}</span>
          <img src={match.teams.away.logo} alt="" className="w-6 h-6 object-contain flex-shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        </div>
      </div>

      {selected && (
        <div className="mt-2.5 flex items-center gap-1 text-neon-green">
          <span className="text-[10px] font-medium">Analyzing match</span>
          <ChevronRight size={10} />
        </div>
      )}
    </button>
  );
}

function FormStrip({ matches, teamId }: { matches: any[]; teamId: number }) {
  if (!matches?.length) return <span className="text-slate-600 text-xs">No data</span>;
  
  return (
    <div className="flex items-center gap-1">
      {matches.slice(0, 5).map((m: any, i: number) => {
        const isHome = m.teams?.home?.id === teamId;
        const hG = m.goals?.home ?? 0;
        const aG = m.goals?.away ?? 0;
        const teamGoals = isHome ? hG : aG;
        const oppGoals = isHome ? aG : hG;
        const result = teamGoals > oppGoals ? 'W' : teamGoals < oppGoals ? 'L' : 'D';
        return (
          <span
            key={i}
            title={`${isHome ? 'H' : 'A'} ${hG}-${aG}`}
            className={`w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center text-pitch-950
              ${result === 'W' ? 'bg-neon-green' : result === 'L' ? 'bg-red-500' : 'bg-yellow-400'}`}
          >
            {result}
          </span>
        );
      })}
    </div>
  );
}

function PredictionCard({ prediction, homeTeam, awayTeam }: { prediction: Prediction; homeTeam: Team; awayTeam: Team }) {
  const conf = parseFloat(prediction.confidence);
  const confInfo = confidenceLabel(conf);
  const homeProb = parseFloat(prediction.probabilities.homeWin);
  const drawProb = parseFloat(prediction.probabilities.draw);
  const awayProb = parseFloat(prediction.probabilities.awayWin);

  return (
    <div className="rounded-xl border border-neon-green/20 bg-gradient-to-b from-neon-green/5 to-transparent p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target size={16} className="text-neon-green" />
          <span className="text-sm font-semibold text-slate-300 tracking-wide">PREDICTION</span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${confInfo.color}`}>
          {confInfo.text} CONFIDENCE
        </span>
      </div>

      {/* Main prediction */}
      <div className="text-center mb-5">
        <div className={`text-3xl font-display tracking-wider mb-1 ${getPredictionColor(prediction.prediction)}`}>
          {prediction.prediction.toUpperCase()}
        </div>
        <div className="text-slate-400 text-sm">
          {prediction.prediction === 'Home Win' ? homeTeam.name :
           prediction.prediction === 'Away Win' ? awayTeam.name : 'Draw likely'}
        </div>
      </div>

      {/* Probability bars */}
      <div className="space-y-2.5 mb-5">
        {[
          { label: homeTeam.name, prob: homeProb, color: 'bg-neon-green' },
          { label: 'Draw', prob: drawProb, color: 'bg-yellow-400' },
          { label: awayTeam.name, prob: awayProb, color: 'bg-orange-400' },
        ].map(({ label, prob, color }) => (
          <div key={label}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400 truncate max-w-[150px]">{label}</span>
              <span className="text-slate-300 font-mono font-medium">{prob.toFixed(1)}%</span>
            </div>
            <div className="confidence-bar">
              <div
                className={`confidence-fill ${color}`}
                style={{ width: `${prob}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Additional bets */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-pitch-700/60 bg-pitch-800/50 p-3 text-center">
          <div className="text-[10px] text-slate-500 mb-1 tracking-wider">BTTS</div>
          <div className="text-sm font-bold text-slate-200">{prediction.additionalBets.btts.recommendation}</div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">{prediction.additionalBets.btts.prob}%</div>
        </div>
        <div className="rounded-lg border border-pitch-700/60 bg-pitch-800/50 p-3 text-center">
          <div className="text-[10px] text-slate-500 mb-1 tracking-wider">GOALS</div>
          <div className="text-sm font-bold text-slate-200">{prediction.additionalBets.over25.recommendation}</div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">{prediction.additionalBets.over25.prob}%</div>
        </div>
      </div>
    </div>
  );
}

function H2HCard({ h2h, homeTeam, awayTeam }: { h2h: any; homeTeam: Team; awayTeam: Team }) {
  if (!h2h) return null;
  const { analysis, matches } = h2h;

  return (
    <div className="rounded-xl border border-pitch-700/60 bg-pitch-900/60 p-4">
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 size={14} className="text-neon-blue" />
        <span className="text-xs font-semibold text-slate-400 tracking-wider">HEAD TO HEAD</span>
        <span className="ml-auto text-[10px] text-slate-600 font-mono">Last {analysis.total} games</span>
      </div>

      {/* Win ratio bar */}
      <div className="mb-3">
        <div className="flex text-xs justify-between mb-1.5">
          <span className="text-neon-green font-medium truncate max-w-[100px]">{homeTeam.name}</span>
          <span className="text-slate-500">Draw</span>
          <span className="text-orange-400 font-medium truncate max-w-[100px] text-right">{awayTeam.name}</span>
        </div>
        <div className="h-3 rounded-full overflow-hidden flex">
          <div className="bg-neon-green transition-all" style={{ width: `${analysis.homeWinPct}%` }} />
          <div className="bg-yellow-400 transition-all" style={{ width: `${analysis.drawPct}%` }} />
          <div className="bg-orange-400 transition-all" style={{ width: `${analysis.awayWinPct}%` }} />
        </div>
        <div className="flex text-[10px] justify-between mt-1 font-mono">
          <span className="text-neon-green">{analysis.homeWins}W ({analysis.homeWinPct}%)</span>
          <span className="text-yellow-400">{analysis.draws}D</span>
          <span className="text-orange-400">{analysis.awayWins}W ({analysis.awayWinPct}%)</span>
        </div>
      </div>

      <div className="text-[10px] text-slate-500 text-center font-mono">
        Avg {analysis.avgGoalsPerGame} goals/game
      </div>

      {/* Recent H2H */}
      {matches?.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {matches.slice(0, 4).map((m: any, i: number) => {
            const date = new Date(m.fixture.date).toLocaleDateString([], { day: 'numeric', month: 'short', year: '2-digit' });
            const hG = m.goals?.home ?? '-';
            const aG = m.goals?.away ?? '-';
            return (
              <div key={i} className="flex items-center gap-2 text-[10px]">
                <span className="text-slate-600 font-mono w-16 flex-shrink-0">{date}</span>
                <span className="flex-1 text-slate-400 truncate text-right">{m.teams.home.name}</span>
                <span className="font-mono font-bold text-white bg-pitch-800 px-1.5 py-0.5 rounded flex-shrink-0">{hG}–{aG}</span>
                <span className="flex-1 text-slate-400 truncate">{m.teams.away.name}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FactorsCard({ factors }: { factors: any[] }) {
  if (!factors?.length) return null;
  return (
    <div className="rounded-xl border border-pitch-700/60 bg-pitch-900/60 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Zap size={14} className="text-neon-yellow" />
        <span className="text-xs font-semibold text-slate-400 tracking-wider">ANALYSIS FACTORS</span>
      </div>
      <div className="space-y-2.5">
        {factors.map((f, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-[10px] text-slate-500 w-20 flex-shrink-0">{f.name}</span>
            <span className="text-[10px] text-slate-600 font-mono w-6">{f.weight}</span>
            <div className="flex-1 flex items-center justify-between gap-2">
              <span className={`text-[10px] font-mono ${f.advantage === 'home' ? 'text-neon-green' : 'text-slate-400'}`}>{f.homeValue}</span>
              <span className={`text-[8px] px-1 py-0.5 rounded font-bold
                ${f.advantage === 'home' ? 'bg-neon-green/20 text-neon-green' :
                  f.advantage === 'away' ? 'bg-orange-500/20 text-orange-400' :
                  'bg-yellow-400/20 text-yellow-400'}`}>
                {f.advantage === 'home' ? '🏠' : f.advantage === 'away' ? '✈️' : '—'}
              </span>
              <span className={`text-[10px] font-mono ${f.advantage === 'away' ? 'text-orange-400' : 'text-slate-400'}`}>{f.awayValue}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────
export default function HomePage() {
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [todayMatches, setTodayMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState({ matches: true, analysis: false });
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'live' | 'today'>('live');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Fetch matches
  const fetchMatches = useCallback(async () => {
    setLoading(l => ({ ...l, matches: true }));
    setError(null);
    try {
      const [live, today] = await Promise.all([
        matchesApi.getLive().catch(() => ({ data: [] })),
        matchesApi.getToday().catch(() => ({ data: [] }))
      ]);
      setLiveMatches(live.data || []);
      setTodayMatches(today.data || []);
      setLastRefresh(new Date());
    } catch (e: any) {
      setError('Failed to load matches. Check your API configuration.');
    } finally {
      setLoading(l => ({ ...l, matches: false }));
    }
  }, []);

  useEffect(() => { fetchMatches(); }, [fetchMatches]);

  // Auto-refresh live every 60s
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === 'live') fetchMatches();
    }, 60000);
    return () => clearInterval(interval);
  }, [activeTab, fetchMatches]);

  // Select match & fetch analysis
  const handleMatchSelect = async (match: Match) => {
    setSelectedMatch(match);
    setPrediction(null);
    setAnalysis(null);
    setLoading(l => ({ ...l, analysis: true }));

    const hId = match.teams.home.id;
    const aId = match.teams.away.id;

    try {
      const [h2hData, predData] = await Promise.all([
        analysisApi.getH2H(hId, aId).catch(() => null),
        predictionsApi.generate({
          fixtureId: match.fixture.id,
          homeTeamId: hId,
          awayTeamId: aId,
          leagueId: match.league.id,
        }).catch(() => null)
      ]);

      setAnalysis(h2hData?.data || null);
      setPrediction(predData?.data?.prediction || null);
    } catch (e) {
      console.error('Analysis error', e);
    } finally {
      setLoading(l => ({ ...l, analysis: false }));
    }
  };

  const matches = activeTab === 'live' ? liveMatches : todayMatches;

  return (
    <div className="min-h-screen bg-pitch-950 bg-pitch-pattern">
      {/* Header */}
      <header className="border-b border-pitch-800/80 bg-pitch-950/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-neon-green/10 border border-neon-green/30 flex items-center justify-center">
              <Activity size={16} className="text-neon-green" />
            </div>
            <span className="font-display text-xl tracking-widest text-white">BETIQ</span>
            <span className="text-[10px] text-slate-500 border border-pitch-700 rounded px-1.5 py-0.5 font-mono">PREDICTION ENGINE</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono">
            <span>Updated {lastRefresh.toLocaleTimeString()}</span>
            <button onClick={fetchMatches} className="p-1.5 rounded-lg hover:bg-pitch-800 transition-colors">
              <RefreshCw size={12} className={loading.matches ? 'animate-spin text-neon-green' : 'text-slate-500'} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
        {/* Left: Match list */}
        <aside>
          {/* Tabs */}
          <div className="flex gap-1 mb-4 bg-pitch-900 rounded-xl p-1 border border-pitch-800/60">
            {(['live', 'today'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all
                  ${activeTab === tab
                    ? 'bg-pitch-700 text-white shadow'
                    : 'text-slate-500 hover:text-slate-300'
                  }`}
              >
                {tab === 'live' ? <><span className="live-dot w-1.5 h-1.5 rounded-full bg-neon-green" /> LIVE ({liveMatches.length})</> : <><Clock size={11} /> TODAY ({todayMatches.length})</>}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl border border-red-500/30 bg-red-500/10 flex items-start gap-2">
              <AlertCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}

          {/* Match list */}
          <div className="space-y-2">
            {loading.matches ? (
              Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-20" />)
            ) : matches.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">⚽</div>
                <p className="text-slate-500 text-sm">No {activeTab === 'live' ? 'live' : 'upcoming'} matches</p>
              </div>
            ) : (
              matches.map(match => (
                <MatchCard
                  key={match.fixture.id}
                  match={match}
                  selected={selectedMatch?.fixture.id === match.fixture.id}
                  onClick={() => handleMatchSelect(match)}
                />
              ))
            )}
          </div>
        </aside>

        {/* Right: Analysis panel */}
        <main>
          {!selectedMatch ? (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-2xl bg-pitch-800 border border-pitch-700/60 flex items-center justify-center mb-6">
                <TrendingUp size={32} className="text-neon-green/40" />
              </div>
              <h2 className="font-display text-2xl text-slate-300 tracking-wider mb-2">SELECT A MATCH</h2>
              <p className="text-slate-600 text-sm max-w-sm">
                Choose any match from the list to see H2H analysis, team form, odds movement, and AI predictions
              </p>
            </div>
          ) : (
            <div className="animate-fade-in space-y-4">
              {/* Match header */}
              <div className="rounded-xl border border-pitch-700/60 bg-pitch-900/80 p-5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-slate-500 tracking-wider uppercase">{selectedMatch.league.name}</span>
                  <span className={`text-[10px] font-mono font-bold ${getStatusColor(selectedMatch.fixture.status.short)}`}>
                    {selectedMatch.fixture.status.short === '1H' || selectedMatch.fixture.status.short === '2H'
                      ? `${selectedMatch.fixture.status.elapsed}'`
                      : selectedMatch.fixture.status.short}
                  </span>
                </div>

                <div className="flex items-center gap-4 mt-3">
                  <div className="flex-1 flex flex-col items-center gap-2">
                    <img src={selectedMatch.teams.home.logo} alt="" className="w-14 h-14 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <span className="text-sm font-bold text-white text-center">{selectedMatch.teams.home.name}</span>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1"><Home size={9} /> Home</span>
                  </div>

                  <div className="text-center flex-shrink-0">
                    {(selectedMatch.goals.home !== null) ? (
                      <div className="text-3xl font-display text-white tracking-wider">
                        {selectedMatch.goals.home} — {selectedMatch.goals.away}
                      </div>
                    ) : (
                      <div>
                        <div className="text-lg font-mono text-slate-400">VS</div>
                        <div className="text-xs text-neon-blue font-mono mt-1">
                          {new Date(selectedMatch.fixture.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col items-center gap-2">
                    <img src={selectedMatch.teams.away.logo} alt="" className="w-14 h-14 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <span className="text-sm font-bold text-white text-center">{selectedMatch.teams.away.name}</span>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1"><Plane size={9} /> Away</span>
                  </div>
                </div>
              </div>

              {/* Analysis loading */}
              {loading.analysis && (
                <div className="space-y-3">
                  <Skeleton className="h-40" />
                  <Skeleton className="h-32" />
                  <Skeleton className="h-24" />
                </div>
              )}

              {/* Prediction + Analysis */}
              {!loading.analysis && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left column */}
                  <div className="space-y-4">
                    {prediction && (
                      <PredictionCard
                        prediction={prediction}
                        homeTeam={selectedMatch.teams.home}
                        awayTeam={selectedMatch.teams.away}
                      />
                    )}

                    {/* Form */}
                    {analysis && (
                      <div className="rounded-xl border border-pitch-700/60 bg-pitch-900/60 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <TrendingUp size={14} className="text-neon-orange" />
                          <span className="text-xs font-semibold text-slate-400 tracking-wider">RECENT FORM</span>
                        </div>
                        <div className="space-y-3">
                          {[
                            { team: selectedMatch.teams.home, formData: analysis.homeForm, label: 'Home' },
                            { team: selectedMatch.teams.away, formData: analysis.awayForm, label: 'Away' },
                          ].map(({ team, formData, label }) => (
                            <div key={team.id}>
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                  <img src={team.logo} alt="" className="w-4 h-4 object-contain" />
                                  <span className="text-xs text-slate-300">{team.name}</span>
                                </div>
                                {formData?.analysis && (
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    {formData.analysis.avgGoalsFor} avg goals
                                  </span>
                                )}
                              </div>
                              <FormStrip matches={formData?.matches || []} teamId={team.id} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right column */}
                  <div className="space-y-4">
                    {analysis?.h2h && (
                      <H2HCard
                        h2h={analysis.h2h}
                        homeTeam={selectedMatch.teams.home}
                        awayTeam={selectedMatch.teams.away}
                      />
                    )}
                    {prediction?.factors && <FactorsCard factors={prediction.factors} />}
                  </div>
                </div>
              )}

              {!loading.analysis && !prediction && !analysis && (
                <div className="rounded-xl border border-pitch-700/60 bg-pitch-900/60 p-8 text-center">
                  <AlertCircle size={24} className="text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">Could not load analysis. Check your API keys in .env</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
