import React, { useState, useRef } from 'react';
import { 
  Tournament, 
  TournamentTeam, 
  GolferUser, 
  TournamentFeedPost, 
  TournamentFeedTaggedPlayer 
} from '../types/golf';
import { 
  X, 
  Camera, 
  Video, 
  Image as ImageIcon, 
  UserPlus, 
  MapPin, 
  Flag, 
  Sparkles, 
  Check, 
  AlertCircle,
  Play,
  UploadCloud,
  Flame,
  Search
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { TournamentFeedService } from '../services/tournamentFeedService';

interface TournamentFeedPostModalProps {
  tournament: Tournament;
  currentUser: GolferUser;
  allUsers?: GolferUser[];
  onClose: () => void;
  onPostCreated?: (post: TournamentFeedPost) => void;
}

export const TournamentFeedPostModal: React.FC<TournamentFeedPostModalProps> = ({
  tournament,
  currentUser,
  allUsers = [],
  onClose,
  onPostCreated,
}) => {
  const [mediaType, setMediaType] = useState<'photo' | 'video'>('photo');
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [mediaTitle, setMediaTitle] = useState<string>('');
  const [caption, setCaption] = useState<string>('');
  const [selectedHole, setSelectedHole] = useState<number>(1);
  const [selectedCourse, setSelectedCourse] = useState<string>(
    tournament.rounds[0]?.courseName || 'Simola Golf & Country Estate'
  );
  const [taggedPlayers, setTaggedPlayers] = useState<TournamentFeedTaggedPlayer[]>([]);
  const [isTaggingOpen, setIsTaggingOpen] = useState<boolean>(false);
  const [tagSearchQuery, setTagSearchQuery] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Determine current user team
  const userTeam: TournamentTeam | undefined = tournament.teams.find(t => 
    t.playerIds.includes(currentUser.id) || t.captainId === currentUser.id
  ) || tournament.teams[0];

  // Resolve all tournament players with their team details for tagging
  const tournamentPlayers: TournamentFeedTaggedPlayer[] = [];
  tournament.teams.forEach(team => {
    team.playerIds.forEach(pId => {
      const userObj = allUsers.find(u => u.id === pId);
      tournamentPlayers.push({
        id: pId,
        displayName: userObj?.displayName || pId.replace('user-', '').replace(/-/g, ' ').toUpperCase(),
        username: userObj?.username || pId.replace('user-', ''),
        avatar: userObj?.photoURL || '',
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color,
      });
    });
  });

  // Handle local file upload (photo or video)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    setMediaType(isVideo ? 'video' : 'photo');
    setMediaTitle(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setMediaUrl(reader.result);
        setErrorMsg(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleToggleTagPlayer = (player: TournamentFeedTaggedPlayer) => {
    const isTagged = taggedPlayers.some(p => p.id === player.id);
    if (isTagged) {
      setTaggedPlayers(prev => prev.filter(p => p.id !== player.id));
    } else {
      setTaggedPlayers(prev => [...prev, player]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption.trim() && !mediaUrl) {
      setErrorMsg('Please enter a caption or upload media for your post.');
      return;
    }

    setIsSubmitting(true);

    const newPost: TournamentFeedPost = {
      id: `tf-post-${Date.now()}`,
      tournamentId: tournament.id,
      authorId: currentUser.id,
      authorName: currentUser.displayName,
      authorUsername: currentUser.username,
      authorAvatar: currentUser.photoURL,
      authorHandicap: currentUser.handicapIndex,
      authorTeamId: userTeam?.id,
      authorTeamName: userTeam?.name,
      authorTeamColor: userTeam?.color || '#059669',
      authorTeamBadgeIcon: userTeam?.badgeIcon || '⛳️',
      mediaType,
      mediaUrl,
      caption: caption.trim() || (mediaType === 'video' ? 'Action captured live on the course! 🏌️‍♂️🔥' : 'Great day out on the links! ⛳️'),
      courseName: selectedCourse,
      holeNumber: selectedHole,
      location: `${selectedCourse.split(' ')[0]} • Hole ${selectedHole}`,
      taggedPlayers,
      likesCount: 0,
      likedUserIds: [],
      hasLiked: false,
      commentsCount: 0,
      comments: [],
      createdAt: new Date().toISOString(),
    };

    // Save to real-time service and trigger broadcast
    TournamentFeedService.savePost(newPost);

    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {
      // safe fallback
    }

    if (onPostCreated) {
      onPostCreated(newPost);
    }

    setTimeout(() => {
      setIsSubmitting(false);
      onClose();
    }, 400);
  };

  const quickCaptionChips = [
    'Fairway bomb! 💣',
    'Birdie putt dropped 🔥',
    'Bunker splash 🏖️',
    'Match is all square! ⚔️',
    'Drinks on the loser 🍺',
    'Stiff to 3 feet 🎯',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">Post Course Media</h3>
              <p className="text-2xs text-slate-500">Share photo or video updates from your match</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-200/80 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. MEDIA CAPTURE & PREVIEW AREA */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-slate-900 flex items-center gap-1.5">
                {mediaType === 'video' ? <Video className="w-3.5 h-3.5 text-sky-600" /> : <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />}
                Shot Media ({mediaType === 'video' ? 'Video' : 'Photo'})
              </label>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-emerald-200"
                >
                  <UploadCloud className="w-3 h-3" /> Upload / Camera
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            </div>

            {/* Live Media Player / Photo Box */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 aspect-video flex items-center justify-center shadow-inner">
              {mediaUrl ? (
                mediaType === 'video' ? (
                  <video
                    src={mediaUrl}
                    controls
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={mediaUrl}
                    alt="Course Preview"
                    className="w-full h-full object-cover"
                  />
                )
              ) : (
                <div className="text-center p-6 text-slate-400">
                  <Camera className="w-8 h-8 mx-auto mb-2 text-slate-500" />
                  <p className="text-xs font-bold">No media selected</p>
                  <p className="text-2xs text-slate-500 mt-1">Upload a photo/video or tap a shot below</p>
                </div>
              )}

              {/* Tag indicator overlay badge */}
              <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-xs text-[10px] font-black text-white uppercase tracking-wider border border-white/10 flex items-center gap-1">
                  {mediaType === 'video' ? <Video className="w-2.5 h-2.5 text-sky-400" /> : <Camera className="w-2.5 h-2.5 text-emerald-400" />}
                  {mediaType}
                </span>

                <span className="px-2 py-0.5 rounded-md bg-emerald-900/80 backdrop-blur-xs text-[10px] font-bold text-emerald-200 border border-emerald-500/30">
                  Hole {selectedHole}
                </span>
              </div>
            </div>
          </div>

          {/* 2. CAPTION INPUT */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-900 flex items-center justify-between">
              <span>Post Caption & Trash Talk</span>
              <span className="text-2xs font-normal text-slate-400">{caption.length}/500</span>
            </label>
            <textarea
              rows={3}
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Describe the shot, boast about a clutch putt, or throw some banter at your opponents..."
              className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900 resize-none transition"
              maxLength={500}
            />
          </div>

          {/* 3. HOLE & COURSE SELECTOR */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1 mb-1">
                <Flag className="w-3.5 h-3.5 text-emerald-600" /> Hole Number
              </label>
              <select
                value={selectedHole}
                onChange={e => setSelectedHole(Number(e.target.value))}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                {Array.from({ length: 18 }, (_, i) => i + 1).map(h => (
                  <option key={h} value={h}>
                    Hole #{h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1 mb-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Course Venue
              </label>
              <select
                value={selectedCourse}
                onChange={e => setSelectedCourse(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer truncate"
              >
                {tournament.rounds.map(r => (
                  <option key={r.id} value={r.courseName}>
                    {r.courseName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. USER-TAGGING MECHANISM */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
                Tag Players in Shot ({taggedPlayers.length})
              </label>

              <button
                type="button"
                onClick={() => setIsTaggingOpen(!isTaggingOpen)}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                {isTaggingOpen ? 'Done' : '+ Add Tags'}
              </button>
            </div>

            {/* Tagged Players Pills */}
            {taggedPlayers.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {taggedPlayers.map(p => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200"
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: p.teamColor || '#059669' }}
                    />
                    <span>@{p.displayName}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleTagPlayer(p)}
                      className="hover:text-rose-600 transition ml-0.5 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Tagging Dropdown List */}
            {isTaggingOpen && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 animate-in fade-in duration-150">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={tagSearchQuery}
                    onChange={e => setTagSearchQuery(e.target.value)}
                    placeholder="Search tournament players..."
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1 divide-y divide-slate-100">
                  {tournamentPlayers
                    .filter(p => p.displayName.toLowerCase().includes(tagSearchQuery.toLowerCase()))
                    .map(player => {
                      const isSelected = taggedPlayers.some(p => p.id === player.id);
                      return (
                        <button
                          key={player.id}
                          type="button"
                          onClick={() => handleToggleTagPlayer(player)}
                          className={`w-full p-1.5 rounded-xl flex items-center justify-between text-left transition cursor-pointer ${
                            isSelected ? 'bg-emerald-50 text-emerald-950 font-bold' : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <img
                              src={player.avatar}
                              alt={player.displayName}
                              className="w-6 h-6 rounded-full object-cover border border-slate-200"
                            />
                            <div>
                              <span className="text-xs font-bold block">{player.displayName}</span>
                              <span
                                className="text-[10px] block"
                                style={{ color: player.teamColor || '#059669' }}
                              >
                                {player.teamName}
                              </span>
                            </div>
                          </div>

                          {isSelected ? (
                            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                              <Check className="w-3 h-3" />
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-bold">+ Tag</span>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-black shadow-md hover:shadow-lg transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Publishing...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-emerald-300" />
                <span>Share to Feed</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
