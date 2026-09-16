import React, { useState } from 'react';
import { FineCategory, PlayerFineRecord, FineUnit } from '../types/golf';
import { StorageService } from '../utils/storage';
import { formatFinePenalty } from '../utils/finesEngine';
import { 
  X, 
  Beer, 
  Check, 
  Plus, 
  Trash2, 
  Sparkles, 
  PlusCircle,
  DollarSign
} from 'lucide-react';

export interface AssignablePlayer {
  userId: string;
  displayName: string;
  photoURL?: string;
  teamId?: string;
  teamName?: string;
  teamColor?: string;
  badgeIcon?: string;
}

interface FineAssignModalProps {
  holeNumber: number;
  players: AssignablePlayer[];
  tournamentId?: string;
  matchId?: string;
  roundNumber?: number;
  isOpen: boolean;
  onClose: () => void;
  onSaveFines: (fines: PlayerFineRecord[]) => void;
  onSkipFines?: () => void;
}

export const FineAssignModal: React.FC<FineAssignModalProps> = ({
  holeNumber,
  players,
  tournamentId,
  matchId,
  roundNumber,
  isOpen,
  onClose,
  onSaveFines,
  onSkipFines,
}) => {
  const [categories, setCategories] = useState<FineCategory[]>(() => 
    StorageService.getFineCategories()
  );

  // Selected player for assigning a fine
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(
    players[0]?.userId || ''
  );
  const [customNote, setCustomNote] = useState<string>('');

  // Quick inline fine creation if rules list is empty
  const [showQuickCreate, setShowQuickCreate] = useState<boolean>(false);
  const [quickFineName, setQuickFineName] = useState<string>('');
  const [quickFineAmount, setQuickFineAmount] = useState<number>(2);
  const [quickFineUnit, setQuickFineUnit] = useState<FineUnit>('$');

  // Draft fines staged for this hole before final confirmation (isolated per hole)
  const [stagedFines, setStagedFines] = useState<PlayerFineRecord[]>([]);

  // Reset staged fines and form inputs whenever modal opens or hole changes
  React.useEffect(() => {
    if (isOpen) {
      setStagedFines([]);
      setCustomNote('');
      setShowQuickCreate(false);
      setCategories(StorageService.getFineCategories());
      if (players.length > 0 && (!selectedPlayerId || !players.some(p => p.userId === selectedPlayerId))) {
        setSelectedPlayerId(players[0].userId);
      }
    }
  }, [isOpen, holeNumber, players]);

  if (!isOpen) return null;

  const activePlayer = players.find(p => p.userId === selectedPlayerId) || players[0];

  const handleStageFine = (category: FineCategory) => {
    if (!activePlayer) return;

    const newFine: PlayerFineRecord = {
      id: `fine_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      tournamentId,
      matchId,
      roundNumber,
      holeNumber,
      userId: activePlayer.userId,
      userName: activePlayer.displayName,
      userAvatar: activePlayer.photoURL,
      teamId: activePlayer.teamId,
      teamName: activePlayer.teamName,
      fineId: category.id,
      fineName: category.name,
      fineIcon: category.icon,
      amount: category.amount,
      currencySymbol: category.currencySymbol || category.unit || '$',
      unit: category.unit || category.currencySymbol || '$',
      timestamp: new Date().toISOString(),
      note: customNote.trim() || undefined,
    };

    setStagedFines(prev => [newFine, ...prev]);
    setCustomNote('');
  };

  const handleCreateAndStageQuickFine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickFineName.trim()) return;

    const newCat: FineCategory = {
      id: `fine_cat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: quickFineName.trim(),
      icon: quickFineUnit === 'Fingers' ? '🍺' : '💸',
      description: 'Custom fine rule',
      amount: Number(quickFineAmount) || 1,
      currencySymbol: quickFineUnit,
      unit: quickFineUnit,
      severity: 'standard',
    };

    StorageService.saveFineCategory(newCat);
    setCategories(StorageService.getFineCategories());
    handleStageFine(newCat);
    setQuickFineName('');
    setShowQuickCreate(false);
  };

  const handleRemoveStagedFine = (id: string) => {
    setStagedFines(prev => prev.filter(f => f.id !== id));
  };

  const handleConfirmAndProceed = () => {
    const finesToSave = [...stagedFines];
    setStagedFines([]);
    setCustomNote('');
    onSaveFines(finesToSave);
  };

  const handleSkipOrClose = () => {
    setStagedFines([]);
    setCustomNote('');
    if (onSkipFines) {
      onSkipFines();
    } else {
      onClose();
    }
  };

  // Calculate staged totals
  const stagedDollars = stagedFines
    .filter(f => !f.unit?.includes('Finger') && !f.currencySymbol?.includes('Finger'))
    .reduce((sum, f) => sum + f.amount, 0);

  const stagedFingers = stagedFines
    .filter(f => f.unit?.includes('Finger') || f.currencySymbol?.includes('Finger'))
    .reduce((sum, f) => sum + f.amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-[#0D1117] border border-white/[0.12] rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-[0_25px_70px_rgba(0,0,0,0.9)] text-white overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 bg-[#07090C] border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-black text-lg">
              🍺
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-black text-sm sm:text-base text-white">
                  Log Fines on Hole #{holeNumber}
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded">
                  Fines Mode
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Select a golfer and pick their penalty from the custom tournament fines
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSkipOrClose}
            className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white transition cursor-pointer border border-white/[0.08]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 scrollbar-thin bg-[#0D1117]">
          {/* STEP 1: SELECT GOLFER INVOLVED */}
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-slate-300 block mb-1.5 flex items-center justify-between">
              <span>1. Select Infringing Golfer:</span>
              <span className="text-[10px] text-slate-400 font-normal">Tap to switch player</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {players.map(p => {
                const isSelected = p.userId === selectedPlayerId;
                const stagedForPlayer = stagedFines.filter(f => f.userId === p.userId);

                return (
                  <button
                    key={p.userId}
                    type="button"
                    onClick={() => setSelectedPlayerId(p.userId)}
                    className={`p-2 rounded-2xl border text-left flex flex-col justify-between transition cursor-pointer relative ${
                      isSelected
                        ? 'bg-emerald-950/80 border-emerald-500 ring-2 ring-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                        : 'bg-[#131923] border-white/[0.08] hover:border-white/[0.16]'
                    }`}
                  >
                    {stagedForPlayer.length > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-slate-950 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow-md font-mono tabular-nums">
                        {stagedForPlayer.length}
                      </span>
                    )}

                    <div className="flex items-center gap-2 mb-1">
                      <img
                        src={p.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
                        alt={p.displayName}
                        className="w-7 h-7 rounded-full object-cover border border-white/[0.1] shrink-0"
                      />
                      <span className="text-xs font-black text-white truncate">
                        {p.displayName.split(' ')[0]}
                      </span>
                    </div>

                    {p.teamName && (
                      <span className="text-[9px] font-bold text-slate-400 truncate">
                        {p.badgeIcon || '⛳'} {p.teamName}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 2: TAP FINE CATEGORY TO ADD */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <span>2. Select Fine Infraction for {activePlayer?.displayName.split(' ')[0]}:</span>
              </label>
              <button
                type="button"
                onClick={() => setShowQuickCreate(prev => !prev)}
                className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                {showQuickCreate ? 'Cancel' : '+ New Fine'}
              </button>
            </div>

            {/* Quick Fine Form */}
            {showQuickCreate && (
              <form onSubmit={handleCreateAndStageQuickFine} className="p-3 mb-2.5 rounded-2xl bg-[#07090C] border border-amber-500/40 space-y-2.5 animate-in fade-in duration-150">
                <span className="text-xs font-bold text-amber-400 block">Create Custom Fine & Assign</span>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={quickFineName}
                    onChange={e => setQuickFineName(e.target.value)}
                    placeholder="Fine Name (e.g. Air Shot, Water Ball, Cart Mishap)"
                    className="w-full px-3 py-1.5 bg-[#131923] border border-white/[0.1] rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-amber-500"
                    autoFocus
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Penalty Value</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={quickFineAmount}
                        onChange={e => setQuickFineAmount(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-3 py-1.5 bg-[#131923] border border-white/[0.1] rounded-xl text-xs text-white font-mono tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Penalty Unit</label>
                      <select
                        value={quickFineUnit}
                        onChange={e => setQuickFineUnit(e.target.value as FineUnit)}
                        className="w-full px-2.5 py-1.5 bg-[#131923] border border-white/[0.1] rounded-xl text-xs text-white cursor-pointer"
                      >
                        <option value="$">$ (Dollars)</option>
                        <option value="Fingers">🍺 Fingers (Drink)</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowQuickCreate(false)}
                    className="py-1 px-3 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!quickFineName.trim()}
                    className="py-1 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs transition"
                  >
                    Save & Add Fine
                  </button>
                </div>
              </form>
            )}

            {/* List of custom fines */}
            {categories.length === 0 && !showQuickCreate ? (
              <div className="p-4 rounded-2xl bg-[#07090C] border border-dashed border-white/[0.08] text-center space-y-2">
                <p className="text-xs text-slate-400">
                  No custom fines configured yet. Create one now to assign it to {activePlayer?.displayName}!
                </p>
                <button
                  type="button"
                  onClick={() => setShowQuickCreate(true)}
                  className="py-1.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> + Create First Custom Fine
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {categories.map(cat => {
                  const penaltyDisplay = formatFinePenalty(cat.amount, cat.unit, cat.currencySymbol);

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleStageFine(cat)}
                      className="p-2.5 rounded-2xl bg-[#131923] hover:bg-[#1A2330] border border-white/[0.08] hover:border-amber-500/50 flex items-center justify-between gap-2 transition cursor-pointer text-left group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xl shrink-0 group-hover:scale-110 transition transform">
                          {cat.icon || (cat.unit === 'Fingers' ? '🍺' : '💸')}
                        </span>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-white block truncate">
                            {cat.name}
                          </span>
                          {cat.description && (
                            <span className="text-[10px] text-slate-400 line-clamp-1">
                              {cat.description}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5 pl-1">
                        <span className="text-xs font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20 font-mono tabular-nums">
                          +{penaltyDisplay}
                        </span>
                        <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                          <Plus className="w-3 h-3" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* STAGED FINES FOR HOLE SUMMARY */}
          {stagedFines.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-[#07090C] border border-amber-500/40 space-y-2">
              <div className="flex items-center justify-between text-xs font-black text-amber-400">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Staged Fines on Hole #{holeNumber} ({stagedFines.length})
                </span>
                <div className="text-white text-xs font-black flex items-center gap-2 font-mono tabular-nums">
                  {stagedDollars > 0 && <span>${stagedDollars}</span>}
                  {stagedFingers > 0 && <span>🍺 {stagedFingers} Fingers</span>}
                </div>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {stagedFines.map(fine => (
                  <div
                    key={fine.id}
                    className="p-2 rounded-xl bg-[#131923] border border-white/[0.08] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base">{fine.fineIcon || '🍺'}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 truncate">
                          <strong className="text-white font-bold">{fine.userName}</strong>
                          <span className="text-slate-400">• {fine.fineName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-black text-amber-400 font-mono tabular-nums">
                        +{formatFinePenalty(fine.amount, fine.unit, fine.currencySymbol)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveStagedFine(fine.id)}
                        className="p-1 rounded-lg text-slate-500 hover:text-red-400 transition cursor-pointer"
                        title="Remove fine"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-[#07090C] border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={handleSkipOrClose}
            className="w-full sm:w-auto py-2.5 px-4 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirmAndProceed}
            className={`w-full sm:w-auto py-2.5 px-5 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer shadow-md ${
              stagedFines.length > 0
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.35)]'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>
              {stagedFines.length > 0 
                ? `Save ${stagedFines.length} Fine(s)` 
                : 'Done'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
