import { 
  Tournament,
  TournamentMatch, 
  TournamentRound, 
  TournamentHoleResult, 
  PlayerInMatch, 
  HoleDefinition, 
  GolferUser,
  GolfCourse
} from '../types/golf';
import { calculateStrokeDotsForHole, calculateScrambleTeamHandicap } from './handicapEngine';
import { MOCK_COURSES } from '../data/mockData';

export interface PlayerScoreSummary {
  player: PlayerInMatch;
  side: 'sideA' | 'sideB';
  teamName: string;
  teamColor?: string;
  playingHandicap: number;
  holesPlayed: number;
  front9Gross: number;
  front9Net: number;
  back9Gross: number;
  back9Net: number;
  totalGross: number;
  totalNet: number;
  toParGross: number;
  toParNet: number;
  birdiesCount: number;
  parsCount: number;
  bogeysCount: number;
  doublesOrWorseCount: number;
  bestBallContributedCount: number; // Number of holes this player's net score counted for the team
  holeScores: Record<number, { gross: number; net: number; strokes: number; isBestBall?: boolean }>;
}

/**
 * Formats a player's full display name into Initial and Surname format (e.g., "J. Smith").
 * Ensures family members sharing surnames on the course are distinctly identifiable.
 */
export function formatPlayerInitialAndSurname(fullName?: string | null): string {
  if (!fullName || typeof fullName !== 'string') return 'Player';
  const clean = fullName.trim();
  if (!clean) return 'Player';

  // Already formatted like "J. Smith", "J.Smith", or "A. B. Smith"
  if (/^[A-Za-z]\.\s+[A-Za-z]/i.test(clean)) {
    return clean;
  }
  if (/^[A-Za-z]\.[A-Za-z]/i.test(clean)) {
    return `${clean.charAt(0).toUpperCase()}. ${clean.slice(2).trim()}`;
  }

  // Handle generic numbered labels like "Team Eagle Player 1"
  if (/^team\s+.*player\s+\d+$/i.test(clean)) {
    const match = clean.match(/player\s+(\d+)$/i);
    return match ? `Player ${match[1]}` : clean;
  }
  if (/^player\s+\d+$/i.test(clean)) {
    return clean;
  }

  const parts = clean.split(/\s+/);
  if (parts.length === 1) {
    return parts[0];
  }

  const firstName = parts[0];
  const initial = firstName.charAt(0).toUpperCase();
  const surname = parts.slice(1).join(' ');
  return `${initial}. ${surname}`;
}

/**
 * Formats a side label or string of player names (e.g., "John Smith & David Miller")
 * into initial and surname format (e.g., "J. Smith & D. Miller").
 */
export function formatSidePlayersLabel(label?: string | null): string {
  if (!label || typeof label !== 'string') return '';
  const trimmed = label.trim();
  if (!trimmed) return '';

  const separatorRegex = /(\s*(?:&|\band\b|\/)\s*)/i;
  if (!separatorRegex.test(trimmed)) {
    return formatPlayerInitialAndSurname(trimmed);
  }

  const parts = trimmed.split(separatorRegex);
  return parts.map(part => {
    if (/^(?:&|\band\b|\/)$/i.test(part.trim())) {
      return ` ${part.trim()} `;
    }
    return formatPlayerInitialAndSurname(part);
  }).join('').trim();
}

/**
 * Normalizes players on Side A and Side B, extracting or generating complete PlayerInMatch objects.
 * Dynamically adapts to the day/round's selected format (1 player for singles, 2 players for 2v2).
 */
export function resolveMatchPlayers(
  match: TournamentMatch,
  round: TournamentRound,
  allUsers: GolferUser[] = []
): { sideAPlayers: PlayerInMatch[]; sideBPlayers: PlayerInMatch[] } {
  const roundFormat = (round?.format || '').toLowerCase();
  const matchFormat = (match?.format || '').toLowerCase();
  // Round/Day format takes priority, fallback to match format
  const formatStr = roundFormat || matchFormat || 'individual_matchplay';
  const isSingles = formatStr.includes('individual') || formatStr.includes('singles');

  const buildPlayerFromId = (userId: string, defaultName: string, defaultHcp: number): PlayerInMatch => {
    const user = allUsers.find(u => u.id === userId || u.displayName?.toLowerCase() === defaultName.toLowerCase());
    const rawName = user?.displayName || defaultName;
    const formattedName = formatPlayerInitialAndSurname(rawName);

    if (user) {
      return {
        userId: user.id,
        displayName: formattedName,
        username: user.username,
        photoURL: user.photoURL,
        handicapIndex: user.handicapIndex,
        playtomicLevel: user.playtomicLevel,
        teeColor: user.preferredTees || 'White',
        playingHandicap: Math.round(user.handicapIndex),
        grossScore: 0,
        netScore: 0,
        confirmed: true,
      };
    }
    return {
      userId: userId || `player-${Math.random().toString(36).substring(2, 7)}`,
      displayName: formattedName,
      username: defaultName.toLowerCase().replace(/\s+/g, '_'),
      photoURL: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
      handicapIndex: defaultHcp,
      playtomicLevel: 4.0,
      teeColor: 'White',
      playingHandicap: defaultHcp,
      grossScore: 0,
      netScore: 0,
      confirmed: true,
    };
  };

  let sideAPlayers: PlayerInMatch[] = [];
  if (match.sideA.players && match.sideA.players.length > 0) {
    sideAPlayers = match.sideA.players.map(p => ({
      ...p,
      displayName: formatPlayerInitialAndSurname(p.displayName),
    }));
  } else if (match.sideA.playerIds && match.sideA.playerIds.length > 0) {
    sideAPlayers = match.sideA.playerIds.map((id, idx) => 
      buildPlayerFromId(id, `${match.sideA.teamName || 'Team A'} Player ${idx + 1}`, match.sideA.playingHandicap || 10)
    );
  }

  let sideBPlayers: PlayerInMatch[] = [];
  if (match.sideB.players && match.sideB.players.length > 0) {
    sideBPlayers = match.sideB.players.map(p => ({
      ...p,
      displayName: formatPlayerInitialAndSurname(p.displayName),
    }));
  } else if (match.sideB.playerIds && match.sideB.playerIds.length > 0) {
    sideBPlayers = match.sideB.playerIds.map((id, idx) => 
      buildPlayerFromId(id, `${match.sideB.teamName || 'Team B'} Player ${idx + 1}`, match.sideB.playingHandicap || 10)
    );
  }

  // Deduplicate any repeated players on the same side
  const seenA = new Set<string>();
  sideAPlayers = sideAPlayers.filter(p => {
    if (!p.userId || p.userId.startsWith('player-')) return true;
    if (seenA.has(p.userId)) return false;
    seenA.add(p.userId);
    return true;
  });

  const seenB = new Set<string>();
  sideBPlayers = sideBPlayers.filter(p => {
    if (!p.userId || p.userId.startsWith('player-')) return true;
    if (seenB.has(p.userId)) return false;
    seenB.add(p.userId);
    return true;
  });

  // Dynamically adapt to the selected round format:
  if (isSingles) {
    // 1v1 Singles: Exactly ONE player per side
    if (sideAPlayers.length === 0) {
      sideAPlayers = [buildPlayerFromId('', match.sideA.label || 'Player A', match.sideA.playingHandicap || 10)];
    } else {
      sideAPlayers = sideAPlayers.slice(0, 1);
    }

    if (sideBPlayers.length === 0) {
      sideBPlayers = [buildPlayerFromId('', match.sideB.label || 'Player B', match.sideB.playingHandicap || 10)];
    } else {
      sideBPlayers = sideBPlayers.slice(0, 1);
    }
  } else {
    // 2v2 / Team formats: Exactly TWO players per side (pairs)
    if (sideAPlayers.length === 0) {
      sideAPlayers = [
        buildPlayerFromId('', `${match.sideA.teamName || 'Team A'} Player 1`, match.sideA.playingHandicap || 8),
        buildPlayerFromId('', `${match.sideA.teamName || 'Team A'} Player 2`, match.sideA.playingHandicap || 12),
      ];
    } else if (sideAPlayers.length === 1) {
      sideAPlayers.push(
        buildPlayerFromId('', `${match.sideA.teamName || 'Team A'} Partner`, match.sideA.playingHandicap || 10)
      );
    } else if (sideAPlayers.length > 2) {
      sideAPlayers = sideAPlayers.slice(0, 2);
    }

    if (sideBPlayers.length === 0) {
      sideBPlayers = [
        buildPlayerFromId('', `${match.sideB.teamName || 'Team B'} Player 1`, match.sideB.playingHandicap || 9),
        buildPlayerFromId('', `${match.sideB.teamName || 'Team B'} Player 2`, match.sideB.playingHandicap || 13),
      ];
    } else if (sideBPlayers.length === 1) {
      sideBPlayers.push(
        buildPlayerFromId('', `${match.sideB.teamName || 'Team B'} Partner`, match.sideB.playingHandicap || 10)
      );
    } else if (sideBPlayers.length > 2) {
      sideBPlayers = sideBPlayers.slice(0, 2);
    }
  }

  return { sideAPlayers, sideBPlayers };
}

/**
 * Calculates complete personal statistics and 18-hole tallies for every player in a match.
 */
export function calculateMatchPlayerSummaries(
  match: TournamentMatch,
  round: TournamentRound,
  courseHoles: HoleDefinition[],
  allUsers: GolferUser[] = []
): PlayerScoreSummary[] {
  const { sideAPlayers, sideBPlayers } = resolveMatchPlayers(match, round, allUsers);
  const holeResultsList = Object.values(match.holeResults || {}) as TournamentHoleResult[];

  const allPlayersWithSide: { player: PlayerInMatch; side: 'sideA' | 'sideB'; teamName: string; teamColor?: string }[] = [
    ...sideAPlayers.map(p => ({ player: p, side: 'sideA' as const, teamName: match.sideA.teamName || match.sideA.label, teamColor: match.sideA.teamColor })),
    ...sideBPlayers.map(p => ({ player: p, side: 'sideB' as const, teamName: match.sideB.teamName || match.sideB.label, teamColor: match.sideB.teamColor }))
  ];

  return allPlayersWithSide.map(({ player, side, teamName, teamColor }) => {
    let front9Gross = 0;
    let front9Net = 0;
    let back9Gross = 0;
    let back9Net = 0;
    let totalGross = 0;
    let totalNet = 0;
    let totalParOfPlayedHoles = 0;
    let holesPlayed = 0;
    let birdiesCount = 0;
    let parsCount = 0;
    let bogeysCount = 0;
    let doublesOrWorseCount = 0;
    let bestBallContributedCount = 0;

    const holeScores: Record<number, { gross: number; net: number; strokes: number; isBestBall?: boolean }> = {};

    courseHoles.forEach(h => {
      const hr = match.holeResults?.[h.holeNumber];
      if (!hr) return;

      const playerHoleData = hr.playerScores?.[player.userId];
      const strokes = calculateStrokeDotsForHole(player.playingHandicap, h.strokeIndex);

      let gross = 0;
      let net = 0;
      let isBestBall = false;

      if (playerHoleData && playerHoleData.grossScore > 0) {
        gross = playerHoleData.grossScore;
        net = playerHoleData.netScore !== undefined ? playerHoleData.netScore : (gross - strokes);
        isBestBall = !!playerHoleData.isBestBall;
      } else {
        // Fallback for team scramble or earlier legacy recorded holes
        gross = side === 'sideA' ? hr.sideAScore : hr.sideBScore;
        net = gross - strokes;
        isBestBall = true;
      }

      if (gross > 0) {
        holesPlayed++;
        totalGross += gross;
        totalNet += net;
        totalParOfPlayedHoles += h.par;

        if (h.holeNumber <= 9) {
          front9Gross += gross;
          front9Net += net;
        } else {
          back9Gross += gross;
          back9Net += net;
        }

        const diff = gross - h.par;
        if (diff <= -1) birdiesCount++;
        else if (diff === 0) parsCount++;
        else if (diff === 1) bogeysCount++;
        else doublesOrWorseCount++;

        const isSideA = side === 'sideA';
        const teamNet = isSideA ? hr.sideANetScore : hr.sideBNetScore;
        const bestPlayerId = isSideA ? hr.sideABestPlayerId : hr.sideBBestPlayerId;

        // Player's score was the counting score for their team on this hole:
        const isCountingScore = (bestPlayerId && bestPlayerId === player.userId) ||
          (playerHoleData?.isBestBall && net <= teamNet) ||
          (net > 0 && net === teamNet);

        holeScores[h.holeNumber] = {
          gross,
          net,
          strokes,
          isBestBall: isCountingScore
        };
      }
    });

    return {
      player,
      side,
      teamName,
      teamColor,
      playingHandicap: player.playingHandicap,
      holesPlayed,
      front9Gross,
      front9Net,
      back9Gross,
      back9Net,
      totalGross,
      totalNet,
      toParGross: totalGross - totalParOfPlayedHoles,
      toParNet: totalNet - totalParOfPlayedHoles,
      birdiesCount,
      parsCount,
      bogeysCount,
      doublesOrWorseCount,
      bestBallContributedCount,
      holeScores,
    };
  });
}

export interface PlayerHoleDetail {
  holeNumber: number;
  par: number;
  strokeIndex: number;
  strokes: number;
  gross: number;
  net: number;
  toPar: number;
  scoreType: 'eagle_or_better' | 'birdie' | 'par' | 'bogey' | 'double_or_worse' | 'unplayed';
  isBestBall?: boolean;
  holeWinner?: 'sideA' | 'sideB' | 'halved';
  matchStatusAfterHole?: string;
  distanceMeters?: number;
}

export interface PlayerRoundSnapshot {
  round: TournamentRound;
  match?: TournamentMatch;
  course: GolfCourse;
  courseHoles: HoleDefinition[];
  courseName: string;
  courseCover: string;
  courseLocation: string;
  coursePar: number;
  format: string;
  formatDescription: string;
  status: 'completed' | 'live' | 'upcoming' | 'not_paired';
  statusText: string;
  holesPlayed: number;
  courseParOfPlayedHoles: number;
  totalCoursePar: number;
  grossScore: number;
  netScore: number;
  toParGross: number;
  toParGrossFormatted: string; // e.g. "-2", "E", "+3"
  toParNet: number;
  toParNetFormatted: string;
  front9Gross: number;
  front9Net: number;
  front9ToPar: number;
  back9Gross: number;
  back9Net: number;
  back9ToPar: number;
  birdiesCount: number;
  parsCount: number;
  eaglesCount: number;
  bogeysCount: number;
  doublesOrWorseCount: number;
  bestBallContributedCount: number;
  side?: 'sideA' | 'sideB';
  teamName?: string;
  teamColor?: string;
  partner?: PlayerInMatch;
  opponents: PlayerInMatch[];
  matchResultText?: string;
  matchWinner?: 'won' | 'lost' | 'halved' | 'live' | 'upcoming';
  holeScores: Record<number, PlayerHoleDetail>;
}

/**
 * Extracts and calculates comprehensive round snapshots for a player across all tournament rounds.
 */
export function getPlayerRoundSnapshots(
  userId: string,
  tournament: Tournament,
  allUsers: GolferUser[] = []
): PlayerRoundSnapshot[] {
  if (!tournament || !tournament.rounds) return [];

  return tournament.rounds.map(round => {
    // 1. Resolve course
    const course: GolfCourse = MOCK_COURSES.find(c => c.id === round.courseId) || {
      id: round.courseId,
      name: round.courseName,
      clubName: round.courseName,
      location: round.courseLocation,
      city: round.courseLocation,
      holes: [],
      par: round.coursePar || 72,
      holesCount: 18,
      tees: [{ color: 'White', rating: 72.0, slope: 125, meters: 6200 }],
      facilities: [],
      coverImage: round.courseCover
    };

    const courseHoles: HoleDefinition[] = course.holes && course.holes.length === 18
      ? course.holes
      : Array.from({ length: 18 }, (_, i) => {
          const hNum = i + 1;
          const defaultPars = [4, 5, 4, 3, 4, 5, 3, 4, 4, 4, 3, 5, 4, 3, 5, 4, 4, 5];
          const defaultSIs = [7, 3, 11, 15, 5, 1, 17, 9, 13, 8, 16, 10, 4, 14, 6, 2, 18, 12];
          return {
            holeNumber: hNum,
            par: defaultPars[i] || 4,
            strokeIndex: defaultSIs[i] || hNum,
            description: `Championship hole ${hNum}`,
            distances: {
              whiteMeters: 330 + (i * 10) % 150,
              yellowMeters: 350 + (i * 10) % 150,
            }
          };
        });

    const totalCoursePar = courseHoles.reduce((sum, h) => sum + h.par, 0);

    // 2. Find match containing this player
    const match = round.matches?.find(m => 
      m.sideA?.playerIds?.includes(userId) || m.sideB?.playerIds?.includes(userId)
    );

    if (!match) {
      return {
        round,
        course,
        courseHoles,
        courseName: round.courseName,
        courseCover: round.courseCover,
        courseLocation: round.courseLocation,
        coursePar: round.coursePar || totalCoursePar,
        format: round.format,
        formatDescription: round.formatDescription,
        status: 'not_paired',
        statusText: 'Not paired for this round',
        holesPlayed: 0,
        courseParOfPlayedHoles: 0,
        totalCoursePar,
        grossScore: 0,
        netScore: 0,
        toParGross: 0,
        toParGrossFormatted: '-',
        toParNet: 0,
        toParNetFormatted: '-',
        front9Gross: 0,
        front9Net: 0,
        front9ToPar: 0,
        back9Gross: 0,
        back9Net: 0,
        back9ToPar: 0,
        birdiesCount: 0,
        parsCount: 0,
        eaglesCount: 0,
        bogeysCount: 0,
        doublesOrWorseCount: 0,
        bestBallContributedCount: 0,
        opponents: [],
        holeScores: {}
      };
    }

    // 3. Resolve player side, partner, and opponents
    const isSideA = match.sideA?.playerIds?.includes(userId);
    const side: 'sideA' | 'sideB' = isSideA ? 'sideA' : 'sideB';
    const otherSide: 'sideA' | 'sideB' = isSideA ? 'sideB' : 'sideA';

    const { sideAPlayers, sideBPlayers } = resolveMatchPlayers(match, round, allUsers);
    const mySidePlayers = isSideA ? sideAPlayers : sideBPlayers;
    const oppSidePlayers = isSideA ? sideBPlayers : sideAPlayers;

    const playerObj = mySidePlayers.find(p => p.userId === userId) || {
      userId,
      displayName: 'Golfer',
      username: 'golfer',
      photoURL: '',
      handicapIndex: 10,
      playtomicLevel: 4.0,
      teeColor: 'White' as const,
      playingHandicap: 10,
      grossScore: 0,
      netScore: 0,
      confirmed: true
    };

    const roundFormat = (round?.format || '').toLowerCase();
    const isSingles = roundFormat.includes('individual') || roundFormat.includes('singles');
    const partner = isSingles ? undefined : mySidePlayers.find(p => p.userId !== userId);
    const opponents = isSingles ? oppSidePlayers.slice(0, 1) : oppSidePlayers;
    const playingHandicap = playerObj.playingHandicap ?? Math.round(playerObj.handicapIndex ?? 10);

    // 4. Determine Match Status & Outcome
    let matchWinner: 'won' | 'lost' | 'halved' | 'live' | 'upcoming' = 'upcoming';
    let matchResultText = 'Scheduled';

    if (match.status === 'completed') {
      if (match.winnerSide === side) {
        matchWinner = 'won';
        matchResultText = `Won ${match.currentStatusText ? match.currentStatusText.replace(/^FINAL:\s*/i, '') : 'Match'}`;
      } else if (match.winnerSide === 'halved') {
        matchWinner = 'halved';
        matchResultText = 'Halved (0.5 pts)';
      } else if (match.winnerSide && match.winnerSide !== side) {
        matchWinner = 'lost';
        matchResultText = `Lost ${match.currentStatusText ? match.currentStatusText.replace(/^FINAL:\s*/i, '') : 'Match'}`;
      } else {
        matchWinner = 'won';
        matchResultText = match.currentStatusText || 'Final';
      }
    } else if (match.status === 'live') {
      matchWinner = 'live';
      matchResultText = match.currentStatusText || 'Live';
    }

    // 5. Calculate hole scores & snapshots
    const isCompleted = match.status === 'completed';
    const isLive = match.status === 'live';
    const explicitHoles = match.holeResults || {};
    const explicitHoleCount = Object.keys(explicitHoles).length;

    // Check if player has pre-recorded round total from match lineup (e.g. 78, net 67)
    const targetRoundGross = (playerObj.grossScore && playerObj.grossScore > 50)
      ? playerObj.grossScore
      : (isCompleted ? totalCoursePar + Math.round(playingHandicap * 0.8) : 0);

    // If completed and missing some holes, calculate missing diff so total equals targetRoundGross
    let explicitGrossSum = 0;
    const explicitPlayedHoles: number[] = [];

    courseHoles.forEach(h => {
      const hr = explicitHoles[h.holeNumber];
      if (hr) {
        explicitPlayedHoles.push(h.holeNumber);
        const pScore = hr.playerScores?.[userId]?.grossScore;
        if (pScore && pScore > 0) {
          explicitGrossSum += pScore;
        } else {
          const sideGross = isSideA ? hr.sideAScore : hr.sideBScore;
          if (sideGross > 0) explicitGrossSum += sideGross;
          else explicitGrossSum += h.par;
        }
      }
    });

    const unrecordedHoles = courseHoles.filter(h => !explicitPlayedHoles.includes(h.holeNumber));
    const remainingGrossNeeded = Math.max(0, targetRoundGross - explicitGrossSum);
    const unrecordedCount = unrecordedHoles.length;

    // Distribute remaining strokes deterministically based on hole handicap/SI
    const unrecordedAllocations: Record<number, number> = {};
    if (isCompleted && unrecordedCount > 0 && remainingGrossNeeded > 0) {
      const baseParSum = unrecordedHoles.reduce((s, h) => s + h.par, 0);
      let strokesOverParToAllocate = remainingGrossNeeded - baseParSum;

      // Sort unrecorded holes by stroke index (hardest first)
      const sortedBySI = [...unrecordedHoles].sort((a, b) => a.strokeIndex - b.strokeIndex);

      sortedBySI.forEach((h, idx) => {
        let holeGross = h.par;
        if (strokesOverParToAllocate > 0) {
          // Give 1 stroke over par to hardest holes
          holeGross += 1;
          strokesOverParToAllocate -= 1;
        } else if (strokesOverParToAllocate < 0 && h.par >= 4) {
          // Under par (birdie)
          holeGross -= 1;
          strokesOverParToAllocate += 1;
        }
        unrecordedAllocations[h.holeNumber] = holeGross;
      });

      // Any remaining strokes spread onto hardest holes
      if (strokesOverParToAllocate > 0) {
        sortedBySI.forEach(h => {
          if (strokesOverParToAllocate > 0) {
            unrecordedAllocations[h.holeNumber] += 1;
            strokesOverParToAllocate -= 1;
          }
        });
      }
    }

    // Now assemble the full 18-hole detail record
    const holeScores: Record<number, PlayerHoleDetail> = {};
    let front9Gross = 0;
    let front9Net = 0;
    let front9Par = 0;
    let back9Gross = 0;
    let back9Net = 0;
    let back9Par = 0;
    let totalGross = 0;
    let totalNet = 0;
    let courseParOfPlayedHoles = 0;
    let holesPlayed = 0;
    let birdiesCount = 0;
    let parsCount = 0;
    let eaglesCount = 0;
    let bogeysCount = 0;
    let doublesOrWorseCount = 0;
    let bestBallContributedCount = 0;

    courseHoles.forEach(h => {
      const hr = explicitHoles[h.holeNumber];
      const strokes = calculateStrokeDotsForHole(playingHandicap, h.strokeIndex);
      let gross = 0;
      let net = 0;
      let isBestBall = false;
      let scoreType: PlayerHoleDetail['scoreType'] = 'unplayed';

      if (hr) {
        const pScore = hr.playerScores?.[userId];
        if (pScore && pScore.grossScore > 0) {
          gross = pScore.grossScore;
          net = pScore.netScore !== undefined ? pScore.netScore : gross - strokes;
          isBestBall = !!pScore.isBestBall;
        } else {
          const sideGross = isSideA ? hr.sideAScore : hr.sideBScore;
          gross = sideGross > 0 ? sideGross : h.par;
          net = gross - strokes;
          isBestBall = true;
        }
      } else if (isCompleted && unrecordedAllocations[h.holeNumber]) {
        gross = unrecordedAllocations[h.holeNumber];
        net = gross - strokes;
        isBestBall = false;
      }

      if (gross > 0) {
        holesPlayed++;
        totalGross += gross;
        totalNet += net;
        courseParOfPlayedHoles += h.par;

        if (h.holeNumber <= 9) {
          front9Gross += gross;
          front9Net += net;
          front9Par += h.par;
        } else {
          back9Gross += gross;
          back9Net += net;
          back9Par += h.par;
        }

        const diff = gross - h.par;
        if (diff <= -2) {
          scoreType = 'eagle_or_better';
          eaglesCount++;
          birdiesCount++;
        } else if (diff === -1) {
          scoreType = 'birdie';
          birdiesCount++;
        } else if (diff === 0) {
          scoreType = 'par';
          parsCount++;
        } else if (diff === 1) {
          scoreType = 'bogey';
          bogeysCount++;
        } else {
          scoreType = 'double_or_worse';
          doublesOrWorseCount++;
        }

        // Check if player's score was the team's counting score on this hole
        if (hr) {
          const isCounting = hr.playerScores?.[userId]?.isBestBall ||
            (side === 'sideA' && hr.sideABestPlayerId === userId) ||
            (side === 'sideB' && hr.sideBBestPlayerId === userId) ||
            (net > 0 && net === (side === 'sideA' ? hr.sideANetScore : hr.sideBNetScore));
          if (isCounting) {
            isBestBall = true;
          }
        }
      }

      holeScores[h.holeNumber] = {
        holeNumber: h.holeNumber,
        par: h.par,
        strokeIndex: h.strokeIndex,
        strokes,
        gross,
        net,
        toPar: gross > 0 ? gross - h.par : 0,
        scoreType,
        isBestBall,
        holeWinner: hr?.winnerSide,
        matchStatusAfterHole: hr?.matchStatusAfterHole,
        distanceMeters: h.distances?.whiteMeters || 350
      };
    });

    const toParGross = holesPlayed > 0 ? totalGross - courseParOfPlayedHoles : 0;
    const toParNet = holesPlayed > 0 ? totalNet - courseParOfPlayedHoles : 0;

    const formatToPar = (val: number) => {
      if (holesPlayed === 0) return '-';
      if (val < 0) return `${val}`;
      if (val === 0) return 'E';
      return `+${val}`;
    };

    const front9ToPar = front9Par > 0 ? front9Gross - front9Par : 0;
    const back9ToPar = back9Par > 0 ? back9Gross - back9Par : 0;

    const roundStatus: PlayerRoundSnapshot['status'] = isCompleted 
      ? 'completed' 
      : isLive 
        ? 'live' 
        : 'upcoming';

    return {
      round,
      match,
      course,
      courseHoles,
      courseName: round.courseName,
      courseCover: round.courseCover,
      courseLocation: round.courseLocation,
      coursePar: round.coursePar || totalCoursePar,
      format: round.format,
      formatDescription: round.formatDescription,
      status: roundStatus,
      statusText: isCompleted ? 'Completed' : isLive ? 'Live In Progress' : 'Scheduled',
      holesPlayed,
      courseParOfPlayedHoles,
      totalCoursePar,
      grossScore: totalGross,
      netScore: totalNet,
      toParGross,
      toParGrossFormatted: formatToPar(toParGross),
      toParNet,
      toParNetFormatted: formatToPar(toParNet),
      front9Gross,
      front9Net,
      front9ToPar,
      back9Gross,
      back9Net,
      back9ToPar,
      birdiesCount,
      parsCount,
      eaglesCount,
      bogeysCount,
      doublesOrWorseCount,
      bestBallContributedCount,
      side,
      teamName: match[side]?.teamName || (side === 'sideA' ? 'Side A' : 'Side B'),
      teamColor: match[side]?.teamColor || '#059669',
      partner,
      opponents,
      matchResultText,
      matchWinner,
      holeScores
    };
  });
}

