import { GolferUser, GolfPost, GolfMatch, FriendRequest, Tournament, FineCategory, PlayerFineRecord } from '../types/golf';
import { DEFAULT_FINE_CATEGORIES } from './finesEngine';
import { dedupeUsers, isSameUser } from './userDedupe';

const STORAGE_KEYS = {
  CURRENT_USER: 'golftour_golf_current_user',
  ALL_USERS: 'golftour_golf_all_users',
  POSTS: 'golftour_golf_posts',
  MATCHES: 'golftour_golf_matches',
  FRIEND_REQUESTS: 'golftour_golf_friend_requests',
  FRIENDS: 'golftour_golf_friends',
  FOLLOWED: 'golftour_golf_followed',
  TOURNAMENT: 'golftour_golf_tournament_active',
  TOURNAMENTS_HISTORY: 'golftour_golf_tournaments_history',
  FEED_SHARE_OPT_IN: 'golftour_golf_feed_share_opt_in',
  FINES_MODE: 'golftour_golf_fines_mode_enabled',
  FINES_RECORDS: 'golftour_golf_fines_records',
  FINE_CATEGORIES: 'golftour_golf_fine_categories',
  INITIALIZED: 'golftour_golf_initialized_v4',
  ACCOUNT_RESET_MIGRATION: 'golftour_accounts_reset_v4',
};

// Safe JSON parser
function safeParse<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item);
  } catch (err) {
    console.error(`Error reading ${key} from storage:`, err);
    return fallback;
  }
}

// Safe JSON setter
function safeSet(key: string, value: any): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error saving ${key} to storage:`, err);
  }
}

export const StorageService = {
  // Migration routine to clear legacy accounts and start fresh
  runAccountResetMigration(): void {
    try {
      const hasMigrated = localStorage.getItem(STORAGE_KEYS.ACCOUNT_RESET_MIGRATION);
      if (!hasMigrated) {
        // Clear all legacy Playtomic & test account keys
        const legacyKeys = [
          'playtomic_golf_registered_users',
          'playtomic_golf_current_user',
          'playtomic_golf_credentials',
          'playtomic_golf_all_users',
          'playtomic_golf_posts',
          'playtomic_golf_matches',
          'playtomic_golf_friend_requests',
          'playtomic_golf_friends',
          'playtomic_golf_followed',
          'playtomic_golf_tournament_active',
          'playtomic_golf_fines_mode_enabled',
          'playtomic_golf_fines_records',
          'playtomic_golf_fine_categories',
          'playtomic_golf_initialized_v3',
          'golftour_golf_current_user',
          'golftour_golf_all_users',
          'golftour_registered_users',
          'golftour_credentials',
        ];

        // Also sweep any localStorage key containing 'playtomic'
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k && k.toLowerCase().includes('playtomic')) {
            localStorage.removeItem(k);
          }
        }

        legacyKeys.forEach(k => localStorage.removeItem(k));

        // Start user storage as pure clean slate
        localStorage.setItem(STORAGE_KEYS.ALL_USERS, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.FINE_CATEGORIES, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.FINES_RECORDS, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.ACCOUNT_RESET_MIGRATION, 'true');
      }
    } catch (e) {
      console.error('Account reset migration error:', e);
    }
  },

  // Clear everything to a clean slate (0 users, 0 posts, 0 matches, 0 tournaments)
  resetDatabase(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      localStorage.removeItem(STORAGE_KEYS.ALL_USERS);
      localStorage.removeItem(STORAGE_KEYS.POSTS);
      localStorage.removeItem(STORAGE_KEYS.MATCHES);
      localStorage.removeItem(STORAGE_KEYS.FRIEND_REQUESTS);
      localStorage.removeItem(STORAGE_KEYS.FRIENDS);
      localStorage.removeItem(STORAGE_KEYS.FOLLOWED);
      localStorage.removeItem(STORAGE_KEYS.TOURNAMENT);
      localStorage.removeItem(STORAGE_KEYS.FINES_MODE);
      localStorage.removeItem(STORAGE_KEYS.FINES_RECORDS);
      localStorage.removeItem(STORAGE_KEYS.FINE_CATEGORIES);
      localStorage.removeItem(STORAGE_KEYS.INITIALIZED);
    } catch (e) {
      console.error('Failed to reset database:', e);
    }
  },

  getCurrentUser(): GolferUser | null {
    this.runAccountResetMigration();
    return safeParse<GolferUser | null>(STORAGE_KEYS.CURRENT_USER, null);
  },

  setCurrentUser(user: GolferUser | null): void {
    if (user) {
      safeSet(STORAGE_KEYS.CURRENT_USER, user);
      const all = this.getAllUsers();
      const existingIdx = all.findIndex(u => isSameUser(u, user));
      if (existingIdx >= 0) {
        all[existingIdx] = user;
      } else {
        all.unshift(user);
      }
      this.saveAllUsers(all);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  },

  getAllUsers(): GolferUser[] {
    this.runAccountResetMigration();
    const raw = safeParse<GolferUser[]>(STORAGE_KEYS.ALL_USERS, []);
    const deduped = dedupeUsers(raw);
    if (deduped.length !== raw.length) {
      safeSet(STORAGE_KEYS.ALL_USERS, deduped);
    }
    return deduped;
  },

  getUserById(userId: string): GolferUser | null {
    if (!userId) return null;
    const all = this.getAllUsers();
    return all.find(u => isSameUser(u, userId)) || null;
  },

  saveAllUsers(users: GolferUser[]): void {
    const deduped = dedupeUsers(users);
    safeSet(STORAGE_KEYS.ALL_USERS, deduped);
  },

  setAllUsers(users: GolferUser[]): void {
    this.saveAllUsers(users);
  },

  deleteUser(userId: string): void {
    try {
      // 1. Remove from all users
      const allUsers = this.getAllUsers().filter(u => u.id !== userId);
      this.saveAllUsers(allUsers);

      // 2. Remove from active session if current
      const cur = this.getCurrentUser();
      if (cur && cur.id === userId) {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      }

      // 3. Clean up user-scoped storage keys
      localStorage.removeItem(`${STORAGE_KEYS.FRIENDS}_${userId}`);
      localStorage.removeItem(`${STORAGE_KEYS.FOLLOWED}_${userId}`);
      localStorage.removeItem(`${STORAGE_KEYS.TOURNAMENT}_${userId}`);

      // Also remove this user from any other user's friends/followed lists
      const allUsersList = this.getAllUsers();
      allUsersList.forEach(otherUser => {
        const otherFriends = this.getFriendUserIds(otherUser.id);
        if (otherFriends.includes(userId)) {
          this.saveFriendUserIds(otherFriends.filter(id => id !== userId), otherUser.id);
        }
        const otherFollowed = this.getFollowedUserIds(otherUser.id);
        if (otherFollowed.includes(userId)) {
          this.saveFollowedUserIds(otherFollowed.filter(id => id !== userId), otherUser.id);
        }
      });

      // Legacy key cleanup fallback
      const friends = this.getFriendUserIds().filter(id => id !== userId);
      this.saveFriendUserIds(friends);
      const followed = this.getFollowedUserIds().filter(id => id !== userId);
      this.saveFollowedUserIds(followed);

      // 4. Remove from friend requests
      const reqs = this.getFriendRequests().filter(
        r => r.requesterId !== userId && r.recipientId !== userId
      );
      this.saveFriendRequests(reqs);

      // 6. Remove user's posts
      const posts = this.getPosts().filter(p => p.authorId !== userId);
      this.savePosts(posts);

      // 7. Remove player from matches
      const matches = this.getMatches().map(m => {
        if (m.players.some(p => p.userId === userId)) {
          const updatedPlayers = m.players.filter(p => p.userId !== userId);
          return {
            ...m,
            players: updatedPlayers,
            status: (updatedPlayers.length === 0 ? 'cancelled' : 'open') as any,
          };
        }
        return m;
      });
      this.saveMatches(matches);

      // 8. Remove from active tournament
      const tour = this.getTournament();
      if (tour) {
        let changed = false;
        const updatedTeams = tour.teams.map(t => {
          if (t.playerIds.includes(userId)) {
            changed = true;
            return {
              ...t,
              playerIds: t.playerIds.filter(id => id !== userId),
            };
          }
          return t;
        });

        if (changed) {
          this.saveTournament({
            ...tour,
            teams: updatedTeams,
          });
        }
      }
    } catch (e) {
      console.error('Error deleting user from storage:', e);
    }
  },

  getPosts(): GolfPost[] {
    return safeParse<GolfPost[]>(STORAGE_KEYS.POSTS, []);
  },

  addPost(post: GolfPost): void {
    const current = this.getPosts();
    // Avoid duplicate post entries
    if (current.some(p => p.id === post.id)) return;
    const updated = [post, ...current];
    this.savePosts(updated);
    try {
      window.dispatchEvent(new CustomEvent('golftour_feed_sync', { detail: { post } }));
    } catch {
      // ignore
    }
  },

  upsertPost(post: GolfPost): void {
    const current = this.getPosts();
    const existingIndex = current.findIndex(p => p.id === post.id);
    let updated: GolfPost[];
    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = post;
    } else {
      updated = [post, ...current];
    }
    this.savePosts(updated);
    try {
      window.dispatchEvent(new CustomEvent('golftour_feed_sync', { detail: { post } }));
    } catch {
      // ignore
    }
  },

  savePosts(posts: GolfPost[]): void {
    safeSet(STORAGE_KEYS.POSTS, posts);
  },

  setPosts(posts: GolfPost[]): void {
    this.savePosts(posts);
  },

  getMatches(): GolfMatch[] {
    return safeParse<GolfMatch[]>(STORAGE_KEYS.MATCHES, []);
  },

  saveMatches(matches: GolfMatch[]): void {
    safeSet(STORAGE_KEYS.MATCHES, matches);
  },

  setMatches(matches: GolfMatch[]): void {
    this.saveMatches(matches);
  },

  getFriendRequests(): FriendRequest[] {
    const all = safeParse<FriendRequest[]>(STORAGE_KEYS.FRIEND_REQUESTS, []);
    return all.filter(r => !isSameUser(r.requesterId, r.recipientId));
  },

  saveFriendRequests(requests: FriendRequest[]): void {
    const clean = requests.filter(r => !isSameUser(r.requesterId, r.recipientId));
    safeSet(STORAGE_KEYS.FRIEND_REQUESTS, clean);
  },

  setFriendRequests(requests: FriendRequest[]): void {
    this.saveFriendRequests(requests);
  },

  getFriendUserIds(userId?: string): string[] {
    if (userId) {
      const userScoped = safeParse<string[] | null>(`${STORAGE_KEYS.FRIENDS}_${userId}`, null);
      if (userScoped !== null) return userScoped.filter(id => !isSameUser(id, userId));
    }
    return safeParse<string[]>(STORAGE_KEYS.FRIENDS, []);
  },

  getFriendIds(userId?: string): string[] {
    return this.getFriendUserIds(userId);
  },

  saveFriendUserIds(ids: string[], userId?: string): void {
    const cleanIds = userId ? ids.filter(id => !isSameUser(id, userId)) : ids;
    if (userId) {
      safeSet(`${STORAGE_KEYS.FRIENDS}_${userId}`, cleanIds);
    } else {
      safeSet(STORAGE_KEYS.FRIENDS, cleanIds);
    }
  },

  setFriendIds(ids: string[], userId?: string): void {
    this.saveFriendUserIds(ids, userId);
  },

  getFollowedUserIds(userId?: string): string[] {
    if (userId) {
      const userScoped = safeParse<string[] | null>(`${STORAGE_KEYS.FOLLOWED}_${userId}`, null);
      if (userScoped !== null) return userScoped;
    }
    return safeParse<string[]>(STORAGE_KEYS.FOLLOWED, []);
  },

  getFollowedIds(userId?: string): string[] {
    return this.getFollowedUserIds(userId);
  },

  saveFollowedUserIds(ids: string[], userId?: string): void {
    if (userId) {
      safeSet(`${STORAGE_KEYS.FOLLOWED}_${userId}`, ids);
    } else {
      safeSet(STORAGE_KEYS.FOLLOWED, ids);
    }
  },

  setFollowedIds(ids: string[], userId?: string): void {
    this.saveFollowedUserIds(ids, userId);
  },

  getTournament(userId?: string): Tournament | null {
    if (userId) {
      const userTournament = safeParse<Tournament | null>(`${STORAGE_KEYS.TOURNAMENT}_${userId}`, null);
      if (userTournament) return userTournament;
    }
    // Fallback only if no userId provided
    if (!userId) {
      return safeParse<Tournament | null>(STORAGE_KEYS.TOURNAMENT, null);
    }
    return null;
  },

  getUserTournaments(userId: string): Tournament[] {
    if (!userId) return [];
    const history = safeParse<Tournament[]>(`${STORAGE_KEYS.TOURNAMENTS_HISTORY}_${userId}`, []);
    const active = this.getTournament(userId);
    
    // Merge active with history avoiding duplicates
    const map = new Map<string, Tournament>();
    if (active) map.set(active.id, active);
    history.forEach(t => {
      if (!map.has(t.id)) map.set(t.id, t);
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
    );
  },

  saveTournament(tournament: Tournament | null, userId?: string): void {
    const targetUserId = userId || tournament?.creatorId || tournament?.organizerId;
    if (targetUserId) {
      if (tournament) {
        safeSet(`${STORAGE_KEYS.TOURNAMENT}_${targetUserId}`, tournament);
        // If tournament includes rostered friend players, ensure the tournament is accessible in their session too
        const team1Players = tournament.teams[0]?.playerIds || [];
        const team2Players = tournament.teams[1]?.playerIds || [];
        const allRosterIds = Array.from(new Set([targetUserId, ...team1Players, ...team2Players, tournament.organizerId]));
        
        allRosterIds.forEach(memberId => {
          if (memberId) {
            safeSet(`${STORAGE_KEYS.TOURNAMENT}_${memberId}`, tournament);
            
            // Append/update in member's tournament history index
            const memberHistory = safeParse<Tournament[]>(`${STORAGE_KEYS.TOURNAMENTS_HISTORY}_${memberId}`, []);
            const existingIdx = memberHistory.findIndex(th => th.id === tournament.id);
            let updatedHistory: Tournament[];
            if (existingIdx >= 0) {
              updatedHistory = [...memberHistory];
              updatedHistory[existingIdx] = tournament;
            } else {
              updatedHistory = [tournament, ...memberHistory];
            }
            safeSet(`${STORAGE_KEYS.TOURNAMENTS_HISTORY}_${memberId}`, updatedHistory);
          }
        });
      } else {
        localStorage.removeItem(`${STORAGE_KEYS.TOURNAMENT}_${targetUserId}`);
      }
    } else {
      if (tournament) {
        safeSet(STORAGE_KEYS.TOURNAMENT, tournament);
      } else {
        localStorage.removeItem(STORAGE_KEYS.TOURNAMENT);
      }
    }
  },

  deleteTournament(tournamentId: string, userId?: string): void {
    if (!tournamentId) return;
    if (userId) {
      const active = this.getTournament(userId);
      if (active?.id === tournamentId) {
        localStorage.removeItem(`${STORAGE_KEYS.TOURNAMENT}_${userId}`);
      }
      const history = safeParse<Tournament[]>(`${STORAGE_KEYS.TOURNAMENTS_HISTORY}_${userId}`, []);
      const filtered = history.filter(t => t.id !== tournamentId);
      safeSet(`${STORAGE_KEYS.TOURNAMENTS_HISTORY}_${userId}`, filtered);
    }
    const globalActive = safeParse<Tournament | null>(STORAGE_KEYS.TOURNAMENT, null);
    if (globalActive?.id === tournamentId) {
      localStorage.removeItem(STORAGE_KEYS.TOURNAMENT);
    }
  },

  getPlayerFeedShareOptIn(tournamentId: string, userId: string): boolean {
    if (!tournamentId || !userId) return false;
    const key = `${STORAGE_KEYS.FEED_SHARE_OPT_IN}_${tournamentId}_${userId}`;
    return safeParse<boolean>(key, false);
  },

  setPlayerFeedShareOptIn(tournamentId: string, userId: string, enabled: boolean): void {
    if (!tournamentId || !userId) return;
    const key = `${STORAGE_KEYS.FEED_SHARE_OPT_IN}_${tournamentId}_${userId}`;
    safeSet(key, enabled);
  },

  // ==========================================
  // FINES MODE & BAR TAB PENALTY PERSISTENCE
  // ==========================================
  getFinesMode(): boolean {
    const val = localStorage.getItem(STORAGE_KEYS.FINES_MODE);
    if (val === null) return true; // Enabled by default for tournament atmosphere
    return val === 'true';
  },

  setFinesMode(enabled: boolean): void {
    localStorage.setItem(STORAGE_KEYS.FINES_MODE, enabled ? 'true' : 'false');
  },

  getFines(): PlayerFineRecord[] {
    return safeParse<PlayerFineRecord[]>(STORAGE_KEYS.FINES_RECORDS, []);
  },

  saveFines(fines: PlayerFineRecord[]): void {
    const seenIds = new Set<string>();
    const uniqueFines: PlayerFineRecord[] = [];
    for (const f of fines) {
      if (f && f.id && !seenIds.has(f.id)) {
        seenIds.add(f.id);
        uniqueFines.push(f);
      }
    }
    safeSet(STORAGE_KEYS.FINES_RECORDS, uniqueFines);
  },

  saveFine(fine: PlayerFineRecord): void {
    const fines = this.getFines();
    const existingIndex = fines.findIndex(f => f.id === fine.id);
    if (existingIndex >= 0) {
      fines[existingIndex] = fine;
    } else {
      fines.unshift(fine);
    }
    this.saveFines(fines);
  },

  deleteFine(fineId: string): void {
    const fines = this.getFines().filter(f => f.id !== fineId);
    this.saveFines(fines);
  },

  getFineCategories(): FineCategory[] {
    const custom = safeParse<FineCategory[] | null>(STORAGE_KEYS.FINE_CATEGORIES, null);
    if (custom && Array.isArray(custom)) {
      return custom;
    }
    return DEFAULT_FINE_CATEGORIES;
  },

  saveFineCategories(categories: FineCategory[]): void {
    safeSet(STORAGE_KEYS.FINE_CATEGORIES, categories);
  },

  saveFineCategory(category: FineCategory): void {
    const list = this.getFineCategories();
    const existingIndex = list.findIndex(c => c.id === category.id);
    if (existingIndex >= 0) {
      list[existingIndex] = category;
    } else {
      list.push(category);
    }
    this.saveFineCategories(list);
  },

  deleteFineCategory(categoryId: string): void {
    const list = this.getFineCategories().filter(c => c.id !== categoryId);
    this.saveFineCategories(list);
  },

  // Secondary cache sync tracking
  getLastSyncTimestamp(): string | null {
    return localStorage.getItem('golftour_last_sync_timestamp');
  },

  markCacheSynchronized(source: 'supabase' | 'local' = 'supabase'): void {
    try {
      const now = new Date().toISOString();
      localStorage.setItem('golftour_last_sync_timestamp', now);
      localStorage.setItem('golftour_last_sync_source', source);
    } catch {
      // ignore storage error
    }
  },

  getCacheStatus(): { isCached: boolean; lastSync: string | null; cachedUserCount: number; cachedPostsCount: number } {
    return {
      isCached: this.getAllUsers().length > 0,
      lastSync: this.getLastSyncTimestamp(),
      cachedUserCount: this.getAllUsers().length,
      cachedPostsCount: this.getPosts().length,
    };
  },

  // Purges any traces of mock seed data (Marcus Vance, Sophia Chen, etc.)
  clearLegacyMockData(): void {
    const cur = this.getCurrentUser();
    if (cur && (cur.id === 'user-marcus' || cur.displayName === 'Marcus Vance')) {
      this.setCurrentUser(null);
    }
    const all = this.getAllUsers().filter(u => u.id !== 'user-marcus' && u.displayName !== 'Marcus Vance');
    this.saveAllUsers(all);
  }
};
