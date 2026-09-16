import React from 'react';
import { GolfPost, GolfCourse } from '../types/golf';
import { MOCK_COURSES } from '../data/mockData';
import { X, Trophy, Flag, Shield, Award, Sparkles, MapPin, Calendar, Users } from 'lucide-react';

interface MatchScorecardModalProps {
  post: GolfPost;
  onClose: () => void;
}

export const MatchScorecardModal: React.FC<MatchScorecardModalProps> = ({ post, onClose }) => {
  const match = post.matchData;
  if (!match) return null;

  // Generate simulated 18 hole scorecard data
  const par72Holes = [
    { num: 1, par: 4, si: 7, score: 4 },
    { num: 2, par: 5, si: 3, score: 5 },
    { num: 3, par: 4, si: 11, score: 4 },
    { num: 4, par: 3, si: 15, score: 3 },
    { num: 5, par: 4, si: 5, score: 5 },
    { num: 6, par: 5, si: 1, score: 5 },
    { num: 7, par: 3, si: 17, score: 2 }, // Birdie!
    { num: 8, par: 4, si: 9, score: 4 },
    { num: 9, par: 4, si: 13, score: 4 },
    // Out: 36
    { num: 10, par: 4, si: 8, score: 5 },
    { num: 11, par: 4, si: 4, score: 4 },
    { num: 12, par: 3, si: 16, score: 3 },
    { num: 13, par: 4, si: 6, score: 5 },
    { num: 14, par: 5, si: 2, score: 5 },
    { num: 15, par: 4, si: 12, score: 4 },
    { num: 16, par: 4, si: 10, score: 5 },
    { num: 17, par: 3, si: 18, score: 3 },
    { num: 18, par: 5, si: 14, score: 6 },
  ];

  const front9 = par72Holes.slice(0, 9);
  const back9 = par72Holes.slice(9, 18);

  const frontPar = front9.reduce((a, b) => a + b.par, 0);
  const frontScore = front9.reduce((a, b) => a + b.score, 0);
  const backPar = back9.reduce((a, b) => a + b.par, 0);
  const backScore = back9.reduce((a, b) => a + b.score, 0);

  const getScoreStyle = (score: number, par: number) => {
    const diff = score - par;
    if (diff <= -2) return 'bg-amber-400 text-slate-950 font-black shadow-xs'; // Eagle / Albatross
    if (diff === -1) return 'bg-emerald-700 text-white font-black shadow-xs'; // Birdie
    if (diff === 0) return 'bg-slate-100 text-slate-700 font-bold border border-slate-200'; // Par
    if (diff === 1) return 'bg-rose-50 text-rose-700 border border-rose-200 font-bold'; // Bogey
    return 'bg-rose-100 text-rose-800 border border-rose-300 font-black'; // Double+
  };

  return (
    <div id="scorecard-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div id="scorecard-modal-card" className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-xl text-slate-900 flex flex-col">
        {/* Header Banner */}
        <div className="relative p-5 bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 border-b border-emerald-800 flex items-start justify-between text-white rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 font-bold">
              <Flag className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-300 bg-emerald-900/80 px-2 py-0.5 rounded border border-emerald-700">
                  Official WHS Match
                </span>
                <span className="text-xs text-slate-300">18 Holes</span>
              </div>
              <h2 className="text-lg font-black text-white mt-1">{match.courseName}</h2>
              <p className="text-xs text-slate-300 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-400" /> {match.courseLocation}
              </p>
            </div>
          </div>
          <button
            id="close-scorecard-btn"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 text-slate-300 hover:text-white hover:bg-white/20 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Player Summary Pill */}
        <div className="p-5 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <img
                src={post.authorAvatar}
                alt={post.authorName}
                className="w-11 h-11 rounded-full object-cover border-2 border-emerald-600 shadow-2xs"
              />
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{post.authorName}</h4>
                <p className="text-xs text-slate-500 font-medium">
                  HCP Index {post.authorHandicap.toFixed(1)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-right">
              <div>
                <span className="text-[10px] uppercase font-black text-slate-400 block">GROSS</span>
                <span className="text-xl font-black text-slate-900">{match.grossScore}</span>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div>
                <span className="text-[10px] uppercase font-black text-emerald-800 block">NET</span>
                <span className="text-xl font-black text-emerald-700">{match.netScore}</span>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div>
                <span className="text-[10px] uppercase font-black text-slate-400 block">DIFF</span>
                <span className={`text-base font-black ${match.parDiff < 0 ? 'text-emerald-700' : 'text-slate-800'}`}>
                  {match.parDiff === 0 ? 'E' : match.parDiff > 0 ? `+${match.parDiff}` : match.parDiff}
                </span>
              </div>
            </div>
          </div>

          {/* Front 9 Hole Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-1">
              <span>FRONT 9 (OUT)</span>
              <span>Par {frontPar} • Total {frontScore} ({frontScore - frontPar >= 0 ? `+${frontScore - frontPar}` : frontScore - frontPar})</span>
            </div>
            <div className="grid grid-cols-10 gap-1 text-center text-xs">
              <div className="bg-slate-100 p-1.5 rounded-lg text-[10px] text-slate-500 font-black flex flex-col justify-center">Hole</div>
              {front9.map(h => (
                <div key={h.num} className="bg-slate-50 border border-slate-200 p-1.5 rounded-lg font-bold text-slate-800">
                  {h.num}
                </div>
              ))}

              <div className="bg-slate-100 p-1.5 rounded-lg text-[10px] text-slate-500 font-bold flex flex-col justify-center">Par</div>
              {front9.map(h => (
                <div key={`par-${h.num}`} className="bg-slate-50 p-1.5 rounded-lg text-slate-500 font-medium">
                  {h.par}
                </div>
              ))}

              <div className="bg-slate-100 p-1.5 rounded-lg text-[10px] text-emerald-800 font-black flex flex-col justify-center">Score</div>
              {front9.map(h => (
                <div key={`sc-${h.num}`} className={`p-1.5 rounded-lg flex items-center justify-center text-xs ${getScoreStyle(h.score, h.par)}`}>
                  {h.score}
                </div>
              ))}
            </div>
          </div>

          {/* Back 9 Hole Table */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-1">
              <span>BACK 9 (IN)</span>
              <span>Par {backPar} • Total {backScore} ({backScore - backPar >= 0 ? `+${backScore - backPar}` : backScore - backPar})</span>
            </div>
            <div className="grid grid-cols-10 gap-1 text-center text-xs">
              <div className="bg-slate-100 p-1.5 rounded-lg text-[10px] text-slate-500 font-black flex flex-col justify-center">Hole</div>
              {back9.map(h => (
                <div key={h.num} className="bg-slate-50 border border-slate-200 p-1.5 rounded-lg font-bold text-slate-800">
                  {h.num}
                </div>
              ))}

              <div className="bg-slate-100 p-1.5 rounded-lg text-[10px] text-slate-500 font-bold flex flex-col justify-center">Par</div>
              {back9.map(h => (
                <div key={`par-${h.num}`} className="bg-slate-50 p-1.5 rounded-lg text-slate-500 font-medium">
                  {h.par}
                </div>
              ))}

              <div className="bg-slate-100 p-1.5 rounded-lg text-[10px] text-emerald-800 font-black flex flex-col justify-center">Score</div>
              {back9.map(h => (
                <div key={`sc-${h.num}`} className={`p-1.5 rounded-lg flex items-center justify-center text-xs ${getScoreStyle(h.score, h.par)}`}>
                  {h.score}
                </div>
              ))}
            </div>
          </div>

          {/* Score Legend */}
          <div className="flex items-center justify-center gap-3 pt-2 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Eagle (-2)
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-700 inline-block" /> Birdie (-1)
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" /> Par (0)
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Bogey (+1)
            </span>
          </div>

          {/* Playing Partners in Match */}
          {match.partners && match.partners.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Users className="w-3.5 h-3.5 text-emerald-700" /> Playing Partners ({match.partners.length})
              </div>
              <div className="grid grid-cols-2 gap-2">
                {match.partners.map(p => (
                  <div key={p.userId} className="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <img src={p.photoURL} alt={p.displayName} className="w-6 h-6 rounded-full" />
                      <span className="text-xs text-slate-800 font-bold truncate">{p.displayName}</span>
                    </div>
                    <span className="text-xs font-black text-slate-900">{p.grossScore}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Handicap Impact Summary */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">WHS Handicap Differential</div>
                <div className="text-[11px] text-emerald-800 font-medium">Submitted to World Handicap System index</div>
              </div>
            </div>
            <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-emerald-700 text-white shadow-2xs">
              {match.handicapChange ? `${match.handicapChange} HCP` : '-0.4'}
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end rounded-b-3xl">
          <button
            id="scorecard-done-btn"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition cursor-pointer shadow-md shadow-emerald-200"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
