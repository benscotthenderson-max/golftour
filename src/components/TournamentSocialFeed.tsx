import React, { useState, useEffect } from 'react';
import { 
  Tournament, 
  TournamentFeedPost, 
  TournamentFeedComment, 
  GolferUser, 
  TournamentTeam 
} from '../types/golf';
import { TournamentFeedService } from '../services/tournamentFeedService';
import { 
  Camera, 
  Video, 
  Heart, 
  MessageCircle, 
  Share2, 
  Sparkles, 
  Send, 
  MapPin, 
  Flag, 
  Users, 
  Plus, 
  Check, 
  Flame, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause,
  Clock,
  Trophy
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TournamentSocialFeedProps {
  tournament: Tournament;
  currentUser: GolferUser;
  allUsers?: GolferUser[];
  onOpenCreatePost: () => void;
  onOpenPlayerProfile?: (userId: string) => void;
}

// Relative time formatter helper
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

export const TournamentSocialFeed: React.FC<TournamentSocialFeedProps> = ({
  tournament,
  currentUser,
  allUsers = [],
  onOpenCreatePost,
  onOpenPlayerProfile,
}) => {
  const [posts, setPosts] = useState<TournamentFeedPost[]>(() => 
    TournamentFeedService.getPosts(tournament.id)
  );
  const [filter, setFilter] = useState<'all' | 'video' | 'photo' | 'teamA' | 'teamB'>('all');
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({
    'tf-post-1': true, // Expand top post by default for live conversation feel
  });
  const [shareToastPostId, setShareToastPostId] = useState<string | null>(null);

  // Subscribe to real-time Firestore sync & cross-tab events
  useEffect(() => {
    const unsubscribe = TournamentFeedService.subscribe(tournament.id, updatedPosts => {
      setPosts(updatedPosts);
    });
    return () => unsubscribe();
  }, [tournament.id]);

  const teamA = tournament.teams[0];
  const teamB = tournament.teams[1];

  // Resolve user's team color
  const userTeam = tournament.teams.find(t => 
    t.playerIds.includes(currentUser.id) || t.captainId === currentUser.id
  );

  const handleToggleLike = (post: TournamentFeedPost) => {
    const isCurrentlyLiked = (post.likedUserIds || []).includes(currentUser.id);
    
    if (!isCurrentlyLiked) {
      try {
        confetti({
          particleCount: 30,
          spread: 45,
          origin: { y: 0.7 }
        });
      } catch {
        // ignore
      }
    }

    const updated = TournamentFeedService.toggleLike(tournament.id, post.id, currentUser.id);
    setPosts(updated);
  };

  const handleSendComment = (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    const updated = TournamentFeedService.addComment(
      tournament.id,
      postId,
      {
        id: currentUser.id,
        displayName: currentUser.displayName,
        username: currentUser.username,
        photoURL: currentUser.photoURL,
        teamColor: userTeam?.color,
      },
      text
    );

    setPosts(updated);
    setCommentInputs(prev => ({ ...prev, [postId]: '' }));
    setExpandedComments(prev => ({ ...prev, [postId]: true }));
  };

  const handleSharePost = (postId: string) => {
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(window.location.href);
      }
      setShareToastPostId(postId);
      setTimeout(() => setShareToastPostId(null), 2000);
    } catch {
      // fallback
    }
  };

  // Filter posts based on selected tab
  const filteredPosts = posts.filter(post => {
    if (filter === 'video') return post.mediaType === 'video';
    if (filter === 'photo') return post.mediaType === 'photo';
    if (filter === 'teamA') return post.authorTeamId === teamA?.id;
    if (filter === 'teamB') return post.authorTeamId === teamB?.id;
    return true;
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Top Banner & Quick Post Trigger */}
      <div className="p-4 rounded-3xl bg-slate-900 text-white shadow-md border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-white">Live Tournament Feed</h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black tracking-wide border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                ON COURSE LIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time shot highlights, trash talk, and match videos from players
            </p>
          </div>
        </div>

        <button
          onClick={onOpenCreatePost}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
          <span>Post Shot / Video</span>
        </button>
      </div>

      {/* Filter Navigation Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
            filter === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <span>All Moments</span>
          <span className="text-[10px] opacity-70">({posts.length})</span>
        </button>

        <button
          onClick={() => setFilter('video')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
            filter === 'video'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <Video className="w-3.5 h-3.5 text-sky-500" />
          <span>Videos</span>
        </button>

        <button
          onClick={() => setFilter('photo')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
            filter === 'photo'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <Camera className="w-3.5 h-3.5 text-emerald-500" />
          <span>Photos</span>
        </button>

        {teamA && (
          <button
            onClick={() => setFilter('teamA')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              filter === 'teamA'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <span>{teamA.badgeIcon}</span>
            <span>{teamA.name}</span>
          </button>
        )}

        {teamB && (
          <button
            onClick={() => setFilter('teamB')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              filter === 'teamB'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <span>{teamB.badgeIcon}</span>
            <span>{teamB.name}</span>
          </button>
        )}
      </div>

      {/* FEED STREAM OF POSTS */}
      {filteredPosts.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl space-y-3">
          <Camera className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="text-sm font-black text-slate-800">No posts in this view yet</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Be the first group to upload a shot video or celebration photo from today's round!
          </p>
          <button
            onClick={onOpenCreatePost}
            className="px-4 py-2 rounded-xl bg-emerald-900 text-white text-xs font-bold hover:bg-emerald-800 transition cursor-pointer"
          >
            + Create First Post
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map(post => {
            const isLiked = (post.likedUserIds || []).includes(currentUser.id);
            const isCommentsOpen = Boolean(expandedComments[post.id]);
            const postComments = post.comments || [];

            return (
              <article
                key={post.id}
                className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden transition hover:shadow-md"
              >
                {/* 1. Post Header: Author, Team, Handicap & Location */}
                <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      onClick={() => onOpenPlayerProfile && onOpenPlayerProfile(post.authorId)}
                      className="relative shrink-0 cursor-pointer group"
                    >
                      <img
                        src={post.authorAvatar}
                        alt={post.authorName}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-offset-1"
                        style={{ ringColor: post.authorTeamColor || '#059669' }}
                      />
                      <span className="absolute -bottom-1 -right-1 text-xs">
                        {post.authorTeamBadgeIcon || '⛳️'}
                      </span>
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => onOpenPlayerProfile && onOpenPlayerProfile(post.authorId)}
                          className="text-xs font-black text-slate-900 hover:text-emerald-700 transition truncate cursor-pointer"
                        >
                          {post.authorName}
                        </button>
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white"
                          style={{ backgroundColor: post.authorTeamColor || '#059669' }}
                        >
                          {post.authorTeamName?.split(' ')[0] || 'Team'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-2xs text-slate-500 mt-0.5">
                        <span>Hcp {post.authorHandicap?.toFixed(1) || '0.0'}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {formatTimeAgo(post.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Hole & Location Badge */}
                  {post.location && (
                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 text-[11px] font-bold border border-slate-200">
                        <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>{post.location}</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. Media Display (Video or High-Res Photo) */}
                <div className="relative bg-slate-950 aspect-video sm:aspect-16/10 flex items-center justify-center overflow-hidden">
                  {post.mediaType === 'video' ? (
                    <video
                      src={post.mediaUrl}
                      controls
                      playsInline
                      loop
                      className="w-full h-full object-cover"
                      poster={post.thumbnailUrl}
                    />
                  ) : (
                    <img
                      src={post.mediaUrl}
                      alt={post.caption}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  )}

                  {/* Media Type pill badge */}
                  <div className="absolute top-3 left-3 pointer-events-none">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-xs text-white text-[10px] font-black uppercase tracking-wider border border-white/10 flex items-center gap-1">
                      {post.mediaType === 'video' ? (
                        <>
                          <Video className="w-3 h-3 text-sky-400" /> Video
                        </>
                      ) : (
                        <>
                          <Camera className="w-3 h-3 text-emerald-400" /> Photo
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* 3. Action Bar: Like, Comment, Share */}
                <div className="p-3 sm:px-4 sm:pt-3 flex items-center justify-between border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleLike(post)}
                      className={`flex items-center gap-1.5 text-xs font-bold transition cursor-pointer px-2 py-1 rounded-xl ${
                        isLiked 
                          ? 'text-rose-600 bg-rose-50' 
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                      <span>{post.likesCount}</span>
                    </button>

                    <button
                      onClick={() => setExpandedComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                      className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition cursor-pointer px-2 py-1 rounded-xl hover:bg-slate-100"
                    >
                      <MessageCircle className="w-4 h-4 text-slate-500" />
                      <span>{postComments.length}</span>
                    </button>

                    <button
                      onClick={() => handleSharePost(post.id)}
                      className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer px-2 py-1 rounded-xl hover:bg-slate-100"
                      title="Share link"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      {shareToastPostId === post.id && (
                        <span className="text-[10px] text-emerald-600 font-bold animate-in fade-in">Copied!</span>
                      )}
                    </button>
                  </div>

                  <div className="text-2xs font-bold text-slate-400">
                    Ryder Cup Moment
                  </div>
                </div>

                {/* 4. Post Caption & Tagged Players */}
                <div className="p-3.5 sm:p-4 space-y-2.5">
                  {/* Caption */}
                  <p className="text-xs text-slate-800 leading-relaxed">
                    <strong className="text-slate-950 mr-1.5">{post.authorName}</strong>
                    {post.caption}
                  </p>

                  {/* Tagged Players in this Shot */}
                  {post.taggedPlayers && post.taggedPlayers.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mr-1">
                        <Users className="w-3 h-3 text-slate-400" /> In this shot:
                      </span>
                      {post.taggedPlayers.map(player => (
                        <span
                          key={player.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200"
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: player.teamColor || '#059669' }}
                          />
                          <span>@{player.displayName}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* 5. Comments Section */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    {postComments.length > 0 && !isCommentsOpen && (
                      <button
                        onClick={() => setExpandedComments(prev => ({ ...prev, [post.id]: true }))}
                        className="text-xs text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
                      >
                        View all {postComments.length} comments...
                      </button>
                    )}

                    {isCommentsOpen && postComments.length > 0 && (
                      <div className="space-y-2 pt-1">
                        {postComments.map(c => (
                          <div key={c.id} className="flex items-start gap-2 text-xs">
                            <img
                              src={c.authorAvatar}
                              alt={c.authorName}
                              className="w-5 h-5 rounded-full object-cover shrink-0 mt-0.5 border border-slate-200"
                            />
                            <div className="min-w-0 bg-slate-50 rounded-xl px-2.5 py-1.5 border border-slate-100 flex-1">
                              <span className="font-black text-slate-900 mr-1.5">
                                {c.authorName}
                              </span>
                              <span className="text-slate-700">{c.content}</span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                {formatTimeAgo(c.createdAt)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Inline Comment Composer */}
                    <div className="flex items-center gap-2 pt-1">
                      <img
                        src={currentUser.photoURL}
                        alt={currentUser.displayName}
                        className="w-6 h-6 rounded-full object-cover shrink-0 border border-slate-200"
                      />
                      <input
                        type="text"
                        value={commentInputs[post.id] || ''}
                        onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            handleSendComment(post.id);
                          }
                        }}
                        placeholder="Add a comment or trash talk..."
                        className="flex-1 py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                      />
                      <button
                        onClick={() => handleSendComment(post.id)}
                        disabled={!commentInputs[post.id]?.trim()}
                        className="p-1.5 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-white transition disabled:opacity-40 cursor-pointer shrink-0"
                        title="Post comment"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
