import React, { useState } from 'react';
import { GolferUser, GolfPost, GameType } from '../types/golf';
import { MOCK_COURSES } from '../data/mockData';
import { X, Flag, Camera, Award, Plus, Sparkles, MapPin } from 'lucide-react';
import confetti from 'canvas-confetti';

interface NewPostModalProps {
  currentUser: GolferUser;
  onClose: () => void;
  onPostCreated: (post: GolfPost) => void;
}

export const NewPostModal: React.FC<NewPostModalProps> = ({ currentUser, onClose, onPostCreated }) => {
  const [postType, setPostType] = useState<'match_recap' | 'photo_story'>('match_recap');
  const [selectedCourseId, setSelectedCourseId] = useState<string>(MOCK_COURSES[0].id);
  const [grossScore, setGrossScore] = useState<number>(79);
  const [netScore, setNetScore] = useState<number>(68);
  const [gameType, setGameType] = useState<GameType>('stroke_play');
  const [caption, setCaption] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<string>(MOCK_COURSES[0]?.coverImage || '');

  const selectedCourse = MOCK_COURSES.find(c => c.id === selectedCourseId) || MOCK_COURSES[0];
  const parDiff = grossScore - selectedCourse.par;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newPost: GolfPost = {
      id: `post-${Date.now()}`,
      authorId: currentUser.id,
      authorName: currentUser.displayName,
      authorUsername: currentUser.username,
      authorAvatar: currentUser.photoURL,
      authorHandicap: currentUser.handicapIndex,
      authorLevel: currentUser.playtomicLevel,
      type: postType,
      caption: caption.trim() || (postType === 'match_recap' 
        ? `Just completed a round at ${selectedCourse.name}! Shot a gross ${grossScore} (Net ${netScore}).`
        : 'Great day out on the links! 🏌️‍♂️⛳️'),
      mediaUrls: selectedImage ? [selectedImage] : [],
      location: selectedCourse.name,
      likesCount: 0,
      commentsCount: 0,
      hasLiked: false,
      matchData: postType === 'match_recap' ? {
        courseName: selectedCourse.name,
        courseLocation: selectedCourse.location,
        gameType: gameType,
        grossScore: Number(grossScore),
        netScore: Number(netScore),
        parDiff: parDiff,
        stablefordPoints: 39,
        bestMoment: 'Pure fairway drives and clutch par saves!',
        handicapChange: parDiff < 10 ? -0.3 : 0.0,
        playersCount: 1,
        partners: [
          {
            userId: currentUser.id,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
            grossScore: Number(grossScore),
          }
        ]
      } : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Confetti celebration
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch {
      // fallback
    }

    onPostCreated(newPost);
    onClose();
  };

  const samplePhotos = MOCK_COURSES.map(c => c.coverImage);

  return (
    <div id="new-post-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div id="new-post-modal-card" className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl text-slate-900 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Flag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">New Golf Activity</h3>
              <p className="text-xs text-slate-500 font-medium">Share with your golf network</p>
            </div>
          </div>
          <button
            id="close-new-post-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-50 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Post Type Selector */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
            <button
              type="button"
              id="type-match-btn"
              onClick={() => setPostType('match_recap')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                postType === 'match_recap'
                  ? 'bg-emerald-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Award className="w-3.5 h-3.5" /> Match Scorecard
            </button>
            <button
              type="button"
              id="type-photo-btn"
              onClick={() => setPostType('photo_story')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                postType === 'photo_story'
                  ? 'bg-emerald-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="w-3.5 h-3.5" /> Story / Photo
            </button>
          </div>

          {/* Course Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Golf Course</label>
            <select
              id="course-select"
              value={selectedCourseId}
              onChange={e => setSelectedCourseId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {MOCK_COURSES.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} (Par {c.par} • {c.location})
                </option>
              ))}
            </select>
          </div>

          {/* Match Score Input Details */}
          {postType === 'match_recap' && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black text-slate-500 uppercase">Gross Score</label>
                  <input
                    type="number"
                    id="gross-score-input"
                    value={grossScore}
                    onChange={e => {
                      const val = parseInt(e.target.value) || 0;
                      setGrossScore(val);
                      setNetScore(Math.max(50, Math.round(val - currentUser.handicapIndex)));
                    }}
                    min={50}
                    max={150}
                    className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-base font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-500 uppercase">Net Score (HCP {currentUser.handicapIndex.toFixed(1)})</label>
                  <input
                    type="number"
                    id="net-score-input"
                    value={netScore}
                    onChange={e => setNetScore(parseInt(e.target.value) || 0)}
                    min={40}
                    max={140}
                    className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-base font-black text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200 text-slate-500 font-medium">
                <span>Score vs Par ({selectedCourse.par}):</span>
                <span className={`font-black ${parDiff <= 0 ? 'text-emerald-700' : 'text-slate-800'}`}>
                  {parDiff === 0 ? 'Even Par (E)' : parDiff > 0 ? `+${parDiff} Over Par` : `${parDiff} Under Par`}
                </span>
              </div>
            </div>
          )}

          {/* Caption */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Recap & Highlights</label>
            <textarea
              id="caption-textarea"
              rows={3}
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="How was the swing today? Any eagles, memorable putts, or match results?"
              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Photo Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Attach Course Photo</label>
            <div className="grid grid-cols-4 gap-2">
              {samplePhotos.map((url, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setSelectedImage(url)}
                  className={`relative rounded-xl overflow-hidden h-16 border-2 transition cursor-pointer ${
                    selectedImage === url ? 'border-emerald-600 ring-2 ring-emerald-500/50' : 'border-slate-200 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={url} alt="Course photo preview" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              id="submit-post-btn"
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition shadow-md shadow-emerald-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" /> Publish to Golf Network
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
