import React, { useState } from 'react';
import { GolferUser, GolfPost } from '../types/golf';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Flag, 
  Trophy, 
  MapPin, 
  Sparkles, 
  Plus, 
  Send, 
  Users,
  Compass,
  FileText
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface GolfTourFeedProps {
  currentUser: GolferUser;
  posts: GolfPost[];
  onOpenScorecard: (post: GolfPost) => void;
  onOpenNewPost: () => void;
  onToggleLike: (postId: string) => void;
  onAddComment: (postId: string, commentText: string) => void;
  onHostMatchClick?: () => void;
  onOpenPlayerProfile?: (userId: string) => void;
}

export const GolfTourFeed: React.FC<GolfTourFeedProps> = ({
  currentUser,
  posts,
  onOpenScorecard,
  onOpenNewPost,
  onToggleLike,
  onAddComment,
  onHostMatchClick,
  onOpenPlayerProfile,
}) => {
  const [filter, setFilter] = useState<'all' | 'matches' | 'friends'>('all');
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState<string>('');

  const filteredPosts = posts.filter(post => {
    if (filter === 'matches') return post.type === 'match_recap';
    if (filter === 'friends') return post.authorId !== currentUser.id;
    return true;
  });

  const handleSendComment = (postId: string) => {
    if (!commentInput.trim()) return;
    onAddComment(postId, commentInput.trim());
    setCommentInput('');
  };

  const handleLikeWithConfetti = (postId: string, hasLiked?: boolean) => {
    if (!hasLiked) {
      try {
        confetti({
          particleCount: 25,
          spread: 45,
          origin: { y: 0.7 }
        });
      } catch {
        // ignore
      }
    }
    onToggleLike(postId);
  };

  return (
    <div id="golftour-feed-container" className="space-y-4 pb-24">
      {/* Feed Filters & Action Bar */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5 p-1 bg-[#131923] border border-white/[0.08] rounded-xl shadow-inner">
          <button
            id="filter-all-btn"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              filter === 'all'
                ? 'bg-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Activity
          </button>
          <button
            id="filter-matches-btn"
            onClick={() => setFilter('matches')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              filter === 'matches'
                ? 'bg-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ⛳️ Match Results
          </button>
          <button
            id="filter-friends-btn"
            onClick={() => setFilter('friends')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              filter === 'friends'
                ? 'bg-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Friends
          </button>
        </div>

        <button
          id="feed-post-match-btn"
          onClick={onOpenNewPost}
          className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs transition shadow-[0_0_14px_rgba(16,185,129,0.3)] cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Post Update
        </button>
      </div>

      {/* Posts List or Empty State */}
      <div className="space-y-4">
        {filteredPosts.length === 0 ? (
          <div className="bg-[#131923] border border-white/[0.08] rounded-3xl p-8 text-center space-y-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
              <Flag className="w-8 h-8 text-emerald-400" />
            </div>
            
            <div className="space-y-1.5 max-w-sm mx-auto">
              <h3 className="text-base font-black text-white">
                {filter === 'matches' 
                  ? 'No Match Results Recorded Yet' 
                  : filter === 'friends' 
                  ? 'No Activity from Friends Yet' 
                  : 'Your Social Feed is Fresh & Clean'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {filter === 'matches'
                  ? 'Complete an 18-hole matchplay or Stableford round to publish your official scorecard recap here.'
                  : filter === 'friends'
                  ? 'Add your golfing buddies to follow their handicap progress and round highlights.'
                  : 'Start by posting a golf status update, or play a live match on Simola, Knysna, or Plettenberg Bay.'}
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <button
                onClick={onOpenNewPost}
                className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs transition shadow-[0_0_16px_rgba(16,185,129,0.3)] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Post</span>
              </button>
              {onHostMatchClick && (
                <button
                  onClick={onHostMatchClick}
                  className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-[#1B2330] hover:bg-[#242F42] border border-white/[0.08] text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trophy className="w-4 h-4 text-emerald-400" />
                  <span>Host a Match</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          filteredPosts.map(post => {
            const match = post.matchData;
            const isUnderPar = match && match.parDiff < 0;

            return (
              <article
                key={post.id}
                id={`post-${post.id}`}
                className="bg-[#131923] border border-white/[0.08] rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition hover:border-white/[0.14]"
              >
                {/* Post Author Bar */}
                <div className="p-4 flex items-center justify-between">
                  <div 
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={() => onOpenPlayerProfile && onOpenPlayerProfile(post.authorId)}
                    title={`View ${post.authorName}'s Profile & Feed`}
                  >
                    <div className="relative">
                      <img
                        src={post.authorAvatar}
                        alt={post.authorName}
                        className="w-11 h-11 rounded-full object-cover border-2 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)] group-hover:border-emerald-400 group-hover:ring-2 group-hover:ring-emerald-500/30 transition"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-white text-sm group-hover:text-emerald-400 transition">{post.authorName}</h4>
                        <span className="text-xs text-slate-400 font-mono">@{post.authorUsername}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span className="text-emerald-400 font-bold font-mono">HCP {post.authorHandicap.toFixed(1)}</span>
                        <span>•</span>
                        <span>{new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        {post.location && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[120px] text-slate-300">{post.location}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="px-4 pb-3 space-y-2">
                  <p className="text-xs text-slate-200 leading-relaxed">{post.content}</p>

                  {/* If Match Recap: Scorecard Highlight Card */}
                  {match && (
                    <div
                      onClick={() => onOpenScorecard(post)}
                      className="bg-[#0D1117] text-white rounded-xl p-3.5 space-y-2.5 cursor-pointer hover:bg-[#111722] transition border border-white/[0.08] shadow-inner"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-emerald-400" />
                          <span className="font-black text-xs text-white">{match.courseName}</span>
                        </div>
                        <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded">
                          {((match.gameType || (match as any).format || 'stroke_play') + '').replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-2 text-center py-2 bg-[#080B0F]/80 rounded-lg border border-white/[0.04]">
                        <div>
                          <div className="text-[10px] text-slate-400 font-medium">Gross</div>
                          <div className="text-sm font-black text-white font-mono tabular-nums">{match.grossScore}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 font-medium">Net</div>
                          <div className="text-sm font-black text-emerald-400 font-mono tabular-nums">{match.netScore}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 font-medium">To Par</div>
                          <div className={`text-sm font-black font-mono tabular-nums ${isUnderPar ? 'text-rose-400' : 'text-slate-200'}`}>
                            {match.parDiff > 0 ? `+${match.parDiff}` : match.parDiff === 0 ? 'E' : match.parDiff}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 font-medium">Stableford</div>
                          <div className="text-sm font-black text-amber-400 font-mono tabular-nums">{match.stablefordPoints} pts</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span>Tap to view official scorecard</span>
                        <span className="text-emerald-400 font-bold">18 Holes &rarr;</span>
                      </div>
                    </div>
                  )}

                  {/* Photo if present */}
                  {post.photoURL && (
                    <div className="rounded-xl overflow-hidden max-h-72 border border-white/[0.08]">
                      <img src={post.photoURL} alt="Round Photo" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                {/* Post Footer & Social Reactions */}
                <div className="px-4 py-2.5 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleLikeWithConfetti(post.id, post.hasLiked)}
                      className={`flex items-center gap-1.5 font-bold transition cursor-pointer ${
                        post.hasLiked ? 'text-rose-400' : 'hover:text-rose-400 text-slate-400'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${post.hasLiked ? 'fill-rose-400' : ''}`} />
                      <span className="font-mono tabular-nums">{post.likesCount}</span>
                    </button>

                    <button
                      onClick={() => setActiveCommentPostId(activeCommentPostId === post.id ? null : post.id)}
                      className="flex items-center gap-1.5 font-bold hover:text-emerald-400 text-slate-400 transition cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>{post.comments?.length || post.commentsCount} Comments</span>
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      try {
                        navigator.clipboard?.writeText(window.location.href);
                      } catch {
                        // ignore
                      }
                    }}
                    className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-white transition cursor-pointer"
                    title="Share match recap"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Interactive Comments Drawer */}
                {activeCommentPostId === post.id && (
                  <div className="p-4 bg-[#0A0E15] border-t border-white/[0.08] space-y-3 animate-in fade-in duration-150">
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {post.comments && post.comments.length > 0 ? (
                        post.comments.map(c => (
                          <div key={c.id} className="flex items-start gap-2.5 text-xs">
                            <img
                              src={c.authorAvatar}
                              alt={c.authorName}
                              className="w-7 h-7 rounded-full object-cover mt-0.5 border border-white/[0.1]"
                            />
                            <div className="flex-1 bg-[#131923] p-2.5 rounded-xl border border-white/[0.08] shadow-inner">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="font-bold text-white text-[11px]">{c.authorName}</span>
                                <span className="text-[10px] text-emerald-400 font-bold font-mono">HCP {c.authorHandicap.toFixed(1)}</span>
                              </div>
                              <p className="text-slate-300 text-xs leading-relaxed">{c.content}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500 text-center py-2">
                          No comments yet. Be the first to congratulate this round! ⛳️
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
                      <input
                        type="text"
                        value={commentInput}
                        onChange={e => setCommentInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSendComment(post.id)}
                        placeholder="Add a congratulatory comment..."
                        className="flex-1 bg-[#0D1117] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                      <button
                        id={`send-comment-${post.id}`}
                        onClick={() => handleSendComment(post.id)}
                        className="p-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 transition cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
};
