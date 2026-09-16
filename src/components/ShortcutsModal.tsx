import React from 'react';
import { X, Keyboard, Command, Scissors, Play, Navigation, Sliders } from 'lucide-react';
import { projectStore, useProjectStore } from '../store/projectStore';
import { KEYBOARD_SHORTCUTS_LIST } from '../hooks/useGlobalKeyboardShortcuts';

export const ShortcutsModal: React.FC = () => {
  const { isShortcutsOpen } = useProjectStore();

  if (!isShortcutsOpen) return null;

  const categories: Array<{
    name: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  }> = [
    { name: 'Playback', icon: Play, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
    { name: 'Navigation', icon: Navigation, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    { name: 'Editing', icon: Scissors, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    { name: 'Timeline', icon: Sliders, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none"
      onClick={() => projectStore.toggleShortcuts(false)}
    >
      <div
        className="w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Keyboard Shortcuts</span>
                <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  NLE Standard
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Industry-standard shortcuts for rapid non-linear editing and frame scrubbing
              </p>
            </div>
          </div>

          <button
            onClick={() => projectStore.toggleShortcuts(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content categorized */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {categories.map((cat) => {
            const items = KEYBOARD_SHORTCUTS_LIST.filter((s) => s.category === cat.name);
            const Icon = cat.icon;

            return (
              <div key={cat.name} className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <div className={`p-1 rounded border ${cat.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span>{cat.name}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {items.map((shortcut) => (
                    <div
                      key={shortcut.key}
                      className="p-2.5 bg-slate-900/80 border border-slate-800/90 rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <span className="text-slate-300 text-[11px]">{shortcut.label}</span>
                      <kbd className="px-2 py-1 bg-slate-950 border border-slate-700 text-indigo-300 rounded font-mono text-[11px] font-semibold whitespace-nowrap shadow-sm">
                        {shortcut.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/40 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Press <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-mono">?</kbd> anytime to toggle this helper</span>
          <button
            onClick={() => projectStore.toggleShortcuts(false)}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
