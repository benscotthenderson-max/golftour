import { 
  Tournament, 
  TournamentRound, 
  TournamentMatch, 
  TournamentTeam, 
  TournamentRoundFormat, 
  TournamentLeaderboard,
  TeamLeaderboardEntry,
  PlayerMvpRankingEntry,
  TournamentHoleResult,
  GolferUser,
  PlayerInMatch
} from '../types/golf';
import { MOCK_COURSES } from '../data/mockData';


/**
 * Checks if every match across every round in a tournament has every hole entered and finalized.
 * When true, the tournament automatically transitions from 'live' to 'completed'.
 */
export function isTournamentAllMatchesCompleted(tournament: Tournament): boolean {
  if (!tournament.rounds || tournament.rounds.length === 0) return false;
  let totalMatches = 0;
  for (const round of tournament.rounds) {
    if (!round.matches || round.matches.length === 0) return false;
    totalMatches += round.matches.length;
    for (const match of round.matches) {
      const holesTotal = match.holesTotal || 18;
      const holeResultsCount = match.holeResults ? Object.keys(match.holeResults).length : 0;
      const isAllHolesEntered = holeResultsCount >= holesTotal || match.holesCompleted >= holesTotal;
      const isMatchFinalized = match.status === 'completed' || match.isDecided || isAllHolesEntered;
      if (!isMatchFinalized) {
        return false;
      }
    }
  }
  return totalMatches > 0;
}

/**
 * Calculates current match state (Lead, Margin, Dormie, Final outcome, Points)
 * Based on standard Match Play Rules:
 * - 1 Point for Win
 * - 0.5 Point for Halved / Tie
 * - 0.0 Points for Loss
 *
 * PERMANENT MATCH RESULT LOCKING:
 * Once a match hits its mathematically decisive point (e.g. 5&4, 3&2, 2&1, or 18th hole finish),
 * its official match status, outcome statement, winner, and points are permanently frozen.
 * Subsequent holes (e.g. bye holes 15-18) can continue to be logged for individual gross/net scores,
 * handicap tracking, and fines without altering or recalculating the finalized match outcome.
 */
export function evaluateTournamentMatchStatus(match: TournamentMatch): TournamentMatch {
  const holesTotal = match.holesTotal || 18;
  const recordedHoleNums = Object.keys(match.holeResults || {})
    .map(Number)
    .sort((a, b) => a - b);
  const holesPlayed = recordedHoleNums.length;

  const leadNameSideA = match.sideA.teamName || match.sideA.label;
  const leadNameSideB = match.sideB.teamName || match.sideB.label;

  // 1. Chronologically trace holes 1 to holesTotal to evaluate match progression
  // and identify the first mathematically decisive point.
  let runningSideAWon = 0;
  let runningSideBWon = 0;
  let firstDecisiveHole: number | null = null;
  let decisiveStatusText: string | null = null;
  let decisiveWinnerSide: 'sideA' | 'sideB' | 'halved' | null = null;
  let decisiveLeadSide: 'sideA' | 'sideB' | 'tied' | null = null;
  let decisiveMargin: number = 0;
  let decisivePoints = { sideA: 0, sideB: 0 };
  let decisiveHolesRemaining: number = 0;

  const updatedHoleResults: Record<number, TournamentHoleResult> = {};

  for (let h = 1; h <= holesTotal; h++) {
    const hr = match.holeResults?.[h];
    if (hr) {
      if (hr.winnerSide === 'sideA') runningSideAWon++;
      else if (hr.winnerSide === 'sideB') runningSideBWon++;

      const diff = runningSideAWon - runningSideBWon;
      const absDiff = Math.abs(diff);
      const holesRemaining = holesTotal - h;

      let currentLead: 'sideA' | 'sideB' | 'tied' | null = 'tied';
      if (diff > 0) currentLead = 'sideA';
      else if (diff < 0) currentLead = 'sideB';

      const currentLeadName = currentLead === 'sideA' ? leadNameSideA : leadNameSideB;

      // Check if match became mathematically decisive at this hole
      if (firstDecisiveHole === null) {
        if (absDiff > holesRemaining) {
          firstDecisiveHole = h;
          decisiveWinnerSide = diff > 0 ? 'sideA' : 'sideB';
          decisiveLeadSide = decisiveWinnerSide;
          decisiveMargin = absDiff;
          decisiveHolesRemaining = holesRemaining;
          const andMargin = holesRemaining === 0 ? `${absDiff} UP` : `${absDiff} & ${holesRemaining}`;
          decisiveStatusText = `FINAL: ${currentLeadName} won ${andMargin}`;
          decisivePoints = decisiveWinnerSide === 'sideA' ? { sideA: 1.0, sideB: 0.0 } : { sideA: 0.0, sideB: 1.0 };
        } else if (h === holesTotal) {
          firstDecisiveHole = 18;
          decisiveHolesRemaining = 0;
          if (diff === 0) {
            decisiveWinnerSide = 'halved';
            decisiveLeadSide = 'tied';
            decisiveMargin = 0;
            decisiveStatusText = 'FINAL: Halved (0.5 - 0.5)';
            decisivePoints = { sideA: 0.5, sideB: 0.5 };
          } else {
            decisiveWinnerSide = diff > 0 ? 'sideA' : 'sideB';
            decisiveLeadSide = decisiveWinnerSide;
            decisiveMargin = absDiff;
            decisiveStatusText = `FINAL: ${currentLeadName} won ${absDiff} UP`;
            decisivePoints = decisiveWinnerSide === 'sideA' ? { sideA: 1.0, sideB: 0.0 } : { sideA: 0.0, sideB: 1.0 };
          }
        }
      }

      // Determine matchStatusAfterHole for this hole
      let statusAfterHole = hr.matchStatusAfterHole;
      if (firstDecisiveHole !== null && h > firstDecisiveHole) {
        // Bye hole played after match was decided (e.g., holes 15-18 after a 5&4 win)
        const marginStr = decisiveHolesRemaining > 0 
          ? `${decisiveMargin}&${decisiveHolesRemaining}` 
          : `${decisiveMargin} UP`;
        statusAfterHole = `Decided (${marginStr})`;
      } else if (firstDecisiveHole !== null && h === firstDecisiveHole) {
        statusAfterHole = decisiveStatusText ? decisiveStatusText.replace(/^FINAL:\s*/i, '') : 'Final';
      } else if (absDiff === holesRemaining && holesRemaining > 0) {
        statusAfterHole = `DORMIE ${holesRemaining} (${currentLeadName})`;
      } else if (diff === 0) {
        statusAfterHole = 'AS';
      } else {
        statusAfterHole = `${currentLeadName} ${absDiff} UP`;
      }

      updatedHoleResults[h] = {
        ...hr,
        matchStatusAfterHole: statusAfterHole || hr.matchStatusAfterHole || 'Recorded',
      };
    }
  }

  // 2. Lock result check:
  // If the match was already flagged as decided or completed with a finalized outcome statement,
  // preserve the locked final outcome string, winner, and points permanently.
  const hasExistingLockedDecision = Boolean(
    (match.isDecided && match.finalOutcomeStatement) ||
    (match.status === 'completed' && match.currentStatusText?.startsWith('FINAL:') && match.winnerSide)
  );

  let isFinal = false;
  let finalStatusText = '';
  let finalWinnerSide: 'sideA' | 'sideB' | 'halved' | null = null;
  let finalWinnerTeamId: string | undefined = undefined;
  let finalPoints = { sideA: 0, sideB: 0 };
  let finalDecidedHole: number | undefined = undefined;
  let finalLeadSide: 'sideA' | 'sideB' | 'tied' | null = null;
  let finalLeadMargin: number = 0;

  if (hasExistingLockedDecision) {
    // Preserve previously locked outcome permanently!
    isFinal = true;
    finalStatusText = match.finalOutcomeStatement || match.currentStatusText;
    finalWinnerSide = match.winnerSide;
    finalWinnerTeamId = match.winnerTeamId || (match.winnerSide === 'sideA' ? match.sideA.teamId : (match.winnerSide === 'sideB' ? match.sideB.teamId : undefined));
    finalPoints = match.pointsAwarded || (finalWinnerSide === 'sideA' ? { sideA: 1.0, sideB: 0.0 } : (finalWinnerSide === 'sideB' ? { sideA: 0.0, sideB: 1.0 } : { sideA: 0.5, sideB: 0.5 }));
    finalDecidedHole = match.decidedAtHole || firstDecisiveHole || holesPlayed;
    finalLeadSide = match.leadSide || (finalWinnerSide === 'halved' ? 'tied' : finalWinnerSide);
    finalLeadMargin = match.leadMargin ?? decisiveMargin;
  } else if (firstDecisiveHole !== null) {
    // First time reaching decisive point! Lock it now.
    isFinal = true;
    finalStatusText = decisiveStatusText || 'FINAL';
    finalWinnerSide = decisiveWinnerSide;
    finalWinnerTeamId = decisiveWinnerSide === 'sideA' ? match.sideA.teamId : (decisiveWinnerSide === 'sideB' ? match.sideB.teamId : undefined);
    finalPoints = decisivePoints;
    finalDecidedHole = firstDecisiveHole;
    finalLeadSide = decisiveLeadSide;
    finalLeadMargin = decisiveMargin;
  } else {
    // Still live or scheduled
    isFinal = false;
    const currentDiff = runningSideAWon - runningSideBWon;
    const currentAbsDiff = Math.abs(currentDiff);
    const holesRemaining = Math.max(0, holesTotal - holesPlayed);
    finalLeadSide = currentDiff > 0 ? 'sideA' : (currentDiff < 0 ? 'sideB' : 'tied');
    finalLeadMargin = currentAbsDiff;
    finalWinnerSide = null;
    finalPoints = { sideA: 0, sideB: 0 };

    const leadName = finalLeadSide === 'sideA' ? leadNameSideA : leadNameSideB;

    if (holesPlayed === 0) {
      finalStatusText = match.status === 'scheduled' ? 'Scheduled' : 'Teeing Off';
    } else if (currentAbsDiff === holesRemaining && holesRemaining > 0) {
      finalStatusText = `DORMIE ${holesRemaining} (${leadName})`;
    } else if (currentDiff === 0) {
      finalStatusText = `All Square (AS) thru ${holesPlayed}`;
    } else {
      finalStatusText = `${leadName} ${currentAbsDiff} UP thru ${holesPlayed}`;
    }
  }

  return {
    ...match,
    holeResults: Object.keys(updatedHoleResults).length > 0 ? updatedHoleResults : match.holeResults,
    holesCompleted: holesPlayed,
    leadSide: finalLeadSide,
    leadMargin: finalLeadMargin,
    currentStatusText: finalStatusText,
    status: isFinal ? 'completed' : (holesPlayed > 0 ? 'live' : match.status),
    winnerSide: finalWinnerSide,
    winnerTeamId: finalWinnerTeamId,
    pointsAwarded: finalPoints,
    isDecided: isFinal,
    decidedAtHole: isFinal ? (finalDecidedHole || firstDecisiveHole || undefined) : undefined,
    finalOutcomeStatement: isFinal ? finalStatusText : undefined,
  };
}

/**
 * Calculates a single hole result comparing Side A vs Side B with Stroke Handicap dots
 */
export function computeHoleOutcome(
  holeNumber: number,
  par: number,
  strokeIndex: number,
  sideAScore: number,
  sideBScore: number,
  sideAStrokes: number,
  sideBStrokes: number,
  currentLeadSide: 'sideA' | 'sideB' | 'tied' | null,
  currentMargin: number,
  playerScores?: Record<string, { grossScore: number; netScore: number; strokes: number; isBestBall?: boolean }>,
  sideABestPlayerId?: string,
  sideBBestPlayerId?: string
): TournamentHoleResult {
  const sideANet = sideAScore - sideAStrokes;
  const sideBNet = sideBScore - sideBStrokes;

  let winnerSide: 'sideA' | 'sideB' | 'halved' = 'halved';
  if (sideANet < sideBNet) winnerSide = 'sideA';
  else if (sideBNet < sideANet) winnerSide = 'sideB';

  return {
    holeNumber,
    par,
    strokeIndex,
    sideAScore,
    sideBScore,
    sideANetScore: sideANet,
    sideBNetScore: sideBNet,
    sideAStrokes,
    sideBStrokes,
    winnerSide,
    matchStatusAfterHole: '',
    playerScores,
    sideABestPlayerId,
    sideBBestPlayerId,
  };
}

// Safe localStorage reader for client-side storage users to resolve real golfer profiles
function getStoredUsersDirectory(): Map<string, GolferUser | PlayerInMatch> {
  const dir = new Map<string, GolferUser | PlayerInMatch>();

  // Storage Users & Current User
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const storedAll = localStorage.getItem('playtomic_golf_all_users');
      if (storedAll) {
        const parsed = JSON.parse(storedAll);
        if (Array.isArray(parsed)) {
          parsed.forEach((u: any) => {
            if (u && u.id) dir.set(u.id, u);
          });
        }
      }
      const storedCur = localStorage.getItem('playtomic_golf_current_user');
      if (storedCur) {
        const parsed = JSON.parse(storedCur);
        if (parsed && parsed.id) dir.set(parsed.id, parsed);
      }
    } catch {
      // Ignore parse errors in non-browser or restricted contexts
    }
  }

  return dir;
}

/**
 * Calculates the points required to clinch a tournament outright for either competing team.
 * - For odd point totals: strictly Math.floor(totalPoints / 2) + 1 (e.g. 3 pts -> 2 pts, 5 pts -> 3 pts).
 * - For even point totals: (totalPoints / 2) + 0.5 (e.g. 16 pts -> 8.5 pts, 28 pts -> 14.5 pts).
 * Both teams compete on an equal footing for an outright win with zero title-retaining bias.
 */
export function calculateClinchThreshold(totalPoints: number, existingClinchPoints?: number): number {
  const pts = totalPoints && totalPoints > 0 ? totalPoints : 16.0;
  const isOdd = Math.round(pts) % 2 !== 0;

  if (isOdd) {
    // Strictly integer clinch for odd points: 3 -> 2, 5 -> 3, 7 -> 4
    return Math.floor(pts / 2) + 1;
  }

  // If even and a custom threshold > half exists, preserve it if valid
  if (typeof existingClinchPoints === 'number' && existingClinchPoints > pts / 2 && Number.isFinite(existingClinchPoints)) {
    return existingClinchPoints;
  }

  return (pts / 2) + 0.5;
}

/**
 * Dynamic Leaderboard Aggregator:
 * Computes live team point standings, round matrices, clinch threshold, and individual MVP table
 * Accurately associates real player names, teams, and match statistics.
 */
export function recalculateTournamentLeaderboard(tournament: Tournament, allUsers?: GolferUser[]): TournamentLeaderboard {
  const totalPoints = tournament.totalPoints || 16.0;
  const clinchThreshold = calculateClinchThreshold(totalPoints, tournament.clinchPoints);

  // Initialize team counters
  const teamMap: Record<string, TeamLeaderboardEntry> = {};
  tournament.teams.forEach(team => {
    teamMap[team.id] = {
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color,
      badgeIcon: team.badgeIcon,
      points: 0,
      projectedPoints: 0,
      matchesWon: 0,
      matchesTied: 0,
      matchesLost: 0,
      matchesLive: 0,
      status: 'tied',
      roundPoints: {},
    };
  });

  // Build Comprehensive User Directory from all available sources
  const userDirectory = getStoredUsersDirectory();

  if (allUsers && Array.isArray(allUsers)) {
    allUsers.forEach(u => {
      if (u && u.id) userDirectory.set(u.id, u);
    });
  }

  // Scan tournament rounds for embedded PlayerInMatch objects (which contain actual real names & avatars)
  tournament.rounds?.forEach(round => {
    round.matches?.forEach(match => {
      match.sideA?.players?.forEach(p => {
        if (p?.userId) {
          const existing = userDirectory.get(p.userId);
          const validName = p.displayName && p.displayName !== 'Tour Golfer' ? p.displayName : existing?.displayName;
          userDirectory.set(p.userId, {
            id: p.userId,
            displayName: validName || p.displayName,
            username: p.username || (existing as any)?.username || p.displayName.toLowerCase().replace(/\s+/g, '_'),
            photoURL: p.photoURL || (existing as any)?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
            handicapIndex: p.handicapIndex ?? (existing as any)?.handicapIndex ?? 10.0,
            playtomicLevel: p.playtomicLevel ?? (existing as any)?.playtomicLevel ?? 3.5,
          } as any);
        }
      });

      match.sideB?.players?.forEach(p => {
        if (p?.userId) {
          const existing = userDirectory.get(p.userId);
          const validName = p.displayName && p.displayName !== 'Tour Golfer' ? p.displayName : existing?.displayName;
          userDirectory.set(p.userId, {
            id: p.userId,
            displayName: validName || p.displayName,
            username: p.username || (existing as any)?.username || p.displayName.toLowerCase().replace(/\s+/g, '_'),
            photoURL: p.photoURL || (existing as any)?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
            handicapIndex: p.handicapIndex ?? (existing as any)?.handicapIndex ?? 10.0,
            playtomicLevel: p.playtomicLevel ?? (existing as any)?.playtomicLevel ?? 3.5,
          } as any);
        }
      });
    });
  });

  // Also verify captains
  tournament.teams?.forEach(team => {
    if (team.captainId && team.captainName) {
      const existing = userDirectory.get(team.captainId);
      if (!existing || existing.displayName === 'Tour Golfer') {
        userDirectory.set(team.captainId, {
          id: team.captainId,
          displayName: team.captainName,
          username: team.captainName.toLowerCase().replace(/\s+/g, '_'),
          photoURL: (existing as any)?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
          handicapIndex: (existing as any)?.handicapIndex ?? 8.0,
          playtomicLevel: (existing as any)?.playtomicLevel ?? 4.0,
        } as any);
      }
    }
  });

  // Helper to reliably resolve a player's real identity without falling back to placeholder strings
  const resolveUser = (pid: string, team?: TournamentTeam): GolferUser | PlayerInMatch => {
    const found = userDirectory.get(pid);
    if (found && found.displayName && found.displayName !== 'Tour Golfer') {
      return found;
    }

    if (team && team.captainId === pid && team.captainName) {
      return {
        id: pid,
        displayName: team.captainName,
        username: team.captainName.toLowerCase().replace(/\s+/g, '_'),
        photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
        handicapIndex: 10.0,
        playtomicLevel: 3.5,
      } as any;
    }

    // Format sensible name if ID is descriptive e.g. user-marcus -> Marcus
    let fallbackName = 'Golfer';
    if (pid.startsWith('user-')) {
      const parts = pid.replace('user-', '').split(/[-_]/).filter(Boolean);
      if (parts.length > 0) {
        fallbackName = parts.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
      }
    } else if (pid.length > 0) {
      fallbackName = `Golfer ${pid.substring(0, 4).toUpperCase()}`;
    }

    return {
      id: pid,
      displayName: (found && found.displayName !== 'Tour Golfer') ? found.displayName : fallbackName,
      username: found?.username || pid,
      photoURL: found?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      handicapIndex: (found as any)?.handicapIndex ?? 10.0,
      playtomicLevel: (found as any)?.playtomicLevel ?? 3.5,
    } as any;
  };

  // Track player stats
  const playerStatsMap: Record<string, {
    user: GolferUser | PlayerInMatch;
    teamId?: string;
    teamName?: string;
    teamColor?: string;
    matchesPlayed: number;
    matchesWon: number;
    matchesTied: number;
    matchesLost: number;
    pointsEarned: number;
    pointsPossible: number;
    holesWonCount: number;
    betterBallContributions?: number;
    birdiesCount: number;
    parsCount: number;
    eaglesCount: number;
  }> = {};

  // 1. Initialize all players from team rosters
  tournament.teams.forEach(team => {
    team.playerIds?.forEach(pid => {
      const user = resolveUser(pid, team);
      playerStatsMap[pid] = {
        user,
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color,
        matchesPlayed: 0,
        matchesWon: 0,
        matchesTied: 0,
        matchesLost: 0,
        pointsEarned: 0,
        pointsPossible: 0,
        holesWonCount: 0,
        betterBallContributions: 0,
        birdiesCount: 0,
        parsCount: 0,
        eaglesCount: 0,
      };
    });
  });

  // 2. Ensure any player in match lineups is also initialized with correct team association
  tournament.rounds?.forEach(round => {
    round.matches?.forEach(match => {
      const teamA = tournament.teams.find(t => t.id === match.sideA.teamId);
      const teamB = tournament.teams.find(t => t.id === match.sideB.teamId);

      match.sideA?.playerIds?.forEach(pid => {
        if (!playerStatsMap[pid]) {
          const user = resolveUser(pid, teamA);
          playerStatsMap[pid] = {
            user,
            teamId: match.sideA.teamId || teamA?.id,
            teamName: match.sideA.teamName || teamA?.name,
            teamColor: match.sideA.teamColor || teamA?.color,
            matchesPlayed: 0,
            matchesWon: 0,
            matchesTied: 0,
            matchesLost: 0,
            pointsEarned: 0,
            pointsPossible: 0,
            holesWonCount: 0,
            betterBallContributions: 0,
            birdiesCount: 0,
            parsCount: 0,
            eaglesCount: 0,
          };
        }
      });

      match.sideB?.playerIds?.forEach(pid => {
        if (!playerStatsMap[pid]) {
          const user = resolveUser(pid, teamB);
          playerStatsMap[pid] = {
            user,
            teamId: match.sideB.teamId || teamB?.id,
            teamName: match.sideB.teamName || teamB?.name,
            teamColor: match.sideB.teamColor || teamB?.color,
            matchesPlayed: 0,
            matchesWon: 0,
            matchesTied: 0,
            matchesLost: 0,
            pointsEarned: 0,
            pointsPossible: 0,
            holesWonCount: 0,
            betterBallContributions: 0,
            birdiesCount: 0,
            parsCount: 0,
            eaglesCount: 0,
          };
        }
      });
    });
  });

  // Tally across all rounds and matches
  tournament.rounds.forEach(round => {
    const roundNumber = round.roundNumber;

    round.matches.forEach(rawMatch => {
      const match = evaluateTournamentMatchStatus(rawMatch);
      const sideATeam = match.sideA.teamId;
      const sideBTeam = match.sideB.teamId;

      const isScrambleFormat = (match.format && match.format.toLowerCase().includes('scramble')) ||
        (round.format && round.format.toLowerCase().includes('scramble')) ||
        (round.title && round.title.toLowerCase().includes('scramble'));
      const isBetterBallFormat = !isScrambleFormat && (
        (match.format && (match.format.toLowerCase().includes('fourball') || match.format.toLowerCase().includes('better'))) ||
        (round.format && (round.format.toLowerCase().includes('fourball') || round.format.toLowerCase().includes('better'))) ||
        (match.sideA.playerIds && match.sideA.playerIds.length > 1)
      );

      // Count holes won for MVP tracker
      Object.values(match.holeResults || {}).forEach(hr => {
        if (hr.winnerSide === 'sideA') {
          if (isBetterBallFormat && hr.sideABestPlayerId) {
            // In better ball: Only the counting player who actively won the hole is credited
            if (playerStatsMap[hr.sideABestPlayerId]) {
              playerStatsMap[hr.sideABestPlayerId].holesWonCount++;
            }
          } else {
            // Scramble or individual format
            match.sideA.playerIds?.forEach(pid => {
              if (playerStatsMap[pid]) playerStatsMap[pid].holesWonCount++;
            });
          }
        } else if (hr.winnerSide === 'sideB') {
          if (isBetterBallFormat && hr.sideBBestPlayerId) {
            // In better ball: Only the counting player who actively won the hole is credited
            if (playerStatsMap[hr.sideBBestPlayerId]) {
              playerStatsMap[hr.sideBBestPlayerId].holesWonCount++;
            }
          } else {
            match.sideB.playerIds?.forEach(pid => {
              if (playerStatsMap[pid]) playerStatsMap[pid].holesWonCount++;
            });
          }
        }

        const holePar = hr.par || 4;

        if (isScrambleFormat) {
          // Team Scramble format: automatically credit team birdies & pars to BOTH players on the team
          if (hr.sideAScore > 0) {
            if (hr.sideAScore <= holePar - 2) {
              match.sideA.playerIds?.forEach(pid => {
                if (playerStatsMap[pid]) {
                  playerStatsMap[pid].eaglesCount++;
                  playerStatsMap[pid].birdiesCount++;
                }
              });
            } else if (hr.sideAScore === holePar - 1) {
              match.sideA.playerIds?.forEach(pid => {
                if (playerStatsMap[pid]) {
                  playerStatsMap[pid].birdiesCount++;
                }
              });
            } else if (hr.sideAScore === holePar) {
              match.sideA.playerIds?.forEach(pid => {
                if (playerStatsMap[pid]) {
                  playerStatsMap[pid].parsCount++;
                }
              });
            }
          }

          if (hr.sideBScore > 0) {
            if (hr.sideBScore <= holePar - 2) {
              match.sideB.playerIds?.forEach(pid => {
                if (playerStatsMap[pid]) {
                  playerStatsMap[pid].eaglesCount++;
                  playerStatsMap[pid].birdiesCount++;
                }
              });
            } else if (hr.sideBScore === holePar - 1) {
              match.sideB.playerIds?.forEach(pid => {
                if (playerStatsMap[pid]) {
                  playerStatsMap[pid].birdiesCount++;
                }
              });
            } else if (hr.sideBScore === holePar) {
              match.sideB.playerIds?.forEach(pid => {
                if (playerStatsMap[pid]) {
                  playerStatsMap[pid].parsCount++;
                }
              });
            }
          }
        } else {
          // Individual, Fourball Better Ball, etc.
          if (hr.playerScores && Object.keys(hr.playerScores).length > 0) {
            Object.entries(hr.playerScores).forEach(([pid, pScore]) => {
              if (pScore && pScore.grossScore > 0 && playerStatsMap[pid]) {
                if (pScore.grossScore <= holePar - 2) {
                  playerStatsMap[pid].eaglesCount++;
                  playerStatsMap[pid].birdiesCount++;
                } else if (pScore.grossScore === holePar - 1) {
                  playerStatsMap[pid].birdiesCount++;
                } else if (pScore.grossScore === holePar) {
                  playerStatsMap[pid].parsCount++;
                }
              }
            });
          } else {
            // If individual breakdown isn't recorded, check side best player or single player
            if (match.sideA.playerIds && match.sideA.playerIds.length === 1 && hr.sideAScore > 0) {
              const pid = match.sideA.playerIds[0];
              if (playerStatsMap[pid]) {
                if (hr.sideAScore <= holePar - 2) {
                  playerStatsMap[pid].eaglesCount++;
                  playerStatsMap[pid].birdiesCount++;
                } else if (hr.sideAScore === holePar - 1) {
                  playerStatsMap[pid].birdiesCount++;
                } else if (hr.sideAScore === holePar) {
                  playerStatsMap[pid].parsCount++;
                }
              }
            } else if (hr.sideABestPlayerId && playerStatsMap[hr.sideABestPlayerId] && hr.sideAScore > 0) {
              const pid = hr.sideABestPlayerId;
              if (hr.sideAScore <= holePar - 2) {
                playerStatsMap[pid].eaglesCount++;
                playerStatsMap[pid].birdiesCount++;
              } else if (hr.sideAScore === holePar - 1) {
                playerStatsMap[pid].birdiesCount++;
              } else if (hr.sideAScore === holePar) {
                playerStatsMap[pid].parsCount++;
              }
            }

            if (match.sideB.playerIds && match.sideB.playerIds.length === 1 && hr.sideBScore > 0) {
              const pid = match.sideB.playerIds[0];
              if (playerStatsMap[pid]) {
                if (hr.sideBScore <= holePar - 2) {
                  playerStatsMap[pid].eaglesCount++;
                  playerStatsMap[pid].birdiesCount++;
                } else if (hr.sideBScore === holePar - 1) {
                  playerStatsMap[pid].birdiesCount++;
                } else if (hr.sideBScore === holePar) {
                  playerStatsMap[pid].parsCount++;
                }
              }
            } else if (hr.sideBBestPlayerId && playerStatsMap[hr.sideBBestPlayerId] && hr.sideBScore > 0) {
              const pid = hr.sideBBestPlayerId;
              if (hr.sideBScore <= holePar - 2) {
                playerStatsMap[pid].eaglesCount++;
                playerStatsMap[pid].birdiesCount++;
              } else if (hr.sideBScore === holePar - 1) {
                playerStatsMap[pid].birdiesCount++;
              } else if (hr.sideBScore === holePar) {
                playerStatsMap[pid].parsCount++;
              }
            }
          }
        }
      });

      if (match.status === 'completed') {
        // Concluded match points
        if (sideATeam && teamMap[sideATeam]) {
          teamMap[sideATeam].points += match.pointsAwarded.sideA;
          teamMap[sideATeam].projectedPoints += match.pointsAwarded.sideA;
          teamMap[sideATeam].roundPoints[roundNumber] = (teamMap[sideATeam].roundPoints[roundNumber] || 0) + match.pointsAwarded.sideA;

          if (match.winnerSide === 'sideA') teamMap[sideATeam].matchesWon++;
          else if (match.winnerSide === 'halved') teamMap[sideATeam].matchesTied++;
          else teamMap[sideATeam].matchesLost++;
        }

        if (sideBTeam && teamMap[sideBTeam]) {
          teamMap[sideBTeam].points += match.pointsAwarded.sideB;
          teamMap[sideBTeam].projectedPoints += match.pointsAwarded.sideB;
          teamMap[sideBTeam].roundPoints[roundNumber] = (teamMap[sideBTeam].roundPoints[roundNumber] || 0) + match.pointsAwarded.sideB;

          if (match.winnerSide === 'sideB') teamMap[sideBTeam].matchesWon++;
          else if (match.winnerSide === 'halved') teamMap[sideBTeam].matchesTied++;
          else teamMap[sideBTeam].matchesLost++;
        }

        // Concluded match player record
        match.sideA.playerIds?.forEach(pid => {
          if (playerStatsMap[pid]) {
            playerStatsMap[pid].matchesPlayed++;
            playerStatsMap[pid].pointsPossible++;
            playerStatsMap[pid].pointsEarned += match.pointsAwarded.sideA;
            if (match.winnerSide === 'sideA') playerStatsMap[pid].matchesWon++;
            else if (match.winnerSide === 'halved') playerStatsMap[pid].matchesTied++;
            else playerStatsMap[pid].matchesLost++;
          }
        });

        match.sideB.playerIds?.forEach(pid => {
          if (playerStatsMap[pid]) {
            playerStatsMap[pid].matchesPlayed++;
            playerStatsMap[pid].pointsPossible++;
            playerStatsMap[pid].pointsEarned += match.pointsAwarded.sideB;
            if (match.winnerSide === 'sideB') playerStatsMap[pid].matchesWon++;
            else if (match.winnerSide === 'halved') playerStatsMap[pid].matchesTied++;
            else playerStatsMap[pid].matchesLost++;
          }
        });
      } else if (match.status === 'live') {
        // Live match projection
        if (sideATeam && teamMap[sideATeam]) teamMap[sideATeam].matchesLive++;
        if (sideBTeam && teamMap[sideBTeam]) teamMap[sideBTeam].matchesLive++;

        if (match.leadSide === 'sideA') {
          if (sideATeam && teamMap[sideATeam]) teamMap[sideATeam].projectedPoints += 1.0;
        } else if (match.leadSide === 'sideB') {
          if (sideBTeam && teamMap[sideBTeam]) teamMap[sideBTeam].projectedPoints += 1.0;
        } else {
          if (sideATeam && teamMap[sideATeam]) teamMap[sideATeam].projectedPoints += 0.5;
          if (sideBTeam && teamMap[sideBTeam]) teamMap[sideBTeam].projectedPoints += 0.5;
        }
      }
    });
  });

  const teamStandings = Object.values(teamMap).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.projectedPoints - a.projectedPoints;
  });

  // Evaluate clinch status
  let isClinched = false;
  let clinchedTeamId: string | undefined = undefined;

  teamStandings.forEach(t => {
    if (t.points >= clinchThreshold) {
      isClinched = true;
      clinchedTeamId = t.teamId;
      t.status = 'clinched';
    }
  });

  if (!isClinched && teamStandings.length >= 2) {
    if (teamStandings[0].points > teamStandings[1].points) {
      teamStandings[0].status = 'leading';
      teamStandings[1].status = 'trailing';
    } else {
      teamStandings[0].status = 'tied';
      teamStandings[1].status = 'tied';
    }
  }

  // Compile MVP Leaderboard with verified player identities
  const playerRankings: PlayerMvpRankingEntry[] = Object.values(playerStatsMap)
    .map(p => {
      const winPct = p.matchesPlayed > 0 ? (p.pointsEarned / p.matchesPlayed) * 100 : 0;
      const uid = (p.user as any).id || (p.user as any).userId || 'unknown';
      const assignedTeam = tournament.teams.find(t => t.id === p.teamId);

      return {
        userId: uid,
        displayName: p.user.displayName,
        username: p.user.username || uid,
        photoURL: p.user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
        teamId: p.teamId || assignedTeam?.id,
        teamName: p.teamName || assignedTeam?.name || 'Tournament Golfer',
        teamColor: p.teamColor || assignedTeam?.color || '#059669',
        handicapIndex: (p.user as any).handicapIndex || 10.0,
        playtomicLevel: (p.user as any).playtomicLevel || 3.5,
        matchesPlayed: p.matchesPlayed,
        matchesWon: p.matchesWon,
        matchesTied: p.matchesTied,
        matchesLost: p.matchesLost,
        pointsEarned: p.pointsEarned,
        pointsPossible: p.pointsPossible,
        winPercentage: Math.round(winPct),
        holesWonCount: p.holesWonCount,
        betterBallContributions: p.betterBallContributions || 0,
        birdiesCount: p.birdiesCount,
        parsCount: p.parsCount,
        eaglesCount: p.eaglesCount,
        mvpRank: 1,
      };
    })
    .sort((a, b) => {
      if (b.pointsEarned !== a.pointsEarned) return b.pointsEarned - a.pointsEarned;
      if (b.winPercentage !== a.winPercentage) return b.winPercentage - a.winPercentage;
      if (b.birdiesCount !== a.birdiesCount) return b.birdiesCount - a.birdiesCount;
      if (b.holesWonCount !== a.holesWonCount) return b.holesWonCount - a.holesWonCount;
      return b.matchesWon - a.matchesWon;
    })
    .map((entry, index) => ({
      ...entry,
      mvpRank: index + 1,
    }));

  return {
    totalPointsAvailable: totalPoints,
    clinchPointsThreshold: clinchThreshold,
    isClinched,
    clinchedTeamId,
    teamStandings,
    playerRankings,
  };
}

/**
 * Intelligent Pairing Matrix Generator for Tournament Organizers
 */
export function generateAutoPairings(
  teamA: TournamentTeam,
  teamB: TournamentTeam,
  allUsers: GolferUser[],
  format: TournamentRoundFormat,
  roundNumber: number,
  roundId: string,
  tournamentId: string
): TournamentMatch[] {
  const teamAPlayers = teamA.playerIds
    .map(id => allUsers.find(u => u.id === id))
    .filter(Boolean) as GolferUser[];

  const teamBPlayers = teamB.playerIds
    .map(id => allUsers.find(u => u.id === id))
    .filter(Boolean) as GolferUser[];

  const matches: TournamentMatch[] = [];

  if (format === 'individual_matchplay') {
    // 1v1 Singles: Match by rank / index
    const count = Math.min(teamAPlayers.length, teamBPlayers.length);
    for (let i = 0; i < count; i++) {
      const pA = teamAPlayers[i];
      const pB = teamBPlayers[i];

      const match: TournamentMatch = {
        id: `match-r${roundNumber}-f${i + 1}-${Date.now()}`,
        tournamentId,
        roundId,
        matchNumber: i + 1,
        format: 'individual_matchplay',
        holesTotal: 18,
        holesCompleted: 0,
        status: 'scheduled',
        sideA: {
          teamId: teamA.id,
          teamName: teamA.name,
          teamColor: teamA.color,
          playerIds: [pA.id],
          players: [{
            userId: pA.id,
            displayName: pA.displayName,
            username: pA.username,
            photoURL: pA.photoURL,
            handicapIndex: pA.handicapIndex,
            playtomicLevel: pA.playtomicLevel,
            teeColor: 'White',
            playingHandicap: Math.round(pA.handicapIndex),
            grossScore: 0,
            netScore: 0,
            confirmed: true,
          }],
          label: pA.displayName,
          playingHandicap: Math.round(pA.handicapIndex),
        },
        sideB: {
          teamId: teamB.id,
          teamName: teamB.name,
          teamColor: teamB.color,
          playerIds: [pB.id],
          players: [{
            userId: pB.id,
            displayName: pB.displayName,
            username: pB.username,
            photoURL: pB.photoURL,
            handicapIndex: pB.handicapIndex,
            playtomicLevel: pB.playtomicLevel,
            teeColor: 'White',
            playingHandicap: Math.round(pB.handicapIndex),
            grossScore: 0,
            netScore: 0,
            confirmed: true,
          }],
          label: pB.displayName,
          playingHandicap: Math.round(pB.handicapIndex),
        },
        holeResults: {},
        currentStatusText: 'Scheduled',
        leadSide: 'tied',
        leadMargin: 0,
        pointsAwarded: { sideA: 0, sideB: 0 },
        winnerSide: null,
      };

      matches.push(match);
    }
  } else {
    // 2v2 Formats (Better Ball or 2-Man Scramble)
    const flightsCount = Math.min(Math.floor(teamAPlayers.length / 2), Math.floor(teamBPlayers.length / 2));
    for (let f = 0; f < flightsCount; f++) {
      const pA1 = teamAPlayers[f * 2];
      const pA2 = teamAPlayers[f * 2 + 1] || teamAPlayers[0];
      const pB1 = teamBPlayers[f * 2];
      const pB2 = teamBPlayers[f * 2 + 1] || teamBPlayers[0];

      const match: TournamentMatch = {
        id: `match-r${roundNumber}-f${f + 1}-${Date.now()}`,
        tournamentId,
        roundId,
        matchNumber: f + 1,
        format,
        holesTotal: 18,
        holesCompleted: 0,
        status: 'scheduled',
        sideA: {
          teamId: teamA.id,
          teamName: teamA.name,
          teamColor: teamA.color,
          playerIds: [pA1.id, pA2.id],
          players: [
            {
              userId: pA1.id,
              displayName: pA1.displayName,
              username: pA1.username,
              photoURL: pA1.photoURL,
              handicapIndex: pA1.handicapIndex,
              playtomicLevel: pA1.playtomicLevel,
              teeColor: 'White',
              playingHandicap: Math.round(pA1.handicapIndex * 0.85),
              grossScore: 0,
              netScore: 0,
              confirmed: true,
            },
            {
              userId: pA2.id,
              displayName: pA2.displayName,
              username: pA2.username,
              photoURL: pA2.photoURL,
              handicapIndex: pA2.handicapIndex,
              playtomicLevel: pA2.playtomicLevel,
              teeColor: 'White',
              playingHandicap: Math.round(pA2.handicapIndex * 0.85),
              grossScore: 0,
              netScore: 0,
              confirmed: true,
            }
          ],
          label: `${pA1.displayName.split(' ')[0]} & ${pA2.displayName.split(' ')[0]}`,
        },
        sideB: {
          teamId: teamB.id,
          teamName: teamB.name,
          teamColor: teamB.color,
          playerIds: [pB1.id, pB2.id],
          players: [
            {
              userId: pB1.id,
              displayName: pB1.displayName,
              username: pB1.username,
              photoURL: pB1.photoURL,
              handicapIndex: pB1.handicapIndex,
              playtomicLevel: pB1.playtomicLevel,
              teeColor: 'White',
              playingHandicap: Math.round(pB1.handicapIndex * 0.85),
              grossScore: 0,
              netScore: 0,
              confirmed: true,
            },
            {
              userId: pB2.id,
              displayName: pB2.displayName,
              username: pB2.username,
              photoURL: pB2.photoURL,
              handicapIndex: pB2.handicapIndex,
              playtomicLevel: pB2.playtomicLevel,
              teeColor: 'White',
              playingHandicap: Math.round(pB2.handicapIndex * 0.85),
              grossScore: 0,
              netScore: 0,
              confirmed: true,
            }
          ],
          label: `${pB1.displayName.split(' ')[0]} & ${pB2.displayName.split(' ')[0]}`,
        },
        holeResults: {},
        currentStatusText: 'Scheduled',
        leadSide: 'tied',
        leadMargin: 0,
        pointsAwarded: { sideA: 0, sideB: 0 },
        winnerSide: null,
      };

      matches.push(match);
    }
  }

  return matches;
}

/**
 * Flagship Mock Tournament Data Generator:
 * Generates the "Garden Route Ryder Cup 2026" multi-day, multi-course tournament
 */
export function createGardenRouteRyderCupMock(providedUsers?: GolferUser[]): Tournament {
  let users: GolferUser[] = providedUsers && providedUsers.length > 0 ? providedUsers : [];
  if (users.length === 0 && typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = localStorage.getItem('playtomic_golf_all_users');
      if (stored) {
        users = JSON.parse(stored);
      }
    } catch {
      // ignore
    }
  }
  const simola = MOCK_COURSES.find(c => c.id === 'course-simola-estate') || MOCK_COURSES[0];
  const knysna = MOCK_COURSES.find(c => c.id === 'course-knysna-golf') || MOCK_COURSES[1];
  const plett = MOCK_COURSES.find(c => c.id === 'course-plett-country-club') || MOCK_COURSES[2];

  const teamA: TournamentTeam = {
    id: 'team-eagles',
    name: 'Outeniqua Eagles',
    shortCode: 'EGL',
    color: '#059669', // Emerald Green
    accentColor: '#34d399',
    badgeIcon: '🦅',
    captainId: users[0]?.id || 'user-marcus',
    captainName: users[0]?.displayName || 'Marcus Vance',
    playerIds: [
      users[0]?.id || 'user-marcus',
      users[1]?.id || 'user-elena',
      users[2]?.id || 'user-sam',
      users[3]?.id || 'user-sophia',
      users[4]?.id || 'user-david',
      users[5]?.id || 'user-jordan',
      users[6]?.id || 'user-maya',
      users[7]?.id || 'user-lucas',
    ],
    totalPoints: 0,
  };

  const teamB: TournamentTeam = {
    id: 'team-albatross',
    name: 'Tsitsikamma Albatross',
    shortCode: 'ALB',
    color: '#0284c7', // Ocean Navy / Sky Blue
    accentColor: '#38bdf8',
    badgeIcon: '🌊',
    captainId: users[8]?.id || 'user-liam',
    captainName: users[8]?.displayName || 'Liam O’Connor',
    playerIds: [
      users[8]?.id || 'user-liam',
      users[9]?.id || 'user-zara',
      users[10]?.id || 'user-victor',
      users[11]?.id || 'user-chloe',
      users[12]?.id || 'user-henrik',
      users[13]?.id || 'user-amara',
      users[14]?.id || 'user-kai',
      users[15]?.id || 'user-olivia',
    ],
    totalPoints: 0,
  };

  // Build Day 1: Simola - Better Ball Matchplay (Completed)
  const round1Matches: TournamentMatch[] = [
    {
      id: 'r1-m1',
      tournamentId: 'tour-garden-route-2026',
      roundId: 'round-1',
      matchNumber: 1,
      format: 'better_ball_matchplay',
      holesTotal: 18,
      holesCompleted: 18,
      status: 'completed',
      sideA: {
        teamId: teamA.id,
        teamName: teamA.name,
        teamColor: teamA.color,
        playerIds: [teamA.playerIds[0], teamA.playerIds[1]],
        players: [
          { userId: teamA.playerIds[0], displayName: 'Marcus Vance', username: 'marcus_v', photoURL: users[0]?.photoURL || '', handicapIndex: 12.4, playtomicLevel: 4.2, teeColor: 'White', playingHandicap: 11, grossScore: 78, netScore: 67, confirmed: true },
          { userId: teamA.playerIds[1], displayName: 'Elena Rostova', username: 'elena_golf', photoURL: users[1]?.photoURL || '', handicapIndex: 5.4, playtomicLevel: 5.8, teeColor: 'White', playingHandicap: 5, grossScore: 74, netScore: 69, confirmed: true },
        ],
        label: 'Marcus & Elena',
      },
      sideB: {
        teamId: teamB.id,
        teamName: teamB.name,
        teamColor: teamB.color,
        playerIds: [teamB.playerIds[0], teamB.playerIds[1]],
        players: [
          { userId: teamB.playerIds[0], displayName: 'Liam O’Connor', username: 'liam_links', photoURL: users[8]?.photoURL || '', handicapIndex: 4.8, playtomicLevel: 5.9, teeColor: 'White', playingHandicap: 4, grossScore: 73, netScore: 69, confirmed: true },
          { userId: teamB.playerIds[1], displayName: 'Zara Chen', username: 'zara_swing', photoURL: users[9]?.photoURL || '', handicapIndex: 14.1, playtomicLevel: 3.8, teeColor: 'White', playingHandicap: 12, grossScore: 82, netScore: 70, confirmed: true },
        ],
        label: 'Liam & Zara',
      },
      holeResults: {
        1: { holeNumber: 1, par: 4, strokeIndex: 7, sideAScore: 4, sideBScore: 4, sideAStrokes: 0, sideBStrokes: 0, winnerSide: 'halved', matchStatusAfterHole: 'AS' },
        2: { holeNumber: 2, par: 4, strokeIndex: 1, sideAScore: 4, sideBScore: 5, sideAStrokes: 1, sideBStrokes: 0, winnerSide: 'sideA', matchStatusAfterHole: 'Team A 1 UP' },
        3: { holeNumber: 3, par: 3, strokeIndex: 15, sideAScore: 3, sideBScore: 3, sideAStrokes: 0, sideBStrokes: 0, winnerSide: 'halved', matchStatusAfterHole: 'Team A 1 UP' },
        4: { holeNumber: 4, par: 5, strokeIndex: 5, sideAScore: 4, sideBScore: 5, sideAStrokes: 0, sideBStrokes: 0, winnerSide: 'sideA', matchStatusAfterHole: 'Team A 2 UP' },
        15: { holeNumber: 15, par: 4, strokeIndex: 3, sideAScore: 4, sideBScore: 5, sideAStrokes: 1, sideBStrokes: 0, winnerSide: 'sideA', matchStatusAfterHole: 'Team A 3&2' },
      },
      currentStatusText: 'FINAL: Outeniqua Eagles won 3 & 2',
      leadSide: 'sideA',
      leadMargin: 3,
      pointsAwarded: { sideA: 1.0, sideB: 0.0 },
      winnerSide: 'sideA',
      winnerTeamId: teamA.id,
    },
    {
      id: 'r1-m2',
      tournamentId: 'tour-garden-route-2026',
      roundId: 'round-1',
      matchNumber: 2,
      format: 'better_ball_matchplay',
      holesTotal: 18,
      holesCompleted: 18,
      status: 'completed',
      sideA: {
        teamId: teamA.id,
        teamName: teamA.name,
        teamColor: teamA.color,
        playerIds: [teamA.playerIds[2], teamA.playerIds[3]],
        players: [
          { userId: teamA.playerIds[2], displayName: 'Sam Thorne', username: 'sam_irons', photoURL: users[2]?.photoURL || '', handicapIndex: 18.2, playtomicLevel: 3.2, teeColor: 'White', playingHandicap: 16, grossScore: 88, netScore: 72, confirmed: true },
          { userId: teamA.playerIds[3], displayName: 'Sophia Loren', username: 'sophia_putts', photoURL: users[3]?.photoURL || '', handicapIndex: 22.0, playtomicLevel: 2.8, teeColor: 'Blue', playingHandicap: 19, grossScore: 92, netScore: 73, confirmed: true },
        ],
        label: 'Sam & Sophia',
      },
      sideB: {
        teamId: teamB.id,
        teamName: teamB.name,
        teamColor: teamB.color,
        playerIds: [teamB.playerIds[2], teamB.playerIds[3]],
        players: [
          { userId: teamB.playerIds[2], displayName: 'Victor Dubois', username: 'vic_dubois', photoURL: users[10]?.photoURL || '', handicapIndex: 8.2, playtomicLevel: 5.1, teeColor: 'White', playingHandicap: 7, grossScore: 76, netScore: 69, confirmed: true },
          { userId: teamB.playerIds[3], displayName: 'Chloe Bennett', username: 'chloe_b', photoURL: users[11]?.photoURL || '', handicapIndex: 11.5, playtomicLevel: 4.4, teeColor: 'White', playingHandicap: 10, grossScore: 81, netScore: 71, confirmed: true },
        ],
        label: 'Victor & Chloe',
      },
      holeResults: {
        18: { holeNumber: 18, par: 5, strokeIndex: 11, sideAScore: 5, sideBScore: 4, sideAStrokes: 0, sideBStrokes: 0, winnerSide: 'sideB', matchStatusAfterHole: 'Team B 2 UP' },
      },
      currentStatusText: 'FINAL: Tsitsikamma Albatross won 2 UP',
      leadSide: 'sideB',
      leadMargin: 2,
      pointsAwarded: { sideA: 0.0, sideB: 1.0 },
      winnerSide: 'sideB',
      winnerTeamId: teamB.id,
    },
    {
      id: 'r1-m3',
      tournamentId: 'tour-garden-route-2026',
      roundId: 'round-1',
      matchNumber: 3,
      format: 'better_ball_matchplay',
      holesTotal: 18,
      holesCompleted: 18,
      status: 'completed',
      sideA: {
        teamId: teamA.id,
        teamName: teamA.name,
        teamColor: teamA.color,
        playerIds: [teamA.playerIds[4], teamA.playerIds[5]],
        players: [
          { userId: teamA.playerIds[4], displayName: 'David Miller', username: 'd_miller', photoURL: users[4]?.photoURL || '', handicapIndex: 9.1, playtomicLevel: 4.9, teeColor: 'White', playingHandicap: 8, grossScore: 78, netScore: 70, confirmed: true },
          { userId: teamA.playerIds[5], displayName: 'Jordan Reed', username: 'j_reed', photoURL: users[5]?.photoURL || '', handicapIndex: 15.0, playtomicLevel: 3.6, teeColor: 'White', playingHandicap: 13, grossScore: 84, netScore: 71, confirmed: true },
        ],
        label: 'David & Jordan',
      },
      sideB: {
        teamId: teamB.id,
        teamName: teamB.name,
        teamColor: teamB.color,
        playerIds: [teamB.playerIds[4], teamB.playerIds[5]],
        players: [
          { userId: teamB.playerIds[4], displayName: 'Henrik Larsson', username: 'henrik_l', photoURL: users[12]?.photoURL || '', handicapIndex: 6.2, playtomicLevel: 5.5, teeColor: 'White', playingHandicap: 5, grossScore: 75, netScore: 70, confirmed: true },
          { userId: teamB.playerIds[5], displayName: 'Amara Patel', username: 'amara_golf', photoURL: users[13]?.photoURL || '', handicapIndex: 16.8, playtomicLevel: 3.4, teeColor: 'White', playingHandicap: 14, grossScore: 87, netScore: 73, confirmed: true },
        ],
        label: 'Henrik & Amara',
      },
      holeResults: {
        18: { holeNumber: 18, par: 5, strokeIndex: 11, sideAScore: 5, sideBScore: 5, sideAStrokes: 0, sideBStrokes: 0, winnerSide: 'halved', matchStatusAfterHole: 'Halved' },
      },
      currentStatusText: 'FINAL: Halved (0.5 - 0.5)',
      leadSide: 'tied',
      leadMargin: 0,
      pointsAwarded: { sideA: 0.5, sideB: 0.5 },
      winnerSide: 'halved',
    },
    {
      id: 'r1-m4',
      tournamentId: 'tour-garden-route-2026',
      roundId: 'round-1',
      matchNumber: 4,
      format: 'better_ball_matchplay',
      holesTotal: 18,
      holesCompleted: 18,
      status: 'completed',
      sideA: {
        teamId: teamA.id,
        teamName: teamA.name,
        teamColor: teamA.color,
        playerIds: [teamA.playerIds[6], teamA.playerIds[7]],
        players: [
          { userId: teamA.playerIds[6], displayName: 'Maya Lin', username: 'maya_putts', photoURL: users[6]?.photoURL || '', handicapIndex: 7.9, playtomicLevel: 5.2, teeColor: 'White', playingHandicap: 7, grossScore: 76, netScore: 69, confirmed: true },
          { userId: teamA.playerIds[7], displayName: 'Lucas Silva', username: 'lucas_driver', photoURL: users[7]?.photoURL || '', handicapIndex: 11.2, playtomicLevel: 4.5, teeColor: 'White', playingHandicap: 10, grossScore: 80, netScore: 70, confirmed: true },
        ],
        label: 'Maya & Lucas',
      },
      sideB: {
        teamId: teamB.id,
        teamName: teamB.name,
        teamColor: teamB.color,
        playerIds: [teamB.playerIds[6], teamB.playerIds[7]],
        players: [
          { userId: teamB.playerIds[6], displayName: 'Kai Takahashi', username: 'kai_irons', photoURL: users[14]?.photoURL || '', handicapIndex: 10.4, playtomicLevel: 4.7, teeColor: 'White', playingHandicap: 9, grossScore: 80, netScore: 71, confirmed: true },
          { userId: teamB.playerIds[7], displayName: 'Olivia Garcia', username: 'olivia_g', photoURL: users[15]?.photoURL || '', handicapIndex: 13.5, playtomicLevel: 4.0, teeColor: 'White', playingHandicap: 12, grossScore: 83, netScore: 71, confirmed: true },
        ],
        label: 'Kai & Olivia',
      },
      holeResults: {
        17: { holeNumber: 17, par: 3, strokeIndex: 13, sideAScore: 3, sideBScore: 4, sideAStrokes: 0, sideBStrokes: 0, winnerSide: 'sideA', matchStatusAfterHole: 'Team A 2&1' },
      },
      currentStatusText: 'FINAL: Outeniqua Eagles won 2 & 1',
      leadSide: 'sideA',
      leadMargin: 2,
      pointsAwarded: { sideA: 1.0, sideB: 0.0 },
      winnerSide: 'sideA',
      winnerTeamId: teamA.id,
    },
  ];

  // Build Day 2: Knysna Golf Club - 2-Man Scramble (Completed)
  const round2Matches: TournamentMatch[] = [
    {
      id: 'r2-m1',
      tournamentId: 'tour-garden-route-2026',
      roundId: 'round-2',
      matchNumber: 1,
      format: 'two_man_scramble',
      holesTotal: 18,
      holesCompleted: 18,
      status: 'completed',
      sideA: {
        teamId: teamA.id,
        teamName: teamA.name,
        teamColor: teamA.color,
        playerIds: [teamA.playerIds[0], teamA.playerIds[2]],
        players: [
          { userId: teamA.playerIds[0], displayName: 'Marcus Vance', username: 'marcus_v', photoURL: users[0]?.photoURL || '', handicapIndex: 12.4, playtomicLevel: 4.2, teeColor: 'White', playingHandicap: 8, grossScore: 66, netScore: 58, confirmed: true },
          { userId: teamA.playerIds[2], displayName: 'Sam Thorne', username: 'sam_irons', photoURL: users[2]?.photoURL || '', handicapIndex: 18.2, playtomicLevel: 3.2, teeColor: 'White', playingHandicap: 8, grossScore: 66, netScore: 58, confirmed: true },
        ],
        label: 'Marcus & Sam',
      },
      sideB: {
        teamId: teamB.id,
        teamName: teamB.name,
        teamColor: teamB.color,
        playerIds: [teamB.playerIds[0], teamB.playerIds[2]],
        players: [
          { userId: teamB.playerIds[0], displayName: 'Liam O’Connor', username: 'liam_links', photoURL: users[8]?.photoURL || '', handicapIndex: 4.8, playtomicLevel: 5.9, teeColor: 'White', playingHandicap: 4, grossScore: 65, netScore: 61, confirmed: true },
          { userId: teamB.playerIds[2], displayName: 'Victor Dubois', username: 'vic_dubois', photoURL: users[10]?.photoURL || '', handicapIndex: 8.2, playtomicLevel: 5.1, teeColor: 'White', playingHandicap: 4, grossScore: 65, netScore: 61, confirmed: true },
        ],
        label: 'Liam & Victor',
      },
      holeResults: {
        18: { holeNumber: 18, par: 4, strokeIndex: 10, sideAScore: 3, sideBScore: 4, sideAStrokes: 0, sideBStrokes: 0, winnerSide: 'sideA', matchStatusAfterHole: 'Team A 1 UP' },
      },
      currentStatusText: 'FINAL: Outeniqua Eagles won 1 UP',
      leadSide: 'sideA',
      leadMargin: 1,
      pointsAwarded: { sideA: 1.0, sideB: 0.0 },
      winnerSide: 'sideA',
      winnerTeamId: teamA.id,
    },
    {
      id: 'r2-m2',
      tournamentId: 'tour-garden-route-2026',
      roundId: 'round-2',
      matchNumber: 2,
      format: 'two_man_scramble',
      holesTotal: 18,
      holesCompleted: 18,
      status: 'completed',
      sideA: {
        teamId: teamA.id,
        teamName: teamA.name,
        teamColor: teamA.color,
        playerIds: [teamA.playerIds[1], teamA.playerIds[3]],
        players: [
          { userId: teamA.playerIds[1], displayName: 'Elena Rostova', username: 'elena_golf', photoURL: users[1]?.photoURL || '', handicapIndex: 5.4, playtomicLevel: 5.8, teeColor: 'White', playingHandicap: 6, grossScore: 68, netScore: 62, confirmed: true },
          { userId: teamA.playerIds[3], displayName: 'Sophia Loren', username: 'sophia_putts', photoURL: users[3]?.photoURL || '', handicapIndex: 22.0, playtomicLevel: 2.8, teeColor: 'Blue', playingHandicap: 6, grossScore: 68, netScore: 62, confirmed: true },
        ],
        label: 'Elena & Sophia',
      },
      sideB: {
        teamId: teamB.id,
        teamName: teamB.name,
        teamColor: teamB.color,
        playerIds: [teamB.playerIds[1], teamB.playerIds[3]],
        players: [
          { userId: teamB.playerIds[1], displayName: 'Zara Chen', username: 'zara_swing', photoURL: users[9]?.photoURL || '', handicapIndex: 14.1, playtomicLevel: 3.8, teeColor: 'White', playingHandicap: 7, grossScore: 67, netScore: 60, confirmed: true },
          { userId: teamB.playerIds[3], displayName: 'Chloe Bennett', username: 'chloe_b', photoURL: users[11]?.photoURL || '', handicapIndex: 11.5, playtomicLevel: 4.4, teeColor: 'White', playingHandicap: 7, grossScore: 67, netScore: 60, confirmed: true },
        ],
        label: 'Zara & Chloe',
      },
      holeResults: {
        16: { holeNumber: 16, par: 4, strokeIndex: 8, sideAScore: 4, sideBScore: 3, sideAStrokes: 0, sideBStrokes: 0, winnerSide: 'sideB', matchStatusAfterHole: 'Team B 3&2' },
      },
      currentStatusText: 'FINAL: Tsitsikamma Albatross won 3 & 2',
      leadSide: 'sideB',
      leadMargin: 3,
      pointsAwarded: { sideA: 0.0, sideB: 1.0 },
      winnerSide: 'sideB',
      winnerTeamId: teamB.id,
    },
    {
      id: 'r2-m3',
      tournamentId: 'tour-garden-route-2026',
      roundId: 'round-2',
      matchNumber: 3,
      format: 'two_man_scramble',
      holesTotal: 18,
      holesCompleted: 18,
      status: 'completed',
      sideA: {
        teamId: teamA.id,
        teamName: teamA.name,
        teamColor: teamA.color,
        playerIds: [teamA.playerIds[4], teamA.playerIds[6]],
        players: [
          { userId: teamA.playerIds[4], displayName: 'David Miller', username: 'd_miller', photoURL: users[4]?.photoURL || '', handicapIndex: 9.1, playtomicLevel: 4.9, teeColor: 'White', playingHandicap: 5, grossScore: 65, netScore: 60, confirmed: true },
          { userId: teamA.playerIds[6], displayName: 'Maya Lin', username: 'maya_putts', photoURL: users[6]?.photoURL || '', handicapIndex: 7.9, playtomicLevel: 5.2, teeColor: 'White', playingHandicap: 5, grossScore: 65, netScore: 60, confirmed: true },
        ],
        label: 'David & Maya',
      },
      sideB: {
        teamId: teamB.id,
        teamName: teamB.name,
        teamColor: teamB.color,
        playerIds: [teamB.playerIds[4], teamB.playerIds[6]],
        players: [
          { userId: teamB.playerIds[4], displayName: 'Henrik Larsson', username: 'henrik_l', photoURL: users[12]?.photoURL || '', handicapIndex: 6.2, playtomicLevel: 5.5, teeColor: 'White', playingHandicap: 4, grossScore: 64, netScore: 60, confirmed: true },
          { userId: teamB.playerIds[6], displayName: 'Kai Takahashi', username: 'kai_irons', photoURL: users[14]?.photoURL || '', handicapIndex: 10.4, playtomicLevel: 4.7, teeColor: 'White', playingHandicap: 4, grossScore: 64, netScore: 60, confirmed: true },
        ],
        label: 'Henrik & Kai',
      },
      holeResults: {
        18: { holeNumber: 18, par: 5, strokeIndex: 12, sideAScore: 4, sideBScore: 4, sideAStrokes: 0, sideBStrokes: 0, winnerSide: 'halved', matchStatusAfterHole: 'Halved' },
      },
      currentStatusText: 'FINAL: Halved (0.5 - 0.5)',
      leadSide: 'tied',
      leadMargin: 0,
      pointsAwarded: { sideA: 0.5, sideB: 0.5 },
      winnerSide: 'halved',
    },
    {
      id: 'r2-m4',
      tournamentId: 'tour-garden-route-2026',
      roundId: 'round-2',
      matchNumber: 4,
      format: 'two_man_scramble',
      holesTotal: 18,
      holesCompleted: 18,
      status: 'completed',
      sideA: {
        teamId: teamA.id,
        teamName: teamA.name,
        teamColor: teamA.color,
        playerIds: [teamA.playerIds[5], teamA.playerIds[7]],
        players: [
          { userId: teamA.playerIds[5], displayName: 'Jordan Reed', username: 'j_reed', photoURL: users[5]?.photoURL || '', handicapIndex: 15.0, playtomicLevel: 3.6, teeColor: 'White', playingHandicap: 7, grossScore: 69, netScore: 62, confirmed: true },
          { userId: teamA.playerIds[7], displayName: 'Lucas Silva', username: 'lucas_driver', photoURL: users[7]?.photoURL || '', handicapIndex: 11.2, playtomicLevel: 4.5, teeColor: 'White', playingHandicap: 7, grossScore: 69, netScore: 62, confirmed: true },
        ],
        label: 'Jordan & Lucas',
      },
      sideB: {
        teamId: teamB.id,
        teamName: teamB.name,
        teamColor: teamB.color,
        playerIds: [teamB.playerIds[5], teamB.playerIds[7]],
        players: [
          { userId: teamB.playerIds[5], displayName: 'Amara Patel', username: 'amara_golf', photoURL: users[13]?.photoURL || '', handicapIndex: 16.8, playtomicLevel: 3.4, teeColor: 'White', playingHandicap: 8, grossScore: 67, netScore: 59, confirmed: true },
          { userId: teamB.playerIds[7], displayName: 'Olivia Garcia', username: 'olivia_g', photoURL: users[15]?.photoURL || '', handicapIndex: 13.5, playtomicLevel: 4.0, teeColor: 'White', playingHandicap: 8, grossScore: 67, netScore: 59, confirmed: true },
        ],
        label: 'Amara & Olivia',
      },
      holeResults: {
        17: { holeNumber: 17, par: 3, strokeIndex: 14, sideAScore: 4, sideBScore: 3, sideAStrokes: 0, sideBStrokes: 0, winnerSide: 'sideB', matchStatusAfterHole: 'Team B 2&1' },
      },
      currentStatusText: 'FINAL: Tsitsikamma Albatross won 2 & 1',
      leadSide: 'sideB',
      leadMargin: 2,
      pointsAwarded: { sideA: 0.0, sideB: 1.0 },
      winnerSide: 'sideB',
      winnerTeamId: teamB.id,
    },
  ];

  // Build Day 3: Plettenberg Bay CC - Singles Matchplay (LIVE IN PROGRESS!)
  const round3Matches: TournamentMatch[] = [
    {
      id: 'r3-m1',
      tournamentId: 'tour-garden-route-2026',
      roundId: 'round-3',
      matchNumber: 1,
      format: 'individual_matchplay',
      holesTotal: 18,
      holesCompleted: 14,
      status: 'live',
      sideA: {
        teamId: teamA.id,
        teamName: teamA.name,
        teamColor: teamA.color,
        playerIds: [teamA.playerIds[0]],
        players: [
          { userId: teamA.playerIds[0], displayName: 'Marcus Vance', username: 'marcus_v', photoURL: users[0]?.photoURL || '', handicapIndex: 12.4, playtomicLevel: 4.2, teeColor: 'White', playingHandicap: 12, grossScore: 58, netScore: 46, confirmed: true },
        ],
        label: 'Marcus Vance',
      },
      sideB: {
        teamId: teamB.id,
        teamName: teamB.name,
        teamColor: teamB.color,
        playerIds: [teamB.playerIds[0]],
        players: [
          { userId: teamB.playerIds[0], displayName: 'Liam O’Connor', username: 'liam_links', photoURL: users[8]?.photoURL || '', handicapIndex: 4.8, playtomicLevel: 5.9, teeColor: 'White', playingHandicap: 5, grossScore: 54, netScore: 49, confirmed: true },
        ],
        label: 'Liam O’Connor',
      },
      holeResults: {
        1: { holeNumber: 1, par: 4, strokeIndex: 9, sideAScore: 4, sideBScore: 4, sideAStrokes: 1, sideBStrokes: 0, winnerSide: 'sideA', matchStatusAfterHole: 'Team A 1 UP' },
        2: { holeNumber: 2, par: 5, strokeIndex: 3, sideAScore: 5, sideBScore: 5, sideAStrokes: 1, sideBStrokes: 0, winnerSide: 'sideA', matchStatusAfterHole: 'Team A 2 UP' },
        3: { holeNumber: 3, par: 3, strokeIndex: 17, sideAScore: 3, sideBScore: 2, sideAStrokes: 0, sideBStrokes: 0, winnerSide: 'sideB', matchStatusAfterHole: 'Team A 1 UP' },
        14: { holeNumber: 14, par: 4, strokeIndex: 5, sideAScore: 4, sideBScore: 4, sideAStrokes: 1, sideBStrokes: 0, winnerSide: 'sideA', matchStatusAfterHole: 'Team A 2 UP' },
      },
      currentStatusText: 'Outeniqua Eagles 2 UP thru 14',
      leadSide: 'sideA',
      leadMargin: 2,
      pointsAwarded: { sideA: 0, sideB: 0 },
      winnerSide: null,
    },
    {
      id: 'r3-m2',
      tournamentId: 'tour-garden-route-2026',
      roundId: 'round-3',
      matchNumber: 2,
      format: 'individual_matchplay',
      holesTotal: 18,
      holesCompleted: 15,
      status: 'live',
      sideA: {
        teamId: teamA.id,
        teamName: teamA.name,
        teamColor: teamA.color,
        playerIds: [teamA.playerIds[1]],
        players: [
          { userId: teamA.playerIds[1], displayName: 'Elena Rostova', username: 'elena_golf', photoURL: users[1]?.photoURL || '', handicapIndex: 5.4, playtomicLevel: 5.8, teeColor: 'White', playingHandicap: 5, grossScore: 57, netScore: 52, confirmed: true },
        ],
        label: 'Elena Rostova',
      },
      sideB: {
        teamId: teamB.id,
        teamName: teamB.name,
        teamColor: teamB.color,
        playerIds: [teamB.playerIds[1]],
        players: [
          { userId: teamB.playerIds[1], displayName: 'Zara Chen', username: 'zara_swing', photoURL: users[9]?.photoURL || '', handicapIndex: 14.1, playtomicLevel: 3.8, teeColor: 'White', playingHandicap: 14, grossScore: 66, netScore: 52, confirmed: true },
        ],
        label: 'Zara Chen',
      },
      holeResults: {
        15: { holeNumber: 15, par: 4, strokeIndex: 11, sideAScore: 4, sideBScore: 4, sideAStrokes: 0, sideBStrokes: 1, winnerSide: 'sideB', matchStatusAfterHole: 'Team B 1 UP' },
      },
      currentStatusText: 'Tsitsikamma Albatross 1 UP thru 15',
      leadSide: 'sideB',
      leadMargin: 1,
      pointsAwarded: { sideA: 0, sideB: 0 },
      winnerSide: null,
    },
    {
      id: 'r3-m3',
      tournamentId: 'tour-garden-route-2026',
      roundId: 'round-3',
      matchNumber: 3,
      format: 'individual_matchplay',
      holesTotal: 18,
      holesCompleted: 13,
      status: 'live',
      sideA: {
        teamId: teamA.id,
        teamName: teamA.name,
        teamColor: teamA.color,
        playerIds: [teamA.playerIds[2]],
        players: [
          { userId: teamA.playerIds[2], displayName: 'Sam Thorne', username: 'sam_irons', photoURL: users[2]?.photoURL || '', handicapIndex: 18.2, playtomicLevel: 3.2, teeColor: 'White', playingHandicap: 18, grossScore: 64, netScore: 46, confirmed: true },
        ],
        label: 'Sam Thorne',
      },
      sideB: {
        teamId: teamB.id,
        teamName: teamB.name,
        teamColor: teamB.color,
        playerIds: [teamB.playerIds[2]],
        players: [
          { userId: teamB.playerIds[2], displayName: 'Victor Dubois', username: 'vic_dubois', photoURL: users[10]?.photoURL || '', handicapIndex: 8.2, playtomicLevel: 5.1, teeColor: 'White', playingHandicap: 8, grossScore: 55, netScore: 47, confirmed: true },
        ],
        label: 'Victor Dubois',
      },
      holeResults: {
        13: { holeNumber: 13, par: 5, strokeIndex: 7, sideAScore: 5, sideBScore: 5, sideAStrokes: 1, sideBStrokes: 0, winnerSide: 'sideA', matchStatusAfterHole: 'AS' },
      },
      currentStatusText: 'All Square (AS) thru 13',
      leadSide: 'tied',
      leadMargin: 0,
      pointsAwarded: { sideA: 0, sideB: 0 },
      winnerSide: null,
    },
    {
      id: 'r3-m4',
      tournamentId: 'tour-garden-route-2026',
      roundId: 'round-3',
      matchNumber: 4,
      format: 'individual_matchplay',
      holesTotal: 18,
      holesCompleted: 14,
      status: 'live',
      sideA: {
        teamId: teamA.id,
        teamName: teamA.name,
        teamColor: teamA.color,
        playerIds: [teamA.playerIds[3]],
        players: [
          { userId: teamA.playerIds[3], displayName: 'Sophia Loren', username: 'sophia_putts', photoURL: users[3]?.photoURL || '', handicapIndex: 22.0, playtomicLevel: 2.8, teeColor: 'Blue', playingHandicap: 22, grossScore: 70, netScore: 48, confirmed: true },
        ],
        label: 'Sophia Loren',
      },
      sideB: {
        teamId: teamB.id,
        teamName: teamB.name,
        teamColor: teamB.color,
        playerIds: [teamB.playerIds[3]],
        players: [
          { userId: teamB.playerIds[3], displayName: 'Chloe Bennett', username: 'chloe_b', photoURL: users[11]?.photoURL || '', handicapIndex: 11.5, playtomicLevel: 4.4, teeColor: 'White', playingHandicap: 11, grossScore: 61, netScore: 50, confirmed: true },
        ],
        label: 'Chloe Bennett',
      },
      holeResults: {
        14: { holeNumber: 14, par: 4, strokeIndex: 5, sideAScore: 5, sideBScore: 4, sideAStrokes: 1, sideBStrokes: 0, winnerSide: 'halved', matchStatusAfterHole: 'Team A 1 UP' },
      },
      currentStatusText: 'Outeniqua Eagles 1 UP thru 14',
      leadSide: 'sideA',
      leadMargin: 1,
      pointsAwarded: { sideA: 0, sideB: 0 },
      winnerSide: null,
    },
    {
      id: 'r3-m5',
      tournamentId: 'tour-garden-route-2026',
      roundId: 'round-3',
      matchNumber: 5,
      format: 'individual_matchplay',
      holesTotal: 18,
      holesCompleted: 12,
      status: 'live',
      sideA: {
        teamId: teamA.id,
        teamName: teamA.name,
        teamColor: teamA.color,
        playerIds: [teamA.playerIds[4]],
        players: [
          { userId: teamA.playerIds[4], displayName: 'David Miller', username: 'd_miller', photoURL: users[4]?.photoURL || '', handicapIndex: 9.1, playtomicLevel: 4.9, teeColor: 'White', playingHandicap: 9, grossScore: 48, netScore: 39, confirmed: true },
        ],
        label: 'David Miller',
      },
      sideB: {
        teamId: teamB.id,
        teamName: teamB.name,
        teamColor: teamB.color,
        playerIds: [teamB.playerIds[4]],
        players: [
          { userId: teamB.playerIds[4], displayName: 'Henrik Larsson', username: 'henrik_l', photoURL: users[12]?.photoURL || '', handicapIndex: 6.2, playtomicLevel: 5.5, teeColor: 'White', playingHandicap: 6, grossScore: 46, netScore: 40, confirmed: true },
        ],
        label: 'Henrik Larsson',
      },
      holeResults: {
        12: { holeNumber: 12, par: 4, strokeIndex: 15, sideAScore: 4, sideBScore: 4, sideAStrokes: 0, sideBStrokes: 0, winnerSide: 'halved', matchStatusAfterHole: 'Team B 1 UP' },
      },
      currentStatusText: 'Tsitsikamma Albatross 1 UP thru 12',
      leadSide: 'sideB',
      leadMargin: 1,
      pointsAwarded: { sideA: 0, sideB: 0 },
      winnerSide: null,
    },
    {
      id: 'r3-m6',
      tournamentId: 'tour-garden-route-2026',
      roundId: 'round-3',
      matchNumber: 6,
      format: 'individual_matchplay',
      holesTotal: 18,
      holesCompleted: 12,
      status: 'live',
      sideA: {
        teamId: teamA.id,
        teamName: teamA.name,
        teamColor: teamA.color,
        playerIds: [teamA.playerIds[5]],
        players: [
          { userId: teamA.playerIds[5], displayName: 'Jordan Reed', username: 'j_reed', photoURL: users[5]?.photoURL || '', handicapIndex: 15.0, playtomicLevel: 3.6, teeColor: 'White', playingHandicap: 15, grossScore: 56, netScore: 41, confirmed: true },
        ],
        label: 'Jordan Reed',
      },
      sideB: {
        teamId: teamB.id,
        teamName: teamB.name,
        teamColor: teamB.color,
        playerIds: [teamB.playerIds[5]],
        players: [
          { userId: teamB.playerIds[5], displayName: 'Amara Patel', username: 'amara_golf', photoURL: users[13]?.photoURL || '', handicapIndex: 16.8, playtomicLevel: 3.4, teeColor: 'White', playingHandicap: 16, grossScore: 58, netScore: 42, confirmed: true },
        ],
        label: 'Amara Patel',
      },
      holeResults: {
        12: { holeNumber: 12, par: 4, strokeIndex: 15, sideAScore: 4, sideBScore: 5, sideAStrokes: 0, sideBStrokes: 0, winnerSide: 'sideA', matchStatusAfterHole: 'Team A 2 UP' },
      },
      currentStatusText: 'Outeniqua Eagles 2 UP thru 12',
      leadSide: 'sideA',
      leadMargin: 2,
      pointsAwarded: { sideA: 0, sideB: 0 },
      winnerSide: null,
    },
    {
      id: 'r3-m7',
      tournamentId: 'tour-garden-route-2026',
      roundId: 'round-3',
      matchNumber: 7,
      format: 'individual_matchplay',
      holesTotal: 18,
      holesCompleted: 11,
      status: 'live',
      sideA: {
        teamId: teamA.id,
        teamName: teamA.name,
        teamColor: teamA.color,
        playerIds: [teamA.playerIds[6]],
        players: [
          { userId: teamA.playerIds[6], displayName: 'Maya Lin', username: 'maya_putts', photoURL: users[6]?.photoURL || '', handicapIndex: 7.9, playtomicLevel: 5.2, teeColor: 'White', playingHandicap: 8, grossScore: 45, netScore: 37, confirmed: true },
        ],
        label: 'Maya Lin',
      },
      sideB: {
        teamId: teamB.id,
        teamName: teamB.name,
        teamColor: teamB.color,
        playerIds: [teamB.playerIds[6]],
        players: [
          { userId: teamB.playerIds[6], displayName: 'Kai Takahashi', username: 'kai_irons', photoURL: users[14]?.photoURL || '', handicapIndex: 10.4, playtomicLevel: 4.7, teeColor: 'White', playingHandicap: 10, grossScore: 47, netScore: 37, confirmed: true },
        ],
        label: 'Kai Takahashi',
      },
      holeResults: {
        11: { holeNumber: 11, par: 4, strokeIndex: 1, sideAScore: 4, sideBScore: 5, sideAStrokes: 0, sideBStrokes: 1, winnerSide: 'halved', matchStatusAfterHole: 'AS' },
      },
      currentStatusText: 'All Square (AS) thru 11',
      leadSide: 'tied',
      leadMargin: 0,
      pointsAwarded: { sideA: 0, sideB: 0 },
      winnerSide: null,
    },
    {
      id: 'r3-m8',
      tournamentId: 'tour-garden-route-2026',
      roundId: 'round-3',
      matchNumber: 8,
      format: 'individual_matchplay',
      holesTotal: 18,
      holesCompleted: 11,
      status: 'live',
      sideA: {
        teamId: teamA.id,
        teamName: teamA.name,
        teamColor: teamA.color,
        playerIds: [teamA.playerIds[7]],
        players: [
          { userId: teamA.playerIds[7], displayName: 'Lucas Silva', username: 'lucas_driver', photoURL: users[7]?.photoURL || '', handicapIndex: 11.2, playtomicLevel: 4.5, teeColor: 'White', playingHandicap: 11, grossScore: 48, netScore: 37, confirmed: true },
        ],
        label: 'Lucas Silva',
      },
      sideB: {
        teamId: teamB.id,
        teamName: teamB.name,
        teamColor: teamB.color,
        playerIds: [teamB.playerIds[7]],
        players: [
          { userId: teamB.playerIds[7], displayName: 'Olivia Garcia', username: 'olivia_g', photoURL: users[15]?.photoURL || '', handicapIndex: 13.5, playtomicLevel: 4.0, teeColor: 'White', playingHandicap: 13, grossScore: 49, netScore: 36, confirmed: true },
        ],
        label: 'Olivia Garcia',
      },
      holeResults: {
        11: { holeNumber: 11, par: 4, strokeIndex: 1, sideAScore: 5, sideBScore: 4, sideAStrokes: 0, sideBStrokes: 0, winnerSide: 'sideB', matchStatusAfterHole: 'Team B 1 UP' },
      },
      currentStatusText: 'Tsitsikamma Albatross 1 UP thru 11',
      leadSide: 'sideB',
      leadMargin: 1,
      pointsAwarded: { sideA: 0, sideB: 0 },
      winnerSide: null,
    },
  ];

  const round1: TournamentRound = {
    id: 'round-1',
    tournamentId: 'tour-garden-route-2026',
    roundNumber: 1,
    dayNumber: 1,
    title: 'Day 1: Fourball Better Ball Matchplay',
    date: '2026-09-18',
    courseId: simola.id,
    courseName: simola.name,
    courseLocation: simola.location,
    courseCover: simola.coverImage,
    coursePar: simola.par,
    format: 'better_ball_matchplay',
    formatDescription: '2v2 Fourball. Lowest net score on each hole wins the hole for the team (85% WHS handicap allowance). 1 point per match.',
    status: 'completed',
    matches: round1Matches,
    pointsAvailable: 4.0,
    pointsTallied: {
      [teamA.id]: 2.5,
      [teamB.id]: 1.5,
    },
  };

  const round2: TournamentRound = {
    id: 'round-2',
    tournamentId: 'tour-garden-route-2026',
    roundNumber: 2,
    dayNumber: 2,
    title: 'Day 2: 2-Man Team Scramble Matchplay',
    date: '2026-09-19',
    courseId: knysna.id,
    courseName: knysna.name,
    courseLocation: knysna.location,
    courseCover: knysna.coverImage,
    coursePar: knysna.par,
    format: 'two_man_scramble',
    formatDescription: '2v2 Scramble. Both players hit, choose the best ball, and play from there. Combined team handicap differential. 1 point per match.',
    status: 'completed',
    matches: round2Matches,
    pointsAvailable: 4.0,
    pointsTallied: {
      [teamA.id]: 1.5,
      [teamB.id]: 2.5,
    },
  };

  const round3: TournamentRound = {
    id: 'round-3',
    tournamentId: 'tour-garden-route-2026',
    roundNumber: 3,
    dayNumber: 3,
    title: 'Day 3: Championship Singles Matchplay',
    date: '2026-09-20',
    courseId: plett.id,
    courseName: plett.name,
    courseLocation: plett.location,
    courseCover: plett.coverImage,
    coursePar: plett.par,
    format: 'individual_matchplay',
    formatDescription: '1v1 Individual Singles. 8 headline matches off lowest player handicap. 8 total points on the line to decide the Cup!',
    status: 'live',
    matches: round3Matches,
    pointsAvailable: 8.0,
    pointsTallied: {},
  };

  const baseTournament: Tournament = {
    id: 'tour-garden-route-2026',
    name: 'Garden Route Ryder Cup 2026',
    tagline: '3 Days • 3 Championship Courses • 16 Points to Glory',
    description: 'The premier amateur Ryder Cup clash across the Western Cape Garden Route. Outeniqua Eagles vs. Tsitsikamma Albatross battle across Simola, Knysna Golf Club, and Plettenberg Bay Country Club.',
    organizerId: users[0]?.id || 'user-marcus',
    organizerName: users[0]?.displayName || 'Marcus Vance',
    organizerPhoto: users[0]?.photoURL || '',
    formatType: 'team_ryder_cup',
    status: 'live',
    startDate: '2026-09-18',
    endDate: '2026-09-20',
    location: 'Garden Route, Western Cape, South Africa',
    coverImage: 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?auto=format&fit=crop&w=1200&q=80',
    playersCount: 16,
    totalPoints: 16.0,
    clinchPoints: 8.5,
    teams: [teamA, teamB],
    rounds: [round1, round2, round3],
    scoringRule: {
      pointsPerWin: 1.0,
      pointsPerTie: 0.5,
      pointsPerLoss: 0.0,
      clinchThresholdRule: 'majority_plus_half',
    },
    leaderboard: {} as any,
    createdAt: '2026-08-15T09:00:00Z',
    updatedAt: new Date().toISOString(),
  };

  // Run dynamic calculation
  baseTournament.leaderboard = recalculateTournamentLeaderboard(baseTournament);
  return baseTournament;
}
