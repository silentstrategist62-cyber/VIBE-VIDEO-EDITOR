import React from 'react';
import { RotateCcw, RotateCw, History, Check } from 'lucide-react';
import { projectStore, useProjectStore } from '../store/projectStore';

export const HistoryToast: React.FC = () => {
  const { historyToast } = useProjectStore();

  if (!historyToast) return null;

  const isUndo = historyToast.type === 'undo';
  const isRedo = historyToast.type === 'redo';

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto select-none animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-slate-900/95 border border-slate-700/90 shadow-2xl backdrop-blur-md text-xs text-white">
        <div
          className={`w-5 h-5 rounded-full flex items-center justify-center ${
            isUndo
              ? 'bg-indigo-600/30 text-indigo-400'
              : isRedo
              ? 'bg-emerald-600/30 text-emerald-400'
              : 'bg-slate-700/50 text-slate-300'
          }`}
        >
          {isUndo ? (
            <RotateCcw className="w-3 h-3" />
          ) : isRedo ? (
            <RotateCw className="w-3 h-3" />
          ) : (
            <Check className="w-3 h-3" />
          )}
        </div>

        <span className="font-medium tracking-tight pr-1">{historyToast.message}</span>

        <button
          onClick={() => projectStore.toggleHistoryModal(true)}
          className="flex items-center gap-1 pl-2 border-l border-slate-700 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors font-medium cursor-pointer"
        >
          <History className="w-3 h-3" />
          <span>History</span>
        </button>
      </div>
    </div>
  );
};
