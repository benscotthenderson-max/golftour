import React, { useState, useEffect } from 'react';
import { GolferUser, GolfPost, GolfMatch, FriendRequest } from './types/golf';
import { MOCK_COURSES } from './data/mockData';
import { StorageService } from './utils/storage';
import { AuthService } from './services/authService';
import { SupabaseService } from './services/supabaseService';
import { supabase } from './lib/supabase';
import { HeaderNav, ViewMode } from './components/HeaderNav';
import { MobileSimulator, TabType } from './components/MobileSimulator';
import { GolfTourFeed } from './components/GolfTourFeed';
import { PlayerDiscovery } from './components/PlayerDiscovery';
import { MatchesHub } from './components/MatchesHub';
import { GolferProfile } from './components/GolferProfile';
import { MatchScorecardModal } from './components/MatchScorecardModal';
import { NewPostModal } from './components/NewPostModal';
import { ArchitectureExplorer } from './components/ArchitectureExplorer';
import { GolfMatchProvider, useGolfMatch } from './context/GolfMatchContext';
import { ActiveMatchScoring } from './components/ActiveMatchScoring';
import { TournamentHub } from './components/TournamentHub';
import { OnboardingAuthScreen } from './components/OnboardingAuthScreen';
import { AddGolferModal } from './components/AddGolferModal';
import { EmailVerificationBanner } from './components/EmailVerificationBanner';
import { EmailVerificationModal } from './components/EmailVerificationModal';
import { FriendProfileModal } from './components/FriendProfileModal';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import confetti from 'canvas-confetti';

interface AppContentProps {
  currentUser: GolferUser | null;
  onSetCurrentUser: (user: GolferUser | null) => void;
  onResetDatabase: () => void;
}

function AppContent({
  currentUser,
  onSetCurrentUser,
  onResetDatabase,
}: AppContentProps) {
  const { isDark } = useTheme();

  // Global State initialized from persistent StorageService
  const [allUsers, setAllUsers] = useState<GolferUser[]>(() => StorageService.getAllUsers());
  const [posts, setPosts] = useState<GolfPost[]>(() => StorageService.getPosts());
  const [matches, setMatches] = useState<GolfMatch[]>(() => StorageService.getMatches());
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>(() => StorageService.getFriendRequests());

  // Social Connections Sets (strictly scoped to authenticated user)
  const [friendUserIds, setFriendUserIds] = useState<Set<string>>(() => new Set(StorageService.getFriendUserIds(currentUser?.id)));
  const [followedUserIds, setFollowedUserIds] = useState<Set<string>>(() => new Set(StorageService.getFollowedUserIds(currentUser?.id)));
  const [pendingSentUserIds, setPendingSentUserIds] = useState<Set<string>>(new Set());

  // Re-synchronize user-scoped social state when authenticated user changes
  useEffect(() => {
    if (currentUser?.id) {
      setFriendUserIds(new Set(StorageService.getFriendUserIds(currentUser.id)));
      setFollowedUserIds(new Set(StorageService.getFollowedUserIds(currentUser.id)));
    }
  }, [currentUser?.id]);

  // Synchronize state with Supabase cloud database
  useEffect(() => {
    let isCancelled = false;

    const syncWithSupabase = async () => {
      try {
        // 1. Sync global profiles
        const remoteProfiles = await SupabaseService.fetchProfiles();
        if (!isCancelled && remoteProfiles.length > 0) {
          setAllUsers(prev => {
            const map = new Map<string, GolferUser>();
            prev.forEach(u => map.set(u.id, u));
            remoteProfiles.forEach(u => map.set(u.id, u));
            const merged = Array.from(map.values());
            StorageService.saveAllUsers(merged);
            return merged;
          });
        }

        // 2. Sync global posts
        const remotePosts = await SupabaseService.fetchPosts();
        if (!isCancelled && remotePosts.length > 0) {
          setPosts(prev => {
            const map = new Map<string, GolfPost>();
            remotePosts.forEach(p => map.set(p.id, p));
            prev.forEach(p => {
              if (!map.has(p.id)) map.set(p.id, p);
            });
            const merged = Array.from(map.values()).sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            StorageService.savePosts(merged);
            return merged;
          });
        }

        // 3. Sync matches
        const remoteMatches = await SupabaseService.fetchMatches();
        if (!isCancelled && remoteMatches.length > 0) {
          setMatches(prev => {
            const map = new Map<string, GolfMatch>();
            remoteMatches.forEach(m => map.set(m.id, m));
            prev.forEach(m => {
              if (!map.has(m.id)) map.set(m.id, m);
            });
            const merged = Array.from(map.values()).sort(
              (a, b) => new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime()
            );
            StorageService.saveMatches(merged);
            return merged;
          });
        }

        // 4. Sync friendships for logged-in user
        if (currentUser?.id) {
          const remoteData = await SupabaseService.fetchFriendships(currentUser.id);
          if (!isCancelled && remoteData.requests && remoteData.requests.length > 0) {
            setFriendRequests(prev => {
              const map = new Map<string, FriendRequest>();
              remoteData.requests.forEach(f => map.set(f.id, f));
              prev.forEach(f => {
                if (!map.has(f.id)) map.set(f.id, f);
              });
              const merged = Array.from(map.values());
              StorageService.saveFriendRequests(merged);
              return merged;
            });
          }

          if (!isCancelled && remoteData.friendUserIds && remoteData.friendUserIds.length > 0) {
            setFriendUserIds(prev => {
              const next = new Set([...prev, ...remoteData.friendUserIds]);
              StorageService.saveFriendUserIds(Array.from(next), currentUser.id);
              return next;
            });
          }
        }
      } catch (err) {
        console.warn('[App] Supabase background sync non-blocking error:', err);
      }
    };

    syncWithSupabase();

    return () => {
      isCancelled = true;
    };
  }, [currentUser?.id]);

  // UI View States
  const [viewMode, setViewMode] = useState<ViewMode>('app');
  const [mobileTab, setMobileTab] = useState<TabType>('feed');
  const [selectedScorecardPost, setSelectedScorecardPost] = useState<GolfPost | null>(null);
  const [isNewPostModalOpen, setIsNewPostModalOpen] = useState<boolean>(false);
  const [isAddGolferModalOpen, setIsAddGolferModalOpen] = useState<boolean>(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState<boolean>(false);
  const [verifyFeatureContext, setVerifyFeatureContext] = useState<string | undefined>(undefined);
  const [selectedGolferForProfile, setSelectedGolferForProfile] = useState<GolferUser | null>(null);

  // Golf Match Context Consumer
  const { activeMatch, startActiveMatch } = useGolfMatch();

  // Helper to open interactive profile modal for any player
  const handleOpenPlayerProfile = (userId: string) => {
    if (userId === currentUser?.id) {
      setMobileTab('profile');
      return;
    }
    const target = allUsers.find(u => u.id === userId);
    if (target) {
      setSelectedGolferForProfile(target);
    }
  };

  // If no user is logged in / set up, render the clean onboarding authentication screen
  if (!currentUser) {
    const handleAuthComplete = (createdUser: GolferUser) => {
      onSetCurrentUser(createdUser);
      setAllUsers(StorageService.getAllUsers());
    };

    return (
      <OnboardingAuthScreen
        onComplete={handleAuthComplete}
        existingUsers={allUsers}
        onSelectExistingUser={selectedUser => {
          onSetCurrentUser(selectedUser);
        }}
      />
    );
  }

  // Pending Friend Requests for Current User
  const pendingRequestsCount = friendRequests.filter(
    r => r.recipientId === currentUser.id && r.status === 'pending'
  ).length;

  // Handlers
  const handleToggleLike = (postId: string) => {
    setPosts(prev => {
      let updatedPost: GolfPost | null = null;
      const updated = prev.map(p => {
        if (p.id === postId) {
          const hasLiked = !p.hasLiked;
          updatedPost = {
            ...p,
            hasLiked,
            likesCount: hasLiked ? p.likesCount + 1 : Math.max(0, p.likesCount - 1),
          };
          return updatedPost;
        }
        return p;
      });
      StorageService.savePosts(updated);
      if (updatedPost) {
        SupabaseService.updatePost(updatedPost).catch(err => {
          console.warn('[App] Supabase updatePost like error:', err);
        });
      }
      return updated;
    });
  };

  const handleAddComment = (postId: string, commentText: string) => {
    const newComment = {
      id: `comm-${Date.now()}`,
      postId,
      authorId: currentUser.id,
      authorName: currentUser.displayName,
      authorUsername: currentUser.username,
      authorAvatar: currentUser.photoURL,
      authorHandicap: currentUser.handicapIndex,
      authorLevel: currentUser.golfTourLevel,
      content: commentText,
      createdAt: new Date().toISOString(),
    };

    setPosts(prev => {
      let updatedPost: GolfPost | null = null;
      const updated = prev.map(p => {
        if (p.id === postId) {
          const updatedComments = [...(p.comments || []), newComment];
          updatedPost = {
            ...p,
            comments: updatedComments,
            commentsCount: updatedComments.length,
          };
          return updatedPost;
        }
        return p;
      });
      StorageService.savePosts(updated);
      if (updatedPost) {
        SupabaseService.updatePost(updatedPost).catch(err => {
          console.warn('[App] Supabase updatePost comment error:', err);
        });
      }
      return updated;
    });
  };

  const handleCreatePost = (newPost: GolfPost) => {
    setPosts(prev => {
      const updated = [newPost, ...prev];
      StorageService.savePosts(updated);
      return updated;
    });

    // Asynchronously push post to Supabase
    SupabaseService.createPost(newPost).catch(err => {
      console.warn('[App] Supabase createPost error:', err);
    });

    // If it was a match recap, update user stats
    if (newPost.type === 'match_recap' && newPost.matchData) {
      const updatedUser: GolferUser = {
        ...currentUser,
        roundsCount: (currentUser.roundsCount || 0) + 1,
        bestScore: Math.min(currentUser.bestScore || 999, newPost.matchData?.grossScore || 999),
      };
      handleUpdateProfile(updatedUser);
    }
  };

  const handleSendFriendRequest = (targetUserId: string, targetUserParam?: GolferUser) => {
    let targetUser = targetUserParam || allUsers.find(u => u.id === targetUserId);
    if (!targetUser) {
      targetUser = StorageService.getUserById(targetUserId) || undefined;
    }
    if (targetUser && !allUsers.some(u => u.id === targetUser!.id)) {
      const updatedUsers = [...allUsers, targetUser];
      setAllUsers(updatedUsers);
      StorageService.saveAllUsers(updatedUsers);
    }

    const newReq: FriendRequest = {
      id: `freq-${Date.now()}`,
      requesterId: currentUser.id,
      recipientId: targetUserId,
      status: 'pending',
      pairKey: `${currentUser.id}_${targetUserId}`,
      requester: currentUser,
      recipient: targetUser,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setFriendRequests(prev => {
      const updated = [newReq, ...prev];
      StorageService.saveFriendRequests(updated);
      return updated;
    });
    setPendingSentUserIds(prev => new Set(prev).add(targetUserId));

    // Push friendship request to Supabase
    SupabaseService.sendFriendRequest(newReq).catch(err => {
      console.warn('[App] Supabase sendFriendRequest error:', err);
    });
  };

  const handleAcceptFriendRequest = (requestId: string, requesterId: string) => {
    setFriendRequests(prev => {
      const updated = prev.map(r => (r.id === requestId ? { ...r, status: 'accepted' as const, updatedAt: new Date().toISOString() } : r));
      StorageService.saveFriendRequests(updated);
      return updated;
    });

    setFriendUserIds(prev => {
      const next = new Set(prev).add(requesterId);
      StorageService.saveFriendUserIds(Array.from(next) as string[], currentUser.id);
      return next;
    });

    const updatedUser: GolferUser = {
      ...currentUser,
      friendsCount: (currentUser.friendsCount || 0) + 1,
    };
    handleUpdateProfile(updatedUser);

    // Update friendship in Supabase
    SupabaseService.acceptFriendRequest(requestId).catch(err => {
      console.warn('[App] Supabase acceptFriendRequest error:', err);
    });
  };

  const handleDeclineFriendRequest = (requestId: string) => {
    setFriendRequests(prev => {
      const updated = prev.map(r => (r.id === requestId ? { ...r, status: 'declined' as const, updatedAt: new Date().toISOString() } : r));
      StorageService.saveFriendRequests(updated);
      return updated;
    });

    // Update in Supabase
    SupabaseService.declineFriendRequest(requestId).catch(err => {
      console.warn('[App] Supabase declineFriendRequest error:', err);
    });
  };

  const handleToggleFollow = (targetUserId: string) => {
    const isCurrentlyFollowed = followedUserIds.has(targetUserId);
    const nextFollowed = new Set(followedUserIds);
    let updatedFollowingCount = currentUser.followingCount || 0;

    if (isCurrentlyFollowed) {
      nextFollowed.delete(targetUserId);
      updatedFollowingCount = Math.max(0, updatedFollowingCount - 1);
    } else {
      nextFollowed.add(targetUserId);
      updatedFollowingCount = updatedFollowingCount + 1;
    }

    setFollowedUserIds(nextFollowed);
    StorageService.saveFollowedUserIds(Array.from(nextFollowed) as string[], currentUser.id);

    const updatedUser: GolferUser = {
      ...currentUser,
      followingCount: updatedFollowingCount,
    };
    handleUpdateProfile(updatedUser);
  };

  const handleTriggerVerifyModal = (featureContext?: string) => {
    setVerifyFeatureContext(featureContext);
    setIsVerifyModalOpen(true);
  };

  const handleEmailVerified = (updatedUser: GolferUser) => {
    handleUpdateProfile(updatedUser);
    setIsVerifyModalOpen(false);
  };

  const handleJoinMatch = (matchId: string) => {
    if (!currentUser.emailVerified) {
      handleTriggerVerifyModal('participate in open matches');
      return;
    }

    setMatches(prev => {
      let updatedMatch: GolfMatch | null = null;
      const updated = prev.map(m => {
        if (m.id === matchId && !m.players.some(p => p.userId === currentUser.id)) {
          const updatedPlayers = [
            ...m.players,
            {
              userId: currentUser.id,
              displayName: currentUser.displayName,
              username: currentUser.username,
              photoURL: currentUser.photoURL,
              handicapIndex: currentUser.handicapIndex,
              golfTourLevel: currentUser.golfTourLevel,
              teeColor: currentUser.preferredTees,
              playingHandicap: Math.round(currentUser.handicapIndex),
              grossScore: 0,
              netScore: 0,
              confirmed: true,
              holeScores: [],
            },
          ];
          updatedMatch = {
            ...m,
            players: updatedPlayers,
            status: (updatedPlayers.length >= m.maxPlayers ? 'full' : 'open') as any,
          };
          return updatedMatch;
        }
        return m;
      });
      StorageService.saveMatches(updated);
      if (updatedMatch) {
        SupabaseService.updateMatch(updatedMatch).catch(err => {
          console.warn('[App] Supabase updateMatch error:', err);
        });
      }
      return updated;
    });
  };

  const handleCreateMatch = (newMatch: GolfMatch) => {
    if (!currentUser.emailVerified) {
      handleTriggerVerifyModal('create matches');
      return;
    }

    setMatches(prev => {
      const updated = [newMatch, ...prev];
      StorageService.saveMatches(updated);
      return updated;
    });

    // Save to Supabase matches table
    SupabaseService.createMatch(newMatch).catch(err => {
      console.warn('[App] Supabase createMatch error:', err);
    });
  };

  const handleStartScoringMatch = (match: GolfMatch) => {
    if (!currentUser.emailVerified) {
      handleTriggerVerifyModal('score official matches');
      return;
    }

    startActiveMatch(match);
    setMobileTab('scoring');
  };

  const handleRoundFinished = (summary: {
    match: GolfMatch;
    grossScore: number;
    netScore: number;
    parDiff: number;
    stablefordPoints: number;
  }) => {
    const postCourse = MOCK_COURSES.find(c => c.id === summary.match.courseId) || MOCK_COURSES[0];
    const newRecapPost: GolfPost = {
      id: `post-recap-${Date.now()}`,
      authorId: currentUser.id,
      authorName: currentUser.displayName,
      authorUsername: currentUser.username,
      authorAvatar: currentUser.photoURL,
      authorHandicap: currentUser.handicapIndex,
      authorLevel: currentUser.golfTourLevel,
      type: 'match_recap',
      caption: `18-Hole ${(summary.match.gameType || 'stroke_play').replace(/_/g, ' ')} round completed at ${summary.match.courseName || 'Golf Club'}!`,
      content: `Just wrapped up an 18-hole ${(summary.match.gameType || 'stroke_play').replace(/_/g, ' ')} round at ${summary.match.courseName || 'Golf Club'}! Shot a gross score of ${summary.grossScore} (Net ${summary.netScore}, ${summary.stablefordPoints} pts). Live Firestore sync logged all holes! 🏌️‍♂️⚡️`,
      mediaUrls: [summary.match.courseCover || postCourse.coverImage],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      likesCount: 1,
      commentsCount: 0,
      hasLiked: true,
      matchData: {
        matchId: summary.match.id,
        courseName: summary.match.courseName,
        courseLocation: summary.match.courseLocation,
        courseCover: summary.match.courseCover,
        par: summary.match.coursePar,
        grossScore: summary.grossScore,
        netScore: summary.netScore,
        parDiff: summary.parDiff,
        gameType: summary.match.gameType,
        players: summary.match.players,
        holeScores: summary.match.players.find(p => p.userId === currentUser.id)?.holeScores || [],
      },
    };

    setPosts(prev => {
      const updated = [newRecapPost, ...prev];
      StorageService.savePosts(updated);
      return updated;
    });

    // Save recap post to Supabase
    SupabaseService.createPost(newRecapPost).catch(err => {
      console.warn('[App] Supabase createPost for recap error:', err);
    });

    // Update match state in Supabase
    SupabaseService.updateMatch(summary.match).catch(err => {
      console.warn('[App] Supabase updateMatch for recap error:', err);
    });

    // Update user stats
    const updatedUser: GolferUser = {
      ...currentUser,
      roundsCount: (currentUser.roundsCount || 0) + 1,
      bestScore: Math.min(currentUser.bestScore || 999, summary.grossScore),
    };
    handleUpdateProfile(updatedUser);

    setMobileTab('feed');
    try {
      confetti({
        particleCount: 70,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch {
      // ignore
    }
  };

  const handleDeleteAccount = (userId: string) => {
    StorageService.deleteUser(userId);
    SupabaseService.deleteProfile(userId).catch(err => {
      console.warn('[App] Supabase deleteProfile error:', err);
    });
    setAllUsers(prev => prev.filter(u => u.id !== userId));
    onSetCurrentUser(null);
  };

  const handleUpdateProfile = (updatedUser: GolferUser) => {
    onSetCurrentUser(updatedUser);
    setAllUsers(prev => {
      const updated = prev.map(u => (u.id === updatedUser.id ? updatedUser : u));
      StorageService.saveAllUsers(updated);
      return updated;
    });

    // Persist profile update to Supabase
    SupabaseService.upsertProfile(updatedUser).catch(err => {
      console.warn('[App] Supabase upsertProfile error:', err);
    });

    setPosts(prev => {
      const updated = prev.map(p => {
        if (p.authorId === updatedUser.id) {
          return {
            ...p,
            authorName: updatedUser.displayName,
            authorUsername: updatedUser.username,
            authorAvatar: updatedUser.photoURL,
          };
        }
        return p;
      });
      StorageService.savePosts(updated);
      return updated;
    });
  };

  const handleAddGolfer = (newGolfer: GolferUser) => {
    const updatedAll = [...allUsers, newGolfer];
    setAllUsers(updatedAll);
    StorageService.saveAllUsers(updatedAll);

    // Persist new golfer to Supabase profiles
    SupabaseService.upsertProfile(newGolfer).catch(err => {
      console.warn('[App] Supabase upsertProfile for added golfer error:', err);
    });

    // Auto-friend the added golfer
    const nextFriends = new Set(friendUserIds).add(newGolfer.id);
    setFriendUserIds(nextFriends);
    StorageService.saveFriendUserIds(Array.from(nextFriends) as string[], currentUser.id);

    const updatedCurrent: GolferUser = {
      ...currentUser,
      friendsCount: (currentUser.friendsCount || 0) + 1,
    };
    handleUpdateProfile(updatedCurrent);

    setIsAddGolferModalOpen(false);
  };

  const handleFullReset = () => {
    onResetDatabase();
    setAllUsers([]);
    setPosts([]);
    setMatches([]);
    setFriendRequests([]);
    setFriendUserIds(new Set());
    setFollowedUserIds(new Set());
  };

  return (
    <div className={`min-h-screen flex flex-col selection:bg-emerald-500 selection:text-white font-sans transition-colors duration-200 ${
      isDark ? 'bg-[#07090C] bg-broadcast-grid text-slate-100' : 'bg-[#F1F5F9] text-slate-900'
    }`}>
      {/* Top Application Header */}
      <HeaderNav
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        currentUser={currentUser}
        onOpenNewPost={() => setIsNewPostModalOpen(true)}
      />

      {/* Main Content Area: Responsive Full-Viewport Layout */}
      <main className="flex-1 w-full flex flex-col min-h-0">
        {viewMode === 'architecture_only' ? (
          <div className="max-w-7xl w-full mx-auto p-4 lg:p-6 flex-1 overflow-y-auto">
            <ArchitectureExplorer
              currentUser={currentUser}
              posts={posts}
              matches={matches}
              friendRequests={friendRequests}
            />
          </div>
        ) : (
          <MobileSimulator
            currentTab={mobileTab}
            onChangeTab={setMobileTab}
            currentUser={currentUser}
            pendingRequestsCount={pendingRequestsCount}
            hasActiveMatch={Boolean(activeMatch)}
            onOpenNotifications={() => setMobileTab('players')}
          >
            {/* Prominent Verification Banner if user email is unverified */}
            {!currentUser.emailVerified && (
              <EmailVerificationBanner
                user={currentUser}
                onOpenVerifyModal={handleTriggerVerifyModal}
                onEmailVerified={handleEmailVerified}
              />
            )}

            {mobileTab === 'feed' && (
              <GolfTourFeed
                currentUser={currentUser}
                posts={posts}
                onOpenScorecard={setSelectedScorecardPost}
                onOpenNewPost={() => setIsNewPostModalOpen(true)}
                onToggleLike={handleToggleLike}
                onAddComment={handleAddComment}
                onOpenPlayerProfile={handleOpenPlayerProfile}
              />
            )}

            {mobileTab === 'tournaments' && (
              <TournamentHub
                currentUser={currentUser}
                allUsers={allUsers}
                onOpenPlayerProfile={handleOpenPlayerProfile}
                onOpenVerifyModal={(context) => handleTriggerVerifyModal(context)}
              />
            )}

            {mobileTab === 'matches' && (
              <MatchesHub
                currentUser={currentUser}
                matches={matches}
                onJoinMatch={handleJoinMatch}
                onCreateMatch={handleCreateMatch}
                onStartScoring={handleStartScoringMatch}
              />
            )}

            {mobileTab === 'scoring' && (
              <ActiveMatchScoring
                currentUser={currentUser}
                onClose={() => setMobileTab('matches')}
                onRoundFinished={handleRoundFinished}
              />
            )}

            {mobileTab === 'players' && (
              <PlayerDiscovery
                currentUser={currentUser}
                allUsers={allUsers}
                friendRequests={friendRequests}
                onSendFriendRequest={handleSendFriendRequest}
                onAcceptFriendRequest={handleAcceptFriendRequest}
                onDeclineFriendRequest={handleDeclineFriendRequest}
                onToggleFollow={handleToggleFollow}
                onOpenAddGolferModal={() => setIsAddGolferModalOpen(true)}
                onSelectGolfer={setSelectedGolferForProfile}
                followedUserIds={followedUserIds}
                friendUserIds={friendUserIds}
                pendingSentUserIds={pendingSentUserIds}
              />
            )}

            {mobileTab === 'profile' && (
              <GolferProfile
                currentUser={currentUser}
                allUsers={allUsers}
                onUpdateUser={handleUpdateProfile}
                onOpenFriendsTab={() => setMobileTab('players')}
                onResetDatabase={handleFullReset}
                onOpenAddGolferModal={() => setIsAddGolferModalOpen(true)}
                onLogout={() => onSetCurrentUser(null)}
                onDeleteAccount={handleDeleteAccount}
                onOpenVerifyModal={() => handleTriggerVerifyModal('profile')}
                onNavigateToTournaments={() => setMobileTab('tournaments')}
              />
            )}
          </MobileSimulator>
        )}
      </main>

      {/* Interactive 18-Hole Match Scorecard Modal */}
      {selectedScorecardPost && (
        <MatchScorecardModal
          post={selectedScorecardPost}
          onClose={() => setSelectedScorecardPost(null)}
        />
      )}

      {/* New Round / Activity Post Modal */}
      {isNewPostModalOpen && (
        <NewPostModal
          currentUser={currentUser}
          onClose={() => setIsNewPostModalOpen(false)}
          onPostCreated={handleCreatePost}
        />
      )}

      {/* Add Golfer Friend Modal */}
      {isAddGolferModalOpen && (
        <AddGolferModal
          currentUser={currentUser}
          onClose={() => setIsAddGolferModalOpen(false)}
          onAddGolfer={handleAddGolfer}
        />
      )}

      {/* Email Verification Modal */}
      {isVerifyModalOpen && (
        <EmailVerificationModal
          user={currentUser}
          isOpen={isVerifyModalOpen}
          onClose={() => setIsVerifyModalOpen(false)}
          onVerified={handleEmailVerified}
          restrictedFeatureName={verifyFeatureContext}
        />
      )}

      {/* Interactive Friend Profile Modal */}
      {selectedGolferForProfile && (
        <FriendProfileModal
          friend={selectedGolferForProfile}
          currentUser={currentUser}
          isOpen={Boolean(selectedGolferForProfile)}
          onClose={() => setSelectedGolferForProfile(null)}
          posts={posts}
          tournament={null}
          isFriend={friendUserIds.has(selectedGolferForProfile.id)}
          isPendingSent={pendingSentUserIds.has(selectedGolferForProfile.id)}
          isPendingReceived={friendRequests.some(r => r.requesterId === selectedGolferForProfile.id && r.recipientId === currentUser.id && r.status === 'pending')}
          isFollowed={followedUserIds.has(selectedGolferForProfile.id)}
          onSendFriendRequest={handleSendFriendRequest}
          onAcceptFriendRequest={handleAcceptFriendRequest}
          onToggleFollow={handleToggleFollow}
          pendingRequestId={friendRequests.find(r => r.requesterId === selectedGolferForProfile.id && r.recipientId === currentUser.id && r.status === 'pending')?.id}
        />
      )}
    </div>
  );
}

// Fallback dummy user object for context wrapper if no user is signed in yet
const FALLBACK_AUTH_USER: GolferUser = {
  id: 'anon-visitor',
  email: 'visitor@golftour.app',
  username: 'visitor',
  displayName: 'Guest Golfer',
  handicapIndex: 12.0,
  golfTourLevel: 4.2,
  homeClubId: 'simola-hotel-country-club',
  homeClubName: 'Garden Route Golf Club',
  city: 'Knysna',
  country: 'South Africa',
  preferredTees: 'Middle',
  bio: '',
  photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&q=80',
  isPublic: true,
  isOnline: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  bag: [],
  handicapHistory: [],
  stats: {
    fairwaysHitPct: 0,
    greensInRegPct: 0,
    avgPuttsPerRound: 0,
    scramblingPct: 0,
    holesInOne: 0,
    eaglesCount: 0,
    birdiesCount: 0,
  },
  friendsCount: 0,
  followingCount: 0,
  followersCount: 0,
  roundsCount: 0,
  bestScore: 0,
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<GolferUser | null>(() => {
    return AuthService.getCurrentUser() || StorageService.getCurrentUser();
  });

  // Synchronize live Supabase Auth session with application state
  useEffect(() => {
    if (!SupabaseService.isLive() || !supabase) return;

    // Check existing live session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        console.log('[App] Active Supabase Auth session identified for user UUID:', session.user.id);
        SupabaseService.fetchProfileById(session.user.id).then(profile => {
          if (profile) {
            setCurrentUser(profile);
            StorageService.setCurrentUser(profile);
          }
        });
      }
    }).catch(err => {
      console.warn('[App] Supabase getSession error:', err);
    });

    // Listen for real-time Auth lifecycle changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[App] Supabase onAuthStateChange:', event, session?.user?.id);
      if (event === 'SIGNED_IN' && session?.user) {
        const liveProfile = await SupabaseService.fetchProfileById(session.user.id);
        if (liveProfile) {
          setCurrentUser(liveProfile);
          StorageService.setCurrentUser(liveProfile);
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        StorageService.setCurrentUser(null);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const handleSetCurrentUser = (user: GolferUser | null) => {
    setCurrentUser(user);
    StorageService.setCurrentUser(user);
  };

  const handleResetDatabase = () => {
    AuthService.logoutAsync().catch(() => {});
    StorageService.resetDatabase();
    setCurrentUser(null);
  };

  return (
    <ThemeProvider>
      <GolfMatchProvider currentUser={currentUser || FALLBACK_AUTH_USER}>
        <AppContent
          currentUser={currentUser}
          onSetCurrentUser={handleSetCurrentUser}
          onResetDatabase={handleResetDatabase}
        />
      </GolfMatchProvider>
    </ThemeProvider>
  );
}
