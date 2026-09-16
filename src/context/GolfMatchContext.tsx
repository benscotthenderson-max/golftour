import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { GolfMatch, GolfCourse, PlayerInMatch, HoleScore, HoleDefinition, GolferUser, GameType } from '../types/golf';
import { MOCK_COURSES } from '../data/mockData';
import gardenRouteSeed from '../data/gardenRouteCoursesSeed.json';
import { allocateMatchStrokes, PlayerStrokeAllocation, calculateStrokeDotsForHole } from '../utils/handicapEngine';
import { 
  calculateMatchPlayStatus, 
  calculateBetterBallStanding, 
  computeHoleNetScore, 
  calculateStablefordPoints, 
  MatchPlayStatus, 
  BetterBallStanding 
} from '../utils/scoringFormats';

export interface LiveAuditLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'score' | 'sync' | 'match_status' | 'handicap';
  userId?: string;
  holeNumber?: number;
}

export interface PlayerLeaderboardItem {
  player: PlayerInMatch;
  grossTotal: number;
  netTotal: number;
  stablefordTotal: number;
  toParGross: number;
  toParNet: number;
  holesCompleted: number;
  allocatedStrokesTotal: number;
  rank: number;
}

export interface GolfMatchContextType {
  activeMatch: GolfMatch | null;
  activeCourse: GolfCourse | null;
  strokeAllocations: Record<string, PlayerStrokeAllocation>;
  currentHoleNumber: number;
  currentHole: HoleDefinition | null;
  currentScorerId: string;
  isSpectatorMode: boolean;
  isSyncing: boolean;
  syncStatus: 'synced' | 'syncing' | 'offline';
  lastSyncedAt: Date | null;
  simulateOpponentEnabled: boolean;
  liveAuditLogs: LiveAuditLog[];
  leaderboard: PlayerLeaderboardItem[];
  matchPlayStatus: MatchPlayStatus | null;
  betterBallStanding: BetterBallStanding | null;
  
  // Actions
  startActiveMatch: (match: GolfMatch, course?: GolfCourse) => void;
  exitActiveMatch: () => void;
  selectHole: (holeNumber: number) => void;
  nextHole: () => void;
  prevHole: () => void;
  updateHoleScore: (
    userId: string,
    holeNumber: number,
    data: { grossScore: number; putts?: number; fairwayHit?: boolean; greenInRegulation?: boolean }
  ) => void;
  quickScorePreset: (
    userId: string,
    holeNumber: number,
    preset: 'albatross' | 'eagle' | 'birdie' | 'par' | 'bogey' | 'double' | 'triple'
  ) => void;
  switchScorer: (userId: string) => void;
  toggleSpectatorMode: () => void;
  toggleSimulateOpponent: () => void;
  simulateOpponentNextHole: () => void;
  finishAndPublishRound: () => {
    grossScore: number;
    netScore: number;
    parDiff: number;
    stablefordPoints: number;
    match: GolfMatch;
  } | null;
}

const GolfMatchContext = createContext<GolfMatchContextType | null>(null);

export const GolfMatchProvider: React.FC<{
  currentUser: GolferUser;
  children: React.ReactNode;
  onRoundFinished?: (summary: {
    match: GolfMatch;
    grossScore: number;
    netScore: number;
    parDiff: number;
    stablefordPoints: number;
  }) => void;
}> = ({ currentUser, children, onRoundFinished }) => {
  const [activeMatch, setActiveMatch] = useState<GolfMatch | null>(null);
  const [currentHoleNumber, setCurrentHoleNumber] = useState<number>(1);
  const [currentScorerId, setCurrentScorerId] = useState<string>(currentUser.id);
  const [isSpectatorMode, setIsSpectatorMode] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(new Date());
  const [simulateOpponentEnabled, setSimulateOpponentEnabled] = useState<boolean>(true);
  const [liveAuditLogs, setLiveAuditLogs] = useState<LiveAuditLog[]>([
    {
      id: 'log-init',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      message: '⚡️ Firestore Real-Time Golf Engine initialized & ready.',
      type: 'sync',
    },
  ]);

  // Find course object based on activeMatch.courseId
  const activeCourse = useMemo<GolfCourse | null>(() => {
    if (!activeMatch) return null;
    
    // Check in Garden Route seed first
    const grCourse = gardenRouteSeed.courses.find(c => c.id === activeMatch.courseId);
    if (grCourse) {
      return {
        id: grCourse.id,
        name: grCourse.name,
        clubName: grCourse.clubName,
        location: grCourse.location,
        city: grCourse.city,
        country: grCourse.country,
        region: grCourse.region,
        architect: grCourse.architect,
        coverImage: grCourse.coverImage,
        par: grCourse.par,
        holesCount: grCourse.holesCount as 18,
        tees: grCourse.teeBoxes.map(t => ({
          color: t.color as any,
          rating: t.courseRating,
          slope: t.slopeRating,
          meters: t.totalMeters,
          name: t.name,
        })),
        teeBoxes: grCourse.teeBoxes as any,
        holes: grCourse.holes as any,
        facilities: grCourse.facilities,
      };
    }

    // Fallback to MOCK_COURSES
    const mockC = MOCK_COURSES.find(c => c.id === activeMatch.courseId);
    return mockC || MOCK_COURSES[0];
  }, [activeMatch]);

  // Current Hole definition
  const currentHole = useMemo<HoleDefinition | null>(() => {
    if (!activeCourse) return null;
    const found = activeCourse.holes?.find(h => h.holeNumber === currentHoleNumber);
    if (found) return found;

    return {
      holeNumber: currentHoleNumber,
      par: 4,
      strokeIndex: ((currentHoleNumber * 7) % 18) + 1,
      distances: { whiteMeters: 365, yellowMeters: 385, blueMeters: 345, redMeters: 310 },
      description: `Hole ${currentHoleNumber} at ${activeCourse.name}`,
    };
  }, [activeCourse, currentHoleNumber]);

  // Stroke Allocations for all players in the match
  const strokeAllocations = useMemo(() => {
    if (!activeMatch || !activeCourse) return {};
    return allocateMatchStrokes(
      activeMatch.players.map(p => ({
        userId: p.userId,
        displayName: p.displayName,
        handicapIndex: p.handicapIndex,
        teeColor: p.teeColor,
      })),
      activeCourse,
      activeMatch.gameType
    );
  }, [activeMatch, activeCourse]);

  // Helper to append live audit log with simulated Firestore push
  const addAuditLog = useCallback((message: string, type: 'score' | 'sync' | 'match_status' | 'handicap', userId?: string, holeNumber?: number) => {
    const newLog: LiveAuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      message,
      type,
      userId,
      holeNumber,
    };
    setLiveAuditLogs(prev => [newLog, ...prev.slice(0, 49)]); // Keep last 50
  }, []);

  // Simulate Firestore Real-Time Write & Sync
  const triggerFirestoreSync = useCallback((logMsg?: string) => {
    setIsSyncing(true);
    setSyncStatus('syncing');

    setTimeout(() => {
      setIsSyncing(false);
      setSyncStatus('synced');
      setLastSyncedAt(new Date());
      if (logMsg) {
        addAuditLog(logMsg, 'sync');
      }
    }, 280);
  }, [addAuditLog]);

  // Start Active Match
  const startActiveMatch = useCallback((match: GolfMatch, courseOverride?: GolfCourse) => {
    // Populate hole scores if empty
    const course = courseOverride || MOCK_COURSES.find(c => c.id === match.courseId) || MOCK_COURSES[0];
    const holes = course.holes || Array.from({ length: 18 }, (_, i) => ({
      holeNumber: i + 1,
      par: 4,
      strokeIndex: ((i * 7) % 18) + 1,
      distances: { whiteMeters: 360 }
    }));

    const allocations = allocateMatchStrokes(
      match.players.map(p => ({
        userId: p.userId,
        displayName: p.displayName,
        handicapIndex: p.handicapIndex,
        teeColor: p.teeColor,
      })),
      course,
      match.gameType
    );

    const initializedPlayers = match.players.map(p => {
      const pAlloc = allocations[p.userId];
      const initialHoleScores: HoleScore[] = p.holeScores.length > 0
        ? p.holeScores
        : holes.map(h => ({
            holeNumber: h.holeNumber,
            par: h.par,
            strokeIndex: h.strokeIndex,
            grossScore: 0,
            netScore: 0,
            stablefordPoints: 0,
            putts: 2,
            fairwayHit: true,
            greenInRegulation: true,
          }));

      return {
        ...p,
        playingHandicap: pAlloc?.playingHandicap ?? Math.round(p.handicapIndex),
        holeScores: initialHoleScores,
      };
    });

    const populatedMatch: GolfMatch = {
      ...match,
      status: 'in_progress',
      players: initializedPlayers,
    };

    setActiveMatch(populatedMatch);
    setCurrentHoleNumber(1);
    setCurrentScorerId(currentUser.id);
    addAuditLog(
      `⛳️ Active match launched at ${course.name} (${(match.gameType || 'stroke_play').replace(/_/g, ' ').toUpperCase()}). WHS Handicap strokes allocated.`,
      'match_status'
    );
    triggerFirestoreSync(`📡 Firestore /matches/${match.id} subscription active`);
  }, [currentUser, addAuditLog, triggerFirestoreSync]);

  // Exit Match
  const exitActiveMatch = useCallback(() => {
    setActiveMatch(null);
    addAuditLog('Match scoring paused / exited.', 'match_status');
  }, [addAuditLog]);

  // Navigation
  const selectHole = useCallback((holeNumber: number) => {
    if (holeNumber >= 1 && holeNumber <= 18) {
      setCurrentHoleNumber(holeNumber);
    }
  }, []);

  const nextHole = useCallback(() => {
    setCurrentHoleNumber(prev => Math.min(18, prev + 1));
  }, []);

  const prevHole = useCallback(() => {
    setCurrentHoleNumber(prev => Math.max(1, prev - 1));
  }, []);

  // Update Hole Score Hole-by-Hole
  const updateHoleScore = useCallback((
    userId: string,
    holeNumber: number,
    data: { grossScore: number; putts?: number; fairwayHit?: boolean; greenInRegulation?: boolean }
  ) => {
    if (!activeMatch || !activeCourse) return;

    const holeDef = activeCourse.holes?.find(h => h.holeNumber === holeNumber) || {
      holeNumber,
      par: 4,
      strokeIndex: ((holeNumber * 7) % 18) + 1,
      distances: { whiteMeters: 360 }
    };

    const userAlloc = strokeAllocations[userId];
    const dots = userAlloc?.holeStrokes[holeNumber] ?? 0;
    const netCalc = computeHoleNetScore(data.grossScore, holeDef.par, holeDef.strokeIndex, dots);

    const player = activeMatch.players.find(p => p.userId === userId);
    const playerName = player?.displayName || 'Golfer';

    setActiveMatch(prev => {
      if (!prev) return null;

      const updatedPlayers = prev.players.map(p => {
        if (p.userId !== userId) return p;

        const updatedHoleScores = [...p.holeScores];
        const existingIdx = updatedHoleScores.findIndex(h => h.holeNumber === holeNumber);

        const newHoleScore: HoleScore = {
          holeNumber,
          par: holeDef.par,
          strokeIndex: holeDef.strokeIndex,
          grossScore: data.grossScore,
          netScore: netCalc.netScore,
          stablefordPoints: netCalc.stablefordPoints,
          putts: data.putts ?? (existingIdx >= 0 ? updatedHoleScores[existingIdx].putts : 2),
          fairwayHit: data.fairwayHit ?? (existingIdx >= 0 ? updatedHoleScores[existingIdx].fairwayHit : true),
          greenInRegulation: data.greenInRegulation ?? (existingIdx >= 0 ? updatedHoleScores[existingIdx].greenInRegulation : true),
        };

        if (existingIdx >= 0) {
          updatedHoleScores[existingIdx] = newHoleScore;
        } else {
          updatedHoleScores.push(newHoleScore);
        }

        // Recompute totals
        const grossTotal = updatedHoleScores.reduce((sum, h) => sum + (h.grossScore || 0), 0);
        const netTotal = updatedHoleScores.reduce((sum, h) => sum + (h.grossScore > 0 ? h.netScore : 0), 0);
        const stablefordTotal = updatedHoleScores.reduce((sum, h) => sum + (h.stablefordPoints || 0), 0);

        return {
          ...p,
          grossScore: grossTotal,
          netScore: netTotal,
          stablefordPoints: stablefordTotal,
          holeScores: updatedHoleScores,
        };
      });

      return {
        ...prev,
        players: updatedPlayers,
        updatedAt: new Date().toISOString(),
      };
    });

    // Logging & Live Sync trigger
    if (data.grossScore > 0) {
      addAuditLog(
        `📝 ${playerName} scored ${data.grossScore} (${netCalc.scoreTerm}) on Hole ${holeNumber} [Net: ${netCalc.netScore}, Points: ${netCalc.stablefordPoints}]`,
        'score',
        userId,
        holeNumber
      );
      triggerFirestoreSync(`🔥 Synced doc /matches/${activeMatch.id}/scores/hole_${holeNumber}`);
    }
  }, [activeMatch, activeCourse, strokeAllocations, addAuditLog, triggerFirestoreSync]);

  // Quick Score Presets
  const quickScorePreset = useCallback((
    userId: string,
    holeNumber: number,
    preset: 'albatross' | 'eagle' | 'birdie' | 'par' | 'bogey' | 'double' | 'triple'
  ) => {
    if (!activeCourse) return;
    const holeDef = activeCourse.holes?.find(h => h.holeNumber === holeNumber) || { par: 4 };
    const par = holeDef.par;

    let score = par;
    switch (preset) {
      case 'albatross': score = Math.max(1, par - 3); break;
      case 'eagle': score = Math.max(1, par - 2); break;
      case 'birdie': score = Math.max(1, par - 1); break;
      case 'par': score = par; break;
      case 'bogey': score = par + 1; break;
      case 'double': score = par + 2; break;
      case 'triple': score = par + 3; break;
    }

    updateHoleScore(userId, holeNumber, { grossScore: score });
  }, [activeCourse, updateHoleScore]);

  // Switch Active Scorer View
  const switchScorer = useCallback((userId: string) => {
    setCurrentScorerId(userId);
    const user = activeMatch?.players.find(p => p.userId === userId);
    addAuditLog(`📱 Scorer device perspective switched to ${user?.displayName || 'Golfer'}`, 'sync');
  }, [activeMatch, addAuditLog]);

  const toggleSpectatorMode = useCallback(() => {
    setIsSpectatorMode(prev => !prev);
    addAuditLog(
      isSpectatorMode ? '👤 Switched to Player Score Input Mode' : '📺 Switched to Remote Live Spectator Broadcast Mode',
      'sync'
    );
  }, [isSpectatorMode, addAuditLog]);

  const toggleSimulateOpponent = useCallback(() => {
    setSimulateOpponentEnabled(prev => !prev);
    addAuditLog(
      simulateOpponentEnabled
        ? '⏸️ Automated opponent live updates paused.'
        : '▶️ Automated opponent live updates active (Simulating remote devices).',
      'sync'
    );
  }, [simulateOpponentEnabled, addAuditLog]);

  // Simulate remote opponent entering score on current or next hole
  const simulateOpponentNextHole = useCallback(() => {
    if (!activeMatch || !activeCourse) return;
    const opponent = activeMatch.players.find(p => p.userId !== currentScorerId);
    if (!opponent) return;

    const holeDef = activeCourse.holes?.find(h => h.holeNumber === currentHoleNumber) || { par: 4, strokeIndex: 1 };
    
    // Choose realistic score based on opponent handicap
    const randomChoices = [-1, 0, 0, 1, 1, 2]; // mostly par/bogey with occasional birdie
    const randomDiff = randomChoices[Math.floor(Math.random() * randomChoices.length)];
    const simulatedGross = Math.max(1, holeDef.par + randomDiff);

    updateHoleScore(opponent.userId, currentHoleNumber, {
      grossScore: simulatedGross,
      putts: simulatedGross <= holeDef.par ? 1 : 2,
      fairwayHit: true,
      greenInRegulation: simulatedGross <= holeDef.par,
    });
  }, [activeMatch, activeCourse, currentScorerId, currentHoleNumber, updateHoleScore]);

  // Format Status Calculations
  const matchPlayStatus = useMemo<MatchPlayStatus | null>(() => {
    if (!activeMatch || activeMatch.gameType !== 'match_play' || activeMatch.players.length < 2 || !activeCourse) {
      return null;
    }
    const holes = activeCourse.holes || [];
    return calculateMatchPlayStatus(activeMatch.players[0], activeMatch.players[1], holes, strokeAllocations);
  }, [activeMatch, activeCourse, strokeAllocations]);

  const betterBallStanding = useMemo<BetterBallStanding | null>(() => {
    if (!activeMatch || activeMatch.gameType !== 'better_ball' || activeMatch.players.length < 2 || !activeCourse) {
      return null;
    }
    const holes = activeCourse.holes || [];
    const teamA = [activeMatch.players[0], activeMatch.players[1]].filter(Boolean);
    const teamB = [activeMatch.players[2], activeMatch.players[3]].filter(Boolean);

    if (teamA.length === 0 || teamB.length === 0) return null;

    return calculateBetterBallStanding(
      teamA,
      teamB,
      holes,
      strokeAllocations,
      `${teamA[0]?.displayName.split(' ')[0]}'s Team`,
      `${teamB[0]?.displayName.split(' ')[0]}'s Team`
    );
  }, [activeMatch, activeCourse, strokeAllocations]);

  // Leaderboard Calculation (Stroke Play & Stableford)
  const leaderboard = useMemo<PlayerLeaderboardItem[]>(() => {
    if (!activeMatch || !activeCourse) return [];

    const parTotal = activeCourse.par || 72;

    const items = activeMatch.players.map(player => {
      const completedHoles = player.holeScores.filter(h => h.grossScore > 0);
      const grossTotal = completedHoles.reduce((sum, h) => sum + h.grossScore, 0);
      const netTotal = completedHoles.reduce((sum, h) => sum + h.netScore, 0);
      const stablefordTotal = completedHoles.reduce((sum, h) => sum + h.stablefordPoints, 0);
      const completedPar = completedHoles.reduce((sum, h) => sum + h.par, 0);

      const toParGross = grossTotal - completedPar;
      const toParNet = netTotal - completedPar;

      const pAlloc = strokeAllocations[player.userId];
      const allocatedStrokesTotal = Object.values(pAlloc?.holeStrokes || {}).reduce<number>((a, b) => a + (Number(b) || 0), 0);

      return {
        player,
        grossTotal,
        netTotal,
        stablefordTotal,
        toParGross,
        toParNet,
        holesCompleted: completedHoles.length,
        allocatedStrokesTotal,
        rank: 1,
      };
    });

    // Sort based on game type
    if (activeMatch.gameType === 'stableford') {
      items.sort((a, b) => b.stablefordTotal - a.stablefordTotal);
    } else {
      items.sort((a, b) => a.netTotal - b.netTotal);
    }

    // Assign rank
    return items.map((item, idx) => ({ ...item, rank: idx + 1 }));
  }, [activeMatch, activeCourse, strokeAllocations]);

  // Finish Round & Publish Recap
  const finishAndPublishRound = useCallback(() => {
    if (!activeMatch || !activeCourse) return null;

    const myPlayer = activeMatch.players.find(p => p.userId === currentUser.id) || activeMatch.players[0];
    const completedHoles = myPlayer.holeScores.filter(h => h.grossScore > 0);

    const grossScore = completedHoles.reduce((sum, h) => sum + h.grossScore, 0);
    const netScore = completedHoles.reduce((sum, h) => sum + h.netScore, 0);
    const completedPar = completedHoles.reduce((sum, h) => sum + h.par, 0) || activeCourse.par;
    const parDiff = grossScore - completedPar;
    const stablefordPoints = completedHoles.reduce((sum, h) => sum + h.stablefordPoints, 0);

    const summary = {
      match: activeMatch,
      grossScore,
      netScore,
      parDiff,
      stablefordPoints,
    };

    if (onRoundFinished) {
      onRoundFinished(summary);
    }

    addAuditLog(
      `🏆 Round Finalized & Verified! Gross: ${grossScore} (${parDiff >= 0 ? `+${parDiff}` : parDiff}), Net: ${netScore}, Stableford: ${stablefordPoints} pts.`,
      'match_status'
    );

    setActiveMatch(prev => prev ? { ...prev, status: 'completed' } : null);
    return summary;
  }, [activeMatch, activeCourse, currentUser, onRoundFinished, addAuditLog]);

  const value: GolfMatchContextType = {
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
    startActiveMatch,
    exitActiveMatch,
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
  };

  return <GolfMatchContext.Provider value={value}>{children}</GolfMatchContext.Provider>;
};

export const useGolfMatch = (): GolfMatchContextType => {
  const context = useContext(GolfMatchContext);
  if (!context) {
    throw new Error('useGolfMatch must be used within a GolfMatchProvider');
  }
  return context;
};
