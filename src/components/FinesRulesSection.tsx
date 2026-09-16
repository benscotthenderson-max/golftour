import React, { useState, useMemo } from 'react';
import { Tournament, GolferUser, FineCategory, PlayerFineRecord, FineUnit } from '../types/golf';
import { StorageService } from '../utils/storage';
import { 
  calculateTournamentFinesTally,
  formatFinePenalty,
  PlayerFinesSummary,
  FineCategorySummary
} from '../utils/finesEngine';
import { 
  Beer, 
  Shield, 
  Sparkles, 
  Trophy, 
  DollarSign, 
  Plus, 
  Trash2, 
  Edit3, 
  Clock, 
  Check, 
  AlertCircle,
  Calendar,
  User,
  Layers,
  X,
  ExternalLink,
  ChevronRight,
  Filter,
  Flame,
  Award
} from 'lucide-react';

const PRESET_ICONS = ['🍺', '💸', '🍆', '💨', '🌊', '🚫', '⛳', '🙈', '🏖️', '📱', '🤬', '🛺', '🎱', '🎯', '🍔', '🦆'];

interface FinesRulesSectionProps {
  tournament?: Tournament | null;
  allUsers: GolferUser[];
  onToggleFinesMode?: (enabled: boolean) => void;
  onFinesUpdated?: () => void;
}

export const FinesRulesSection: React.FC<FinesRulesSectionProps> = ({
  tournament,
  allUsers,
  onToggleFinesMode,
  onFinesUpdated,
}) => {
  const [finesModeEnabled, setFinesModeEnabled] = useState<boolean>(() => {
    if (tournament?.finesModeEnabled !== undefined) {
      return tournament.finesModeEnabled;
    }
    return StorageService.getFinesMode();
  });

  const [categories, setCategories] = useState<FineCategory[]>(() => 
    StorageService.getFineCategories()
  );

  const [finesList, setFinesList] = useState<PlayerFineRecord[]>(() => {
    const fromStorage = StorageService.getFines();
    if (tournament?.id) {
      return fromStorage.filter(f => f.tournamentId === tournament.id);
    }
    return fromStorage;
  });

  // Daily / Round Filter state
  const [selectedRoundFilter, setSelectedRoundFilter] = useState<number | 'all'>('all');

  // Interactive Detail Modals
  const [selectedPlayerForDetail, setSelectedPlayerForDetail] = useState<PlayerFinesSummary | null>(null);
  const [selectedCategoryForDetail, setSelectedCategoryForDetail] = useState<FineCategorySummary | null>(null);

  // Custom Fine Creation / Editing State
  const [showFineFormModal, setShowFineFormModal] = useState<boolean>(false);
  const [editingFineId, setEditingFineId] = useState<string | null>(null);
  const [formName, setFormName] = useState<string>('');
  const [formAmount, setFormAmount] = useState<number>(2);
  const [formUnit, setFormUnit] = useState<FineUnit>('$');
  const [formIcon, setFormIcon] = useState<string>('🍺');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formSeverity, setFormSeverity] = useState<'mild' | 'standard' | 'severe'>('standard');

  // Manual Fine Logging State
  const [showManualAddModal, setShowManualAddModal] = useState<boolean>(false);
  const [manualPlayerId, setManualPlayerId] = useState<string>(allUsers[0]?.id || '');
  const [manualCategory, setManualCategory] = useState<FineCategory | null>(null);
  const [manualHole, setManualHole] = useState<number>(1);
  const [manualRound, setManualRound] = useState<number>(1);
  const [manualNote, setManualNote] = useState<string>('');

  const handleToggle = (newVal: boolean) => {
    setFinesModeEnabled(newVal);
    StorageService.setFinesMode(newVal);
    if (tournament) {
      const updatedTour = {
        ...tournament,
        finesModeEnabled: newVal,
        updatedAt: new Date().toISOString(),
      };
      StorageService.saveTournament(updatedTour);
    }
    onToggleFinesMode?.(newVal);
  };

  // Open Create Custom Fine
  const handleOpenCreateFine = () => {
    setEditingFineId(null);
    setFormName('');
    setFormAmount(2);
    setFormUnit('$');
    setFormIcon('🍺');
    setFormDescription('');
    setFormSeverity('standard');
    setShowFineFormModal(true);
  };

  // Open Edit Custom Fine
  const handleOpenEditFine = (cat: FineCategory) => {
    setEditingFineId(cat.id);
    setFormName(cat.name);
    setFormAmount(cat.amount);
    setFormUnit((cat.unit as FineUnit) || (cat.currencySymbol === 'Fingers' ? 'Fingers' : '$'));
    setFormIcon(cat.icon || '🍺');
    setFormDescription(cat.description || '');
    setFormSeverity(cat.severity || 'standard');
    setShowFineFormModal(true);
  };

  // Save Custom Fine (Create or Update)
  const handleSaveCustomFine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const newCat: FineCategory = {
      id: editingFineId || `fine_cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: formName.trim(),
      amount: Number(formAmount) || 1,
      currencySymbol: formUnit,
      unit: formUnit,
      icon: formIcon || '🍺',
      description: formDescription.trim(),
      severity: formSeverity,
    };

    StorageService.saveFineCategory(newCat);
    const updatedCategories = StorageService.getFineCategories();
    setCategories(updatedCategories);
    setShowFineFormModal(false);
  };

  const handleDeleteFineCategory = (catId: string) => {
    StorageService.deleteFineCategory(catId);
    setCategories(StorageService.getFineCategories());
  };

  // Manual Log Fine
  const handleLogManualFine = (e: React.FormEvent) => {
    e.preventDefault();
    const user = allUsers.find(u => u.id === manualPlayerId) || allUsers[0];
    if (!user) return;

    const targetCategory = manualCategory || categories[0];
    if (!targetCategory) return;

    const userTeam = tournament?.teams.find(t => t.playerIds.includes(user.id));

    const newFine: PlayerFineRecord = {
      id: `fine_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tournamentId: tournament?.id,
      roundNumber: manualRound,
      dayNumber: manualRound,
      holeNumber: manualHole,
      userId: user.id,
      userName: user.displayName,
      userAvatar: user.photoURL,
      teamId: userTeam?.id,
      teamName: userTeam?.name,
      fineId: targetCategory.id,
      fineName: targetCategory.name,
      fineIcon: targetCategory.icon,
      amount: targetCategory.amount,
      currencySymbol: targetCategory.currencySymbol || targetCategory.unit || '$',
      unit: targetCategory.unit || targetCategory.currencySymbol || '$',
      timestamp: new Date().toISOString(),
      note: manualNote.trim() || undefined,
    };

    StorageService.saveFine(newFine);
    setFinesList(prev => [newFine, ...prev]);
    setShowManualAddModal(false);
    setManualNote('');
    onFinesUpdated?.();
  };

  const handleDeleteFineRecord = (fineId: string) => {
    StorageService.deleteFine(fineId);
    setFinesList(prev => prev.filter(f => f.id !== fineId));
    if (selectedPlayerForDetail) {
      setSelectedPlayerForDetail(prev => prev ? {
        ...prev,
        finesList: prev.finesList.filter(f => f.id !== fineId),
        totalFinesCount: Math.max(0, prev.totalFinesCount - 1),
      } : null);
    }
    onFinesUpdated?.();
  };

  // Dynamic Tally calculation with selected day/round filter
  const tally = useMemo(() => {
    return calculateTournamentFinesTally(
      finesList, 
      tournament, 
      allUsers, 
      selectedRoundFilter,
      categories
    );
  }, [finesList, tournament, allUsers, selectedRoundFilter, categories]);

  return (
    <div className="space-y-4">
      {/* 1. FINES MODE TOGGLE & HEADER */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center text-xl shrink-0">
            🍺
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-900">Tournament Fines Mode</h3>
              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                finesModeEnabled 
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                {finesModeEnabled ? 'Active' : 'Disabled'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Prompts golfers after each hole to record custom penalties, air shots, and lost balls into the tournament kitty.
            </p>
          </div>
        </div>

        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={finesModeEnabled}
            onChange={e => handleToggle(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-12 h-6.5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
        </label>
      </div>

      {/* 2. INTERACTIVE TOURNAMENT FINES DASHBOARD & DAILY BREAKDOWN MEETINGS */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-slate-800 space-y-4 shadow-md">
        {/* Header & Daily Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">💰</span>
            <div>
              <h4 className="text-sm font-black uppercase tracking-wider text-amber-400">
                19th Hole Fines Analytics & Kitty
              </h4>
              <p className="text-2xs text-slate-400">
                Interactive Court Leaderboard • Click any player or fine category for detailed audit logs
              </p>
            </div>
          </div>

          {/* Daily Filter Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setSelectedRoundFilter('all')}
              className={`py-1 px-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                selectedRoundFilter === 'all'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Tournament Total</span>
            </button>

            {(tournament?.rounds?.length ? tournament.rounds.map(r => r.roundNumber) : [1, 2, 3]).map(rNum => (
              <button
                key={rNum}
                type="button"
                onClick={() => setSelectedRoundFilter(rNum)}
                className={`py-1 px-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0 ${
                  selectedRoundFilter === rNum
                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span>Day {rNum} / R{rNum}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Aggregate KPI Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-2xs text-slate-400 font-bold uppercase block">Total Infractions</span>
            <span className="text-lg sm:text-xl font-black text-white">{tally.totalFinesCount}</span>
            <span className="text-[10px] text-slate-500 block">
              {selectedRoundFilter === 'all' ? 'Across all rounds' : `In Round ${selectedRoundFilter}`}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-2xs text-slate-400 font-bold uppercase block">Cash Pot ($)</span>
            <span className="text-lg sm:text-xl font-black text-emerald-400">${tally.totalDollarsAmount.toFixed(2)}</span>
            <span className="text-[10px] text-slate-500 block">Kitty balance</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-2xs text-slate-400 font-bold uppercase block">Drinks Owed (Fingers)</span>
            <span className="text-lg sm:text-xl font-black text-amber-400">🍺 {tally.totalFingersAmount} Fingers</span>
            <span className="text-[10px] text-slate-500 block">Clubhouse beverages</span>
          </div>

          {/* Fine King Highlight */}
          <div 
            onClick={() => tally.finesKing && setSelectedPlayerForDetail(tally.finesKing)}
            className={`p-3 rounded-xl bg-slate-950/80 border transition ${
              tally.finesKing 
                ? 'border-amber-500/50 hover:border-amber-400 cursor-pointer' 
                : 'border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-2xs text-amber-400 font-bold uppercase block">👑 Fine King</span>
              {tally.finesKing && <ChevronRight className="w-3.5 h-3.5 text-amber-400" />}
            </div>
            {tally.finesKing ? (
              <div>
                <span className="text-xs sm:text-sm font-black text-white block truncate">{tally.finesKing.userName}</span>
                <span className="text-[10px] text-amber-300 block font-bold">
                  {tally.finesKing.totalFinesCount} fines • {tally.finesKing.totalDollarsOwed > 0 ? `$${tally.finesKing.totalDollarsOwed} ` : ''}
                  {tally.finesKing.totalFingersOwed > 0 ? `${tally.finesKing.totalFingersOwed} 🍺` : ''}
                </span>
              </div>
            ) : (
              <span className="text-xs text-slate-500 block mt-1">No infractions yet</span>
            )}
          </div>
        </div>

        {/* INTERACTIVE PLAYER FINES LEADERBOARD */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              Player Infractions Leaderboard (Tap golfer for full breakdown)
            </h5>
            <span className="text-2xs text-slate-400">
              {tally.playerSummaries.length} penalized golfers
            </span>
          </div>

          {tally.playerSummaries.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 text-center text-xs text-slate-400">
              No fines logged {selectedRoundFilter === 'all' ? 'in the tournament yet' : `for Day ${selectedRoundFilter}`}.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {tally.playerSummaries.map((pSummary, idx) => (
                <button
                  key={pSummary.userId}
                  type="button"
                  onClick={() => setSelectedPlayerForDetail(pSummary)}
                  className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/40 text-left flex items-center justify-between gap-2.5 transition cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-5 text-center font-black text-xs ${
                      idx === 0 ? 'text-amber-400' : (idx === 1 ? 'text-slate-300' : 'text-slate-500')
                    }`}>
                      #{idx + 1}
                    </span>
                    <img
                      src={pSummary.userAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
                      alt={pSummary.userName}
                      className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <strong className="text-xs text-white font-bold truncate group-hover:text-amber-300 transition">
                          {pSummary.userName}
                        </strong>
                        {pSummary.teamName && (
                          <span className="text-[10px] text-slate-400 truncate">
                            ({pSummary.teamName})
                          </span>
                        )}
                      </div>
                      {pSummary.topFineCategory && (
                        <span className="text-[10px] text-slate-400 block truncate">
                          Top violation: {pSummary.topFineCategory}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex items-center gap-1.5">
                    <div>
                      <span className="text-xs font-black text-amber-400 block">
                        {pSummary.totalFinesCount} Fine{pSummary.totalFinesCount === 1 ? '' : 's'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold block">
                        {pSummary.totalDollarsOwed > 0 && `$${pSummary.totalDollarsOwed}`}
                        {pSummary.totalDollarsOwed > 0 && pSummary.totalFingersOwed > 0 && ' + '}
                        {pSummary.totalFingersOwed > 0 && `${pSummary.totalFingersOwed} Fingers`}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 transition" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. CUSTOM FINE RULES CONFIGURATION & INTERACTIVE CATEGORIES */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Beer className="w-4 h-4 text-amber-600" />
              Tournament Custom Fines & Rules Catalog
            </h3>
            <p className="text-2xs text-slate-500 mt-0.5">
              Tap any fine category to see every golfer who incurred it, or create custom rules with $ or Fingers penalties.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenCreateFine}
              className="py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-black text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Create Custom Fine
            </button>
            <button
              type="button"
              onClick={() => {
                setManualRound(typeof selectedRoundFilter === 'number' ? selectedRoundFilter : 1);
                setShowManualAddModal(true);
              }}
              className="py-1.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 border border-amber-500/30 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Log Manual Fine
            </button>
          </div>
        </div>

        {/* Categories Grid (Clickable to see affected players) */}
        {categories.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-2xl mx-auto">
              🍺
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900">No Custom Fines Configured</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                The fines catalog starts completely blank. Create your first custom penalty rule with a numerical value and penalty unit ($ or Fingers).
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenCreateFine}
              className="py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" /> Create Your First Fine
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {categories.map(cat => {
              const catSummary = tally.categorySummaries.find(c => c.fineId === cat.id);
              const incurredCount = catSummary?.totalIncurredCount || 0;
              const penaltyDisplay = formatFinePenalty(cat.amount, cat.unit, cat.currencySymbol);

              return (
                <div
                  key={cat.id}
                  className="p-3 rounded-xl bg-slate-50 hover:bg-amber-50/30 border border-slate-200 hover:border-amber-400/60 flex items-start justify-between gap-2.5 transition cursor-pointer group"
                  onClick={() => catSummary && setSelectedCategoryForDetail(catSummary)}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="text-2xl shrink-0 mt-0.5 group-hover:scale-110 transition transform">
                      {cat.icon || '🍺'}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <strong className="text-slate-900 font-bold text-xs group-hover:text-amber-800 transition">
                          {cat.name}
                        </strong>
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${
                          cat.severity === 'severe'
                            ? 'bg-red-100 text-red-800'
                            : (cat.severity === 'mild' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800')
                        }`}>
                          {cat.severity || 'standard'}
                        </span>
                      </div>
                      {cat.description && (
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                          {cat.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                        <span>{incurredCount} player violation{incurredCount === 1 ? '' : 's'}</span>
                        <span>•</span>
                        <span className="text-amber-700 font-bold group-hover:underline">View who incurred →</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-right flex flex-col items-end gap-1.5">
                    <span className="text-xs font-black text-amber-700 bg-amber-100/80 border border-amber-300 px-2 py-0.5 rounded-lg inline-block">
                      +{penaltyDisplay}
                    </span>

                    {/* Edit / Delete actions */}
                    <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleOpenEditFine(cat)}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                        title="Edit Fine"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteFineCategory(cat.id)}
                        className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                        title="Delete Fine"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. RECENT FINES LOG */}
      {finesList.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Infractions Audit History ({finesList.length})
            </h4>
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 text-xs">
            {finesList.slice(0, 20).map(fine => (
              <div
                key={fine.id}
                className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between hover:border-slate-300 transition"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base">{fine.fineIcon || '🍺'}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <strong className="text-slate-900 font-bold">{fine.userName}</strong>
                      <span className="text-slate-500 text-[11px]">
                        • Hole #{fine.holeNumber}
                        {fine.roundNumber && ` (Round ${fine.roundNumber})`}
                      </span>
                      <span className="text-slate-400 text-[10px]">
                        ({fine.fineName})
                      </span>
                    </div>
                    {fine.note && (
                      <p className="text-[10px] text-slate-500 italic truncate">{fine.note}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-black text-amber-700 text-xs bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    +{formatFinePenalty(fine.amount, fine.unit, fine.currencySymbol)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteFineRecord(fine.id)}
                    className="p-1 rounded-md text-slate-400 hover:text-red-600 transition cursor-pointer"
                    title="Remove fine"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: PLAYER DETAIL BREAKDOWN MODAL */}
      {selectedPlayerForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl text-white overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img
                  src={selectedPlayerForDetail.userAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
                  alt={selectedPlayerForDetail.userName}
                  className="w-10 h-10 rounded-full object-cover border-2 border-amber-500"
                />
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    {selectedPlayerForDetail.userName} — Fines Breakdown
                  </h3>
                  <p className="text-2xs text-slate-400">
                    {selectedPlayerForDetail.teamName ? `${selectedPlayerForDetail.teamName} • ` : ''}
                    {selectedPlayerForDetail.totalFinesCount} total infractions
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlayerForDetail(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1 scrollbar-thin">
              {/* Summary Totals */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Cash Owed ($)</span>
                  <span className="text-lg font-black text-emerald-400">${selectedPlayerForDetail.totalDollarsOwed.toFixed(2)}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Drinks Owed</span>
                  <span className="text-lg font-black text-amber-400">🍺 {selectedPlayerForDetail.totalFingersOwed} Fingers</span>
                </div>
              </div>

              {/* Breakdown by Category */}
              <div className="space-y-2">
                <h5 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Infractions by Type
                </h5>
                <div className="space-y-1.5">
                  {selectedPlayerForDetail.byFineCategory.map(group => (
                    <div
                      key={group.fineId}
                      className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{group.fineIcon || '🍺'}</span>
                        <div>
                          <strong className="text-white font-bold block">{group.fineName}</strong>
                          <span className="text-[10px] text-slate-400">
                            Holes: {group.holes.map(h => `#${h}`).join(', ')}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-amber-400 font-black">
                          {group.count}x ({formatFinePenalty(group.totalAmount, group.unit)})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Individual Fine Records Log */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <h5 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Individual Violations Log
                </h5>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {selectedPlayerForDetail.finesList.map(record => (
                    <div
                      key={record.id}
                      className="p-2 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{record.fineIcon || '🍺'}</span>
                        <div>
                          <span className="text-white font-semibold block">{record.fineName}</span>
                          <span className="text-[10px] text-slate-400">
                            Hole #{record.holeNumber}
                            {record.roundNumber && ` • Round ${record.roundNumber}`}
                            {record.note && ` • "${record.note}"`}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-amber-400 font-bold">
                          +{formatFinePenalty(record.amount, record.unit, record.currencySymbol)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteFineRecord(record.id)}
                          className="p-1 rounded-md text-slate-500 hover:text-red-400 transition cursor-pointer"
                          title="Delete fine"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedPlayerForDetail(null)}
                className="py-1.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: FINE CATEGORY AUDIT MODAL (Who incurred this fine) */}
      {selectedCategoryForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl text-white overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-3xl">{selectedCategoryForDetail.fineIcon || '🍺'}</span>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    {selectedCategoryForDetail.fineName}
                  </h3>
                  <p className="text-2xs text-slate-400">
                    Standard Penalty: {formatFinePenalty(selectedCategoryForDetail.amount, selectedCategoryForDetail.unit)} • {selectedCategoryForDetail.totalIncurredCount} total player violations
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCategoryForDetail(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1 scrollbar-thin">
              <h5 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Golfers Who Incurred This Fine
              </h5>

              {selectedCategoryForDetail.affectedPlayers.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-center text-xs text-slate-400">
                  No golfers have incurred this penalty {selectedRoundFilter === 'all' ? 'yet' : `in Round ${selectedRoundFilter}`}.
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedCategoryForDetail.affectedPlayers.map(playerEntry => (
                    <div
                      key={playerEntry.userId}
                      className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={playerEntry.userAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
                          alt={playerEntry.userName}
                          className="w-8 h-8 rounded-full object-cover border border-slate-700"
                        />
                        <div>
                          <strong className="text-white font-bold block">{playerEntry.userName}</strong>
                          <span className="text-[10px] text-slate-400">
                            Holes: {playerEntry.holes.map(h => `#${h}`).join(', ')}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-amber-400 font-black block">
                          {playerEntry.count} infraction{playerEntry.count === 1 ? '' : 's'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Total: {formatFinePenalty(playerEntry.totalAmount, playerEntry.unit)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedCategoryForDetail(null)}
                className="py-1.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CUSTOM FINE CONFIGURATION MODAL (CREATE / EDIT) */}
      {showFineFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-5 text-white space-y-4 shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🛠️</span>
                <h3 className="font-black text-sm sm:text-base text-white">
                  {editingFineId ? 'Edit Custom Fine Rule' : 'Create Custom Fine Rule'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFineFormModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomFine} className="space-y-3.5 text-xs">
              {/* Fine Name */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Fine Name *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. Air Shot / Whiff, Failed Forward Tee, Phone Ringing"
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              {/* Penalty Value & Unit Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Penalty Amount *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={formAmount}
                    onChange={e => setFormAmount(Math.max(1, parseInt(e.target.value) || 1))}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Penalty Unit *
                  </label>
                  <select
                    value={formUnit}
                    onChange={e => setFormUnit(e.target.value as FineUnit)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-500 cursor-pointer"
                  >
                    <option value="$">$ (Cash / Dollars)</option>
                    <option value="Fingers">🍺 Fingers (Drink Penalty)</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Violation Description (Optional)
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="e.g. Traditional drop-pants or buying next round"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              {/* Icon Selector */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Fine Icon
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-950 border border-slate-800 rounded-xl">
                  {PRESET_ICONS.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormIcon(icon)}
                      className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center transition cursor-pointer ${
                        formIcon === icon ? 'bg-amber-500/30 border border-amber-500 ring-2 ring-amber-500/40' : 'hover:bg-slate-800'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Severity */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Infraction Severity
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['mild', 'standard', 'severe'] as const).map(sev => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setFormSeverity(sev)}
                      className={`py-1.5 rounded-xl border text-center font-bold capitalize transition cursor-pointer ${
                        formSeverity === sev
                          ? (sev === 'severe' ? 'bg-red-950 border-red-500 text-red-300' : (sev === 'mild' ? 'bg-emerald-950 border-emerald-500 text-emerald-300' : 'bg-amber-950 border-amber-500 text-amber-300'))
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowFineFormModal(false)}
                  className="py-2 px-4 rounded-xl text-slate-400 hover:text-white font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!formName.trim()}
                  className="py-2 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black transition cursor-pointer shadow-md"
                >
                  {editingFineId ? 'Update Fine' : 'Create Fine Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: MANUAL FINE LOGGING */}
      {showManualAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-5 text-white space-y-4 shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🍺</span>
                <h3 className="font-black text-sm sm:text-base text-white">
                  Log Manual Fine Infraction
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowManualAddModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {categories.length === 0 ? (
              <div className="text-center py-4 space-y-3 text-xs text-slate-400">
                <p>You must create at least one custom fine rule before logging manual infractions.</p>
                <button
                  type="button"
                  onClick={() => {
                    setShowManualAddModal(false);
                    handleOpenCreateFine();
                  }}
                  className="py-2 px-4 rounded-xl bg-amber-500 text-slate-950 font-black"
                >
                  + Create Custom Fine Rule
                </button>
              </div>
            ) : (
              <form onSubmit={handleLogManualFine} className="space-y-3.5 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Select Infringing Golfer
                  </label>
                  <select
                    value={manualPlayerId}
                    onChange={e => setManualPlayerId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white cursor-pointer"
                  >
                    {allUsers.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.displayName} (HCP {user.handicapIndex})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Fine Infraction Rule
                  </label>
                  <select
                    value={manualCategory?.id || categories[0]?.id}
                    onChange={e => {
                      const found = categories.find(c => c.id === e.target.value);
                      if (found) setManualCategory(found);
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white cursor-pointer"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon || '🍺'} {cat.name} (+{formatFinePenalty(cat.amount, cat.unit, cat.currencySymbol)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Round / Day
                    </label>
                    <select
                      value={manualRound}
                      onChange={e => setManualRound(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white cursor-pointer"
                    >
                      {[1, 2, 3, 4].map(r => (
                        <option key={r} value={r}>Round {r}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Hole Number
                    </label>
                    <select
                      value={manualHole}
                      onChange={e => setManualHole(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white cursor-pointer"
                    >
                      {Array.from({ length: 18 }, (_, i) => i + 1).map(h => (
                        <option key={h} value={h}>Hole #{h}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Optional Incident Note
                  </label>
                  <input
                    type="text"
                    value={manualNote}
                    onChange={e => setManualNote(e.target.value)}
                    placeholder="e.g. Smashed ball into water on approach"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowManualAddModal(false)}
                    className="py-2 px-4 rounded-xl text-slate-400 hover:text-white font-bold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="py-2 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black transition cursor-pointer shadow-md"
                  >
                    Log Infraction
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
