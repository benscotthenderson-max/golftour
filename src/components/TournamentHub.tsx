import React, { useState, useEffect } from 'react';
import { 
  Tournament, 
  TournamentRound, 
  TournamentMatch, 
  TournamentTeam, 
  GolferUser,
  PlayerMvpRankingEntry
} from '../types/golf';
import { 
  recalculateTournamentLeaderboard,
  isTournamentAllMatchesCompleted
} from '../utils/tournamentEngine';
import { StorageService } from '../utils/storage';
import { TournamentFeedService } from '../services/tournamentFeedService';
import { 
  Trophy, 
  Calendar, 
  MapPin, 
  Users, 
  Flag, 
  Sparkles, 
  Plus, 
  ChevronRight, 
  CheckCircle2, 
  Play, 
  BarChart3, 
  Award, 
  RefreshCw, 
  Clock, 
  Shield, 
  Info,
  Flame,
  Check,
  RotateCcw,
  Zap,
  Sliders,
  Settings2,
  Edit3,
  Eye,
  Camera,
  Share2,
  X,
  Loader2,
  ArrowLeft,
  Search
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { SupabaseService, isUserInTournament } from '../services/supabaseService';
import { TournamentCreationWizard } from './TournamentCreationWizard';
import { TournamentMatchScorecardModal } from './TournamentMatchScorecardModal';
import { TournamentRoundPairingsModal } from './TournamentRoundPairingsModal';
import { TournamentPlayerDashboardModal } from './TournamentPlayerDashboardModal';
import { FinesRulesSection } from './FinesRulesSection';
import { TournamentSocialFeed } from './TournamentSocialFeed';
import { TournamentFeedPostModal } from './TournamentFeedPostModal';
import { TournamentClinchProgressBar } from './TournamentClinchProgressBar';
import { formatPlayerInitialAndSurname } from '../utils/scorecardCalculations';

// Color helper for tinting backgrounds
function hexToRgba(hex?: string, alpha = 1): string {
  if (!hex || !hex.startsWith('#')) return `rgba(5, 150, 105, ${alpha})`;
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

// Helper to extract uppercase player display names (stacked broadcast style with Initial and Surname)
function formatPlayerNames(side: any): string[] {
  if (side.players && side.players.length > 0) {
    return side.players.map((p: any) => {
      return formatPlayerInitialAndSurname(p.displayName).toUpperCase();
    });
  }
  if (side.label) {
    const rawNames = side.label.split(/\s*(?:&|\band\b|\/)\s*/i);
    return rawNames.map((n: string) => {
      return formatPlayerInitialAndSurname(n).toUpperCase();
    });
  }
  return ['PLAYER'];
}

// Helper to determine match margin text (e.g., 3&2, 2UP, 1UP, TIED)
function getMatchMarginText(match: TournamentMatch, side: 'sideA' | 'sideB'): string {
  const holesPlayed = Object.keys(match.holeResults || {}).length;
  const isMatchOver = match.status === 'completed';

  if (isMatchOver) {
    if (match.winnerSide === 'halved') {
      return 'TIED';
    }
    if (match.winnerSide === side) {
      const statusText = (match.currentStatusText || '').trim();
      const andMatch = statusText.match(/(\d+)\s*&\s*(\d+)/i);
      if (andMatch) {
        return `${andMatch[1]}&${andMatch[2]}`;
      }
      const upMatch = statusText.match(/(\d+)\s*UP/i);
      if (upMatch) {
        return `${upMatch[1]}UP`;
      }
      if (match.leadMargin && holesPlayed < 18) {
        return `${match.leadMargin}&${18 - holesPlayed}`;
      }
      if (match.leadMargin) {
        return `${match.leadMargin}UP`;
      }
      return 'WON';
    }
    return '';
  }

  if (holesPlayed > 0) {
    if (match.leadSide === 'tied' || match.leadMargin === 0 || !match.leadSide) {
      return 'TIED';
    }
    if (match.leadSide === side) {
      return `${match.leadMargin}UP`;
    }
    return '';
  }

  return '';
}

interface TournamentHubProps {
  currentUser: GolferUser;
  allUsers?: GolferUser[];
  onOpenPlayerProfile?: (userId: string) => void;
  onOpenVerifyModal?: (featureContext?: string) => void;
}

export const TournamentHub: React.FC<TournamentHubProps> = ({
  currentUser,
  allUsers = [],
  onOpenPlayerProfile,
  onOpenVerifyModal,
}) => {
  const [userTournaments, setUserTournaments] = useState<Tournament[]>(() => {
    return StorageService.getUserTournaments(currentUser.id).filter(t => isUserInTournament(t, currentUser));
  });
  // Selected tournament for detailed view. Initialized to null so the Tourney tab opens the Hub dashboard!
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [isLoadingTournaments, setIsLoadingTournaments] = useState<boolean>(false);
  const [hubFilter, setHubFilter] = useState<'all' | 'live' | 'upcoming' | 'completed'>('all');
  const [hubSearch, setHubSearch] = useState<string>('');

  // Helper to determine the golfer's role in a tournament
  const getUserRoleInTournament = (tour: Tournament, userId: string): { label: string; badgeColor: string; isCreator: boolean } => {
    if (tour.creatorId === userId || tour.organizerId === userId) {
      return { label: 'Host & Director', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40', isCreator: true };
    }
    const teamA = tour.teams?.[0];
    const teamB = tour.teams?.[1];
    if (teamA?.captainId === userId) {
      return { label: `Captain • ${teamA.name}`, badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', isCreator: false };
    }
    if (teamB?.captainId === userId) {
      return { label: `Captain • ${teamB.name}`, badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40', isCreator: false };
    }
    if (teamA?.playerIds?.includes(userId)) {
      return { label: `Player • ${teamA.name}`, badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', isCreator: false };
    }
    if (teamB?.playerIds?.includes(userId)) {
      return { label: `Player • ${teamB.name}`, badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40', isCreator: false };
    }
    return { label: 'Participant', badgeColor: 'bg-slate-500/20 text-slate-300 border-slate-500/40', isCreator: false };
  };

  // Helper to determine effective tournament status.
  // When every hole has been entered and finalized for every match in a tournament,
  // it automatically transitions to 'completed'.
  const getEffectiveTournamentStatus = (t: Tournament): 'draft' | 'registration' | 'live' | 'completed' => {
    if (t.status === 'completed' || isTournamentAllMatchesCompleted(t)) {
      return 'completed';
    }
    return t.status;
  };

  // Normalizes tournaments, ensuring any tournament whose matches are all finalized transitions to 'completed'
  const normalizeTournaments = (tournaments: Tournament[]): Tournament[] => {
    return tournaments.map(t => {
      if (t.status !== 'completed' && isTournamentAllMatchesCompleted(t)) {
        const completedTour: Tournament = {
          ...t,
          status: 'completed',
          rounds: t.rounds?.map(r => ({
            ...r,
            status: 'completed',
            matches: r.matches?.map(m => ({ ...m, status: 'completed' as const })) || [],
          })) || [],
        };
        StorageService.saveTournament(completedTour, currentUser.id);
        SupabaseService.upsertTournament(completedTour, currentUser.id).catch(() => {});
        return completedTour;
      }
      return t;
    });
  };

  // Fetch all tournaments where user is creator OR participant/drafted player from Supabase
  useEffect(() => {
    let isMounted = true;
    const local = normalizeTournaments(StorageService.getUserTournaments(currentUser.id).filter(t => isUserInTournament(t, currentUser)));
    setUserTournaments(local);

    setIsLoadingTournaments(true);
    SupabaseService.fetchUserTournaments(currentUser)
      .then((remoteTournaments) => {
        if (!isMounted) return;
        const validTournaments = normalizeTournaments(remoteTournaments.filter(t => isUserInTournament(t, currentUser)));
        setUserTournaments(validTournaments);
        // Only update active tournament if the user is already viewing one:
        setTournament(prev => {
          if (!prev) return null;
          const updated = validTournaments.find(t => t.id === prev.id);
          return updated || prev;
        });
      })
      .catch(err => {
        console.warn('[TournamentHub] Failed to fetch user tournaments from Supabase:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingTournaments(false);
      });

    // Real-time listener for tournament changes (live scoring, drafts, pairings)
    const unsubscribe = SupabaseService.subscribeToTournaments((incomingTour) => {
      if (!isMounted) return;
      if (isUserInTournament(incomingTour, currentUser)) {
        const updatedTour = (incomingTour.status !== 'completed' && isTournamentAllMatchesCompleted(incomingTour))
          ? {
              ...incomingTour,
              status: 'completed' as const,
              rounds: incomingTour.rounds?.map(r => ({
                ...r,
                status: 'completed' as const,
                matches: r.matches?.map(m => ({ ...m, status: 'completed' as const })) || [],
              })) || [],
            }
          : incomingTour;

        setUserTournaments(prev => {
          const exists = prev.some(t => t.id === updatedTour.id);
          if (exists) {
            return prev.map(t => (t.id === updatedTour.id ? updatedTour : t));
          } else {
            return [updatedTour, ...prev];
          }
        });
        setTournament(prev => {
          if (prev?.id === updatedTour.id) {
            return updatedTour;
          }
          if (!prev) return updatedTour;
          return prev;
        });
        StorageService.saveTournament(updatedTour, currentUser.id);
      }
    });

    // Background polling fallback for seamless multi-device live scoring
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible' && isMounted) {
        SupabaseService.fetchUserTournaments(currentUser)
          .then((remoteTournaments) => {
            if (!isMounted) return;
            const validTournaments = normalizeTournaments(remoteTournaments.filter(t => isUserInTournament(t, currentUser)));
            setUserTournaments(validTournaments);
            setTournament(prev => {
              if (!prev) return null;
              const updated = validTournaments.find(t => t.id === prev.id);
              return updated || prev;
            });
          })
          .catch(() => {});
      }
    }, 10000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isMounted) {
        SupabaseService.fetchUserTournaments(currentUser)
          .then((remoteTournaments) => {
            if (!isMounted) return;
            const validTournaments = normalizeTournaments(remoteTournaments.filter(t => isUserInTournament(t, currentUser)));
            setUserTournaments(validTournaments);
            setTournament(prev => {
              if (!prev) return null;
              const updated = validTournaments.find(t => t.id === prev.id);
              return updated || prev;
            });
          })
          .catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser.id]);

  const [selectedRoundTab, setSelectedRoundTab] = useState<number>(1);
  const [activeSubView, setActiveSubView] = useState<'matches' | 'leaderboard' | 'feed' | 'rules'>('matches');
  const [isFeedPostModalOpen, setIsFeedPostModalOpen] = useState(false);
  const [isFeedSharingModalOpen, setIsFeedSharingModalOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedMatchModal, setSelectedMatchModal] = useState<TournamentMatch | null>(null);
  const [selectedScorecardMatch, setSelectedScorecardMatch] = useState<{
    match: TournamentMatch;
    round: TournamentRound;
  } | null>(null);
  const [editingRoundPairings, setEditingRoundPairings] = useState<TournamentRound | null>(null);
  const [selectedPlayerForDashboard, setSelectedPlayerForDashboard] = useState<PlayerMvpRankingEntry | GolferUser | null>(null);

  const handleTogglePlayerFeedSharing = (userId: string) => {
    if (!tournament) return;
    const currentPref = tournament.feedSharingPreferences?.[userId] ?? true;
    const nextPref = !currentPref;

    StorageService.setPlayerFeedShareOptIn(tournament.id, userId, nextPref);

    setTournament(prev => {
      if (!prev) return prev;
      const updatedPrefs = {
        ...(prev.feedSharingPreferences || {}),
        [userId]: nextPref,
      };
      const updatedTour: Tournament = {
        ...prev,
        feedSharingPreferences: updatedPrefs,
        updatedAt: new Date().toISOString(),
      };
      StorageService.saveTournament(updatedTour, currentUser.id);
      SupabaseService.upsertTournament(updatedTour, currentUser.id).catch(err => {
        console.warn('[TournamentHub] Feed share preference sync error:', err);
      });
      return updatedTour;
    });
  };

  const handleLaunchWizard = () => {
    if (!currentUser.emailVerified) {
      if (onOpenVerifyModal) {
        onOpenVerifyModal('create tournaments');
      }
      return;
    }
    setIsWizardOpen(true);
  };

  // Synchronize real player names and leaderboard stats whenever tournament or allUsers change
  useEffect(() => {
    if (tournament) {
      const refreshed = recalculateTournamentLeaderboard(tournament, allUsers);
      setTournament(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          leaderboard: refreshed,
        };
      });
    }
  }, [allUsers]);

  const handleSaveRoundPairings = (updatedRound: TournamentRound) => {
    setTournament(prevTour => {
      if (!prevTour) return prevTour;
      const updatedRounds = prevTour.rounds.map(r => (r.id === updatedRound.id ? updatedRound : r));
      const updatedTour: Tournament = {
        ...prevTour,
        rounds: updatedRounds,
        updatedAt: new Date().toISOString(),
      };
      updatedTour.leaderboard = recalculateTournamentLeaderboard(updatedTour, allUsers);
      StorageService.saveTournament(updatedTour, currentUser.id);
      setUserTournaments(prev => prev.map(t => (t.id === updatedTour.id ? updatedTour : t)));

      // Sync to Supabase
      SupabaseService.upsertTournament(updatedTour, currentUser.id).catch(err => {
        console.warn('[TournamentHub] Failed to sync round pairings to Supabase:', err);
      });

      return updatedTour;
    });
    setEditingRoundPairings(null);
  };

  const handleUpdateMatchScorecard = (updatedMatch: TournamentMatch) => {
    setTournament(prevTour => {
      if (!prevTour) return prevTour;
      const updatedRounds = prevTour.rounds.map(r => {
        if (r.id !== updatedMatch.roundId) return r;
        const newMatches = r.matches.map(m => m.id === updatedMatch.id ? updatedMatch : m);
        const isRoundDone = newMatches.length > 0 && newMatches.every(m => {
          const holesTotal = m.holesTotal || 18;
          const holeResultsCount = m.holeResults ? Object.keys(m.holeResults).length : 0;
          return m.status === 'completed' || m.isDecided || holeResultsCount >= holesTotal || m.holesCompleted >= holesTotal;
        });
        return {
          ...r,
          matches: newMatches,
          status: isRoundDone ? ('completed' as const) : r.status,
        };
      });

      let updatedTour: Tournament = {
        ...prevTour,
        rounds: updatedRounds,
        updatedAt: new Date().toISOString(),
      };

      // Automatic Completion Status: When every hole has been entered and finalized for every match in a tournament,
      // automatically transition the tournament to 'completed'
      if (isTournamentAllMatchesCompleted(updatedTour)) {
        updatedTour.status = 'completed';
        updatedTour.rounds = updatedTour.rounds.map(r => ({
          ...r,
          status: 'completed' as const,
          matches: r.matches.map(m => ({ ...m, status: 'completed' as const })),
        }));
      }

      updatedTour.leaderboard = recalculateTournamentLeaderboard(updatedTour, allUsers);
      StorageService.saveTournament(updatedTour, currentUser.id);
      setUserTournaments(prev => prev.map(t => (t.id === updatedTour.id ? updatedTour : t)));

      // Sync updated scorecard to Supabase in real-time
      SupabaseService.upsertTournament(updatedTour, currentUser.id).catch(err => {
        console.warn('[TournamentHub] Failed to sync match scorecard update to Supabase:', err);
      });

      const curRound = updatedTour.rounds.find(r => r.id === updatedMatch.roundId) || selectedScorecardMatch?.round;
      if (curRound) {
        TournamentFeedService.syncLiveMatchFeed(updatedTour, curRound, updatedMatch, allUsers);
      }

      if (selectedScorecardMatch && curRound) {
        setSelectedScorecardMatch({ match: updatedMatch, round: curRound });
      }

      return updatedTour;
    });
  };

  const handleTournamentCreated = async (newTournament: Tournament) => {
    // 1. Immediate UI update
    setTournament(newTournament);
    setUserTournaments(prev => [newTournament, ...prev.filter(t => t.id !== newTournament.id)]);
    StorageService.saveTournament(newTournament, currentUser.id);
    setIsWizardOpen(false);
    setSelectedRoundTab(1);

    // 2. Persist row to Supabase tournaments table
    try {
      const res = await SupabaseService.upsertTournament(newTournament, currentUser.id);
      if (res.error) {
        console.warn('[TournamentHub] Supabase upsert returned error:', res.error);
      } else {
        console.log('[TournamentHub] Successfully synced tournament to Supabase:', newTournament.id);
      }
    } catch (err) {
      console.error('[TournamentHub] Failed to save tournament to Supabase:', err);
    }

    try {
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.5 }
      });
    } catch {
      // ignore
    }
  };

  const handleSelectTournament = (selected: Tournament) => {
    setTournament(selected);
    StorageService.saveTournament(selected, currentUser.id);
    setSelectedRoundTab(1);
  };

  const handleResetTournament = async () => {
    if (!tournament) return;
    const tourIdToDelete = tournament.id;
    const isHost = tournament.creatorId === currentUser.id || tournament.organizerId === currentUser.id;

    // Remove locally
    StorageService.deleteTournament(tourIdToDelete, currentUser.id);
    const remaining = userTournaments.filter(t => t.id !== tourIdToDelete);
    setUserTournaments(remaining);
    setTournament(null);

    // If host/creator, delete from Supabase so all participants see removal
    if (isHost) {
      try {
        await SupabaseService.deleteTournament(tourIdToDelete, currentUser.id);
      } catch (err) {
        console.warn('[TournamentHub] Supabase deleteTournament error:', err);
      }
    }
  };

  // When no specific tournament is selected, render the Central Tournament Hub Dashboard
  if (!tournament) {
    const activeCount = userTournaments.filter(t => getEffectiveTournamentStatus(t) === 'live').length;
    const completedCount = userTournaments.filter(t => getEffectiveTournamentStatus(t) === 'completed').length;
    const upcomingCount = userTournaments.filter(t => {
      const st = getEffectiveTournamentStatus(t);
      return st === 'draft' || st === 'registration';
    }).length;

    const filteredTournaments = userTournaments.filter(t => {
      const effStatus = getEffectiveTournamentStatus(t);
      if (hubFilter === 'live' && effStatus !== 'live') return false;
      if (hubFilter === 'completed' && effStatus !== 'completed') return false;
      if (hubFilter === 'upcoming' && effStatus !== 'draft' && effStatus !== 'registration') return false;

      if (hubSearch.trim()) {
        const q = hubSearch.toLowerCase().trim();
        const matchName = (t.name || '').toLowerCase().includes(q) || 
          (t.location || '').toLowerCase().includes(q) || 
          (t.tagline && t.tagline.toLowerCase().includes(q)) ||
          t.teams?.some(tm => (tm.name || '').toLowerCase().includes(q) || (tm.shortCode || '').toLowerCase().includes(q));
        if (!matchName) return false;
      }
      return true;
    });

    return (
      <div id="tournament-hub-dashboard" className="space-y-4 pb-24">
        {/* Hub Hero & Action Header */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-900 border border-emerald-800 text-white p-6 sm:p-7 shadow-lg">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-900/60 border border-emerald-700/50 px-3 py-1 rounded-full">
                <Trophy className="w-3.5 h-3.5" />
                <span>Championship & Matchplay Hub</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Tournament Hub
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                Multi-day championship match play, team captains, live hole-by-hole scoring, and real-time clinch leaderboards.
              </p>
            </div>

            <button
              id="create-tournament-hub-btn"
              onClick={handleLaunchWizard}
              className="py-3 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition shadow-lg shadow-emerald-900/50 flex items-center justify-center gap-2 cursor-pointer shrink-0 self-start sm:self-center"
            >
              <Plus className="w-4 h-4" />
              <span>Create Tournament</span>
            </button>
          </div>
        </div>

        {/* Loading Indicator if fetching from Supabase and none loaded yet */}
        {isLoadingTournaments && userTournaments.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 space-y-3 text-center bg-white border border-slate-200 rounded-3xl shadow-xs">
            <Loader2 className="w-7 h-7 text-emerald-600 animate-spin" />
            <p className="text-xs font-bold text-slate-700">Checking your tournaments...</p>
          </div>
        )}

        {/* Empty State when user has no tournaments */}
        {userTournaments.length === 0 && !isLoadingTournaments ? (
          <div id="tournament-hub-empty-container" className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 text-center space-y-5 shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center border border-emerald-100 shadow-2xs">
                <Trophy className="w-8 h-8 text-emerald-600" />
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-lg font-black text-slate-900">No Tournaments Found</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  You haven't created or been drafted into any tournaments yet. Launch the Tournament Architect Wizard to set up custom team rosters, schedule multi-format rounds across days, and track live team clinch points.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-center">
                <button
                  id="open-tournament-wizard-btn"
                  onClick={handleLaunchWizard}
                  className="w-full sm:w-auto py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition shadow-md shadow-emerald-200 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Launch Tournament Architect Wizard</span>
                </button>
              </div>
            </div>

            {/* Feature Highlights Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-1.5 shadow-2xs">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  ⛳️
                </div>
                <h4 className="font-bold text-slate-900">Multi-Format Rounds</h4>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Better Ball, 2-Man Scramble, Alternate Shot, and Singles Matchplay across championship venues.
                </p>
              </div>

              <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-1.5 shadow-2xs">
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold">
                  📊
                </div>
                <h4 className="font-bold text-slate-900">1-Point Scoring Rule</h4>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  1.0 Point for win, 0.5 for tie, with automatic clinch threshold metrics updated in real-time.
                </p>
              </div>

              <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-1.5 shadow-2xs">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                  🏆
                </div>
                <h4 className="font-bold text-slate-900">Live Dynamic Leaderboard</h4>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Track team standings, individual MVP rankings, hole-by-hole results, and match statuses.
                </p>
              </div>
            </div>
          </div>
        ) : userTournaments.length > 0 && (
          <div className="space-y-4">
            {/* Filter Tabs & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-xs overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setHubFilter('all')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    hubFilter === 'all'
                      ? 'bg-emerald-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({userTournaments.length})
                </button>
                <button
                  type="button"
                  onClick={() => setHubFilter('live')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    hubFilter === 'live'
                      ? 'bg-emerald-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live ({activeCount})
                </button>
                <button
                  type="button"
                  onClick={() => setHubFilter('upcoming')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    hubFilter === 'upcoming'
                      ? 'bg-emerald-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Setup / Draft ({upcomingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setHubFilter('completed')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    hubFilter === 'completed'
                      ? 'bg-emerald-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Completed ({completedCount})
                </button>
              </div>

              {userTournaments.length > 2 && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={hubSearch}
                    onChange={e => setHubSearch(e.target.value)}
                    placeholder="Search tournaments..."
                    className="w-full sm:w-56 bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                  />
                </div>
              )}
            </div>

            {/* Tournaments Grid */}
            {filteredTournaments.length === 0 ? (
              <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
                <p className="text-xs font-bold text-slate-700">No tournaments match this filter</p>
                <p className="text-xs text-slate-400">Try switching filter tabs or clearing your search query.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTournaments.map(t => {
                  const role = getUserRoleInTournament(t, currentUser.id);
                  const teamA = t.teams?.[0];
                  const teamB = t.teams?.[1];
                  const teamAPoints = t.leaderboard?.teamStandings?.find(st => st.teamId === teamA?.id)?.points ?? 0;
                  const teamBPoints = t.leaderboard?.teamStandings?.find(st => st.teamId === teamB?.id)?.points ?? 0;
                  const clinchPts = t.clinchPoints || 8.5;
                  const effStatus = getEffectiveTournamentStatus(t);
                  const isLive = effStatus === 'live';
                  const isCompleted = effStatus === 'completed';

                  return (
                    <div
                      key={t.id}
                      id={`tournament-card-${t.id}`}
                      onClick={() => handleSelectTournament(t)}
                      className="group bg-white border border-slate-200 rounded-3xl overflow-hidden hover:border-emerald-500 hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between"
                    >
                      {/* Card Cover Banner */}
                      <div className="relative h-36 bg-slate-950 overflow-hidden">
                        <img
                          src={t.coverImage || 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?auto=format&fit=crop&w=1200&q=80'}
                          alt={t.name}
                          className="w-full h-full object-cover opacity-40 group-hover:scale-105 transition duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

                        {/* Top Badges */}
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border backdrop-blur-xs ${role.badgeColor}`}>
                              {role.label}
                            </span>
                            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-xs">
                              {(t.name || t.formatType?.replace(/_/g, ' ') || 'Matchplay')}
                            </span>
                          </div>

                          <div>
                            {isLive ? (
                              <span className="bg-emerald-500 text-slate-950 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-pulse" />
                                Live
                              </span>
                            ) : isCompleted ? (
                              <span className="bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                                Completed
                              </span>
                            ) : (
                              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                                Setup / Draft
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Title & Tagline at bottom of banner */}
                        <div className="absolute bottom-3 left-3 right-3 space-y-0.5">
                          <h3 className="text-base sm:text-lg font-black text-white group-hover:text-emerald-300 transition line-clamp-1">
                            {t.name}
                          </h3>
                          {t.tagline && (
                            <p className="text-[11px] text-slate-300 line-clamp-1 font-medium">
                              {t.tagline}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-4 space-y-3.5 flex-1 flex flex-col justify-between">
                        {/* Scoreboard Preview (Ryder Cup Teams) */}
                        {teamA && teamB && (
                          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold">
                              {/* Team A */}
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3.5 h-3.5 rounded-md flex items-center justify-center text-[9px] text-white font-black"
                                  style={{ backgroundColor: teamA.color || '#059669' }}
                                >
                                  {teamA.badgeIcon || teamA.shortCode?.[0] || 'A'}
                                </div>
                                <span className="text-slate-800 font-bold truncate max-w-[90px] sm:max-w-[120px]">
                                  {teamA.name}
                                </span>
                              </div>

                              {/* Points Display */}
                              <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
                                <span className="text-sm font-black" style={{ color: teamA.color || '#059669' }}>
                                  {teamAPoints.toFixed(1)}
                                </span>
                                <span className="text-2xs text-slate-400 font-black">—</span>
                                <span className="text-sm font-black" style={{ color: teamB.color || '#0284c7' }}>
                                  {teamBPoints.toFixed(1)}
                                </span>
                              </div>

                              {/* Team B */}
                              <div className="flex items-center gap-2">
                                <span className="text-slate-800 font-bold truncate max-w-[90px] sm:max-w-[120px] text-right">
                                  {teamB.name}
                                </span>
                                <div 
                                  className="w-3.5 h-3.5 rounded-md flex items-center justify-center text-[9px] text-white font-black"
                                  style={{ backgroundColor: teamB.color || '#0284c7' }}
                                >
                                  {teamB.badgeIcon || teamB.shortCode?.[0] || 'B'}
                                </div>
                              </div>
                            </div>

                            {/* Clinch Metric */}
                            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                              <span>Target: <strong className="text-slate-700">{clinchPts} pts</strong> to clinch</span>
                              <span>{t.rounds?.length || 0} Rounds Scheduled</span>
                            </div>
                          </div>
                        )}

                        {/* Metadata Details */}
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                          <div className="flex items-center gap-1.5 text-[11px] truncate">
                            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="truncate">{t.location || 'Garden Route'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] justify-end truncate">
                            <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{t.playersCount || (teamA?.playerIds?.length || 0) + (teamB?.playerIds?.length || 0) || 0} Players</span>
                          </div>
                        </div>

                        {/* Card Action Footer */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-[11px] text-slate-400 font-medium">
                            {t.startDate ? new Date(t.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Upcoming'}
                          </span>
                          <div className="flex items-center gap-1 text-emerald-700 font-black group-hover:translate-x-0.5 transition">
                            <span>Open Tournament</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tournament Creation Wizard Modal */}
        {isWizardOpen && (
          <TournamentCreationWizard
            currentUser={currentUser}
            allUsers={allUsers}
            onClose={() => setIsWizardOpen(false)}
            onTournamentCreated={handleTournamentCreated}
          />
        )}
      </div>
    );
  }

  const teamA = tournament.teams[0];
  const teamB = tournament.teams[1];
  const activeRound = tournament.rounds.find(r => r.roundNumber === selectedRoundTab) || tournament.rounds[0];

  // Dynamic Clinch Metrics
  const totalPoints = tournament.totalPoints || 16.0;
  const clinchThreshold = tournament.clinchPoints || 8.5;
  const teamAPoints = tournament.leaderboard?.teamStandings?.find(t => t.teamId === teamA.id)?.points || 0;
  const teamBPoints = tournament.leaderboard?.teamStandings?.find(t => t.teamId === teamB.id)?.points || 0;
  const teamAProjected = tournament.leaderboard?.teamStandings?.find(t => t.teamId === teamA.id)?.projectedPoints || teamAPoints;
  const teamBProjected = tournament.leaderboard?.teamStandings?.find(t => t.teamId === teamB.id)?.projectedPoints || teamBPoints;

  const currentUserRole = getUserRoleInTournament(tournament, currentUser.id);

  return (
    <div id="tournament-hub-container" className="space-y-4 pb-24">
      {/* Back to Tournaments Hub Navigation Header */}
      <div className="flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-2.5 px-4 shadow-xs">
        <button
          id="back-to-tournament-hub-btn"
          type="button"
          onClick={() => setTournament(null)}
          className="inline-flex items-center gap-2.5 text-xs font-bold text-slate-700 hover:text-emerald-700 transition cursor-pointer group"
        >
          <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-emerald-50 text-slate-600 group-hover:text-emerald-700 flex items-center justify-center transition border border-slate-200 group-hover:border-emerald-200">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Tournament Hub</span>
            <span className="text-xs font-black text-slate-900 group-hover:text-emerald-700">← All Tournaments ({userTournaments.length})</span>
          </div>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleLaunchWizard}
            className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Tournament</span>
          </button>
        </div>
      </div>

      {/* Tournament Header Card */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-950 text-white shadow-xl border border-slate-800">
        <img
          src={tournament.coverImage}
          alt={tournament.name}
          className="absolute inset-0 w-full h-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />

        <div className="relative p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1">
                <Trophy className="w-3 h-3 text-emerald-400" />
                {(tournament.formatType || 'team_ryder_cup').replace(/_/g, ' ')}
              </span>
              <span className={`border text-[10px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1 ${currentUserRole.badgeColor}`}>
                <Award className="w-3 h-3" />
                {currentUserRole.label}
              </span>
              <span className="text-slate-300 text-xs flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {tournament.startDate} to {tournament.endDate}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsFeedSharingModalOpen(true)}
                className="py-1.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs backdrop-blur-xs transition flex items-center gap-1.5 cursor-pointer border border-white/20"
                title="Manage player live score feed sharing preferences"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Feed Sharing</span>
              </button>

              <button
                onClick={handleLaunchWizard}
                className="py-1.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs backdrop-blur-xs transition flex items-center gap-1.5 cursor-pointer border border-white/20"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>New Tournament</span>
              </button>
              <button
                onClick={handleResetTournament}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-red-500/30 text-slate-300 hover:text-red-300 transition cursor-pointer border border-white/10"
                title={currentUserRole.isCreator ? "Delete Tournament" : "Remove Tournament from View"}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white">{tournament.name}</h1>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">{tournament.tagline}</p>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-white border border-slate-200 rounded-2xl shadow-xs">
        <button
          onClick={() => setActiveSubView('matches')}
          className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
            activeSubView === 'matches'
              ? 'bg-emerald-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Flag className="w-3.5 h-3.5" /> Matches
        </button>

        <button
          onClick={() => setActiveSubView('leaderboard')}
          className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
            activeSubView === 'leaderboard'
              ? 'bg-emerald-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" /> Leaderboard
        </button>

        <button
          onClick={() => setActiveSubView('feed')}
          className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
            activeSubView === 'feed'
              ? 'bg-emerald-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Camera className="w-3.5 h-3.5" /> Feed
        </button>

        <button
          onClick={() => setActiveSubView('rules')}
          className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
            activeSubView === 'rules'
              ? 'bg-emerald-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Shield className="w-3.5 h-3.5" /> Rules
        </button>
      </div>

      {/* VIEW 1: MATCHES & DAILY ROUNDS (OFFICIAL RYDER CUP MATCHPLAY SCOREBOARD) */}
      {activeSubView === 'matches' && (
        <div className="space-y-4">
          {/* Day Round Selector & Pairings Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              {tournament.rounds.map(round => (
                <button
                  key={round.roundNumber}
                  onClick={() => setSelectedRoundTab(round.roundNumber)}
                  className={`py-2 px-3.5 rounded-xl text-xs font-black whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                    selectedRoundTab === round.roundNumber
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs'
                  }`}
                >
                  <span>Day {round.dayNumber}: {round.title.split(':')[0]}</span>
                  {round.status === 'live' && (
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  )}
                </button>
              ))}
            </div>

            {activeRound && (
              <button
                type="button"
                onClick={() => setEditingRoundPairings(activeRound)}
                className="py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs border border-slate-700"
                title="Configure or modify pairings dynamically for this round"
              >
                <Settings2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Pairings</span>
              </button>
            )}
          </div>

          {/* Official Ryder Cup Matchplay Broadcast Scoreboard */}
          <div className="rounded-2xl overflow-hidden shadow-xl border border-slate-700/70 bg-[#0B1E36] select-none">
            {/* Split Scoreboard Top Banner */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-stretch border-b border-slate-700/80">
              {/* Left Header: Team A */}
              <div className="bg-white px-3 sm:px-6 py-2.5 sm:py-3 flex flex-col justify-between border-r border-slate-200">
                <div className="flex items-center justify-between gap-2">
                  <span 
                    className="text-base sm:text-2xl font-black tracking-tight"
                    style={{ color: teamA.color || '#002D72' }}
                  >
                    {teamA.shortCode || teamA.name.slice(0, 3).toUpperCase()}
                  </span>
                  <span className="text-2xl sm:text-4xl font-black text-slate-950 font-mono tabular-nums leading-none">
                    {Number.isInteger(teamAPoints) ? teamAPoints : teamAPoints.toFixed(1)}
                  </span>
                </div>
                <div className="border-t border-slate-200 mt-1 pt-1">
                  <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-slate-600 block">
                    {clinchThreshold} POINTS TO WIN
                  </span>
                </div>
              </div>

              {/* Center Header: Trophy Crest & Tournament Title */}
              <div className="bg-[#0B1E36] px-2.5 sm:px-5 py-2 sm:py-3 flex flex-col items-center justify-center text-center border-x border-slate-700/80 min-w-[90px] sm:min-w-[140px] max-w-[150px] sm:max-w-[220px]">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.2)] mb-0.5">
                  <Trophy className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
                <span 
                  className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-white leading-tight truncate w-full"
                  title={tournament.name}
                >
                  {(tournament.name || 'TOURNAMENT').toUpperCase()}
                </span>
                <span className="text-[7px] sm:text-[8px] text-amber-300 font-bold uppercase tracking-widest leading-tight truncate w-full">
                  {(tournament.formatType ? tournament.formatType.replace(/_/g, ' ') : 'MATCHPLAY').toUpperCase()}
                </span>
              </div>

              {/* Right Header: Team B */}
              <div className="bg-white px-3 sm:px-6 py-2.5 sm:py-3 flex flex-col justify-between border-l border-slate-200 text-right">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-2xl sm:text-4xl font-black text-slate-950 font-mono tabular-nums leading-none">
                    {Number.isInteger(teamBPoints) ? teamBPoints : teamBPoints.toFixed(1)}
                  </span>
                  <span 
                    className="text-base sm:text-2xl font-black tracking-tight"
                    style={{ color: teamB.color || '#C8102E' }}
                  >
                    {teamB.shortCode || teamB.name.slice(0, 3).toUpperCase()}
                  </span>
                </div>
                <div className="border-t border-slate-200 mt-1 pt-1 text-right">
                  <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-slate-600 block">
                    {totalPoints ? Math.max(0, totalPoints - clinchThreshold) : clinchThreshold} POINTS TO RETAIN
                  </span>
                </div>
              </div>
            </div>

            {/* Horizontal Match Bars */}
            <div className="divide-y divide-slate-300/80">
              {activeRound?.matches.map(match => {
                const holesPlayed = Object.keys(match.holeResults || {}).length;
                const isMatchOver = match.status === 'completed';

                const isWonBySideA = isMatchOver && match.winnerSide === 'sideA';
                const isWonBySideB = isMatchOver && match.winnerSide === 'sideB';
                const isHalved = isMatchOver && match.winnerSide === 'halved';

                const isLeadingA = !isMatchOver && holesPlayed > 0 && match.leadSide === 'sideA';
                const isLeadingB = !isMatchOver && holesPlayed > 0 && match.leadSide === 'sideB';

                const sideAPlayers = formatPlayerNames(match.sideA);
                const sideBPlayers = formatPlayerNames(match.sideB);

                const marginA = getMatchMarginText(match, 'sideA');
                const marginB = getMatchMarginText(match, 'sideB');

                const isSideAActive = isWonBySideA || isLeadingA;
                const isSideBActive = isWonBySideB || isLeadingB;

                const centerHoleText = isMatchOver ? 'F' : (holesPlayed > 0 ? `${holesPlayed}` : '-');

                const teamAColor = teamA.color || '#002D72';
                const teamBColor = teamB.color || '#C8102E';

                return (
                  <div
                    key={match.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedScorecardMatch({ match, round: activeRound })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedScorecardMatch({ match, round: activeRound });
                      }
                    }}
                    className="grid grid-cols-[1fr_48px_1fr] sm:grid-cols-[1fr_64px_1fr] md:grid-cols-[1fr_76px_1fr] items-stretch min-h-[58px] sm:min-h-[66px] cursor-pointer select-none transition-all duration-150 hover:brightness-95 active:scale-[0.999] group"
                    title={`Match #${match.matchNumber}: Click to open interactive scorecard`}
                  >
                    {/* Left Column: Side A */}
                    <div
                      className={`flex items-center justify-between px-3 sm:px-5 py-2 transition-colors ${
                        isSideAActive
                          ? 'text-white'
                          : isWonBySideB
                            ? 'bg-white text-slate-400'
                            : 'bg-white text-slate-900'
                      }`}
                      style={{
                        backgroundColor: isSideAActive ? teamAColor : '#FFFFFF'
                      }}
                    >
                      {/* Margin on far-left */}
                      <div className="w-10 sm:w-16 shrink-0 flex items-center">
                        {marginA ? (
                          <span className={`text-xs sm:text-base md:text-lg font-black tracking-tight ${
                            isSideAActive ? 'text-white' : 'text-slate-900'
                          }`}>
                            {marginA}
                          </span>
                        ) : null}
                      </div>

                      {/* Player names right-aligned near center */}
                      <div className="text-right flex flex-col justify-center min-w-0 flex-1 pl-1">
                        {sideAPlayers.map((name, idx) => (
                          <span 
                            key={idx} 
                            className={`text-xs sm:text-sm md:text-base font-black tracking-tight uppercase leading-tight truncate ${
                              isSideAActive 
                                ? 'text-white' 
                                : isWonBySideB 
                                  ? 'text-slate-400' 
                                  : 'text-slate-900'
                            }`}
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Center Column: Hole Counter Badge */}
                    <div className="bg-[#0B1E36] border-x border-slate-700/70 flex flex-col items-center justify-center px-0.5 sm:px-1 text-center select-none shadow-inner">
                      <span className={`text-base sm:text-lg md:text-xl font-black font-mono leading-none tracking-tight ${
                        isMatchOver ? 'text-amber-400' : (holesPlayed > 0 ? 'text-white' : 'text-slate-400')
                      }`}>
                        {centerHoleText}
                      </span>
                      {holesPlayed > 0 && !isMatchOver && (
                        <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-wider text-slate-400 leading-none mt-0.5">
                          THRU
                        </span>
                      )}
                    </div>

                    {/* Right Column: Side B */}
                    <div
                      className={`flex items-center justify-between px-3 sm:px-5 py-2 transition-colors ${
                        isSideBActive
                          ? 'text-white'
                          : isWonBySideA
                            ? 'bg-white text-slate-400'
                            : 'bg-white text-slate-900'
                      }`}
                      style={{
                        backgroundColor: isSideBActive ? teamBColor : '#FFFFFF'
                      }}
                    >
                      {/* Player names left-aligned near center */}
                      <div className="text-left flex flex-col justify-center min-w-0 flex-1 pr-1">
                        {sideBPlayers.map((name, idx) => (
                          <span 
                            key={idx} 
                            className={`text-xs sm:text-sm md:text-base font-black tracking-tight uppercase leading-tight truncate ${
                              isSideBActive 
                                ? 'text-white' 
                                : isWonBySideA 
                                  ? 'text-slate-400' 
                                  : 'text-slate-900'
                            }`}
                          >
                            {name}
                          </span>
                        ))}
                      </div>

                      {/* Margin on far-right */}
                      <div className="w-10 sm:w-16 shrink-0 flex items-center justify-end">
                        {marginB ? (
                          <span className={`text-xs sm:text-base md:text-lg font-black tracking-tight text-right ${
                            isSideBActive ? 'text-white' : 'text-slate-900'
                          }`}>
                            {marginB}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Broadcast Graphic Footer */}
            {activeRound && (
              <div className="bg-[#0B1E36] px-4 py-2.5 flex items-center justify-between text-[10px] sm:text-xs font-black uppercase tracking-wider text-white border-t border-slate-700/70">
                <span>DAY {activeRound.dayNumber}</span>
                <span className="hidden sm:inline text-slate-300">
                  {activeRound.courseName.toUpperCase()} • {(tournament.location || 'GARDEN ROUTE MATCHPLAY').toUpperCase()}
                </span>
                <span>{(activeRound.format || 'FOURSOMES').replace(/_/g, ' ')}</span>
              </div>
            )}

            {/* Progress to Clinch Tournament Bar */}
            <TournamentClinchProgressBar
              tournament={tournament}
              teamA={teamA}
              teamB={teamB}
              clinchThreshold={clinchThreshold}
              totalPoints={totalPoints}
            />
          </div>

          <div className="text-center">
            <span className="text-[11px] text-slate-500 font-medium">
              Click anywhere on a match row to view hole-by-hole scores or record strokes
            </span>
          </div>
        </div>
      )}

      {/* VIEW 2: DYNAMIC LEADERBOARD */}
      {activeSubView === 'leaderboard' && (
        <div className="space-y-4">
          {/* Team Standings */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-600" /> Team Standings
            </h3>

            <div className="space-y-2.5">
              {tournament.leaderboard?.teamStandings?.map((team, idx) => {
                const teamInfo = tournament.teams.find(t => t.id === team.teamId) || (idx === 0 ? teamA : teamB);
                const tColor = teamInfo?.color || (idx === 0 ? '#059669' : '#0284c7');

                return (
                  <div
                    key={team.teamId}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 transition"
                    style={{ borderLeft: `6px solid ${tColor}` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 text-xs font-black text-slate-400">#{idx + 1}</span>
                        <div>
                          <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: tColor }} /> {team.teamName}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {team.matchesWon}W - {team.matchesLost}L - {team.matchesTied}T
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-base font-black text-slate-900">{team.points.toFixed(1)} pts</div>
                        <div className="text-[10px] text-slate-400">Proj: {team.projectedPoints.toFixed(1)}</div>
                      </div>
                    </div>

                    {/* Progress to Clinch */}
                    <div className="pt-2 border-t border-slate-200/70 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-medium">Clinch Progress ({clinchThreshold} pts)</span>
                        <span className="font-bold" style={{ color: tColor }}>
                          {team.points.toFixed(1)} / {clinchThreshold} pts ({Math.min(100, Math.round((team.points / clinchThreshold) * 100))}%)
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden p-0.5">
                        <div
                          style={{
                            width: `${Math.min(100, (team.points / clinchThreshold) * 100)}%`,
                            backgroundColor: tColor
                          }}
                          className="h-full rounded-full transition-all duration-500"
                        />
                      </div>
                    </div>

                    {/* Team Roster Quick Scorecard Access */}
                    {teamInfo?.playerIds && teamInfo.playerIds.length > 0 && (
                      <div className="pt-2 border-t border-slate-200/70">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                            Team Roster ({teamInfo.playerIds.length})
                          </span>
                          <span className="text-[9px] text-slate-400">
                            Tap to inspect scorecards
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                          {teamInfo.playerIds.map(pid => {
                            const pRanking = tournament.leaderboard?.playerRankings?.find(p => p.userId === pid);
                            const u = allUsers.find(user => user.id === pid);
                            const name = pRanking?.displayName || u?.displayName || 'Golfer';
                            const photo = pRanking?.photoURL || u?.photoURL;
                            return (
                              <button
                                key={pid}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (pRanking) setSelectedPlayerForDashboard(pRanking);
                                  else if (u) setSelectedPlayerForDashboard(u);
                                }}
                                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-[11px] font-bold text-slate-700 hover:text-emerald-900 transition shrink-0 cursor-pointer shadow-2xs"
                                title={`Inspect ${name}'s round scorecards`}
                              >
                                <img 
                                  src={photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'} 
                                  alt={name} 
                                  className="w-4 h-4 rounded-full object-cover" 
                                />
                                <span className="truncate max-w-[90px]">{formatPlayerInitialAndSurname(name)}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* MVP Rankings */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-500" /> Individual MVP Standings
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Tap any player to inspect round snapshots, score-to-par history & full 18-hole scorecards
                </p>
              </div>
              <span className="text-[10px] font-bold text-slate-400 shrink-0">
                {tournament.leaderboard?.playerRankings?.length || 0} Registered Golfers
              </span>
            </div>

            <div className="space-y-2">
              {tournament.leaderboard?.playerRankings?.map((player, idx) => {
                const playerTeam = tournament.teams.find(t => t.id === player.teamId);
                const pColor = playerTeam?.color || (player.teamName === teamA.name ? teamA.color : teamB.color) || '#059669';

                return (
                  <div
                    key={player.userId}
                    onClick={() => setSelectedPlayerForDashboard(player)}
                    className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200 hover:border-slate-300 flex items-center justify-between text-xs transition cursor-pointer group shadow-2xs"
                    title={`Tap to inspect ${player.displayName}'s tournament scorecards`}
                  >
                      <div
                        className="flex items-center gap-2.5 min-w-0 cursor-pointer"
                        onClick={(e) => {
                          if (onOpenPlayerProfile) {
                            e.stopPropagation();
                            onOpenPlayerProfile(player.userId);
                          }
                        }}
                        title={`View ${player.displayName}'s Public Profile, Bio & Feed`}
                      >
                        <span className={`w-5 text-center font-black text-xs shrink-0 ${
                          idx === 0 ? 'text-amber-500 font-black' : idx === 1 ? 'text-slate-500' : idx === 2 ? 'text-amber-700' : 'text-slate-400'
                        }`}>
                          #{idx + 1}
                        </span>
                        <img
                          src={player.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'}
                          alt={player.displayName}
                          className="w-9 h-9 rounded-full object-cover border border-slate-300 shrink-0 group-hover:border-emerald-500 hover:ring-2 hover:ring-emerald-400 transition"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80';
                          }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 truncate group-hover:text-emerald-700 hover:underline transition">
                              {player.displayName}
                            </span>
                            <span className="text-[10px] text-slate-500 font-semibold">
                              (HCP {player.handicapIndex.toFixed(1)})
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span 
                              className="text-[10px] px-1.5 py-0.5 rounded-md font-black inline-flex items-center gap-1"
                              style={{ 
                                backgroundColor: hexToRgba(pColor, 0.14),
                                color: pColor 
                              }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full inline-block shrink-0" style={{ backgroundColor: pColor }} />
                              <span>{player.teamName}</span>
                            </span>
                            {player.matchesPlayed > 0 && (
                              <span className="text-[10px] text-slate-400">
                                • {player.matchesWon}W-{player.matchesLost}L-{player.matchesTied}T
                              </span>
                            )}
                          </div>

                          {/* Birdies & Pars Metrics Badge Line */}
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200/80 inline-flex items-center gap-1">
                              <span>🐥</span>
                              <span>{player.birdiesCount || 0} Birdies</span>
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200/80 inline-flex items-center gap-1">
                              <span>🎯</span>
                              <span>{player.parsCount || 0} Pars</span>
                            </span>
                            {(player.eaglesCount || 0) > 0 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-900 border border-purple-200/80 inline-flex items-center gap-1">
                                <span>🦅</span>
                                <span>{player.eaglesCount} Eagles</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                    <div className="flex items-center gap-2 shrink-0 pl-2">
                      <div className="text-right">
                        <span className="font-black text-xs block" style={{ color: pColor }}>
                          {player.pointsEarned.toFixed(1)} pts
                        </span>
                        <span className="text-[10px] text-slate-500 block font-medium">
                          {player.matchesPlayed > 0 ? `${player.winPercentage}% Win` : '0 Matches'}
                        </span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">
                          {player.holesWonCount || 0} Holes Won
                        </span>
                      </div>

                      <div className="p-1.5 rounded-lg bg-white border border-slate-200 group-hover:border-emerald-300 group-hover:bg-emerald-50 text-slate-400 group-hover:text-emerald-700 transition">
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: IN-TOURNAMENT SOCIAL PHOTO & VIDEO FEED */}
      {activeSubView === 'feed' && (
        <TournamentSocialFeed
          tournament={tournament}
          currentUser={currentUser}
          allUsers={allUsers}
          onOpenCreatePost={() => setIsFeedPostModalOpen(true)}
          onOpenPlayerProfile={onOpenPlayerProfile}
        />
      )}

      {/* VIEW 4: OFFICIAL SCORING RULES & FINES SYSTEM */}
      {activeSubView === 'rules' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Fines Mode Control & Official Fine Penalties List */}
          <FinesRulesSection
            tournament={tournament}
            allUsers={allUsers}
            onToggleFinesMode={enabled => {
              if (tournament) {
                setTournament(prev => prev ? { ...prev, finesModeEnabled: enabled } : null);
              }
            }}
          />

          {/* Official Playtomic Tournament Rules */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3 text-xs text-slate-700">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-600" />
              Playtomic Tournament Hub Official Scoring Rules
            </h3>

            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <strong className="text-slate-900 block font-bold">1. Point Weighting Rule</strong>
                <p className="text-slate-600 mt-0.5">
                  Every individual match or flight awards <strong>1.0 Point</strong> for a win, <strong>0.5 Points</strong> for a tie/half, and <strong>0.0 Points</strong> for a loss.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <strong className="text-slate-900 block font-bold">2. Clinch Threshold Formula</strong>
                <p className="text-slate-600 mt-0.5">
                  For a tournament with <span className="font-mono font-bold">N</span> total available points, the clinch requirement is <span className="font-mono font-bold">(N / 2) + 0.5</span> points. In this 16-point event, <strong>8.5 Points</strong> clinches the Cup.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <strong className="text-slate-900 block font-bold">3. Multi-Format WHS Handicap Adjustments</strong>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-600">
                  <li><strong>Fourball Better Ball:</strong> 85% WHS Playing Handicap allowance off the low golfer.</li>
                  <li><strong>2-Man Team Scramble:</strong> 35% low handicap + 15% high handicap combined allowance.</li>
                  <li><strong>Individual Singles:</strong> 100% full handicap difference allocated based on Hole Stroke Index (SI 1-18).</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOURNAMENT CREATION WIZARD MODAL */}
      {isWizardOpen && (
        <TournamentCreationWizard
          currentUser={currentUser}
          allUsers={allUsers}
          onClose={() => setIsWizardOpen(false)}
          onTournamentCreated={handleTournamentCreated}
        />
      )}

      {/* DYNAMIC ROUND PAIRINGS CONFIGURATION MODAL */}
      {editingRoundPairings && tournament && (
        <TournamentRoundPairingsModal
          tournament={tournament}
          round={editingRoundPairings}
          allUsers={allUsers}
          onClose={() => setEditingRoundPairings(null)}
          onSaveRound={handleSaveRoundPairings}
        />
      )}

      {/* INTERACTIVE MATCH SCORECARD MODAL */}
      {selectedScorecardMatch && tournament && (
        <TournamentMatchScorecardModal
          match={selectedScorecardMatch.match}
          round={selectedScorecardMatch.round}
          tournament={tournament}
          currentUser={currentUser}
          onClose={() => setSelectedScorecardMatch(null)}
          onUpdateMatch={handleUpdateMatchScorecard}
        />
      )}

      {/* INTERACTIVE PLAYER PROFILE & ROUND SNAPSHOTS DASHBOARD MODAL */}
      {selectedPlayerForDashboard && tournament && (
        <TournamentPlayerDashboardModal
          player={selectedPlayerForDashboard}
          tournament={tournament}
          allUsers={allUsers}
          onClose={() => setSelectedPlayerForDashboard(null)}
          onOpenMatchScorecard={(match, round) => {
            setSelectedScorecardMatch({ match, round });
            setSelectedPlayerForDashboard(null);
          }}
        />
      )}

      {/* IN-TOURNAMENT SOCIAL PHOTO & VIDEO POST CREATION MODAL */}
      {isFeedPostModalOpen && tournament && (
        <TournamentFeedPostModal
          tournament={tournament}
          currentUser={currentUser}
          allUsers={allUsers}
          onClose={() => setIsFeedPostModalOpen(false)}
        />
      )}

      {/* INDIVIDUAL PLAYER SOCIAL FEED SHARING PREFERENCES MODAL */}
      {isFeedSharingModalOpen && tournament && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Social Feed Sharing Controls</h3>
                  <p className="text-2xs text-slate-400">Opt-in per player for live score & match summaries</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFeedSharingModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Info notice */}
            <div className="p-4 bg-emerald-950/30 border-b border-emerald-500/20 text-emerald-300 text-2xs space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                Clean Match Summaries & Standings
              </p>
              <p className="text-slate-300">
                When enabled, hole updates and match outcomes are posted directly to that player's feed. Fines, drink penalties, and private metrics are strictly excluded.
              </p>
            </div>

            {/* Players List with Toggles */}
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {tournament.teams.map((team, tIdx) => {
                const teamPlayers = (team.playerIds || []).map(id => {
                  return allUsers.find(u => u.id === id) || {
                    id,
                    displayName: id === currentUser.id ? currentUser.displayName : `Golfer ${id.substring(0, 6)}`,
                    username: id === currentUser.id ? currentUser.username : undefined,
                    photoURL: id === currentUser.id ? currentUser.photoURL : undefined,
                    handicapIndex: id === currentUser.id ? currentUser.handicapIndex : 10,
                  } as GolferUser;
                });

                return (
                  <div key={team.id || tIdx} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: team.color }}
                      />
                      <span className="text-xs font-black text-white uppercase tracking-wider">
                        {team.name} ({teamPlayers.length} Players)
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {teamPlayers.map(player => {
                        const isOptedIn = tournament.feedSharingPreferences?.[player.id] ?? true;
                        return (
                          <div
                            key={player.id}
                            className="p-2.5 rounded-2xl bg-[#0D1117] border border-white/[0.08] flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img
                                src={player.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
                                alt={player.displayName}
                                className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0"
                                referrerPolicy="no-referrer"
                              />
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-white block truncate">
                                  {player.displayName}
                                  {player.id === currentUser.id && (
                                    <span className="ml-1 text-[10px] text-emerald-400 font-normal">(You)</span>
                                  )}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  HCP {player.handicapIndex ?? 10}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleTogglePlayerFeedSharing(player.id)}
                              className={`px-3 py-1.5 rounded-xl text-2xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                                isOptedIn
                                  ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-sm'
                                  : 'bg-white/10 text-slate-400 hover:text-white'
                              }`}
                            >
                              <span>{isOptedIn ? 'Sharing to Feed' : 'Feed Opted Out'}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-950/60 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setIsFeedSharingModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
