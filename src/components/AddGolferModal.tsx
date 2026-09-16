import React, { useState } from 'react';
import { GolferUser, TeeColor } from '../types/golf';
import { MOCK_COURSES } from '../data/mockData';
import { generateInitialsAvatar } from '../services/authService';
import { 
  UserPlus, 
  X, 
  ShieldCheck, 
  Check, 
  Sparkles,
  MapPin,
  Share2,
  Copy
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AddGolferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddGolfer: (newGolfer: GolferUser, asFriend?: boolean) => void;
}

const MONOGRAM_PALETTES = [
  { id: 'emerald', bg: '#059669' },
  { id: 'teal', bg: '#0d9488' },
  { id: 'sky', bg: '#0284c7' },
  { id: 'amber', bg: '#d97706' },
  { id: 'purple', bg: '#7c3aed' },
  { id: 'slate', bg: '#475569' },
];

export const AddGolferModal: React.FC<AddGolferModalProps> = ({
  isOpen,
  onClose,
  onAddGolfer,
}) => {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [handicapIndex, setHandicapIndex] = useState<number>(10.0);
  const [homeClubId, setHomeClubId] = useState<string>(MOCK_COURSES[0]?.id || 'course-simola-estate');
  const [preferredTees, setPreferredTees] = useState<TeeColor>('White');
  const [selectedPalette, setSelectedPalette] = useState('emerald');
  const [bio, setBio] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const selectedClub = MOCK_COURSES.find(c => c.id === homeClubId) || MOCK_COURSES[0];
  const computedLevel = Math.max(0.5, Math.min(7.0, Number((7.0 - (handicapIndex * 0.15)).toFixed(2))));

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    const cleanUsername = ((username || '').trim() || (displayName || '').toLowerCase().replace(/\s+/g, '_')).replace(/^@/, '');
    const avatarUrl = generateInitialsAvatar(displayName.trim(), selectedPalette);

    const newGolfer: GolferUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      displayName: displayName.trim(),
      username: cleanUsername,
      email: `${cleanUsername}@golftour.app`,
      photoURL: avatarUrl,
      handicapIndex: Number(handicapIndex),
      golfTourLevel: computedLevel,
      homeClubId: selectedClub.id,
      homeClubName: selectedClub.name,
      city: selectedClub.city || 'Garden Route',
      country: selectedClub.country || 'South Africa',
      bio: bio.trim(),
      preferredTees,
      isPublic: true,
      isOnline: true,
      friendsCount: 1,
      followersCount: 0,
      followingCount: 0,
      roundsCount: 0,
      bestScore: 0,
      stats: {
        fairwaysHitPct: 0,
        greensInRegPct: 0,
        avgPuttsPerRound: 0,
        scramblingPct: 0,
        holesInOne: 0,
        eaglesCount: 0,
        birdiesCount: 0,
      },
      bag: [],
      handicapHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      confetti({
        particleCount: 30,
        spread: 50,
        origin: { y: 0.6 }
      });
    } catch {
      // ignore
    }

    onAddGolfer(newGolfer, true);
    onClose();
  };

  const handleCopyInviteLink = () => {
    try {
      navigator.clipboard?.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 text-slate-900 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">Add Playing Partner</h3>
              <p className="text-xs text-slate-500">Add a friend to your network for 4-balls & Ryder Cup</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Invite Link Banner */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-between gap-2">
          <div className="text-xs">
            <span className="font-bold text-slate-900 block">Invite via Share Link</span>
            <span className="text-slate-500 text-[11px]">Send an invite link to your golfing buddy</span>
          </div>
          <button
            type="button"
            onClick={handleCopyInviteLink}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:text-emerald-700 hover:border-emerald-300 transition shadow-2xs cursor-pointer"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Friend's Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Liam O'Connor"
                value={displayName}
                onChange={e => {
                  setDisplayName(e.target.value);
                  if (!username) {
                    setUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'));
                  }
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Username *</label>
              <input
                type="text"
                required
                placeholder="liam_links"
                value={username}
                onChange={e => setUsername(e.target.value.replace(/^@/, ''))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Handicap Slider */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> WHS Handicap Index
              </span>
              <span className="text-sm font-black text-emerald-700">{handicapIndex.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="36"
              step="0.1"
              value={handicapIndex}
              onChange={e => setHandicapIndex(parseFloat(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Home Club</label>
              <select
                value={homeClubId}
                onChange={e => setHomeClubId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {MOCK_COURSES.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Tee Box</label>
              <select
                value={preferredTees}
                onChange={e => setPreferredTees(e.target.value as TeeColor)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Championship">Championship</option>
                <option value="Back">Back</option>
                <option value="Middle">Middle</option>
                <option value="Forward">Forward</option>
              </select>
            </div>
          </div>

          {/* Monogram Palette Selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">Monogram Color Palette</label>
            <div className="flex items-center gap-2">
              {MONOGRAM_PALETTES.map((pal) => (
                <button
                  key={pal.id}
                  type="button"
                  onClick={() => setSelectedPalette(pal.id)}
                  style={{ backgroundColor: pal.bg }}
                  className={`w-7 h-7 rounded-full transition cursor-pointer shrink-0 ${
                    selectedPalette === pal.id ? 'ring-2 ring-slate-900 ring-offset-2 scale-110' : 'opacity-70 hover:opacity-100'
                  }`}
                  title={pal.id}
                />
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-md shadow-emerald-200 flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add to Friends & Roster</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
