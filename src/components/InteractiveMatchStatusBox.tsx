import React, { useState } from 'react';
import { 
  Tournament, 
  TournamentRound, 
  TournamentMatch, 
  TournamentTeam 
} from '../types/golf';
import { 
  ChevronDown, 
  Flame, 
  Trophy, 
  Sliders, 
  Clock, 
  Radio, 
  CheckCircle2, 
  Sparkles 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InteractiveMatchStatusBoxProps {
  tournament: Tournament;
  teamA: TournamentTeam;
  teamB: TournamentTeam;
  activeRound?: TournamentRound;
  totalPoints: number;
  clinchThreshold: number;
  teamAPoints: number;
  teamBPoints: number;
  teamAProjected: number;
  teamBProjected: number;
  onSelectScorecardMatch: (match: TournamentMatch, round: TournamentRound) => void;
}

export const InteractiveMatchStatusBox: React.FC<InteractiveMatchStatusBoxProps> = ({
  tournament,
  teamA,
  teamB,
  activeRound,
  totalPoints,
  clinchThreshold,
  teamAPoints,
  teamBPoints,
  teamAProjected,
  teamBProjected,
  onSelectScorecardMatch,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filterMode, setFilterMode] = useState<'ongoing' | 'round' | 'all'>('ongoing');

  // Collect all matches across all tournament rounds with their parent round
  const allMatchesWithRounds = React.useMemo(() => {
    return tournament.rounds.flatMap(round =>
      round.matches.map(match => ({ match, round }))
    );
  }, [tournament.rounds]);

  // Matches currently live or in progress with uncompleted holes
  const ongoingMatchesWithRounds = React.useMemo(() => {
    return allMatchesWithRounds.filter(({ match }) => {
      const holesPlayed = Object.keys(match.holeResults || {}).length;
      return match.status === 'live' || (match.status !== 'completed' && holesPlayed > 0);
    });
  }, [allMatchesWithRounds]);

  // Current active round matches
  const activeRoundMatchesWithRounds = React.useMemo(() => {
    if (!activeRound) return [];
    return activeRound.matches.map(match => ({ match, round: activeRound }));
  }, [activeRound]);

  // Determine which matches to display based on filter selection
  const displayedMatches = React.useMemo(() => {
    if (filterMode === 'ongoing') {
      // If no matches are live, fallback gracefully to active round matches so list is never empty
      return ongoingMatchesWithRounds.length > 0 
        ? ongoingMatchesWithRounds 
        : activeRoundMatchesWithRounds;
    }
    if (filterMode === 'round') {
      return activeRoundMatchesWithRounds;
    }
    return allMatchesWithRounds;
  }, [filterMode, ongoingMatchesWithRounds, activeRoundMatchesWithRounds, allMatchesWithRounds]);

  const liveCount = ongoingMatchesWithRounds.length;

  return (
    <div 
      id="match-status-drilldown-container"
      className="bg-slate-900/95 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-3.5 sm:p-4 backdrop-blur-md transition-all duration-200 shadow-lg text-white"
    >
      {/* Clickable Header Section (Toggle Trigger) */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsExpanded(prev => !prev)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(prev => !prev);
          }
        }}
        className="cursor-pointer select-none group"
        aria-expanded={isExpanded}
        aria-label="Toggle live matches status breakdown"
      >
        {/* Clinch Points Header: Team A vs Team B */}
        <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider mb-2">
          <div className="flex items-center gap-2">
            <span 
              className="flex items-center gap-1 font-bold transition-transform group-hover:scale-105"
              style={{ color: teamA.color || '#059669' }}
            >
              <span className="text-base">{teamA.badgeIcon}</span> {teamA.name}
            </span>
            <span className="text-lg font-black text-white">{teamAPoints.toFixed(1)}</span>
          </div>

          <div className="text-center px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 border border-slate-700/50">
            {clinchThreshold} pts to Clinch
          </div>

          <div className="flex items-center gap-2">
            <span className="text-lg font-black text-white">{teamBPoints.toFixed(1)}</span>
            <span 
              className="flex items-center gap-1 font-bold transition-transform group-hover:scale-105"
              style={{ color: teamB.color || '#0284c7' }}
            >
              {teamB.name} <span className="text-base">{teamB.badgeIcon}</span>
            </span>
          </div>
        </div>

        {/* Duel Score Progress Bar */}
        <div className="h-3.5 w-full bg-slate-800 rounded-full overflow-hidden flex border border-slate-700 p-0.5 relative">
          <div
            style={{ 
              width: `${Math.min(100, (teamAPoints / totalPoints) * 100)}%`,
              backgroundColor: teamA.color || '#059669' 
            }}
            className="transition-all duration-500 h-full rounded-l-full"
          />
          <div
            style={{ 
              width: `${Math.min(100, (teamBPoints / totalPoints) * 100)}%`,
              backgroundColor: teamB.color || '#0284c7' 
            }}
            className="transition-all duration-500 h-full rounded-r-full ml-auto"
          />
        </div>

        {/* Projected Points Row */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800/80">
          <span>Projected: <strong style={{ color: teamA.color || '#059669' }}>{teamAProjected.toFixed(1)} pts</strong></span>
          <span>Total Points: <strong>{totalPoints} pts</strong></span>
          <span>Projected: <strong style={{ color: teamB.color || '#0284c7' }}>{teamBProjected.toFixed(1)} pts</strong></span>
        </div>

        {/* Interactive Expansion Prompt Bar */}
        <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-300">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-bold text-white group-hover:text-emerald-300 transition-colors">
              {isExpanded ? 'Hide Ongoing Matches' : 'Tap for Live Match Breakdown'}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
              {liveCount > 0 ? `${liveCount} in play` : `${activeRoundMatchesWithRounds.length} matches`}
            </span>
          </div>

          <div className="flex items-center gap-1 text-slate-400 group-hover:text-white transition-colors text-[10px] font-bold uppercase tracking-wider">
            <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
            <ChevronDown 
              className={`w-3.5 h-3.5 transition-transform duration-300 ${
                isExpanded ? 'rotate-180 text-emerald-400' : 'text-slate-400'
              }`} 
            />
          </div>
        </div>
      </div>

      {/* Expandable Drill-Down Drawer */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-slate-800 space-y-3">
              {/* Drawer Controls & Filter Pills */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs text-slate-300 font-bold">
                  <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>Match Standings</span>
                </div>

                <div className="flex items-center p-0.5 bg-slate-950/80 border border-slate-800 rounded-lg text-[10px]">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFilterMode('ongoing');
                    }}
                    className={`py-1 px-2.5 rounded-md font-bold transition cursor-pointer ${
                      filterMode === 'ongoing'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Ongoing ({ongoingMatchesWithRounds.length || activeRoundMatchesWithRounds.length})
                  </button>

                  {activeRound && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFilterMode('round');
                      }}
                      className={`py-1 px-2.5 rounded-md font-bold transition cursor-pointer ${
                        filterMode === 'round'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Day {activeRound.dayNumber} ({activeRoundMatchesWithRounds.length})
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFilterMode('all');
                    }}
                    className={`py-1 px-2.5 rounded-md font-bold transition cursor-pointer ${
                      filterMode === 'all'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All ({allMatchesWithRounds.length})
                  </button>
                </div>
              </div>

              {/* Compact Match Summary Rows */}
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {displayedMatches.length === 0 ? (
                  <div className="p-4 text-center rounded-xl bg-slate-950/50 border border-slate-800 text-xs text-slate-400">
                    No matches found for the selected filter.
                  </div>
                ) : (
                  displayedMatches.map(({ match, round }) => {
                    const holesPlayed = Object.keys(match.holeResults || {}).length;
                    const isMatchOver = match.status === 'completed';
                    
                    const isWonBySideA = isMatchOver && match.winnerSide === 'sideA';
                    const isWonBySideB = isMatchOver && match.winnerSide === 'sideB';
                    const isWon = isWonBySideA || isWonBySideB;

                    const isLeadingA = !isMatchOver && holesPlayed > 0 && match.leadSide === 'sideA';
                    const isLeadingB = !isMatchOver && holesPlayed > 0 && match.leadSide === 'sideB';
                    const isLeading = isLeadingA || isLeadingB;
                    
                    const leadTeamColor = isLeadingA 
                      ? (match.sideA.teamColor || teamA.color || '#059669') 
                      : (match.sideB.teamColor || teamB.color || '#0284c7');

                    // Compute standing text label
                    let standingBadgeText = 'All Square';
                    let standingBadgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';

                    if (isWon) {
                      standingBadgeText = isWonBySideA 
                        ? `${teamA.shortCode || teamA.name} Won (${match.currentStatusText || 'Final'})`
                        : `${teamB.shortCode || teamB.name} Won (${match.currentStatusText || 'Final'})`;
                      standingBadgeColor = isWonBySideA 
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-sky-500/20 text-sky-300 border-sky-500/30';
                    } else if (isLeading) {
                      const leadCode = isLeadingA ? (teamA.shortCode || teamA.name) : (teamB.shortCode || teamB.name);
                      standingBadgeText = `${leadCode} ${match.leadMargin} UP thru ${holesPlayed}`;
                      standingBadgeColor = isLeadingA 
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-sky-500/20 text-sky-300 border-sky-500/30';
                    } else if (holesPlayed > 0) {
                      standingBadgeText = `All Square thru ${holesPlayed}`;
                    } else {
                      standingBadgeText = 'Scheduled';
                      standingBadgeColor = 'bg-slate-800 text-slate-400 border-slate-700';
                    }

                    return (
                      <div
                        key={match.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectScorecardMatch(match, round);
                        }}
                        className="bg-slate-950/80 border border-slate-800/90 hover:border-slate-700 rounded-xl p-2.5 sm:p-3 transition-colors cursor-pointer group/row space-y-2"
                        title="Click to open interactive match scorecard"
                      >
                        {/* Row Header: Match Number, Round Day, and Standing Badge */}
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-white text-[11px]">
                              M#{match.matchNumber}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Day {round.dayNumber} • {(round.format || 'singles').replace(/_/g, ' ')}
                            </span>
                            {match.status === 'live' && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                            )}
                          </div>

                          {/* Match Standing Pill */}
                          <div className={`px-2 py-0.5 rounded-full text-[10px] font-black border flex items-center gap-1 ${standingBadgeColor}`}>
                            {isWon ? (
                              <Trophy className="w-3 h-3 text-amber-400" />
                            ) : isLeading ? (
                              <Flame className="w-3 h-3 text-amber-300" />
                            ) : holesPlayed > 0 ? (
                              <Clock className="w-3 h-3 text-amber-400" />
                            ) : null}
                            <span>{standingBadgeText}</span>
                          </div>
                        </div>

                        {/* Competing Teams & Players */}
                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs">
                          {/* Side A */}
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-sm shrink-0">{teamA.badgeIcon}</span>
                            <div className="min-w-0">
                              <span 
                                className="font-bold truncate block text-[11px]"
                                style={{ color: teamA.color || '#059669' }}
                              >
                                {match.sideA.label}
                              </span>
                            </div>
                          </div>

                          {/* Center VS Divider */}
                          <div className="text-[10px] uppercase font-black text-slate-500 px-1">
                            vs
                          </div>

                          {/* Side B */}
                          <div className="flex items-center justify-end gap-1.5 min-w-0 text-right">
                            <div className="min-w-0">
                              <span 
                                className="font-bold truncate block text-[11px]"
                                style={{ color: teamB.color || '#0284c7' }}
                              >
                                {match.sideB.label}
                              </span>
                            </div>
                            <span className="text-sm shrink-0">{teamB.badgeIcon}</span>
                          </div>
                        </div>

                        {/* Miniature Visual Progress Indicator (18-Hole Micro Track) */}
                        <div className="space-y-1 pt-0.5">
                          <div className="flex items-center gap-0.5 h-1.5 w-full bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
                            {Array.from({ length: 18 }, (_, idx) => {
                              const holeNum = idx + 1;
                              const result = match.holeResults?.[holeNum];
                              const isPlayed = !!result;
                              const isCurrentHole = !isMatchOver && holeNum === holesPlayed + 1;

                              let barColor = 'bg-slate-800';
                              if (isPlayed) {
                                if (result.winnerSide === 'sideA') {
                                  barColor = 'bg-emerald-500';
                                } else if (result.winnerSide === 'sideB') {
                                  barColor = 'bg-sky-500';
                                } else {
                                  barColor = 'bg-amber-400';
                                }
                              } else if (isCurrentHole) {
                                barColor = 'bg-white animate-pulse';
                              }

                              return (
                                <div
                                  key={holeNum}
                                  title={`Hole ${holeNum}: ${
                                    isPlayed 
                                      ? result.winnerSide === 'sideA' 
                                        ? `${teamA.name} won` 
                                        : result.winnerSide === 'sideB' 
                                          ? `${teamB.name} won` 
                                          : 'Halved' 
                                      : isCurrentHole 
                                        ? 'In Play' 
                                        : 'Upcoming'
                                  }`}
                                  className={`h-full flex-1 rounded-xs transition-all ${barColor}`}
                                />
                              );
                            })}
                          </div>

                          {/* Micro Progress Metrics & Scorecard Trigger */}
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span className="font-mono">
                              {holesPlayed}/18 Holes ({Math.round((holesPlayed / 18) * 100)}%)
                            </span>

                            <div className="flex items-center gap-2">
                              <span className="text-emerald-400 group-hover/row:underline font-bold flex items-center gap-0.5">
                                <Sliders className="w-2.5 h-2.5" />
                                <span>Scorecard</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
