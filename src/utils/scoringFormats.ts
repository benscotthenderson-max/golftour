import { GameType, HoleDefinition, HoleScore, PlayerInMatch } from '../types/golf';
import { PlayerStrokeAllocation } from './handicapEngine';

/**
 * Golf Scoring & Matchplay Calculation Suite
 * Supports:
 * - Stroke Play (Gross & Net Leaderboards)
 * - Individual Stableford
 * - Match Play (1v1 Singles with Dormie / Clinch status)
 * - Better Ball (Fourball / 2v2 Teams)
 * - Scramble (Team Best-Ball)
 */

export interface HoleNetCalculation {
  holeNumber: number;
  par: number;
  strokeIndex: number;
  grossScore: number;
  allocatedStrokes: number;
  netScore: number;
  scoreTerm: string; // 'Eagle', 'Birdie', 'Par', 'Bogey', 'Double Bogey', etc.
  stablefordPoints: number;
}

export interface MatchPlayHoleResult {
  holeNumber: number;
  par: number;
  player1Net: number;
  player2Net: number;
  winnerUserId: string | 'HALVED' | 'UNPLAYED';
  standingDescription: string; // e.g. "Marcus 1 UP", "All Square", "Marcus 2 UP"
}

export interface MatchPlayStatus {
  leaderUserId: string | null; // null if All Square
  leaderName: string;
  margin: number; // e.g. 2
  holesRemaining: number;
  statusText: string; // "Marcus 2 UP thru 14", "All Square thru 9", "Marcus wins 3 & 2", "Dormie 1"
  isCompleted: boolean;
  history: MatchPlayHoleResult[];
}

export interface BetterBallHoleResult {
  holeNumber: number;
  par: number;
  teamANet: number;
  teamBNet: number;
  teamABestPlayer: string;
  teamBBestPlayer: string;
  winningTeam: 'TEAM_A' | 'TEAM_B' | 'HALVED' | 'UNPLAYED';
  teamAStableford: number;
  teamBStableford: number;
}

export interface BetterBallStanding {
  teamAName: string;
  teamBName: string;
  teamAPlayers: string[];
  teamBPlayers: string[];
  matchPlayStatus: {
    leaderTeam: 'TEAM_A' | 'TEAM_B' | null;
    margin: number;
    statusText: string; // "Team Marcus 1 UP thru 12", "All Square"
    isCompleted: boolean;
  };
  teamATotalStableford: number;
  teamBTotalStableford: number;
  holeResults: BetterBallHoleResult[];
}

/**
 * 1. Score Terminology Helper
 */
export function getScoreTerminology(grossScore: number, par: number): {
  term: string;
  diff: number;
  colorClass: string;
  badgeClass: string;
} {
  if (grossScore === 0) {
    return { term: '-', diff: 0, colorClass: 'text-slate-400', badgeClass: 'bg-slate-100 text-slate-500' };
  }

  const diff = grossScore - par;

  if (diff <= -3) {
    return { term: 'Albatross', diff, colorClass: 'text-amber-500 font-black', badgeClass: 'bg-amber-400 text-slate-950 font-black ring-1 ring-amber-500' };
  }
  if (diff === -2) {
    return { term: 'Eagle', diff, colorClass: 'text-amber-600 font-black', badgeClass: 'bg-amber-400 text-slate-950 font-black shadow-xs' };
  }
  if (diff === -1) {
    return { term: 'Birdie', diff, colorClass: 'text-emerald-700 font-black', badgeClass: 'bg-emerald-700 text-white font-black shadow-xs' };
  }
  if (diff === 0) {
    return { term: 'Par', diff, colorClass: 'text-slate-700 font-bold', badgeClass: 'bg-slate-100 text-slate-800 font-bold border border-slate-200' };
  }
  if (diff === 1) {
    return { term: 'Bogey', diff, colorClass: 'text-rose-600 font-bold', badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200 font-bold' };
  }
  if (diff === 2) {
    return { term: 'Double Bogey', diff, colorClass: 'text-rose-700 font-black', badgeClass: 'bg-rose-100 text-rose-800 border border-rose-300 font-black' };
  }
  return { term: `+${diff}`, diff, colorClass: 'text-rose-900 font-black', badgeClass: 'bg-rose-200 text-rose-900 border border-rose-400 font-black' };
}

/**
 * 2. Calculate Stableford Points for a single hole based on Net Score
 * Points formula:
 * Net Par = 2 pts
 * Net Birdie = 3 pts
 * Net Eagle = 4 pts
 * Net Albatross = 5 pts
 * Net Bogey = 1 pt
 * Net Double Bogey or worse = 0 pts
 */
export function calculateStablefordPoints(netScore: number, par: number): number {
  if (netScore <= 0) return 0;
  const points = par - netScore + 2;
  return Math.max(0, points);
}

/**
 * 3. Calculate Hole Net Score & Points for a Player
 */
export function computeHoleNetScore(
  grossScore: number,
  par: number,
  strokeIndex: number,
  allocatedStrokes: number
): HoleNetCalculation {
  if (grossScore === 0) {
    return {
      holeNumber: 0,
      par,
      strokeIndex,
      grossScore: 0,
      allocatedStrokes,
      netScore: 0,
      scoreTerm: '-',
      stablefordPoints: 0,
    };
  }

  const netScore = Math.max(1, grossScore - allocatedStrokes);
  const termData = getScoreTerminology(grossScore, par);
  const stablefordPoints = calculateStablefordPoints(netScore, par);

  return {
    holeNumber: 0,
    par,
    strokeIndex,
    grossScore,
    allocatedStrokes,
    netScore,
    scoreTerm: termData.term,
    stablefordPoints,
  };
}

/**
 * 4. Match Play Calculator (Singles 1v1)
 */
export function calculateMatchPlayStatus(
  player1: PlayerInMatch,
  player2: PlayerInMatch,
  holes: HoleDefinition[],
  allocations: Record<string, PlayerStrokeAllocation>
): MatchPlayStatus {
  let p1Margin = 0; // Positive = P1 leading, Negative = P2 leading
  let holesPlayed = 0;
  const history: MatchPlayHoleResult[] = [];

  const p1Alloc = allocations[player1.userId];
  const p2Alloc = allocations[player2.userId];

  for (let i = 0; i < holes.length; i++) {
    const hole = holes[i];
    const p1Score = player1.holeScores.find(h => h.holeNumber === hole.holeNumber);
    const p2Score = player2.holeScores.find(h => h.holeNumber === hole.holeNumber);

    const p1Gross = p1Score?.grossScore || 0;
    const p2Gross = p2Score?.grossScore || 0;

    if (p1Gross > 0 && p2Gross > 0) {
      holesPlayed++;
      const p1Dots = p1Alloc?.holeStrokes[hole.holeNumber] || 0;
      const p2Dots = p2Alloc?.holeStrokes[hole.holeNumber] || 0;

      const p1Net = p1Gross - p1Dots;
      const p2Net = p2Gross - p2Dots;

      let winner: string | 'HALVED' = 'HALVED';
      if (p1Net < p2Net) {
        p1Margin += 1;
        winner = player1.userId;
      } else if (p2Net < p1Net) {
        p1Margin -= 1;
        winner = player2.userId;
      }

      const holesLeft = holes.length - holesPlayed;
      let standingDesc = 'All Square';
      if (p1Margin > 0) {
        standingDesc = `${player1.displayName.split(' ')[0]} ${p1Margin} UP`;
      } else if (p1Margin < 0) {
        standingDesc = `${player2.displayName.split(' ')[0]} ${Math.abs(p1Margin)} UP`;
      }

      history.push({
        holeNumber: hole.holeNumber,
        par: hole.par,
        player1Net: p1Net,
        player2Net: p2Net,
        winnerUserId: winner,
        standingDescription: standingDesc,
      });

      // Early match completion check (e.g. 3 UP with 2 to play = Won 3 & 2)
      if (Math.abs(p1Margin) > holesLeft) {
        break;
      }
    }
  }

  const totalHoles = holes.length;
  const holesRemaining = totalHoles - holesPlayed;
  const leaderMargin = Math.abs(p1Margin);
  const leaderUserId = p1Margin > 0 ? player1.userId : p1Margin < 0 ? player2.userId : null;
  const leaderName = p1Margin > 0 ? player1.displayName : p1Margin < 0 ? player2.displayName : 'All Square';

  let statusText = 'Match Not Started';
  let isCompleted = false;

  if (holesPlayed === 0) {
    statusText = 'Ready to Tee Off';
  } else if (leaderMargin > holesRemaining) {
    // Match Clinched
    isCompleted = true;
    const leaderShort = leaderName.split(' ')[0];
    if (holesRemaining === 0) {
      statusText = `${leaderShort} wins ${leaderMargin} UP`;
    } else {
      statusText = `${leaderShort} wins ${leaderMargin} & ${holesRemaining}`;
    }
  } else if (holesRemaining === 0 && leaderMargin === 0) {
    // Halved match on 18th
    isCompleted = true;
    statusText = 'Match Halved (Tie)';
  } else if (leaderMargin === holesRemaining && holesRemaining > 0) {
    // Dormie status (Leading by exactly the holes remaining)
    const leaderShort = leaderName.split(' ')[0];
    statusText = `${leaderShort} Dormie ${leaderMargin} (thru ${holesPlayed})`;
  } else if (leaderMargin === 0) {
    statusText = `All Square (thru ${holesPlayed})`;
  } else {
    const leaderShort = leaderName.split(' ')[0];
    statusText = `${leaderShort} ${leaderMargin} UP (thru ${holesPlayed})`;
  }

  return {
    leaderUserId,
    leaderName,
    margin: leaderMargin,
    holesRemaining,
    statusText,
    isCompleted,
    history,
  };
}

/**
 * 5. Better Ball (Fourball 2v2) Calculator
 */
export function calculateBetterBallStanding(
  teamA: PlayerInMatch[],
  teamB: PlayerInMatch[],
  holes: HoleDefinition[],
  allocations: Record<string, PlayerStrokeAllocation>,
  teamAName = 'Team 1',
  teamBName = 'Team 2'
): BetterBallStanding {
  let teamAMargin = 0;
  let holesPlayed = 0;
  let teamATotalStableford = 0;
  let teamBTotalStableford = 0;
  const holeResults: BetterBallHoleResult[] = [];

  for (let i = 0; i < holes.length; i++) {
    const hole = holes[i];

    // Compute Net for Team A players
    const teamANets = teamA.map(player => {
      const score = player.holeScores.find(h => h.holeNumber === hole.holeNumber);
      const gross = score?.grossScore || 0;
      if (gross === 0) return { player, gross: 0, net: 999, stableford: 0 };
      const dots = allocations[player.userId]?.holeStrokes[hole.holeNumber] || 0;
      const net = gross - dots;
      const pts = calculateStablefordPoints(net, hole.par);
      return { player, gross, net, stableford: pts };
    });

    // Compute Net for Team B players
    const teamBNets = teamB.map(player => {
      const score = player.holeScores.find(h => h.holeNumber === hole.holeNumber);
      const gross = score?.grossScore || 0;
      if (gross === 0) return { player, gross: 0, net: 999, stableford: 0 };
      const dots = allocations[player.userId]?.holeStrokes[hole.holeNumber] || 0;
      const net = gross - dots;
      const pts = calculateStablefordPoints(net, hole.par);
      return { player, gross, net, stableford: pts };
    });

    const hasTeamAPlayed = teamANets.some(t => t.gross > 0);
    const hasTeamBPlayed = teamBNets.some(t => t.gross > 0);

    if (hasTeamAPlayed && hasTeamBPlayed) {
      holesPlayed++;

      const bestA = [...teamANets].sort((a, b) => a.net - b.net)[0];
      const bestB = [...teamBNets].sort((a, b) => a.net - b.net)[0];

      const maxPtsA = Math.max(...teamANets.map(t => t.stableford));
      const maxPtsB = Math.max(...teamBNets.map(t => t.stableford));
      teamATotalStableford += maxPtsA;
      teamBTotalStableford += maxPtsB;

      let winningTeam: 'TEAM_A' | 'TEAM_B' | 'HALVED' = 'HALVED';
      if (bestA.net < bestB.net) {
        teamAMargin += 1;
        winningTeam = 'TEAM_A';
      } else if (bestB.net < bestA.net) {
        teamAMargin -= 1;
        winningTeam = 'TEAM_B';
      }

      holeResults.push({
        holeNumber: hole.holeNumber,
        par: hole.par,
        teamANet: bestA.net,
        teamBNet: bestB.net,
        teamABestPlayer: bestA.player.displayName,
        teamBBestPlayer: bestB.player.displayName,
        winningTeam,
        teamAStableford: maxPtsA,
        teamBStableford: maxPtsB,
      });

      const holesLeft = holes.length - holesPlayed;
      if (Math.abs(teamAMargin) > holesLeft) {
        break;
      }
    }
  }

  const totalHoles = holes.length;
  const holesRemaining = totalHoles - holesPlayed;
  const leaderMargin = Math.abs(teamAMargin);
  const leaderTeam: 'TEAM_A' | 'TEAM_B' | null = teamAMargin > 0 ? 'TEAM_A' : teamAMargin < 0 ? 'TEAM_B' : null;
  const leaderName = teamAMargin > 0 ? teamAName : teamAMargin < 0 ? teamBName : 'All Square';

  let statusText = 'Ready to Tee Off';
  let isCompleted = false;

  if (holesPlayed > 0) {
    if (leaderMargin > holesRemaining) {
      isCompleted = true;
      statusText = holesRemaining === 0
        ? `${leaderName} wins ${leaderMargin} UP`
        : `${leaderName} wins ${leaderMargin} & ${holesRemaining}`;
    } else if (holesRemaining === 0 && leaderMargin === 0) {
      isCompleted = true;
      statusText = 'Match Halved (Tie)';
    } else if (leaderMargin === holesRemaining && holesRemaining > 0) {
      statusText = `${leaderName} Dormie ${leaderMargin} (thru ${holesPlayed})`;
    } else if (leaderMargin === 0) {
      statusText = `All Square (thru ${holesPlayed})`;
    } else {
      statusText = `${leaderName} ${leaderMargin} UP (thru ${holesPlayed})`;
    }
  }

  return {
    teamAName,
    teamBName,
    teamAPlayers: teamA.map(p => p.displayName),
    teamBPlayers: teamB.map(p => p.displayName),
    matchPlayStatus: {
      leaderTeam,
      margin: leaderMargin,
      statusText,
      isCompleted,
    },
    teamATotalStableford,
    teamBTotalStableford,
    holeResults,
  };
}
