export type GameType = 'stroke_play' | 'stableford' | 'match_play' | 'better_ball' | 'scramble' | 'skins';
export type MatchStatus = 'open' | 'full' | 'in_progress' | 'completed' | 'cancelled';
export type FriendshipStatus = 'pending' | 'accepted' | 'declined' | 'blocked';
export type PostType = 'match_recap' | 'photo_story' | 'status_update' | 'achievement';
export type TeeColor = 'Championship' | 'Back' | 'Middle' | 'Forward' | 'Yellow' | 'White' | 'Blue' | 'Red';

// ==========================================
// TOURNAMENT ARCHITECTURE & SCORING TYPES
// ==========================================
export type TournamentFormat = 'team_ryder_cup' | 'individual_championship' | 'multi_team_league';

export type TournamentRoundFormat = 
  | 'better_ball_matchplay' 
  | 'two_man_scramble' 
  | 'individual_matchplay' 
  | 'alternate_shot' 
  | 'stableford_points' 
  | 'stroke_play_aggregate';

export interface TournamentTeam {
  id: string;
  name: string;
  shortCode: string; // e.g. "EGL", "ALB"
  color: string; // hex color for badges, cards, charts
  accentColor?: string;
  badgeIcon: string;
  captainId: string;
  captainName?: string;
  playerIds: string[];
  totalPoints: number;
  projectedPoints?: number;
}

export interface TournamentMatchSide {
  teamId?: string;
  teamName?: string;
  teamColor?: string;
  playerIds: string[];
  players: PlayerInMatch[];
  label: string; // e.g. "Marcus Vance & Elena Rostova"
  combinedHandicap?: number;
  playingHandicap?: number;
  grossTotal?: number;
  netTotal?: number;
  stablefordTotal?: number;
}

export interface TournamentHoleResult {
  holeNumber: number;
  par: number;
  strokeIndex: number;
  sideAScore: number; // Gross score (team score or best ball gross)
  sideBScore: number;
  sideANetScore?: number; // Lowest net score for side A
  sideBNetScore?: number; // Lowest net score for side B
  sideAStrokes: number; // Handicap strokes given
  sideBStrokes: number;
  winnerSide: 'sideA' | 'sideB' | 'halved';
  matchStatusAfterHole: string; // e.g. "Team A 1 UP", "AS", "Team A 3&2"
  sideABestPlayerId?: string;
  sideBBestPlayerId?: string;
  playerScores?: Record<string, {
    grossScore: number;
    netScore: number;
    strokes: number;
    isBestBall?: boolean;
  }>;
}

export interface TournamentMatch {
  id: string;
  tournamentId: string;
  roundId: string;
  matchNumber: number; // Flight 1, Flight 2, Flight 3...
  format: TournamentRoundFormat;
  holesTotal: number; // 18
  holesCompleted: number;
  status: 'scheduled' | 'live' | 'completed';
  sideA: TournamentMatchSide;
  sideB: TournamentMatchSide;
  holeResults: Record<number, TournamentHoleResult>;
  currentStatusText: string; // e.g. "Team A 2 UP thru 14", "DORMIE 3", "FINAL: Team A 3&2", "FINAL: Halved (0.5 - 0.5)"
  leadSide: 'sideA' | 'sideB' | 'tied' | null;
  leadMargin: number; // 0 for AS, 1, 2, 3...
  pointsAwarded: {
    sideA: number; // 1.0 for Win, 0.5 for Tie, 0.0 for Loss
    sideB: number;
  };
  winnerSide: 'sideA' | 'sideB' | 'halved' | null;
  winnerTeamId?: string;
  startTime?: string;
  notes?: string;
  fines?: PlayerFineRecord[];
  isDecided?: boolean;
  decidedAtHole?: number;
  finalOutcomeStatement?: string;
  officialResult?: string;
}

export interface TournamentRound {
  id: string;
  tournamentId: string;
  roundNumber: number; // 1, 2, 3
  dayNumber: number; // 1, 2, 3
  title: string; // e.g. "Day 1: Better Ball Matchplay"
  date: string; // e.g. "2026-09-18"
  courseId: string;
  courseName: string;
  courseLocation: string;
  courseCover: string;
  coursePar: number;
  format: TournamentRoundFormat;
  formatDescription: string;
  status: 'upcoming' | 'live' | 'completed';
  matches: TournamentMatch[];
  pointsAvailable: number; // e.g. 4.0 pts
  pointsTallied: Record<string, number>; // teamId -> points won in this round
}

export interface TournamentScoringRule {
  pointsPerWin: number; // 1.0
  pointsPerTie: number; // 0.5
  pointsPerLoss: number; // 0.0
  clinchThresholdRule: 'majority_plus_half'; // (Total Points / 2) + 0.5
}

export interface TeamLeaderboardEntry {
  teamId: string;
  teamName: string;
  teamColor: string;
  badgeIcon: string;
  points: number;
  projectedPoints: number;
  matchesWon: number;
  matchesTied: number;
  matchesLost: number;
  matchesLive: number;
  status: 'leading' | 'trailing' | 'tied' | 'clinched';
  roundPoints: Record<number, number>; // Round 1: 3.0, Round 2: 2.5, Round 3: 4.0
}

export interface PlayerMvpRankingEntry {
  userId: string;
  displayName: string;
  username: string;
  photoURL: string;
  teamId?: string;
  teamName?: string;
  teamColor?: string;
  handicapIndex: number;
  golfTourLevel?: number;
  playtomicLevel?: number;
  matchesPlayed: number;
  matchesWon: number;
  matchesTied: number;
  matchesLost: number;
  pointsEarned: number;
  pointsPossible: number;
  winPercentage: number;
  holesWonCount: number;
  betterBallContributions?: number;
  birdiesCount: number;
  parsCount: number;
  eaglesCount?: number;
  mvpRank: number;
}

// ==========================================
// FINES & BAR-TAB PENALTIES SYSTEM
// ==========================================
export type FineUnit = '$' | 'Fingers';

export interface FineCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  amount: number; // e.g. 1, 2, 5, 10
  currencySymbol: string; // e.g. "$" or "Fingers"
  unit?: FineUnit | string;
  severity?: 'mild' | 'standard' | 'severe';
}

export interface PlayerFineRecord {
  id: string;
  tournamentId?: string;
  matchId?: string;
  roundNumber?: number;
  dayNumber?: number;
  holeNumber: number;
  userId: string;
  userName: string;
  userAvatar?: string;
  teamId?: string;
  teamName?: string;
  fineId: string;
  fineName: string;
  fineIcon: string;
  amount: number;
  currencySymbol: string;
  unit?: FineUnit | string;
  timestamp: string;
  note?: string;
}

export interface TournamentLeaderboard {
  totalPointsAvailable: number;
  clinchPointsThreshold: number; // e.g. 14.5 / 28 or 6.5 / 12
  isClinched: boolean;
  clinchedTeamId?: string;
  teamStandings: TeamLeaderboardEntry[];
  playerRankings: PlayerMvpRankingEntry[];
}

export interface Tournament {
  id: string;
  name: string;
  tagline: string;
  description: string;
  organizerId: string;
  creatorId?: string;
  organizerName: string;
  organizerPhoto?: string;
  formatType: TournamentFormat;
  status: 'draft' | 'registration' | 'live' | 'completed';
  startDate: string;
  endDate: string;
  location: string;
  coverImage: string;
  playersCount: number;
  totalPoints: number;
  clinchPoints: number;
  teams: TournamentTeam[];
  rounds: TournamentRound[];
  scoringRule: TournamentScoringRule;
  leaderboard: TournamentLeaderboard;
  finesModeEnabled?: boolean;
  fines?: PlayerFineRecord[];
  feedSharingPreferences?: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
}

export interface HoleDefinition {
  holeNumber: number;
  par: number;
  strokeIndex: number; // WHS Stroke Index (Handicap rating 1-18)
  strokeIndexLadies?: number;
  distances: {
    yellowMeters?: number;
    whiteMeters: number;
    blueMeters?: number;
    redMeters?: number;
    [teeKey: string]: number | undefined;
  };
  description?: string;
  feature?: string;
}

export interface TeeBoxOption {
  name: string;
  color: TeeColor;
  courseRating: number;
  slopeRating: number;
  totalMeters: number;
  totalYards?: number;
  gender?: 'Men' | 'Women' | 'Universal';
}

export interface GolfBagItem {
  category: 'Driver' | 'Wood' | 'Hybrid' | 'Iron' | 'Wedge' | 'Putter' | 'Ball';
  brand: string;
  model: string;
}

export interface HandicapHistoryPoint {
  date: string;
  score: number;
  differential: number;
  courseName: string;
  handicapAfter: number;
}

export interface GolferUser {
  id: string;
  displayName: string;
  username: string;
  email: string;
  photoURL: string;
  handicapIndex: number; // e.g. 14.2 (WHS standard)
  golfTourLevel?: number; // e.g. 3.7 (GolfTour 0.5 - 7.0 scale)
  playtomicLevel?: number;
  homeClubId: string;
  homeClubName: string;
  city: string;
  country: string;
  bio: string;
  preferredTees: TeeColor;
  isPublic: boolean;
  isOnline?: boolean;
  emailVerified?: boolean;
  friendsCount: number;
  followersCount: number;
  followingCount: number;
  roundsCount: number;
  bestScore: number;
  stats: {
    fairwaysHitPct: number;
    greensInRegPct: number;
    avgPuttsPerRound: number;
    scramblingPct: number;
    holesInOne: number;
    eaglesCount: number;
    birdiesCount: number;
  };
  bag: GolfBagItem[];
  handicapHistory: HandicapHistoryPoint[];
  createdAt: string;
  updatedAt: string;
}

export interface FriendRequest {
  id: string;
  requesterId: string;
  recipientId: string;
  status: FriendshipStatus;
  pairKey: string;
  requester?: GolferUser;
  recipient?: GolferUser;
  createdAt: string;
  updatedAt: string;
}

export interface FollowRelationship {
  id: string;
  followerId: string;
  targetUserId: string;
  createdAt: string;
}

export interface HoleScore {
  holeNumber: number;
  par: number;
  strokeIndex: number; // Handicap hole stroke index (1-18)
  grossScore: number;
  netScore: number;
  stablefordPoints: number;
  putts?: number;
  fairwayHit?: boolean;
  greenInRegulation?: boolean;
}

export interface PlayerInMatch {
  userId: string;
  displayName: string;
  username: string;
  photoURL: string;
  handicapIndex: number;
  golfTourLevel?: number;
  playtomicLevel?: number;
  teeColor: TeeColor;
  playingHandicap: number; // Adjusted for course & slope rating
  grossScore: number;
  netScore: number;
  stablefordPoints?: number;
  matchScoreDiff?: number; // e.g. -2, +4
  confirmed: boolean;
  holeScores?: HoleScore[];
}

export interface GolfCourse {
  id: string;
  name: string;
  clubName: string;
  location: string;
  city: string;
  province?: string;
  country?: string;
  region?: string;
  architect?: string;
  coverImage: string;
  par: number;
  holesCount: 9 | 18;
  tees: {
    color: TeeColor;
    rating: number; // Course rating e.g. 72.4
    slope: number; // Slope rating e.g. 132
    yards?: number;
    meters?: number;
    name?: string;
  }[];
  teeBoxes?: TeeBoxOption[];
  holes?: HoleDefinition[];
  facilities: string[];
}

export interface GolfMatch {
  id: string;
  creatorId: string;
  courseId: string;
  courseName: string;
  courseLocation: string;
  courseCover: string;
  coursePar: number;
  holesCount: 9 | 18;
  gameType: GameType;
  status: MatchStatus;
  scheduledTime: string;
  maxPlayers: number;
  levelMin: number;
  levelMax: number;
  pricePerPlayer?: number;
  isCompetitive: boolean;
  players: PlayerInMatch[];
  isPublic: boolean;
  notes?: string;
  weather?: {
    temp: number;
    condition: 'Sunny' | 'Windy' | 'Cloudy' | 'Clear';
    windMph: number;
  };
  winnerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GolfComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string;
  authorHandicap: number;
  authorLevel: number;
  content: string;
  createdAt: string;
}

export interface GolfPost {
  id: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string;
  authorHandicap: number;
  authorLevel: number;
  type: PostType;
  matchId?: string;
  matchData?: {
    matchId?: string;
    courseName: string;
    courseLocation: string;
    courseCover?: string;
    par?: number;
    gameType: GameType;
    grossScore: number;
    netScore: number;
    parDiff: number; // e.g. -1 (71 on Par 72)
    stablefordPoints?: number;
    bestMoment?: string; // e.g. "Eagle on Hole 14!"
    handicapChange?: number; // e.g. -0.4
    levelChange?: number; // e.g. +0.05
    playersCount?: number;
    players?: PlayerInMatch[];
    holeScores?: HoleScore[];
    partners?: {
      userId: string;
      displayName: string;
      photoURL: string;
      grossScore: number;
    }[];
  };
  tournamentData?: TournamentPostData;
  caption?: string;
  content?: string;
  mediaUrls: string[];
  location?: string;
  likesCount: number;
  commentsCount: number;
  hasLiked?: boolean;
  taggedUsers?: {
    id: string;
    displayName: string;
  }[];
  comments?: GolfComment[];
  createdAt: string;
  updatedAt: string;
}

export interface TournamentPostData {
  tournamentId: string;
  tournamentName: string;
  tournamentCover?: string;
  location?: string;
  roundNumber?: number;
  roundTitle?: string;
  roundFormat?: string;
  matchId?: string;
  teamAShortName: string;
  teamAName: string;
  teamAColor: string;
  teamAScore: number;
  teamBShortName: string;
  teamBName: string;
  teamBColor: string;
  teamBScore: number;
  clinchPoints?: number;
  isClinched?: boolean;
  clinchedTeamName?: string;
  playerTeamName?: string;
  playerTeamColor?: string;
  playerRole?: 'player' | 'captain' | 'organizer';
  matchStatusText: string;
  matchSideA: string;
  matchSideB: string;
  isMatchFinal?: boolean;
  holesPlayed?: number;
  currentHole?: number;
}

export interface TournamentFeedTaggedPlayer {
  id: string;
  displayName: string;
  username?: string;
  avatar?: string;
  teamId?: string;
  teamName?: string;
  teamColor?: string;
}

export interface TournamentFeedComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorUsername?: string;
  authorAvatar: string;
  authorTeamColor?: string;
  content: string;
  createdAt: string;
}

export interface TournamentFeedPost {
  id: string;
  tournamentId: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string;
  authorHandicap?: number;
  authorTeamId?: string;
  authorTeamName?: string;
  authorTeamColor?: string;
  authorTeamBadgeIcon?: string;
  mediaType: 'photo' | 'video';
  mediaUrl: string;
  mediaUrls?: string[];
  thumbnailUrl?: string;
  caption: string;
  courseName?: string;
  holeNumber?: number;
  location?: string;
  taggedPlayers?: TournamentFeedTaggedPlayer[];
  likesCount: number;
  likedUserIds?: string[];
  hasLiked?: boolean;
  commentsCount: number;
  comments?: TournamentFeedComment[];
  createdAt: string;
  updatedAt?: string;
  type?: string;
  content?: string;
  photoURL?: string;
  matchId?: string;
  roundNumber?: number;
  isOfficial?: boolean;
}
