import React, { useState } from 'react';
import { GolferUser, GolfMatch, GolfCourse, GameType } from '../types/golf';
import { MOCK_COURSES } from '../data/mockData';
import { 
  Calendar, 
  Users, 
  MapPin, 
  Trophy, 
  Clock, 
  Plus, 
  Check, 
  Flag, 
  Sparkles,
  ShieldCheck,
  Zap,
  Play
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface MatchesHubProps {
  currentUser: GolferUser;
  matches: GolfMatch[];
  allUsers?: GolferUser[];
  onJoinMatch: (matchId: string) => void;
  onCreateMatch: (newMatch: GolfMatch) => void;
  onStartScoring?: (match: GolfMatch) => void;
}

export const MatchesHub: React.FC<MatchesHubProps> = ({
  currentUser,
  matches,
  allUsers = [],
  onJoinMatch,
  onCreateMatch,
  onStartScoring,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(MOCK_COURSES[0].id);
  const [gameType, setGameType] = useState<GameType>('better_ball');
  const [matchDate, setMatchDate] = useState('2026-09-15T09:00');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [levelMin, setLevelMin] = useState(1.0);
  const [levelMax, setLevelMax] = useState(7.0);
  const [notes, setNotes] = useState('');

  const handleJoinWithCelebration = (matchId: string) => {
    try {
      confetti({
        particleCount: 30,
        spread: 50,
        origin: { y: 0.6 }
      });
    } catch {
      // ignore
    }
    onJoinMatch(matchId);
  };

  const handleQuickHost = (chosenFormat: GameType = 'better_ball') => {
    const course = MOCK_COURSES.find(c => c.id === 'course-simola-estate') || MOCK_COURSES[0];
    
    // Pick other users if added, or create open slots
    const otherGolfers = allUsers.filter(u => u.id !== currentUser.id);
    const initialPlayers = [
      {
        userId: currentUser.id,
        displayName: currentUser.displayName,
        username: currentUser.username,
        photoURL: currentUser.photoURL,
        handicapIndex: currentUser.handicapIndex,
        playtomicLevel: currentUser.playtomicLevel,
        teeColor: currentUser.preferredTees || 'White',
        playingHandicap: Math.round(currentUser.handicapIndex),
        grossScore: 0,
        netScore: 0,
        confirmed: true,
        holeScores: [],
      }
    ];

    // If friends exist, auto-invite first 1-3 friends
    if (otherGolfers.length > 0 && (chosenFormat === 'better_ball' || chosenFormat === 'match_play')) {
      const companion = otherGolfers[0];
      initialPlayers.push({
        userId: companion.id,
        displayName: companion.displayName,
        username: companion.username,
        photoURL: companion.photoURL,
        handicapIndex: companion.handicapIndex,
        playtomicLevel: companion.playtomicLevel,
        teeColor: companion.preferredTees || 'White',
        playingHandicap: Math.round(companion.handicapIndex),
        grossScore: 0,
        netScore: 0,
        confirmed: true,
        holeScores: [],
      });
    }

    const newMatch: GolfMatch = {
      id: `match-live-${Date.now()}`,
      creatorId: currentUser.id,
      courseId: course.id,
      courseName: course.name,
      courseLocation: course.location,
      courseCover: course.coverImage,
      coursePar: course.par,
      holesCount: 18,
      gameType: chosenFormat,
      status: 'in_progress',
      scheduledTime: new Date().toISOString(),
      maxPlayers: chosenFormat === 'match_play' ? 2 : 4,
      levelMin: 1.0,
      levelMax: 7.0,
      isCompetitive: true,
      isPublic: true,
      notes: `${(chosenFormat || 'stroke_play').replace(/_/g, ' ').toUpperCase()} round at ${course.name}. Live hole-by-hole scoring ready.`,
      players: initialPlayers,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      confetti({
        particleCount: 35,
        spread: 60,
        origin: { y: 0.5 }
      });
    } catch {
      // ignore
    }

    onCreateMatch(newMatch);
    if (onStartScoring) {
      onStartScoring(newMatch);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const course = MOCK_COURSES.find(c => c.id === selectedCourseId) || MOCK_COURSES[0];

    const newMatch: GolfMatch = {
      id: `match-${Date.now()}`,
      creatorId: currentUser.id,
      courseId: course.id,
      courseName: course.name,
      courseLocation: course.location,
      courseCover: course.coverImage,
      coursePar: course.par,
      holesCount: 18,
      gameType,
      status: 'open',
      scheduledTime: new Date(matchDate).toISOString(),
      maxPlayers,
      levelMin,
      levelMax,
      isCompetitive: true,
      isPublic: true,
      notes: notes.trim() || `Open ${(gameType || 'stroke_play').replace(/_/g, ' ')} match at ${course.name}.`,
      players: [
        {
          userId: currentUser.id,
          displayName: currentUser.displayName,
          username: currentUser.username,
          photoURL: currentUser.photoURL,
          handicapIndex: currentUser.handicapIndex,
          playtomicLevel: currentUser.playtomicLevel,
          teeColor: currentUser.preferredTees || 'White',
          playingHandicap: Math.round(currentUser.handicapIndex),
          grossScore: 0,
          netScore: 0,
          confirmed: true,
          holeScores: [],
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onCreateMatch(newMatch);
    setShowCreateModal(false);

    try {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch {
      // ignore
    }
  };

  return (
    <div id="matches-hub-container" className="space-y-4 pb-24">
      {/* Top Banner with Action */}
      <div className="bg-gradient-to-r from-[#131923] via-[#1A2230] to-[#131923] border border-white/[0.08] rounded-2xl p-4 space-y-3 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-black text-emerald-400 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Playtomic Real-Time Scoring
            </div>
            <h3 className="text-base font-black text-white mt-0.5">Active Matches & Live Scorecards</h3>
            <p className="text-xs text-slate-400 mt-0.5">WHS Handicap stroke dot allocation & Firestore live syncing.</p>
          </div>

          <button
            id="create-match-trigger-btn"
            onClick={() => setShowCreateModal(true)}
            className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs transition shadow-[0_0_14px_rgba(16,185,129,0.3)] flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" /> Host Match
          </button>
        </div>

        {/* Quick Launch Round Buttons */}
        <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-1 overflow-x-auto text-2xs">
          <span className="text-slate-400 font-bold shrink-0">⚡️ Instant 18-Hole Match:</span>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => handleQuickHost('better_ball')}
              className="py-1 px-2.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white font-bold transition shrink-0 cursor-pointer border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
            >
              Better Ball (2v2)
            </button>
            <button
              onClick={() => handleQuickHost('match_play')}
              className="py-1 px-2.5 rounded-lg bg-[#0D1117] hover:bg-[#151D29] text-emerald-300 font-bold transition shrink-0 cursor-pointer border border-white/[0.08]"
            >
              Singles (1v1)
            </button>
            <button
              onClick={() => handleQuickHost('stableford')}
              className="py-1 px-2.5 rounded-lg bg-[#0D1117] hover:bg-[#151D29] text-slate-200 font-bold transition shrink-0 cursor-pointer border border-white/[0.08]"
            >
              Stableford
            </button>
            <button
              onClick={() => handleQuickHost('scramble')}
              className="py-1 px-2.5 rounded-lg bg-[#0D1117] hover:bg-[#151D29] text-amber-400 font-bold transition shrink-0 cursor-pointer border border-white/[0.08]"
            >
              Scramble
            </button>
          </div>
        </div>
      </div>

      {/* Match Cards or Empty State */}
      <div className="space-y-4">
        {matches.length === 0 ? (
          <div className="bg-[#131923] border border-white/[0.08] rounded-3xl p-8 text-center space-y-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
              <Calendar className="w-8 h-8 text-emerald-400" />
            </div>

            <div className="space-y-1.5 max-w-sm mx-auto">
              <h3 className="text-base font-black text-white">No Active Matches Scheduled</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Host a competitive or friendly match on Simola, Knysna, or Plettenberg Bay. Track live hole-by-hole gross and net scorecards with automatic WHS stroke dot allocation.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs transition shadow-[0_0_16px_rgba(16,185,129,0.3)] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Host New Match</span>
              </button>
              <button
                onClick={() => handleQuickHost('better_ball')}
                className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-[#1B2330] hover:bg-[#242F42] border border-white/[0.08] text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Play className="w-4 h-4 text-emerald-400" />
                <span>Start Simola Better Ball</span>
              </button>
            </div>
          </div>
        ) : (
          matches.map(match => {
            const isPlayerJoined = match.players.some(p => p.userId === currentUser.id);
            const spotsLeft = match.maxPlayers - match.players.length;

            return (
              <div
                key={match.id}
                id={`match-card-${match.id}`}
                className="bg-[#131923] border border-white/[0.08] rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.35)] hover:border-white/[0.14] transition"
              >
                {/* Image Banner Header */}
                <div className="relative h-28 w-full overflow-hidden">
                  <img
                    src={match.courseCover}
                    alt={match.courseName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#131923] via-[#131923]/50 to-transparent" />

                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="bg-[#090C10]/80 backdrop-blur-xs text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase px-2 py-0.5 rounded">
                      {(match.gameType || 'stroke_play').replace(/_/g, ' ')}
                    </span>
                    <span className="bg-[#090C10]/80 backdrop-blur-xs text-slate-300 text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1 border border-white/[0.06]">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {new Date(match.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="absolute top-3 right-3 bg-emerald-600/90 border border-emerald-500/30 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                    {match.matchFormat || 'Matchplay'}
                  </div>

                  <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
                    <div>
                      <h4 className="text-base font-black text-white leading-tight">{match.courseName}</h4>
                      <p className="text-xs text-slate-300 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-emerald-400" /> {match.courseLocation}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Match Details Body */}
                <div className="p-4 space-y-3">
                  {match.notes && (
                    <p className="text-xs text-slate-300 italic">"{match.notes}"</p>
                  )}

                  {/* Players in Match */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2">
                      <span>Players ({match.players.length}/{match.maxPlayers})</span>
                      <span className="text-emerald-400 font-semibold">{spotsLeft > 0 ? `${spotsLeft} spot${spotsLeft > 1 ? 's' : ''} left` : 'Full Roster'}</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {match.players.map(player => (
                        <div
                          key={player.userId}
                          className="bg-[#0D1117] border border-white/[0.08] p-2 rounded-xl flex items-center gap-2 shadow-inner"
                        >
                          <img
                            src={player.photoURL}
                            alt={player.displayName}
                            className="w-8 h-8 rounded-full object-cover border border-white/[0.1] shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">{player.displayName}</div>
                            <div className="text-[10px] text-emerald-400 font-bold font-mono tabular-nums">HCP {player.handicapIndex.toFixed(1)}</div>
                          </div>
                        </div>
                      ))}

                      {/* Render empty spots */}
                      {Array.from({ length: spotsLeft }).map((_, idx) => (
                        <div
                          key={`empty-${idx}`}
                          className="bg-[#0D1117]/50 border border-dashed border-white/[0.1] p-2 rounded-xl flex flex-col items-center justify-center text-slate-400 text-xs min-h-[52px]"
                        >
                          <Users className="w-4 h-4 mb-0.5 text-slate-500" />
                          <span className="text-[10px] font-medium">Open Spot</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="pt-2 flex items-center justify-between gap-2 border-t border-white/[0.06]">
                    <div className="text-xs text-slate-400">
                      Host: <strong className="text-white">{match.players[0]?.displayName}</strong>
                    </div>

                    <div className="flex items-center gap-2">
                      {onStartScoring && (
                        <button
                          id={`score-live-btn-${match.id}`}
                          onClick={() => onStartScoring(match)}
                          className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                        >
                          <Flag className="w-3.5 h-3.5 text-white" />
                          <span>Play & Score Live</span>
                        </button>
                      )}

                      {isPlayerJoined ? (
                        <span className="py-2 px-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-black flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Playing
                        </span>
                      ) : spotsLeft > 0 ? (
                        <button
                          id={`join-match-${match.id}`}
                          onClick={() => handleJoinWithCelebration(match.id)}
                          className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-md shadow-emerald-950/20 cursor-pointer"
                        >
                          Join
                        </button>
                      ) : (
                        <span className="py-2 px-2.5 rounded-xl bg-[#0D1117] text-slate-500 text-xs font-semibold border border-white/[0.06]">
                          Full
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Host Match Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#131923] border border-white/[0.12] rounded-2xl w-full max-w-md p-5 text-white space-y-4 shadow-[0_20px_60px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="font-black text-white text-base">Host an Open Golf Match</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300">Golf Course</label>
                <select
                  value={selectedCourseId}
                  onChange={e => setSelectedCourseId(e.target.value)}
                  className="w-full mt-1 bg-[#0D1117] border border-white/[0.1] rounded-xl px-3 py-2 text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {MOCK_COURSES.map(course => (
                    <option key={course.id} value={course.id} className="bg-[#0D1117] text-white">
                      {course.name} ({course.city || course.location})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300">Format</label>
                  <select
                    value={gameType}
                    onChange={e => setGameType(e.target.value as GameType)}
                    className="w-full mt-1 bg-[#0D1117] border border-white/[0.1] rounded-xl px-3 py-2 text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="better_ball" className="bg-[#0D1117] text-white">Better Ball (2v2)</option>
                    <option value="match_play" className="bg-[#0D1117] text-white">Match Play (1v1)</option>
                    <option value="stableford" className="bg-[#0D1117] text-white">Individual Stableford</option>
                    <option value="scramble" className="bg-[#0D1117] text-white">Team Scramble</option>
                    <option value="stroke_play" className="bg-[#0D1117] text-white">Stroke Play</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300">Max Players</label>
                  <select
                    value={maxPlayers}
                    onChange={e => setMaxPlayers(Number(e.target.value))}
                    className="w-full mt-1 bg-[#0D1117] border border-white/[0.1] rounded-xl px-3 py-2 text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value={2} className="bg-[#0D1117] text-white">2 Players (Singles)</option>
                    <option value={3} className="bg-[#0D1117] text-white">3 Players (Threesome)</option>
                    <option value={4} className="bg-[#0D1117] text-white">4 Players (4-Ball)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Tee Time</label>
                <input
                  type="datetime-local"
                  value={matchDate}
                  onChange={e => setMatchDate(e.target.value)}
                  className="w-full mt-1 bg-[#0D1117] border border-white/[0.1] rounded-xl px-3 py-2 text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Notes / Rules</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. 18 holes walking, post-round clubhouse drinks."
                  rows={2}
                  className="w-full mt-1 bg-[#0D1117] border border-white/[0.1] rounded-xl px-3 py-2 text-xs font-medium text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="py-2 px-4 rounded-xl border border-white/[0.1] text-xs font-bold text-slate-300 hover:bg-white/[0.06] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-black shadow-[0_0_14px_rgba(16,185,129,0.3)] cursor-pointer"
                >
                  Publish Match
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
