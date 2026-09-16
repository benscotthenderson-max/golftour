import React, { useState } from 'react';
import { useGolfMatch } from '../context/GolfMatchContext';
import { GolferUser, GameType } from '../types/golf';
import { getStrokeDotsSymbol } from '../utils/handicapEngine';
import { getScoreTerminology } from '../utils/scoringFormats';
import { 
  Flag, 
  MapPin, 
  Wifi, 
  Users, 
  Trophy, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Minus, 
  Sparkles, 
  Check, 
  Activity, 
  Eye, 
  Play, 
  RefreshCw, 
  Radio, 
  Share2, 
  Award, 
  ArrowRight,
  ShieldAlert,
  Info,
  Clock,
  Compass
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ActiveMatchScoringProps {
  currentUser: GolferUser;
  onClose: () => void;
  onRoundFinished?: (summary: any) => void;
}

export const ActiveMatchScoring: React.FC<ActiveMatchScoringProps> = ({
  currentUser,
  onClose,
  onRoundFinished,
}) => {
  const {
    activeMatch,
    activeCourse,
    strokeAllocations,
    currentHoleNumber,
    currentHole,
    currentScorerId,
    isSpectatorMode,
    isSyncing,
    syncStatus,
    lastSyncedAt,
    simulateOpponentEnabled,
    liveAuditLogs,
    leaderboard,
    matchPlayStatus,
    betterBallStanding,
    selectHole,
    nextHole,
    prevHole,
    updateHoleScore,
    quickScorePreset,
    switchScorer,
    toggleSpectatorMode,
    toggleSimulateOpponent,
    simulateOpponentNextHole,
    finishAndPublishRound,
  } = useGolfMatch();

  const [activeTab, setActiveTab] = useState<'score' | 'leaderboard' | 'matrix' | 'live_feed'>('score');
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showLogsDrawer, setShowLogsDrawer] = useState(false);

  if (!activeMatch || !activeCourse || !currentHole) {
    return (
      <div className="p-6 text-center space-y-3 bg-white rounded-3xl border border-slate-200 shadow-xs">
        <Flag className="w-8 h-8 text-slate-400 mx-auto" />
        <h3 className="font-black text-slate-900">No Active Match in Progress</h3>
        <p className="text-xs text-slate-500">Please select or host an open tee time from the Matches tab.</p>
        <button
          onClick={onClose}
          className="py-2 px-4 rounded-xl bg-emerald-900 text-white font-bold text-xs cursor-pointer shadow-xs"
        >
          Return to Matches
        </button>
      </div>
    );
  }

  const activePlayer = activeMatch.players.find(p => p.userId === currentScorerId) || activeMatch.players[0];
  const activeAlloc = strokeAllocations[activePlayer?.userId] || {
    holeStrokes: {},
    playingHandicap: Math.round(activePlayer?.handicapIndex || 0),
    courseHandicap: Math.round(activePlayer?.handicapIndex || 0),
  };

  const currentHoleScore = activePlayer?.holeScores.find(h => h.holeNumber === currentHoleNumber) || {
    grossScore: 0,
    netScore: 0,
    stablefordPoints: 0,
    putts: 2,
    fairwayHit: true,
    greenInRegulation: true,
  };

  const strokeDots = activeAlloc.holeStrokes[currentHoleNumber] ?? 0;
  const strokeDotSymbol = getStrokeDotsSymbol(strokeDots);
  const currentNetScore = currentHoleScore.grossScore > 0 ? Math.max(1, currentHoleScore.grossScore - strokeDots) : 0;
  const scoreTermData = getScoreTerminology(currentHoleScore.grossScore, currentHole.par);

  const handleScoreChange = (delta: number) => {
    const current = currentHoleScore.grossScore || currentHole.par;
    const newScore = Math.max(1, Math.min(12, current + delta));
    updateHoleScore(activePlayer.userId, currentHoleNumber, { grossScore: newScore });
  };

  const handlePuttsChange = (putts: number) => {
    updateHoleScore(activePlayer.userId, currentHoleNumber, {
      grossScore: currentHoleScore.grossScore || currentHole.par,
      putts,
    });
  };

  const handleFairwayToggle = () => {
    updateHoleScore(activePlayer.userId, currentHoleNumber, {
      grossScore: currentHoleScore.grossScore || currentHole.par,
      fairwayHit: !currentHoleScore.fairwayHit,
    });
  };

  const handleGirToggle = () => {
    updateHoleScore(activePlayer.userId, currentHoleNumber, {
      grossScore: currentHoleScore.grossScore || currentHole.par,
      greenInRegulation: !currentHoleScore.greenInRegulation,
    });
  };

  const handleFinishRound = () => {
    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.5 },
      });
    } catch {
      // ignore
    }
    const summary = finishAndPublishRound();
    setShowFinishModal(false);
    if (onRoundFinished && summary) {
      onRoundFinished(summary);
    }
  };

  return (
    <div id="active-match-scoring-screen" className="space-y-3 pb-24 animate-in fade-in duration-200">
      {/* Real-Time Status & Match Info Top Bar */}
      <div className="bg-slate-900 text-white p-3 rounded-2xl border border-slate-800 space-y-2 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-2xs font-extrabold uppercase px-2 py-0.5 rounded-full">
              <span className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 animate-pulse'}`} />
              {isSyncing ? 'Firestore Syncing...' : 'Live Synced'}
            </span>
            <span className="text-2xs font-bold text-slate-300 uppercase tracking-wider bg-slate-800 px-2 py-0.5 rounded-md">
              {(activeMatch.gameType || 'stroke_play').replace(/_/g, ' ')}
            </span>
          </div>

          {/* Remote Spectator / Scorer Selector */}
          <div className="flex items-center gap-1">
            <button
              onClick={toggleSpectatorMode}
              className={`p-1.5 rounded-lg text-2xs font-bold transition cursor-pointer flex items-center gap-1 ${
                isSpectatorMode ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
              title="Toggle Live Spectator Mode"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isSpectatorMode ? 'Spectating' : 'Player'}</span>
            </button>

            <button
              onClick={onClose}
              className="py-1 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-2xs font-bold transition cursor-pointer"
            >
              Back
            </button>
          </div>
        </div>

        {/* Course Info & Weather Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-black text-white leading-tight">{activeCourse.name}</h3>
            <p className="text-2xs text-slate-400 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-emerald-400 shrink-0" /> {activeCourse.location}
            </p>
          </div>

          <div className="text-right">
            <span className="text-2xs font-bold text-emerald-400 block">Par {activeCourse.par} • 18 Holes</span>
            <span className="text-2xs text-slate-400">{activeMatch.weather?.temp}°F {activeMatch.weather?.condition} • {activeMatch.weather?.windMph}mph</span>
          </div>
        </div>

        {/* Scorer Perspective Switcher Pills */}
        <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between gap-2 overflow-x-auto text-2xs">
          <span className="text-slate-400 font-bold shrink-0">Active Scorer:</span>
          <div className="flex items-center gap-1 overflow-x-auto">
            {activeMatch.players.map(p => {
              const isSelected = p.userId === currentScorerId;
              const alloc = strokeAllocations[p.userId];
              return (
                <button
                  key={p.userId}
                  onClick={() => switchScorer(p.userId)}
                  className={`py-1 px-2 rounded-lg font-bold transition flex items-center gap-1 shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <img src={p.photoURL} alt={p.displayName} className="w-3.5 h-3.5 rounded-full object-cover" />
                  <span>{p.displayName.split(' ')[0]}</span>
                  <span className="text-2xs opacity-80">(PH: {alloc?.playingHandicap})</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 18-Hole Horizontal Scroll Navigator */}
      <div className="bg-white border border-slate-200 p-2 rounded-2xl shadow-2xs">
        <div className="flex items-center justify-between text-2xs font-black text-slate-500 mb-1.5 px-1">
          <span>HOLE SELECTOR</span>
          <span className="text-emerald-800 font-bold">
            {activePlayer.holeScores.filter(h => h.grossScore > 0).length}/18 Completed
          </span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {Array.from({ length: 18 }, (_, i) => i + 1).map(hNum => {
            const isSelected = hNum === currentHoleNumber;
            const holeDef = activeCourse.holes?.find(h => h.holeNumber === hNum) || { par: 4, strokeIndex: 1 };
            const scoreObj = activePlayer.holeScores.find(h => h.holeNumber === hNum);
            const gross = scoreObj?.grossScore || 0;
            const hasScore = gross > 0;
            const dots = activeAlloc.holeStrokes[hNum] || 0;

            let badgeColor = 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200';
            if (isSelected) {
              badgeColor = 'bg-emerald-900 text-white border-emerald-900 ring-2 ring-emerald-600/30';
            } else if (hasScore) {
              const diff = gross - holeDef.par;
              if (diff <= -1) badgeColor = 'bg-emerald-700 text-white border-emerald-800';
              else if (diff === 0) badgeColor = 'bg-slate-200 text-slate-900 border-slate-300';
              else badgeColor = 'bg-rose-100 text-rose-800 border-rose-300';
            }

            return (
              <button
                key={hNum}
                onClick={() => selectHole(hNum)}
                className={`py-1.5 px-2.5 rounded-xl border flex flex-col items-center justify-center shrink-0 min-w-[42px] transition cursor-pointer ${badgeColor}`}
              >
                <div className="flex items-center gap-0.5">
                  <span className="text-2xs font-black leading-none">{hNum}</span>
                  {dots > 0 && <span className="text-amber-400 text-3xs leading-none font-bold">●</span>}
                </div>
                <span className="text-3xs opacity-80 leading-none mt-0.5">
                  {hasScore ? gross : `P${holeDef.par}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Format-Specific Real-Time Standings Banner */}
      {activeMatch.gameType === 'match_play' && matchPlayStatus && (
        <div className="bg-gradient-to-r from-emerald-950 to-slate-900 text-white p-3.5 rounded-2xl border border-emerald-800 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
                Live Matchplay Status
              </span>
            </div>
            <span className="text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md">
              {matchPlayStatus.statusText}
            </span>
          </div>

          {/* Hole History Mini-Bar */}
          <div className="grid grid-cols-18 gap-0.5 pt-1">
            {Array.from({ length: 18 }, (_, i) => i + 1).map(hNum => {
              const res = matchPlayStatus.history.find(h => h.holeNumber === hNum);
              let barBg = 'bg-slate-800';
              if (res) {
                if (res.winnerUserId === activeMatch.players[0].userId) barBg = 'bg-emerald-500';
                else if (res.winnerUserId === activeMatch.players[1]?.userId) barBg = 'bg-rose-500';
                else if (res.winnerUserId === 'HALVED') barBg = 'bg-amber-400';
              }
              return (
                <div
                  key={hNum}
                  title={`Hole ${hNum}: ${res ? res.standingDescription : 'Unplayed'}`}
                  className={`h-2 rounded-xs ${barBg} ${hNum === currentHoleNumber ? 'ring-1 ring-white' : ''}`}
                />
              );
            })}
          </div>
          <div className="flex items-center justify-between text-3xs text-slate-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-xs" /> {activeMatch.players[0]?.displayName.split(' ')[0]} Win</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-400 rounded-xs" /> Halved</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-rose-500 rounded-xs" /> {activeMatch.players[1]?.displayName.split(' ')[0]} Win</span>
          </div>
        </div>
      )}

      {activeMatch.gameType === 'better_ball' && betterBallStanding && (
        <div className="bg-gradient-to-r from-emerald-950 to-slate-900 text-white p-3.5 rounded-2xl border border-emerald-800 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
                Better Ball (Fourball 2v2)
              </span>
            </div>
            <span className="text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md">
              {betterBallStanding.matchPlayStatus.statusText}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-2xs pt-1">
            <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700">
              <span className="font-bold text-emerald-300 block">{betterBallStanding.teamAName}</span>
              <span className="text-slate-400">{betterBallStanding.teamAPlayers.join(' & ')}</span>
              <span className="font-black text-white block mt-0.5">{betterBallStanding.teamATotalStableford} Stableford Pts</span>
            </div>
            <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700">
              <span className="font-bold text-amber-300 block">{betterBallStanding.teamBName}</span>
              <span className="text-slate-400">{betterBallStanding.teamBPlayers.join(' & ')}</span>
              <span className="font-black text-white block mt-0.5">{betterBallStanding.teamBTotalStableford} Stableford Pts</span>
            </div>
          </div>
        </div>
      )}

      {/* Subview Tabs: Score Entry | Leaderboard | 18-Hole Matrix | Live Stream */}
      <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200 shadow-2xs">
        <button
          onClick={() => setActiveTab('score')}
          className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-black transition cursor-pointer text-center ${
            activeTab === 'score' ? 'bg-emerald-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Hole Entry
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-black transition cursor-pointer text-center ${
            activeTab === 'leaderboard' ? 'bg-emerald-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Standings
        </button>
        <button
          onClick={() => setActiveTab('matrix')}
          className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-black transition cursor-pointer text-center ${
            activeTab === 'matrix' ? 'bg-emerald-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Scorecard
        </button>
        <button
          onClick={() => setActiveTab('live_feed')}
          className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-black transition cursor-pointer text-center flex items-center justify-center gap-1 ${
            activeTab === 'live_feed' ? 'bg-emerald-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> Live Sync
        </button>
      </div>

      {/* TAB 1: HOLE-BY-HOLE LIVE SCORING */}
      {activeTab === 'score' && (
        <div className="space-y-3">
          {/* Current Hole Hero Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs space-y-3">
            {/* Top Hole Title & Nav Controls */}
            <div className="flex items-center justify-between">
              <button
                onClick={prevHole}
                disabled={currentHoleNumber <= 1}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5 text-slate-700" />
              </button>

              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-xl font-black text-slate-900">HOLE #{currentHoleNumber}</span>
                  {currentHole.feature && (
                    <span className="text-2xs font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                      {currentHole.feature}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-600 mt-0.5">
                  <span>Par {currentHole.par}</span>
                  <span>•</span>
                  <span className="text-emerald-800">Stroke Index {currentHole.strokeIndex} {currentHole.strokeIndex === 1 && '(Hardest)'}</span>
                  <span>•</span>
                  <span>{currentHole.distances?.whiteMeters || 360}m</span>
                </div>
              </div>

              <button
                onClick={nextHole}
                disabled={currentHoleNumber >= 18}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
              >
                <ChevronRight className="w-5 h-5 text-slate-700" />
              </button>
            </div>

            {/* WHS Handicap Stroke Dots Allocation Banner for This Hole */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between text-2xs">
                <span className="font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-emerald-700" /> WHS Handicap Stroke Allocation
                </span>
                <span className="text-slate-500 font-bold">Hole SI: {currentHole.strokeIndex}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {activeMatch.players.map(p => {
                  const pAlloc = strokeAllocations[p.userId];
                  const dots = pAlloc?.holeStrokes[currentHoleNumber] || 0;
                  const isCurrent = p.userId === activePlayer.userId;

                  return (
                    <div
                      key={p.userId}
                      className={`p-2 rounded-xl border text-2xs space-y-0.5 ${
                        isCurrent
                          ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-500/20'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 truncate max-w-[70px]">{p.displayName.split(' ')[0]}</span>
                        <span className="text-3xs font-bold bg-slate-200 text-slate-800 px-1 rounded">PH: {pAlloc?.playingHandicap}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-3xs">Strokes Rec'd:</span>
                        <span className="font-black text-emerald-800 text-xs">
                          {dots > 0 ? (
                            <span className="text-amber-500 font-black">{getStrokeDotsSymbol(dots)} ({dots})</span>
                          ) : (
                            <span className="text-slate-400 font-normal">0</span>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Main Player Gross Score Counter */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <img
                    src={activePlayer.photoURL}
                    alt={activePlayer.displayName}
                    className="w-10 h-10 rounded-full object-cover border-2 border-emerald-400 shadow-xs"
                  />
                  <div>
                    <h4 className="font-black text-sm text-white">{activePlayer.displayName}</h4>
                    <p className="text-2xs text-emerald-300 font-semibold">
                      Playing HCP {activeAlloc.playingHandicap} • {strokeDots > 0 ? `${strokeDots} Stroke Dot (${strokeDotSymbol})` : 'No Strokes Rec\'d'}
                    </p>
                  </div>
                </div>

                {/* Score Term Badge */}
                {currentHoleScore.grossScore > 0 && (
                  <span className={`text-xs font-black uppercase px-3 py-1 rounded-xl shadow-xs ${scoreTermData.badgeClass}`}>
                    {scoreTermData.term}
                  </span>
                )}
              </div>

              {/* Large Counter Controls */}
              <div className="flex items-center justify-center gap-6 py-2">
                <button
                  onClick={() => handleScoreChange(-1)}
                  className="w-12 h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition cursor-pointer shadow-md active:scale-95 border border-slate-700"
                >
                  <Minus className="w-6 h-6" />
                </button>

                <div className="text-center min-w-[90px]">
                  <span className="text-5xl font-black text-white tracking-tight">
                    {currentHoleScore.grossScore || currentHole.par}
                  </span>
                  <span className="text-2xs font-extrabold uppercase text-slate-400 block mt-0.5 tracking-wider">
                    Gross Score
                  </span>
                </div>

                <button
                  onClick={() => handleScoreChange(1)}
                  className="w-12 h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition cursor-pointer shadow-md active:scale-95 shadow-emerald-900/30"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </div>

              {/* Net Score & Stableford Points Calculation Summary */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center">
                <div className="bg-slate-800/80 p-2 rounded-xl">
                  <span className="text-3xs uppercase font-bold text-slate-400 block">Allocated Strokes</span>
                  <span className="text-sm font-black text-amber-400">{strokeDotSymbol || '0'}</span>
                </div>
                <div className="bg-slate-800/80 p-2 rounded-xl">
                  <span className="text-3xs uppercase font-bold text-slate-400 block">Net Score</span>
                  <span className="text-sm font-black text-emerald-400">
                    {currentNetScore || Math.max(1, currentHole.par - strokeDots)}
                  </span>
                </div>
                <div className="bg-slate-800/80 p-2 rounded-xl">
                  <span className="text-3xs uppercase font-bold text-slate-400 block">Stableford Points</span>
                  <span className="text-sm font-black text-white">
                    {currentHoleScore.stablefordPoints || 2} pts
                  </span>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="space-y-1 pt-1">
                <span className="text-3xs font-bold uppercase text-slate-400 tracking-wider">Quick Presets:</span>
                <div className="grid grid-cols-5 gap-1 text-2xs font-bold">
                  <button
                    onClick={() => quickScorePreset(activePlayer.userId, currentHoleNumber, 'eagle')}
                    className="py-1.5 bg-amber-400 text-slate-950 rounded-lg hover:bg-amber-300 transition cursor-pointer font-black"
                  >
                    Eagle ({currentHole.par - 2})
                  </button>
                  <button
                    onClick={() => quickScorePreset(activePlayer.userId, currentHoleNumber, 'birdie')}
                    className="py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition cursor-pointer font-black"
                  >
                    Birdie ({currentHole.par - 1})
                  </button>
                  <button
                    onClick={() => quickScorePreset(activePlayer.userId, currentHoleNumber, 'par')}
                    className="py-1.5 bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 transition cursor-pointer"
                  >
                    Par ({currentHole.par})
                  </button>
                  <button
                    onClick={() => quickScorePreset(activePlayer.userId, currentHoleNumber, 'bogey')}
                    className="py-1.5 bg-rose-900/80 text-rose-200 rounded-lg hover:bg-rose-900 transition cursor-pointer"
                  >
                    Bogey ({currentHole.par + 1})
                  </button>
                  <button
                    onClick={() => quickScorePreset(activePlayer.userId, currentHoleNumber, 'double')}
                    className="py-1.5 bg-rose-950 text-rose-300 rounded-lg hover:bg-rose-900 transition cursor-pointer"
                  >
                    Dbl ({currentHole.par + 2})
                  </button>
                </div>
              </div>

              {/* Hole Stats: Putts, Fairway Hit, GIR */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-2xs">
                {/* Putts */}
                <div className="bg-slate-800/80 p-2 rounded-xl text-center space-y-1">
                  <span className="text-3xs text-slate-400 uppercase font-bold block">Putts</span>
                  <div className="flex items-center justify-center gap-1">
                    {[1, 2, 3].map(pNum => (
                      <button
                        key={pNum}
                        onClick={() => handlePuttsChange(pNum)}
                        className={`w-6 h-6 rounded-lg text-xs font-bold transition cursor-pointer ${
                          currentHoleScore.putts === pNum ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {pNum}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fairway Hit */}
                <div className="bg-slate-800/80 p-2 rounded-xl text-center space-y-1">
                  <span className="text-3xs text-slate-400 uppercase font-bold block">Fairway</span>
                  <button
                    onClick={handleFairwayToggle}
                    className={`w-full py-1 rounded-lg text-2xs font-bold transition cursor-pointer ${
                      currentHoleScore.fairwayHit ? 'bg-emerald-600 text-white' : 'bg-rose-900/80 text-rose-300'
                    }`}
                  >
                    {currentHoleScore.fairwayHit ? 'Hit Fairway' : 'Missed'}
                  </button>
                </div>

                {/* GIR */}
                <div className="bg-slate-800/80 p-2 rounded-xl text-center space-y-1">
                  <span className="text-3xs text-slate-400 uppercase font-bold block">Green in Reg</span>
                  <button
                    onClick={handleGirToggle}
                    className={`w-full py-1 rounded-lg text-2xs font-bold transition cursor-pointer ${
                      currentHoleScore.greenInRegulation ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {currentHoleScore.greenInRegulation ? 'GIR Yes' : 'No'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Playing Partner / Opponent Score Entry Inputs */}
          {activeMatch.players.filter(p => p.userId !== activePlayer.userId).length > 0 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-slate-900 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-700" /> Playing Partners / Opponents on Hole #{currentHoleNumber}
                </span>
                <button
                  onClick={simulateOpponentNextHole}
                  className="py-1 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-2xs font-bold transition border border-emerald-200 flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" /> Simulate Opponent Score
                </button>
              </div>

              <div className="space-y-2">
                {activeMatch.players
                  .filter(p => p.userId !== activePlayer.userId)
                  .map(partner => {
                    const partAlloc = strokeAllocations[partner.userId];
                    const partScoreObj = partner.holeScores.find(h => h.holeNumber === currentHoleNumber);
                    const partGross = partScoreObj?.grossScore || 0;
                    const partDots = partAlloc?.holeStrokes[currentHoleNumber] || 0;
                    const partNet = partGross > 0 ? partGross - partDots : 0;

                    return (
                      <div
                        key={partner.userId}
                        className="bg-slate-50 border border-slate-200 p-2.5 rounded-2xl flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <img
                            src={partner.photoURL}
                            alt={partner.displayName}
                            className="w-8 h-8 rounded-full object-cover border border-slate-300"
                          />
                          <div>
                            <span className="font-bold text-xs text-slate-900 block">{partner.displayName}</span>
                            <span className="text-3xs text-slate-500">
                              PH: {partAlloc?.playingHandicap} • {partDots > 0 ? `${partDots} stroke dot (${getStrokeDotsSymbol(partDots)})` : '0 strokes'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              const curr = partGross || currentHole.par;
                              updateHoleScore(partner.userId, currentHoleNumber, { grossScore: Math.max(1, curr - 1) });
                            }}
                            className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold flex items-center justify-center hover:bg-slate-100 cursor-pointer"
                          >
                            -
                          </button>
                          <div className="w-10 text-center">
                            <span className="font-black text-sm text-slate-900">{partGross || '-'}</span>
                            <span className="text-3xs text-slate-500 block leading-none">{partGross > 0 ? `Net ${partNet}` : `P${currentHole.par}`}</span>
                          </div>
                          <button
                            onClick={() => {
                              const curr = partGross || currentHole.par;
                              updateHoleScore(partner.userId, currentHoleNumber, { grossScore: Math.min(12, curr + 1) });
                            }}
                            className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold flex items-center justify-center hover:bg-slate-100 cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Action Row: Next Hole & Finish Round */}
          <div className="flex items-center gap-2">
            {currentHoleNumber < 18 ? (
              <button
                onClick={nextHole}
                className="flex-1 py-3 rounded-2xl bg-emerald-900 hover:bg-emerald-800 text-white font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <span>Save & Proceed to Hole #{currentHoleNumber + 1}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setShowFinishModal(true)}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-800 hover:from-emerald-500 hover:to-emerald-700 text-white font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-900/30"
              >
                <Trophy className="w-4 h-4" />
                <span>Finish Round & Verify Scorecard</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: LIVE LEADERBOARD & STANDINGS */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-3">
          <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-emerald-700" /> Live Match Standings & Leaderboard
                </h3>
                <p className="text-2xs text-slate-500">
                  Real-time WHS adjusted leaderboard with net totals and Stableford points.
                </p>
              </div>
              <span className="text-2xs font-extrabold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                {(activeMatch.gameType || 'stroke_play').replace(/_/g, ' ')}
              </span>
            </div>

            <div className="space-y-2">
              {leaderboard.map(item => {
                const isMe = item.player.userId === currentUser.id;
                const pAlloc = strokeAllocations[item.player.userId];

                return (
                  <div
                    key={item.player.userId}
                    className={`p-3 rounded-2xl border flex items-center justify-between ${
                      isMe ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-500/20' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${
                        item.rank === 1 ? 'bg-amber-400 text-slate-950' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {item.rank}
                      </div>
                      <img
                        src={item.player.photoURL}
                        alt={item.player.displayName}
                        className="w-9 h-9 rounded-full object-cover border border-slate-300"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-900">{item.player.displayName}</span>
                          {isMe && <span className="text-3xs font-extrabold bg-emerald-200 text-emerald-900 px-1 rounded">YOU</span>}
                        </div>
                        <span className="text-3xs text-slate-500">
                          Playing HCP {pAlloc?.playingHandicap} • {item.holesCompleted}/18 Thru
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <span className="text-3xs uppercase font-bold text-slate-400 block">Gross</span>
                        <span className="text-xs font-bold text-slate-900">{item.grossTotal || '-'}</span>
                      </div>
                      <div className="h-6 w-px bg-slate-200" />
                      <div>
                        <span className="text-3xs uppercase font-black text-emerald-800 block">Net</span>
                        <span className="text-xs font-black text-emerald-700">{item.netTotal || '-'}</span>
                      </div>
                      <div className="h-6 w-px bg-slate-200" />
                      <div>
                        <span className="text-3xs uppercase font-bold text-slate-400 block">Stableford</span>
                        <span className="text-xs font-black text-slate-900">{item.stablefordTotal} pts</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: 18-HOLE SCORECARD MATRIX */}
      {activeTab === 'matrix' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900">Official 18-Hole Match Scorecard</h3>
              <p className="text-2xs text-slate-500">Front 9 (Out) & Back 9 (In) with Stroke Index ratings</p>
            </div>
            <span className="text-2xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
              Par {activeCourse.par}
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-xs text-center">
              <thead className="bg-slate-100 text-slate-700 text-2xs uppercase font-black">
                <tr>
                  <th className="py-2 px-2 text-left">Hole</th>
                  {Array.from({ length: 9 }, (_, i) => i + 1).map(n => (
                    <th key={n} className="py-2 px-1">{n}</th>
                  ))}
                  <th className="py-2 px-1 bg-slate-200 text-slate-900">OUT</th>
                  {Array.from({ length: 9 }, (_, i) => i + 10).map(n => (
                    <th key={n} className="py-2 px-1">{n}</th>
                  ))}
                  <th className="py-2 px-1 bg-slate-200 text-slate-900">IN</th>
                  <th className="py-2 px-1.5 bg-emerald-900 text-white">TOT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-2xs">
                {/* Par Row */}
                <tr className="bg-slate-50 font-bold text-slate-600">
                  <td className="py-1.5 px-2 text-left font-black">Par</td>
                  {Array.from({ length: 9 }, (_, i) => {
                    const h = activeCourse.holes?.find(x => x.holeNumber === i + 1);
                    return <td key={i} className="py-1.5 px-1">{h?.par || 4}</td>;
                  })}
                  <td className="py-1.5 px-1 font-black bg-slate-100">36</td>
                  {Array.from({ length: 9 }, (_, i) => {
                    const h = activeCourse.holes?.find(x => x.holeNumber === i + 10);
                    return <td key={i} className="py-1.5 px-1">{h?.par || 4}</td>;
                  })}
                  <td className="py-1.5 px-1 font-black bg-slate-100">36</td>
                  <td className="py-1.5 px-1.5 font-black bg-emerald-100 text-emerald-900">{activeCourse.par}</td>
                </tr>

                {/* Stroke Index Row */}
                <tr className="text-slate-400">
                  <td className="py-1 px-2 text-left font-bold text-emerald-800">SI</td>
                  {Array.from({ length: 9 }, (_, i) => {
                    const h = activeCourse.holes?.find(x => x.holeNumber === i + 1);
                    return <td key={i} className="py-1 px-1 font-medium">{h?.strokeIndex}</td>;
                  })}
                  <td className="py-1 px-1 bg-slate-100">-</td>
                  {Array.from({ length: 9 }, (_, i) => {
                    const h = activeCourse.holes?.find(x => x.holeNumber === i + 10);
                    return <td key={i} className="py-1 px-1 font-medium">{h?.strokeIndex}</td>;
                  })}
                  <td className="py-1 px-1 bg-slate-100">-</td>
                  <td className="py-1 px-1.5 bg-emerald-50 font-bold text-emerald-800">-</td>
                </tr>

                {/* Players Rows */}
                {activeMatch.players.map(p => {
                  const pAlloc = strokeAllocations[p.userId];
                  const frontScores = p.holeScores.filter(h => h.holeNumber <= 9);
                  const backScores = p.holeScores.filter(h => h.holeNumber > 9);
                  const frontTot = frontScores.reduce((s, h) => s + (h.grossScore || 0), 0);
                  const backTot = backScores.reduce((s, h) => s + (h.grossScore || 0), 0);
                  const totalGross = frontTot + backTot;

                  return (
                    <tr key={p.userId} className="hover:bg-slate-50 font-semibold text-slate-800">
                      <td className="py-2 px-2 text-left font-black text-slate-900 truncate max-w-[80px]">
                        {p.displayName.split(' ')[0]}
                      </td>
                      {Array.from({ length: 9 }, (_, i) => {
                        const hScore = p.holeScores.find(x => x.holeNumber === i + 1);
                        const gross = hScore?.grossScore || 0;
                        const dots = pAlloc?.holeStrokes[i + 1] || 0;
                        return (
                          <td key={i} className="py-2 px-1">
                            <span className="font-bold">{gross || '-'}</span>
                            {dots > 0 && <span className="text-3xs text-amber-500 font-black block">●</span>}
                          </td>
                        );
                      })}
                      <td className="py-2 px-1 font-black bg-slate-100">{frontTot || '-'}</td>
                      {Array.from({ length: 9 }, (_, i) => {
                        const hScore = p.holeScores.find(x => x.holeNumber === i + 10);
                        const gross = hScore?.grossScore || 0;
                        const dots = pAlloc?.holeStrokes[i + 10] || 0;
                        return (
                          <td key={i} className="py-2 px-1">
                            <span className="font-bold">{gross || '-'}</span>
                            {dots > 0 && <span className="text-3xs text-amber-500 font-black block">●</span>}
                          </td>
                        );
                      })}
                      <td className="py-2 px-1 font-black bg-slate-100">{backTot || '-'}</td>
                      <td className="py-2 px-1.5 font-black bg-emerald-900 text-white">{totalGross || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: REAL-TIME SYNC & AUDIT TRAIL STREAM */}
      {activeTab === 'live_feed' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-emerald-700 animate-pulse" /> Live Firestore Synchronization Stream
              </h3>
              <p className="text-2xs text-slate-500">
                Incoming stroke mutations and real-time remote spectator telemetry.
              </p>
            </div>
            <button
              onClick={toggleSimulateOpponent}
              className={`py-1 px-2.5 rounded-xl text-2xs font-bold transition flex items-center gap-1 cursor-pointer ${
                simulateOpponentEnabled ? 'bg-emerald-900 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {simulateOpponentEnabled ? 'Automated Sync ON' : 'Automated Sync OFF'}
            </button>
          </div>

          {/* Terminal-Style Log Stream */}
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 max-h-72 overflow-y-auto space-y-2 font-mono text-2xs">
            {liveAuditLogs.map(log => (
              <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                <span className={
                  log.type === 'score' ? 'text-emerald-400' :
                  log.type === 'match_status' ? 'text-amber-300 font-bold' :
                  log.type === 'sync' ? 'text-blue-400' :
                  'text-slate-300'
                }>
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FINISH ROUND MODAL */}
      {showFinishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Finish & Post Scorecard?</h3>
              <p className="text-xs text-slate-600 mt-1">
                Your 18-hole score will be attested, uploaded to Firestore, and published to the Playtomic Community Feed.
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 grid grid-cols-2 gap-2 text-center text-xs">
              <div>
                <span className="text-3xs uppercase font-bold text-slate-400 block">Total Gross</span>
                <span className="text-base font-black text-slate-900">
                  {activePlayer.holeScores.reduce((s, h) => s + (h.grossScore || 0), 0) || 72}
                </span>
              </div>
              <div>
                <span className="text-3xs uppercase font-bold text-slate-400 block">Total Net</span>
                <span className="text-base font-black text-emerald-700">
                  {activePlayer.holeScores.reduce((s, h) => s + (h.netScore || 0), 0) || 72}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFinishModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleFinishRound}
                className="flex-1 py-2.5 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-white font-black text-xs transition cursor-pointer shadow-xs"
              >
                Confirm & Publish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
