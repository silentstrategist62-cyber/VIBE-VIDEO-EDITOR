import React, { useState } from 'react';
import { Search, Shuffle, Trash2, Check, Sparkles, ChevronDown, ChevronRight, LayoutGrid, List } from 'lucide-react';
import { projectStore, useProjectStore } from '../../store/projectStore';
import { TRANSITIONS_55, TRANSITION_CATEGORIES } from '../../data/transitions55';
import { TransitionType } from '../../types/project';
import { SamplePreviewCard } from '../common/SamplePreviewCard';

export const TransitionsTab: React.FC = () => {
  const { project, selectedClipId, playheadTime } = useProjectStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTransitionId, setExpandedTransitionId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Target clip
  let targetClipId = selectedClipId;
  if (!targetClipId) {
    const vTrack = project.timeline.tracks.find((t) => t.type === 'video');
    const found = vTrack?.clips.find(
      (c) => playheadTime >= c.startTime && playheadTime <= c.startTime + c.duration
    );
    if (found) targetClipId = found.clipId;
    else if (vTrack?.clips[0]) targetClipId = vTrack.clips[0].clipId;
  }

  const activeClip = project.timeline.tracks
    .flatMap((t) => t.clips)
    .find((c) => c.clipId === targetClipId);

  const filteredTransitions = TRANSITIONS_55.filter((t) => {
    const matchesCat = selectedCategory === 'all' || t.category === selectedCategory;
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleApplyToClip = (type: TransitionType) => {
    if (!targetClipId) return;
    projectStore.executeOperation(
      {
        op: 'add_transition',
        clipId: targetClipId,
        position: 'in',
        type,
        duration: 0.4,
      },
      `Apply ${type} transition`
    );
  };

  const handleApplyToAllCuts = (type: TransitionType) => {
    const vTrack = project.timeline.tracks.find((t) => t.type === 'video');
    if (!vTrack) return;
    const ops = vTrack.clips.slice(1).map((clip) => ({
      op: 'add_transition' as const,
      clipId: clip.clipId,
      position: 'in' as const,
      type,
      duration: 0.4,
    }));
    if (ops.length > 0) {
      projectStore.executeOperation(
        {
          op: 'batch_operations',
          operations: ops,
          description: `Apply ${type} to all cuts`,
        },
        `Apply ${type} transition to all cuts`
      );
    }
  };

  const handleClearAllTransitions = () => {
    const vTrack = project.timeline.tracks.find((t) => t.type === 'video');
    if (!vTrack) return;
    const ops = vTrack.clips
      .filter((c) => c.transitionIn || c.transitionOut)
      .map((clip) => ({
        op: 'remove_transition' as const,
        clipId: clip.clipId,
        position: 'in' as const,
      }));
    if (ops.length > 0) {
      projectStore.executeOperation(
        {
          op: 'batch_operations',
          operations: ops,
          description: 'Remove all transitions',
        },
        'Remove all transitions'
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-white uppercase tracking-wider block">
            55 Transitions
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-[#181818] p-0.5 rounded border border-white/10">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded transition-colors ${
                viewMode === 'grid' ? 'bg-[#C9A84C] text-black font-bold' : 'text-[#808080] hover:text-white'
              }`}
              title="CapCut Video Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1 rounded transition-colors ${
                viewMode === 'list' ? 'bg-[#C9A84C] text-black font-bold' : 'text-[#808080] hover:text-white'
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
          <span className="text-[10px] font-mono text-[#C9A84C] bg-[#1a1a1a] px-2 py-0.5 rounded border border-white/10">
            55 TOTAL
          </span>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#808080]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search all 55 transitions..."
          className="w-full bg-[#141414] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#e0e0e0] placeholder-[#606060] focus:outline-none focus:border-[#C9A84C]/60"
        />
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
        {TRANSITION_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-2.5 py-1 rounded-md text-[10px] font-medium whitespace-nowrap transition-colors cursor-pointer border ${
              selectedCategory === cat.id
                ? 'bg-[#222222] text-[#C9A84C] border-[#C9A84C]/40'
                : 'bg-[#141414] text-[#888888] border-white/5 hover:text-white hover:bg-[#1a1a1a]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* CapCut Grid View OR List View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 gap-2 max-h-[440px] overflow-y-auto pr-1">
          {filteredTransitions.map((t) => {
            const isCurrentActive = activeClip?.transitionIn?.type === t.id;

            return (
              <SamplePreviewCard
                key={t.id}
                id={t.id}
                name={t.name}
                description={t.description}
                type="transition"
                isApplied={isCurrentActive}
                onApply={() => handleApplyToClip(t.id as TransitionType)}
              />
            );
          })}
        </div>
      ) : (
        /* Transitions List */
        <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
          {filteredTransitions.map((t) => {
            const isCurrentActive = activeClip?.transitionIn?.type === t.id;
            const isExpanded = expandedTransitionId === t.id;

            return (
              <div
                key={t.id}
                className={`bg-[#141414] border rounded-lg transition-all overflow-hidden ${
                  isCurrentActive
                    ? 'border-[#C9A84C] bg-[#1a1a14]'
                    : isExpanded
                    ? 'border-white/30 bg-[#181818]'
                    : 'border-white/10 hover:border-[#C9A84C]/40'
                }`}
              >
                <button
                  onClick={() => setExpandedTransitionId(isExpanded ? null : t.id)}
                  className="w-full p-2.5 flex items-center justify-between text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#e8e8e8] group-hover:text-[#C9A84C] transition-colors">
                      {t.name}
                    </span>
                    {isCurrentActive && (
                      <span className="flex items-center gap-1 text-[9px] font-bold text-[#C9A84C]">
                        <Check className="w-3 h-3" /> Active
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-[#C9A84C]" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-[#808080] group-hover:text-[#C9A84C]" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-2.5 pb-2.5 pt-1 border-t border-white/5 space-y-2">
                    <p className="text-[10px] text-[#a0a0a0] leading-relaxed">{t.description}</p>

                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        onClick={() => handleApplyToClip(t.id as TransitionType)}
                        title="Apply to active clip"
                        className="flex-1 py-1 px-1.5 bg-[#1f1f1f] hover:bg-[#2a2a2a] text-[#dedede] hover:text-white border border-white/10 hover:border-[#C9A84C]/50 rounded text-[10px] font-medium transition-colors cursor-pointer text-center"
                      >
                        Active Clip
                      </button>
                      <button
                        onClick={() => handleApplyToAllCuts(t.id as TransitionType)}
                        title="Apply to all timeline cuts"
                        className="flex-1 py-1 px-1.5 bg-[#1f1f1f] hover:bg-[#2a2a2a] text-[#dedede] hover:text-[#C9A84C] border border-white/10 hover:border-[#C9A84C]/50 rounded text-[10px] font-medium transition-colors cursor-pointer text-center"
                      >
                        All Cuts
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Remove transitions button */}
      <button
        onClick={handleClearAllTransitions}
        className="w-full py-1.5 bg-[#181818] hover:bg-[#222222] text-[#888888] hover:text-[#ef4444] border border-white/10 hover:border-red-900/40 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span>Remove All Transitions</span>
      </button>
    </div>
  );
};
