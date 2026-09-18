import React, { useState } from 'react';
import { Trophy, Info, X } from 'lucide-react';
import { Tournament, TournamentTeam, TournamentMatch } from '../types/golf';
import { calculateClinchThreshold } from '../utils/tournamentEngine';

interface TournamentClinchProgressBarProps {
  tournament: Tournament;
  teamA: TournamentTeam;
  teamB: TournamentTeam;
  clinchThreshold?: number;
  totalPoints: number;
}

/**
 * Converts a hex color string (e.g. #C8102E) to an rgba string with custom opacity
 * for rendering in-progress ("One Up") match states.
 */
function getOpaqueColor(color: string, opacity: number = 0.45): string {
  if (!color) return `rgba(2, 132, 199, ${opacity})`;
  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map(char => char + char).join('');
    }
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
  }
  return color;
}

export const TournamentClinchProgressBar: React.FC<TournamentClinchProgressBarProps> = ({
  tournament,
  teamA,
  teamB,
  clinchThreshold,
  totalPoints,
}) => {
  const [showInfo, setShowInfo] = useState(false);

  // Collect all tournament matches across all rounds
  const allMatches: TournamentMatch[] = React.useMemo(() => {
    return tournament.rounds?.flatMap(r => r.matches || []) || [];
  }, [tournament.rounds]);

  const totalMatchesCount = allMatches.length || Math.round(totalPoints);

  // Completed matches calculation
  const completedMatches = React.useMemo(() => {
    return allMatches.filter(m => m.status === 'completed');
  }, [allMatches]);

  const completedMatchesCount = completedMatches.length;

  // Live / In-Progress matches calculation
  const liveMatches = React.useMemo(() => {
    return allMatches.filter(m => {
      const holesPlayed = Object.keys(m.holeResults || {}).length;
      return m.status === 'live' || (m.status !== 'completed' && holesPlayed > 0);
    });
  }, [allMatches]);

  // Points Won (Solid / Darker color)
  const teamAPointsWon = React.useMemo(() => {
    let pts = 0;
    completedMatches.forEach(m => {
      if (m.winnerSide === 'sideA') pts += 1.0;
      else if (m.winnerSide === 'halved') pts += 0.5;
    });
    // Fallback to leaderboard standings if matches were cleared/aggregated
    const lbPts = tournament.leaderboard?.teamStandings?.find(t => t.teamId === teamA.id)?.points;
    return typeof lbPts === 'number' && lbPts > pts ? lbPts : pts;
  }, [completedMatches, tournament.leaderboard, teamA.id]);

  const teamBPointsWon = React.useMemo(() => {
    let pts = 0;
    completedMatches.forEach(m => {
      if (m.winnerSide === 'sideB') pts += 1.0;
      else if (m.winnerSide === 'halved') pts += 0.5;
    });
    const lbPts = tournament.leaderboard?.teamStandings?.find(t => t.teamId === teamB.id)?.points;
    return typeof lbPts === 'number' && lbPts > pts ? lbPts : pts;
  }, [completedMatches, tournament.leaderboard, teamB.id]);

  // Live Matches "One Up" / Leading (Opaque / Lighter color)
  const teamALeadingCount = React.useMemo(() => {
    return liveMatches.filter(m => m.leadSide === 'sideA').length;
  }, [liveMatches]);

  const teamBLeadingCount = React.useMemo(() => {
    return liveMatches.filter(m => m.leadSide === 'sideB').length;
  }, [liveMatches]);

  // Total segments to display across the bar
  const totalSegments = Math.max(1, Math.round(totalPoints || 16));

  // Clinch calculation using centralized strictly fair formula
  const effectiveClinchThreshold = React.useMemo(() => {
    return calculateClinchThreshold(totalPoints, clinchThreshold);
  }, [totalPoints, clinchThreshold]);

  // Percentage widths for track segments
  const teamASolidPct = Math.min(100, (teamAPointsWon / totalPoints) * 100);
  const teamAInPlayPct = Math.min(100 - teamASolidPct, (teamALeadingCount / totalPoints) * 100);

  const teamBSolidPct = Math.min(100, (teamBPointsWon / totalPoints) * 100);
  const teamBInPlayPct = Math.min(100 - teamBSolidPct, (teamBLeadingCount / totalPoints) * 100);

  // Clinch evaluation - both teams compete on equal footing to reach effectiveClinchThreshold
  const teamAClinched = teamAPointsWon >= effectiveClinchThreshold;
  const teamBClinched = teamBPointsWon >= effectiveClinchThreshold;

  // Primary and lighter colors
  const teamAColor = teamA.color || '#C8102E'; // Default Team A Red
  const teamBColor = teamB.color || '#002D72'; // Default Team B Blue
  const teamALighterColor = getOpaqueColor(teamAColor, 0.45);
  const teamBLighterColor = getOpaqueColor(teamBColor, 0.45);

  const formatPoints = (pts: number) => {
    return Number.isInteger(pts) ? `${pts}` : pts.toFixed(1);
  };

  return (
    <div 
      id="progress-to-clinch-section" 
      className="bg-[#0B1E36] px-4 sm:px-6 py-4 border-t border-slate-700/80 space-y-3 select-none"
    >
      {/* Clinch Header Row: Team A Points to Win | Points | Team B Points to Win */}
      <div className="flex items-center justify-between gap-2">
        {/* Left: Team A target */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div 
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-sm sm:text-base font-black shadow-xs shrink-0 border border-white/20"
            style={{ backgroundColor: teamAColor, color: '#FFFFFF' }}
            title={teamA.name}
          >
            {teamA.badgeIcon || teamA.shortCode?.slice(0, 2) || 'A'}
          </div>
          <div className="flex items-baseline gap-1 sm:gap-1.5">
            <span 
              className="text-2xl sm:text-3xl font-black font-mono tracking-tight leading-none"
              style={{ color: teamAColor }}
            >
              {effectiveClinchThreshold}
            </span>
            <span className="text-xs sm:text-sm font-serif italic text-slate-300 font-medium">
              to win
            </span>
          </div>
        </div>

        {/* Center: "Points" Label */}
        <div className="text-center px-2">
          <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-slate-200">
            Points
          </span>
        </div>

        {/* Right: Team B target */}
        <div className="flex items-center justify-end gap-2 sm:gap-2.5 text-right">
          <div className="flex items-baseline gap-1 sm:gap-1.5">
            <span 
              className="text-2xl sm:text-3xl font-black font-mono tracking-tight leading-none"
              style={{ color: teamBColor }}
            >
              {effectiveClinchThreshold}
            </span>
            <span className="text-xs sm:text-sm font-serif italic text-slate-300 font-medium">
              to win
            </span>
          </div>
          <div 
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-sm sm:text-base font-black shadow-xs shrink-0 border border-white/20"
            style={{ backgroundColor: teamBColor, color: '#FFFFFF' }}
            title={teamB.name}
          >
            {teamB.badgeIcon || teamB.shortCode?.slice(0, 2) || 'B'}
          </div>
        </div>
      </div>

      {/* Main Segmented Progress Bar */}
      <div 
        className="relative h-12 sm:h-14 w-full rounded-xl overflow-hidden bg-[#071322] border border-slate-700/80 shadow-inner flex items-stretch"
        title={`Progress to Clinch: ${teamA.name} (${formatPoints(teamAPointsWon)}) vs ${teamB.name} (${formatPoints(teamBPointsWon)}) of ${totalPoints} available`}
      >
        {/* Dynamic Color Fill Track */}
        <div className="absolute inset-0 flex items-stretch">
          {/* Team A: Solid (Points Won / Completed) */}
          <div
            style={{
              width: `${teamASolidPct}%`,
              backgroundColor: teamAColor,
            }}
            className="h-full transition-all duration-500 ease-out shrink-0"
          />

          {/* Team A: Lighter / Opaque (Live In Progress "One Up") */}
          {teamAInPlayPct > 0 && (
            <div
              style={{
                width: `${teamAInPlayPct}%`,
                backgroundColor: teamALighterColor,
              }}
              className="h-full transition-all duration-500 ease-out shrink-0 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/10 animate-pulse" />
            </div>
          )}

          {/* Neutral Gap / Unclaimed Space in the middle */}
          <div className="flex-1 h-full bg-[#071322]" />

          {/* Team B: Lighter / Opaque (Live In Progress "One Up") */}
          {teamBInPlayPct > 0 && (
            <div
              style={{
                width: `${teamBInPlayPct}%`,
                backgroundColor: teamBLighterColor,
              }}
              className="h-full transition-all duration-500 ease-out shrink-0 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/10 animate-pulse" />
            </div>
          )}

          {/* Team B: Solid (Points Won / Completed) */}
          <div
            style={{
              width: `${teamBSolidPct}%`,
              backgroundColor: teamBColor,
            }}
            className="h-full transition-all duration-500 ease-out shrink-0"
          />
        </div>

        {/* Segment Grid Overlay: Vertical dividers showing each available tournament point */}
        <div 
          className="absolute inset-0 grid h-full w-full pointer-events-none z-10"
          style={{
            gridTemplateColumns: `repeat(${totalSegments}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: totalSegments }).map((_, idx) => (
            <div 
              key={idx}
              className="border-r border-white/25 last:border-r-0 h-full"
            />
          ))}
        </div>

        {/* Clinch Marker Lines: marks the points needed to clinch outright for Team A (from left) and Team B (from right) */}
        {totalPoints > 0 && effectiveClinchThreshold > 0 && (
          <>
            {/* Team A Clinch Line */}
            <div 
              className="absolute top-0 bottom-0 w-0.5 sm:w-1 bg-slate-950/90 z-20 pointer-events-none shadow-[0_0_6px_rgba(0,0,0,0.8)]"
              style={{
                left: `${(effectiveClinchThreshold / totalPoints) * 100}%`,
              }}
              title={`${teamA.name} Clinch Target (${effectiveClinchThreshold} pts)`}
            />
            {/* Team B Clinch Line (from right) if asymmetric */}
            {((totalPoints - effectiveClinchThreshold) / totalPoints) * 100 !== (effectiveClinchThreshold / totalPoints) * 100 && (
              <div 
                className="absolute top-0 bottom-0 w-0.5 sm:w-1 bg-slate-950/90 z-20 pointer-events-none shadow-[0_0_6px_rgba(0,0,0,0.8)]"
                style={{
                  left: `${((totalPoints - effectiveClinchThreshold) / totalPoints) * 100}%`,
                }}
                title={`${teamB.name} Clinch Target (${effectiveClinchThreshold} pts)`}
              />
            )}
          </>
        )}

        {/* Bold White Numbers Inside the Bar */}
        {/* Left Side: Team A Score */}
        <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-30 flex items-center gap-1.5 pointer-events-none select-none">
          <span className="text-2xl sm:text-3xl font-black font-mono text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] leading-none">
            {formatPoints(teamAPointsWon)}
          </span>
          {teamAClinched && (
            <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300 fill-amber-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] animate-bounce" />
          )}
        </div>

        {/* Right Side: Team B Score */}
        <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-30 flex items-center gap-1.5 pointer-events-none select-none">
          {teamBClinched && (
            <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300 fill-amber-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] animate-bounce" />
          )}
          <span className="text-2xl sm:text-3xl font-black font-mono text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] leading-none">
            {formatPoints(teamBPointsWon)}
          </span>
        </div>
      </div>

      {/* Footer Row: Completed Matches counter & Info toggle button */}
      <div className="flex items-center justify-center gap-2 text-slate-300 text-xs sm:text-sm font-medium pt-0.5">
        <span>
          {completedMatchesCount}/{totalMatchesCount} Matches complete
        </span>
        {liveMatches.length > 0 && (
          <span className="text-[11px] text-emerald-400 font-bold">
            • {liveMatches.length} in progress
          </span>
        )}
        <button
          type="button"
          onClick={() => setShowInfo(prev => !prev)}
          className="w-4 h-4 rounded-full border border-slate-500 hover:border-white text-slate-400 hover:text-white flex items-center justify-center text-[10px] font-serif italic transition cursor-pointer ml-0.5"
          title="Explain Progress to Clinch scoring"
          aria-label="Explain Progress to Clinch scoring"
        >
          <Info className="w-2.5 h-2.5" />
        </button>
      </div>

      {/* Explanatory Info Card (Collapsible) */}
      {showInfo && (
        <div className="p-3 bg-slate-900/90 border border-slate-700/80 rounded-xl text-xs text-slate-300 space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white uppercase tracking-wider text-[11px]">
              Progress to Clinch Guide
            </span>
            <button
              type="button"
              onClick={() => setShowInfo(false)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-xs shrink-0" style={{ backgroundColor: teamAColor }} />
              <span><strong>Solid {teamA.shortCode || teamA.name}</strong>: Secured points from completed matches</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-xs shrink-0" style={{ backgroundColor: teamALighterColor }} />
              <span><strong>Light {teamA.shortCode || teamA.name}</strong>: Live matches where team is currently 1 UP or leading</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-xs shrink-0" style={{ backgroundColor: teamBColor }} />
              <span><strong>Solid {teamB.shortCode || teamB.name}</strong>: Secured points from completed matches</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-xs shrink-0" style={{ backgroundColor: teamBLighterColor }} />
              <span><strong>Light {teamB.shortCode || teamB.name}</strong>: Live matches where team is currently 1 UP or leading</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-800">
            Total of {totalPoints} points available across all rounds. A team reaching {effectiveClinchThreshold} points wins the championship outright.
          </p>
        </div>
      )}
    </div>
  );
};
