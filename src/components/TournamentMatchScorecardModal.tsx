import React, { useState, useEffect, useMemo } from 'react';
import { 
  TournamentMatch, 
  TournamentRound, 
  Tournament, 
  TournamentHoleResult, 
  GolferUser,
  GolfCourse,
  HoleDefinition,
  PlayerFineRecord
} from '../types/golf';
import { MOCK_COURSES } from '../data/mockData';
import { 
  evaluateTournamentMatchStatus, 
  computeHoleOutcome 
} from '../utils/tournamentEngine';
import { 
  calculateStrokeDotsForHole, 
  getStrokeDotsSymbol, 
  calculateScrambleTeamHandicap 
} from '../utils/handicapEngine';
import { 
  resolveMatchPlayers, 
  calculateMatchPlayerSummaries, 
  formatPlayerInitialAndSurname,
  formatSidePlayersLabel,
  PlayerScoreSummary 
} from '../utils/scorecardCalculations';
import { StorageService } from '../utils/storage';
import { FineAssignModal, AssignablePlayer } from './FineAssignModal';
import { 
  X, 
  Flag, 
  Trophy, 
  MapPin, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Check, 
  RotateCcw, 
  Zap, 
  ShieldCheck, 
  CheckCircle2,
  Table,
  Sliders,
  Award,
  Users,
  User,
  UserCheck,
  Star,
  Beer,
  Lock
} from 'lucide-react';
import confetti from 'canvas-confetti';

// Color helper for tinting scorecard cells with persistent team colors
function hexToRgba(hex?: string, alpha = 1): string {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return `rgba(5, 150, 105, ${alpha})`;
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

interface TournamentMatchScorecardModalProps {
  match: TournamentMatch;
  round: TournamentRound;
  tournament: Tournament;
  currentUser: GolferUser;
  allUsers?: GolferUser[];
  onClose: () => void;
  onUpdateMatch: (updatedMatch: TournamentMatch) => void;
}

export const TournamentMatchScorecardModal: React.FC<TournamentMatchScorecardModalProps> = ({
  match,
  round,
  tournament,
  currentUser,
  allUsers: propUsers,
  onClose,
  onUpdateMatch,
}) => {
  const allUsers = useMemo(() => (propUsers && propUsers.length > 0 ? propUsers : StorageService.getAllUsers()), [propUsers]);
  // Find associated course
  const course: GolfCourse = MOCK_COURSES.find(c => c.id === round.courseId) || {
    id: round.courseId,
    name: round.courseName,
    clubName: round.courseName,
    location: round.courseLocation,
    city: 'Knysna',
    coverImage: round.courseCover,
    par: round.coursePar || 72,
    holesCount: 18,
    tees: [
      { color: 'Championship', rating: 74.2, slope: 138, meters: 6550 },
      { color: 'Middle', rating: 71.8, slope: 133, meters: 5943 },
    ],
    facilities: [],
  };

  // Build standard 18 holes from course or fallback
  const courseHoles: HoleDefinition[] = useMemo(() => {
    return course.holes && course.holes.length === 18 
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
  }, [course]);

  // Format classification
  const roundFormat = (round?.format || '').toLowerCase();
  const matchFormat = (match?.format || '').toLowerCase();
  // Round/Day format takes priority, fallback to match format
  const formatStr = roundFormat || matchFormat || 'individual_matchplay';
  const isSingles = formatStr.includes('individual') || formatStr.includes('singles');
  const isScramble = formatStr.includes('scramble') || formatStr.includes('alternate');
  const isBetterBall = !isSingles && !isScramble;

  // Resolve players on Side A and Side B
  const { sideAPlayers, sideBPlayers } = useMemo(() => {
    return resolveMatchPlayers(match, round, allUsers);
  }, [match, round, allUsers]);

  // Active hole management
  const completedHolesCount = Object.keys(match.holeResults || {}).length;
  const initialHole = completedHolesCount < 18 ? completedHolesCount + 1 : 1;
  const [selectedHoleNum, setSelectedHoleNum] = useState<number>(initialHole);
  const [activeTab, setActiveTab] = useState<'interactive' | 'players' | 'scorecard'>('interactive');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Teams & side labels
  const sideATeam = tournament.teams.find(t => t.id === match.sideA.teamId) || tournament.teams[0] || {
    id: 'team-a',
    name: 'Team Eagle',
    shortCode: 'EGL',
    color: '#059669',
    badgeIcon: '🦅'
  };
  const sideBTeam = tournament.teams.find(t => t.id === match.sideB.teamId) || tournament.teams[1] || {
    id: 'team-b',
    name: 'Team Albatross',
    shortCode: 'ALB',
    color: '#0284c7',
    badgeIcon: '🪶'
  };

  // Persistent team colors (used for scorecard grid cell-coloring and badges)
  const teamColorA = match.sideA.teamColor || sideATeam.color || '#059669';
  const teamColorB = match.sideB.teamColor || sideBTeam.color || '#0284c7';

  const currentHoleDef = courseHoles.find(h => h.holeNumber === selectedHoleNum) || courseHoles[0];
  const existingHoleResult = match.holeResults?.[selectedHoleNum];

  // Team scramble handicap calculation
  const teamScrambleHcpA = match.sideA.playingHandicap ?? calculateScrambleTeamHandicap(sideAPlayers.map(p => p.handicapIndex));
  const teamScrambleHcpB = match.sideB.playingHandicap ?? calculateScrambleTeamHandicap(sideBPlayers.map(p => p.handicapIndex));
  const teamScrambleStrokesA = calculateStrokeDotsForHole(teamScrambleHcpA, currentHoleDef.strokeIndex);
  const teamScrambleStrokesB = calculateStrokeDotsForHole(teamScrambleHcpB, currentHoleDef.strokeIndex);

  // Draft score states for Individual / Better Ball players
  const [playerDraftScores, setPlayerDraftScores] = useState<Record<string, number>>({});
  // Draft score states for Team Scramble
  const [teamDraftScoreA, setTeamDraftScoreA] = useState<number>(currentHoleDef.par);
  const [teamDraftScoreB, setTeamDraftScoreB] = useState<number>(currentHoleDef.par);

  // Fines Mode State & Handlers
  const isFinesMode = tournament?.finesModeEnabled ?? StorageService.getFinesMode();
  const [showFineAssignModal, setShowFineAssignModal] = useState<boolean>(false);
  const [holeSavedForFines, setHoleSavedForFines] = useState<number>(initialHole);
  const [finesList, setFinesList] = useState<PlayerFineRecord[]>(() => {
    return StorageService.getFines().filter(f => f.matchId === match.id || (tournament && f.tournamentId === tournament.id));
  });

  // Assignable players for fine modal
  const assignablePlayers: AssignablePlayer[] = useMemo(() => {
    const list: AssignablePlayer[] = [];
    sideAPlayers.forEach(p => {
      list.push({
        userId: p.userId,
        displayName: formatPlayerInitialAndSurname(p.displayName),
        photoURL: p.photoURL,
        teamId: sideATeam.id,
        teamName: sideATeam.name,
        teamColor: sideATeam.color,
        badgeIcon: sideATeam.badgeIcon,
      });
    });
    sideBPlayers.forEach(p => {
      list.push({
        userId: p.userId,
        displayName: formatPlayerInitialAndSurname(p.displayName),
        photoURL: p.photoURL,
        teamId: sideBTeam.id,
        teamName: sideBTeam.name,
        teamColor: sideBTeam.color,
        badgeIcon: sideBTeam.badgeIcon,
      });
    });
    return list;
  }, [sideAPlayers, sideBPlayers, sideATeam, sideBTeam]);

  const currentHoleFines = useMemo(() => {
    return finesList.filter(f => f.holeNumber === selectedHoleNum);
  }, [finesList, selectedHoleNum]);

  // Initialize draft scores whenever selected hole changes or hole results update
  useEffect(() => {
    const res = match.holeResults?.[selectedHoleNum];
    const holeDef = courseHoles.find(h => h.holeNumber === selectedHoleNum) || courseHoles[0];
    const defaultPar = holeDef.par;

    const initialDrafts: Record<string, number> = {};

    // Initialize all Side A players
    sideAPlayers.forEach(p => {
      if (res?.playerScores?.[p.userId]?.grossScore) {
        initialDrafts[p.userId] = res.playerScores[p.userId].grossScore;
      } else if (res && !isBetterBall) {
        initialDrafts[p.userId] = res.sideAScore;
      } else {
        initialDrafts[p.userId] = defaultPar;
      }
    });

    // Initialize all Side B players
    sideBPlayers.forEach(p => {
      if (res?.playerScores?.[p.userId]?.grossScore) {
        initialDrafts[p.userId] = res.playerScores[p.userId].grossScore;
      } else if (res && !isBetterBall) {
        initialDrafts[p.userId] = res.sideBScore;
      } else {
        initialDrafts[p.userId] = defaultPar;
      }
    });

    setPlayerDraftScores(initialDrafts);

    if (res) {
      setTeamDraftScoreA(res.sideAScore);
      setTeamDraftScoreB(res.sideBScore);
    } else {
      setTeamDraftScoreA(defaultPar);
      setTeamDraftScoreB(defaultPar);
    }
  }, [selectedHoleNum, match.holeResults, sideAPlayers, sideBPlayers, isBetterBall, courseHoles]);

  // Live calculation of hole outcome based on current drafts
  const calculatedHolePreview = useMemo(() => {
    if (isScramble) {
      const netA = teamDraftScoreA - teamScrambleStrokesA;
      const netB = teamDraftScoreB - teamScrambleStrokesB;
      let winner: 'sideA' | 'sideB' | 'halved' = 'halved';
      if (netA < netB) winner = 'sideA';
      else if (netB < netA) winner = 'sideB';

      return {
        sideAGross: teamDraftScoreA,
        sideANet: netA,
        sideAStrokes: teamScrambleStrokesA,
        sideBGross: teamDraftScoreB,
        sideBNet: netB,
        sideBStrokes: teamScrambleStrokesB,
        winner,
        sideABestPlayer: null,
        sideBBestPlayer: null,
        playerScoresRecord: {}
      };
    }

    // Better Ball or Individual format
    const playerScoresRecord: Record<string, { grossScore: number; netScore: number; strokes: number; isBestBall?: boolean }> = {};

    // Side A evaluation
    let minNetA = 999;
    let bestGrossA = currentHoleDef.par;
    let bestPlayerA = sideAPlayers[0] || null;

    sideAPlayers.forEach(p => {
      const gross = playerDraftScores[p.userId] ?? currentHoleDef.par;
      const strokes = calculateStrokeDotsForHole(p.playingHandicap, currentHoleDef.strokeIndex);
      const net = gross - strokes;
      playerScoresRecord[p.userId] = { grossScore: gross, netScore: net, strokes, isBestBall: false };

      if (net < minNetA || (net === minNetA && gross < bestGrossA)) {
        minNetA = net;
        bestGrossA = gross;
        bestPlayerA = p;
      }
    });

    // Side B evaluation
    let minNetB = 999;
    let bestGrossB = currentHoleDef.par;
    let bestPlayerB = sideBPlayers[0] || null;

    sideBPlayers.forEach(p => {
      const gross = playerDraftScores[p.userId] ?? currentHoleDef.par;
      const strokes = calculateStrokeDotsForHole(p.playingHandicap, currentHoleDef.strokeIndex);
      const net = gross - strokes;
      playerScoresRecord[p.userId] = { grossScore: gross, netScore: net, strokes, isBestBall: false };

      if (net < minNetB || (net === minNetB && gross < bestGrossB)) {
        minNetB = net;
        bestGrossB = gross;
        bestPlayerB = p;
      }
    });

    let winner: 'sideA' | 'sideB' | 'halved' = 'halved';
    if (minNetA < minNetB) winner = 'sideA';
    else if (minNetB < minNetA) winner = 'sideB';

    // Conditional Better Ball Attribution:
    // Only credit the player if they actively won or halved the hole for their team
    if (winner === 'sideA' || winner === 'halved') {
      if (bestPlayerA && playerScoresRecord[bestPlayerA.userId]) {
        playerScoresRecord[bestPlayerA.userId].isBestBall = true;
      }
    }

    if (winner === 'sideB' || winner === 'halved') {
      if (bestPlayerB && playerScoresRecord[bestPlayerB.userId]) {
        playerScoresRecord[bestPlayerB.userId].isBestBall = true;
      }
    }

    const strokesA = bestPlayerA ? calculateStrokeDotsForHole(bestPlayerA.playingHandicap, currentHoleDef.strokeIndex) : 0;
    const strokesB = bestPlayerB ? calculateStrokeDotsForHole(bestPlayerB.playingHandicap, currentHoleDef.strokeIndex) : 0;

    return {
      sideAGross: bestGrossA,
      sideANet: minNetA,
      sideAStrokes: strokesA,
      sideBGross: bestGrossB,
      sideBNet: minNetB,
      sideBStrokes: strokesB,
      winner,
      sideABestPlayer: bestPlayerA,
      sideBBestPlayer: bestPlayerB,
      playerScoresRecord
    };
  }, [
    isScramble, 
    teamDraftScoreA, 
    teamDraftScoreB, 
    teamScrambleStrokesA, 
    teamScrambleStrokesB, 
    playerDraftScores, 
    sideAPlayers, 
    sideBPlayers, 
    currentHoleDef
  ]);

  // Handle saving hole score
  const handleSaveHoleScore = (overrideDrafts?: {
    playerDrafts?: Record<string, number>;
    scrambleA?: number;
    scrambleB?: number;
  }) => {
    let sideAGross = calculatedHolePreview.sideAGross;
    let sideBGross = calculatedHolePreview.sideBGross;
    let strokesA = calculatedHolePreview.sideAStrokes;
    let strokesB = calculatedHolePreview.sideBStrokes;
    let playerScores = calculatedHolePreview.playerScoresRecord;
    let bestPlayerAId = calculatedHolePreview.sideABestPlayer?.userId;
    let bestPlayerBId = calculatedHolePreview.sideBBestPlayer?.userId;

    if (overrideDrafts?.scrambleA !== undefined && overrideDrafts?.scrambleB !== undefined) {
      sideAGross = overrideDrafts.scrambleA;
      sideBGross = overrideDrafts.scrambleB;
      strokesA = teamScrambleStrokesA;
      strokesB = teamScrambleStrokesB;
      playerScores = {};
    } else if (overrideDrafts?.playerDrafts) {
      // Re-evaluate with explicit drafts
      const pRecord: Record<string, { grossScore: number; netScore: number; strokes: number; isBestBall?: boolean }> = {};
      let minA = 999;
      let bGrossA = currentHoleDef.par;
      let bA = sideAPlayers[0];
      sideAPlayers.forEach(p => {
        const g = overrideDrafts.playerDrafts![p.userId] ?? currentHoleDef.par;
        const st = calculateStrokeDotsForHole(p.playingHandicap, currentHoleDef.strokeIndex);
        const nt = g - st;
        pRecord[p.userId] = { grossScore: g, netScore: nt, strokes: st, isBestBall: false };
        if (nt < minA) { minA = nt; bGrossA = g; bA = p; }
      });

      let minB = 999;
      let bGrossB = currentHoleDef.par;
      let bB = sideBPlayers[0];
      sideBPlayers.forEach(p => {
        const g = overrideDrafts.playerDrafts![p.userId] ?? currentHoleDef.par;
        const st = calculateStrokeDotsForHole(p.playingHandicap, currentHoleDef.strokeIndex);
        const nt = g - st;
        pRecord[p.userId] = { grossScore: g, netScore: nt, strokes: st, isBestBall: false };
        if (nt < minB) { minB = nt; bGrossB = g; bB = p; }
      });

      let holeWinner: 'sideA' | 'sideB' | 'halved' = 'halved';
      if (minA < minB) holeWinner = 'sideA';
      else if (minB < minA) holeWinner = 'sideB';

      // Team counting score indicator attribution:
      if (bA && pRecord[bA.userId]) pRecord[bA.userId].isBestBall = true;
      if (bB && pRecord[bB.userId]) pRecord[bB.userId].isBestBall = true;

      sideAGross = bGrossA;
      sideBGross = bGrossB;
      strokesA = bA ? calculateStrokeDotsForHole(bA.playingHandicap, currentHoleDef.strokeIndex) : 0;
      strokesB = bB ? calculateStrokeDotsForHole(bB.playingHandicap, currentHoleDef.strokeIndex) : 0;
      playerScores = pRecord;
      bestPlayerAId = bA?.userId;
      bestPlayerBId = bB?.userId;
    }

    const holeOutcome: TournamentHoleResult = computeHoleOutcome(
      selectedHoleNum,
      currentHoleDef.par,
      currentHoleDef.strokeIndex,
      sideAGross,
      sideBGross,
      strokesA,
      strokesB,
      match.leadSide,
      match.leadMargin,
      playerScores,
      bestPlayerAId,
      bestPlayerBId
    );

    const updatedHoleResults = {
      ...match.holeResults,
      [selectedHoleNum]: holeOutcome,
    };

    const evaluatedMatch = evaluateTournamentMatchStatus({
      ...match,
      holeResults: updatedHoleResults,
    });

    onUpdateMatch(evaluatedMatch);

    const isByeHole = Boolean(evaluatedMatch.isDecided && selectedHoleNum > (evaluatedMatch.decidedAtHole || 18));
    setFeedbackMsg(`Hole ${selectedHoleNum} saved! ${
      holeOutcome.winnerSide === 'sideA' 
        ? `${sideATeam.name} won hole` 
        : (holeOutcome.winnerSide === 'sideB' 
          ? `${sideBTeam.name} won hole` 
          : 'Hole Halved')
    }${isByeHole ? ' • Match result locked' : ''}`);

    setTimeout(() => setFeedbackMsg(null), 2500);

    // If match was just officially decided on this hole, trigger confetti celebration
    const wasJustDecided = evaluatedMatch.status === 'completed' && (
      match.status !== 'completed' || 
      (!match.isDecided && evaluatedMatch.decidedAtHole === selectedHoleNum)
    );
    if (wasJustDecided) {
      try {
        confetti({
          particleCount: 50,
          spread: 65,
          origin: { y: 0.6 }
        });
      } catch {
        // ignore
      }
    }

    // Advance to next hole automatically for uninterrupted score entry (holes 1-17)
    if (selectedHoleNum < 18) {
      setSelectedHoleNum(prev => Math.min(18, prev + 1));
    }
  };

  // Handlers for Dedicated Fines Modal
  const handleSaveFinesFromModal = (newFines: PlayerFineRecord[]) => {
    if (newFines.length > 0) {
      // Ensure each fine is strictly isolated and stamped to this specific hole
      const isolatedHoleFines: PlayerFineRecord[] = newFines.map(f => ({
        ...f,
        id: f.id || `fine_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        holeNumber: holeSavedForFines,
        matchId: match.id,
        tournamentId: tournament?.id || f.tournamentId,
        roundNumber: round?.roundNumber || f.roundNumber || 1,
      }));

      isolatedHoleFines.forEach(f => {
        StorageService.saveFine(f);
      });

      // Also sync to match record to guarantee hole-specific fine isolation in match data
      const existingMatchFines = (match.fines || []).filter(f => f.holeNumber !== holeSavedForFines);
      const updatedMatchFines = [...existingMatchFines, ...isolatedHoleFines];
      onUpdateMatch({
        ...match,
        fines: updatedMatchFines,
      });

      // Refresh fines list from storage to guarantee unique records
      const allUpdatedFines = StorageService.getFines();
      setFinesList(allUpdatedFines.filter(f => f.matchId === match.id || (tournament && f.tournamentId === tournament.id)));

      setFeedbackMsg(`Logged ${isolatedHoleFines.length} fine(s) on Hole #${holeSavedForFines}!`);
      setTimeout(() => setFeedbackMsg(null), 2500);
    }

    setShowFineAssignModal(false);
  };

  // Quick Halve Hole with Pars for everyone
  const handleQuickHalveHole = () => {
    const par = currentHoleDef.par;
    if (isScramble) {
      setTeamDraftScoreA(par);
      setTeamDraftScoreB(par);
      handleSaveHoleScore({ scrambleA: par, scrambleB: par });
    } else {
      const parDrafts: Record<string, number> = {};
      sideAPlayers.forEach(p => { parDrafts[p.userId] = par; });
      sideBPlayers.forEach(p => { parDrafts[p.userId] = par; });
      setPlayerDraftScores(parDrafts);
      handleSaveHoleScore({ playerDrafts: parDrafts });
    }
  };

  // Clear Hole Score
  const handleClearHoleScore = () => {
    if (!match.holeResults?.[selectedHoleNum]) return;
    const updatedHoleResults = { ...match.holeResults };
    delete updatedHoleResults[selectedHoleNum];

    const evaluatedMatch = evaluateTournamentMatchStatus({
      ...match,
      holeResults: updatedHoleResults,
    });

    onUpdateMatch(evaluatedMatch);
    setFeedbackMsg(`Hole ${selectedHoleNum} score reset.`);
    setTimeout(() => setFeedbackMsg(null), 2000);
  };

  // Personal player summaries
  const playerSummaries: PlayerScoreSummary[] = useMemo(() => {
    return calculateMatchPlayerSummaries(match, round, courseHoles, allUsers);
  }, [match, round, courseHoles, allUsers]);

  // Count holes won by each team
  let sideAHolesWon = 0;
  let sideBHolesWon = 0;
  let halvedHolesCount = 0;
  (Object.values(match.holeResults || {}) as TournamentHoleResult[]).forEach(hr => {
    if (hr.winnerSide === 'sideA') sideAHolesWon++;
    else if (hr.winnerSide === 'sideB') sideBHolesWon++;
    else halvedHolesCount++;
  });

  return (
    <div 
      id="tournament-scorecard-modal"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
    >
      <div className="bg-[#0D1117] border border-white/[0.12] rounded-3xl w-full max-w-3xl overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.9)] animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[94vh] text-slate-100">
        
        {/* TOP RETURN NAVIGATION HEADER */}
        <div className="bg-[#07090C] text-white px-4 py-2.5 flex items-center justify-between border-b border-white/[0.08]">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition text-xs font-black cursor-pointer group py-1 px-2 rounded-lg hover:bg-white/[0.05]"
          >
            <ChevronLeft className="w-4 h-4 transition group-hover:-translate-x-0.5" />
            <span>← Back to Tournament Hub</span>
            <span className="hidden sm:inline text-slate-500 font-normal text-2xs">• Live Standings & All Matches</span>
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white transition cursor-pointer text-2xs font-bold flex items-center gap-1 border border-white/[0.08]"
            title="Return to Tournament Hub"
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Close</span>
          </button>
        </div>

        {/* TOP BANNER & MATCH STATUS */}
        <div className="bg-gradient-to-r from-[#131923] via-[#1A2330] to-[#131923] text-white p-4 sm:p-5 border-b border-white/[0.08]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                  Day {round.dayNumber} • Flight #{match.matchNumber}
                </span>
                <span className="text-[11px] text-slate-300 font-medium">
                  {formatStr.replace(/_/g, ' ').toUpperCase()}
                </span>
                {isSingles && (
                  <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded flex items-center gap-1">
                    <User className="w-3 h-3 text-emerald-400" />
                    1v1 Singles
                  </span>
                )}
                {isBetterBall && (
                  <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded flex items-center gap-1">
                    <Users className="w-3 h-3 text-amber-400" />
                    2v2 Fourball Best Net
                  </span>
                )}
                {isScramble && (
                  <span className="text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40 px-2 py-0.5 rounded flex items-center gap-1">
                    <Flag className="w-3 h-3 text-sky-400" />
                    2v2 Scramble Unified Score
                  </span>
                )}
              </div>

              <h2 className="text-base sm:text-lg font-black text-white mt-1">
                {round.courseName}
              </h2>
              
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                {round.courseLocation} • Par {round.coursePar} • 1.0 Point Event
              </p>
            </div>

            <div className="text-right">
              <button
                onClick={onClose}
                className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-black transition cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.3)] flex items-center gap-1"
                title="Return to Main Tournament Hub"
              >
                <span>Tournament Standings</span>
              </button>
            </div>
          </div>

          {/* Match Score & Status Pill + View Tabs */}
          <div className="mt-3.5 pt-3 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-black tracking-wide flex items-center gap-1.5 ${
                match.status === 'completed'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'bg-emerald-500 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
              }`}>
                {match.status === 'completed' && <Lock className="w-3 h-3 text-slate-950 shrink-0" />}
                {match.currentStatusText || 'Scheduled'}
              </span>
              {match.status === 'completed' && match.isDecided && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Result Locked
                </span>
              )}
              {match.status === 'live' && (
                <span className="text-[11px] text-emerald-300 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Live Scoring
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('interactive')}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  activeTab === 'interactive'
                    ? 'bg-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                    : 'bg-[#131923] text-slate-400 hover:text-white border border-white/[0.08]'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" /> Hole Entry
              </button>
              
              <button
                type="button"
                onClick={() => setActiveTab('players')}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  activeTab === 'players'
                    ? 'bg-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                    : 'bg-[#131923] text-slate-400 hover:text-white border border-white/[0.08]'
                }`}
              >
                <Users className="w-3.5 h-3.5" /> Player Summary
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('scorecard')}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  activeTab === 'scorecard'
                    ? 'bg-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                    : 'bg-[#131923] text-slate-400 hover:text-white border border-white/[0.08]'
                }`}
              >
                <Table className="w-3.5 h-3.5" /> Full Card
              </button>
            </div>
          </div>
        </div>

        {/* TEAM DUEL SUMMARY BAR */}
        <div className="p-3 sm:p-4 bg-[#0F141D] border-b border-white/[0.08]">
          <div className="grid grid-cols-2 gap-3 items-center">
            {/* Side A */}
            <div 
              className="p-2.5 rounded-2xl bg-[#131923] border shadow-2xs space-y-1 transition"
              style={{
                borderColor: hexToRgba(teamColorA, 0.4),
                boxShadow: `0 2px 10px ${hexToRgba(teamColorA, 0.12)}`,
              }}
            >
              <div className="flex items-center justify-between">
                <span 
                  className="text-[10px] font-black uppercase flex items-center gap-1 truncate"
                  style={{ color: teamColorA }}
                >
                  <span>{sideATeam.badgeIcon}</span> {sideATeam.name}
                </span>
                <span 
                  className="text-xs font-black px-2 py-0.5 rounded-full shrink-0 font-mono tabular-nums"
                  style={{ 
                    backgroundColor: hexToRgba(teamColorA, 0.2), 
                    color: teamColorA 
                  }}
                >
                  {sideAHolesWon} Holes Won
                </span>
              </div>
              <div className="text-xs font-black text-white truncate">
                {isSingles && sideAPlayers[0]
                  ? formatPlayerInitialAndSurname(sideAPlayers[0].displayName)
                  : sideAPlayers.map(p => formatPlayerInitialAndSurname(p.displayName)).join(' & ')}
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                {isSingles && sideAPlayers[0] ? (
                  <span>Playing HCP: <strong className="text-white">{sideAPlayers[0].playingHandicap}</strong></span>
                ) : (
                  <span>HCPs: {sideAPlayers.map(p => `${formatPlayerInitialAndSurname(p.displayName)} (${p.playingHandicap})`).join(', ')}</span>
                )}
              </div>
            </div>

            {/* Side B */}
            <div 
              className="p-2.5 rounded-2xl bg-[#131923] border shadow-2xs space-y-1 text-right transition"
              style={{
                borderColor: hexToRgba(teamColorB, 0.4),
                boxShadow: `0 2px 10px ${hexToRgba(teamColorB, 0.12)}`,
              }}
            >
              <div className="flex items-center justify-between flex-row-reverse">
                <span 
                  className="text-[10px] font-black uppercase flex items-center gap-1 flex-row-reverse truncate"
                  style={{ color: teamColorB }}
                >
                  <span>{sideBTeam.badgeIcon}</span> {sideBTeam.name}
                </span>
                <span 
                  className="text-xs font-black px-2 py-0.5 rounded-full shrink-0 font-mono tabular-nums"
                  style={{ 
                    backgroundColor: hexToRgba(teamColorB, 0.2), 
                    color: teamColorB 
                  }}
                >
                  {sideBHolesWon} Holes Won
                </span>
              </div>
              <div className="text-xs font-black text-white truncate">
                {isSingles && sideBPlayers[0]
                  ? formatPlayerInitialAndSurname(sideBPlayers[0].displayName)
                  : sideBPlayers.map(p => formatPlayerInitialAndSurname(p.displayName)).join(' & ')}
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1 justify-end">
                {isSingles && sideBPlayers[0] ? (
                  <span>Playing HCP: <strong className="text-white">{sideBPlayers[0].playingHandicap}</strong></span>
                ) : (
                  <span>HCPs: {sideBPlayers.map(p => `${formatPlayerInitialAndSurname(p.displayName)} (${p.playingHandicap})`).join(', ')}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* FEEDBACK TOAST */}
        {feedbackMsg && (
          <div className="mx-4 mt-3 p-2.5 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-150 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* CONTENT VIEWPORT */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 bg-[#0D1117]">
          
          {/* 18-HOLE NAVIGATOR CAROUSEL */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span>Hole Navigation (1 to 18)</span>
              <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                {completedHolesCount}/18 Holes Recorded
              </span>
            </div>

            <div className="grid grid-cols-9 sm:grid-cols-18 gap-1">
              {courseHoles.map(h => {
                const res = match.holeResults?.[h.holeNumber];
                const isSelected = selectedHoleNum === h.holeNumber;
                
                let buttonStyle: React.CSSProperties = {};
                let buttonClass = 'h-8.5 rounded-lg border text-xs flex flex-col items-center justify-center transition cursor-pointer font-bold';

                if (res) {
                  if (res.winnerSide === 'sideA') {
                    buttonStyle = {
                      backgroundColor: teamColorA,
                      borderColor: teamColorA,
                      color: '#ffffff',
                    };
                    buttonClass += ' font-black shadow-xs';
                  } else if (res.winnerSide === 'sideB') {
                    buttonStyle = {
                      backgroundColor: teamColorB,
                      borderColor: teamColorB,
                      color: '#ffffff',
                    };
                    buttonClass += ' font-black shadow-xs';
                  } else {
                    // Halved hole: Neutral slate dark
                    buttonStyle = {
                      backgroundColor: '#1E293B',
                      borderColor: 'rgba(255, 255, 255, 0.15)',
                      color: '#e2e8f0',
                    };
                    buttonClass += ' font-bold';
                  }
                } else {
                  buttonStyle = {
                    backgroundColor: '#131923',
                    borderColor: 'rgba(255, 255, 255, 0.08)',
                    color: '#64748b',
                  };
                }

                if (isSelected) {
                  buttonClass += ' ring-2 ring-emerald-400 ring-offset-1 ring-offset-[#0D1117] scale-105 z-10';
                }

                return (
                  <button
                    key={h.holeNumber}
                    type="button"
                    onClick={() => setSelectedHoleNum(h.holeNumber)}
                    style={buttonStyle}
                    className={buttonClass}
                    title={`Hole ${h.holeNumber} • Par ${h.par} • SI ${h.strokeIndex}${
                      res 
                        ? (res.winnerSide === 'sideA' 
                            ? ` • Won by ${sideATeam.name}` 
                            : (res.winnerSide === 'sideB' ? ` • Won by ${sideBTeam.name}` : ' • Halved'))
                        : ''
                    }`}
                  >
                    <span className="text-[11px] leading-none">{h.holeNumber}</span>
                    <span className="text-[8px] opacity-90 leading-none mt-0.5">
                      {res 
                        ? (res.winnerSide === 'sideA' ? (sideATeam.shortCode || 'A') : (res.winnerSide === 'sideB' ? (sideBTeam.shortCode || 'B') : 'H')) 
                        : `P${h.par}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* TAB 1: INTERACTIVE HOLE SCORING ENGINE */}
          {activeTab === 'interactive' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Bye Hole / Locked Match Banner */}
              {match.isDecided && selectedHoleNum > (match.decidedAtHole || 18) && (
                <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between gap-2.5 text-amber-200 text-xs">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <span className="font-bold text-white block">Official Match Decided ({match.currentStatusText?.replace(/^FINAL:\s*/i, '')})</span>
                      <span className="text-[11px] text-amber-300/90 block">
                        Hole #{selectedHoleNum} is a bye hole. Scores, strokes, and fines logged here record uninterrupted for player statistics and leaderboard totals without altering the finalized match outcome.
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded-lg bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider shrink-0 shadow-2xs">
                    Locked Result
                  </span>
                </div>
              )}

              {/* Active Hole Card */}
              <div className="p-4 rounded-3xl bg-slate-900 text-white space-y-4 shadow-md border border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 font-black flex items-center justify-center border border-emerald-500/30 text-base">
                      #{currentHoleDef.holeNumber}
                    </span>
                    <div>
                      <h4 className="text-sm sm:text-base font-black text-white">
                        Hole {currentHoleDef.holeNumber} • Par {currentHoleDef.par}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Stroke Index: <strong>SI {currentHoleDef.strokeIndex}</strong> • {currentHoleDef.distances?.whiteMeters || 350}m
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isFinesMode && (
                      <button
                        type="button"
                        onClick={() => {
                          setHoleSavedForFines(selectedHoleNum);
                          setShowFineAssignModal(true);
                        }}
                        className="py-1 px-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-black flex items-center gap-1.5 transition cursor-pointer"
                        title="Log Fines on this Hole"
                      >
                        <Beer className="w-3.5 h-3.5 text-amber-400" />
                        <span>🍺 Fines</span>
                        {currentHoleFines.length > 0 && (
                          <span className="bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded-full text-[10px] font-black">
                            {currentHoleFines.length}
                          </span>
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={selectedHoleNum <= 1}
                      onClick={() => setSelectedHoleNum(prev => Math.max(1, prev - 1))}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={selectedHoleNum >= 18}
                      onClick={() => setSelectedHoleNum(prev => Math.min(18, prev + 1))}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* SCENARIO A: BETTER BALL / FOURBALL FORMAT (Individual Inputs per player with Best Ball Detection) */}
                {isBetterBall && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Side A Team Section */}
                      <div 
                        className="p-3 rounded-2xl bg-slate-950/90 border space-y-2.5"
                        style={{ borderColor: hexToRgba(teamColorA, 0.4) }}
                      >
                        <div 
                          className="flex items-center justify-between pb-1 border-b"
                          style={{ borderColor: hexToRgba(teamColorA, 0.2) }}
                        >
                          <span className="text-xs font-black flex items-center gap-1" style={{ color: teamColorA }}>
                            <span>{sideATeam.badgeIcon}</span> {sideATeam.name}
                          </span>
                          <span 
                            className="text-[10px] px-2 py-0.5 rounded font-bold"
                            style={{ backgroundColor: hexToRgba(teamColorA, 0.2), color: teamColorA }}
                          >
                            Lowest Net Counts
                          </span>
                        </div>

                        {sideAPlayers.map(player => {
                          const gross = playerDraftScores[player.userId] ?? currentHoleDef.par;
                          const strokes = calculateStrokeDotsForHole(player.playingHandicap, currentHoleDef.strokeIndex);
                          const net = gross - strokes;
                          const isCountingForTeam = calculatedHolePreview.sideABestPlayer?.userId === player.userId;

                          return (
                            <div 
                              key={player.userId}
                              className="p-2.5 rounded-xl border transition"
                              style={{
                                backgroundColor: isCountingForTeam ? hexToRgba(teamColorA, 0.15) : 'rgba(15, 23, 42, 0.6)',
                                borderColor: isCountingForTeam ? teamColorA : '#1e293b',
                              }}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-white">{formatPlayerInitialAndSurname(player.displayName)}</span>
                                  {isCountingForTeam && (
                                    <span 
                                      className="text-[9px] font-black text-white px-2 py-0.5 rounded-full uppercase flex items-center gap-0.5 shadow-xs"
                                      style={{ backgroundColor: teamColorA }}
                                    >
                                      <Star className="w-2.5 h-2.5 fill-white" /> Counting Score
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <span>HCP {player.playingHandicap}</span>
                                  {strokes > 0 && (
                                    <span 
                                      className="font-bold px-1 rounded"
                                      style={{ backgroundColor: hexToRgba(teamColorA, 0.2), color: teamColorA }}
                                    >
                                      {getStrokeDotsSymbol(strokes)} +{strokes} Dot
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setPlayerDraftScores(prev => ({
                                      ...prev,
                                      [player.userId]: Math.max(1, gross - 1)
                                    }))}
                                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center transition cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <div className="text-center min-w-8">
                                    <span className="text-lg font-black text-white">{gross}</span>
                                    <span className="text-[10px] block font-bold" style={{ color: teamColorA }}>
                                      Net: {net}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setPlayerDraftScores(prev => ({
                                      ...prev,
                                      [player.userId]: Math.min(12, gross + 1)
                                    }))}
                                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center transition cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>

                                <div className="flex items-center gap-1">
                                  {[currentHoleDef.par - 1, currentHoleDef.par, currentHoleDef.par + 1].map(sc => (
                                    <button
                                      key={sc}
                                      type="button"
                                      onClick={() => setPlayerDraftScores(prev => ({
                                        ...prev,
                                        [player.userId]: sc
                                      }))}
                                      style={gross === sc ? { backgroundColor: teamColorA, color: '#ffffff' } : {}}
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                                        gross === sc
                                          ? 'font-black'
                                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                      }`}
                                    >
                                      {sc === currentHoleDef.par - 1 ? 'Birdie' : (sc === currentHoleDef.par ? 'Par' : 'Bogey')}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Side B Team Section */}
                      <div 
                        className="p-3 rounded-2xl bg-slate-950/90 border space-y-2.5"
                        style={{ borderColor: hexToRgba(teamColorB, 0.4) }}
                      >
                        <div 
                          className="flex items-center justify-between pb-1 border-b"
                          style={{ borderColor: hexToRgba(teamColorB, 0.2) }}
                        >
                          <span className="text-xs font-black flex items-center gap-1" style={{ color: teamColorB }}>
                            <span>{sideBTeam.badgeIcon}</span> {sideBTeam.name}
                          </span>
                          <span 
                            className="text-[10px] px-2 py-0.5 rounded font-bold"
                            style={{ backgroundColor: hexToRgba(teamColorB, 0.2), color: teamColorB }}
                          >
                            Lowest Net Counts
                          </span>
                        </div>

                        {sideBPlayers.map(player => {
                          const gross = playerDraftScores[player.userId] ?? currentHoleDef.par;
                          const strokes = calculateStrokeDotsForHole(player.playingHandicap, currentHoleDef.strokeIndex);
                          const net = gross - strokes;
                          const isCountingForTeam = calculatedHolePreview.sideBBestPlayer?.userId === player.userId;

                          return (
                            <div 
                              key={player.userId}
                              className="p-2.5 rounded-xl border transition"
                              style={{
                                backgroundColor: isCountingForTeam ? hexToRgba(teamColorB, 0.15) : 'rgba(15, 23, 42, 0.6)',
                                borderColor: isCountingForTeam ? teamColorB : '#1e293b',
                              }}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-white">{formatPlayerInitialAndSurname(player.displayName)}</span>
                                  {isCountingForTeam && (
                                    <span 
                                      className="text-[9px] font-black text-white px-2 py-0.5 rounded-full uppercase flex items-center gap-0.5 shadow-xs"
                                      style={{ backgroundColor: teamColorB }}
                                    >
                                      <Star className="w-2.5 h-2.5 fill-white" /> Counting Score
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <span>HCP {player.playingHandicap}</span>
                                  {strokes > 0 && (
                                    <span 
                                      className="font-bold px-1 rounded"
                                      style={{ backgroundColor: hexToRgba(teamColorB, 0.2), color: teamColorB }}
                                    >
                                      {getStrokeDotsSymbol(strokes)} +{strokes} Dot
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setPlayerDraftScores(prev => ({
                                      ...prev,
                                      [player.userId]: Math.max(1, gross - 1)
                                    }))}
                                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center transition cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <div className="text-center min-w-8">
                                    <span className="text-lg font-black text-white">{gross}</span>
                                    <span className="text-[10px] block font-bold" style={{ color: teamColorB }}>
                                      Net: {net}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setPlayerDraftScores(prev => ({
                                      ...prev,
                                      [player.userId]: Math.min(12, gross + 1)
                                    }))}
                                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center transition cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>

                                <div className="flex items-center gap-1">
                                  {[currentHoleDef.par - 1, currentHoleDef.par, currentHoleDef.par + 1].map(sc => (
                                    <button
                                      key={sc}
                                      type="button"
                                      onClick={() => setPlayerDraftScores(prev => ({
                                        ...prev,
                                        [player.userId]: sc
                                      }))}
                                      style={gross === sc ? { backgroundColor: teamColorB, color: '#ffffff' } : {}}
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                                        gross === sc
                                          ? 'font-black'
                                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                      }`}
                                    >
                                      {sc === currentHoleDef.par - 1 ? 'Birdie' : (sc === currentHoleDef.par ? 'Par' : 'Bogey')}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* SCENARIO B: INDIVIDUAL MATCHPLAY 1v1 */}
                {isSingles && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Side A Player */}
                    {sideAPlayers.slice(0, 1).map(player => {
                      const gross = playerDraftScores[player.userId] ?? currentHoleDef.par;
                      const strokes = calculateStrokeDotsForHole(player.playingHandicap, currentHoleDef.strokeIndex);
                      const net = gross - strokes;

                      return (
                        <div 
                          key={player.userId} 
                          className="p-3.5 rounded-2xl bg-slate-950/80 border space-y-2 transition"
                          style={{
                            borderColor: hexToRgba(teamColorA, 0.45),
                            boxShadow: `0 2px 12px ${hexToRgba(teamColorA, 0.1)}`,
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold flex items-center gap-1" style={{ color: teamColorA }}>
                              {sideATeam.badgeIcon} {formatPlayerInitialAndSurname(player.displayName)}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-400 font-mono">
                                HCP {player.playingHandicap}
                              </span>
                              {strokes > 0 && (
                                <span 
                                  className="text-[10px] font-bold px-1.5 py-0.2 rounded border"
                                  style={{
                                    backgroundColor: hexToRgba(teamColorA, 0.2),
                                    color: teamColorA,
                                    borderColor: hexToRgba(teamColorA, 0.4),
                                  }}
                                >
                                  {getStrokeDotsSymbol(strokes)} +{strokes} Dot
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setPlayerDraftScores(prev => ({ ...prev, [player.userId]: Math.max(1, gross - 1) }))}
                                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center transition cursor-pointer"
                              >
                                -
                              </button>
                              <div className="text-center min-w-10">
                                <span className="text-xl font-black text-white">{gross}</span>
                                <span className="text-[10px] block font-bold" style={{ color: teamColorA }}>
                                  Net: {net}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setPlayerDraftScores(prev => ({ ...prev, [player.userId]: Math.min(12, gross + 1) }))}
                                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center transition cursor-pointer"
                              >
                                +
                              </button>
                            </div>

                            <div className="flex items-center gap-1">
                              {[currentHoleDef.par - 1, currentHoleDef.par, currentHoleDef.par + 1].map(sc => (
                                <button
                                  key={sc}
                                  type="button"
                                  onClick={() => setPlayerDraftScores(prev => ({ ...prev, [player.userId]: sc }))}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                                    gross === sc ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
                                  }`}
                                >
                                  {sc === currentHoleDef.par - 1 ? 'Birdie' : (sc === currentHoleDef.par ? 'Par' : 'Bogey')}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Side B Player */}
                    {sideBPlayers.slice(0, 1).map(player => {
                      const gross = playerDraftScores[player.userId] ?? currentHoleDef.par;
                      const strokes = calculateStrokeDotsForHole(player.playingHandicap, currentHoleDef.strokeIndex);
                      const net = gross - strokes;

                      return (
                        <div 
                          key={player.userId} 
                          className="p-3.5 rounded-2xl bg-slate-950/80 border space-y-2 transition"
                          style={{
                            borderColor: hexToRgba(teamColorB, 0.45),
                            boxShadow: `0 2px 12px ${hexToRgba(teamColorB, 0.1)}`,
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold flex items-center gap-1" style={{ color: teamColorB }}>
                              {sideBTeam.badgeIcon} {formatPlayerInitialAndSurname(player.displayName)}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-400 font-mono">
                                HCP {player.playingHandicap}
                              </span>
                              {strokes > 0 && (
                                <span 
                                  className="text-[10px] font-bold px-1.5 py-0.2 rounded border"
                                  style={{
                                    backgroundColor: hexToRgba(teamColorB, 0.2),
                                    color: teamColorB,
                                    borderColor: hexToRgba(teamColorB, 0.4),
                                  }}
                                >
                                  {getStrokeDotsSymbol(strokes)} +{strokes} Dot
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setPlayerDraftScores(prev => ({ ...prev, [player.userId]: Math.max(1, gross - 1) }))}
                                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center transition cursor-pointer"
                              >
                                -
                              </button>
                              <div className="text-center min-w-10">
                                <span className="text-xl font-black text-white">{gross}</span>
                                <span className="text-[10px] block font-bold" style={{ color: teamColorB }}>
                                  Net: {net}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setPlayerDraftScores(prev => ({ ...prev, [player.userId]: Math.min(12, gross + 1) }))}
                                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center transition cursor-pointer"
                              >
                                +
                              </button>
                            </div>

                            <div className="flex items-center gap-1">
                              {[currentHoleDef.par - 1, currentHoleDef.par, currentHoleDef.par + 1].map(sc => (
                                <button
                                  key={sc}
                                  type="button"
                                  onClick={() => setPlayerDraftScores(prev => ({ ...prev, [player.userId]: sc }))}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                                    gross === sc ? 'bg-sky-400 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
                                  }`}
                                >
                                  {sc === currentHoleDef.par - 1 ? 'Birdie' : (sc === currentHoleDef.par ? 'Par' : 'Bogey')}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* SCENARIO C: TEAM SCRAMBLE (Single Unified Team Score per hole) */}
                {isScramble && (
                  <div className="space-y-3">
                    <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs text-slate-300">
                      <span>🎯 <strong>Team Scramble Mode:</strong> Single unified team score per hole</span>
                      <span className="text-[11px] text-slate-400">Team HCPs: {teamScrambleHcpA} vs {teamScrambleHcpB}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Side A Team Unified Score */}
                      <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-emerald-900/60 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                            {sideATeam.badgeIcon} {sideATeam.name} Team Ball
                          </span>
                          {teamScrambleStrokesA > 0 && (
                            <span className="text-[10px] font-bold bg-emerald-900/80 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-700">
                              {getStrokeDotsSymbol(teamScrambleStrokesA)} +{teamScrambleStrokesA} Dot
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setTeamDraftScoreA(prev => Math.max(1, prev - 1))}
                              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center transition cursor-pointer"
                            >
                              -
                            </button>
                            <div className="text-center min-w-10">
                              <span className="text-xl font-black text-white">{teamDraftScoreA}</span>
                              <span className="text-[10px] text-emerald-400 block font-bold">
                                Net: {teamDraftScoreA - teamScrambleStrokesA}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setTeamDraftScoreA(prev => Math.min(12, prev + 1))}
                              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center transition cursor-pointer"
                            >
                              +
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            {[currentHoleDef.par - 1, currentHoleDef.par, currentHoleDef.par + 1].map(sc => (
                              <button
                                key={sc}
                                type="button"
                                onClick={() => setTeamDraftScoreA(sc)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                                  teamDraftScoreA === sc ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
                                }`}
                              >
                                {sc === currentHoleDef.par - 1 ? 'Birdie' : (sc === currentHoleDef.par ? 'Par' : 'Bogey')}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Side B Team Unified Score */}
                      <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-sky-900/60 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-sky-400 flex items-center gap-1">
                            {sideBTeam.badgeIcon} {sideBTeam.name} Team Ball
                          </span>
                          {teamScrambleStrokesB > 0 && (
                            <span className="text-[10px] font-bold bg-sky-900/80 text-sky-300 px-1.5 py-0.2 rounded border border-sky-700">
                              {getStrokeDotsSymbol(teamScrambleStrokesB)} +{teamScrambleStrokesB} Dot
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setTeamDraftScoreB(prev => Math.max(1, prev - 1))}
                              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center transition cursor-pointer"
                            >
                              -
                            </button>
                            <div className="text-center min-w-10">
                              <span className="text-xl font-black text-white">{teamDraftScoreB}</span>
                              <span className="text-[10px] text-sky-400 block font-bold">
                                Net: {teamDraftScoreB - teamScrambleStrokesB}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setTeamDraftScoreB(prev => Math.min(12, prev + 1))}
                              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center transition cursor-pointer"
                            >
                              +
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            {[currentHoleDef.par - 1, currentHoleDef.par, currentHoleDef.par + 1].map(sc => (
                              <button
                                key={sc}
                                type="button"
                                onClick={() => setTeamDraftScoreB(sc)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                                  teamDraftScoreB === sc ? 'bg-sky-400 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
                                }`}
                              >
                                {sc === currentHoleDef.par - 1 ? 'Birdie' : (sc === currentHoleDef.par ? 'Par' : 'Bogey')}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Instant Result Preview Bar */}
                <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="text-slate-300">
                    Net Comparison: <strong>{calculatedHolePreview.sideANet}</strong> vs <strong>{calculatedHolePreview.sideBNet}</strong>
                    {isBetterBall && calculatedHolePreview.sideABestPlayer && calculatedHolePreview.sideBBestPlayer && (
                      <span className="text-slate-400 text-[11px] ml-1.5">
                        ({formatPlayerInitialAndSurname(calculatedHolePreview.sideABestPlayer.displayName)} vs {formatPlayerInitialAndSurname(calculatedHolePreview.sideBBestPlayer.displayName)})
                      </span>
                    )}
                    {isSingles && sideAPlayers[0] && sideBPlayers[0] && (
                      <span className="text-slate-400 text-[11px] ml-1.5">
                        ({formatPlayerInitialAndSurname(sideAPlayers[0].displayName)} vs {formatPlayerInitialAndSurname(sideBPlayers[0].displayName)})
                      </span>
                    )}
                    <span className="ml-2 font-bold text-emerald-400">
                      {calculatedHolePreview.winner === 'sideA'
                        ? `→ ${isSingles && sideAPlayers[0] ? formatPlayerInitialAndSurname(sideAPlayers[0].displayName) : sideATeam.name} Wins Hole`
                        : (calculatedHolePreview.winner === 'sideB'
                          ? `→ ${isSingles && sideBPlayers[0] ? formatPlayerInitialAndSurname(sideBPlayers[0].displayName) : sideBTeam.name} Wins Hole`
                          : '→ Halved')}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSaveHoleScore()}
                    className="py-2 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition shadow-md shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer ml-auto"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Hole #{selectedHoleNum}</span>
                  </button>
                </div>
              </div>

              {/* Quick Actions Toolbox */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleQuickHalveHole}
                    className="py-1.5 px-3 rounded-xl bg-[#131923] hover:bg-[#1C2534] text-slate-300 font-bold transition flex items-center gap-1 cursor-pointer border border-white/[0.08]"
                  >
                    🤝 Quick Halve Hole (Pars)
                  </button>

                  {existingHoleResult && (
                    <button
                      type="button"
                      onClick={handleClearHoleScore}
                      className="py-1.5 px-3 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 font-bold transition flex items-center gap-1 cursor-pointer border border-red-500/30"
                    >
                      <RotateCcw className="w-3 h-3" /> Reset Hole
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PERSONAL PLAYER SCORECARD & SUMMARY TALLY */}
          {activeTab === 'players' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-[#131923] text-white p-4 rounded-2xl border border-white/[0.08] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    Personal Player 18-Hole Scoring Summaries
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Individual gross, net, and Front 9 / Back 9 splits.
                  </p>
                </div>
                <span className="text-2xs font-bold bg-[#0D1117] text-slate-300 px-2.5 py-1 rounded-lg border border-white/[0.08] font-mono tabular-nums">
                  {completedHolesCount}/18 Holes Played
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {playerSummaries.map(ps => {
                  const isSideA = ps.side === 'sideA';
                  const teamBadge = isSideA ? sideATeam.badgeIcon : sideBTeam.badgeIcon;
                  const teamColor = isSideA ? teamColorA : teamColorB;

                  return (
                    <div 
                      key={ps.player.userId}
                      className="p-4 rounded-2xl border space-y-3 shadow-[0_4px_16px_rgba(0,0,0,0.3)] transition bg-[#131923]"
                      style={{
                        borderColor: hexToRgba(teamColor, 0.35),
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span 
                            className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1"
                            style={{ color: teamColor }}
                          >
                            <span>{teamBadge}</span> {ps.teamName}
                          </span>
                          <h4 className="text-sm font-black text-white mt-0.5">
                            {formatPlayerInitialAndSurname(ps.player.displayName)}
                          </h4>
                          <span className="text-2xs text-slate-400 font-mono tabular-nums">
                            Playing Handicap: <strong>{ps.playingHandicap}</strong>
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-lg font-black text-white block leading-none font-mono tabular-nums">
                            {ps.totalGross > 0 ? ps.totalGross : '-'}
                          </span>
                          <span className="text-[11px] font-bold text-slate-400 font-mono tabular-nums">
                            Net {ps.totalNet > 0 ? ps.totalNet : '-'} ({ps.toParGross > 0 ? `+${ps.toParGross}` : (ps.toParGross === 0 ? 'E' : ps.toParGross)})
                          </span>
                        </div>
                      </div>

                      {/* Front 9 / Back 9 Breakdown Grid */}
                      <div className="grid grid-cols-3 gap-2 bg-[#0D1117] p-2.5 rounded-xl border border-white/[0.08] text-center">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold">OUT (F9)</span>
                          <span className="text-xs font-black text-white font-mono tabular-nums">
                            {ps.front9Gross > 0 ? `${ps.front9Gross} (${ps.front9Net})` : '-'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold">IN (B9)</span>
                          <span className="text-xs font-black text-white font-mono tabular-nums">
                            {ps.back9Gross > 0 ? `${ps.back9Gross} (${ps.back9Net})` : '-'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold">TOTAL 18</span>
                          <span className="text-xs font-black text-white font-mono tabular-nums">
                            {ps.totalGross > 0 ? `${ps.totalGross} (${ps.totalNet})` : '-'}
                          </span>
                        </div>
                      </div>

                      {/* Stat chips */}
                      <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] pt-1">
                        <span className="text-slate-300 font-medium">
                          🦅 Birdies: <strong className="text-white font-mono tabular-nums">{ps.birdiesCount}</strong> • ⛳️ Pars: <strong className="text-white font-mono tabular-nums">{ps.parsCount}</strong>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: FULL 18-HOLE SCORECARD TABLE */}
          {activeTab === 'scorecard' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="overflow-x-auto rounded-2xl border border-white/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
                <table className="w-full text-xs text-center border-collapse font-mono tabular-nums">
                  <thead>
                    <tr className="bg-[#131923] text-slate-200 font-bold border-b border-white/[0.08] font-sans">
                      <th className="p-2 text-left pl-3">Hole</th>
                      <th className="p-2">Par</th>
                      <th className="p-2">SI</th>
                      {isBetterBall ? (
                        <>
                          <th className="p-2 text-white font-bold" style={{ backgroundColor: teamColorA }}>
                            {sideATeam.shortCode} (Best Net)
                          </th>
                          <th className="p-2 text-white font-bold" style={{ backgroundColor: teamColorB }}>
                            {sideBTeam.shortCode} (Best Net)
                          </th>
                        </>
                      ) : isSingles ? (
                        <>
                          <th className="p-2 text-white font-bold" style={{ backgroundColor: teamColorA }}>
                            {sideAPlayers[0] ? formatPlayerInitialAndSurname(sideAPlayers[0].displayName) : sideATeam.shortCode}
                          </th>
                          <th className="p-2 text-white font-bold" style={{ backgroundColor: teamColorB }}>
                            {sideBPlayers[0] ? formatPlayerInitialAndSurname(sideBPlayers[0].displayName) : sideBTeam.shortCode}
                          </th>
                        </>
                      ) : (
                        <>
                          <th className="p-2 text-white font-bold" style={{ backgroundColor: teamColorA }}>
                            {sideATeam.shortCode} (Team Net)
                          </th>
                          <th className="p-2 text-white font-bold" style={{ backgroundColor: teamColorB }}>
                            {sideBTeam.shortCode} (Team Net)
                          </th>
                        </>
                      )}
                      <th className="p-2">Hole Winner</th>
                      <th className="p-2">Match Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {courseHoles.map(h => {
                      const res = match.holeResults?.[h.holeNumber];
                      const isCurrent = selectedHoleNum === h.holeNumber;

                      // Color-coding based on winning team, neutral/dark if halved
                      let rowBgColor = '#0D1117';
                      let holeBoxBg = '#131923';
                      let holeBoxTextColor = '#94a3b8';
                      let winnerBadgeStyle: React.CSSProperties = { backgroundColor: '#131923', color: '#94a3b8' };
                      let borderLeftColor = 'transparent';

                      if (res) {
                        if (res.winnerSide === 'sideA') {
                          rowBgColor = hexToRgba(teamColorA, 0.12);
                          holeBoxBg = hexToRgba(teamColorA, 0.25);
                          holeBoxTextColor = teamColorA;
                          borderLeftColor = teamColorA;
                          winnerBadgeStyle = {
                            backgroundColor: teamColorA,
                            color: '#ffffff',
                          };
                        } else if (res.winnerSide === 'sideB') {
                          rowBgColor = hexToRgba(teamColorB, 0.12);
                          holeBoxBg = hexToRgba(teamColorB, 0.25);
                          holeBoxTextColor = teamColorB;
                          borderLeftColor = teamColorB;
                          winnerBadgeStyle = {
                            backgroundColor: teamColorB,
                            color: '#ffffff',
                          };
                        } else {
                          // Halved hole: Neutral dark editorial
                          rowBgColor = '#10151E';
                          holeBoxBg = '#18202C';
                          holeBoxTextColor = '#cbd5e1';
                          borderLeftColor = 'rgba(255,255,255,0.2)';
                          winnerBadgeStyle = {
                            backgroundColor: '#1E293B',
                            color: '#cbd5e1',
                          };
                        }
                      }

                      return (
                        <tr 
                          key={h.holeNumber}
                          onClick={() => {
                            setSelectedHoleNum(h.holeNumber);
                            setActiveTab('interactive');
                          }}
                          style={{
                            backgroundColor: isCurrent ? (res && res.winnerSide !== 'halved' ? rowBgColor : '#16202C') : rowBgColor,
                            borderLeft: `4px solid ${borderLeftColor}`,
                          }}
                          className={`cursor-pointer transition hover:opacity-95 ${isCurrent ? 'ring-1 ring-inset ring-emerald-500/50 font-medium' : ''}`}
                        >
                          <td className="p-2 text-left pl-3 font-bold font-sans">
                            <span 
                              className="inline-flex items-center justify-center px-2 py-0.5 rounded font-black text-xs font-mono tabular-nums"
                              style={{ backgroundColor: holeBoxBg, color: holeBoxTextColor }}
                            >
                              #{h.holeNumber}
                            </span>
                          </td>
                          <td className="p-2 text-slate-300">{h.par}</td>
                          <td className="p-2 text-slate-400 font-mono text-[11px]">{h.strokeIndex}</td>
                          
                          <td className="p-2 font-bold text-white">
                            {res ? (
                              <span>
                                {res.sideAScore}{' '}
                                <span className="text-[10px] font-bold" style={{ color: teamColorA }}>
                                  ({res.sideANetScore})
                                </span>
                              </span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                          
                          <td className="p-2 font-bold text-white">
                            {res ? (
                              <span>
                                {res.sideBScore}{' '}
                                <span className="text-[10px] font-bold" style={{ color: teamColorB }}>
                                  ({res.sideBNetScore})
                                </span>
                              </span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>

                          <td className="p-2 font-sans">
                            {res ? (
                              <span 
                                className="px-2 py-0.5 rounded text-[10px] font-black inline-block shadow-2xs"
                                style={winnerBadgeStyle}
                              >
                                {res.winnerSide === 'sideA' 
                                  ? (isSingles && sideAPlayers[0] ? formatPlayerInitialAndSurname(sideAPlayers[0].displayName) : sideATeam.name) 
                                  : (res.winnerSide === 'sideB' 
                                    ? (isSingles && sideBPlayers[0] ? formatPlayerInitialAndSurname(sideBPlayers[0].displayName) : sideBTeam.name) 
                                    : 'Halved')}
                              </span>
                            ) : (
                              <span className="text-slate-600 text-[11px]">-</span>
                            )}
                          </td>
                          
                          <td className="p-2 font-bold text-[11px] text-slate-300 font-sans">
                            {res ? (res.matchStatusAfterHole || 'Recorded') : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-4 bg-[#0F141D] border-t border-white/[0.08] flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Current Match Leader: <strong className="text-white">{match.currentStatusText || 'All Square'}</strong>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-black shadow-[0_0_14px_rgba(16,185,129,0.3)] transition cursor-pointer"
          >
            Done & Save to Leaderboard
          </button>
        </div>

      </div>

      {/* DEDICATED FINES MODAL */}
      <FineAssignModal
        holeNumber={holeSavedForFines}
        players={assignablePlayers}
        tournamentId={tournament.id}
        matchId={match.id}
        roundNumber={round.roundNumber}
        isOpen={showFineAssignModal}
        onClose={() => setShowFineAssignModal(false)}
        onSaveFines={handleSaveFinesFromModal}
      />
    </div>
  );
};
