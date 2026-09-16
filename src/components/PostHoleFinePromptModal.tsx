import React from 'react';
import { Sparkles, Beer, ArrowRight, X } from 'lucide-react';

interface PostHoleFinePromptModalProps {
  holeNumber: number;
  isOpen: boolean;
  onYes: () => void;
  onNo: () => void;
}

export const PostHoleFinePromptModal: React.FC<PostHoleFinePromptModalProps> = ({
  holeNumber,
  isOpen,
  onYes,
  onNo,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-5 shadow-2xl text-white space-y-4 animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-3xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-3xl shadow-inner">
            🍺
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full inline-block mb-1">
              Fines Mode Active
            </span>
            <h3 className="text-lg font-black text-white">
              Any Fines on Hole #{holeNumber}?
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Did anyone hit the drink, whiff a tee shot, 3-putt, or miss past the forward tees?
            </p>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={onYes}
            className="w-full py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>🍺 Yes, Log Fines for Hole #{holeNumber}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onNo}
            className="w-full py-2.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition flex items-center justify-center gap-1 cursor-pointer border border-slate-700"
          >
            <span>No Fines (Proceed to Hole #{holeNumber < 18 ? holeNumber + 1 : 'Summary'})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
