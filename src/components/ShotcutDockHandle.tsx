import React from 'react';
import { Bot, FolderOpen, Sliders, Film, ChevronRight, ChevronLeft, ChevronUp } from 'lucide-react';
import { projectStore, useProjectStore } from '../store/projectStore';

export const ShotcutLeftDockHandle: React.FC = () => {
  const { isChatOpen, chatPanelWidth } = useProjectStore();

  // If AI Agent is open, no collapsed left dock handle needed - Agent is flush to the left
  if (isChatOpen) return null;

  return (
    <div className="flex flex-col bg-slate-950 border-r border-slate-800/80 select-none shrink-0 py-2 gap-2 z-10">
      <button
        onClick={() => projectStore.toggleChat(true)}
        className="group flex flex-col items-center gap-1.5 px-1.5 py-3 hover:bg-slate-900 text-slate-400 hover:text-cyan-400 border-y border-r border-transparent hover:border-slate-800 rounded-r transition-colors cursor-pointer relative"
        title={`Expand AI Agent panel (${chatPanelWidth || 384}px)`}
        aria-label="Expand AI Agent panel"
      >
        <div className="relative">
          <Bot className="w-3.5 h-3.5 text-cyan-400" />
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse absolute -top-0.5 -right-0.5" />
        </div>
        <span
          className="text-[10px] font-mono tracking-wider uppercase text-slate-400 group-hover:text-cyan-300 font-semibold"
          style={{ writingMode: 'vertical-lr', textOrientation: 'mixed' }}
        >
          AI Agent
        </span>
        <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-cyan-400 mt-1" />
      </button>
    </div>
  );
};

export const ShotcutRightDockHandle: React.FC = () => {
  // When collapsed, properties are cleanly hidden behind menus (TopBar / View menu)
  return null;
};

export const ShotcutTimelineDockHandle: React.FC = () => {
  const { isTimelineCollapsed } = useProjectStore();

  if (!isTimelineCollapsed) return null;

  return (
    <div className="h-7 bg-slate-900/90 border-t border-slate-800/80 px-3 flex items-center justify-between select-none shrink-0 z-10">
      <button
        onClick={() => projectStore.toggleTimeline(false)}
        className="flex items-center gap-2 text-xs text-slate-300 hover:text-emerald-400 font-semibold tracking-wide transition-colors cursor-pointer"
        title="Expand Multi-Track Timeline (Shotcut Dock)"
      >
        <Film className="w-3.5 h-3.5 text-emerald-400" />
        <span className="uppercase text-[11px] font-bold">Timeline (Collapsed)</span>
        <span className="text-[10px] text-slate-500 font-normal">Click to expand track editor</span>
      </button>

      <button
        onClick={() => projectStore.toggleTimeline(false)}
        className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
        title="Expand Timeline"
      >
        <ChevronUp className="w-4 h-4 text-emerald-400" />
      </button>
    </div>
  );
};
