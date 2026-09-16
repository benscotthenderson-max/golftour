import React, { useState } from 'react';
import { 
  Tournament, 
  TournamentRound, 
  TournamentMatch, 
  TournamentRoundFormat,
  GolferUser,
  TournamentTeam 
} from '../types/golf';
import { MOCK_COURSES } from '../data/mockData';
import { StorageService } from '../utils/storage';
import { 
  X, 
  Users, 
  Plus, 
  Trash2, 
  Save, 
  Sparkles, 
  Shuffle, 
  Check, 
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TournamentRoundPairingsModalProps {
  tournament: Tournament;
  round: TournamentRound;
  allUsers?: GolferUser[];
  onClose: () => void;
  onSaveRound: (updatedRound: TournamentRound) => void;
}

export const TournamentRoundPairingsModal: React.FC<TournamentRoundPairingsModalProps> = ({
  tournament,
  round,
  allUsers = [],
  onClose,
  onSaveRound,
}) => {
  const teamA = tournament.teams[0] || { id: 'team-a', name: 'Team A', playerIds: [], color: '#059669', badgeIcon: '🦅' };
  const teamB = tournament.teams[1] || { id: 'team-b', name: 'Team B', playerIds: [], color: '#0284c7', badgeIcon: '🌊' };

  // Resolve player objects
  const userPool = allUsers.length > 0 ? allUsers : StorageService.getAllUsers();
  const teamAPool = teamA.playerIds
    .map(id => userPool.find(u => u.id === id) || {
      id,
      displayName: `Golfer ${id}`,
      username: id,
      handicapIndex: 10.0,
      playtomicLevel: 4.5,
    } as GolferUser);

  const teamBPool = teamB.playerIds
    .map(id => userPool.find(u => u.id === id) || {
      id,
      displayName: `Golfer ${id}`,
      username: id,
      handicapIndex: 10.0,
      playtomicLevel: 4.5,
    } as GolferUser);

  const [roundFormat, setRoundFormat] = useState<TournamentRoundFormat>(round.format || 'individual_matchplay');
  const [pointsAvailable, setPointsAvailable] = useState<number>(round.pointsAvailable || 4.0);

  // Initialize slots from existing round matches
  const [slots, setSlots] = useState<Array<{
    id: string;
    matchNumber: number;
    sideAPlayerIds: string[];
    sideBPlayerIds: string[];
  }>>(() => {
    if (round.matches && round.matches.length > 0) {
      return round.matches.map((m, idx) => ({
        id: m.id || `m-${idx + 1}`,
        matchNumber: m.matchNumber || idx + 1,
        sideAPlayerIds: m.sideA.playerIds || (m.sideA.players ? m.sideA.players.map(p => p.userId) : []),
        sideBPlayerIds: m.sideB.playerIds || (m.sideB.players ? m.sideB.players.map(p => p.userId) : []),
      }));
    }

    // Default seed
    const isSingles = round.format === 'individual_matchplay';
    const numFlights = isSingles ? Math.min(teamAPool.length, teamBPool.length) : Math.floor(Math.min(teamAPool.length, teamBPool.length) / 2);
    const initialSlots = [];
    for (let i = 0; i < Math.max(1, numFlights); i++) {
      if (isSingles) {
        initialSlots.push({
          id: `match-${round.id}-${i + 1}`,
          matchNumber: i + 1,
          sideAPlayerIds: [teamAPool[i]?.id || teamA.playerIds[0] || ''],
          sideBPlayerIds: [teamBPool[i]?.id || teamB.playerIds[0] || ''],
        });
      } else {
        initialSlots.push({
          id: `match-${round.id}-${i + 1}`,
          matchNumber: i + 1,
          sideAPlayerIds: [teamAPool[i * 2]?.id || '', teamAPool[i * 2 + 1]?.id || ''],
          sideBPlayerIds: [teamBPool[i * 2]?.id || '', teamBPool[i * 2 + 1]?.id || ''],
        });
      }
    }
    return initialSlots;
  });

  const isSingles = roundFormat === 'individual_matchplay';

  const handleAddFlight = () => {
    const nextNum = slots.length + 1;
    const a1 = teamAPool[0]?.id || '';
    const a2 = isSingles ? '' : (teamAPool[1]?.id || '');
    const b1 = teamBPool[0]?.id || '';
    const b2 = isSingles ? '' : (teamBPool[1]?.id || '');

    setSlots(prev => [
      ...prev,
      {
        id: `m-${round.id}-${Date.now()}-${nextNum}`,
        matchNumber: nextNum,
        sideAPlayerIds: isSingles ? [a1] : [a1, a2].filter(Boolean),
        sideBPlayerIds: isSingles ? [b1] : [b1, b2].filter(Boolean),
      }
    ]);
  };

  const handleRemoveFlight = (index: number) => {
    if (slots.length <= 1) return;
    setSlots(prev => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, matchNumber: i + 1 })));
  };

  const handleUpdatePlayer = (
    flightIndex: number,
    side: 'A' | 'B',
    playerSlotIndex: number,
    playerId: string
  ) => {
    setSlots(prev =>
      prev.map((slot, idx) => {
        if (idx !== flightIndex) return slot;
        if (side === 'A') {
          const arr = [...slot.sideAPlayerIds];
          arr[playerSlotIndex] = playerId;
          return { ...slot, sideAPlayerIds: arr };
        } else {
          const arr = [...slot.sideBPlayerIds];
          arr[playerSlotIndex] = playerId;
          return { ...slot, sideBPlayerIds: arr };
        }
      })
    );
  };

  const handleAutoSeedByHandicap = () => {
    const sortedA = [...teamAPool].sort((a, b) => a.handicapIndex - b.handicapIndex);
    const sortedB = [...teamBPool].sort((a, b) => a.handicapIndex - b.handicapIndex);

    if (isSingles) {
      const newSlots = sortedA.slice(0, 8).map((pA, idx) => {
        const pB = sortedB[idx] || sortedB[0];
        return {
          id: `seed-${round.id}-${idx + 1}`,
          matchNumber: idx + 1,
          sideAPlayerIds: [pA.id],
          sideBPlayerIds: [pB.id],
        };
      });
      setSlots(newSlots);
    } else {
      const newSlots = [];
      const numFlights = Math.min(4, Math.floor(Math.min(sortedA.length, sortedB.length) / 2));
      for (let i = 0; i < numFlights; i++) {
        newSlots.push({
          id: `seed-team-${round.id}-${i + 1}`,
          matchNumber: i + 1,
          sideAPlayerIds: [sortedA[i * 2]?.id || sortedA[0].id, sortedA[i * 2 + 1]?.id || sortedA[0].id],
          sideBPlayerIds: [sortedB[i * 2]?.id || sortedB[0].id, sortedB[i * 2 + 1]?.id || sortedB[0].id],
        });
      }
      setSlots(newSlots);
    }
  };

  const handleSaveAndApply = () => {
    // Generate TournamentMatch array
    const course = MOCK_COURSES.find(c => c.id === round.courseId) || MOCK_COURSES[0];

    const generatedMatches: TournamentMatch[] = slots.map((slot, sIdx) => {
      const matchNum = sIdx + 1;
      const existingMatch = (round.matches || []).find(m => m.matchNumber === matchNum);

      const sideAPlayers = slot.sideAPlayerIds
        .map(id => userPool.find(u => u.id === id))
        .filter(Boolean) as GolferUser[];

      const sideBPlayers = slot.sideBPlayerIds
        .map(id => userPool.find(u => u.id === id))
        .filter(Boolean) as GolferUser[];

      const sideALabel = sideAPlayers.length > 0
        ? sideAPlayers.map(p => p.displayName).join(' & ')
        : `${teamA.name} Player`;

      const sideBLabel = sideBPlayers.length > 0
        ? sideBPlayers.map(p => p.displayName).join(' & ')
        : `${teamB.name} Player`;

      const playingHandicapA = sideAPlayers.length > 0
        ? Math.round(sideAPlayers.reduce((acc, p) => acc + p.handicapIndex, 0) / sideAPlayers.length)
        : 10;

      const playingHandicapB = sideBPlayers.length > 0
        ? Math.round(sideBPlayers.reduce((acc, p) => acc + p.handicapIndex, 0) / sideBPlayers.length)
        : 10;

      return {
        id: existingMatch?.id || `match-${round.id}-${matchNum}`,
        tournamentId: tournament.id,
        roundId: round.id,
        matchNumber: matchNum,
        format: roundFormat,
        holesTotal: 18,
        holesCompleted: existingMatch ? existingMatch.holesCompleted : 0,
        status: existingMatch ? existingMatch.status : 'scheduled',
        holeResults: existingMatch ? existingMatch.holeResults : {},
        sideA: {
          teamId: teamA.id,
          teamName: teamA.name,
          teamColor: teamA.color,
          playerIds: slot.sideAPlayerIds,
          players: sideAPlayers.map(p => ({
            userId: p.id,
            displayName: p.displayName,
            username: p.username,
            photoURL: p.photoURL,
            handicapIndex: p.handicapIndex,
            playtomicLevel: p.playtomicLevel,
            teeColor: p.preferredTees || 'White',
            playingHandicap: Math.round(p.handicapIndex),
            confirmed: true,
          })),
          label: sideALabel,
          playingHandicap: playingHandicapA,
        },
        sideB: {
          teamId: teamB.id,
          teamName: teamB.name,
          teamColor: teamB.color,
          playerIds: slot.sideBPlayerIds,
          players: sideBPlayers.map(p => ({
            userId: p.id,
            displayName: p.displayName,
            username: p.username,
            photoURL: p.photoURL,
            handicapIndex: p.handicapIndex,
            playtomicLevel: p.playtomicLevel,
            teeColor: p.preferredTees || 'White',
            playingHandicap: Math.round(p.handicapIndex),
            confirmed: true,
          })),
          label: sideBLabel,
          playingHandicap: playingHandicapB,
        },
        currentStatusText: existingMatch?.currentStatusText || 'Scheduled',
        leadSide: existingMatch?.leadSide || 'tied',
        leadMargin: existingMatch?.leadMargin || 0,
        pointsAwarded: existingMatch?.pointsAwarded || { sideA: 0, sideB: 0 },
        winnerSide: existingMatch?.winnerSide || null,
        winnerTeamId: existingMatch?.winnerTeamId,
      };
    });

    const updatedRound: TournamentRound = {
      ...round,
      format: roundFormat,
      pointsAvailable: slots.length * 1.0,
      matches: generatedMatches,
    };

    try {
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
    } catch {
      // ignore
    }

    onSaveRound(updatedRound);
    onClose();
  };

  return (
    <div 
      id="round-pairings-modal"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        
        {/* HEADER */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950 border border-emerald-800 px-2 py-0.5 rounded">
                Day {round.dayNumber} Pairings
              </span>
              <span className="text-xs text-slate-400">
                {round.courseName}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-white mt-1 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-400" />
              Configure Daily Flights & Matchups
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTROLS BAR */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                Round Format
              </label>
              <select
                value={roundFormat}
                onChange={e => setRoundFormat(e.target.value as TournamentRoundFormat)}
                className="mt-1 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900"
              >
                <option value="better_ball_matchplay">Fourball Better Ball (2v2)</option>
                <option value="two_man_scramble">2-Man Team Scramble (2v2)</option>
                <option value="individual_matchplay">Championship Singles (1v1)</option>
                <option value="foursomes_alternate">Foursomes / Alternate Shot (2v2)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-4 sm:pt-0">
              <button
                type="button"
                onClick={handleAutoSeedByHandicap}
                className="py-1.5 px-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Shuffle className="w-3.5 h-3.5 text-slate-600" />
                <span>Auto-Seed by Index</span>
              </button>

              <button
                type="button"
                onClick={handleAddFlight}
                className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Flight</span>
              </button>
            </div>
          </div>
        </div>

        {/* FLIGHTS LIST */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {slots.map((slot, sIdx) => {
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
                    Flight #{sIdx + 1} ({isSingles ? '1v1 Singles' : '2v2 Team Match'})
                  </span>

                  {slots.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveFlight(sIdx)}
                      className="text-[11px] font-bold text-red-600 hover:text-red-700 transition cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  {/* Side A (Team A) */}
                  <div 
                    className="p-3 rounded-xl space-y-2 border transition-colors"
                    style={{
                      backgroundColor: `${teamA.color || '#059669'}14`,
                      borderColor: `${teamA.color || '#059669'}40`
                    }}
                  >
                    <div 
                      className="text-[11px] font-black uppercase flex items-center gap-1"
                      style={{ color: teamA.color || '#059669' }}
                    >
                      <span>{teamA.badgeIcon || '🦅'}</span> {teamA.name}
                    </div>

                    {/* Slot 1 Player */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-700">
                        {isSingles ? 'Golfer' : 'Player 1'}
                      </label>
                      <select
                        value={slot.sideAPlayerIds[0] || ''}
                        onChange={e => handleUpdatePlayer(sIdx, 'A', 0, e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:ring-1 focus:ring-emerald-500"
                      >
                        {teamAPool.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.displayName} (HCP {p.handicapIndex.toFixed(1)})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Slot 2 Player (if 2v2) */}
                    {!isSingles && (
                      <div className="space-y-1 pt-1">
                        <label className="text-[10px] font-bold text-slate-700">
                          Player 2
                        </label>
                        <select
                          value={slot.sideAPlayerIds[1] || ''}
                          onChange={e => handleUpdatePlayer(sIdx, 'A', 1, e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="">-- Select Partner --</option>
                          {teamAPool.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.displayName} (HCP {p.handicapIndex.toFixed(1)})
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
                      backgroundColor: `${teamB.color || '#0284c7'}14`,
                      borderColor: `${teamB.color || '#0284c7'}40`
                    }}
                  >
                    <div 
                      className="text-[11px] font-black uppercase flex items-center gap-1"
                      style={{ color: teamB.color || '#0284c7' }}
                    >
                      <span>{teamB.badgeIcon || '🌊'}</span> {teamB.name}
                    </div>

                    {/* Slot 1 Player */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-700">
                        {isSingles ? 'Golfer' : 'Player 1'}
                      </label>
                      <select
                        value={slot.sideBPlayerIds[0] || ''}
                        onChange={e => handleUpdatePlayer(sIdx, 'B', 0, e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:ring-1 focus:ring-sky-500"
                      >
                        {teamBPool.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.displayName} (HCP {p.handicapIndex.toFixed(1)})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Slot 2 Player (if 2v2) */}
                    {!isSingles && (
                      <div className="space-y-1 pt-1">
                        <label className="text-[10px] font-bold text-slate-700">
                          Player 2
                        </label>
                        <select
                          value={slot.sideBPlayerIds[1] || ''}
                          onChange={e => handleUpdatePlayer(sIdx, 'B', 1, e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:ring-1 focus:ring-sky-500"
                        >
                          <option value="">-- Select Partner --</option>
                          {teamBPool.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.displayName} (HCP {p.handicapIndex.toFixed(1)})
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

        {/* FOOTER ACTIONS */}
        <div className="p-4 bg-slate-900 text-white border-t border-slate-800 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            <span className="text-white font-black">{slots.length} Flights</span> scheduled • 1 pt each
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAndApply}
              className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition cursor-pointer flex items-center gap-1.5 shadow-md"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Apply & Save Pairings</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
