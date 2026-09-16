-- =========================================================================
-- GolfTour PostgreSQL Schema for Supabase
-- Target Tables: profiles, friendships, posts, matches, tournaments
-- Storage Bucket: avatars
-- =========================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
  fines_mode_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

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

CREATE POLICY "Allow public read on tournaments" ON public.tournaments FOR SELECT USING (true);
CREATE POLICY "Allow public write on tournaments" ON public.tournaments FOR ALL USING (true);
