import React, { useState, useEffect } from 'react';
import { 
  Tournament, 
  TournamentFormat, 
  TournamentRoundFormat, 
  TournamentTeam, 
  TournamentRound, 
  TournamentMatch,
  GolferUser 
} from '../types/golf';
import { MOCK_COURSES } from '../data/mockData';
import { generateAutoPairings, recalculateTournamentLeaderboard } from '../utils/tournamentEngine';
import { StorageService } from '../utils/storage';
import { 
  Trophy, 
  Calendar, 
  Users, 
  Flag, 
  Sparkles, 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  Plus, 
  Trash2, 
  Layers, 
  MapPin, 
  ShieldCheck, 
  Zap,
  Award,
  UserPlus,
  UserMinus,
  Search,
  AlertCircle,
  X,
  Share2,
  Crown
} from 'lucide-react';

interface TournamentCreationWizardProps {
  currentUser: GolferUser;
  allUsers?: GolferUser[];
  onClose: () => void;
  onTournamentCreated: (newTournament: Tournament) => void;
}

export const TournamentCreationWizard: React.FC<TournamentCreationWizardProps> = ({
  currentUser,
  allUsers = [],
  onClose,
  onTournamentCreated,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Manual Draft: Pool starts strictly with current user (creator/host).
  // No automatic pre-population of all users or friends.
  const approvedFriendIds = StorageService.getFriendUserIds(currentUser.id);
  const [playerPool, setPlayerPool] = useState<GolferUser[]>([currentUser]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [draftValidationWarning, setDraftValidationWarning] = useState<string | null>(null);
  const [feedSharingPrefs, setFeedSharingPrefs] = useState<Record<string, boolean>>({
    [currentUser.id]: true,
  });
  const [selectedUserToAdd, setSelectedUserToAdd] = useState<string>('');

  // Step 1: Basics
  const [tournamentName, setTournamentName] = useState('Championship Matchplay 2026');
  const [tagline, setTagline] = useState('Multi-Day Championship Matchplay Clash');
  const [description, setDescription] = useState('Team matchplay challenge across championship courses with authentic golfer records.');
  const [formatType, setFormatType] = useState<TournamentFormat>('team_ryder_cup');
  const [startDate, setStartDate] = useState('2026-10-02');
  const [endDate, setEndDate] = useState('2026-10-04');
  const [coverImage, setCoverImage] = useState(
    'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?auto=format&fit=crop&w=1200&q=80'
  );

  // Step 2: Teams & Rosters (For Ryder Cup Style)
  const [teamAName, setTeamAName] = useState('');
  const [teamAColor, setTeamAColor] = useState('#059669'); // Emerald
  const [teamABadge, setTeamABadge] = useState('🦅');
  const [teamACaptainId, setTeamACaptainId] = useState(currentUser.id);
  const [teamAPlayerIds, setTeamAPlayerIds] = useState<string[]>([currentUser.id]);

  const [teamBName, setTeamBName] = useState('');
  const [teamBColor, setTeamBColor] = useState('#0284c7'); // Ocean Sky Blue
  const [teamBBadge, setTeamBBadge] = useState('🌊');
  const [teamBCaptainId, setTeamBCaptainId] = useState('');
  const [teamBPlayerIds, setTeamBPlayerIds] = useState<string[]>([]);

  // Step 3: Multi-Day Rounds Configuration
  const [roundsConfig, setRoundsConfig] = useState<Array<{
    dayNumber: number;
    title: string;
    date: string;
    courseId: string;
    format: TournamentRoundFormat;
    points: number;
  }>>([
    {
      dayNumber: 1,
      title: 'Day 1: Fourball Better Ball',
      date: '2026-10-02',
      courseId: 'course-simola-estate',
      format: 'better_ball_matchplay',
      points: 2.0,
    },
    {
      dayNumber: 2,
      title: 'Day 2: 2-Man Team Scramble',
      date: '2026-10-03',
      courseId: 'course-knysna-golf',
      format: 'two_man_scramble',
      points: 2.0,
    },
    {
      dayNumber: 3,
      title: 'Day 3: Championship Singles',
      date: '2026-10-04',
      courseId: 'course-plett-country-club',
      format: 'individual_matchplay',
      points: 4.0,
    },
  ]);

  // Step 4: Manual Round Pairings & Flights
  // Mapping of round index (0-based) to array of manual flight slots
  const [roundsPairings, setRoundsPairings] = useState<Record<number, Array<{
    id: string;
    sideAPlayerIds: string[];
    sideBPlayerIds: string[];
  }>>>({});
  const [selectedPairingRoundIdx, setSelectedPairingRoundIdx] = useState<number>(0);

  // Initialize or ensure pairings exist for a round
  const initializeRoundPairings = (roundIdx: number, forceReset = false) => {
    const rc = roundsConfig[roundIdx];
    if (!rc) return;
    if (!forceReset && roundsPairings[roundIdx] && roundsPairings[roundIdx].length > 0) return;

    const isSingles = rc.format === 'individual_matchplay';
    const teamAIds = teamAPlayerIds.length > 0 ? teamAPlayerIds : [currentUser.id];
    const teamBIds = teamBPlayerIds.length > 0 ? teamBPlayerIds : [];

    const slotsCount = isSingles 
      ? Math.max(1, Math.min(teamAIds.length, Math.max(1, teamBIds.length)))
      : Math.max(1, Math.min(Math.ceil(teamAIds.length / 2), Math.max(1, Math.ceil(teamBIds.length / 2))));

    const newSlots = [];
    for (let f = 0; f < slotsCount; f++) {
      if (isSingles) {
        newSlots.push({
          id: `slot-${roundIdx}-${f + 1}-${Date.now()}`,
          sideAPlayerIds: [teamAIds[f % teamAIds.length] || teamAIds[0]],
          sideBPlayerIds: [teamBIds[f % (teamBIds.length || 1)] || teamBIds[0] || ''],
        });
      } else {
        newSlots.push({
          id: `slot-${roundIdx}-${f + 1}-${Date.now()}`,
          sideAPlayerIds: [
            teamAIds[(f * 2) % teamAIds.length] || teamAIds[0],
            teamAIds[(f * 2 + 1) % teamAIds.length] || teamAIds[0]
          ],
          sideBPlayerIds: [
            teamBIds[(f * 2) % (teamBIds.length || 1)] || teamBIds[0] || '',
            teamBIds[(f * 2 + 1) % (teamBIds.length || 1)] || teamBIds[0] || ''
          ],
        });
      }
    }

    setRoundsPairings(prev => ({
      ...prev,
      [roundIdx]: newSlots,
    }));
  };

  // Ensure pairings are initialized when step becomes 4
  useEffect(() => {
    if (step === 4) {
      roundsConfig.forEach((_, idx) => {
        initializeRoundPairings(idx, false);
      });
    }
  }, [step, roundsConfig, teamAPlayerIds, teamBPlayerIds]);

  const handleAddFlightSlot = (roundIdx: number) => {
    const rc = roundsConfig[roundIdx];
    const isSingles = rc?.format === 'individual_matchplay';
    const teamAIds = teamAPlayerIds.length > 0 ? teamAPlayerIds : [currentUser.id];
    const teamBIds = teamBPlayerIds.length > 0 ? teamBPlayerIds : [];

    const newSlot = {
      id: `slot-${roundIdx}-${Date.now()}`,
      sideAPlayerIds: isSingles ? [teamAIds[0]] : [teamAIds[0], teamAIds[1] || teamAIds[0]],
      sideBPlayerIds: isSingles ? [teamBIds[0] || ''] : [teamBIds[0] || '', teamBIds[1] || teamBIds[0] || ''],
    };

    setRoundsPairings(prev => ({
      ...prev,
      [roundIdx]: [...(prev[roundIdx] || []), newSlot],
    }));
  };

  const handleRemoveFlightSlot = (roundIdx: number, slotIdx: number) => {
    setRoundsPairings(prev => {
      const current = prev[roundIdx] || [];
      if (current.length <= 1) return prev;
      return {
        ...prev,
        [roundIdx]: current.filter((_, i) => i !== slotIdx),
      };
    });
  };

  const handleUpdateSlotPlayer = (
    roundIdx: number,
    slotIdx: number,
    side: 'A' | 'B',
    playerIndex: number,
    newPlayerId: string
  ) => {
    setRoundsPairings(prev => {
      const currentRoundSlots = [...(prev[roundIdx] || [])];
      const targetSlot = { ...currentRoundSlots[slotIdx] };

      if (side === 'A') {
        const nextSideA = [...targetSlot.sideAPlayerIds];
        nextSideA[playerIndex] = newPlayerId;
        targetSlot.sideAPlayerIds = nextSideA;
      } else {
        const nextSideB = [...targetSlot.sideBPlayerIds];
        nextSideB[playerIndex] = newPlayerId;
        targetSlot.sideBPlayerIds = nextSideB;
      }

      currentRoundSlots[slotIdx] = targetSlot;
      return {
        ...prev,
        [roundIdx]: currentRoundSlots,
      };
    });
  };

  const handleDraftPlayerToTeam = (userId: string, targetTeam: 'A' | 'B') => {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;

    setDraftValidationWarning(null);

    setPlayerPool(prev => (prev.some(p => p.id === user.id) ? prev : [...prev, user]));
    setFeedSharingPrefs(prev => ({ ...prev, [user.id]: prev[user.id] ?? true }));

    if (targetTeam === 'A') {
      setTeamAPlayerIds(prev => (prev.includes(user.id) ? prev : [...prev, user.id]));
      setTeamBPlayerIds(prev => prev.filter(id => id !== user.id));
    } else {
      setTeamBPlayerIds(prev => (prev.includes(user.id) ? prev : [...prev, user.id]));
      setTeamAPlayerIds(prev => prev.filter(id => id !== user.id));
      if (!teamBCaptainId) {
        setTeamBCaptainId(user.id);
      }
    }
  };

  const handleAddRegisteredUserToPool = (userId: string) => {
    const user = allUsers.find(u => u.id === userId);
    if (!user || playerPool.some(p => p.id === user.id)) return;

    setDraftValidationWarning(null);
    setPlayerPool(prev => [...prev, user]);
    setFeedSharingPrefs(prev => ({ ...prev, [user.id]: prev[user.id] ?? true }));
    
    // Auto-assign to whichever team has fewer players
    if (teamAPlayerIds.length <= teamBPlayerIds.length) {
      setTeamAPlayerIds(prev => [...prev, user.id]);
    } else {
      setTeamBPlayerIds(prev => [...prev, user.id]);
      if (!teamBCaptainId) {
        setTeamBCaptainId(user.id);
      }
    }

    setSelectedUserToAdd('');
  };

  const handleRemovePlayerFromRoster = (userId: string) => {
    // Cannot completely delete host from tournament
    if (userId === currentUser.id) {
      setTeamAPlayerIds(prev => prev.filter(id => id !== userId));
      setTeamBPlayerIds(prev => prev.filter(id => id !== userId));
      return;
    }

    // Remove from pool so player returns to search pool
    setPlayerPool(prev => prev.filter(p => p.id !== userId));
    setTeamAPlayerIds(prev => prev.filter(id => id !== userId));
    setTeamBPlayerIds(prev => prev.filter(id => id !== userId));

    if (teamACaptainId === userId) {
      setTeamACaptainId(currentUser.id);
    }
    if (teamBCaptainId === userId) {
      const remainingB = teamBPlayerIds.filter(id => id !== userId);
      setTeamBCaptainId(remainingB[0] || '');
    }

    // Clean up lineup pairings in roundsPairings
    setRoundsPairings(prev => {
      const updated: Record<number, Array<{ id: string; sideAPlayerIds: string[]; sideBPlayerIds: string[] }>> = {};
      Object.keys(prev).forEach(rKey => {
        const roundNum = Number(rKey);
        const slots = prev[roundNum];
        if (Array.isArray(slots)) {
          updated[roundNum] = slots.map(slot => ({
            ...slot,
            sideAPlayerIds: slot.sideAPlayerIds.filter(id => id !== userId),
            sideBPlayerIds: slot.sideBPlayerIds.filter(id => id !== userId),
          }));
        }
      });
      return updated;
    });

    // Remove from active draft player pool if not tournament host
    if (userId !== currentUser.id) {
      setPlayerPool(prev => prev.filter(p => p.id !== userId));
    }
  };

  const handleAddRound = () => {
    const nextDay = roundsConfig.length + 1;
    const courseOptions = ['course-simola-estate', 'course-knysna-golf', 'course-plett-country-club', 'course-pebble'];
    const chosenCourse = courseOptions[(nextDay - 1) % courseOptions.length];

    setRoundsConfig(prev => [
      ...prev,
      {
        dayNumber: nextDay,
        title: `Day ${nextDay}: Playoff Matchplay`,
        date: '2026-10-05',
        courseId: chosenCourse,
        format: 'individual_matchplay',
        points: 4.0,
      }
    ]);
  };

  const handleRemoveRound = (index: number) => {
    if (roundsConfig.length <= 1) return;
    setRoundsConfig(prev => prev.filter((_, i) => i !== index));
  };

  const handleTogglePlayerTeam = (userId: string, targetTeam: 'A' | 'B') => {
    if (targetTeam === 'A') {
      if (teamAPlayerIds.includes(userId)) {
        setTeamAPlayerIds(prev => prev.filter(id => id !== userId));
      } else {
        setTeamBPlayerIds(prev => prev.filter(id => id !== userId));
        setTeamAPlayerIds(prev => [...prev, userId]);
      }
    } else {
      if (teamBPlayerIds.includes(userId)) {
        setTeamBPlayerIds(prev => prev.filter(id => id !== userId));
      } else {
        setTeamAPlayerIds(prev => prev.filter(id => id !== userId));
        setTeamBPlayerIds(prev => [...prev, userId]);
      }
    }
  };

  const calculateTotalPoints = () => {
    return roundsConfig.reduce((sum, r) => sum + r.points, 0);
  };

  const handleFinishWizard = () => {
    const tourId = `tour-custom-${Date.now()}`;
    const totalPoints = calculateTotalPoints();
    const clinchPoints = Math.floor(totalPoints / 2) + 0.5;

    const finalPool = [...playerPool];
    const teamAIds = teamAPlayerIds;
    const teamBIds = teamBPlayerIds;

    const safeTeamAName = teamAName.trim() || 'Team A';
    const safeTeamBName = teamBName.trim() || 'Team B';

    if (teamAIds.length === 0) {
      setDraftValidationWarning(`Please draft at least one player into ${safeTeamAName}.`);
      setStep(2);
      return;
    }
    
    if (teamBIds.length === 0) {
      setDraftValidationWarning(`Please explicitly search and draft at least one player into ${safeTeamBName}.`);
      setStep(2);
      return;
    }

    const captainA = finalPool.find(u => u.id === teamACaptainId) || finalPool.find(u => u.id === teamAIds[0]) || currentUser;
    const captainB = finalPool.find(u => u.id === teamBCaptainId) || finalPool.find(u => u.id === teamBIds[0]) || finalPool[1] || captainA;

    const teamA: TournamentTeam = {
      id: `team-a-${Date.now()}`,
      name: safeTeamAName,
      shortCode: safeTeamAName.substring(0, 3).toUpperCase(),
      color: teamAColor,
      badgeIcon: teamABadge,
      captainId: captainA.id,
      captainName: captainA.displayName,
      playerIds: teamAIds,
      totalPoints: 0,
    };

    const teamB: TournamentTeam = {
      id: `team-b-${Date.now()}`,
      name: safeTeamBName,
      shortCode: safeTeamBName.substring(0, 3).toUpperCase(),
      color: teamBColor,
      badgeIcon: teamBBadge,
      captainId: captainB.id,
      captainName: captainB.displayName,
      playerIds: teamBIds,
      totalPoints: 0,
    };

    const builtRounds: TournamentRound[] = roundsConfig.map((rc, idx) => {
      const course = MOCK_COURSES.find(c => c.id === rc.courseId) || MOCK_COURSES[0];
      const roundId = `round-${idx + 1}-${Date.now()}`;
      const isSingles = rc.format === 'individual_matchplay';

      // Build matches from manual pairings or fallback
      const configuredSlots = roundsPairings[idx] && roundsPairings[idx].length > 0 
        ? roundsPairings[idx] 
        : [];

      let matches: TournamentMatch[] = [];

      if (configuredSlots.length > 0) {
        matches = configuredSlots.map((slot, sIdx) => {
          const playersA = slot.sideAPlayerIds
            .map(pid => finalPool.find(u => u.id === pid))
            .filter(Boolean) as GolferUser[];

          const playersB = slot.sideBPlayerIds
            .map(pid => finalPool.find(u => u.id === pid))
            .filter(Boolean) as GolferUser[];

          // Fallback if player deleted
          const safeA = playersA.length > 0 ? playersA : [captainA];
          const safeB = playersB.length > 0 ? playersB : [captainB];

          // Compute Playing Handicaps according to format
          let playHcpA = Math.round(safeA[0].handicapIndex);
          let playHcpB = Math.round(safeB[0].handicapIndex);

          if (rc.format === 'better_ball_matchplay' || rc.format === 'alternate_shot') {
            playHcpA = Math.round(Math.min(...safeA.map(p => p.handicapIndex)) * 0.85);
            playHcpB = Math.round(Math.min(...safeB.map(p => p.handicapIndex)) * 0.85);
          } else if (rc.format === 'two_man_scramble' && safeA.length >= 2 && safeB.length >= 2) {
            const [lowA, highA] = safeA[0].handicapIndex <= safeA[1].handicapIndex ? [safeA[0], safeA[1]] : [safeA[1], safeA[0]];
            const [lowB, highB] = safeB[0].handicapIndex <= safeB[1].handicapIndex ? [safeB[0], safeB[1]] : [safeB[1], safeB[0]];
            playHcpA = Math.round((lowA.handicapIndex * 0.35) + (highA.handicapIndex * 0.15));
            playHcpB = Math.round((lowB.handicapIndex * 0.35) + (highB.handicapIndex * 0.15));
          }

          const labelA = safeA.map(p => p.displayName.split(' ')[0]).join(' & ');
          const labelB = safeB.map(p => p.displayName.split(' ')[0]).join(' & ');

          return {
            id: `match-r${idx + 1}-f${sIdx + 1}-${Date.now()}`,
            tournamentId: tourId,
            roundId,
            matchNumber: sIdx + 1,
            format: rc.format,
            holesTotal: 18,
            holesCompleted: 0,
            status: 'scheduled' as const,
            sideA: {
              teamId: teamA.id,
              teamName: teamA.name,
              teamColor: teamA.color,
              playerIds: safeA.map(p => p.id),
              players: safeA.map(p => ({
                userId: p.id,
                displayName: p.displayName,
                username: p.username,
                photoURL: p.photoURL,
                handicapIndex: p.handicapIndex,
                playtomicLevel: p.playtomicLevel,
                teeColor: 'White' as const,
                playingHandicap: Math.round(p.handicapIndex),
                grossScore: 0,
                netScore: 0,
                confirmed: true,
              })),
              label: labelA,
              playingHandicap: playHcpA,
            },
            sideB: {
              teamId: teamB.id,
              teamName: teamB.name,
              teamColor: teamB.color,
              playerIds: safeB.map(p => p.id),
              players: safeB.map(p => ({
                userId: p.id,
                displayName: p.displayName,
                username: p.username,
                photoURL: p.photoURL,
                handicapIndex: p.handicapIndex,
                playtomicLevel: p.playtomicLevel,
                teeColor: 'White' as const,
                playingHandicap: Math.round(p.handicapIndex),
                grossScore: 0,
                netScore: 0,
                confirmed: true,
              })),
              label: labelB,
              playingHandicap: playHcpB,
            },
            holeResults: {},
            currentStatusText: 'Scheduled',
            leadSide: 'tied' as const,
            leadMargin: 0,
            pointsAwarded: { sideA: 0, sideB: 0 },
            winnerSide: null,
          };
        });
      } else {
        matches = generateAutoPairings(teamA, teamB, finalPool, rc.format, idx + 1, roundId, tourId);
      }

      return {
        id: roundId,
        tournamentId: tourId,
        roundNumber: idx + 1,
        dayNumber: rc.dayNumber,
        title: rc.title,
        date: rc.date,
        courseId: course.id,
        courseName: course.name,
        courseLocation: course.location,
        courseCover: course.coverImage,
        coursePar: course.par,
        format: rc.format,
        formatDescription: `Multi-format ${(rc.format || 'matchplay').replace(/_/g, ' ')} at ${course.name}. 1 point awarded per match flight.`,
        status: idx === 0 ? 'live' : 'upcoming',
        matches,
        pointsAvailable: rc.points,
        pointsTallied: {},
      };
    });

    Object.entries(feedSharingPrefs).forEach(([uid, pref]) => {
      StorageService.setPlayerFeedShareOptIn(tourId, uid, Boolean(pref));
    });

    const newTournament: Tournament = {
      id: tourId,
      name: tournamentName,
      tagline,
      description,
      organizerId: currentUser.id,
      creatorId: currentUser.id,
      organizerName: currentUser.displayName,
      organizerPhoto: currentUser.photoURL,
      formatType,
      status: 'live',
      startDate,
      endDate,
      location: 'Garden Route, South Africa',
      coverImage,
      playersCount: teamAIds.length + teamBIds.length,
      totalPoints,
      clinchPoints,
      teams: [teamA, teamB],
      rounds: builtRounds,
      scoringRule: {
        pointsPerWin: 1.0,
        pointsPerTie: 0.5,
        pointsPerLoss: 0.0,
        clinchThresholdRule: 'majority_plus_half',
      },
      leaderboard: {} as any,
      finesModeEnabled: true,
      feedSharingPreferences: feedSharingPrefs,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    newTournament.leaderboard = recalculateTournamentLeaderboard(newTournament, finalPool);
    onTournamentCreated(newTournament);
  };

  return (
    <div id="tournament-wizard-modal" className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header with Wizard Step Indicator */}
        <div className="bg-slate-900 text-white p-5 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Tournament Architect Wizard</h3>
                <p className="text-xs text-slate-400">Configure multi-day, multi-course Ryder Cup & team events</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-xs font-bold py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
            >
              Cancel
            </button>
          </div>

          {/* Stepper Dots */}
          <div className="grid grid-cols-5 gap-2 mt-4 pt-3 border-t border-slate-800">
            {[
              { num: 1, label: '1. Event Info' },
              { num: 2, label: '2. Teams & Draft' },
              { num: 3, label: '3. Multi-Day Rounds' },
              { num: 4, label: '4. Pairings' },
              { num: 5, label: '5. Launch' },
            ].map(s => (
              <div key={s.num} className="text-center">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    step >= s.num ? 'bg-emerald-500' : 'bg-slate-800'
                  }`}
                />
                <span className={`text-[10px] block mt-1 font-bold ${step === s.num ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Wizard Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* STEP 1: EVENT INFO */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div>
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider">Tournament Name</label>
                <input
                  type="text"
                  value={tournamentName}
                  onChange={e => setTournamentName(e.target.value)}
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g. Garden Route Ryder Cup 2026"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider">Tagline & Format Summary</label>
                <input
                  type="text"
                  value={tagline}
                  onChange={e => setTagline(e.target.value)}
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g. 3 Days • 3 Championship Courses • 16 Points to Glory"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Tournament Format</label>
                  <select
                    value={formatType}
                    onChange={e => setFormatType(e.target.value as any)}
                    className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  >
                    <option value="team_ryder_cup">Team Matchplay (Ryder Cup Style)</option>
                    <option value="multi_team_league">Multi-Team League (4+ Teams)</option>
                    <option value="individual_championship">Individual Multi-Day Strokeplay</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Cover Atmosphere</label>
                  <select
                    value={coverImage}
                    onChange={e => setCoverImage(e.target.value)}
                    className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  >
                    <option value="https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?auto=format&fit=crop&w=1200&q=80">
                      Simola Valley Estate
                    </option>
                    <option value="https://images.unsplash.com/photo-1535131749006-b7f58c99034b?auto=format&fit=crop&w=1200&q=80">
                      Knysna Lagoon Coast
                    </option>
                    <option value="https://images.unsplash.com/photo-1592919505780-303950717480?auto=format&fit=crop&w=1200&q=80">
                      Plettenberg Ocean Links
                    </option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Playtomic Official Scoring Rule:</strong>
                  <p className="text-emerald-900 mt-0.5">
                    Each individual match or flight awards <strong>1.0 Point</strong> for a win, <strong>0.5 Points</strong> for a halved match, and <strong>0.0</strong> for a loss towards overall standings.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: TEAMS & ROSTERS */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Team A Config */}
                <div 
                  className="p-4 rounded-2xl bg-white border-2 shadow-xs space-y-3 transition-colors"
                  style={{ borderColor: teamAColor }}
                >
                  <div className="flex items-center justify-between">
                    <span 
                      className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
                      style={{ color: teamAColor }}
                    >
                      <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: teamAColor }} /> {teamAName.trim() || 'Team A'} (Home)
                    </span>
                    <span 
                      className="text-2xs font-bold px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: teamAColor }}
                    >
                      {teamAPlayerIds.length} Golfers
                    </span>
                  </div>

                  <div>
                    <label className="text-2xs font-bold text-slate-600">Team Name</label>
                    <input
                      type="text"
                      value={teamAName}
                      onChange={e => setTeamAName(e.target.value)}
                      placeholder="e.g. Outeniqua (or custom name)"
                      className="w-full mt-0.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-2xs font-bold text-slate-600">Team Color</label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        value={teamAColor}
                        onChange={e => setTeamAColor(e.target.value)}
                        className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer shrink-0"
                        title="Choose custom color"
                      />
                      <div className="flex items-center gap-1.5 overflow-x-auto">
                        {['#059669', '#dc2626', '#d97706', '#7c3aed', '#0f766e', '#1e293b'].map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setTeamAColor(c)}
                            className={`w-6 h-6 rounded-full cursor-pointer transition border ${teamAColor === c ? 'ring-2 ring-slate-900 scale-110' : 'opacity-80 hover:opacity-100'}`}
                            style={{ backgroundColor: c, borderColor: '#cbd5e1' }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Team B Config */}
                <div 
                  className="p-4 rounded-2xl bg-white border-2 shadow-xs space-y-3 transition-colors"
                  style={{ borderColor: teamBColor }}
                >
                  <div className="flex items-center justify-between">
                    <span 
                      className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
                      style={{ color: teamBColor }}
                    >
                      <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: teamBColor }} /> {teamBName.trim() || 'Team B'} (Away)
                    </span>
                    <span 
                      className="text-2xs font-bold px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: teamBColor }}
                    >
                      {teamBPlayerIds.length} Golfers
                    </span>
                  </div>

                  <div>
                    <label className="text-2xs font-bold text-slate-600">Team Name</label>
                    <input
                      type="text"
                      value={teamBName}
                      onChange={e => setTeamBName(e.target.value)}
                      placeholder="e.g. Tsitsikamma (or custom name)"
                      className="w-full mt-0.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="text-2xs font-bold text-slate-600">Team Color</label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        value={teamBColor}
                        onChange={e => setTeamBColor(e.target.value)}
                        className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer shrink-0"
                        title="Choose custom color"
                      />
                      <div className="flex items-center gap-1.5 overflow-x-auto">
                        {['#0284c7', '#2563eb', '#4f46e5', '#475569', '#0891b2', '#334155'].map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setTeamBColor(c)}
                            className={`w-6 h-6 rounded-full cursor-pointer transition border ${teamBColor === c ? 'ring-2 ring-slate-900 scale-110' : 'opacity-80 hover:opacity-100'}`}
                            style={{ backgroundColor: c, borderColor: '#cbd5e1' }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Validation Alert */}
              {draftValidationWarning && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-amber-800 text-xs">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{draftValidationWarning}</div>
                  <button
                    type="button"
                    onClick={() => setDraftValidationWarning(null)}
                    className="text-amber-500 hover:text-amber-700 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Explicit Manual Golfer Search & Draft Panel */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                    <Search className="w-3.5 h-3.5 text-emerald-600" /> Explicit Golfer Search & Draft
                  </span>
                  <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {allUsers.filter(u => u.id !== currentUser.id && !playerPool.some(p => p.id === u.id)).length} Available to Draft
                  </span>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search golfers by name, @username, handicap, club, city..."
                    className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Search Candidates List */}
                {(() => {
                  const availableGolfers = allUsers.filter(
                    u => u.id !== currentUser.id && !playerPool.some(p => p.id === u.id)
                  );
                  const q = searchQuery.trim().toLowerCase();
                  const filtered = q
                    ? availableGolfers.filter(u => 
                        u.displayName.toLowerCase().includes(q) ||
                        u.username.toLowerCase().includes(q) ||
                        (u.homeClubName && u.homeClubName.toLowerCase().includes(q)) ||
                        (u.city && u.city.toLowerCase().includes(q)) ||
                        u.handicapIndex.toString().includes(q)
                      )
                    : availableGolfers.slice(0, 5);

                  if (filtered.length === 0) {
                    return (
                      <div className="p-4 bg-white rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
                        {q ? `No golfers found matching "${searchQuery}".` : 'All registered golfers have already been drafted.'}
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {filtered.map(user => {
                        const isFriend = approvedFriendIds.includes(user.id);
                        return (
                          <div
                            key={user.id}
                            className="p-2 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs gap-2 hover:border-slate-300 transition"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={user.photoURL}
                                alt={user.displayName}
                                className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
                              />
                              <div className="truncate">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900 truncate">{user.displayName}</span>
                                  {isFriend && (
                                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded shrink-0">
                                      ⭐ Friend
                                    </span>
                                  )}
                                </div>
                                <div className="text-2xs text-slate-500 truncate">
                                  @{user.username} • HCP {user.handicapIndex.toFixed(1)} {user.homeClubName ? `• ${user.homeClubName}` : ''}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleDraftPlayerToTeam(user.id, 'A')}
                                className="py-1 px-2.5 rounded-lg text-2xs font-bold transition cursor-pointer text-white shadow-xs"
                                style={{ backgroundColor: teamAColor }}
                                title={`Draft ${user.displayName} into ${teamAName.trim() || 'Team A'}`}
                              >
                                + {teamABadge} {(teamAName.trim() || 'Team A').split(' ')[0]}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDraftPlayerToTeam(user.id, 'B')}
                                className="py-1 px-2.5 rounded-lg text-2xs font-bold transition cursor-pointer text-white shadow-xs"
                                style={{ backgroundColor: teamBColor }}
                                title={`Draft ${user.displayName} into ${teamBName.trim() || 'Team B'}`}
                              >
                                + {teamBBadge} {(teamBName.trim() || 'Team B').split(' ')[0]}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Roster Draft Table */}
              <div>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Drafted Roster ({playerPool.length} Golfers)</span>
                  <span className="text-2xs text-slate-500 font-normal">
                    {teamAName.trim() || 'Team A'}: {teamAPlayerIds.length} | {teamBName.trim() || 'Team B'}: {teamBPlayerIds.length}
                  </span>
                </h4>

                {playerPool.length === 1 && (
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs text-emerald-800 mb-2">
                    🏌️ <strong>Manual Draft Required:</strong> Search for golfers above and click the team buttons to draft players into both teams.
                  </div>
                )}

                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {playerPool.map(user => {
                    const isTeamA = teamAPlayerIds.includes(user.id);
                    const isTeamB = teamBPlayerIds.includes(user.id);
                    const isHost = user.id === currentUser.id;
                    const isCaptainA = teamACaptainId === user.id;
                    const isCaptainB = teamBCaptainId === user.id;

                    return (
                      <div
                        key={user.id}
                        className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={user.photoURL}
                            alt={user.displayName}
                            className="w-7 h-7 rounded-full object-cover border border-slate-300 shrink-0"
                          />
                          <div className="truncate">
                            <span className="font-bold text-slate-900 block truncate">
                              {user.displayName} {isHost && <span className="text-2xs font-normal text-emerald-600">(Host)</span>}
                              {(isCaptainA || isCaptainB) && (
                                <span className="text-2xs font-bold text-amber-600 ml-1">👑 Capt</span>
                              )}
                            </span>
                            <span className="text-2xs text-slate-500">
                              HCP: {user.handicapIndex.toFixed(1)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Team A Button */}
                          <button
                            type="button"
                            onClick={() => handleTogglePlayerTeam(user.id, 'A')}
                            className="py-1 px-2.5 rounded-lg text-2xs font-bold transition cursor-pointer"
                            style={{
                              backgroundColor: isTeamA ? teamAColor : '#ffffff',
                              color: isTeamA ? '#ffffff' : '#334155',
                              border: `1px solid ${isTeamA ? teamAColor : '#e2e8f0'}`,
                            }}
                          >
                            {teamABadge} {(teamAName.trim() || 'Team A').split(' ')[0]}
                          </button>

                          {/* Team B Button */}
                          <button
                            type="button"
                            onClick={() => handleTogglePlayerTeam(user.id, 'B')}
                            className="py-1 px-2.5 rounded-lg text-2xs font-bold transition cursor-pointer"
                            style={{
                              backgroundColor: isTeamB ? teamBColor : '#ffffff',
                              color: isTeamB ? '#ffffff' : '#334155',
                              border: `1px solid ${isTeamB ? teamBColor : '#e2e8f0'}`,
                            }}
                          >
                            {teamBBadge} {(teamBName.trim() || 'Team B').split(' ')[0]}
                          </button>

                          {/* Dedicated Remove / Unassign Button */}
                          {isHost ? (
                            (isTeamA || isTeamB) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setTeamAPlayerIds(prev => prev.filter(id => id !== user.id));
                                  setTeamBPlayerIds(prev => prev.filter(id => id !== user.id));
                                }}
                                className="py-1 px-2 rounded-lg text-2xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
                                title="Unassign host from current team"
                              >
                                Unassign
                              </button>
                            )
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRemovePlayerFromRoster(user.id)}
                              className="py-1 px-2 rounded-lg text-2xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer flex items-center gap-1 shrink-0"
                              title={`Remove ${user.displayName} from roster`}
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: MULTI-DAY ROUNDS & COURSES */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Multi-Day Round Schedule & Course Venues
                  </h4>
                  <p className="text-2xs text-slate-500">
                    Assign specific Garden Route courses and distinct game formats for each tournament day.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddRound}
                  className="py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Day
                </button>
              </div>

              <div className="space-y-3">
                {roundsConfig.map((rc, idx) => {
                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                          <Flag className="w-3.5 h-3.5 text-emerald-600" /> Day {rc.dayNumber} Round
                        </span>
                        {roundsConfig.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveRound(idx)}
                            className="text-slate-400 hover:text-red-600 text-xs p-1 rounded transition cursor-pointer"
                            title="Remove Day"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div>
                          <label className="text-2xs font-bold text-slate-600">Course Venue</label>
                          <select
                            value={rc.courseId}
                            onChange={e => {
                              const newCourseId = e.target.value;
                              setRoundsConfig(prev =>
                                prev.map((r, i) => (i === idx ? { ...r, courseId: newCourseId } : r))
                              );
                            }}
                            className="w-full mt-0.5 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-900"
                          >
                            {MOCK_COURSES.map(course => (
                              <option key={course.id} value={course.id}>
                                {course.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-2xs font-bold text-slate-600">Round Format</label>
                          <select
                            value={rc.format}
                            onChange={e => {
                              const newFormat = e.target.value as TournamentRoundFormat;
                              setRoundsConfig(prev =>
                                prev.map((r, i) => (i === idx ? { ...r, format: newFormat } : r))
                              );
                            }}
                            className="w-full mt-0.5 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-900"
                          >
                            <option value="better_ball_matchplay">Better Ball Matchplay (2v2)</option>
                            <option value="two_man_scramble">2-Man Team Scramble</option>
                            <option value="individual_matchplay">Individual Singles Matchplay (1v1)</option>
                            <option value="alternate_shot">Foursomes / Alternate Shot</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-2xs font-bold text-slate-600">Points at Stake</label>
                          <input
                            type="number"
                            step="0.5"
                            value={rc.points}
                            onChange={e => {
                              const pts = parseFloat(e.target.value) || 1;
                              setRoundsConfig(prev =>
                                prev.map((r, i) => (i === idx ? { ...r, points: pts } : r))
                              );
                            }}
                            className="w-full mt-0.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: MANUAL PAIRINGS & FLIGHT ORGANIZER */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-emerald-950 text-emerald-100 p-4 rounded-2xl border border-emerald-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Round-by-Round Pairings & Flights
                  </span>
                  <span className="text-2xs font-bold bg-emerald-800 px-2 py-0.5 rounded text-emerald-200">
                    Total Event Points: {calculateTotalPoints()}
                  </span>
                </div>
                <p className="text-xs text-emerald-200">
                  Configure pairings now, or adjust them dynamically per round/day right before tee-off in the Tournament Hub.
                </p>
              </div>

              {/* Round Selector Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {roundsConfig.map((rc, idx) => {
                  const course = MOCK_COURSES.find(c => c.id === rc.courseId) || MOCK_COURSES[0];
                  const isSelected = selectedPairingRoundIdx === idx;
                  const flightsCount = (roundsPairings[idx] || []).length;

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedPairingRoundIdx(idx)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer border ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-800 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <span>Day {rc.dayNumber}</span>
                      <span className="text-[10px] opacity-75 font-normal">({course.name.split(' ')[0]})</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                        isSelected ? 'bg-emerald-500 text-slate-950' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {flightsCount} Flights
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Active Selected Round Flight Builder */}
              {(() => {
                const curRc = roundsConfig[selectedPairingRoundIdx] || roundsConfig[0];
                const curCourse = MOCK_COURSES.find(c => c.id === curRc.courseId) || MOCK_COURSES[0];
                const isSingles = curRc.format === 'individual_matchplay';
                const curSlots = roundsPairings[selectedPairingRoundIdx] || [];

                const teamAPool = teamAPlayerIds
                  .map(id => playerPool.find(u => u.id === id))
                  .filter(Boolean) as GolferUser[];
                const teamBPool = teamBPlayerIds
                  .map(id => playerPool.find(u => u.id === id))
                  .filter(Boolean) as GolferUser[];

                return (
                  <div className="space-y-3">
                    {/* Header bar with actions */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-black text-slate-900">
                          Day {curRc.dayNumber}: {curRc.title} • {curCourse.name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Format: <strong>{(curRc.format || 'matchplay').replace(/_/g, ' ').toUpperCase()}</strong> • {isSingles ? '1 vs 1 Singles' : '2 vs 2 Team Match'}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => initializeRoundPairings(selectedPairingRoundIdx, true)}
                          className="py-1 px-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-2xs font-bold transition cursor-pointer"
                        >
                          Auto-Seed Defaults
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddFlightSlot(selectedPairingRoundIdx)}
                          className="py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-2xs font-bold transition cursor-pointer flex items-center gap-1"
                        >
                          + Add Flight
                        </button>
                      </div>
                    </div>

                    {/* Flight Matches List */}
                    <div className="space-y-3">
                      {curSlots.map((slot, sIdx) => {
                        return (
                          <div 
                            key={slot.id || sIdx}
                            className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3"
                          >
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] font-black flex items-center justify-center">
                                  {sIdx + 1}
                                </span>
                                Flight #{sIdx + 1} ({isSingles ? 'Singles' : '2-Player Flight'})
                              </span>

                              {curSlots.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFlightSlot(selectedPairingRoundIdx, sIdx)}
                                  className="text-[11px] font-bold text-red-600 hover:text-red-700 transition cursor-pointer"
                                >
                                  Remove Flight
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                              {/* Side A (Team A) */}
                              <div 
                                className="p-3 rounded-xl space-y-2 border transition-colors"
                                style={{ 
                                  backgroundColor: `${teamAColor}12`, 
                                  borderColor: `${teamAColor}40` 
                                }}
                              >
                                <div 
                                  className="text-[11px] font-black uppercase flex items-center gap-1"
                                  style={{ color: teamAColor }}
                                >
                                  <span>{teamABadge}</span> {teamAName.trim() || 'Team A'}
                                </div>

                                {/* Slot 1 Player */}
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-700">
                                    {isSingles ? 'Golfer' : 'Player 1'}
                                  </label>
                                  <select
                                    value={slot.sideAPlayerIds[0] || ''}
                                    onChange={e => handleUpdateSlotPlayer(selectedPairingRoundIdx, sIdx, 'A', 0, e.target.value)}
                                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:ring-1 focus:ring-emerald-500"
                                  >
                                    {teamAPool.map(p => (
                                      <option key={p.id} value={p.id}>
                                        {p.displayName} (HCP {p.handicapIndex})
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Slot 2 Player (if 2v2) */}
                                {!isSingles && (
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-700">Player 2</label>
                                    <select
                                      value={slot.sideAPlayerIds[1] || ''}
                                      onChange={e => handleUpdateSlotPlayer(selectedPairingRoundIdx, sIdx, 'A', 1, e.target.value)}
                                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:ring-1 focus:ring-emerald-500"
                                    >
                                      {teamAPool.map(p => (
                                        <option key={p.id} value={p.id}>
                                          {p.displayName} (HCP {p.handicapIndex})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                              </div>

                              {/* Side B (Team B) */}
                              <div 
                                className="p-3 rounded-xl space-y-2 border transition-colors"
                                style={{ 
                                  backgroundColor: `${teamBColor}12`, 
                                  borderColor: `${teamBColor}40` 
                                }}
                              >
                                <div 
                                  className="text-[11px] font-black uppercase flex items-center gap-1"
                                  style={{ color: teamBColor }}
                                >
                                  <span>{teamBBadge}</span> {teamBName.trim() || 'Team B'}
                                </div>

                                {/* Slot 1 Player */}
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-700">
                                    {isSingles ? 'Golfer' : 'Player 1'}
                                  </label>
                                  <select
                                    value={slot.sideBPlayerIds[0] || ''}
                                    onChange={e => handleUpdateSlotPlayer(selectedPairingRoundIdx, sIdx, 'B', 0, e.target.value)}
                                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:ring-1 focus:ring-sky-500"
                                  >
                                    {teamBPool.map(p => (
                                      <option key={p.id} value={p.id}>
                                        {p.displayName} (HCP {p.handicapIndex})
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Slot 2 Player (if 2v2) */}
                                {!isSingles && (
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-700">Player 2</label>
                                    <select
                                      value={slot.sideBPlayerIds[1] || ''}
                                      onChange={e => handleUpdateSlotPlayer(selectedPairingRoundIdx, sIdx, 'B', 1, e.target.value)}
                                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:ring-1 focus:ring-sky-500"
                                    >
                                      {teamBPool.map(p => (
                                        <option key={p.id} value={p.id}>
                                          {p.displayName} (HCP {p.handicapIndex})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* STEP 5: REVIEW & LAUNCH */}
          {step === 5 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-emerald-950 text-white space-y-3 border border-emerald-800">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-wider">
                  <Trophy className="w-4 h-4" /> Ready to Launch Tournament
                </div>
                <h3 className="text-lg font-black text-white">{tournamentName}</h3>
                <p className="text-xs text-slate-300">{tagline}</p>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-900/60 text-center">
                  <div>
                    <div className="text-[10px] text-slate-400">Total Points</div>
                    <div className="text-sm font-black text-white">{calculateTotalPoints()} Pts</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">To Clinch</div>
                    <div className="text-sm font-black text-emerald-400">{Math.floor(calculateTotalPoints() / 2) + 0.5} Pts</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Rounds</div>
                    <div className="text-sm font-black text-white">{roundsConfig.length} Days</div>
                  </div>
                </div>
              </div>

              {/* Individual User Feed Sharing Controls */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <Share2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        Social Feed Sharing Controls
                      </h4>
                      <p className="text-2xs text-slate-500">
                        Opt-in control for each golfer to share match results to their personal feed.
                      </p>
                    </div>
                  </div>
                  <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Live Score Sync
                  </span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {playerPool.map(player => {
                    const isOptedIn = feedSharingPrefs[player.id] ?? true;
                    const isTeamA = teamAPlayerIds.includes(player.id);
                    const isHost = player.id === currentUser.id;

                    return (
                      <div
                        key={player.id}
                        className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={player.photoURL}
                            alt={player.displayName}
                            className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                          <div className="truncate">
                            <span className="text-xs font-bold text-slate-900 block truncate">
                              {player.displayName} {isHost && <span className="text-2xs font-normal text-emerald-600">(You)</span>}
                            </span>
                            <span className="text-2xs text-slate-500">
                              {isTeamA ? (teamAName.trim() || 'Team A') : (teamBName.trim() || 'Team B')} • HCP {player.handicapIndex.toFixed(1)}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setFeedSharingPrefs(prev => ({ ...prev, [player.id]: !isOptedIn }))}
                          className={`flex items-center gap-1.5 py-1 px-2.5 rounded-xl text-2xs font-bold transition cursor-pointer ${
                            isOptedIn
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${isOptedIn ? 'bg-white' : 'bg-slate-400'}`} />
                          {isOptedIn ? 'Sharing to Feed' : 'Opted Out'}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <p className="text-2xs text-slate-400 italic">
                  * Feed posts cleanly highlight real-time standings and player matchplay scores. Fines and minor penalty records are excluded.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Wizard Footer Navigation */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => setStep((prev) => Math.max(1, prev - 1) as any)}
            className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer ${
              step === 1 ? 'opacity-30 cursor-not-allowed text-slate-400' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          {step < 5 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 2) {
                  if (teamAPlayerIds.length === 0 || teamBPlayerIds.length === 0) {
                    setDraftValidationWarning(
                      `Both teams require drafted golfers. Please search and add at least 1 player to ${teamAName.trim() || 'Team A'} and 1 player to ${teamBName.trim() || 'Team B'}.`
                    );
                    return;
                  }
                }
                setDraftValidationWarning(null);
                setStep((prev) => Math.min(5, prev + 1) as any);
              }}
              className="py-2 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1 transition shadow-md shadow-emerald-200 cursor-pointer"
            >
              Next Step <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              id="launch-tournament-btn"
              onClick={handleFinishWizard}
              className="py-2.5 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1.5 transition shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" /> Launch Tournament & Live Leaderboard
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
