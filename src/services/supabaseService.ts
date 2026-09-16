import { supabase, isSupabaseConfigured, getSupabaseClient } from '../lib/supabase';
import { 
  GolferUser, 
  GolfPost, 
  GolfMatch, 
  FriendRequest, 
  FriendshipStatus,
  Tournament 
} from '../types/golf';
import { StorageService } from '../utils/storage';

/**
 * Data Mapper utilities converting between Supabase PostgreSQL snake_case rows
 * and GolfTour frontend camelCase models.
 */
function mapProfileRowToUser(row: any): GolferUser {
  return {
    id: row.id,
    displayName: row.display_name || row.username || 'Golfer',
    username: row.username,
    email: row.email || '',
    photoURL: row.photo_url || '',
    handicapIndex: Number(row.handicap_index ?? 0),
    golfTourLevel: Number(row.golf_tour_level ?? 4.0),
    homeClubId: row.home_club_id || 'course-simola-estate',
    homeClubName: row.home_club_name || 'Simola Golf Club',
    city: row.city || 'Garden Route',
    country: row.country || 'South Africa',
    bio: row.bio || '',
    preferredTees: row.preferred_tees || 'White',
    isPublic: row.is_public !== false,
    isOnline: row.is_online !== false,
    emailVerified: Boolean(row.email_verified),
    friendsCount: Number(row.friends_count ?? 0),
    followersCount: Number(row.followers_count ?? 0),
    followingCount: Number(row.following_count ?? 0),
    roundsCount: Number(row.rounds_count ?? 0),
    bestScore: Number(row.best_score ?? 0),
    stats: row.stats || {
      fairwaysHitPct: 0,
      greensInRegPct: 0,
      avgPuttsPerRound: 0,
      scramblingPct: 0,
      holesInOne: 0,
      eaglesCount: 0,
      birdiesCount: 0,
    },
    bag: Array.isArray(row.bag) ? row.bag : [],
    handicapHistory: Array.isArray(row.handicap_history) ? row.handicap_history : [],
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

function mapUserToProfileRow(user: GolferUser): any {
  return {
    id: user.id,
    username: user.username.toLowerCase(),
    display_name: user.displayName,
    email: user.email ? user.email.toLowerCase() : null,
    photo_url: user.photoURL,
    handicap_index: user.handicapIndex,
    golf_tour_level: user.golfTourLevel,
    home_club_id: user.homeClubId,
    home_club_name: user.homeClubName,
    city: user.city,
    country: user.country,
    bio: user.bio,
    preferred_tees: user.preferredTees,
    is_public: user.isPublic,
    is_online: user.isOnline,
    email_verified: user.emailVerified,
    friends_count: user.friendsCount,
    followers_count: user.followersCount,
    following_count: user.followingCount,
    rounds_count: user.roundsCount,
    best_score: user.bestScore,
    stats: user.stats,
    bag: user.bag,
    handicap_history: user.handicapHistory,
    updated_at: new Date().toISOString(),
  };
}

function mapPostRowToPost(row: any): GolfPost {
  return {
    id: row.id,
    authorId: row.author_id,
    authorName: row.author_name,
    authorUsername: row.author_username,
    authorAvatar: row.author_avatar || '',
    authorHandicap: Number(row.author_handicap ?? 0),
    authorLevel: Number(row.author_level ?? 4.0),
    type: row.type || 'status_update',
    caption: row.caption || '',
    content: row.content || '',
    mediaUrls: Array.isArray(row.media_urls) ? row.media_urls : [],
    likesCount: Number(row.likes_count ?? 0),
    commentsCount: Number(row.comments_count ?? 0),
    comments: Array.isArray(row.comments) ? row.comments : [],
    matchData: row.match_data || undefined,
    tournamentData: row.tournament_data || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

function mapPostToRow(post: GolfPost): any {
  return {
    id: post.id,
    author_id: post.authorId,
    author_name: post.authorName,
    author_username: post.authorUsername,
    author_avatar: post.authorAvatar,
    author_handicap: post.authorHandicap,
    author_level: post.authorLevel,
    type: post.type,
    caption: post.caption,
    content: post.content,
    media_urls: post.mediaUrls || [],
    likes_count: post.likesCount || 0,
    comments_count: post.commentsCount || 0,
    comments: post.comments || [],
    match_data: post.matchData || null,
    tournament_data: post.tournamentData || null,
    created_at: post.createdAt,
    updated_at: new Date().toISOString(),
  };
}

function mapMatchRowToMatch(row: any): GolfMatch {
  return {
    id: row.id,
    creatorId: row.creator_id,
    courseId: row.course_id,
    courseName: row.course_name,
    courseLocation: row.course_location || '',
    courseCover: row.course_cover || '',
    coursePar: Number(row.course_par ?? 72),
    holesCount: (row.holes_count === 9 ? 9 : 18) as 9 | 18,
    gameType: row.game_type || 'stroke_play',
    status: row.status || 'open',
    scheduledTime: row.scheduled_time || '',
    maxPlayers: Number(row.max_players ?? 4),
    levelMin: 0.5,
    levelMax: 7.0,
    players: Array.isArray(row.players) ? row.players : [],
    isCompetitive: row.is_competitive !== false,
    isPublic: row.is_public !== false,
    notes: row.notes || '',
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

function mapMatchToRow(match: GolfMatch): any {
  return {
    id: match.id,
    creator_id: match.creatorId,
    course_id: match.courseId,
    course_name: match.courseName,
    course_location: match.courseLocation,
    course_cover: match.courseCover,
    course_par: match.coursePar,
    holes_count: match.holesCount,
    game_type: match.gameType,
    status: match.status,
    scheduled_time: match.scheduledTime,
    max_players: match.maxPlayers,
    players: match.players,
    is_competitive: match.isCompetitive,
    is_public: match.isPublic,
    notes: match.notes,
    created_at: match.createdAt,
    updated_at: new Date().toISOString(),
  };
}

function mapFriendshipRowToRequest(row: any, userMap?: Map<string, GolferUser>): FriendRequest {
  return {
    id: row.id,
    requesterId: row.requester_id,
    recipientId: row.recipient_id,
    status: row.status as FriendshipStatus,
    pairKey: row.pair_key,
    requester: userMap?.get(row.requester_id),
    recipient: userMap?.get(row.recipient_id),
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

function mapTournamentRowToTournament(row: any): Tournament {
  return {
    id: row.id,
    name: row.name,
    tagline: row.tagline || '',
    description: row.description || '',
    organizerId: row.organizer_id,
    creatorId: row.creator_id,
    organizerName: row.organizer_name || 'Tournament Director',
    formatType: row.format_type || 'team_ryder_cup',
    status: row.status || 'live',
    startDate: row.start_date || '',
    endDate: row.end_date || '',
    location: row.location || 'Garden Route, South Africa',
    coverImage: row.cover_image || '',
    playersCount: Number(row.players_count ?? 16),
    totalPoints: Number(row.total_points ?? 28),
    clinchPoints: Number(row.clinch_points ?? 14.5),
    teams: Array.isArray(row.teams) ? row.teams : [],
    rounds: Array.isArray(row.rounds) ? row.rounds : [],
    scoringRule: row.scoring_rule || { pointsPerWin: 1, pointsPerTie: 0.5, pointsPerLoss: 0, clinchThresholdRule: 'majority_plus_half' },
    leaderboard: row.leaderboard || { totalPointsAvailable: 28, clinchPointsThreshold: 14.5, isClinched: false, teamStandings: [], playerRankings: [] },
    finesModeEnabled: row.fines_mode_enabled !== false,
    feedSharingPreferences: row.feed_sharing_preferences || {},
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

function mapTournamentToRow(t: Tournament): any {
  return {
    id: t.id,
    name: t.name,
    tagline: t.tagline,
    description: t.description,
    organizer_id: t.organizerId,
    creator_id: t.creatorId,
    organizer_name: t.organizerName,
    format_type: t.formatType,
    status: t.status,
    start_date: t.startDate,
    end_date: t.endDate,
    location: t.location,
    cover_image: t.coverImage,
    players_count: t.playersCount,
    total_points: t.totalPoints,
    clinch_points: t.clinchPoints,
    teams: t.teams,
    rounds: t.rounds,
    scoring_rule: t.scoringRule,
    leaderboard: t.leaderboard,
    fines_mode_enabled: t.finesModeEnabled,
    feed_sharing_preferences: t.feedSharingPreferences || {},
    created_at: t.createdAt,
    updated_at: new Date().toISOString(),
  };
}

export const SupabaseService = {
  // ==========================================
  // STATUS & CONNECTIVITY
  // ==========================================
  isLive(): boolean {
    return isSupabaseConfigured() && getSupabaseClient() !== null;
  },

  // ==========================================
  // PROFILES / USER ACCOUNTS
  // ==========================================
  async fetchProfiles(): Promise<GolferUser[]> {
    if (!this.isLive() || !supabase) {
      return StorageService.getAllUsers();
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[SupabaseService] fetchProfiles failed, falling back to local cache:', error.message);
        return StorageService.getAllUsers();
      }

      if (data && data.length > 0) {
        const users = data.map(mapProfileRowToUser);
        // Synchronize into local storage cache
        StorageService.saveAllUsers(users);
        return users;
      }

      return StorageService.getAllUsers();
    } catch (err) {
      console.warn('[SupabaseService] fetchProfiles exception:', err);
      return StorageService.getAllUsers();
    }
  },

  /**
   * Fetch a single user profile by UUID from Supabase profiles table
   */
  async fetchProfileById(userId: string): Promise<GolferUser | null> {
    if (!userId) return null;

    if (!this.isLive() || !supabase) {
      return StorageService.getUserById(userId) || null;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('[SupabaseService] fetchProfileById query error:', error.message);
        return StorageService.getUserById(userId) || null;
      }

      if (data) {
        const user = mapProfileRowToUser(data);
        // Update in local cache
        const all = StorageService.getAllUsers();
        const idx = all.findIndex(u => u.id === user.id);
        if (idx >= 0) all[idx] = user;
        else all.push(user);
        StorageService.saveAllUsers(all);
        return user;
      }

      return StorageService.getUserById(userId) || null;
    } catch (err) {
      console.warn('[SupabaseService] fetchProfileById exception:', err);
      return StorageService.getUserById(userId) || null;
    }
  },

  /**
   * Search for golfers across the global Supabase database by username, displayName, or club.
   */
  async searchProfiles(query: string): Promise<GolferUser[]> {
    const cleanQuery = query.trim().toLowerCase().replace(/^@/, '');
    if (!cleanQuery) return [];

    if (!this.isLive() || !supabase) {
      // Fallback search in local cache
      const allLocal = StorageService.getAllUsers();
      return allLocal.filter(u => 
        u.username.toLowerCase().includes(cleanQuery) ||
        u.displayName.toLowerCase().includes(cleanQuery) ||
        (u.homeClubName && u.homeClubName.toLowerCase().includes(cleanQuery))
      );
    }

    try {
      let data: any[] | null = null;
      let queryError: any = null;

      // Try 3-column search first
      const res = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${cleanQuery}%,display_name.ilike.%${cleanQuery}%,home_club_name.ilike.%${cleanQuery}%`)
        .limit(25);

      data = res.data;
      queryError = res.error;

      // If failed due to missing home_club_name column, retry with core username + display_name
      if (queryError) {
        console.warn('[SupabaseService] 3-column searchProfiles failed, retrying with core fields:', queryError.message);
        const retryRes = await supabase
          .from('profiles')
          .select('*')
          .or(`username.ilike.%${cleanQuery}%,display_name.ilike.%${cleanQuery}%`)
          .limit(25);
        data = retryRes.data;
        queryError = retryRes.error;
      }

      if (queryError) {
        console.warn('[SupabaseService] searchProfiles query failed:', queryError.message);
        const allLocal = StorageService.getAllUsers();
        return allLocal.filter(u => 
          u.username.toLowerCase().includes(cleanQuery) ||
          u.displayName.toLowerCase().includes(cleanQuery)
        );
      }

      return (data || []).map(mapProfileRowToUser);
    } catch (err) {
      console.error('[SupabaseService] searchProfiles exception:', err);
      return [];
    }
  },

  /**
   * Find a user profile by username or email on Supabase
   */
  async findProfileByIdentifier(identifier: string): Promise<GolferUser | null> {
    const cleanId = identifier.trim().toLowerCase().replace(/^@/, '');
    if (!cleanId) return null;

    if (!this.isLive() || !supabase) {
      const allLocal = StorageService.getAllUsers();
      return allLocal.find(u => 
        u.username.toLowerCase() === cleanId || 
        u.email.toLowerCase() === cleanId
      ) || null;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.${cleanId},email.ilike.${cleanId}`)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn('[SupabaseService] findProfileByIdentifier error:', error.message);
        return null;
      }

      if (data) {
        return mapProfileRowToUser(data);
      }
      return null;
    } catch (err) {
      console.warn('[SupabaseService] findProfileByIdentifier exception:', err);
      return null;
    }
  },

  /**
   * Directly upsert profile record into Supabase public.profiles table.
   * Features automatic column fallback if database table has a minimalist schema.
   */
  async upsertProfileDirect(user: GolferUser): Promise<{ success: boolean; error?: string }> {
    if (!this.isLive() || !supabase) {
      return { success: false, error: 'Supabase client is unconfigured or offline' };
    }

    try {
      const fullRow = mapUserToProfileRow(user);
      console.log('[SupabaseService] Sending network upsert request to public.profiles:', fullRow.id, fullRow.username);
      const { error } = await supabase
        .from('profiles')
        .upsert(fullRow, { onConflict: 'id' });

      if (error) {
        console.warn('[SupabaseService] Full schema profile upsert returned error:', error.message);

        // Fallback retry with core columns if optional columns don't exist on remote table
        if (error.message.includes('column') || error.message.includes('relation') || error.code === '42703') {
          console.log('[SupabaseService] Retrying with core profile columns (id, username, display_name, email, handicap, bio, photo_url)...');
          const coreRow = {
            id: user.id,
            username: user.username.toLowerCase(),
            display_name: user.displayName,
            email: user.email ? user.email.toLowerCase() : null,
            photo_url: user.photoURL || null,
            handicap_index: user.handicapIndex ?? 0,
            bio: user.bio || '',
            home_club_name: user.homeClubName || null,
            city: user.city || 'Garden Route',
            country: user.country || 'South Africa',
            updated_at: new Date().toISOString(),
          };

          const { error: retryError } = await supabase
            .from('profiles')
            .upsert(coreRow, { onConflict: 'id' });

          if (retryError) {
            console.error('[SupabaseService] Core profile upsert failed:', retryError.message);
            return { success: false, error: retryError.message };
          }
          console.log('[SupabaseService] Core profile upsert succeeded!');
          return { success: true };
        }

        return { success: false, error: error.message };
      }

      console.log('[SupabaseService] Profile successfully persisted to public.profiles table!');
      return { success: true };
    } catch (err: any) {
      console.error('[SupabaseService] upsertProfileDirect exception:', err);
      return { success: false, error: err?.message || 'Network exception during profile upsert' };
    }
  },

  async upsertProfile(user: GolferUser): Promise<GolferUser> {
    // 1. Always update local cache immediately for instantaneous UI responsiveness
    const all = StorageService.getAllUsers();
    const existingIdx = all.findIndex(u => u.id === user.id);
    if (existingIdx >= 0) {
      all[existingIdx] = user;
    } else {
      all.unshift(user);
    }
    StorageService.saveAllUsers(all);

    const current = StorageService.getCurrentUser();
    if (current && current.id === user.id) {
      StorageService.setCurrentUser(user);
    }

    // 2. Actively sync to Supabase public.profiles
    await this.upsertProfileDirect(user);

    return user;
  },

  async deleteProfile(userId: string): Promise<void> {
    // 1. Delete locally
    StorageService.deleteUser(userId);

    // 2. Delete remotely
    if (this.isLive() && supabase) {
      try {
        await supabase.from('profiles').delete().eq('id', userId);
        await supabase.from('posts').delete().eq('author_id', userId);
        await supabase.from('matches').delete().eq('creator_id', userId);
        await supabase.from('friendships').delete().or(`requester_id.eq.${userId},recipient_id.eq.${userId}`);
      } catch (err) {
        console.warn('[SupabaseService] deleteProfile exception:', err);
      }
    }
  },

  async batchSyncProfiles(users: GolferUser[]): Promise<void> {
    if (!this.isLive() || !supabase || users.length === 0) return;
    try {
      const rows = users.map(mapUserToProfileRow);
      await supabase.from('profiles').upsert(rows, { onConflict: 'id' });
    } catch (err) {
      console.warn('[SupabaseService] batchSyncProfiles error:', err);
    }
  },

  // ==========================================
  // FRIENDSHIPS & SOCIAL CONNECTIONS
  // ==========================================
  async fetchFriendships(userId?: string): Promise<{
    requests: FriendRequest[];
    friendUserIds: string[];
    followedUserIds: string[];
  }> {
    if (!this.isLive() || !supabase || !userId) {
      const requests = StorageService.getFriendRequests();
      const friendIds = StorageService.getFriendUserIds(userId);
      const followedIds = StorageService.getFollowedUserIds(userId);
      return { requests, friendUserIds: friendIds, followedUserIds: followedIds };
    }

    try {
      // Get all friendship rows involving the user
      const { data, error } = await supabase
        .from('friendships')
        .select('*')
        .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`);

      if (error) {
        console.warn('[SupabaseService] fetchFriendships error:', error.message);
        return {
          requests: StorageService.getFriendRequests(),
          friendUserIds: StorageService.getFriendUserIds(userId),
          followedUserIds: StorageService.getFollowedUserIds(userId),
        };
      }

      const rows = data || [];
      const requests: FriendRequest[] = [];
      const friendIdsSet = new Set<string>();

      rows.forEach(r => {
        requests.push(mapFriendshipRowToRequest(r));
        if (r.status === 'accepted') {
          if (r.requester_id === userId) friendIdsSet.add(r.recipient_id);
          if (r.recipient_id === userId) friendIdsSet.add(r.requester_id);
        }
      });

      const friendUserIds = Array.from(friendIdsSet);
      // Merge with local followed IDs
      const followedUserIds = StorageService.getFollowedUserIds(userId);

      // Cache locally
      StorageService.saveFriendRequests(requests);
      StorageService.saveFriendUserIds(friendUserIds, userId);

      return { requests, friendUserIds, followedUserIds };
    } catch (err) {
      console.warn('[SupabaseService] fetchFriendships exception:', err);
      return {
        requests: StorageService.getFriendRequests(),
        friendUserIds: StorageService.getFriendUserIds(userId),
        followedUserIds: StorageService.getFollowedUserIds(userId),
      };
    }
  },

  async sendFriendRequest(req: FriendRequest): Promise<void> {
    // 1. Update local cache
    const current = StorageService.getFriendRequests();
    if (!current.some(r => r.id === req.id)) {
      StorageService.saveFriendRequests([req, ...current]);
    }

    // 2. Sync to Supabase
    if (this.isLive() && supabase) {
      try {
        const pairKey = [req.requesterId, req.recipientId].sort().join('_');
        await supabase.from('friendships').upsert({
          id: req.id,
          requester_id: req.requesterId,
          recipient_id: req.recipientId,
          status: req.status || 'pending',
          pair_key: pairKey,
          created_at: req.createdAt,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'pair_key' });
      } catch (err) {
        console.warn('[SupabaseService] sendFriendRequest exception:', err);
      }
    }
  },

  async updateFriendshipStatus(requestId: string, status: FriendshipStatus, currentUserId?: string, targetUserId?: string): Promise<void> {
    // 1. Update local cache
    const reqs = StorageService.getFriendRequests().map(r => 
      r.id === requestId ? { ...r, status, updatedAt: new Date().toISOString() } : r
    );
    StorageService.saveFriendRequests(reqs);

    if (status === 'accepted' && currentUserId && targetUserId) {
      const friends = new Set(StorageService.getFriendUserIds(currentUserId));
      friends.add(targetUserId);
      StorageService.saveFriendUserIds(Array.from(friends), currentUserId);
    }

    // 2. Sync to Supabase
    if (this.isLive() && supabase) {
      try {
        await supabase
          .from('friendships')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', requestId);
      } catch (err) {
        console.warn('[SupabaseService] updateFriendshipStatus error:', err);
      }
    }
  },

  async acceptFriendRequest(requestId: string, currentUserId?: string, requesterId?: string): Promise<void> {
    return this.updateFriendshipStatus(requestId, 'accepted', currentUserId, requesterId);
  },

  async declineFriendRequest(requestId: string): Promise<void> {
    return this.updateFriendshipStatus(requestId, 'declined');
  },

  // ==========================================
  // POSTS & SOCIAL FEED
  // ==========================================
  async fetchPosts(): Promise<GolfPost[]> {
    if (!this.isLive() || !supabase) {
      return StorageService.getPosts();
    }

    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.warn('[SupabaseService] fetchPosts error, falling back to local cache:', error.message);
        return StorageService.getPosts();
      }

      if (data && data.length > 0) {
        const posts = data.map(mapPostRowToPost);
        StorageService.savePosts(posts);
        return posts;
      }

      const localPosts = StorageService.getPosts();
      if (localPosts.length > 0) {
        this.batchSyncPosts(localPosts);
      }
      return localPosts;
    } catch (err) {
      console.warn('[SupabaseService] fetchPosts exception:', err);
      return StorageService.getPosts();
    }
  },

  async createPost(post: GolfPost): Promise<GolfPost> {
    // 1. Local update
    StorageService.addPost(post);

    // 2. Remote update
    if (this.isLive() && supabase) {
      try {
        const row = mapPostToRow(post);
        await supabase.from('posts').upsert(row, { onConflict: 'id' });
      } catch (err) {
        console.warn('[SupabaseService] createPost error:', err);
      }
    }

    return post;
  },

  async upsertPost(post: GolfPost): Promise<GolfPost> {
    // 1. Local update
    StorageService.upsertPost(post);

    // 2. Remote update
    if (this.isLive() && supabase) {
      try {
        const row = mapPostToRow(post);
        await supabase.from('posts').upsert(row, { onConflict: 'id' });
      } catch (err) {
        console.warn('[SupabaseService] upsertPost error:', err);
      }
    }

    return post;
  },

  async updatePost(post: GolfPost): Promise<void> {
    // 1. Local update
    const current = StorageService.getPosts().map(p => p.id === post.id ? post : p);
    StorageService.savePosts(current);

    // 2. Remote update
    if (this.isLive() && supabase) {
      try {
        const row = mapPostToRow(post);
        await supabase.from('posts').update(row).eq('id', post.id);
      } catch (err) {
        console.warn('[SupabaseService] updatePost error:', err);
      }
    }
  },

  async deletePost(postId: string): Promise<void> {
    const current = StorageService.getPosts().filter(p => p.id !== postId);
    StorageService.savePosts(current);

    if (this.isLive() && supabase) {
      try {
        await supabase.from('posts').delete().eq('id', postId);
      } catch (err) {
        console.warn('[SupabaseService] deletePost error:', err);
      }
    }
  },

  async batchSyncPosts(posts: GolfPost[]): Promise<void> {
    if (!this.isLive() || !supabase || posts.length === 0) return;
    try {
      const rows = posts.map(mapPostToRow);
      await supabase.from('posts').upsert(rows, { onConflict: 'id' });
    } catch (err) {
      console.warn('[SupabaseService] batchSyncPosts error:', err);
    }
  },

  // ==========================================
  // MATCHES
  // ==========================================
  async fetchMatches(): Promise<GolfMatch[]> {
    if (!this.isLive() || !supabase) {
      return StorageService.getMatches();
    }

    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[SupabaseService] fetchMatches error:', error.message);
        return StorageService.getMatches();
      }

      if (data && data.length > 0) {
        const matches = data.map(mapMatchRowToMatch);
        StorageService.saveMatches(matches);
        return matches;
      }

      const localMatches = StorageService.getMatches();
      if (localMatches.length > 0) {
        this.batchSyncMatches(localMatches);
      }
      return localMatches;
    } catch (err) {
      console.warn('[SupabaseService] fetchMatches exception:', err);
      return StorageService.getMatches();
    }
  },

  async upsertMatch(match: GolfMatch): Promise<GolfMatch> {
    // 1. Local update
    const matches = StorageService.getMatches();
    const idx = matches.findIndex(m => m.id === match.id);
    if (idx >= 0) {
      matches[idx] = match;
    } else {
      matches.unshift(match);
    }
    StorageService.saveMatches(matches);

    // 2. Remote update
    if (this.isLive() && supabase) {
      try {
        const row = mapMatchToRow(match);
        await supabase.from('matches').upsert(row, { onConflict: 'id' });
      } catch (err) {
        console.warn('[SupabaseService] upsertMatch error:', err);
      }
    }

    return match;
  },

  async createMatch(match: GolfMatch): Promise<GolfMatch> {
    return this.upsertMatch(match);
  },

  async updateMatch(match: GolfMatch): Promise<GolfMatch> {
    return this.upsertMatch(match);
  },

  async batchSyncMatches(matches: GolfMatch[]): Promise<void> {
    if (!this.isLive() || !supabase || matches.length === 0) return;
    try {
      const rows = matches.map(mapMatchToRow);
      await supabase.from('matches').upsert(rows, { onConflict: 'id' });
    } catch (err) {
      console.warn('[SupabaseService] batchSyncMatches error:', err);
    }
  },

  // ==========================================
  // TOURNAMENTS
  // ==========================================
  async fetchTournament(userId?: string): Promise<Tournament | null> {
    if (!this.isLive() || !supabase) {
      return StorageService.getTournament(userId);
    }

    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn('[SupabaseService] fetchTournament error:', error.message);
        return StorageService.getTournament(userId);
      }

      if (data) {
        const t = mapTournamentRowToTournament(data);
        StorageService.saveTournament(t, userId);
        return t;
      }

      return StorageService.getTournament(userId);
    } catch (err) {
      console.warn('[SupabaseService] fetchTournament exception:', err);
      return StorageService.getTournament(userId);
    }
  },

  async upsertTournament(tournament: Tournament, userId?: string): Promise<Tournament> {
    // 1. Local update
    StorageService.saveTournament(tournament, userId);

    // 2. Remote update
    if (this.isLive() && supabase) {
      try {
        const row = mapTournamentToRow(tournament);
        await supabase.from('tournaments').upsert(row, { onConflict: 'id' });
      } catch (err) {
        console.warn('[SupabaseService] upsertTournament error:', err);
      }
    }

    return tournament;
  },

  async fetchUserTournaments(userId: string): Promise<Tournament[]> {
    const local = StorageService.getUserTournaments(userId);
    if (!this.isLive() || !supabase || !userId) {
      return local;
    }

    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[SupabaseService] fetchUserTournaments error:', error.message);
        return local;
      }

      if (data && data.length > 0) {
        const allTournaments = data.map(mapTournamentRowToTournament);
        const userTournaments = allTournaments.filter(t => 
          t.organizerId === userId || 
          t.creatorId === userId || 
          (Array.isArray(t.teams) && t.teams.some(team => Array.isArray(team.playerIds) && team.playerIds.includes(userId)))
        );
        userTournaments.forEach(t => StorageService.saveTournament(t, userId));
        return userTournaments.length > 0 ? userTournaments : local;
      }

      return local;
    } catch (err) {
      console.warn('[SupabaseService] fetchUserTournaments exception:', err);
      return local;
    }
  },

  // ==========================================
  // REAL-TIME SUBSCRIPTIONS
  // ==========================================
  subscribeToFeed(onNewPost: (post: GolfPost) => void): (() => void) | null {
    if (!this.isLive() || !supabase) return null;

    try {
      const channel = supabase
        .channel('public:posts')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, payload => {
          if (payload.new) {
            const post = mapPostRowToPost(payload.new);
            onNewPost(post);
          }
        })
        .subscribe();

      return () => {
        supabase?.removeChannel(channel);
      };
    } catch (err) {
      console.warn('[SupabaseService] Real-time feed subscription error:', err);
      return null;
    }
  }
};
