import { TournamentFeedPost, TournamentFeedComment, GolferUser, Tournament, TournamentMatch, TournamentRound, GolfPost, TournamentPostData } from '../types/golf';
import { StorageService } from '../utils/storage';
import { SupabaseService } from './supabaseService';

const STORAGE_KEY_PREFIX = 'golftour_tournament_feed_';
const FEED_UPDATE_EVENT = 'golftour_tournament_feed_sync';

export const TournamentFeedService = {
  /**
   * Retrieve all posts for a given tournament, ordered chronologically (newest first).
   */
  getPosts(tournamentId: string): TournamentFeedPost[] {
    const key = `${STORAGE_KEY_PREFIX}${tournamentId}`;
    try {
      const stored = localStorage.getItem(key);
      if (!stored) {
        return [];
      }
      const parsed: TournamentFeedPost[] = JSON.parse(stored);
      return parsed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (e) {
      console.error('Failed to read tournament feed posts:', e);
      return [];
    }
  },

  /**
   * Save a newly created post to the feed and broadcast the update.
   */
  savePost(post: TournamentFeedPost): void {
    const key = `${STORAGE_KEY_PREFIX}${post.tournamentId}`;
    const current = this.getPosts(post.tournamentId);
    const updated = [post, ...current.filter(p => p.id !== post.id)];
    try {
      localStorage.setItem(key, JSON.stringify(updated));
      this.broadcastFeedUpdate(post.tournamentId, updated);
    } catch (e) {
      console.error('Failed to persist tournament feed post:', e);
    }
  },

  /**
   * Toggle like state for a post.
   */
  toggleLike(tournamentId: string, postId: string, userId: string): TournamentFeedPost[] {
    const key = `${STORAGE_KEY_PREFIX}${tournamentId}`;
    const posts = this.getPosts(tournamentId);
    const updated = posts.map(p => {
      if (p.id === postId) {
        const likedIds = p.likedUserIds || [];
        const alreadyLiked = likedIds.includes(userId);
        const newLikedIds = alreadyLiked 
          ? likedIds.filter(id => id !== userId) 
          : [...likedIds, userId];
        return {
          ...p,
          likedUserIds: newLikedIds,
          likesCount: newLikedIds.length,
          hasLiked: !alreadyLiked,
        };
      }
      return p;
    });

    try {
      localStorage.setItem(key, JSON.stringify(updated));
      this.broadcastFeedUpdate(tournamentId, updated);
    } catch (e) {
      console.error('Failed to update post like:', e);
    }
    return updated;
  },

  /**
   * Add a real-time comment to a tournament post.
   */
  addComment(
    tournamentId: string,
    postId: string,
    author: { id: string; displayName: string; username?: string; photoURL?: string; teamColor?: string },
    commentText: string
  ): TournamentFeedPost[] {
    const key = `${STORAGE_KEY_PREFIX}${tournamentId}`;
    const posts = this.getPosts(tournamentId);

    const newComment: TournamentFeedComment = {
      id: `comm-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      postId,
      authorId: author.id,
      authorName: author.displayName,
      authorUsername: author.username,
      authorAvatar: author.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      authorTeamColor: author.teamColor,
      content: commentText.trim(),
      createdAt: new Date().toISOString(),
    };

    const updated = posts.map(p => {
      if (p.id === postId) {
        const comments = [...(p.comments || []), newComment];
        return {
          ...p,
          comments,
          commentsCount: comments.length,
        };
      }
      return p;
    });

    try {
      localStorage.setItem(key, JSON.stringify(updated));
      this.broadcastFeedUpdate(tournamentId, updated);
    } catch (e) {
      console.error('Failed to save comment:', e);
    }
    return updated;
  },

  /**
   * Broadcast cross-client event so open scorecard modals, leaderboards,
   * and tournament screens receive instant updates.
   */
  broadcastFeedUpdate(tournamentId: string, posts: TournamentFeedPost[]): void {
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent(FEED_UPDATE_EVENT, {
            detail: { tournamentId, posts },
          })
        );
      }
    } catch {
      // safe fallback
    }
  },

  /**
   * Subscribe to real-time feed updates across tabs and local events.
   */
  subscribe(tournamentId: string, onUpdate: (posts: TournamentFeedPost[]) => void): () => void {
    const handleCustomEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.tournamentId === tournamentId) {
        onUpdate(customEvent.detail.posts);
      }
    };

    const handleStorageEvent = (event: StorageEvent) => {
      const key = `${STORAGE_KEY_PREFIX}${tournamentId}`;
      if (event.key === key && event.newValue) {
        try {
          const parsed: TournamentFeedPost[] = JSON.parse(event.newValue);
          onUpdate(parsed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        } catch {
          // ignore
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(FEED_UPDATE_EVENT, handleCustomEvent);
      window.addEventListener('storage', handleStorageEvent);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(FEED_UPDATE_EVENT, handleCustomEvent);
        window.removeEventListener('storage', handleStorageEvent);
      }
    };
  },

  /**
   * Automatically publish finalized tournament match result to both the
   * tournament hub feed and the shared GolfTour community social feed.
   */
  postCompletedMatchResult(params: {
    tournament: Tournament;
    match: TournamentMatch;
    round: TournamentRound;
    allUsers?: GolferUser[];
  }): void {
    const { tournament, match, round, allUsers = [] } = params;
    if (match.status !== 'completed') return;

    const autoPostId = `match-recap-${tournament.id}-${match.id}`;
    
    // 1. Identify teams and players
    const teamA = tournament.teams.find(t => t.id === match.sideA.teamId) || { name: 'Team A', color: '#10B981' };
    const teamB = tournament.teams.find(t => t.id === match.sideB.teamId) || { name: 'Team B', color: '#3B82F6' };

    const sideAPlayers = match.sideA.playerIds
      .map(id => allUsers.find(u => u.id === id) || { id, displayName: 'Golfer A', photoURL: '' });
    const sideBPlayers = match.sideB.playerIds
      .map(id => allUsers.find(u => u.id === id) || { id, displayName: 'Golfer B', photoURL: '' });

    const sideANames = sideAPlayers.map(p => p.displayName).join(' & ');
    const sideBNames = sideBPlayers.map(p => p.displayName).join(' & ');

    let resultSummary = '';
    let winnerColor = '#10B981';

    if (match.winnerSide === 'halved') {
      resultSummary = `Match Halved (All Square). Both sides earn 0.5 points!`;
      winnerColor = '#94A3B8';
    } else if (match.winnerSide === 'sideA') {
      const margin = match.leadMargin || '1 UP';
      resultSummary = `${sideANames} (${teamA.name}) defeated ${sideBNames} (${teamB.name}) — ${margin}`;
      winnerColor = teamA.color;
    } else {
      const margin = match.leadMargin || '1 UP';
      resultSummary = `${sideBNames} (${teamB.name}) defeated ${sideAPlayers.map(p => p.displayName).join(' & ')} (${teamA.name}) — ${margin}`;
      winnerColor = teamB.color;
    }

    const courseName = round.courseName || tournament.name;

    // 2. Add to Tournament In-Hub Feed
    const coverPhoto = round.courseCover || 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?auto=format&fit=crop&w=800&q=80';
    const tournamentPost: TournamentFeedPost = {
      id: autoPostId,
      tournamentId: tournament.id,
      authorId: 'golftour-tournament-bot',
      authorName: `GolfTour Tournament Official`,
      authorUsername: 'golftour_official',
      authorAvatar: 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?auto=format&fit=crop&w=300&q=80',
      authorTeamColor: winnerColor,
      mediaType: 'photo',
      mediaUrl: coverPhoto,
      caption: `🏆 MATCH FINAL: ${resultSummary}\n📍 ${courseName} • Round ${round.roundNumber} (${round.format})\nStatus: ${match.currentStatusText || 'Finalized'}`,
      type: 'scorecard',
      content: `🏆 MATCH FINAL: ${resultSummary}\n📍 ${courseName} • Round ${round.roundNumber} (${round.format})\nStatus: ${match.currentStatusText || 'Finalized'}`,
      photoURL: coverPhoto,
      matchId: match.id,
      roundNumber: round.roundNumber,
      isOfficial: true,
      likesCount: 0,
      hasLiked: false,
      likedUserIds: [],
      comments: [],
      commentsCount: 0,
      createdAt: new Date().toISOString(),
    };
    this.savePost(tournamentPost);

    // 3. Add to Shared GolfTour Community Feed (StorageService.addPost)
    try {
      const primaryAuthor = sideAPlayers[0] || { id: 'bot', displayName: 'Tournament Official', photoURL: '' };
      const communityFeedPost: GolfPost = {
        id: `feed-${autoPostId}`,
        authorId: primaryAuthor.id,
        authorName: `${tournament.name} — Round ${round.roundNumber}`,
        authorUsername: 'golftour_tournament',
        authorAvatar: round.courseCover || 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?auto=format&fit=crop&w=300&q=80',
        authorHandicap: 0,
        authorLevel: 6.5,
        type: 'match_recap',
        caption: `🏆 OFFICIAL MATCHPLAY RESULT: ${resultSummary}\nCourse: ${courseName} | ${round.format}. ${match.currentStatusText || ''}`,
        mediaUrls: [round.courseCover || 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?auto=format&fit=crop&w=800&q=80'],
        location: courseName,
        likesCount: 0,
        commentsCount: 0,
        hasLiked: false,
        matchData: {
          courseName,
          courseLocation: 'Garden Route, South Africa',
          gameType: 'match_play',
          grossScore: match.decidedAtHole || 18,
          netScore: match.leadMargin ? (parseInt(String(match.leadMargin), 10) || 1) : 0,
          parDiff: 0,
          stablefordPoints: match.winnerSide === 'halved' ? 18 : 36,
          bestMoment: match.currentStatusText || 'Matchplay Final',
          handicapChange: 0,
          playersCount: sideAPlayers.length + sideBPlayers.length,
          partners: [...sideAPlayers, ...sideBPlayers].map(p => ({
            userId: p.id,
            displayName: p.displayName,
            photoURL: p.photoURL,
            grossScore: 0,
          }))
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      StorageService.addPost(communityFeedPost);
    } catch (e) {
      console.error('Failed to post tournament result to shared feed:', e);
    }

    // Also trigger opt-in live feed updates for all participants
    this.syncLiveMatchFeed(tournament, round, match, allUsers);
  },

  /**
   * Check if a specific player has enabled social feed sharing for this tournament.
   */
  isPlayerFeedShareEnabled(tournamentId: string, userId: string): boolean {
    if (!tournamentId || !userId) return false;
    return StorageService.getPlayerFeedShareOptIn(tournamentId, userId);
  },

  /**
   * Toggle individual user opt-in for social feed sharing.
   */
  setPlayerFeedShareEnabled(tournament: Tournament, userId: string, enabled: boolean, allUsers: GolferUser[] = []): Tournament {
    StorageService.setPlayerFeedShareOptIn(tournament.id, userId, enabled);
    
    const updatedPreferences = {
      ...(tournament.feedSharingPreferences || {}),
      [userId]: enabled,
    };

    const updatedTournament: Tournament = {
      ...tournament,
      feedSharingPreferences: updatedPreferences,
      updatedAt: new Date().toISOString(),
    };

    StorageService.saveTournament(updatedTournament, userId);
    SupabaseService.upsertTournament(updatedTournament, userId);

    // If enabled, immediately sync their latest match status to feed
    if (enabled) {
      // Find the player's active or most recent match in the tournament
      for (const r of updatedTournament.rounds) {
        for (const m of r.matches) {
          if (m.sideA.playerIds.includes(userId) || m.sideB.playerIds.includes(userId)) {
            this.syncLiveMatchFeed(updatedTournament, r, m, allUsers);
            break;
          }
        }
      }
    }

    return updatedTournament;
  },

  /**
   * Sync real-time live score updates to feed posts for all opted-in players in the match.
   * Strictly excludes minor metrics such as fines or bar tab details.
   */
  syncLiveMatchFeed(
    tournament: Tournament,
    round: TournamentRound,
    match: TournamentMatch,
    allUsers: GolferUser[] = []
  ): void {
    if (!tournament || !round || !match) return;

    const teamA = tournament.teams[0] || { id: 'team-a', name: 'Team A', shortCode: 'TMA', color: '#10B981', totalPoints: 0 };
    const teamB = tournament.teams[1] || { id: 'team-b', name: 'Team B', shortCode: 'TMB', color: '#3B82F6', totalPoints: 0 };

    const teamAScore = teamA.totalPoints ?? tournament.leaderboard?.teamStandings?.find(s => s.teamId === teamA.id)?.points ?? 0;
    const teamBScore = teamB.totalPoints ?? tournament.leaderboard?.teamStandings?.find(s => s.teamId === teamB.id)?.points ?? 0;

    const courseName = round.courseName || tournament.name;
    const courseCover = round.courseCover || tournament.coverImage || 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?auto=format&fit=crop&w=800&q=80';

    const sideAPlayers = match.sideA.playerIds
      .map(id => allUsers.find(u => u.id === id) || { id, displayName: 'Golfer A', username: 'golfer_a', photoURL: '', handicapIndex: 10 }) as GolferUser[];
    const sideBPlayers = match.sideB.playerIds
      .map(id => allUsers.find(u => u.id === id) || { id, displayName: 'Golfer B', username: 'golfer_b', photoURL: '', handicapIndex: 10 }) as GolferUser[];

    const sideANames = sideAPlayers.map(p => p.displayName).join(' & ');
    const sideBNames = sideBPlayers.map(p => p.displayName).join(' & ');
    const holesPlayed = Object.keys(match.holeResults || {}).length;

    // All match participants
    const participants = [...sideAPlayers, ...sideBPlayers];

    participants.forEach(player => {
      // Check opt-in preference for this user
      if (!this.isPlayerFeedShareEnabled(tournament.id, player.id)) {
        return;
      }

      const isSideA = match.sideA.playerIds.includes(player.id);
      const playerTeam = isSideA ? teamA : teamB;
      const opponentTeam = isSideA ? teamB : teamA;
      const mySideNames = isSideA ? sideANames : sideBNames;
      const opponentSideNames = isSideA ? sideBNames : sideANames;

      // Calculate context relative to this player
      let relativeStatus = match.currentStatusText || 'All Square';
      if (match.status === 'completed') {
        if (match.winnerSide === 'halved') {
          relativeStatus = 'Halved (All Square)';
        } else if ((match.winnerSide === 'sideA' && isSideA) || (match.winnerSide === 'sideB' && !isSideA)) {
          relativeStatus = `Won ${match.leadMargin || '1 UP'}`;
        } else {
          relativeStatus = `Defeated ${match.leadMargin || '1 UP'}`;
        }
      } else {
        if (match.leadSide === 'tied') {
          relativeStatus = 'All Square';
        } else if ((match.leadSide === 'sideA' && isSideA) || (match.leadSide === 'sideB' && !isSideA)) {
          relativeStatus = `${match.leadMargin || 1} UP`;
        } else {
          relativeStatus = `${match.leadMargin || 1} DN`;
        }
      }

      const isFinal = match.status === 'completed';
      const statusTitle = isFinal ? '🏆 Match Final' : `⛳️ Live Score (Hole ${holesPlayed > 0 ? holesPlayed : 1}/18)`;
      
      const cleanSummary = `${statusTitle}: ${player.displayName} (${playerTeam.name})\n` +
        `Standings: ${teamA.name} ${teamAScore} — ${teamBScore} ${teamB.name} (Target: ${tournament.clinchPoints} pts)\n` +
        `Matchup: ${mySideNames} vs ${opponentSideNames} • ${relativeStatus}`;

      const tournamentData: TournamentPostData = {
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        tournamentCover: courseCover,
        location: tournament.location || 'Garden Route, South Africa',
        roundNumber: round.roundNumber,
        roundTitle: round.title,
        roundFormat: round.format,
        matchId: match.id,
        teamAShortName: teamA.shortCode || teamA.name.substring(0, 3).toUpperCase(),
        teamAName: teamA.name,
        teamAColor: teamA.color,
        teamAScore,
        teamBShortName: teamB.shortCode || teamB.name.substring(0, 3).toUpperCase(),
        teamBName: teamB.name,
        teamBColor: teamB.color,
        teamBScore,
        clinchPoints: tournament.clinchPoints,
        isClinched: tournament.leaderboard?.isClinched || false,
        clinchedTeamName: tournament.leaderboard?.clinchedTeamId ? tournament.teams?.find(t => t.id === tournament.leaderboard.clinchedTeamId)?.name : undefined,
        playerTeamName: playerTeam.name,
        playerTeamColor: playerTeam.color,
        matchStatusText: relativeStatus,
        matchSideA: sideANames,
        matchSideB: sideBNames,
        isMatchFinal: isFinal,
        holesPlayed,
        currentHole: holesPlayed > 0 ? holesPlayed : 1,
      };

      const postId = `tour-feed-live-${tournament.id}-${match.id}-${player.id}`;
      const post: GolfPost = {
        id: postId,
        authorId: player.id,
        authorName: player.displayName,
        authorUsername: player.username || `golfer_${player.id.substring(0, 6)}`,
        authorAvatar: player.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
        authorHandicap: player.handicapIndex ?? 10,
        authorLevel: player.golfTourLevel ?? 5.0,
        type: 'match_recap',
        caption: cleanSummary,
        content: cleanSummary,
        mediaUrls: [courseCover],
        location: courseName,
        likesCount: 0,
        commentsCount: 0,
        hasLiked: false,
        comments: [],
        tournamentData,
        matchData: {
          courseName,
          courseLocation: tournament.location || 'Garden Route, South Africa',
          gameType: 'match_play',
          grossScore: holesPlayed,
          netScore: Number(match.leadMargin) || 0,
          parDiff: 0,
          stablefordPoints: isFinal ? (match.winnerSide === 'halved' ? 18 : 36) : 0,
          bestMoment: `${relativeStatus} at ${courseName}`,
          handicapChange: 0,
          playersCount: participants.length,
          partners: participants.map(p => ({
            userId: p.id,
            displayName: p.displayName,
            photoURL: p.photoURL || '',
            grossScore: 0,
          }))
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Push to persistent storage & Supabase
      StorageService.upsertPost(post);
      SupabaseService.upsertPost(post).catch(err => {
        console.warn('[TournamentFeedService] upsertPost Supabase error:', err);
      });
    });
  }
};
