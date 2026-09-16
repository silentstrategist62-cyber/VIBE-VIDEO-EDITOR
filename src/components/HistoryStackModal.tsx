import React, { useState } from 'react';
import {
  X,
  History,
  RotateCcw,
  RotateCw,
  Trash2,
  CheckCircle2,
  Clock,
  Layers,
  Scissors,
  Sliders,
  Move,
  Key,
  Sparkles,
  Music,
  ArrowRight,
} from 'lucide-react';
import { projectStore, useProjectStore } from '../store/projectStore';
import { OperationLog } from '../types/project';

function getOpIcon(opType: string) {
  switch (opType) {
    case 'trim_clip':
      return <Sliders className="w-3.5 h-3.5 text-blue-400" />;
    case 'split_clip':
      return <Scissors className="w-3.5 h-3.5 text-indigo-400" />;
    case 'delete_clip':
    case 'delete_track':
      return <Trash2 className="w-3.5 h-3.5 text-rose-400" />;
    case 'move_clip':
    case 'reorder_clip':
      return <Move className="w-3.5 h-3.5 text-emerald-400" />;
    case 'add_keyframe':
    case 'delete_keyframe':
      return <Key className="w-3.5 h-3.5 text-amber-400" />;
    case 'add_transition':
    case 'remove_transition':
      return <Sparkles className="w-3.5 h-3.5 text-purple-400" />;
    case 'set_volume':
    case 'set_audio_settings':
      return <Music className="w-3.5 h-3.5 text-teal-400" />;
    case 'batch_operations':
      return <Layers className="w-3.5 h-3.5 text-cyan-400" />;
    default:
      return <History className="w-3.5 h-3.5 text-slate-400" />;
  }
}

function formatRelativeTime(isoString: string): string {
  try {
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 5) return 'Just now';
    if (diff < 60) return `${diff}s ago`;
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ago`;
  } catch {
    return 'Recently';
  }
}

export const HistoryStackModal: React.FC = () => {
  const { isHistoryModalOpen, project } = useProjectStore();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  if (!isHistoryModalOpen) return null;

  const past: OperationLog[] = project.history?.past || [];
  const future: OperationLog[] = project.history?.future || [];
  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  const totalClips = project.timeline.tracks.reduce((acc, t) => acc + t.clips.length, 0);
  const duration = project.timeline.duration.toFixed(1);

  const handleClose = () => {
    setShowClearConfirm(false);
    projectStore.toggleHistoryModal(false);
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shadow-inner">
              <History className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">History Stack Manager</h2>
              </div>
              <p className="text-[11px] text-slate-400">
                Inspect timeline edits, revert to any previous state, or step forward
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Undo */}
            <button
              id="btn-modal-undo"
              onClick={() => projectStore.undo()}
              disabled={!canUndo}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border font-medium transition-colors ${
                canUndo
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 cursor-pointer'
                  : 'text-slate-600 border-slate-800/50 cursor-not-allowed opacity-50'
              }`}
              title="Undo last edit (Ctrl+Z)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Undo</span>
            </button>

            {/* Quick Redo */}
            <button
              id="btn-modal-redo"
              onClick={() => projectStore.redo()}
              disabled={!canRedo}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border font-medium transition-colors ${
                canRedo
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 cursor-pointer'
                  : 'text-slate-600 border-slate-800/50 cursor-not-allowed opacity-50'
              }`}
              title="Redo next edit (Ctrl+Shift+Z)"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Redo</span>
            </button>

            {/* Close button */}
            <button
              id="btn-modal-close-history"
              onClick={handleClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body: Vertical Time-Tree */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {past.length === 0 && future.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-300">No edits in history stack</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Any splits, trims, clip moves, keyframes, or preset assemblies you apply to the timeline will
                be recorded here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* FUTURE (Redoable) Stack */}
              {future.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold tracking-wide uppercase text-slate-500 flex items-center gap-1.5">
                      <RotateCw className="w-3 h-3 text-slate-400" />
                      Future Redoable Edits
                    </span>
                    <span className="text-[10px] text-slate-500">Click any step to redo forward</span>
                  </div>

                  <div className="space-y-1.5">
                    {/* Future array: 0 is next redo, 1 is next-next, etc. */}
                    {future.map((action, idx) => (
                      <div
                        key={action.id || `future-${idx}`}
                        onClick={() => projectStore.jumpToHistory(idx, true)}
                        className="group flex items-center justify-between p-2.5 rounded-lg border border-dashed border-slate-800 hover:border-indigo-500/50 bg-slate-900/30 hover:bg-indigo-950/20 transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded bg-slate-800/80 border border-slate-700/80 flex items-center justify-center opacity-70 group-hover:opacity-100">
                            {getOpIcon(action.op.op)}
                          </div>
                          <div>
                            <div className="text-xs font-medium text-slate-300 group-hover:text-white flex items-center gap-1.5">
                              <span>{action.description || 'Edit'}</span>
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {formatRelativeTime(action.timestamp)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium text-indigo-400">
                          <span>Redo to here</span>
                          <ArrowRight className="w-3 h-3" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ACTIVE TIMELINE STATE BANNER */}
              <div className="p-3 rounded-xl bg-gradient-to-r from-indigo-950/60 to-slate-900 border border-indigo-500/30 shadow-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/80 animate-pulse" />
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>Current Timeline State</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-900/80 text-indigo-200 border border-indigo-700">
                        Active
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Synchronized with playhead & active tracks
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Synced</span>
                </div>
              </div>

              {/* PAST (Undoable) Stack */}
              {past.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold tracking-wide uppercase text-slate-500 flex items-center gap-1.5">
                      <RotateCcw className="w-3 h-3 text-slate-400" />
                      Past Timeline Edits
                    </span>
                    <span className="text-[10px] text-slate-500">Click any step to revert backward</span>
                  </div>

                  <div className="space-y-1.5">
                    {/* Render past in reverse order (newest on top) */}
                    {[...past].reverse().map((action, revIdx) => {
                      const origIdx = past.length - 1 - revIdx;
                      const isLatest = revIdx === 0;

                      return (
                        <div
                          key={action.id || `past-${origIdx}`}
                          onClick={() => {
                            if (!isLatest) {
                              projectStore.jumpToHistory(origIdx, false);
                            }
                          }}
                          className={`group flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                            isLatest
                              ? 'border-indigo-500/30 bg-indigo-950/20 hover:bg-indigo-950/30 cursor-default'
                              : 'border-slate-800/80 hover:border-indigo-500/40 bg-slate-900/40 hover:bg-slate-900 cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded bg-slate-800 border border-slate-700 flex items-center justify-center">
                              {getOpIcon(action.op.op)}
                            </div>
                            <div>
                              <div className="text-xs font-medium text-slate-200 group-hover:text-white flex items-center gap-2">
                                <span>{action.description || 'Timeline Edit'}</span>
                                {isLatest && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                                    Latest
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {formatRelativeTime(action.timestamp)}
                              </div>
                            </div>
                          </div>

                          {!isLatest ? (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium text-indigo-400">
                              <RotateCcw className="w-3 h-3" />
                              <span>Revert to here</span>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                projectStore.undo();
                              }}
                              className="text-[11px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors cursor-pointer"
                            >
                              Undo this edit
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 flex items-center justify-between bg-slate-900/60 shrink-0 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300">
                Ctrl+Z
              </kbd>
              <span>Undo</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300">
                Ctrl+Shift+Z
              </kbd>
              <span>Redo</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {past.length > 0 && (
              <>
                {showClearConfirm ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-rose-400 text-xs">Clear all history?</span>
                    <button
                      onClick={() => {
                        projectStore.clearHistory();
                        setShowClearConfirm(false);
                      }}
                      className="px-2 py-1 text-xs rounded bg-rose-600 hover:bg-rose-500 text-white font-medium cursor-pointer"
                    >
                      Yes, clear
                    </button>
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="px-2 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className="flex items-center gap-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer text-xs"
                    title="Clear history stack"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear history</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
