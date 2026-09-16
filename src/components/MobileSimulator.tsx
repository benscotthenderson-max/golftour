import React from 'react';
import { 
  Flame, 
  Flag, 
  Calendar, 
  Users, 
  User, 
  Bell, 
  MessageSquare, 
  ChevronDown, 
  Wifi, 
  Battery, 
  Signal, 
  Sparkles,
  Smartphone,
  Maximize2,
  Shield,
  Trophy
} from 'lucide-react';
import { GolferUser } from '../types/golf';
import { useTheme } from '../context/ThemeContext';

export type TabType = 'feed' | 'tournaments' | 'matches' | 'scoring' | 'players' | 'profile';

interface MobileSimulatorProps {
  currentTab: TabType;
  onChangeTab: (tab: TabType) => void;
  currentUser: GolferUser;
  pendingRequestsCount: number;
  hasActiveMatch?: boolean;
  onOpenNotifications: () => void;
  children: React.ReactNode;
}

export const MobileSimulator: React.FC<MobileSimulatorProps> = ({
  currentTab,
  onChangeTab,
  currentUser,
  pendingRequestsCount,
  hasActiveMatch,
  onOpenNotifications,
  children,
}) => {
  const { isDark } = useTheme();
  return (
    <div id="app-viewport-container" className="w-full flex-1 flex flex-col min-h-0 relative">
      {/* Scrollable Viewport Canvas */}
      <div className={`flex-1 overflow-y-auto w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-6 scroll-smooth transition-colors ${
        isDark ? 'bg-[#07090C] text-slate-100' : 'bg-[#F1F5F9] text-slate-900'
      }`}>
        <div className="max-w-5xl mx-auto w-full">
          {children}
        </div>
      </div>

      {/* Bottom Tab Navigation Bar */}
      <nav
        id="mobile-bottom-nav"
        className={`w-full backdrop-blur-xl border-t z-30 select-none transition-colors ${
          isDark 
            ? 'bg-[#0F141D]/95 border-white/[0.08] shadow-[0_-4px_20px_rgba(0,0,0,0.5)]' 
            : 'bg-white/95 border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]'
        }`}
      >
        <div className="max-w-2xl w-full mx-auto px-4 py-2 flex items-center justify-around">
          <button
            id="tab-btn-feed"
            onClick={() => onChangeTab('feed')}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition cursor-pointer ${
              currentTab === 'feed'
                ? 'text-emerald-400 font-bold scale-105'
                : isDark ? 'text-slate-400 hover:text-slate-200 font-medium' : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <Flag className={`w-5 h-5 ${currentTab === 'feed' ? 'stroke-[2.5] drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]' : ''}`} />
            <span className="text-[10px]">Feed</span>
          </button>

          <button
            id="tab-btn-tournaments"
            onClick={() => onChangeTab('tournaments')}
            className={`relative flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition cursor-pointer ${
              currentTab === 'tournaments'
                ? 'text-amber-400 font-bold scale-105'
                : isDark ? 'text-slate-400 hover:text-slate-200 font-medium' : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <div className="relative">
              <Trophy className={`w-5 h-5 ${currentTab === 'tournaments' ? 'stroke-[2.5] text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]' : ''}`} />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_6px_#f59e0b]" />
            </div>
            <span className="text-[10px]">Tourney</span>
          </button>

          <button
            id="tab-btn-matches"
            onClick={() => onChangeTab('matches')}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition cursor-pointer ${
              currentTab === 'matches'
                ? 'text-emerald-400 font-bold scale-105'
                : isDark ? 'text-slate-400 hover:text-slate-200 font-medium' : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <Calendar className={`w-5 h-5 ${currentTab === 'matches' ? 'stroke-[2.5] drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]' : ''}`} />
            <span className="text-[10px]">Matches</span>
          </button>

          {hasActiveMatch && (
            <button
              id="tab-btn-live-scoring"
              onClick={() => onChangeTab('scoring')}
              className={`relative flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition cursor-pointer ${
                currentTab === 'scoring'
                  ? 'text-emerald-400 font-bold scale-105'
                  : 'text-emerald-500 hover:text-emerald-400 font-semibold'
              }`}
            >
              <div className="relative">
                <span className="w-2 h-2 rounded-full bg-emerald-400 absolute -top-0.5 -right-0.5 animate-ping" />
                <span className="w-2 h-2 rounded-full bg-emerald-400 absolute -top-0.5 -right-0.5" />
                <Sparkles className="w-5 h-5 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              </div>
              <span className="text-[10px] text-emerald-400 font-bold">Live Round</span>
            </button>
          )}

          <button
            id="tab-btn-players"
            onClick={() => onChangeTab('players')}
            className={`relative flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition cursor-pointer ${
              currentTab === 'players'
                ? 'text-emerald-400 font-bold scale-105'
                : isDark ? 'text-slate-400 hover:text-slate-200 font-medium' : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <Users className={`w-5 h-5 ${currentTab === 'players' ? 'stroke-[2.5] drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]' : ''}`} />
            <span className="text-[10px]">Players</span>
            {pendingRequestsCount > 0 && (
              <span className="absolute top-0 right-2 w-2 h-2 rounded-full bg-rose-500" />
            )}
          </button>

          <button
            id="tab-btn-profile"
            onClick={() => onChangeTab('profile')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition cursor-pointer ${
              currentTab === 'profile'
                ? 'text-emerald-400 font-bold scale-105'
                : isDark ? 'text-slate-400 hover:text-slate-200 font-medium' : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <div className="relative">
              <img
                src={currentUser.photoURL}
                alt={currentUser.displayName}
                className={`w-5 h-5 rounded-full object-cover border ${
                  currentTab === 'profile' 
                    ? 'border-emerald-400 ring-2 ring-emerald-500/30' 
                    : isDark ? 'border-white/[0.15]' : 'border-slate-300'
                }`}
              />
            </div>
            <span className="text-[10px] font-mono tabular-nums">HCP {currentUser.handicapIndex.toFixed(1)}</span>
          </button>
        </div>
      </nav>
    </div>
  );
};
