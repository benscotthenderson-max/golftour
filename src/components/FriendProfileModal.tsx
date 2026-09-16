import React, { useState } from 'react';
import { GolferUser, GolfPost, Tournament } from '../types/golf';
import { 
  X, 
  MapPin, 
  Shield, 
  Sparkles, 
  Trophy, 
  Calendar, 
  Heart, 
  MessageCircle, 
  UserCheck, 
  UserPlus, 
  Clock, 
  Check, 
  Flag,
  Award,
  Activity,
  FileText
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface FriendProfileModalProps {
  friend: GolferUser | null;
  currentUser: GolferUser;
  isOpen: boolean;
  onClose: () => void;
  posts?: GolfPost[];
  tournament?: Tournament | null;
  isFriend?: boolean;
  isPendingSent?: boolean;
  isPendingReceived?: boolean;
  isFollowed?: boolean;
  onSendFriendRequest?: (targetUserId: string) => void;
  onAcceptFriendRequest?: (requestId: string, requesterId: string) => void;
  onToggleFollow?: (targetUserId: string) => void;
  pendingRequestId?: string;
}

export const FriendProfileModal: React.FC<FriendProfileModalProps> = ({
  friend,
  currentUser,
  isOpen,
  onClose,
  posts = [],
  tournament = null,
  isFriend = false,
  isPendingSent = false,
  isPendingReceived = false,
  isFollowed = false,
  onSendFriendRequest,
  onAcceptFriendRequest,
  onToggleFollow,
  pendingRequestId,
}) => {
  const [activeTab, setActiveTab] = useState<'feed' | 'stats' | 'tournament'>('feed');

  if (!isOpen || !friend) return null;

  const isSelf = friend.id === currentUser.id;

  // Filter posts authored by or featuring this golfer
  const friendPosts = posts.filter(
    p => p.authorId === friend.id || p.matchData?.players?.some(player => player.userId === friend.id)
  );

  // Check if player participated in tournament leaderboard
  const tournamentRanking = tournament?.leaderboard?.playerRankings?.find(
    p => p.userId === friend.id
  );
  const tournamentTeam = tournamentRanking?.teamId
    ? tournament?.teams.find(t => t.id === tournamentRanking.teamId)
    : null;

  const handleSendFriendRequest = () => {
    if (onSendFriendRequest) {
      try {
        confetti({
          particleCount: 30,
          spread: 50,
          origin: { y: 0.6 }
        });
      } catch {
        // ignore
      }
      onSendFriendRequest(friend.id);
    }
  };

  const handleAcceptRequest = () => {
    if (pendingRequestId && onAcceptFriendRequest) {
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.5 }
        });
      } catch {
        // ignore
      }
      onAcceptFriendRequest(pendingRequestId, friend.id);
    }
  };

  return (
    <div
      id="friend-profile-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#07090C]/85 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="friend-profile-modal-container"
        className="w-full max-w-lg bg-[#0D1117] rounded-3xl border border-white/[0.08] shadow-[0_16px_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh] text-slate-100 animate-in zoom-in-95 duration-200"
      >
        {/* Header Cover Bar */}
        <div className="relative h-24 bg-gradient-to-r from-emerald-900 via-teal-950 to-[#0D1117] p-4 flex justify-between items-start">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" /> Golfer Profile
            </span>
          </div>

          <button
            id="close-friend-profile-modal-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#0D1117]/80 hover:bg-[#1A2332] text-slate-300 hover:text-white border border-white/[0.1] flex items-center justify-center transition cursor-pointer"
            aria-label="Close Profile"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="px-5 pb-6 pt-0 space-y-4 overflow-y-auto flex-1">
          {/* Header Section: Avatar, Display Name, Username, Social Actions */}
          <div className="flex items-end justify-between -mt-10 gap-3">
            <div className="relative">
              <img
                src={friend.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&q=80'}
                alt={friend.displayName}
                className="w-20 h-20 rounded-2xl object-cover border-4 border-[#0D1117] shadow-xl bg-slate-900"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&q=80';
                }}
              />
            </div>

            {/* Social Connection Actions */}
            {!isSelf && (
              <div className="flex items-center gap-2">
                {onToggleFollow && (
                  <button
                    type="button"
                    onClick={() => onToggleFollow(friend.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      isFollowed
                        ? 'bg-[#1A2332] text-slate-300 border border-white/[0.1] hover:bg-[#222E42]'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                    }`}
                  >
                    {isFollowed ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Following</span>
                      </>
                    ) : (
                      <span>+ Follow</span>
                    )}
                  </button>
                )}

                {isFriend ? (
                  <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Friends</span>
                  </span>
                ) : isPendingReceived ? (
                  <button
                    type="button"
                    onClick={handleAcceptRequest}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Accept Request</span>
                  </button>
                ) : isPendingSent ? (
                  <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Request Sent</span>
                  </span>
                ) : onSendFriendRequest ? (
                  <button
                    type="button"
                    onClick={handleSendFriendRequest}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#1A2332] hover:bg-[#222E42] text-white border border-white/[0.1] flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Add Friend</span>
                  </button>
                ) : null}
              </div>
            )}
          </div>

          {/* Names, Handle & Home Course */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-black text-white">{friend.displayName}</h3>
              {friend.emailVerified && (
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Verified
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-mono">@{friend.username}</p>
            {friend.homeClubName && (
              <p className="text-xs text-emerald-400 flex items-center gap-1.5 pt-0.5 font-medium">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span>{friend.homeClubName}</span>
              </p>
            )}
          </div>

          {/* Bio: Dedicated Section */}
          <div className="p-3.5 rounded-2xl bg-[#131923] border border-white/[0.08] space-y-1.5">
            <div className="flex items-center gap-1.5 text-2xs font-bold text-slate-400 uppercase tracking-wider">
              <FileText className="w-3 h-3 text-emerald-400" />
              <span>Golfer Bio</span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed italic">
              {friend.bio ? `"${friend.bio}"` : 'No biographical statement provided yet.'}
            </p>
          </div>

          {/* Info & Basic Stats Grid */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 rounded-2xl bg-[#131923] border border-white/[0.08]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Handicap
              </span>
              <span className="text-base font-black text-white font-mono">
                {friend.handicapIndex.toFixed(1)}
              </span>
              <span className="text-[9px] text-emerald-400 block font-semibold">WHS Standard</span>
            </div>

            <div className="p-3 rounded-2xl bg-[#131923] border border-white/[0.08]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Tee Box
              </span>
              <span className="text-xs font-black text-white block truncate pt-1">
                {friend.preferredTees || 'White'}
              </span>
              <span className="text-[9px] text-slate-400 block font-semibold">Preferred</span>
            </div>

            <div className="p-3 rounded-2xl bg-[#131923] border border-white/[0.08]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Best Score
              </span>
              <span className="text-base font-black text-white font-mono">
                {friend.bestScore ? friend.bestScore : (72 + Math.round(friend.handicapIndex))}
              </span>
              <span className="text-[9px] text-slate-400 block font-semibold">Gross 18H</span>
            </div>
          </div>

          {/* Tournament Badge if rostered */}
          {tournamentRanking && (
            <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-950/40 via-[#131923] to-[#131923] border border-amber-500/30 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black border border-amber-500/30">
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span>Ryder Cup Roster</span>
                    {tournamentTeam && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md font-black bg-emerald-500/20 text-emerald-400">
                        {tournamentTeam.name}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    MVP Rank #{tournamentRanking.mvpRank} • {tournamentRanking.pointsEarned} Pts Earned ({tournamentRanking.matchesWon}W-{tournamentRanking.matchesLost}L-{tournamentRanking.matchesTied}T)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Feed History Tabs */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>Feed History & Recent Activity ({friendPosts.length})</span>
              </h4>
            </div>

            {/* Scrollable Feed List */}
            {friendPosts.length === 0 ? (
              <div className="p-6 text-center bg-[#131923] border border-white/[0.06] rounded-2xl space-y-2">
                <div className="w-10 h-10 rounded-full bg-[#1A2332] text-slate-400 mx-auto flex items-center justify-center">
                  <FileText className="w-5 h-5 text-slate-500" />
                </div>
                <p className="text-xs font-bold text-slate-300">No public posts yet</p>
                <p className="text-2xs text-slate-500 max-w-xs mx-auto">
                  When @{friend.username} shares round scorecards, achievements, or match recaps, they will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {friendPosts.map((post) => (
                  <div
                    key={post.id}
                    className="p-3.5 rounded-2xl bg-[#131923] border border-white/[0.06] hover:border-white/[0.12] transition space-y-2 text-xs"
                  >
                    {/* Post Author / Header & Date */}
                    <div className="flex items-center justify-between text-2xs text-slate-400">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                        <Flag className="w-3 h-3 text-emerald-400" />
                        <span>{post.type.replace('_', ' ').toUpperCase()}</span>
                      </div>
                      <span className="font-mono">
                        {new Date(post.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    {/* Match Scorecard Highlight Snapshot */}
                    {post.matchData && (
                      <div className="p-2.5 rounded-xl bg-[#0D1117] border border-white/[0.06] flex items-center justify-between">
                        <div>
                          <p className="text-xs font-black text-white">{post.matchData.courseName}</p>
                          <p className="text-2xs text-slate-400">
                            {post.matchData.gameType.replace('_', ' ')} • Par {post.matchData.par || 72}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black text-emerald-400 font-mono">
                            {post.matchData.grossScore}
                          </span>
                          <span className="text-2xs text-slate-400 block">
                            {post.matchData.parDiff >= 0 ? `+${post.matchData.parDiff}` : post.matchData.parDiff} to par
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Post Content / Story */}
                    {post.content && (
                      <p className="text-xs text-slate-200 leading-relaxed">
                        {post.content}
                      </p>
                    )}

                    {/* Attached Photo */}
                    {post.mediaUrls && post.mediaUrls.length > 0 && (
                      <div className="rounded-xl overflow-hidden max-h-36 border border-white/[0.08]">
                        <img
                          src={post.mediaUrls[0]}
                          alt="Post Media"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Engagement Counts */}
                    <div className="pt-1 flex items-center justify-between text-2xs text-slate-400">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3 text-rose-500 fill-rose-500/20" />
                          <span>{post.likesCount}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3 text-sky-400" />
                          <span>{post.commentsCount}</span>
                        </span>
                      </div>
                      {post.location && (
                        <span className="text-slate-500 truncate max-w-[140px]">
                          📍 {post.location}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
