import React, { useState, useEffect, useRef } from 'react';
import { GolferUser, FriendRequest } from '../types/golf';
import { 
  Search, 
  UserPlus, 
  UserCheck, 
  Users, 
  Check, 
  X, 
  MapPin, 
  ShieldCheck, 
  TrendingUp, 
  Filter,
  Sparkles,
  Award,
  User,
  Globe,
  Loader2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { SupabaseService } from '../services/supabaseService';
import { dedupeUsers, isSameUser } from '../utils/userDedupe';

interface PlayerDiscoveryProps {
  currentUser: GolferUser;
  allUsers: GolferUser[];
  friendRequests: FriendRequest[];
  onSendFriendRequest: (targetUserId: string, targetUser?: GolferUser) => void;
  onAcceptFriendRequest: (requestId: string, requesterId: string) => void;
  onDeclineFriendRequest: (requestId: string) => void;
  onToggleFollow: (targetUserId: string) => void;
  followedUserIds: Set<string>;
  friendUserIds: Set<string>;
  pendingSentUserIds: Set<string>;
  onOpenAddGolferModal?: () => void;
  onSelectGolfer?: (golfer: GolferUser) => void;
}

export const PlayerDiscovery: React.FC<PlayerDiscoveryProps> = ({
  currentUser,
  allUsers,
  friendRequests,
  onSendFriendRequest,
  onAcceptFriendRequest,
  onDeclineFriendRequest,
  onToggleFollow,
  followedUserIds,
  friendUserIds,
  pendingSentUserIds,
  onOpenAddGolferModal,
  onSelectGolfer,
}) => {
  const [activeTab, setActiveTab] = useState<'find' | 'requests' | 'my_friends'>('find');
  const [searchQuery, setSearchQuery] = useState('');
  const [handicapFilter, setHandicapFilter] = useState<'all' | 'single' | 'mid' | 'high'>('all');
  const [globalProfiles, setGlobalProfiles] = useState<GolferUser[]>([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);
  const debounceTimerRef = useRef<any>(null);

  // Global Supabase Search Effect
  useEffect(() => {
    const cleanQuery = searchQuery.trim();
    if (!cleanQuery || cleanQuery.length < 2) {
      setGlobalProfiles([]);
      setIsSearchingGlobal(false);
      return;
    }

    setIsSearchingGlobal(true);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await SupabaseService.searchProfiles(cleanQuery);
        // Exclude current user from global search results
        setGlobalProfiles(results.filter(u => u.id !== currentUser.id));
      } catch (err) {
        console.warn('[PlayerDiscovery] Global search error:', err);
      } finally {
        setIsSearchingGlobal(false);
      }
    }, 280);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, currentUser.id]);

  const pendingRequests = friendRequests.filter(r => 
    r.recipientId === currentUser.id && 
    r.status === 'pending' &&
    !isSameUser(r.requester, currentUser) &&
    !isSameUser(r.requesterId, currentUser.id)
  );

  // Filter out any user record representing the current user (by ID, email, or username)
  const otherUsers = allUsers.filter(u => !isSameUser(u, currentUser));
  const otherGlobal = globalProfiles.filter(u => !isSameUser(u, currentUser));

  // Merge and deduplicate all golfers (global takes priority for fresh live data)
  const allAvailableGolfers = dedupeUsers([...otherGlobal, ...otherUsers]).filter(u => !isSameUser(u, currentUser));

  const filteredGolfers = allAvailableGolfers.filter(u => {
    // Search match
    if (searchQuery.trim()) {
      const isFromLiveSupabase = globalProfiles.some(g => isSameUser(g, u));
      if (!isFromLiveSupabase) {
        const q = searchQuery.toLowerCase();
        const matchName = u.displayName.toLowerCase().includes(q) || u.username.toLowerCase().includes(q) || (u.homeClubName && u.homeClubName.toLowerCase().includes(q));
        if (!matchName) return false;
      }
    }

    // Handicap filter
    if (handicapFilter === 'single' && u.handicapIndex >= 10) return false;
    if (handicapFilter === 'mid' && (u.handicapIndex < 10 || u.handicapIndex > 20)) return false;
    if (handicapFilter === 'high' && u.handicapIndex <= 20) return false;

    const isFriend = Array.from(friendUserIds).some(id => isSameUser(id, u.id) || isSameUser(id, u));
    if (activeTab === 'my_friends' && !isFriend) return false;

    return true;
  });

  const handleAcceptWithConfetti = (reqId: string, requesterId: string) => {
    try {
      confetti({
        particleCount: 35,
        spread: 50,
        origin: { y: 0.5 }
      });
    } catch {
      // ignore
    }
    onAcceptFriendRequest(reqId, requesterId);
  };

  return (
    <div id="player-discovery-container" className="space-y-4 pb-24">
      {/* Top Action Bar & Tabs */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 grid grid-cols-3 gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
          <button
            id="tab-find-players"
            onClick={() => setActiveTab('find')}
            className={`py-2 px-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'find'
                ? 'bg-emerald-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Search className="w-3.5 h-3.5" /> All Golfers ({otherUsers.length})
          </button>

          <button
            id="tab-friend-requests"
            onClick={() => setActiveTab('requests')}
            className={`py-2 px-2 text-xs font-bold rounded-lg transition relative flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'requests'
                ? 'bg-emerald-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Requests
            {pendingRequests.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
                {pendingRequests.length}
              </span>
            )}
          </button>

          <button
            id="tab-my-friends"
            onClick={() => setActiveTab('my_friends')}
            className={`py-2 px-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'my_friends'
                ? 'bg-emerald-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" /> My Friends ({friendUserIds.size})
          </button>
        </div>

        {onOpenAddGolferModal && (
          <button
            onClick={onOpenAddGolferModal}
            className="py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-md shadow-emerald-200 flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Golfer</span>
          </button>
        )}
      </div>

      {activeTab === 'requests' ? (
        /* Requests View */
        <div className="space-y-3">
          {pendingRequests.length === 0 ? (
            <div className="p-8 text-center bg-white border border-slate-200 rounded-3xl shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 text-sm">No Pending Friend Requests</h4>
                <p className="text-xs text-slate-500">When other golfers invite you to connect or play, their requests will appear here.</p>
              </div>
              {onOpenAddGolferModal && (
                <button
                  onClick={onOpenAddGolferModal}
                  className="py-2 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Invite a Friend</span>
                </button>
              )}
            </div>
          ) : (
            pendingRequests.map(req => {
              const requester = req.requester || allUsers.find(u => u.id === req.requesterId);
              if (!requester) return null;

              return (
                <div
                  key={req.id}
                  id={`friend-request-${req.id}`}
                  className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs"
                >
                  <div 
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={() => onSelectGolfer && onSelectGolfer(requester)}
                    title={`View ${requester.displayName}'s Profile`}
                  >
                    <img
                      src={requester.photoURL}
                      alt={requester.displayName}
                      className="w-12 h-12 rounded-full object-cover border border-emerald-600 group-hover:ring-2 group-hover:ring-emerald-500 transition"
                    />
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition">{requester.displayName}</h4>
                      <p className="text-xs text-slate-500">@{requester.username} • HCP {requester.handicapIndex.toFixed(1)}</p>
                      <p className="text-[11px] text-emerald-700 font-semibold">{requester.homeClubName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      id={`accept-request-${req.id}`}
                      onClick={() => handleAcceptWithConfetti(req.id, requester.id)}
                      className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-1 cursor-pointer shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" /> Accept
                    </button>
                    <button
                      id={`decline-request-${req.id}`}
                      onClick={() => onDeclineFriendRequest(req.id)}
                      className="py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Golfers Discovery & Search View */
        <div className="space-y-4">
          {/* Search Bar - Always visible to allow querying global Supabase directory */}
          <div className="space-y-2">
            <div className="relative">
              {isSearchingGlobal ? (
                <Loader2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600 animate-spin" />
              ) : (
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              )}
              <input
                type="text"
                id="golfer-search-input"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search golfers globally by name, @username, or club..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-24 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-2xs"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 pointer-events-none">
                <Globe className="w-3 h-3 text-emerald-600" />
                <span>Global DB</span>
              </div>
            </div>

            {/* Handicap Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setHandicapFilter('all')}
                className={`px-3 py-1 rounded-full whitespace-nowrap font-bold transition cursor-pointer ${
                  handicapFilter === 'all'
                    ? 'bg-emerald-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                All Handicaps
              </button>
              <button
                onClick={() => setHandicapFilter('single')}
                className={`px-3 py-1 rounded-full whitespace-nowrap font-bold transition cursor-pointer ${
                  handicapFilter === 'single'
                    ? 'bg-emerald-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                ⚡️ Scratch to Single (0 - 9.9)
              </button>
              <button
                onClick={() => setHandicapFilter('mid')}
                className={`px-3 py-1 rounded-full whitespace-nowrap font-bold transition cursor-pointer ${
                  handicapFilter === 'mid'
                    ? 'bg-emerald-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                Mid HCP (10 - 20)
              </button>
              <button
                onClick={() => setHandicapFilter('high')}
                className={`px-3 py-1 rounded-full whitespace-nowrap font-bold transition cursor-pointer ${
                  handicapFilter === 'high'
                    ? 'bg-emerald-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                High HCP (20+)
              </button>
            </div>
          </div>

          {/* Golfers List or Empty State */}
          <div className="space-y-3">
            {allAvailableGolfers.length === 0 && !searchQuery.trim() ? (
              <div className="p-8 text-center bg-white border border-slate-200 rounded-3xl shadow-xs space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center border border-emerald-100 shadow-2xs">
                  <UserPlus className="w-8 h-8 text-emerald-600" />
                </div>
                <div className="space-y-1.5 max-w-sm mx-auto">
                  <h4 className="text-base font-black text-slate-900">Search the Global Golfer Network</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Type a username or golfer name in the search bar above to search across all connected devices and clubs in Supabase.
                  </p>
                </div>
                {onOpenAddGolferModal && (
                  <button
                    onClick={onOpenAddGolferModal}
                    className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-md shadow-emerald-200 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Add New Playing Partner</span>
                  </button>
                )}
              </div>
            ) : filteredGolfers.length === 0 ? (
              <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2">
                <p className="text-xs font-semibold text-slate-600">
                  {activeTab === 'my_friends' 
                    ? 'You have not added any friends to your roster yet.' 
                    : isSearchingGlobal
                      ? 'Querying global Supabase directory...'
                      : `No golfers found matching "${searchQuery}".`}
                </p>
                <p className="text-[11px] text-slate-400">
                  Check the spelling or try searching by club name.
                </p>
              </div>
            ) : (
              filteredGolfers.map(golfer => {
                const isFriend = Array.from(friendUserIds).some(id => isSameUser(id, golfer.id) || isSameUser(id, golfer));
                const isPendingSent = Array.from(pendingSentUserIds).some(id => isSameUser(id, golfer.id) || isSameUser(id, golfer));
                const isFollowing = Array.from(followedUserIds).some(id => isSameUser(id, golfer.id) || isSameUser(id, golfer));
                const isSelf = isSameUser(golfer, currentUser);

                return (
                  <div
                    key={golfer.id}
                    id={`golfer-card-${golfer.id}`}
                    className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs hover:border-slate-300 transition"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div 
                        className="flex items-center gap-3 cursor-pointer group"
                        onClick={() => onSelectGolfer && onSelectGolfer(golfer)}
                        title={`View ${golfer.displayName}'s Profile & Feed`}
                      >
                        <div className="relative">
                          <img
                            src={golfer.photoURL}
                            alt={golfer.displayName}
                            className="w-12 h-12 rounded-full object-cover border-2 border-slate-200 group-hover:border-emerald-500 transition"
                          />
                          {golfer.isOnline && (
                            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition">{golfer.displayName}</h4>
                            {globalProfiles.some(g => g.id === golfer.id) && (
                              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                Supabase
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 font-mono">@{golfer.username}</p>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400" /> {golfer.homeClubName}
                          </p>
                        </div>
                      </div>

                      {/* Handicap Badge */}
                      <div className="text-right bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                        <div className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">WHS HCP</div>
                        <div className="text-sm font-black text-slate-900">{golfer.handicapIndex.toFixed(1)}</div>
                      </div>
                    </div>

                    {/* Bio */}
                    {golfer.bio && (
                      <p 
                        onClick={() => onSelectGolfer && onSelectGolfer(golfer)}
                        className="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-slate-50/50 hover:bg-slate-100/60 p-2 rounded-xl cursor-pointer transition"
                      >
                        "{golfer.bio}"
                      </p>
                    )}

                    {/* Action Bar */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {!isSelf && (
                          <button
                            onClick={() => onToggleFollow(golfer.id)}
                            className={`text-xs font-bold py-1.5 px-3 rounded-xl transition cursor-pointer ${
                              isFollowing
                                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                : 'text-slate-600 hover:text-slate-900 border border-slate-200'
                            }`}
                          >
                            {isFollowing ? 'Following' : '+ Follow'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onSelectGolfer && onSelectGolfer(golfer)}
                          className="text-xs font-bold py-1.5 px-2.5 rounded-xl text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                        >
                          Profile
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {isSelf ? (
                          <span className="py-1.5 px-3 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">
                            Your Profile
                          </span>
                        ) : isFriend ? (
                          <span className="py-1.5 px-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5" /> Friends
                          </span>
                        ) : isPendingSent ? (
                          <span className="py-1.5 px-3 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
                            Request Sent
                          </span>
                        ) : (
                          <button
                            id={`add-friend-btn-${golfer.id}`}
                            onClick={() => onSendFriendRequest(golfer.id, golfer)}
                            className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-md shadow-emerald-200 flex items-center gap-1 cursor-pointer"
                          >
                            <UserPlus className="w-3.5 h-3.5" /> Add Friend
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
