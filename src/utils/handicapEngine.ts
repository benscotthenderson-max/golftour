import { GolfCourse, GolferUser, GameType, HoleDefinition, PlayerInMatch, TeeColor } from '../types/golf';

/**
 * World Handicap System (WHS) & USGA Official Rules Engine
 * 
 * Computes Course Handicap (CH), Playing Handicap (PH) per format allowance,
 * and allocates Stroke Dots (●) to specific holes based on Stroke Index (SI 1-18).
 */

export interface FormatAllowance {
  name: string;
  allowancePct: number; // e.g. 1.0 (100%), 0.95 (95%), 0.85 (85%)
  description: string;
  ruleReference: string;
}

export const FORMAT_ALLOWANCES: Record<GameType | 'better_ball_match' | 'scramble_2p' | 'scramble_4p', FormatAllowance> = {
  stroke_play: {
    name: 'Individual Stroke Play',
    allowancePct: 0.95, // WHS Appendix C recommends 95% for individual stroke play
    description: '95% of Course Handicap applied to total gross strokes.',
    ruleReference: 'WHS Appendix C (Stroke Play)'
  },
  stableford: {
    name: 'Individual Stableford',
    allowancePct: 0.95, // 95% WHS Standard
    description: '95% of Course Handicap. Points awarded based on Net Score relative to Par.',
    ruleReference: 'WHS Appendix C (Stableford)'
  },
  match_play: {
    name: 'Individual Match Play (Singles)',
    allowancePct: 1.00, // 100% of the difference from the lowest handicap golfer
    description: '100% difference off the lowest player handicap in the match.',
    ruleReference: 'WHS Appendix C (Match Play Singles)'
  },
  better_ball: {
    name: 'Fourball / Better Ball (Stroke/Stableford)',
    allowancePct: 0.85, // 85% for 4-player better ball
    description: '85% of Course Handicap. Lowest Net score of each 2-player team counts on each hole.',
    ruleReference: 'WHS Appendix C (Fourball)'
  },
  better_ball_match: {
    name: 'Fourball Match Play (2 vs 2)',
    allowancePct: 0.90, // 90% of Course Handicap difference off lowest player
    description: '90% of difference taken off the lowest player in the fourball.',
    ruleReference: 'WHS Appendix C (Fourball Match Play)'
  },
  scramble: {
    name: 'Team Scramble (4-Player)',
    allowancePct: 1.00,
    description: '25% of lowest + 20% second + 15% third + 10% highest handicap.',
    ruleReference: 'USGA Handicap System (Scramble)'
  },
  scramble_2p: {
    name: 'Team Scramble (2-Player)',
    allowancePct: 1.00,
    description: '35% of lower handicap + 15% of higher handicap.',
    ruleReference: 'USGA Handicap System (2-Man Scramble)'
  },
  scramble_4p: {
    name: 'Team Scramble (4-Player)',
    allowancePct: 1.00,
    description: '25% lowest + 20% second + 15% third + 10% highest.',
    ruleReference: 'USGA Handicap System (4-Man Scramble)'
  },
  skins: {
    name: 'Individual Skins',
    allowancePct: 1.00,
    description: '100% Course Handicap. Lowest single net score on hole wins skin.',
    ruleReference: 'Skins Game Standard'
  }
};

/**
 * 1. Calculate WHS Course Handicap (CH)
 * Formula: Course Handicap = Handicap Index × (Slope Rating / 113) + (Course Rating - Par)
 */
export function calculateCourseHandicap(
  handicapIndex: number,
  slopeRating: number,
  courseRating: number,
  par: number
): number {
  if (handicapIndex === 0) return 0;
  
  // WHS 2020+ formula incorporates Course Rating - Par adjustment
  const courseHandicapExact = (handicapIndex * (slopeRating / 113)) + (courseRating - par);
  return Math.round(courseHandicapExact);
}

/**
 * 2. Calculate WHS Playing Handicap (PH)
 * Formula: Playing Handicap = Course Handicap × Handicap Allowance %
 */
export function calculatePlayingHandicap(
  courseHandicap: number,
  format: GameType | 'better_ball_match' | 'scramble_2p' | 'scramble_4p' = 'stroke_play'
): number {
  const allowance = FORMAT_ALLOWANCES[format]?.allowancePct ?? 1.0;
  return Math.round(courseHandicap * allowance);
}

/**
 * 3. Calculate Scramble Team Playing Handicap
 */
export function calculateScrambleTeamHandicap(handicapIndexes: number[]): number {
  const sorted = [...handicapIndexes].sort((a, b) => a - b);
  
  if (sorted.length === 2) {
    // 2-person: 35% low + 15% high
    return Math.round((sorted[0] * 0.35) + (sorted[1] * 0.15));
  }
  
  if (sorted.length === 3) {
    // 3-person: 20% low + 15% mid + 10% high
    return Math.round((sorted[0] * 0.20) + (sorted[1] * 0.15) + (sorted[2] * 0.10));
  }
  
  // 4-person: 25% lowest + 20% second + 15% third + 10% highest
  const low = sorted[0] || 0;
  const sec = sorted[1] || 0;
  const thr = sorted[2] || 0;
  const fth = sorted[3] || 0;
  return Math.round((low * 0.25) + (sec * 0.20) + (thr * 0.15) + (fth * 0.10));
}

/**
 * 4. Allocate Stroke Dots to Specific Holes (Stroke Index 1 to 18)
 * 
 * Standard WHS Allocation Rule:
 * - If Playing Handicap = 13:
 *   - Holes with SI 1 through 13 receive 1 stroke (●)
 *   - Holes with SI 14 through 18 receive 0 strokes
 * - If Playing Handicap = 22:
 *   - Holes with SI 1 through 4 receive 2 strokes (●●) [22 - 18 = 4]
 *   - Holes with SI 5 through 18 receive 1 stroke (●)
 * - If Plus Handicap (e.g. -2 / +2 Index):
 *   - Holes with SI 18 and 17 receive -1 stroke (player gives a stroke back on the easiest holes)
 */
export function calculateStrokeDotsForHole(
  playingHandicap: number,
  strokeIndex: number // 1 to 18
): number {
  if (playingHandicap >= 0) {
    // Standard golfer
    const baseStrokes = Math.floor(playingHandicap / 18);
    const remainder = playingHandicap % 18;
    return baseStrokes + (strokeIndex <= remainder ? 1 : 0);
  } else {
    // Plus golfer (e.g. +2 handicap -> playingHandicap = -2)
    // Owes strokes starting from SI 18 down
    const absHandicap = Math.abs(playingHandicap);
    const owesStroke = (19 - strokeIndex) <= absHandicap;
    return owesStroke ? -1 : 0;
  }
}

/**
 * Returns formatted stroke dot symbol(s) for UI rendering
 */
export function getStrokeDotsSymbol(strokesReceived: number): string {
  if (strokesReceived === 1) return '●';
  if (strokesReceived === 2) return '●●';
  if (strokesReceived === 3) return '●●●';
  if (strokesReceived > 3) return `+${strokesReceived}`;
  if (strokesReceived < 0) return `-${Math.abs(strokesReceived)}`;
  return '';
}

/**
 * 5. Full Match Allocation Suite
 * Computes Playing Handicaps and Hole-by-Hole stroke allocations for all players in a match.
 */
export interface PlayerStrokeAllocation {
  userId: string;
  displayName: string;
  handicapIndex: number;
  courseHandicap: number;
  playingHandicap: number;
  matchPlayDiffHandicap?: number; // In Match Play, strokes off the lowest golfer
  teeColor: TeeColor;
  holeStrokes: Record<number, number>; // holeNumber -> strokes allocated (e.g. 1 -> 1, 6 -> 2)
}

export function allocateMatchStrokes(
  players: { userId: string; displayName: string; handicapIndex: number; teeColor: TeeColor }[],
  course: GolfCourse,
  gameType: GameType
): Record<string, PlayerStrokeAllocation> {
  const result: Record<string, PlayerStrokeAllocation> = {};

  // First pass: compute Course Handicap for each player based on their chosen tee box
  const initialData = players.map(player => {
    // Find matching tee rating & slope
    const tee = course.tees.find(t => t.color === player.teeColor) || course.tees[0] || {
      rating: course.par,
      slope: 113
    };

    const courseHandicap = calculateCourseHandicap(
      player.handicapIndex,
      tee.slope,
      tee.rating,
      course.par
    );

    const playingHandicap = calculatePlayingHandicap(courseHandicap, gameType);

    return {
      ...player,
      courseHandicap,
      playingHandicap,
    };
  });

  // If Match Play, calculate strokes off the lowest player
  const lowestPlayingHandicap = Math.min(...initialData.map(p => p.playingHandicap));

  // Determine holes definition
  const holes = course.holes || Array.from({ length: course.holesCount }, (_, i) => ({
    holeNumber: i + 1,
    par: 4,
    strokeIndex: ((i * 7) % 18) + 1,
    distances: { whiteMeters: 360 }
  }));

  // Build full allocation map
  initialData.forEach(player => {
    const isMatchPlay = gameType === 'match_play';
    const effectiveHandicap = isMatchPlay
      ? player.playingHandicap - lowestPlayingHandicap
      : player.playingHandicap;

    const holeStrokes: Record<number, number> = {};

    holes.forEach(hole => {
      holeStrokes[hole.holeNumber] = calculateStrokeDotsForHole(effectiveHandicap, hole.strokeIndex);
    });

    result[player.userId] = {
      userId: player.userId,
      displayName: player.displayName,
      handicapIndex: player.handicapIndex,
      courseHandicap: player.courseHandicap,
      playingHandicap: player.playingHandicap,
      matchPlayDiffHandicap: isMatchPlay ? effectiveHandicap : undefined,
      teeColor: player.teeColor,
      holeStrokes,
    };
  });

  return result;
}
