import React, { useState, useEffect } from 'react';
import { GolferUser, GolfBagItem, TeeColor, Tournament } from '../types/golf';
import { MOCK_COURSES } from '../data/mockData';
import { useTheme } from '../context/ThemeContext';
import { StorageService } from '../utils/storage';
import { 
  Award, 
  Shield, 
  TrendingDown, 
  TrendingUp, 
  MapPin, 
  Users, 
  Briefcase, 
  Edit3, 
  Check, 
  ChevronRight,
  Sparkles,
  Trophy,
  Activity,
  RotateCcw,
  UserPlus,
  LogOut,
  Sun,
  Moon,
  Palette,
  Trash2,
  AlertTriangle,
  Mail,
  CheckCircle,
  X,
  Camera,
  Upload,
  Image as ImageIcon,
  Calendar,
  ExternalLink,
  Flame
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { processProfileImageFile } from '../utils/imageUpload';
import { uploadAvatarToSupabase, isSupabaseConfigured } from '../lib/supabase';

interface GolferProfileProps {
  currentUser: GolferUser;
  allUsers?: GolferUser[];
  onUpdateUser: (updatedUser: GolferUser) => void;
  onOpenFriendsTab: () => void;
  onResetDatabase?: () => void;
  onOpenAddGolferModal?: () => void;
  onLogout?: () => void;
  onDeleteAccount?: (userId: string) => void;
  onOpenVerifyModal?: () => void;
  onNavigateToTournaments?: () => void;
}

export const GolferProfile: React.FC<GolferProfileProps> = ({
  currentUser,
  allUsers = [],
  onUpdateUser,
  onOpenFriendsTab,
  onResetDatabase,
  onOpenAddGolferModal,
  onLogout,
  onDeleteAccount,
  onOpenVerifyModal,
  onNavigateToTournaments,
}) => {
  const { theme, isDark, setTheme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [displayName, setDisplayName] = useState(currentUser.displayName);
  const [photoURL, setPhotoURL] = useState(currentUser.photoURL);
  const [handicapIndex, setHandicapIndex] = useState(currentUser.handicapIndex);
  const [homeClubName, setHomeClubName] = useState(currentUser.homeClubName);
  const [bio, setBio] = useState(currentUser.bio);
  const [preferredTees, setPreferredTees] = useState<TeeColor>(currentUser.preferredTees);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Tournament History State
  const [userTournaments, setUserTournaments] = useState<Tournament[]>([]);
  const [isLoadingTournaments, setIsLoadingTournaments] = useState(false);
  const [tournamentFilter, setTournamentFilter] = useState<'all' | 'active' | 'completed'>('all');

  const directAvatarInputRef = React.useRef<HTMLInputElement>(null);
  const drawerFileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPhotoURL(currentUser.photoURL);
    setDisplayName(currentUser.displayName);
    setHandicapIndex(currentUser.handicapIndex);
    setHomeClubName(currentUser.homeClubName);
    setBio(currentUser.bio);
    setPreferredTees(currentUser.preferredTees);
  }, [currentUser]);

  useEffect(() => {
    let isMounted = true;
    const loadTournaments = async () => {
      setIsLoadingTournaments(true);
      try {
        const list = await StorageService.getUserTournaments(currentUser.id);
        if (isMounted) {
          setUserTournaments(list);
        }
      } catch (err) {
        console.warn('Failed to load user tournaments:', err);
      } finally {
        if (isMounted) {
          setIsLoadingTournaments(false);
        }
      }
    };
    loadTournaments();
    return () => { isMounted = false; };
  }, [currentUser.id]);

  // Process image selected from device storage
  const handleDeviceImageUpload = async (file: File, autoSave = false) => {
    try {
      setIsUploadingPhoto(true);
      setPhotoError(null);

      let finalUrl = '';
      if (isSupabaseConfigured()) {
        try {
          const remoteUrl = await uploadAvatarToSupabase(file, currentUser.id);
          if (remoteUrl) {
            finalUrl = remoteUrl;
          }
        } catch (storageErr) {
          console.warn('[GolferProfile] Supabase avatar upload fallback:', storageErr);
        }
      }

      if (!finalUrl) {
        finalUrl = await processProfileImageFile(file);
      }

      setPhotoURL(finalUrl);

      if (autoSave) {
        const updated: GolferUser = {
          ...currentUser,
          photoURL: finalUrl,
          updatedAt: new Date().toISOString(),
        };
        onUpdateUser(updated);
        try {
          confetti({ particleCount: 20, spread: 40, origin: { y: 0.4 } });
        } catch {
          // ignore
        }
      }
    } catch (err: any) {
      setPhotoError(err?.message || 'Failed to process selected picture.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();

    // Map handicap index to GolfTour skill level (0.5 to 7.0 scale)
    const newGolfTourLevel = Math.max(0.5, Math.min(7.0, Number((7.0 - (handicapIndex * 0.15)).toFixed(2))));

    const updated: GolferUser = {
      ...currentUser,
      photoURL,
      displayName,
      handicapIndex: Number(handicapIndex),
      golfTourLevel: newGolfTourLevel,
      homeClubName,
      bio,
      preferredTees,
      updatedAt: new Date().toISOString(),
    };

    try {
      confetti({
        particleCount: 25,
        spread: 45,
        origin: { y: 0.5 }
      });
    } catch {
      // ignore
    }

    onUpdateUser(updated);
    setIsEditing(false);
  };

  return (
    <div id="golfer-profile-container" className={`space-y-4 pb-24 transition-colors ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
      {/* Main Profile Header Card */}
      <div className={`rounded-3xl p-6 space-y-4 transition-colors ${
        isDark 
          ? 'bg-[#131923] border border-white/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.4)]' 
          : 'bg-white border border-slate-200 shadow-xs'
      }`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <img
                src={currentUser.photoURL}
                alt={currentUser.displayName}
                className="w-18 h-18 rounded-full object-cover border-4 border-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.3)]"
              />
              <input
                ref={directAvatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleDeviceImageUpload(file, true);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => directAvatarInputRef.current?.click()}
                className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer"
                title="Upload picture from device storage"
                aria-label="Upload picture from device storage"
              >
                <Camera className="w-4 h-4 text-emerald-400" />
                <span className="text-[8px] font-bold mt-0.5">Upload</span>
              </button>
            </div>

            <div>
              <h2 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentUser.displayName}</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>@{currentUser.username}</p>
                {currentUser.emailVerified ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                    <CheckCircle className="w-3 h-3" />
                    <span>Verified</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Unverified Email</span>
                    {onOpenVerifyModal && (
                      <button
                        type="button"
                        onClick={onOpenVerifyModal}
                        className="ml-1 text-emerald-500 hover:underline cursor-pointer font-bold"
                      >
                        Verify
                      </button>
                    )}
                  </span>
                )}
              </div>
              <p className={`text-xs flex items-center gap-1 mt-1 font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                <MapPin className={`w-3.5 h-3.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                {currentUser.homeClubName || 'Garden Route'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              id="edit-profile-btn"
              onClick={() => setIsEditing(!isEditing)}
              className={`py-1.5 px-3 rounded-xl border text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                isDark 
                  ? 'border-white/[0.1] bg-[#0D1117] hover:bg-[#1A2330] text-slate-300 hover:text-white' 
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <Edit3 className={`w-3.5 h-3.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
              <span>{isEditing ? 'Close' : 'Edit'}</span>
            </button>
            {onLogout && (
              <button
                onClick={onLogout}
                className={`p-1.5 rounded-xl border transition cursor-pointer ${
                  isDark 
                    ? 'border-white/[0.1] bg-[#0D1117] hover:bg-[#1A2330] text-slate-400 hover:text-white' 
                    : 'border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-900'
                }`}
                title="Log out / Switch Account"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Edit Form Drawer */}
        {isEditing && (
          <form onSubmit={handleSaveProfile} className="p-4 bg-[#0D1117] rounded-2xl border border-white/[0.08] space-y-3.5 animate-in fade-in duration-150">
            <h4 className="text-xs font-black text-white uppercase tracking-wider">Update Golfer Profile</h4>

            {/* Profile Avatar with Device File Picker */}
            <div className="p-3.5 bg-[#131923] rounded-xl border border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-2xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Profile Picture</span>
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Upload from your local device storage.
                  </p>
                </div>
                <div className="relative">
                  <img
                    src={photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || 'Golfer')}&background=059669&color=fff`}
                    alt="Avatar preview"
                    className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500 shrink-0 shadow-md"
                  />
                  {photoURL && (
                    <button
                      type="button"
                      onClick={() => setPhotoURL('')}
                      className="absolute -top-1 -right-1 p-0.5 bg-rose-600 hover:bg-rose-500 rounded-full text-white cursor-pointer"
                      title="Remove custom photo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Drag and Drop / File Input Zone */}
              <div
                onDragOver={e => { e.preventDefault(); setIsDraggingOver(true); }}
                onDragLeave={() => setIsDraggingOver(false)}
                onDrop={e => {
                  e.preventDefault();
                  setIsDraggingOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleDeviceImageUpload(file, false);
                }}
                onClick={() => drawerFileInputRef.current?.click()}
                className={`p-3 rounded-xl border border-dashed transition flex flex-col items-center justify-center text-center cursor-pointer ${
                  isDraggingOver 
                    ? 'border-emerald-400 bg-emerald-500/10' 
                    : 'border-white/[0.14] hover:border-emerald-500/50 bg-[#0d121c]/80 hover:bg-[#0d121c]'
                }`}
              >
                <input
                  ref={drawerFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleDeviceImageUpload(file, false);
                    e.target.value = '';
                  }}
                />
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-1.5">
                  <Upload className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-200">
                  {isUploadingPhoto ? 'Processing image...' : 'Tap to select photo from device'}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  Drag & drop or browse camera roll / gallery (PNG, JPEG, WebP)
                </span>
              </div>

              {photoError && (
                <p className="text-[11px] text-rose-400 font-medium">{photoError}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-2xs font-bold text-slate-400">Full Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full mt-0.5 bg-[#131923] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-2xs font-bold text-slate-400">WHS Handicap Index</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="54"
                  value={handicapIndex}
                  onChange={e => setHandicapIndex(parseFloat(e.target.value) || 0)}
                  className="w-full mt-0.5 bg-[#131923] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs font-bold text-white font-mono tabular-nums focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-2xs font-bold text-slate-400">Home Club</label>
                <input
                  type="text"
                  value={homeClubName}
                  onChange={e => setHomeClubName(e.target.value)}
                  className="w-full mt-0.5 bg-[#131923] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-2xs font-bold text-slate-400">Preferred Tees</label>
                <select
                  value={preferredTees}
                  onChange={e => setPreferredTees(e.target.value as TeeColor)}
                  className="w-full mt-0.5 bg-[#131923] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Championship">Championship</option>
                  <option value="Back">Back</option>
                  <option value="Middle">Middle</option>
                  <option value="Forward">Forward</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-2xs font-bold text-slate-400">Bio</label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                rows={2}
                className="w-full mt-0.5 bg-[#131923] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="py-1.5 px-3 rounded-lg border border-white/[0.1] text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-1.5 px-4 rounded-lg bg-emerald-600 text-white text-xs font-bold shadow-[0_0_12px_rgba(16,185,129,0.35)] hover:bg-emerald-500"
              >
                Save Changes
              </button>
            </div>
          </form>
        )}

        {/* Bio */}
        {currentUser.bio && !isEditing && (
          <p className="text-xs text-slate-300 italic bg-[#0D1117] p-3 rounded-2xl border border-white/[0.06]">
            "{currentUser.bio}"
          </p>
        )}

        {/* WHS Handicap Metric */}
        <div className="pt-1">
          <div className="p-4 rounded-2xl bg-[#0D1117] text-white space-y-1.5 border border-white/[0.08] shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
            <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" /> WHS Handicap Index
              </span>
              <span className="text-[10px] bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded text-emerald-300 font-bold">
                {currentUser.preferredTees} Tees
              </span>
            </div>
            <div className="text-3xl font-black text-white font-mono tabular-nums">{currentUser.handicapIndex.toFixed(1)}</div>
            <p className="text-[11px] text-slate-400">Official World Handicap System Index • Home Club: {currentUser.homeClubName}</p>
          </div>
        </div>

        {/* Social Connection Stats */}
        <div className="flex items-center justify-between pt-3 border-t border-white/[0.08] text-center">
          <div onClick={onOpenFriendsTab} className="cursor-pointer hover:opacity-80 transition">
            <div className="text-base font-black text-white font-mono tabular-nums">{currentUser.friendsCount || 0}</div>
            <div className="text-[11px] text-slate-400 font-bold">Golf Friends</div>
          </div>
          <div>
            <div className="text-base font-black text-white font-mono tabular-nums">{currentUser.roundsCount || 0}</div>
            <div className="text-[11px] text-slate-400 font-bold">Rounds Recorded</div>
          </div>
          <div>
            <div className="text-base font-black text-emerald-400 font-mono tabular-nums">{currentUser.bestScore || '—'}</div>
            <div className="text-[11px] text-slate-400 font-bold">Best 18-Hole</div>
          </div>
        </div>
      </div>

      {/* Official Performance Metrics Card */}
      <div className={`rounded-3xl p-6 space-y-3 transition-colors ${
        isDark 
          ? 'bg-[#131923] border border-white/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.4)]' 
          : 'bg-white border border-slate-200 shadow-xs'
      }`}>
        <h3 className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
          isDark ? 'text-white' : 'text-slate-900'
        }`}>
          <Activity className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} /> Official Performance Metrics
        </h3>

        {currentUser.roundsCount === 0 ? (
          <div className={`p-4 rounded-2xl text-center space-y-2 border ${
            isDark ? 'bg-[#0D1117] border-white/[0.08] text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
          }`}>
            <p className="text-xs">
              No rounds recorded yet. Complete 18 holes to populate your Fairways Hit %, Greens in Regulation, and Scrambling stats.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <div className={`p-2.5 rounded-xl border ${
              isDark ? 'bg-[#0D1117] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Fairways Hit</span>
              <span className={`font-black text-sm font-mono tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {currentUser.stats?.fairwaysHitPct || 0}%
              </span>
            </div>
            <div className={`p-2.5 rounded-xl border ${
              isDark ? 'bg-[#0D1117] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Greens in Reg (GIR)</span>
              <span className={`font-black text-sm font-mono tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {currentUser.stats?.greensInRegPct || 0}%
              </span>
            </div>
            <div className={`p-2.5 rounded-xl border ${
              isDark ? 'bg-[#0D1117] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Avg Putts / Rd</span>
              <span className={`font-black text-sm font-mono tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {currentUser.stats?.avgPuttsPerRound || 0}
              </span>
            </div>
            <div className={`p-2.5 rounded-xl border ${
              isDark ? 'bg-[#0D1117] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Birdies</span>
              <span className={`font-black text-sm font-mono tabular-nums ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                {currentUser.stats?.birdiesCount || 0}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* TOURNAMENT HISTORY & RECORDS (SUPABASE INTEGRATION) */}
      <div id="tournament-history-section" className={`rounded-3xl p-5 space-y-4 transition-colors ${
        isDark 
          ? 'bg-[#131923] border border-white/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.4)]' 
          : 'bg-white border border-slate-200 shadow-xs'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
              isDark 
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.15)]' 
                : 'bg-amber-50 text-amber-600 border-amber-200'
            }`}>
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h4 className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Tournament History
              </h4>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Live and completed multi-day events linked to your golfer record
              </p>
            </div>
          </div>

          {onNavigateToTournaments && (
            <button
              type="button"
              onClick={onNavigateToTournaments}
              className={`flex items-center gap-1 text-2xs font-bold px-2.5 py-1 rounded-xl transition cursor-pointer ${
                isDark 
                  ? 'bg-white/[0.06] text-emerald-400 hover:bg-white/[0.1]' 
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <span>Tournaments Hub</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        {userTournaments.length > 0 && (
          <div className="flex items-center gap-1.5 pt-1">
            {(['all', 'active', 'completed'] as const).map(tab => {
              const count = tab === 'all' 
                ? userTournaments.length 
                : tab === 'active' 
                  ? userTournaments.filter(t => t.status === 'live' || t.status === 'upcoming').length 
                  : userTournaments.filter(t => t.status === 'completed').length;

              const isSelected = tournamentFilter === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setTournamentFilter(tab)}
                  className={`px-3 py-1 rounded-xl text-2xs font-bold capitalize transition cursor-pointer ${
                    isSelected
                      ? isDark
                        ? 'bg-emerald-500 text-slate-950 shadow-sm'
                        : 'bg-emerald-600 text-white shadow-xs'
                      : isDark
                        ? 'bg-white/[0.04] text-slate-400 hover:text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Loading State */}
        {isLoadingTournaments ? (
          <div className={`p-6 text-center rounded-2xl border ${
            isDark ? 'bg-[#0D1117] border-white/[0.06] text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
          }`}>
            <p className="text-xs">Loading tournament history from database...</p>
          </div>
        ) : userTournaments.length === 0 ? (
          <div className={`p-6 text-center rounded-2xl border space-y-2 ${
            isDark ? 'bg-[#0D1117] border-white/[0.06]' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className={`w-10 h-10 rounded-full mx-auto flex items-center justify-center ${
              isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-100 text-amber-600'
            }`}>
              <Trophy className="w-5 h-5" />
            </div>
            <p className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
              No Tournaments Linked Yet
            </p>
            <p className={`text-2xs max-w-xs mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              When you are drafted into a tournament or organize one, your team records, matchplay points, and standings will automatically sync here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {userTournaments
              .filter(t => {
                if (tournamentFilter === 'active') return t.status === 'live' || t.status === 'upcoming';
                if (tournamentFilter === 'completed') return t.status === 'completed';
                return true;
              })
              .map(tour => {
                const userTeam = tour.teams?.find(team => team.playerIds?.includes(currentUser.id));
                const isCaptain = userTeam?.captainId === currentUser.id;
                const userRanking = tour.leaderboard?.playerRankings?.find(r => r.userId === currentUser.id);
                const isLive = tour.status === 'live';
                const isCompleted = tour.status === 'completed';

                return (
                  <div
                    key={tour.id}
                    className={`p-4 rounded-2xl border transition space-y-3 ${
                      isDark 
                        ? 'bg-[#0D1117] border-white/[0.08] hover:border-white/[0.14]' 
                        : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Header: Status and Title */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            isLive
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : isCompleted
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                                : 'bg-slate-500/10 text-slate-400 border border-slate-500/30'
                          }`}>
                            {isLive ? '● Live Event' : isCompleted ? '🏆 Completed' : 'Upcoming'}
                          </span>
                          <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {tour.formatType.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </div>
                        <h5 className={`text-sm font-black mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {tour.name}
                        </h5>
                        {tour.tagline && (
                          <p className={`text-2xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {tour.tagline}
                          </p>
                        )}
                      </div>

                      {userTeam && (
                        <div className="text-right shrink-0">
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-2xs font-black text-white shadow-xs"
                            style={{ backgroundColor: userTeam.color }}
                          >
                            <span>{userTeam.badgeIcon}</span>
                            <span>{userTeam.name}</span>
                          </span>
                          {isCaptain && (
                            <span className="block text-[10px] font-bold text-amber-500 mt-0.5">
                              👑 Team Captain
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Performance & Scorecard snapshot in this tournament */}
                    <div className={`p-2.5 rounded-xl border grid grid-cols-3 gap-2 text-center ${
                      isDark ? 'bg-[#131923] border-white/[0.06]' : 'bg-white border-slate-200'
                    }`}>
                      <div>
                        <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          Points Won
                        </span>
                        <span className="text-xs font-black text-emerald-500 font-mono tabular-nums">
                          {userRanking?.pointsWon ?? 0} Pts
                        </span>
                      </div>
                      <div>
                        <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          Match Record
                        </span>
                        <span className={`text-xs font-black font-mono tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {userRanking ? `${userRanking.matchesWon}W - ${userRanking.matchesHalved}T - ${userRanking.matchesLost}L` : '0-0-0'}
                        </span>
                      </div>
                      <div>
                        <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          Team Score
                        </span>
                        <span className={`text-xs font-black font-mono tabular-nums ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          {tour.teams?.[0]?.totalPoints ?? 0} - {tour.teams?.[1]?.totalPoints ?? 0}
                        </span>
                      </div>
                    </div>

                    {/* Dates & Location */}
                    <div className={`flex items-center justify-between text-2xs pt-1 ${
                      isDark ? 'text-slate-500' : 'text-slate-400'
                    }`}>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(tour.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – {new Date(tour.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </span>
                      {tour.location && <span>{tour.location}</span>}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* DEDICATED APPEARANCE & THEME SETTINGS SECTION */}
      <div id="appearance-theme-settings" className={`rounded-3xl p-5 space-y-3.5 transition-colors ${
        isDark 
          ? 'bg-[#131923] border border-white/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.4)]' 
          : 'bg-white border border-slate-200 shadow-xs'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
              isDark 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.15)]' 
                : 'bg-emerald-50 text-emerald-600 border-emerald-200'
            }`}>
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h4 className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Appearance & Theme
              </h4>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Select your preferred interface display aesthetic
              </p>
            </div>
          </div>

          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono ${
            isDark 
              ? 'bg-white/[0.06] text-slate-300 border border-white/[0.1]' 
              : 'bg-slate-100 text-slate-700 border border-slate-200'
          }`}>
            {isDark ? 'Obsidian Dark' : 'Broadcast Light'}
          </span>
        </div>

        {/* Theme Mode Segmented Switcher */}
        <div className={`p-1.5 rounded-2xl grid grid-cols-2 gap-2 ${
          isDark ? 'bg-[#0D1117] border border-white/[0.08]' : 'bg-slate-100 border border-slate-200'
        }`}>
          {/* Dark Mode Button */}
          <button
            type="button"
            id="theme-dark-btn"
            onClick={() => setTheme('dark')}
            className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2.5 text-xs font-bold transition cursor-pointer ${
              isDark
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-[0_0_14px_rgba(16,185,129,0.35)]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Moon className="w-4 h-4 shrink-0" />
            <div className="text-left leading-tight">
              <span className="block font-black">Dark Mode</span>
              <span className={`text-[10px] block font-normal ${isDark ? 'text-emerald-100' : 'text-slate-400'}`}>
                Editorial Obsidian
              </span>
            </div>
          </button>

          {/* Light Mode Button */}
          <button
            type="button"
            id="theme-light-btn"
            onClick={() => setTheme('light')}
            className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2.5 text-xs font-bold transition cursor-pointer ${
              !isDark
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 font-black'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Sun className="w-4 h-4 text-amber-500 shrink-0" />
            <div className="text-left leading-tight">
              <span className="block font-black">Light Mode</span>
              <span className={`text-[10px] block font-normal ${!isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                Clean Broadcast
              </span>
            </div>
          </button>
        </div>

        <p className={`text-[11px] italic text-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {isDark
            ? 'Deep obsidian backgrounds (#07090C) with frosted borders and high-contrast tabular numerics.'
            : 'Clean daylight broadcast palette with crisp white cards and athletic emerald accents.'}
        </p>
      </div>

      {/* Clean Slate & Reset Controls */}
      <div className={`rounded-3xl p-5 space-y-3 transition-colors ${
        isDark 
          ? 'bg-[#131923] border border-white/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.4)]' 
          : 'bg-white border border-slate-200 shadow-xs'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <h4 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Database & Account Control</h4>
            <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Manage persistent local storage or clear all data to start completely clean.
            </p>
          </div>
          {onOpenAddGolferModal && (
            <button
              onClick={onOpenAddGolferModal}
              className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs transition flex items-center gap-1 cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.3)]"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Friend</span>
            </button>
          )}
        </div>

        <div className={`pt-2 border-t flex items-center justify-between ${isDark ? 'border-white/[0.08]' : 'border-slate-200'}`}>
          <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Zero Seeded State:</span>
          {onResetDatabase && (
            <button
              onClick={onResetDatabase}
              className={`py-1.5 px-3 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer ${
                isDark 
                  ? 'bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-500/30' 
                  : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Clean Slate</span>
            </button>
          )}
        </div>

        {/* Danger Zone: Account Deletion */}
        {onDeleteAccount && (
          <div className={`pt-3 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isDark ? 'border-white/[0.08]' : 'border-slate-200'}`}>
            <div>
              <span className={`text-xs font-bold block ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                Danger Zone: Delete Golfer Account
              </span>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Permanently purge your golfer handicap, match records, tournament registrations, and account credentials.
              </p>
            </div>
            <button
              id="delete-account-trigger-btn"
              onClick={() => {
                setDeleteConfirmText('');
                setShowDeleteModal(true);
              }}
              className={`py-1.5 px-3.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                isDark
                  ? 'bg-red-950/50 hover:bg-red-900/80 text-red-300 border border-red-500/40 shadow-xs'
                  : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-300'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
              <span>Delete Account</span>
            </button>
          </div>
        )}
      </div>

      {/* ACCOUNT DELETION CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            id="account-deletion-modal"
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-red-300 dark:border-red-900/50 shadow-2xl overflow-hidden p-6 space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 border border-red-200 dark:border-red-800/60">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Permanently Delete Account?</h3>
                  <p className="text-xs text-red-600 dark:text-red-400 font-semibold">
                    This action is irreversible and permanent.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-2xl text-xs space-y-2 text-slate-700 dark:text-slate-300">
              <p className="font-bold text-red-900 dark:text-red-300">
                You are about to permanently delete the golfer account for <span className="underline">{currentUser.displayName}</span> (@{currentUser.username}):
              </p>
              <ul className="list-disc list-inside space-y-1 text-2xs text-slate-600 dark:text-slate-400">
                <li>Your official handicap index ({currentUser.handicapIndex.toFixed(1)}) and history</li>
                <li>All your login credentials and saved preferences</li>
                <li>Your match scorecards and social feed posts</li>
                <li>Your roster slot in active Ryder Cup tournaments</li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                To confirm, please type <span className="font-mono text-red-600 dark:text-red-400 font-black">DELETE</span> below:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE"
                autoFocus
                className="w-full text-xs font-bold py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="py-2 px-4 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-account-btn"
                disabled={deleteConfirmText.trim().toUpperCase() !== 'DELETE' || isDeleting}
                onClick={() => {
                  if (onDeleteAccount) {
                    setIsDeleting(true);
                    onDeleteAccount(currentUser.id);
                  }
                }}
                className="py-2 px-4 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-red-900/30 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting Account...' : 'Permanently Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};