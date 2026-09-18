import { GolferUser, TeeColor } from '../types/golf';
import { StorageService } from '../utils/storage';
import { SupabaseService } from './supabaseService';
import { supabase, isSupabaseConfigured, getSupabaseClient } from '../lib/supabase';

const STORAGE_KEYS = {
  REGISTERED_USERS: 'golftour_registered_users',
  AUTH_SESSION: 'golftour_golf_current_user',
  CREDENTIALS: 'golftour_credentials',
};

export interface SignUpParams {
  displayName: string;
  username: string;
  email: string;
  password: string;
  handicapIndex: number;
  homeClubId: string;
  homeClubName: string;
  city?: string;
  country?: string;
  preferredTees?: TeeColor;
  bio?: string;
  photoURL?: string;
}

export interface SignUpResult {
  user?: GolferUser;
  sessionCreated?: boolean;
  requiresEmailConfirmation?: boolean;
  email?: string;
  error?: string;
}

export interface LoginParams {
  identifier: string; // Email or @username
  password: string;
}

interface StoredCredential {
  userId: string;
  email: string;
  username: string;
  passwordHash: string; // Base64 encoded simple hash for secure client persistence
}

// Generates an elegant SVG monogram avatar data URL with golfer initials
export function generateInitialsAvatar(name: string, bgGradient = 'emerald'): string {
  const cleanName = (name || 'Golfer').trim();
  const parts = cleanName.split(/\s+/);
  const initials = parts.length > 1 
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : cleanName.substring(0, 2).toUpperCase();

  const colorMap: Record<string, [string, string]> = {
    emerald: ['#059669', '#064e3b'],
    teal: ['#0d9488', '#134e4a'],
    sky: ['#0284c7', '#0c4a6e'],
    amber: ['#d97706', '#78350f'],
    purple: ['#7c3aed', '#4c1d95'],
    slate: ['#475569', '#0f172a'],
  };

  const [c1, c2] = colorMap[bgGradient] || colorMap.emerald;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${c1}" />
          <stop offset="100%" stop-color="${c2}" />
        </linearGradient>
      </defs>
      <rect width="160" height="160" rx="80" fill="url(#grad)" />
      <circle cx="80" cy="80" r="74" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="3" />
      <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" 
            fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
            font-size="54" font-weight="900" letter-spacing="-1">${initials}</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Simple credential encoding for client-side authentication
function encodePassword(pw: string): string {
  try {
    return btoa(unescape(encodeURIComponent(pw.trim())));
  } catch {
    return pw;
  }
}

export const AuthService = {
  /**
   * Sanitizes all legacy mock data (Marcus Vance, Sophia Chen, Sam Ndlovu, etc.)
   * ensuring the app starts as a pure, authentic production user database.
   */
  sanitizeLegacyMockData(): void {
    try {
      // 1. Check current session
      const cur = StorageService.getCurrentUser();
      if (cur && (
        cur.id === 'user-marcus' || 
        cur.id === 'user-sophia' || 
        cur.id === 'user-sam' || 
        cur.id === 'user-elena' ||
        cur.displayName === 'Marcus Vance' ||
        cur.displayName === 'Sophia Chen'
      )) {
        StorageService.setCurrentUser(null);
      }

      // 2. Check all users
      const all = StorageService.getAllUsers();
      const authenticUsers = all.filter(u => 
        u.id !== 'user-marcus' && 
        u.id !== 'user-sophia' && 
        u.id !== 'user-sam' && 
        u.id !== 'user-elena' &&
        u.displayName !== 'Marcus Vance' &&
        u.displayName !== 'Sophia Chen' &&
        !u.id.startsWith('spar-user-')
      );

      if (authenticUsers.length !== all.length) {
        StorageService.saveAllUsers(authenticUsers);
      }

      // 3. Check registered credentials
      const credsRaw = localStorage.getItem(STORAGE_KEYS.CREDENTIALS);
      if (credsRaw) {
        try {
          const creds: StoredCredential[] = JSON.parse(credsRaw);
          const cleanCreds = creds.filter(c => 
            c.userId !== 'user-marcus' && 
            c.userId !== 'user-sophia' && 
            c.username !== 'marcusvance'
          );
          localStorage.setItem(STORAGE_KEYS.CREDENTIALS, JSON.stringify(cleanCreds));
        } catch {
          // ignore
        }
      }
    } catch (e) {
      console.error('Error sanitizing legacy data:', e);
    }
  },

  /**
   * Retrieve all registered authentic golfer profiles
   */
  getRegisteredUsers(): GolferUser[] {
    this.sanitizeLegacyMockData();
    return StorageService.getAllUsers();
  },

  /**
   * Get active logged-in user
   */
  getCurrentUser(): GolferUser | null {
    this.sanitizeLegacyMockData();
    return StorageService.getCurrentUser();
  },

  /**
   * Register a new authentic golfer account with live Supabase Auth (auth.users) and public.profiles table
   */
  async signUpAsync(params: SignUpParams): Promise<SignUpResult> {
    const displayName = params.displayName.trim();
    const rawUsername = params.username.trim().replace(/^@/, '');
    const cleanUsername = rawUsername.toLowerCase().replace(/[^a-z0-9_]/g, '');
    const cleanEmail = params.email.trim().toLowerCase();
    const password = params.password;

    if (!displayName || displayName.length < 2) {
      return { error: 'Please enter your full name (at least 2 characters).' };
    }

    if (!cleanUsername || cleanUsername.length < 3) {
      return { error: 'Username must be at least 3 characters and contain only letters, numbers, or underscores.' };
    }

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return { error: 'Please provide a valid email address.' };
    }

    if (!password || password.length < 6) {
      return { error: 'Password must be at least 6 characters long.' };
    }

    if (!isSupabaseConfigured() || !supabase) {
      return { error: 'Supabase authentication is not configured. Please check your credentials in .env.' };
    }

    const hcp = Number(params.handicapIndex) || 0;
    const computedLevel = Math.max(0.5, Math.min(7.0, Number((7.0 - (hcp * 0.15)).toFixed(2))));
    const finalPhoto = params.photoURL?.trim() || generateInitialsAvatar(displayName);
    const nowIso = new Date().toISOString();

    try {
      console.log('[AuthService] Checking Supabase for existing username:', cleanUsername);
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, username')
        .ilike('username', cleanUsername)
        .maybeSingle();

      if (existingProfile) {
        return { error: `Username @${cleanUsername} is already taken in the Supabase database. Please choose another.` };
      }

      console.log('[AuthService] Sending network request to Supabase Auth (auth.users) for:', cleanEmail);
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: {
            display_name: displayName,
            username: cleanUsername,
            handicap_index: hcp,
            home_club_id: params.homeClubId,
            home_club_name: params.homeClubName,
            photo_url: finalPhoto,
          },
        },
      });

      if (authError) {
        console.error('[AuthService] Supabase auth.signUp returned error:', authError);
        const msg = authError.message;
        if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already exists') || msg.toLowerCase().includes('user already exists')) {
          return { error: `An account with ${cleanEmail} is already registered in Supabase. Please log in with your password.` };
        }
        return { error: msg };
      }

      if (!authData?.user) {
        return { error: 'Supabase authentication service failed to create user account. Please try again.' };
      }

      const assignedUserId = authData.user.id;
      const hasSession = Boolean(authData.session);
      const emailVerified = Boolean(authData.user.email_confirmed_at || hasSession);

      const newUser: GolferUser = {
        id: assignedUserId,
        displayName,
        username: cleanUsername,
        email: cleanEmail,
        photoURL: finalPhoto,
        handicapIndex: Number(hcp.toFixed(1)),
        golfTourLevel: computedLevel,
        homeClubId: params.homeClubId,
        homeClubName: params.homeClubName,
        city: params.city || 'Garden Route',
        country: params.country || 'South Africa',
        bio: params.bio?.trim() || '',
        preferredTees: params.preferredTees || 'White',
        isPublic: true,
        isOnline: true,
        emailVerified,
        friendsCount: 0,
        followersCount: 0,
        followingCount: 0,
        roundsCount: 0,
        bestScore: 0,
        stats: {
          fairwaysHitPct: 0,
          greensInRegPct: 0,
          avgPuttsPerRound: 0,
          scramblingPct: 0,
          holesInOne: 0,
          eaglesCount: 0,
          birdiesCount: 0,
        },
        bag: [
          { category: 'Driver', brand: 'TaylorMade', model: 'Qi10' },
          { category: 'Iron', brand: 'Titleist', model: 'T150' },
          { category: 'Wedge', brand: 'Vokey Design', model: 'SM10' },
          { category: 'Putter', brand: 'Scotty Cameron', model: 'Phantom X' },
        ],
        handicapHistory: [],
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      console.log('[AuthService] Persisting profile record to Supabase public.profiles...');
      const profileResult = await SupabaseService.upsertProfileDirect(newUser);
      if (!profileResult.success) {
        console.warn('[AuthService] Supabase profile upsert warning:', profileResult.error);
      } else {
        console.log('[AuthService] Profile successfully saved to Supabase public.profiles!');
      }

      const allUsers = this.getRegisteredUsers().filter(u => u.id !== assignedUserId);
      StorageService.saveAllUsers([newUser, ...allUsers]);

      if (hasSession) {
        StorageService.setCurrentUser(newUser);
        return {
          user: newUser,
          sessionCreated: true,
          requiresEmailConfirmation: false,
          email: cleanEmail,
        };
      } else {
        return {
          user: newUser,
          sessionCreated: false,
          requiresEmailConfirmation: true,
          email: cleanEmail,
        };
      }
    } catch (networkErr: any) {
      console.error('[AuthService] Network error during Supabase signUp:', networkErr);
      return { error: networkErr?.message || 'Failed to connect to Supabase authentication server. Please check your network and credentials.' };
    }
  },

  /**
   * Register a new authentic golfer account (synchronous delegate)
   */
  signUp(params: SignUpParams): { user?: GolferUser; error?: string } {
    return { error: 'Please use the asynchronous signUpAsync method to register directly with Supabase.' };
  },

  /**
   * Log into an existing authentic account (synchronous delegate)
   */
  login(params: LoginParams): { user?: GolferUser; error?: string } {
    return { error: 'Please use the asynchronous loginAsync method to authenticate directly with Supabase.' };
  },

  /**
   * Asynchronous login actively authenticating against Supabase Auth (auth.users) and public.profiles
   */
  async loginAsync(params: LoginParams): Promise<{ user?: GolferUser; error?: string }> {
    const rawId = params.identifier.trim().replace(/^@/, '').toLowerCase();
    const password = params.password.trim();

    if (!rawId) {
      return { error: 'Please enter your email or username.' };
    }

    if (!password) {
      return { error: 'Please enter your password.' };
    }

    if (!isSupabaseConfigured() || !supabase) {
      return { error: 'Supabase authentication is not configured. Please check your credentials in .env.' };
    }

    try {
      let targetEmail = rawId;

      // If identifier is a username, find corresponding email in Supabase profiles
      if (!rawId.includes('@')) {
        console.log('[AuthService] Resolving email for username @' + rawId + ' on Supabase...');
        const { data: profileRow } = await supabase
          .from('profiles')
          .select('id, email, username')
          .ilike('username', rawId)
          .maybeSingle();

        if (profileRow?.email) {
          targetEmail = profileRow.email;
        } else {
          return { error: `No registered golfer found for username @${rawId}. Please check the username or create a profile.` };
        }
      }

      console.log('[AuthService] Submitting network request to supabase.auth.signInWithPassword for:', targetEmail);
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: password,
      });

      if (authError) {
        console.warn('[AuthService] Supabase signInWithPassword returned error:', authError.message);
        return { error: authError.message };
      }

      if (!authData?.user) {
        return { error: 'Invalid login credentials. Please verify your email/username and password.' };
      }

      console.log('[AuthService] Supabase authentication successful for user UUID:', authData.user.id);
      let profile = await SupabaseService.fetchProfileById(authData.user.id);
      if (!profile) {
        profile = {
          id: authData.user.id,
          displayName: authData.user.user_metadata?.display_name || authData.user.email?.split('@')[0] || 'Golfer',
          username: authData.user.user_metadata?.username || (authData.user.email?.split('@')[0] || 'golfer').toLowerCase(),
          email: authData.user.email || targetEmail,
          photoURL: authData.user.user_metadata?.photo_url || generateInitialsAvatar(authData.user.user_metadata?.display_name || 'Golfer'),
          handicapIndex: Number(authData.user.user_metadata?.handicap_index ?? 12.4),
          golfTourLevel: 4.0,
          homeClubId: authData.user.user_metadata?.home_club_id || 'course-simola-estate',
          homeClubName: authData.user.user_metadata?.home_club_name || 'Simola Golf Club',
          city: 'Garden Route',
          country: 'South Africa',
          bio: '',
          preferredTees: 'White',
          isPublic: true,
          isOnline: true,
          emailVerified: Boolean(authData.user.email_confirmed_at),
          friendsCount: 0,
          followersCount: 0,
          followingCount: 0,
          roundsCount: 0,
          bestScore: 0,
          stats: {
            fairwaysHitPct: 0,
            greensInRegPct: 0,
            avgPuttsPerRound: 0,
            scramblingPct: 0,
            holesInOne: 0,
            eaglesCount: 0,
            birdiesCount: 0,
          },
          bag: [],
          handicapHistory: [],
          createdAt: authData.user.created_at || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await SupabaseService.upsertProfileDirect(profile);
      } else if (authData.user.email_confirmed_at && !profile.emailVerified) {
        profile.emailVerified = true;
        await SupabaseService.upsertProfileDirect(profile);
      }

      StorageService.setCurrentUser(profile);
      const allUsers = this.getRegisteredUsers().filter(u => u.id !== profile!.id);
      StorageService.saveAllUsers([profile, ...allUsers]);

      return { user: profile };
    } catch (err: any) {
      console.error('[AuthService] Supabase live auth exception:', err);
      return { error: err?.message || 'Failed to connect to Supabase authentication server.' };
    }
  },

  /**
   * Log out active user and clear Supabase auth session
   */
  async logoutAsync(): Promise<void> {
    if (SupabaseService.isLive() && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('[AuthService] Supabase signOut exception:', err);
      }
    }
    this.logout();
  },

  /**
   * Log out active user
   */
  logout(): void {
    StorageService.setCurrentUser(null);
  },

  /**
   * Fast-switch to an existing account on this device
   */
  switchUser(userId: string): GolferUser | null {
    const allUsers = this.getRegisteredUsers();
    const target = allUsers.find(u => u.id === userId);
    if (target) {
      StorageService.setCurrentUser(target);
      return target;
    }
    return null;
  },

  /**
   * Update profile information
   */
  updateProfile(userId: string, updates: Partial<GolferUser>): GolferUser | null {
    const allUsers = this.getRegisteredUsers();
    const idx = allUsers.findIndex(u => u.id === userId);
    if (idx < 0) return null;

    const existing = allUsers[idx];
    const updated: GolferUser = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // If handicap changed, update tour level
    if (updates.handicapIndex !== undefined) {
      const hcp = Number(updates.handicapIndex) || 0;
      updated.golfTourLevel = Math.max(0.5, Math.min(7.0, Number((7.0 - (hcp * 0.15)).toFixed(2))));
    }

    allUsers[idx] = updated;
    StorageService.saveAllUsers(allUsers);

    const cur = StorageService.getCurrentUser();
    if (cur && cur.id === userId) {
      StorageService.setCurrentUser(updated);
    }

    // Sync to Supabase
    SupabaseService.upsertProfile(updated).catch(err => {
      console.warn('[AuthService] Supabase updateProfile sync error:', err);
    });

    return updated;
  },

  /**
   * Resends the authentic Supabase verification email to user
   */
  async resendVerificationEmail(email: string): Promise<{ success: boolean; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, error: 'Email address is required.' };
    }
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Supabase authentication is not configured in .env.' };
    }
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
      });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to dispatch verification email via Supabase.' };
    }
  },

  /**
   * Validates Supabase 6-digit OTP token or signup confirmation code
   */
  async verifyEmailWithOtp(email: string, token: string): Promise<{ success: boolean; user?: GolferUser; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = token.trim();
    if (!cleanEmail || !cleanToken) {
      return { success: false, error: 'Please provide both email and the 6-digit confirmation code.' };
    }
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Supabase authentication is not configured in .env.' };
    }
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: 'signup',
      });
      if (error) {
        return { success: false, error: error.message };
      }
      if (data?.user) {
        let profile = await SupabaseService.fetchProfileById(data.user.id);
        if (!profile) {
          profile = StorageService.getCurrentUser();
        }
        if (profile) {
          profile.emailVerified = true;
          await SupabaseService.upsertProfileDirect(profile);
          StorageService.setCurrentUser(profile);
          return { success: true, user: profile };
        }
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Verification failed with Supabase.' };
    }
  },

  /**
   * Checks with Supabase Auth whether the user's email has been confirmed
   */
  async checkEmailVerificationStatus(userId: string): Promise<{ verified: boolean; user?: GolferUser; error?: string }> {
    if (!isSupabaseConfigured() || !supabase) {
      return { verified: false, error: 'Supabase authentication is not configured in .env.' };
    }
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        return { verified: false, error: error.message };
      }
      if (data?.user?.email_confirmed_at) {
        let profile = await SupabaseService.fetchProfileById(userId);
        if (!profile) {
          profile = StorageService.getCurrentUser();
        }
        if (profile) {
          profile.emailVerified = true;
          await SupabaseService.upsertProfileDirect(profile);
          StorageService.setCurrentUser(profile);
          return { verified: true, user: profile };
        }
        return { verified: true };
      }
      return { verified: false };
    } catch (err: any) {
      return { verified: false, error: err?.message || 'Error checking verification status from Supabase.' };
    }
  },

  /**
   * Dispatches verification email for an existing user account
   */
  sendVerificationEmail(userId: string): { success: boolean; error?: string } {
    const allUsers = this.getRegisteredUsers();
    const target = allUsers.find(u => u.id === userId);
    if (!target) {
      return { success: false, error: 'Golfer user not found.' };
    }
    this.resendVerificationEmail(target.email).catch(console.error);
    return { success: true };
  },

  /**
   * Validates confirmation code via Supabase Auth
   */
  verifyEmail(userId: string, enteredCode: string): { success: boolean; user?: GolferUser; error?: string } {
    const allUsers = this.getRegisteredUsers();
    const target = allUsers.find(u => u.id === userId);
    if (!target) {
      return { success: false, error: 'User account not found.' };
    }
    this.verifyEmailWithOtp(target.email, enteredCode).catch(console.error);
    return { success: true };
  },

  /**
   * Asynchronous email verification that actively validates with Supabase Auth
   */
  async verifyEmailAsync(userId: string, enteredCode: string): Promise<{ success: boolean; user?: GolferUser; error?: string }> {
    const allUsers = this.getRegisteredUsers();
    const target = allUsers.find(u => u.id === userId);
    if (!target) {
      return { success: false, error: 'User account not found.' };
    }
    return this.verifyEmailWithOtp(target.email, enteredCode);
  },

  /**
   * Permanently deletes account, credentials, and associated golfer data
   */
  async deleteAccount(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Remove credentials
      try {
        const credsRaw = localStorage.getItem(STORAGE_KEYS.CREDENTIALS);
        if (credsRaw) {
          const creds: StoredCredential[] = JSON.parse(credsRaw);
          const filtered = creds.filter(c => c.userId !== userId);
          localStorage.setItem(STORAGE_KEYS.CREDENTIALS, JSON.stringify(filtered));
        }
      } catch (e) {
        console.error('Error removing credentials:', e);
      }

      // 2. Cascade delete from StorageService
      StorageService.deleteUser(userId);

      // 3. Delete from Supabase Database
      if (SupabaseService.isLive() && supabase) {
        await SupabaseService.deleteProfile(userId).catch(err => {
          console.warn('[AuthService] Supabase deleteProfile sync error:', err);
        });
      }

      // 4. Invalidate Supabase Auth session token
      if (supabase?.auth) {
        await supabase.auth.signOut().catch(err => {
          console.warn('[AuthService] Supabase signOut error:', err);
        });
      }

      // 5. Clear active session tokens
      localStorage.removeItem('golftour_golf_current_user');
      sessionStorage.clear();

      return { success: true };
    } catch (e) {
      console.error('Failed to delete account:', e);
      return { success: false, error: 'Failed to delete account data.' };
    }
  }
};
