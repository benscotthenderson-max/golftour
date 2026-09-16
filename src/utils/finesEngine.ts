import { FineCategory, PlayerFineRecord, Tournament, GolferUser, FineUnit } from '../types/golf';

// Default starting fines list is completely blank as requested
export const DEFAULT_FINE_CATEGORIES: FineCategory[] = [];

/**
 * Format penalty display with proper dollar or fingers suffix
 */
export function formatFinePenalty(amount: number, unit?: string | FineUnit, currencySymbol?: string): string {
  const effectiveUnit = unit || currencySymbol || '$';
  if (effectiveUnit === 'Fingers' || effectiveUnit.toLowerCase() === 'finger' || effectiveUnit.toLowerCase() === 'fingers') {
    return `${amount} Finger${amount === 1 ? '' : 's'}`;
  }
  if (effectiveUnit === '$' || effectiveUnit.includes('$')) {
    return `$${amount}`;
  }
  return `${effectiveUnit}${amount}`;
}

export interface PlayerCategoryFineGroup {
  fineId: string;
  fineName: string;
  fineIcon: string;
  count: number;
  totalAmount: number;
  unit: string;
  holes: number[];
  records: PlayerFineRecord[];
}

export interface PlayerFinesSummary {
  userId: string;
  userName: string;
  userAvatar?: string;
  teamId?: string;
  teamName?: string;
  totalFinesCount: number;
  totalDollarsOwed: number;
  totalFingersOwed: number;
  totalAmountOwed: number;
  currencySymbol: string;
  finesList: PlayerFineRecord[];
  byFineCategory: PlayerCategoryFineGroup[];
  topFineCategory?: string;
}

export interface FineCategoryPlayerEntry {
  userId: string;
  userName: string;
  userAvatar?: string;
  teamId?: string;
  teamName?: string;
  count: number;
  totalAmount: number;
  unit: string;
  holes: number[];
  records: PlayerFineRecord[];
}

export interface FineCategorySummary {
  fineId: string;
  fineName: string;
  fineIcon: string;
  description?: string;
  amount: number;
  unit: string;
  severity?: 'mild' | 'standard' | 'severe';
  totalIncurredCount: number;
  totalAmount: number;
  affectedPlayers: FineCategoryPlayerEntry[];
}

export interface TeamFinesSummary {
  teamId: string;
  teamName: string;
  teamColor?: string;
  badgeIcon?: string;
  totalFinesCount: number;
  totalDollarsOwed: number;
  totalFingersOwed: number;
  totalAmountOwed: number;
  currencySymbol: string;
  players: PlayerFinesSummary[];
}

export interface TournamentFinesTally {
  totalDollarsAmount: number;
  totalFingersAmount: number;
  totalKittyAmount: number;
  currencySymbol: string;
  totalFinesCount: number;
  finesKing?: PlayerFinesSummary; // Golfer with the most infractions/penalties
  teamSummaries: TeamFinesSummary[];
  playerSummaries: PlayerFinesSummary[];
  categorySummaries: FineCategorySummary[];
  recentFines: PlayerFineRecord[];
  availableRounds: number[];
  selectedRound: number | 'all';
}

/**
 * Calculates complete fine tallies across tournament or match records with optional day/round filter
 */
export function calculateTournamentFinesTally(
  allFines: PlayerFineRecord[] = [],
  tournament?: Tournament | null,
  allUsers: GolferUser[] = [],
  filterRound: number | 'all' = 'all',
  definedCategories: FineCategory[] = []
): TournamentFinesTally {
  // Deduplicate entries by unique ID or exact hole violation fingerprint to prevent compounding
  const seenEntries = new Set<string>();
  const uniqueFines: PlayerFineRecord[] = [];

  allFines.forEach(f => {
    if (!f) return;
    const uniqueKey = f.id || `${f.userId}_${f.fineId}_${f.tournamentId || ''}_${f.matchId || ''}_${f.roundNumber ?? f.dayNumber ?? 1}_hole${f.holeNumber}_${f.amount}_${f.timestamp || ''}`;
    if (!seenEntries.has(uniqueKey)) {
      seenEntries.add(uniqueKey);
      uniqueFines.push(f);
    }
  });

  // Collect available round numbers from tournament or fines
  const roundSet = new Set<number>();
  if (tournament?.rounds) {
    tournament.rounds.forEach(r => roundSet.add(r.roundNumber || r.dayNumber || 1));
  }
  uniqueFines.forEach(f => {
    if (f.roundNumber) roundSet.add(f.roundNumber);
    else if (f.dayNumber) roundSet.add(f.dayNumber);
  });
  const availableRounds = Array.from(roundSet).sort((a, b) => a - b);

  // Apply day/round filter on unique entries
  const fines = filterRound === 'all'
    ? uniqueFines
    : uniqueFines.filter(f => (f.roundNumber ?? f.dayNumber ?? 1) === filterRound);

  let totalDollarsAmount = 0;
  let totalFingersAmount = 0;
  let totalKittyAmount = 0;
  const totalFinesCount = fines.length;

  const playerMap = new Map<string, PlayerFinesSummary>();
  const categoryMap = new Map<string, FineCategorySummary>();

  // Initialize known configured categories
  definedCategories.forEach(cat => {
    categoryMap.set(cat.id, {
      fineId: cat.id,
      fineName: cat.name,
      fineIcon: cat.icon,
      description: cat.description,
      amount: cat.amount,
      unit: cat.unit || cat.currencySymbol || '$',
      severity: cat.severity,
      totalIncurredCount: 0,
      totalAmount: 0,
      affectedPlayers: [],
    });
  });

  fines.forEach(fine => {
    const isFingers = (fine.unit || fine.currencySymbol || '').toLowerCase().includes('finger');
    if (isFingers) {
      totalFingersAmount += fine.amount;
    } else {
      totalDollarsAmount += fine.amount;
    }
    totalKittyAmount += fine.amount;

    // 1. Player Tally
    let pSummary = playerMap.get(fine.userId);
    if (!pSummary) {
      const user = allUsers.find(u => u.id === fine.userId);
      const userTeam = tournament?.teams.find(t => t.id === fine.teamId || t.playerIds?.includes(fine.userId));
      pSummary = {
        userId: fine.userId,
        userName: fine.userName || user?.displayName || 'Golfer',
        userAvatar: fine.userAvatar || user?.photoURL,
        teamId: fine.teamId || userTeam?.id,
        teamName: fine.teamName || userTeam?.name,
        totalFinesCount: 0,
        totalDollarsOwed: 0,
        totalFingersOwed: 0,
        totalAmountOwed: 0,
        currencySymbol: fine.currencySymbol || '$',
        finesList: [],
        byFineCategory: [],
      };
      playerMap.set(fine.userId, pSummary);
    }

    pSummary.totalFinesCount += 1;
    if (isFingers) {
      pSummary.totalFingersOwed += fine.amount;
    } else {
      pSummary.totalDollarsOwed += fine.amount;
    }
    pSummary.totalAmountOwed += fine.amount;
    pSummary.finesList.push(fine);

    // 2. Category Tally
    let catSummary = categoryMap.get(fine.fineId);
    if (!catSummary) {
      catSummary = {
        fineId: fine.fineId,
        fineName: fine.fineName,
        fineIcon: fine.fineIcon || '🍺',
        amount: fine.amount,
        unit: fine.unit || fine.currencySymbol || '$',
        totalIncurredCount: 0,
        totalAmount: 0,
        affectedPlayers: [],
      };
      categoryMap.set(fine.fineId, catSummary);
    }

    catSummary.totalIncurredCount += 1;
    catSummary.totalAmount += fine.amount;

    // Player inside Category entry
    let catPlayer = catSummary.affectedPlayers.find(p => p.userId === fine.userId);
    if (!catPlayer) {
      const user = allUsers.find(u => u.id === fine.userId);
      catPlayer = {
        userId: fine.userId,
        userName: fine.userName || user?.displayName || 'Golfer',
        userAvatar: fine.userAvatar || user?.photoURL,
        teamId: fine.teamId,
        teamName: fine.teamName,
        count: 0,
        totalAmount: 0,
        unit: fine.unit || fine.currencySymbol || '$',
        holes: [],
        records: [],
      };
      catSummary.affectedPlayers.push(catPlayer);
    }
    catPlayer.count += 1;
    catPlayer.totalAmount += fine.amount;
    catPlayer.holes.push(fine.holeNumber);
    catPlayer.records.push(fine);
  });

  // Calculate detailed category breakdown per player
  playerMap.forEach(p => {
    const catGroupMap = new Map<string, PlayerCategoryFineGroup>();
    p.finesList.forEach(fine => {
      let g = catGroupMap.get(fine.fineId);
      if (!g) {
        g = {
          fineId: fine.fineId,
          fineName: fine.fineName,
          fineIcon: fine.fineIcon || '🍺',
          count: 0,
          totalAmount: 0,
          unit: fine.unit || fine.currencySymbol || '$',
          holes: [],
          records: [],
        };
        catGroupMap.set(fine.fineId, g);
      }
      g.count += 1;
      g.totalAmount += fine.amount;
      g.holes.push(fine.holeNumber);
      g.records.push(fine);
    });

    p.byFineCategory = Array.from(catGroupMap.values()).sort((a, b) => b.count - a.count);
    p.topFineCategory = p.byFineCategory[0]?.fineName;
  });

  // Sort players by highest total count / penalties
  const playerSummaries = Array.from(playerMap.values()).sort((a, b) => {
    if (b.totalFinesCount !== a.totalFinesCount) {
      return b.totalFinesCount - a.totalFinesCount;
    }
    return b.totalAmountOwed - a.totalAmountOwed;
  });

  const finesKing = playerSummaries[0] || undefined;

  // Group by team
  const teamMap = new Map<string, TeamFinesSummary>();
  if (tournament?.teams) {
    tournament.teams.forEach(team => {
      teamMap.set(team.id, {
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color,
        badgeIcon: team.badgeIcon,
        totalFinesCount: 0,
        totalDollarsOwed: 0,
        totalFingersOwed: 0,
        totalAmountOwed: 0,
        currencySymbol: '$',
        players: [],
      });
    });
  }

  playerSummaries.forEach(p => {
    let tSummary = p.teamId ? teamMap.get(p.teamId) : undefined;
    if (!tSummary) {
      const fallbackTeamId = p.teamId || 'unassigned';
      if (!teamMap.has(fallbackTeamId)) {
        teamMap.set(fallbackTeamId, {
          teamId: fallbackTeamId,
          teamName: p.teamName || 'Individual Golfers',
          totalFinesCount: 0,
          totalDollarsOwed: 0,
          totalFingersOwed: 0,
          totalAmountOwed: 0,
          currencySymbol: '$',
          players: [],
        });
      }
      tSummary = teamMap.get(fallbackTeamId)!;
    }

    tSummary.totalFinesCount += p.totalFinesCount;
    tSummary.totalDollarsOwed += p.totalDollarsOwed;
    tSummary.totalFingersOwed += p.totalFingersOwed;
    tSummary.totalAmountOwed += p.totalAmountOwed;
    tSummary.players.push(p);
  });

  const teamSummaries = Array.from(teamMap.values()).sort(
    (a, b) => b.totalFinesCount - a.totalFinesCount || b.totalAmountOwed - a.totalAmountOwed
  );

  const categorySummaries = Array.from(categoryMap.values()).sort(
    (a, b) => b.totalIncurredCount - a.totalIncurredCount
  );

  const recentFines = [...fines].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return {
    totalDollarsAmount,
    totalFingersAmount,
    totalKittyAmount,
    currencySymbol: '$',
    totalFinesCount,
    finesKing,
    teamSummaries,
    playerSummaries,
    categorySummaries,
    recentFines,
    availableRounds,
    selectedRound: filterRound,
  };
}
