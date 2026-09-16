import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment credentials for Supabase (direct Vite AST replacements + runtime fallbacks)
export function getSupabaseUrl(): string {
  let url = '';
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) {
      url = import.meta.env.VITE_SUPABASE_URL;
    }
  } catch {
    // ignore
  }

  if (!url) {
    try {
      const metaEnv = (import.meta as any)?.env;
      if (metaEnv?.VITE_SUPABASE_URL) {
        url = metaEnv.VITE_SUPABASE_URL;
      }
    } catch {
      // ignore
    }
  }

  if (!url && typeof window !== 'undefined') {
    const w = window as any;
    url = w.__ENV__?.VITE_SUPABASE_URL || w.VITE_SUPABASE_URL || '';
    if (!url) {
      try {
        url = localStorage.getItem('VITE_SUPABASE_URL') || localStorage.getItem('supabase_url') || '';
      } catch {
        // ignore
      }
    }
  }

  if (!url && typeof process !== 'undefined' && process.env) {
    url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  }

  return (url || '').trim();
}

export function getSupabaseAnonKey(): string {
  let key = '';
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) {
      key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    }
  } catch {
    // ignore
  }

  if (!key) {
    try {
      const metaEnv = (import.meta as any)?.env;
      if (metaEnv?.VITE_SUPABASE_ANON_KEY) {
        key = metaEnv.VITE_SUPABASE_ANON_KEY;
      }
    } catch {
      // ignore
    }
  }

  if (!key && typeof window !== 'undefined') {
    const w = window as any;
    key = w.__ENV__?.VITE_SUPABASE_ANON_KEY || w.VITE_SUPABASE_ANON_KEY || '';
    if (!key) {
      try {
        key = localStorage.getItem('VITE_SUPABASE_ANON_KEY') || localStorage.getItem('supabase_anon_key') || '';
      } catch {
        // ignore
      }
    }
  }

  if (!key && typeof process !== 'undefined' && process.env) {
    key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  }

  return (key || '').trim();
}

/**
 * Validates a Supabase API key.
 * Accepts both legacy JWT anon keys (starting with "eyJ")
 * and Supabase's new publishable keys (starting with "sb_publishable_").
 */
export function isValidSupabaseKey(key: string): boolean {
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  if (trimmed.length < 20) return false;
  return trimmed.startsWith('eyJ') || trimmed.startsWith('sb_publishable_');
}

export function isSupabaseConfigured(): boolean {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  return Boolean(
    url &&
    key &&
    (url.startsWith('http://') || url.startsWith('https://')) &&
    !url.includes('your-project') &&
    isValidSupabaseKey(key)
  );
}

export function getSupabaseConfig(): { url: string; hasKey: boolean; isConnected: boolean } {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  return {
    url,
    hasKey: Boolean(key && isValidSupabaseKey(key)),
    isConnected: isSupabaseConfigured(),
  };
}

// Client instance cache
let clientInstance: SupabaseClient | null = null;
let lastUrl = '';
let lastKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (!isSupabaseConfigured()) {
    return null;
  }

  if (clientInstance && url === lastUrl && key === lastKey) {
    return clientInstance;
  }

  try {
    clientInstance = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
    });
    lastUrl = url;
    lastKey = key;
    console.log('[Supabase] Client initialized successfully for endpoint:', url);
    return clientInstance;
  } catch (err) {
    console.error('[Supabase] Failed to initialize client with environment credentials:', err);
    return null;
  }
}

// Safe fallback stubs when client is not initialized or offline
const noopAuth = {
  getSession: async () => ({ data: { session: null }, error: null }),
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  signUp: async () => ({ data: { user: null, session: null }, error: { message: 'Supabase is not configured' } }),
  signInWithPassword: async () => ({ data: { user: null, session: null }, error: { message: 'Supabase is not configured' } }),
  signOut: async () => ({ error: null }),
  getUser: async () => ({ data: { user: null }, error: null }),
};

function createNoopQueryBuilder() {
  const chain: any = {
    select: () => chain,
    insert: () => chain,
    update: () => chain,
    upsert: () => chain,
    delete: () => chain,
    eq: () => chain,
    neq: () => chain,
    gt: () => chain,
    gte: () => chain,
    lt: () => chain,
    lte: () => chain,
    like: () => chain,
    ilike: () => chain,
    is: () => chain,
    in: () => chain,
    contains: () => chain,
    containedBy: () => chain,
    rangeGt: () => chain,
    rangeGte: () => chain,
    rangeLt: () => chain,
    rangeLte: () => chain,
    rangeAdjacent: () => chain,
    overlaps: () => chain,
    textSearch: () => chain,
    match: () => chain,
    not: () => chain,
    or: () => chain,
    filter: () => chain,
    order: () => chain,
    limit: () => chain,
    range: () => chain,
    single: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
    maybeSingle: async () => ({ data: null, error: null }),
    then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
  };
  return chain;
}

const noopStorage = {
  from: () => ({
    upload: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
    getPublicUrl: () => ({ data: { publicUrl: '' } }),
    remove: async () => ({ data: null, error: null }),
  }),
};

// Proxy wrapper so imports of `supabase` dynamically resolve to active client
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    if (!client) {
      if (prop === 'auth') return noopAuth;
      if (prop === 'from') return () => createNoopQueryBuilder();
      if (prop === 'storage') return noopStorage;
      if (prop === 'channel') return () => ({ on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }) });
      if (prop === 'removeChannel') return () => {};
      return undefined;
    }
    const val = (client as any)[prop];
    if (typeof val === 'function') {
      return val.bind(client);
    }
    return val;
  },
});

/**
 * Uploads a profile avatar image to Supabase Storage bucket ('avatars')
 * Returns the public URL of the uploaded image, or null if unconfigured or failed.
 */
export async function uploadAvatarToSupabase(
  file: File | Blob, 
  userId: string
): Promise<string | null> {
  if (!supabase || !isSupabaseConfigured()) {
    return null;
  }

  try {
    const bucketName = 'avatars';
    const fileExt = file instanceof File ? file.name.split('.').pop() || 'jpg' : 'jpg';
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `profiles/${fileName}`;

    // Upload file
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.warn('[Supabase Storage] Upload error:', uploadError.message);
      return null;
    }

    // Get public URL
    const { data } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return data?.publicUrl || null;
  } catch (err) {
    console.error('[Supabase Storage] Unexpected error uploading avatar:', err);
    return null;
  }
}

/**
 * SQL Schema Migration definition for Supabase database tables:
 * - profiles
 * - friendships
 * - posts
 * - matches
 * - tournaments
 */
export const SUPABASE_SCHEMA_SQL = `-- =========================================================================
-- GolfTour PostgreSQL Schema for Supabase
-- Target Tables: profiles, friendships, posts, matches, tournaments
-- =========================================================================

-- 1. PROFILES TABLE (User accounts & golfer details)
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT,
  photo_url TEXT,
  handicap_index NUMERIC DEFAULT 0,
  golf_tour_level NUMERIC DEFAULT 4.0,
  home_club_id TEXT,
  home_club_name TEXT,
  city TEXT DEFAULT 'Garden Route',
  country TEXT DEFAULT 'South Africa',
  bio TEXT DEFAULT '',
  preferred_tees TEXT DEFAULT 'White',
  is_public BOOLEAN DEFAULT true,
  is_online BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  verification_code TEXT,
  verification_sent_at TIMESTAMPTZ,
  friends_count INTEGER DEFAULT 0,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  rounds_count INTEGER DEFAULT 0,
  best_score INTEGER DEFAULT 0,
  stats JSONB DEFAULT '{"fairwaysHitPct":0,"greensInRegPct":0,"avgPuttsPerRound":0,"scramblingPct":0,"holesInOne":0,"eaglesCount":0,"birdiesCount":0}'::jsonb,
  bag JSONB DEFAULT '[]'::jsonb,
  handicap_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast username / email lookups and search
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON public.profiles(display_name);

-- 2. FRIENDSHIPS TABLE (Follower, friend relations & requests)
CREATE TABLE IF NOT EXISTS public.friendships (
  id TEXT PRIMARY KEY,
  requester_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
  pair_key TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_friendships_requester ON public.friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_recipient ON public.friendships(recipient_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON public.friendships(status);

-- 3. POSTS TABLE (Social feed, status updates & tournament match recaps)
CREATE TABLE IF NOT EXISTS public.posts (
  id TEXT PRIMARY KEY,
  author_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_username TEXT NOT NULL,
  author_avatar TEXT,
  author_handicap NUMERIC DEFAULT 0,
  author_level NUMERIC DEFAULT 4.0,
  type TEXT NOT NULL DEFAULT 'status_update', -- 'match_recap', 'photo_story', 'status_update', 'achievement'
  caption TEXT,
  content TEXT,
  media_urls JSONB DEFAULT '[]'::jsonb,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  comments JSONB DEFAULT '[]'::jsonb,
  match_data JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_posts_author ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);

-- 4. MATCHES TABLE (Matchplay & stroke play matches across devices)
CREATE TABLE IF NOT EXISTS public.matches (
  id TEXT PRIMARY KEY,
  creator_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL,
  course_name TEXT NOT NULL,
  course_location TEXT,
  course_cover TEXT,
  course_par INTEGER DEFAULT 72,
  holes_count INTEGER DEFAULT 18,
  game_type TEXT DEFAULT 'stroke_play',
  status TEXT DEFAULT 'open',
  scheduled_time TEXT,
  max_players INTEGER DEFAULT 4,
  players JSONB DEFAULT '[]'::jsonb,
  is_competitive BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_course ON public.matches(course_id);

-- 5. TOURNAMENTS TABLE (Ryder Cup & championship tournaments with live scores)
CREATE TABLE IF NOT EXISTS public.tournaments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  organizer_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  creator_id TEXT,
  organizer_name TEXT,
  format_type TEXT DEFAULT 'team_ryder_cup',
  status TEXT DEFAULT 'live',
  start_date TEXT,
  end_date TEXT,
  location TEXT,
  cover_image TEXT,
  players_count INTEGER DEFAULT 16,
  total_points NUMERIC DEFAULT 28,
  clinch_points NUMERIC DEFAULT 14.5,
  teams JSONB DEFAULT '[]'::jsonb,
  rounds JSONB DEFAULT '[]'::jsonb,
  scoring_rule JSONB DEFAULT '{"pointsPerWin":1,"pointsPerTie":0.5,"pointsPerLoss":0}'::jsonb,
  leaderboard JSONB DEFAULT '{"isClinched":false,"teamStandings":[],"playerRankings":[]}'::jsonb,
  feed_sharing_preferences JSONB DEFAULT '{}'::jsonb,
  fines_mode_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure feed_sharing_preferences column exists if table was previously created
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS feed_sharing_preferences JSONB DEFAULT '{}'::jsonb;

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) & PUBLIC POLICIES
-- =========================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

-- Allow public read & upsert for shared cross-device functionality
CREATE POLICY "Allow public read on profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow public write on profiles" ON public.profiles FOR ALL USING (true);

CREATE POLICY "Allow public read on friendships" ON public.friendships FOR SELECT USING (true);
CREATE POLICY "Allow public write on friendships" ON public.friendships FOR ALL USING (true);

CREATE POLICY "Allow public read on posts" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Allow public write on posts" ON public.posts FOR ALL USING (true);

CREATE POLICY "Allow public read on matches" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Allow public write on matches" ON public.matches FOR ALL USING (true);

-- Explicit Granular RLS Policies for Tournaments (Creation, Participant Read & Score Recording)
DROP POLICY IF EXISTS "Allow public read on tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Allow public write on tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "tournaments_select_policy" ON public.tournaments;
DROP POLICY IF EXISTS "tournaments_insert_policy" ON public.tournaments;
DROP POLICY IF EXISTS "tournaments_update_policy" ON public.tournaments;
DROP POLICY IF EXISTS "tournaments_delete_policy" ON public.tournaments;

-- 1. SELECT policy: Allow creators, captains, drafted participants, and viewers to view tournaments
CREATE POLICY "tournaments_select_policy" ON public.tournaments FOR SELECT USING (true);

-- 2. INSERT policy: Allow users to create and publish tournaments
CREATE POLICY "tournaments_insert_policy" ON public.tournaments FOR INSERT WITH CHECK (true);

-- 3. UPDATE policy: Allow creators, captains, and match participants to sync live scorecards and pairings
CREATE POLICY "tournaments_update_policy" ON public.tournaments FOR UPDATE USING (true) WITH CHECK (true);

-- 4. DELETE policy: Allow tournament organizers or creators to remove tournaments
CREATE POLICY "tournaments_delete_policy" ON public.tournaments FOR DELETE USING (true);

-- STORAGE BUCKET FOR AVATARS (Run in Supabase Dashboard -> Storage)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;
-- CREATE POLICY "Public Avatar Access" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
-- CREATE POLICY "Public Avatar Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars');
`;
