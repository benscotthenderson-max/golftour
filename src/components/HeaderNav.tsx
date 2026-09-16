import React from 'react';
import { Flag, Smartphone, Layers, Columns, Sparkles, Shield, User, Sun, Moon, Trophy } from 'lucide-react';
import { GolferUser } from '../types/golf';
import { useTheme } from '../context/ThemeContext';

export type ViewMode = 'app' | 'split' | 'mobile_only' | 'architecture_only';

interface HeaderNavProps {
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  currentUser: GolferUser;
  onOpenNewPost: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  viewMode,
  onChangeViewMode,
  currentUser,
  onOpenNewPost,
}) => {
  const { theme, setTheme, isDark } = useTheme();
  const isAppView = viewMode !== 'architecture_only';

  return (
    <header className={`sticky top-0 z-40 backdrop-blur-xl border-b px-4 lg:px-8 py-3 transition-colors ${
      isDark 
        ? 'bg-[#0D1117]/90 border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.6)]' 
        : 'bg-white/95 border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.04)]'
    }`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand & Tagline */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-950/80 border border-emerald-500/30 p-0.5 shadow-[0_0_16px_rgba(16,185,129,0.15)] flex items-center justify-center text-emerald-400">
            <Flag className="w-5 h-5 fill-emerald-400/20 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-base lg:text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Golf<span className="text-emerald-500 font-extrabold">Tour</span>
              </h1>
              <span className={`text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full border ${
                isDark 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' 
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                Tournaments & Matches
              </span>
            </div>
            <p className={`text-xs font-medium hidden sm:block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Knysna • Simola • Plett Championship Matchplay
            </p>
          </div>
        </div>

        {/* View Mode Controls & Quick Theme Toggle */}
        <div className="flex items-center gap-2">
          {/* Quick theme icon toggle in header */}
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
            className={`p-2 rounded-xl border transition cursor-pointer flex items-center justify-center ${
              isDark 
                ? 'bg-[#131923] border-white/[0.08] text-slate-300 hover:text-white hover:bg-[#1C2430]' 
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          <div className={`flex items-center p-1 rounded-xl text-xs border ${
            isDark ? 'bg-[#131923] border-white/[0.08]' : 'bg-slate-100 border-slate-200 shadow-inner'
          }`}>
            <button
              onClick={() => onChangeViewMode('app')}
              className={`py-1.5 px-3 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                isAppView
                  ? 'bg-emerald-600 text-white shadow-[0_0_14px_rgba(16,185,129,0.35)]'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Full Application (Responsive 100vw/100vh)"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Tournament App</span>
            </button>

            <button
              onClick={() => onChangeViewMode('architecture_only')}
              className={`py-1.5 px-3 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'architecture_only'
                  ? 'bg-emerald-600 text-white shadow-[0_0_14px_rgba(16,185,129,0.35)]'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Architecture, Schemas & Security Rules"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Architecture</span>
            </button>
          </div>

          {/* Quick Post Button */}
          <button
            onClick={onOpenNewPost}
            className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs transition shadow-[0_0_18px_rgba(16,185,129,0.3)] flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" /> Post Round
          </button>
        </div>
      </div>
    </header>
  );
};
