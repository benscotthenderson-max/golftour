export interface CodeFileBlueprint {
  fileName: string;
  category: 'schema' | 'security' | 'service' | 'screen' | 'component' | 'architecture';
  description: string;
  language: string;
  code: string;
}

export const BLUEPRINT_FILES: CodeFileBlueprint[] = [
  {
    fileName: 'firebase-blueprint.json',
    category: 'schema',
    description: 'JSON Schema Intermediate Representation defining Users, Friendships, Matches, Posts, and Comments.',
    language: 'json',
    code: `{
  "entities": {
    "User": {
      "title": "User Profile",
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "displayName": { "type": "string", "minLength": 2, "maxLength": 50 },
        "username": { "type": "string", "pattern": "^[a-zA-Z0-9_]+$" },
        "email": { "type": "string", "format": "email" },
        "handicapIndex": { "type": "number", "description": "WHS Handicap Index (-10.0 to 54.0)" },
        "playtomicLevel": { "type": "number", "description": "Skill rating 0.5 to 7.0" },
        "homeClubName": { "type": "string" },
        "friendsCount": { "type": "integer" },
        "roundsCount": { "type": "integer" }
      },
      "required": ["id", "displayName", "username", "email", "handicapIndex", "playtomicLevel"]
    },
    "Friendship": {
      "title": "Friendship",
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "requesterId": { "type": "string" },
        "recipientId": { "type": "string" },
        "status": { "type": "string", "enum": ["pending", "accepted", "declined", "blocked"] },
        "pairKey": { "type": "string" }
      },
      "required": ["id", "requesterId", "recipientId", "status", "pairKey"]
    },
    "Match": {
      "title": "Golf Match",
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "creatorId": { "type": "string" },
        "courseName": { "type": "string" },
        "gameType": { "type": "string", "enum": ["stroke_play", "stableford", "match_play", "scramble"] },
        "holesCount": { "type": "integer", "enum": [9, 18] },
        "status": { "type": "string", "enum": ["open", "full", "in_progress", "completed"] },
        "players": { "type": "array" }
      },
      "required": ["id", "creatorId", "courseName", "gameType", "status"]
    },
    "Post": {
      "title": "Activity Post",
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "authorId": { "type": "string" },
        "type": { "type": "string", "enum": ["match_recap", "photo_story", "status_update"] },
        "caption": { "type": "string", "maxLength": 1000 },
        "likesCount": { "type": "integer" },
        "commentsCount": { "type": "integer" }
      },
      "required": ["id", "authorId", "type", "likesCount", "commentsCount"]
    }
  }
}`
  },
  {
    fileName: 'firestore.rules',
    category: 'security',
    description: 'Production ABAC Zero-Trust Firestore Security Rules enforcing schema constraints and identity integrity.',
    language: 'javascript',
    code: `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} { allow read, write: if false; }

    function isSignedIn() { return request.auth != null; }
    function isOwner(userId) { return isSignedIn() && request.auth.uid == userId; }
    function isValidId(id) { return id is string && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\\\-]+$'); }

    // Users Collection
    match /users/{userId} {
      allow get, list: if isSignedIn();
      allow create: if isOwner(userId) && isValidId(userId) &&
                       incoming().id == request.auth.uid &&
                       incoming().handicapIndex is number &&
                       incoming().createdAt == request.time;
      allow update: if isOwner(userId) &&
                       incoming().id == existing().id &&
                       incoming().createdAt == existing().createdAt &&
                       incoming().updatedAt == request.time;
    }

    // Friendships Collection
    match /friendships/{friendshipId} {
      allow get, list: if isSignedIn() && (
        resource.data.requesterId == request.auth.uid || 
        resource.data.recipientId == request.auth.uid
      );
      allow create: if isSignedIn() &&
                       incoming().requesterId == request.auth.uid &&
                       incoming().status == 'pending' &&
                       incoming().createdAt == request.time;
      allow update: if isSignedIn() && (
        existing().recipientId == request.auth.uid || 
        existing().requesterId == request.auth.uid
      ) && incoming().diff(existing()).affectedKeys().hasOnly(['status', 'updatedAt']);
    }

    // Posts & Comments
    match /posts/{postId} {
      allow get, list: if isSignedIn();
      allow create: if isSignedIn() && incoming().authorId == request.auth.uid && incoming().createdAt == request.time;
      allow update: if isSignedIn() && (
        (existing().authorId == request.auth.uid && incoming().diff(existing()).affectedKeys().hasOnly(['caption', 'mediaUrls', 'updatedAt'])) ||
        (incoming().diff(existing()).affectedKeys().hasOnly(['likesCount', 'commentsCount', 'updatedAt']))
      );
      allow delete: if isSignedIn() && resource.data.authorId == request.auth.uid;

      match /comments/{commentId} {
        allow read: if isSignedIn();
        allow create: if isSignedIn() && incoming().authorId == request.auth.uid && incoming().createdAt == request.time;
      }
      match /likes/{userId} {
        allow read, write: if isSignedIn() && request.auth.uid == userId;
      }
    }
  }
}`
  },
  {
    fileName: 'src/services/friendsService.ts',
    category: 'service',
    description: 'React Native service module for searching players, managing friendships, and following golfers.',
    language: 'typescript',
    code: `import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  getDocs, 
  serverTimestamp,
  writeBatch,
  increment 
} from 'firebase/firestore';
import { db } from './firebase';
import { GolferUser, FriendRequest } from '../types/golf';

/**
 * Generate unique sorted pair key to ensure single friendship doc per pair
 */
export const getPairKey = (uidA: string, uidB: string): string => {
  return [uidA, uidB].sort().join('_');
};

/**
 * Send a friend request
 */
export const sendFriendRequest = async (currentUserId: string, targetUserId: string) => {
  const pairKey = getPairKey(currentUserId, targetUserId);
  const friendshipDocRef = doc(db, 'friendships', pairKey);

  await setDoc(friendshipDocRef, {
    id: pairKey,
    requesterId: currentUserId,
    recipientId: targetUserId,
    status: 'pending',
    pairKey,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

/**
 * Accept a friend request & atomically increment friendsCount for both golfers
 */
export const acceptFriendRequest = async (friendshipId: string, currentUserId: string, requesterId: string) => {
  const batch = writeBatch(db);
  const friendshipRef = doc(db, 'friendships', friendshipId);
  const userARef = doc(db, 'users', currentUserId);
  const userBRef = doc(db, 'users', requesterId);

  batch.update(friendshipRef, {
    status: 'accepted',
    updatedAt: serverTimestamp(),
  });

  batch.update(userARef, { friendsCount: increment(1) });
  batch.update(userBRef, { friendsCount: increment(1) });

  await batch.commit();
};

/**
 * Search golfers with optional handicap range filtering
 */
export const searchGolfers = async (searchTerm: string, minHcp?: number, maxHcp?: number): Promise<GolferUser[]> => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('isPublic', '==', true));
  const snap = await getDocs(q);
  
  let results = snap.docs.map(d => d.data() as GolferUser);
  
  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    results = results.filter(u => 
      u.displayName.toLowerCase().includes(term) ||
      u.username.toLowerCase().includes(term) ||
      u.homeClubName.toLowerCase().includes(term)
    );
  }

  if (minHcp !== undefined) results = results.filter(u => u.handicapIndex >= minHcp);
  if (maxHcp !== undefined) results = results.filter(u => u.handicapIndex <= maxHcp);

  return results;
};`
  },
  {
    fileName: 'src/services/matchesService.ts',
    category: 'service',
    description: 'Calculates WHS Playing Handicaps, Course Differentials, and records match scores to Firestore.',
    language: 'typescript',
    code: `import { collection, addDoc, doc, updateDoc, serverTimestamp, writeBatch, increment } from 'firebase/firestore';
import { db } from './firebase';
import { GolfMatch, PlayerInMatch, GolfPost } from '../types/golf';

/**
 * Calculate WHS Course Playing Handicap:
 * Course Handicap = (Handicap Index * (Slope Rating / 113)) + (Course Rating - Par)
 */
export const calculatePlayingHandicap = (
  handicapIndex: number,
  slopeRating: number,
  courseRating: number,
  par: number
): number => {
  const rawHcp = (handicapIndex * (slopeRating / 113)) + (courseRating - par);
  return Math.max(0, Math.round(rawHcp));
};

/**
 * Submit Match & auto-publish recap to the Social Activity Feed
 */
export const completeMatchAndPostRecap = async (
  match: GolfMatch,
  author: PlayerInMatch,
  caption: string,
  mediaUrls: string[] = []
) => {
  const batch = writeBatch(db);

  // 1. Update Match status to completed
  const matchRef = doc(db, 'matches', match.id);
  batch.update(matchRef, {
    status: 'completed',
    updatedAt: serverTimestamp(),
  });

  // 2. Create Feed Post
  const postsRef = collection(db, 'posts');
  const newPostDoc = doc(postsRef);
  
  const postPayload: Partial<GolfPost> = {
    id: newPostDoc.id,
    authorId: author.userId,
    authorName: author.displayName,
    authorUsername: author.username,
    authorAvatar: author.photoURL,
    authorHandicap: author.handicapIndex,
    authorLevel: author.playtomicLevel,
    type: 'match_recap',
    matchId: match.id,
    matchData: {
      courseName: match.courseName,
      courseLocation: match.courseLocation,
      gameType: match.gameType,
      grossScore: author.grossScore,
      netScore: author.netScore,
      parDiff: author.grossScore - match.coursePar,
      stablefordPoints: author.stablefordPoints,
      playersCount: match.players.length,
      partners: match.players.map(p => ({
        userId: p.userId,
        displayName: p.displayName,
        photoURL: p.photoURL,
        grossScore: p.grossScore,
      }))
    },
    caption,
    mediaUrls,
    likesCount: 0,
    commentsCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  batch.set(newPostDoc, postPayload);

  // 3. Increment golfer roundsCount
  const userRef = doc(db, 'users', author.userId);
  batch.update(userRef, { roundsCount: increment(1) });

  await batch.commit();
};`
  },
  {
    fileName: 'src/screens/ProfileScreen.tsx',
    category: 'screen',
    description: 'React Native Profile Screen showing official WHS handicap badge, Playtomic level gauge, stats & bag.',
    language: 'typescript',
    code: `import React from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { GolferUser } from '../types/golf';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

interface Props {
  user: GolferUser;
  onEditProfile: () => void;
  onManageFriends: () => void;
}

export const ProfileScreen: React.FC<Props> = ({ user, onEditProfile, onManageFriends }) => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Profile Card */}
      <View style={styles.profileHeader}>
        <Image source={{ uri: user.photoURL }} style={styles.avatar} />
        <View style={styles.infoCol}>
          <Text style={styles.name}>{user.displayName}</Text>
          <Text style={styles.username}>@{user.username}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-sharp" size={14} color="#10B981" />
            <Text style={styles.locationText}>{user.homeClubName}</Text>
          </View>
        </View>
      </View>

      {/* Playtomic Level & Official Handicap Badges */}
      <View style={styles.badgeRow}>
        <View style={styles.levelCard}>
          <Text style={styles.badgeLabel}>PLAYTOMIC LEVEL</Text>
          <Text style={styles.levelValue}>{user.playtomicLevel.toFixed(2)}</Text>
          <View style={styles.levelBarBg}>
            <View style={[styles.levelBarFill, { width: \`\${(user.playtomicLevel / 7.0) * 100}%\` }]} />
          </View>
        </View>

        <View style={styles.hcpCard}>
          <Text style={styles.badgeLabel}>WHS HANDICAP</Text>
          <Text style={styles.hcpValue}>{user.handicapIndex > 0 ? \`+\${user.handicapIndex}\` : user.handicapIndex.toFixed(1)}</Text>
          <Text style={styles.hcpSub}>Official Index</Text>
        </View>
      </View>

      {/* Social Connection Counters */}
      <View style={styles.socialBar}>
        <TouchableOpacity style={styles.statItem} onPress={onManageFriends}>
          <Text style={styles.statNumber}>{user.friendsCount}</Text>
          <Text style={styles.statLabel}>Friends</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{user.roundsCount}</Text>
          <Text style={styles.statLabel}>Rounds</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{user.bestScore}</Text>
          <Text style={styles.statLabel}>Best Score</Text>
        </View>
      </View>

      {/* Golf Performance Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Game Performance</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statBoxVal}>{user.stats.fairwaysHitPct}%</Text>
            <Text style={styles.statBoxLbl}>Fairways Hit</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statBoxVal}>{user.stats.greensInRegPct}%</Text>
            <Text style={styles.statBoxLbl}>GIR %</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statBoxVal}>{user.stats.avgPuttsPerRound}</Text>
            <Text style={styles.statBoxLbl}>Avg Putts</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1320' },
  content: { padding: 16 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: '#10B981' },
  infoCol: { marginLeft: 16, flex: 1 },
  name: { fontSize: 22, fontWeight: '700', color: '#F8FAFC' },
  username: { fontSize: 14, color: '#94A3B8', marginTop: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  locationText: { fontSize: 13, color: '#CBD5E1', marginLeft: 4 },
  badgeRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  levelCard: { flex: 1.2, backgroundColor: '#1E293B', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#334155' },
  hcpCard: { flex: 0.8, backgroundColor: '#064E3B', borderRadius: 12, padding: 14, alignItems: 'center' },
  badgeLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5 },
  levelValue: { fontSize: 28, fontWeight: '800', color: '#10B981', marginVertical: 4 },
  levelBarBg: { height: 6, backgroundColor: '#334155', borderRadius: 3, overflow: 'hidden' },
  levelBarFill: { height: '100%', backgroundColor: '#10B981' },
  hcpValue: { fontSize: 28, fontWeight: '800', color: '#34D399', marginVertical: 4 },
  hcpSub: { fontSize: 11, color: '#A7F3D0' },
  socialBar: { flexDirection: 'row', backgroundColor: '#1E293B', borderRadius: 12, padding: 14, justifyContent: 'space-around', alignItems: 'center', marginBottom: 20 },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 18, fontWeight: '700', color: '#F8FAFC' },
  statLabel: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  divider: { width: 1, height: 24, backgroundColor: '#334155' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#F8FAFC', marginBottom: 12 },
  statsGrid: { flexDirection: 'row', gap: 10 },
  statBox: { flex: 1, backgroundColor: '#1E293B', padding: 14, borderRadius: 10, alignItems: 'center' },
  statBoxVal: { fontSize: 18, fontWeight: '700', color: '#38BDF8' },
  statBoxLbl: { fontSize: 11, color: '#94A3B8', marginTop: 4 },
});`
  },
  {
    fileName: 'src/components/MatchScorecardCard.tsx',
    category: 'component',
    description: 'Modular React Native Scorecard Card for the Social Feed with Gross/Net score badge and partners.',
    language: 'typescript',
    code: `import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { GolfPost } from '../types/golf';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';

interface Props {
  post: GolfPost;
  onPressScorecard: () => void;
  onPressLike: () => void;
  onPressComment: () => void;
}

export const MatchScorecardCard: React.FC<Props> = ({
  post,
  onPressScorecard,
  onPressLike,
  onPressComment
}) => {
  const match = post.matchData;
  const isUnderPar = match && match.parDiff < 0;

  return (
    <View style={styles.card}>
      {/* Author Header */}
      <View style={styles.header}>
        <Image source={{ uri: post.authorAvatar }} style={styles.avatar} />
        <View style={styles.headerText}>
          <Text style={styles.authorName}>{post.authorName}</Text>
          <Text style={styles.postMeta}>
            Level {post.authorLevel.toFixed(1)} • HCP {post.authorHandicap.toFixed(1)}
          </Text>
        </View>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>⛳️ MATCH RESULT</Text>
        </View>
      </View>

      {/* Match Result Banner */}
      {match && (
        <TouchableOpacity style={styles.matchBanner} activeOpacity={0.8} onPress={onPressScorecard}>
          <View style={styles.courseHeader}>
            <View>
              <Text style={styles.courseName}>{match.courseName}</Text>
              <Text style={styles.courseLocation}>{match.courseLocation}</Text>
            </View>
            <View style={[styles.scorePill, isUnderPar ? styles.scorePillGreen : styles.scorePillNeutral]}>
              <Text style={styles.grossScore}>{match.grossScore}</Text>
              <Text style={styles.parDiff}>
                {match.parDiff === 0 ? 'E' : match.parDiff > 0 ? \`+\${match.parDiff}\` : match.parDiff}
              </Text>
            </View>
          </View>

          {/* Quick Metrics */}
          <View style={styles.metricsRow}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>NET SCORE</Text>
              <Text style={styles.metricValue}>{match.netScore}</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>STABLEFORD</Text>
              <Text style={styles.metricValue}>{match.stablefordPoints || 36} pts</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>HCP DELTA</Text>
              <Text style={[styles.metricValue, { color: '#10B981' }]}>
                {match.handicapChange ? \`\${match.handicapChange} HCP\` : '-0.4'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      )}

      {/* Caption */}
      <Text style={styles.caption}>{post.caption}</Text>

      {/* Interaction Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.actionBtn} onPress={onPressLike}>
          <Ionicons name={post.hasLiked ? "heart" : "heart-outline"} size={20} color={post.hasLiked ? "#EF4444" : "#94A3B8"} />
          <Text style={[styles.actionText, post.hasLiked && { color: '#EF4444' }]}>{post.likesCount} Cheers</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionBtn} onPress={onPressComment}>
          <Ionicons name="chatbubble-outline" size={18} color="#94A3B8" />
          <Text style={styles.actionText}>{post.commentsCount} Comments</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#1E293B', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  headerText: { marginLeft: 12, flex: 1 },
  authorName: { fontSize: 16, fontWeight: '700', color: '#F8FAFC' },
  postMeta: { fontSize: 12, color: '#94A3B8', marginTop: 1 },
  typeBadge: { backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  typeBadgeText: { fontSize: 10, fontWeight: '700', color: '#10B981' },
  matchBanner: { backgroundColor: '#0F172A', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  courseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  courseName: { fontSize: 15, fontWeight: '700', color: '#F8FAFC' },
  courseLocation: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  scorePill: { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  scorePillGreen: { backgroundColor: '#064E3B' },
  scorePillNeutral: { backgroundColor: '#334155' },
  grossScore: { fontSize: 20, fontWeight: '800', color: '#F8FAFC' },
  parDiff: { fontSize: 11, fontWeight: '700', color: '#34D399' },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#1E293B' },
  metric: { alignItems: 'center' },
  metricLabel: { fontSize: 10, color: '#64748B', fontWeight: '600' },
  metricValue: { fontSize: 14, fontWeight: '700', color: '#E2E8F0', marginTop: 2 },
  caption: { fontSize: 14, color: '#CBD5E1', lineHeight: 20, marginBottom: 12 },
  actionBar: { flexDirection: 'row', gap: 20, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#334155' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { fontSize: 13, color: '#94A3B8', fontWeight: '600' },
});`
  },
  {
    fileName: 'TournamentHubScreen.tsx',
    category: 'screen',
    description: 'React Native Screen for Multi-Day Ryder Cup & Tournament Hub with Live Matchplay Standings.',
    language: 'typescript',
    code: `import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Tournament, TournamentRound } from '../types/golf';

interface TournamentHubScreenProps {
  tournament: Tournament;
  onSelectMatch: (matchId: string) => void;
  onOpenLeaderboard: () => void;
}

export const TournamentHubScreen: React.FC<TournamentHubScreenProps> = ({
  tournament,
  onSelectMatch,
  onOpenLeaderboard,
}) => {
  const [selectedDay, setSelectedDay] = useState(1);
  const activeRound = tournament.rounds.find(r => r.dayNumber === selectedDay) || tournament.rounds[0];

  const teamA = tournament.teams[0];
  const teamB = tournament.teams[1];

  const teamAPoints = tournament.leaderboard.teamStandings.find(t => t.teamId === teamA.id)?.points || 0;
  const teamBPoints = tournament.leaderboard.teamStandings.find(t => t.teamId === teamB.id)?.points || 0;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Scoreboard Banner */}
      <View style={styles.scoreboardHero}>
        <View style={styles.liveTagRow}>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE TOURNAMENT</Text>
          </View>
          <Text style={styles.locationText}>{tournament.location}</Text>
        </View>

        <Text style={styles.tourTitle}>{tournament.name}</Text>
        <Text style={styles.tourTagline}>{tournament.tagline}</Text>

        {/* Ryder Cup Team Points */}
        <View style={styles.scoreRow}>
          <View style={styles.teamScoreBox}>
            <Text style={styles.teamBadge}>{teamA.badgeIcon}</Text>
            <Text style={styles.teamName}>{teamA.name}</Text>
            <Text style={[styles.pointsBig, { color: '#34D399' }]}>{teamAPoints.toFixed(1)}</Text>
          </View>

          <View style={styles.clinchBox}>
            <Text style={styles.vsText}>VS</Text>
            <View style={styles.clinchPill}>
              <Text style={styles.clinchText}>{tournament.clinchPoints} to Clinch</Text>
            </View>
            <Text style={styles.totalPtsText}>{tournament.totalPoints} Total Pts</Text>
          </View>

          <View style={[styles.teamScoreBox, { alignItems: 'flex-end' }]}>
            <Text style={styles.teamBadge}>{teamB.badgeIcon}</Text>
            <Text style={styles.teamName}>{teamB.name}</Text>
            <Text style={[styles.pointsBig, { color: '#38BDF8' }]}>{teamBPoints.toFixed(1)}</Text>
          </View>
        </View>
      </View>

      {/* Day Selector */}
      <View style={styles.daySelectorRow}>
        {tournament.rounds.map(r => (
          <TouchableOpacity
            key={r.id}
            onPress={() => setSelectedDay(r.dayNumber)}
            style={[styles.dayTab, selectedDay === r.dayNumber && styles.dayTabActive]}
          >
            <Text style={[styles.dayTabDay, selectedDay === r.dayNumber && styles.dayTabDayActive]}>
              DAY {r.dayNumber}
            </Text>
            <Text style={[styles.dayTabTitle, selectedDay === r.dayNumber && styles.dayTabTitleActive]} numberOfLines={1}>
              {r.courseName.split(' ')[0]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Flight Matches List */}
      <View style={styles.matchesList}>
        <Text style={styles.sectionHeader}>{activeRound.title}</Text>
        <Text style={styles.subHeader}>Course: {activeRound.courseName} (Par {activeRound.coursePar})</Text>

        {activeRound.matches.map(match => (
          <TouchableOpacity
            key={match.id}
            style={styles.matchCard}
            onPress={() => onSelectMatch(match.id)}
          >
            <View style={styles.matchCardHeader}>
              <Text style={styles.flightTag}>Flight #{match.matchNumber} • {(match.format || 'matchplay').replace(/_/g, ' ')}</Text>
              <Text style={styles.statusText}>{match.currentStatusText}</Text>
            </View>

            <View style={styles.opponentsGrid}>
              <View style={styles.sideCol}>
                <Text style={styles.sideTeam}>{teamA.badgeIcon} {teamA.name}</Text>
                {match.sideA.players.map(p => (
                  <Text key={p.userId} style={styles.playerName}>{p.displayName} (HI {p.handicapIndex.toFixed(1)})</Text>
                ))}
              </View>

              <View style={[styles.sideCol, { alignItems: 'flex-end' }]}>
                <Text style={styles.sideTeam}>{teamB.badgeIcon} {teamB.name}</Text>
                {match.sideB.players.map(p => (
                  <Text key={p.userId} style={styles.playerName}>{p.displayName} (HI {p.handicapIndex.toFixed(1)})</Text>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  scoreboardHero: { backgroundColor: '#1E293B', padding: 20, borderRadius: 24, margin: 16, borderWidth: 1, borderColor: '#334155' },
  liveTagRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  livePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16,185,129,0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 6 },
  liveText: { fontSize: 10, fontWeight: '800', color: '#10B981' },
  locationText: { fontSize: 11, color: '#94A3B8' },
  tourTitle: { fontSize: 20, fontWeight: '900', color: '#F8FAFC' },
  tourTagline: { fontSize: 12, color: '#CBD5E1', marginTop: 2, marginBottom: 16 },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  teamScoreBox: { flex: 2 },
  teamBadge: { fontSize: 24 },
  teamName: { fontSize: 13, fontWeight: '700', color: '#F8FAFC', marginTop: 2 },
  pointsBig: { fontSize: 32, fontWeight: '900', marginTop: 2 },
  clinchBox: { flex: 1.5, alignItems: 'center' },
  vsText: { fontSize: 11, fontWeight: '800', color: '#64748B' },
  clinchPill: { backgroundColor: '#334155', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 4 },
  clinchText: { fontSize: 10, fontWeight: '700', color: '#E2E8F0' },
  totalPtsText: { fontSize: 10, color: '#64748B', marginTop: 4 },
  daySelectorRow: { flexDirection: 'row', marginHorizontal: 16, gap: 8, marginBottom: 16 },
  dayTab: { flex: 1, backgroundColor: '#1E293B', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#334155' },
  dayTabActive: { backgroundColor: '#065F46', borderColor: '#059669' },
  dayTabDay: { fontSize: 10, fontWeight: '800', color: '#64748B' },
  dayTabDayActive: { color: '#6EE7B7' },
  dayTabTitle: { fontSize: 13, fontWeight: '700', color: '#CBD5E1', marginTop: 2 },
  dayTabTitleActive: { color: '#FFFFFF' },
  matchesList: { marginHorizontal: 16, marginBottom: 40 },
  sectionHeader: { fontSize: 16, fontWeight: '800', color: '#F8FAFC' },
  subHeader: { fontSize: 12, color: '#94A3B8', marginTop: 2, marginBottom: 12 },
  matchCard: { backgroundColor: '#1E293B', padding: 14, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#334155' },
  matchCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  flightTag: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  statusText: { fontSize: 12, fontWeight: '800', color: '#34D399' },
  opponentsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  sideCol: { flex: 1 },
  sideTeam: { fontSize: 12, fontWeight: '800', color: '#F8FAFC', marginBottom: 4 },
  playerName: { fontSize: 12, color: '#94A3B8' },
});`
  }
];

