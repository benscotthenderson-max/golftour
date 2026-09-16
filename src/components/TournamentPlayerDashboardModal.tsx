import React, { useState, useMemo } from 'react';
import { 
  Tournament, 
  TournamentRound, 
  TournamentMatch, 
  GolferUser, 
  PlayerMvpRankingEntry 
} from '../types/golf';
import { 
  getPlayerRoundSnapshots, 
  PlayerRoundSnapshot, 
  PlayerHoleDetail 
} from '../utils/scorecardCalculations';
import { 
  X, 
  Trophy, 
  Flag, 
  Calendar, 
  MapPin, 
  ChevronRight, 
  ChevronDown, 
  CheckCircle2, 
  Flame, 
  Award, 
  Star, 
  Eye, 
  Shield, 
  ExternalLink, 
  Target, 
  Sparkles, 
  Hash, 
  BarChart3, 
  Users,
  Check,
  TrendingUp,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Color helper for alpha tinting
function hexToRgba(hex?: string, alpha = 1): string {
  if (!hex || !hex.startsWith('#')) return `rgba(5, 150, 105, ${alpha})`;
  let c = hex.substring(1);
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return `rgba(5, 150, 105, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface TournamentPlayerDashboardModalProps {
  player: PlayerMvpRankingEntry | GolferUser;
  tournament: Tournament;
  allUsers?: GolferUser[];
  onClose: () => void;
  onOpenMatchScorecard?: (match: TournamentMatch, round: TournamentRound) => void;
}

export const TournamentPlayerDashboardModal: React.FC<TournamentPlayerDashboardModalProps> = ({
  player,
  tournament,
  allUsers = [],
  onClose,
  onOpenMatchScorecard,
}) => {
  const playerId = 'userId' in player ? player.userId : player.id;

  // Resolve team
  const playerTeam = useMemo(() => {
    if ('teamId' in player && player.teamId) {
      return tournament.teams.find(t => t.id === player.teamId);
    }
    return tournament.teams.find(t => t.playerIds.includes(playerId));
  }, [player, tournament, playerId]);

  const teamColor = playerTeam?.color || ('teamColor' in player ? player.teamColor : '#059669') || '#059669';
  const teamName = playerTeam?.name || ('teamName' in player ? player.teamName : 'Golfer Team');
  const teamBadge = playerTeam?.badgeIcon || '⛳️';

  // Resolve MVP standing record
  const mvpEntry = useMemo(() => {
    return tournament.leaderboard?.playerRankings?.find(p => p.userId === playerId);
  }, [tournament, playerId]);

  const mvpRank = mvpEntry?.mvpRank || (tournament.leaderboard?.playerRankings?.findIndex(p => p.userId === playerId) ?? -1) + 1;
  const handicap = mvpEntry?.handicapIndex ?? player.handicapIndex ?? 10.0;
  const playtomicLevel = mvpEntry?.playtomicLevel ?? player.playtomicLevel ?? 4.0;

  // Compute all round snapshots
  const roundSnapshots: PlayerRoundSnapshot[] = useMemo(() => {
    return getPlayerRoundSnapshots(playerId, tournament, allUsers);
  }, [playerId, tournament, allUsers]);

  // Expanded round selection state
  const [expandedRoundId, setExpandedRoundId] = useState<string | null>(() => {
    return roundSnapshots[0]?.round.id || null;
  });

  const [selectedHoleNum, setSelectedHoleNum] = useState<number>(1);
  const [scorecardViewMode, setScorecardViewMode] = useState<'table' | 'cards'>('table');

  // Overall tournament performance stats across completed rounds
  const overallStats = useMemo(() => {
    const completed = roundSnapshots.filter(s => s.status === 'completed');
    const totalGross = completed.reduce((sum, s) => sum + s.grossScore, 0);
    const totalNet = completed.reduce((sum, s) => sum + s.netScore, 0);
    const totalPar = completed.reduce((sum, s) => sum + s.courseParOfPlayedHoles, 0);
    const toParGross = completed.length > 0 ? totalGross - totalPar : 0;
    const toParNet = completed.length > 0 ? totalNet - totalPar : 0;

    const formatDiff = (diff: number) => {
      if (completed.length === 0) return 'E';
      if (diff < 0) return `${diff}`;
      if (diff === 0) return 'E';
      return `+${diff}`;
    };

    return {
      completedCount: completed.length,
      totalGross,
      totalNet,
      toParGrossFormatted: formatDiff(toParGross),
      toParNetFormatted: formatDiff(toParNet),
      toParGross,
      toParNet,
      birdiesTotal: roundSnapshots.reduce((s, r) => s + r.birdiesCount, 0),
      parsTotal: roundSnapshots.reduce((s, r) => s + r.parsCount, 0),
      eaglesTotal: roundSnapshots.reduce((s, r) => s + r.eaglesCount, 0),
    };
  }, [roundSnapshots]);

  // Current selected round snapshot
  const activeSnapshot = useMemo(() => {
    return roundSnapshots.find(s => s.round.id === expandedRoundId) || roundSnapshots[0];
  }, [roundSnapshots, expandedRoundId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div 
        className="relative w-full max-w-3xl max-h-[92vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP HEADER: Player Identity & Team Branding */}
        <div 
          className="relative px-5 pt-5 pb-4 text-white border-b border-white/10"
          style={{
            background: `linear-gradient(135deg, ${teamColor} 0%, #0f172a 100%)`
          }}
        >
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white/90 hover:text-white transition cursor-pointer"
            title="Close Profile"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="relative">
                <img
                  src={player.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'}
                  alt={player.displayName}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-white/30 shadow-md"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80';
                  }}
                />
                <div 
                  className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full shadow-md border-2 border-white shrink-0"
                  style={{ backgroundColor: teamColor }}
                />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-black tracking-tight">{player.displayName}</h2>
                  {mvpRank > 0 && (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400/90 text-amber-950 flex items-center gap-1 shadow-2xs">
                      <Trophy className="w-3 h-3" /> #{mvpRank} MVP
                    </span>
                  )}
                </div>

                <div className="text-xs text-white/80 font-medium mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>@{player.username || 'golfer'}</span>
                  <span>•</span>
                  <span className="font-bold">HCP {handicap.toFixed(1)}</span>
                </div>

                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span 
                    className="text-[11px] font-black px-2.5 py-0.5 rounded-md bg-white/15 border border-white/20 inline-flex items-center gap-1.5"
                  >
                    <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: teamColor }} />
                    <span>{teamName}</span>
                  </span>
                  {mvpEntry && mvpEntry.matchesPlayed > 0 && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white/10 text-white/90">
                      {mvpEntry.matchesWon}W - {mvpEntry.matchesLost}L - {mvpEntry.matchesTied}T ({mvpEntry.pointsEarned.toFixed(1)} pts)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Tournament Summary Pill */}
            <div className="flex items-center gap-2 bg-black/25 backdrop-blur-xs border border-white/15 px-3.5 py-2 rounded-2xl shrink-0">
              <div className="text-center px-2 border-r border-white/15">
                <span className="text-[10px] text-white/70 uppercase font-black block tracking-wider">Score to Par</span>
                <span className={`text-sm sm:text-base font-black ${
                  overallStats.toParGross < 0 ? 'text-emerald-300' : overallStats.toParGross === 0 ? 'text-white' : 'text-amber-300'
                }`}>
                  {overallStats.toParGrossFormatted}
                </span>
              </div>
              <div className="text-center px-2 border-r border-white/15">
                <span className="text-[10px] text-white/70 uppercase font-black block tracking-wider">Pts Earned</span>
                <span className="text-sm sm:text-base font-black text-amber-300">
                  {mvpEntry ? mvpEntry.pointsEarned.toFixed(1) : '0.0'}
                </span>
              </div>
              <div className="text-center px-2">
                <span className="text-[10px] text-white/70 uppercase font-black block tracking-wider">Rounds</span>
                <span className="text-sm sm:text-base font-black text-white">
                  {overallStats.completedCount}/{roundSnapshots.length}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stat Highlights */}
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/10 text-center">
            <div className="bg-white/10 rounded-xl py-1.5 px-1">
              <span className="text-[10px] text-white/70 uppercase font-bold block">Birdies</span>
              <span className="text-xs sm:text-sm font-black text-white flex items-center justify-center gap-1">
                <span>🐥</span> {overallStats.birdiesTotal}
              </span>
            </div>
            <div className="bg-white/10 rounded-xl py-1.5 px-1">
              <span className="text-[10px] text-white/70 uppercase font-bold block">Pars</span>
              <span className="text-xs sm:text-sm font-black text-white flex items-center justify-center gap-1">
                <span>🎯</span> {overallStats.parsTotal}
              </span>
            </div>
            <div className="bg-white/10 rounded-xl py-1.5 px-1">
              <span className="text-[10px] text-white/70 uppercase font-bold block">Holes Won</span>
              <span className="text-xs sm:text-sm font-black text-white flex items-center justify-center gap-1">
                <span>⛳️</span> {mvpEntry?.holesWonCount || 0}
              </span>
            </div>
          </div>
        </div>

        {/* MODAL BODY: Round Snapshots & Full Scorecard Inspection */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 bg-slate-50">
          {/* SECTION HEADER: Multi-Day Round Snapshots */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                  Tournament Round History & Score-to-Par
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Review 18-hole performance relative to par across each tournament day
                </p>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                {roundSnapshots.length} Rounds
              </span>
            </div>

            {/* ROUND SNAPSHOT CARDS */}
            <div className="space-y-3">
              {roundSnapshots.map((snapshot, index) => {
                const isSelected = expandedRoundId === snapshot.round.id;
                const isCompleted = snapshot.status === 'completed';
                const isLive = snapshot.status === 'live';

                // Score to par styling
                const toParColorClass = snapshot.toParGross < 0
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : snapshot.toParGross === 0
                    ? 'bg-slate-100 text-slate-800 border-slate-300'
                    : 'bg-amber-50 text-amber-800 border-amber-300';

                return (
                  <div
                    key={snapshot.round.id}
                    className={`rounded-2xl border transition-all duration-200 overflow-hidden bg-white ${
                      isSelected 
                        ? 'border-emerald-500 shadow-md ring-1 ring-emerald-500/30' 
                        : 'border-slate-200 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    {/* Snapshot Card Header */}
                    <div 
                      onClick={() => setExpandedRoundId(isSelected ? null : snapshot.round.id)}
                      className="p-4 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none"
                    >
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        <img
                          src={snapshot.courseCover}
                          alt={snapshot.courseName}
                          className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                              Day {snapshot.round.dayNumber}
                            </span>
                            <span className="text-[11px] font-bold text-slate-500">
                              {snapshot.round.date}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isCompleted 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : isLive
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                                  : 'bg-slate-100 text-slate-600'
                            }`}>
                              {snapshot.statusText}
                            </span>
                          </div>

                          <h4 className="text-sm font-black text-slate-900 mt-1 truncate">
                            {snapshot.round.title}
                          </h4>

                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 truncate">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{snapshot.courseName}</span>
                            <span>•</span>
                            <span className="font-semibold">Par {snapshot.coursePar}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right side: Score to Par and Quick Metrics */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        {isCompleted ? (
                          <div className="flex items-center gap-2.5">
                            {/* Score to par badge */}
                            <div className={`px-3 py-1.5 rounded-xl border text-center ${toParColorClass}`}>
                              <span className="text-[9px] uppercase font-black tracking-wider block">Score to Par</span>
                              <span className="text-base font-black block leading-none mt-0.5">
                                {snapshot.toParGrossFormatted}
                              </span>
                            </div>

                            {/* Gross & Net tallies */}
                            <div className="text-right">
                              <div className="text-xs font-black text-slate-900">
                                Gross {snapshot.grossScore} <span className="text-[10px] text-slate-400 font-normal">/ Net {snapshot.netScore}</span>
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
                                F9: {snapshot.front9Gross} ({snapshot.front9ToPar >= 0 ? `+${snapshot.front9ToPar}` : snapshot.front9ToPar}) • B9: {snapshot.back9Gross} ({snapshot.back9ToPar >= 0 ? `+${snapshot.back9ToPar}` : snapshot.back9ToPar})
                              </div>
                              {snapshot.matchResultText && (
                                <div className="text-[10px] font-bold text-emerald-700 mt-0.5">
                                  {snapshot.matchResultText}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : isLive ? (
                          <div className="flex items-center gap-2">
                            <div className="px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-center">
                              <span className="text-[9px] uppercase font-black text-amber-700 block">Thru</span>
                              <span className="text-sm font-black text-amber-900">{snapshot.holesPlayed} Holes</span>
                            </div>
                            <span className="text-xs font-bold text-slate-700">{snapshot.matchResultText}</span>
                          </div>
                        ) : (
                          <div className="text-right">
                            <span className="text-xs font-bold text-slate-400 block">Upcoming Match</span>
                            <span className="text-[10px] text-slate-400">Tee times & pairings set</span>
                          </div>
                        )}

                        <div className="p-1.5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition">
                          {isSelected ? (
                            <ChevronDown className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* EXPANDED FULL SCORECARD INSPECTOR */}
                    {isSelected && (
                      <div className="border-t border-slate-200/80 bg-slate-50/50 p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                        {/* Match Context & Competitors Banner */}
                        <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                              <Flag className="w-3 h-3 text-emerald-600" /> Match Context & Lineup
                            </div>
                            <div className="text-xs font-bold text-slate-900">
                              {snapshot.partner ? (
                                <span>
                                  Partnered with <strong className="text-emerald-700">{snapshot.partner.displayName}</strong>
                                </span>
                              ) : (
                                <span>Singles Matchplay Duel</span>
                              )}
                              {snapshot.opponents && snapshot.opponents.length > 0 && (
                                <span className="text-slate-600">
                                  {' '}vs {snapshot.opponents.map(o => o.displayName).join(' & ')}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Format: <span className="font-semibold text-slate-700">{snapshot.formatDescription}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            {/* Live Scorecard Link Button */}
                            {snapshot.match && onOpenMatchScorecard && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenMatchScorecard(snapshot.match!, snapshot.round);
                                  onClose();
                                }}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Open Match Duel</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Hole-by-Hole Legend */}
                        <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] px-2">
                          <span className="font-black text-slate-700 uppercase tracking-wider text-[10px]">
                            Scorecard Legend:
                          </span>
                          <div className="flex items-center gap-3 flex-wrap text-[10px] font-bold">
                            <span className="flex items-center gap-1">
                              <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-900 border border-purple-300 flex items-center justify-center text-[9px] font-black">🦅</span>
                              <span>Eagle (-2+)</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center justify-center text-[9px] font-black">●</span>
                              <span>Birdie (-1)</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-4 h-4 rounded-sm bg-slate-100 text-slate-700 border border-slate-300 flex items-center justify-center text-[9px]">4</span>
                              <span>Par (E)</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-4 h-4 rounded-sm bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center text-[9px] font-bold">■</span>
                              <span>Bogey (+1)</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-4 h-4 rounded-sm bg-rose-100 text-rose-900 border-2 border-rose-400 flex items-center justify-center text-[9px] font-bold">■</span>
                              <span>Double+ (+2)</span>
                            </span>
                            <span className="flex items-center gap-1 text-amber-700">
                              <span>⭐</span>
                              <span>Counting Score</span>
                            </span>
                          </div>
                        </div>

                        {/* FULL 18-HOLE SCORECARD TABLE */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-center text-xs border-collapse">
                              <thead>
                                <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 text-[10px] uppercase font-black tracking-wider">
                                  <th className="py-2.5 px-2 text-left font-black">Hole</th>
                                  <th className="py-2.5 px-1 font-black">Par</th>
                                  <th className="py-2.5 px-1 font-bold">SI</th>
                                  <th className="py-2.5 px-1 font-bold">Strokes</th>
                                  <th className="py-2.5 px-2 font-black text-slate-900">Gross</th>
                                  <th className="py-2.5 px-2 font-black text-emerald-700">Net</th>
                                  <th className="py-2.5 px-2 font-black">+/-</th>
                                  <th className="py-2.5 px-2 font-black">Counting</th>
                                  <th className="py-2.5 px-3 text-right font-bold">Status After Hole</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {/* FRONT 9 (HOLES 1-9) */}
                                {snapshot.courseHoles.slice(0, 9).map(hole => {
                                  const detail = snapshot.holeScores[hole.holeNumber];
                                  const isHoleSelected = selectedHoleNum === hole.holeNumber;

                                  // Score styling based on scoreType
                                  let grossBadgeClass = 'text-slate-900 font-bold';
                                  if (detail?.scoreType === 'eagle_or_better') {
                                    grossBadgeClass = 'w-6 h-6 rounded-full bg-purple-100 text-purple-900 border-2 border-purple-400 font-black inline-flex items-center justify-center mx-auto';
                                  } else if (detail?.scoreType === 'birdie') {
                                    grossBadgeClass = 'w-6 h-6 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-400 font-black inline-flex items-center justify-center mx-auto';
                                  } else if (detail?.scoreType === 'par') {
                                    grossBadgeClass = 'font-bold text-slate-900';
                                  } else if (detail?.scoreType === 'bogey') {
                                    grossBadgeClass = 'w-6 h-6 rounded-xs bg-amber-50 text-amber-900 border border-amber-400 font-bold inline-flex items-center justify-center mx-auto';
                                  } else if (detail?.scoreType === 'double_or_worse') {
                                    grossBadgeClass = 'w-6 h-6 rounded-xs bg-rose-50 text-rose-900 border-2 border-rose-400 font-black inline-flex items-center justify-center mx-auto';
                                  }

                                  return (
                                    <tr 
                                      key={hole.holeNumber}
                                      onClick={() => setSelectedHoleNum(hole.holeNumber)}
                                      className={`hover:bg-slate-50/80 transition cursor-pointer ${
                                        isHoleSelected ? 'bg-emerald-50/60' : ''
                                      }`}
                                    >
                                      <td className="py-2 px-2 text-left font-black text-slate-900">
                                        #{hole.holeNumber}
                                      </td>
                                      <td className="py-2 px-1 text-slate-600 font-bold">{hole.par}</td>
                                      <td className="py-2 px-1 text-slate-400 font-medium">{hole.strokeIndex}</td>
                                      <td className="py-2 px-1 text-emerald-700 font-black">
                                        {detail?.strokes > 0 ? (
                                          <span className="text-[10px] px-1 py-0.5 rounded-sm bg-emerald-50 border border-emerald-200">
                                            {'+' + detail.strokes}
                                          </span>
                                        ) : (
                                          <span className="text-slate-300">-</span>
                                        )}
                                      </td>
                                      <td className="py-2 px-2">
                                        {detail && detail.gross > 0 ? (
                                          <span className={grossBadgeClass}>{detail.gross}</span>
                                        ) : (
                                          <span className="text-slate-300">-</span>
                                        )}
                                      </td>
                                      <td className="py-2 px-2 font-black text-emerald-800">
                                        {detail && detail.net > 0 ? detail.net : '-'}
                                      </td>
                                      <td className="py-2 px-2 font-bold">
                                        {detail && detail.gross > 0 ? (
                                          <span className={`text-[10px] font-black ${
                                            detail.toPar < 0 
                                              ? 'text-emerald-600' 
                                              : detail.toPar === 0 
                                                ? 'text-slate-400' 
                                                : 'text-amber-600'
                                          }`}>
                                            {detail.toPar < 0 ? `${detail.toPar}` : detail.toPar === 0 ? 'E' : `+${detail.toPar}`}
                                          </span>
                                        ) : (
                                          <span className="text-slate-300">-</span>
                                        )}
                                      </td>
                                      <td className="py-2 px-2">
                                        {detail?.isBestBall ? (
                                          <span className="inline-flex items-center justify-center text-amber-500 text-xs" title="Counting team score">
                                            ⭐
                                          </span>
                                        ) : (
                                          <span className="text-slate-200">-</span>
                                        )}
                                      </td>
                                      <td className="py-2 px-3 text-right text-[11px] font-medium text-slate-600">
                                        {detail?.matchStatusAfterHole || '-'}
                                      </td>
                                    </tr>
                                  );
                                })}

                                {/* FRONT 9 (OUT) SUBTOTAL ROW */}
                                <tr className="bg-slate-100/90 font-black text-slate-900 border-y border-slate-200 text-[11px]">
                                  <td className="py-2 px-2 text-left font-black uppercase text-emerald-800">
                                    OUT (1-9)
                                  </td>
                                  <td className="py-2 px-1">
                                    {snapshot.courseHoles.slice(0, 9).reduce((s, h) => s + h.par, 0)}
                                  </td>
                                  <td className="py-2 px-1 text-slate-400">-</td>
                                  <td className="py-2 px-1 text-slate-400">-</td>
                                  <td className="py-2 px-2 text-slate-900 font-black">
                                    {snapshot.front9Gross > 0 ? snapshot.front9Gross : '-'}
                                  </td>
                                  <td className="py-2 px-2 text-emerald-800 font-black">
                                    {snapshot.front9Net > 0 ? snapshot.front9Net : '-'}
                                  </td>
                                  <td className="py-2 px-2 font-black">
                                    {snapshot.front9Gross > 0 ? (
                                      <span className={snapshot.front9ToPar < 0 ? 'text-emerald-700' : snapshot.front9ToPar === 0 ? 'text-slate-700' : 'text-amber-700'}>
                                        {snapshot.front9ToPar < 0 ? `${snapshot.front9ToPar}` : snapshot.front9ToPar === 0 ? 'E' : `+${snapshot.front9ToPar}`}
                                      </span>
                                    ) : '-'}
                                  </td>
                                  <td className="py-2 px-2 text-slate-400">-</td>
                                  <td className="py-2 px-3 text-right text-[10px] text-slate-500 font-bold">
                                    Front 9 Subtotal
                                  </td>
                                </tr>

                                {/* BACK 9 (HOLES 10-18) */}
                                {snapshot.courseHoles.slice(9, 18).map(hole => {
                                  const detail = snapshot.holeScores[hole.holeNumber];
                                  const isHoleSelected = selectedHoleNum === hole.holeNumber;

                                  let grossBadgeClass = 'text-slate-900 font-bold';
                                  if (detail?.scoreType === 'eagle_or_better') {
                                    grossBadgeClass = 'w-6 h-6 rounded-full bg-purple-100 text-purple-900 border-2 border-purple-400 font-black inline-flex items-center justify-center mx-auto';
                                  } else if (detail?.scoreType === 'birdie') {
                                    grossBadgeClass = 'w-6 h-6 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-400 font-black inline-flex items-center justify-center mx-auto';
                                  } else if (detail?.scoreType === 'par') {
                                    grossBadgeClass = 'font-bold text-slate-900';
                                  } else if (detail?.scoreType === 'bogey') {
                                    grossBadgeClass = 'w-6 h-6 rounded-xs bg-amber-50 text-amber-900 border border-amber-400 font-bold inline-flex items-center justify-center mx-auto';
                                  } else if (detail?.scoreType === 'double_or_worse') {
                                    grossBadgeClass = 'w-6 h-6 rounded-xs bg-rose-50 text-rose-900 border-2 border-rose-400 font-black inline-flex items-center justify-center mx-auto';
                                  }

                                  return (
                                    <tr 
                                      key={hole.holeNumber}
                                      onClick={() => setSelectedHoleNum(hole.holeNumber)}
                                      className={`hover:bg-slate-50/80 transition cursor-pointer ${
                                        isHoleSelected ? 'bg-emerald-50/60' : ''
                                      }`}
                                    >
                                      <td className="py-2 px-2 text-left font-black text-slate-900">
                                        #{hole.holeNumber}
                                      </td>
                                      <td className="py-2 px-1 text-slate-600 font-bold">{hole.par}</td>
                                      <td className="py-2 px-1 text-slate-400 font-medium">{hole.strokeIndex}</td>
                                      <td className="py-2 px-1 text-emerald-700 font-black">
                                        {detail?.strokes > 0 ? (
                                          <span className="text-[10px] px-1 py-0.5 rounded-sm bg-emerald-50 border border-emerald-200">
                                            {'+' + detail.strokes}
                                          </span>
                                        ) : (
                                          <span className="text-slate-300">-</span>
                                        )}
                                      </td>
                                      <td className="py-2 px-2">
                                        {detail && detail.gross > 0 ? (
                                          <span className={grossBadgeClass}>{detail.gross}</span>
                                        ) : (
                                          <span className="text-slate-300">-</span>
                                        )}
                                      </td>
                                      <td className="py-2 px-2 font-black text-emerald-800">
                                        {detail && detail.net > 0 ? detail.net : '-'}
                                      </td>
                                      <td className="py-2 px-2 font-bold">
                                        {detail && detail.gross > 0 ? (
                                          <span className={`text-[10px] font-black ${
                                            detail.toPar < 0 
                                              ? 'text-emerald-600' 
                                              : detail.toPar === 0 
                                                ? 'text-slate-400' 
                                                : 'text-amber-600'
                                          }`}>
                                            {detail.toPar < 0 ? `${detail.toPar}` : detail.toPar === 0 ? 'E' : `+${detail.toPar}`}
                                          </span>
                                        ) : (
                                          <span className="text-slate-300">-</span>
                                        )}
                                      </td>
                                      <td className="py-2 px-2">
                                        {detail?.isBestBall ? (
                                          <span className="inline-flex items-center justify-center text-amber-500 text-xs" title="Counting team score">
                                            ⭐
                                          </span>
                                        ) : (
                                          <span className="text-slate-200">-</span>
                                        )}
                                      </td>
                                      <td className="py-2 px-3 text-right text-[11px] font-medium text-slate-600">
                                        {detail?.matchStatusAfterHole || '-'}
                                      </td>
                                    </tr>
                                  );
                                })}

                                {/* BACK 9 (IN) SUBTOTAL ROW */}
                                <tr className="bg-slate-100/90 font-black text-slate-900 border-y border-slate-200 text-[11px]">
                                  <td className="py-2 px-2 text-left font-black uppercase text-emerald-800">
                                    IN (10-18)
                                  </td>
                                  <td className="py-2 px-1">
                                    {snapshot.courseHoles.slice(9, 18).reduce((s, h) => s + h.par, 0)}
                                  </td>
                                  <td className="py-2 px-1 text-slate-400">-</td>
                                  <td className="py-2 px-1 text-slate-400">-</td>
                                  <td className="py-2 px-2 text-slate-900 font-black">
                                    {snapshot.back9Gross > 0 ? snapshot.back9Gross : '-'}
                                  </td>
                                  <td className="py-2 px-2 text-emerald-800 font-black">
                                    {snapshot.back9Net > 0 ? snapshot.back9Net : '-'}
                                  </td>
                                  <td className="py-2 px-2 font-black">
                                    {snapshot.back9Gross > 0 ? (
                                      <span className={snapshot.back9ToPar < 0 ? 'text-emerald-700' : snapshot.back9ToPar === 0 ? 'text-slate-700' : 'text-amber-700'}>
                                        {snapshot.back9ToPar < 0 ? `${snapshot.back9ToPar}` : snapshot.back9ToPar === 0 ? 'E' : `+${snapshot.back9ToPar}`}
                                      </span>
                                    ) : '-'}
                                  </td>
                                  <td className="py-2 px-2 text-slate-400">-</td>
                                  <td className="py-2 px-3 text-right text-[10px] text-slate-500 font-bold">
                                    Back 9 Subtotal
                                  </td>
                                </tr>

                                {/* TOTAL 18 HOLES ROW */}
                                <tr className="bg-emerald-900 text-white font-black text-xs border-t-2 border-emerald-700">
                                  <td className="py-3 px-2 text-left font-black uppercase text-emerald-200 tracking-wider">
                                    TOTAL (18)
                                  </td>
                                  <td className="py-3 px-1">{snapshot.coursePar}</td>
                                  <td className="py-3 px-1 text-white/50">-</td>
                                  <td className="py-3 px-1 text-emerald-300">
                                    +{Object.values(snapshot.holeScores).reduce((s, h) => s + h.strokes, 0)}
                                  </td>
                                  <td className="py-3 px-2 text-amber-300 text-sm">
                                    {snapshot.grossScore > 0 ? snapshot.grossScore : '-'}
                                  </td>
                                  <td className="py-3 px-2 text-emerald-300 text-sm">
                                    {snapshot.netScore > 0 ? snapshot.netScore : '-'}
                                  </td>
                                  <td className="py-3 px-2 text-sm font-black">
                                    {snapshot.toParGrossFormatted}
                                  </td>
                                  <td className="py-3 px-2 text-white/50">
                                    -
                                  </td>
                                  <td className="py-3 px-3 text-right text-white/90 text-[11px] font-bold">
                                    {snapshot.matchResultText || 'Completed'}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Selected Hole Deep-Dive Callout */}
                        {snapshot.holeScores[selectedHoleNum] && (
                          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex flex-col items-center justify-center font-black">
                                <span className="text-[9px] uppercase tracking-wider text-slate-400">Hole</span>
                                <span className="text-sm leading-none">#{selectedHoleNum}</span>
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 flex items-center gap-2">
                                  <span>Par {snapshot.holeScores[selectedHoleNum].par}</span>
                                  <span>•</span>
                                  <span>Stroke Index {snapshot.holeScores[selectedHoleNum].strokeIndex} (WHS)</span>
                                  <span>•</span>
                                  <span className="text-slate-500">{snapshot.holeScores[selectedHoleNum].distanceMeters}m</span>
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  Strokes Allocated: <strong className="text-emerald-700">+{snapshot.holeScores[selectedHoleNum].strokes} dots</strong>
                                  {' '}| Match State: <strong className="text-slate-700">{snapshot.holeScores[selectedHoleNum].matchStatusAfterHole || 'Active'}</strong>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-center">
                              <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold">
                                Gross: {snapshot.holeScores[selectedHoleNum].gross || '-'}
                              </span>
                              <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-black">
                                Net: {snapshot.holeScores[selectedHoleNum].net || '-'}
                              </span>
                              {snapshot.holeScores[selectedHoleNum].isBestBall && (
                                <span className="text-xs px-2 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-black flex items-center gap-1">
                                  <span>⭐</span> Counting Hole
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="px-5 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span>Official Tournament Scorecard Inspector</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer shadow-xs"
          >
            Close Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
