import React, { useState } from 'react';
import { Type, Plus, Sparkles, Play, Sliders, Palette, Zap, ChevronDown, ChevronRight, LayoutGrid, List } from 'lucide-react';
import { projectStore, useProjectStore } from '../../store/projectStore';
import {
  TEXT_PRESETS,
  TEXT_ANIMATIONS,
  FONT_OPTIONS,
  TextPresetDefinition,
} from '../../data/textFeaturesData';
import { Clip, Track, TextOverlayElement } from '../../types/project';
import { SamplePreviewCard } from '../common/SamplePreviewCard';

export const TextTab: React.FC = () => {
  const { project, playheadTime, selectedClipId } = useProjectStore();
  const [customText, setCustomText] = useState('YOUR TEXT HERE 🔥');
  const [activeSubTab, setActiveSubTab] = useState<'presets' | 'animations'>('presets');
  const [expandedPresetId, setExpandedPresetId] = useState<string | null>(null);

  // Find if currently selected clip is a text clip
  const selectedClip = project.timeline.tracks
    .flatMap((t) => t.clips)
    .find((c) => c.clipId === selectedClipId);
  const isTextClipSelected = !!selectedClip?.textOverlay;

  const handleAddTextPreset = (preset: TextPresetDefinition) => {
    // Find or create overlay track
    let overlayTrack = project.timeline.tracks.find(
      (t) => t.trackId.startsWith('L') || t.type === 'overlay'
    );

    if (!overlayTrack) {
      projectStore.executeOperation(
        {
          op: 'add_track',
          trackId: 'L1',
          type: 'overlay',
          name: 'Text & Overlays (L1)',
        },
        'Add Overlay Track L1'
      );
    }

    const clipId = `text-clip-${Date.now()}`;
    const textElement: TextOverlayElement = {
      id: `text-${Date.now()}`,
      text: customText.trim() || preset.sampleText,
      stylePreset: preset.id,
      animation: preset.defaultConfig.animation || 'bounce',
      fontSize: preset.defaultConfig.fontSize || 48,
      fontFamily: preset.defaultConfig.fontFamily || 'Impact, sans-serif',
      color: preset.defaultConfig.color || '#FFFFFF',
      strokeColor: preset.defaultConfig.strokeColor || '#000000',
      strokeWidth: preset.defaultConfig.strokeWidth ?? 6,
      backgroundColor: preset.defaultConfig.backgroundColor,
      backgroundPadding: preset.defaultConfig.backgroundPadding,
      backgroundRadius: preset.defaultConfig.backgroundRadius,
      shadowBlur: preset.defaultConfig.shadowBlur,
      shadowColor: preset.defaultConfig.shadowColor,
      alignment: 'center',
    };

    const newClip: Clip = {
      clipId,
      assetId: `asset-text-${Date.now()}`,
      trackId: overlayTrack?.trackId || 'L1',
      startTime: playheadTime,
      duration: 3.5,
      sourceIn: 0,
      sourceOut: 3.5,
      keyframes: [],
      textOverlay: textElement,
      transform: {
        scale: 1,
        positionX: 0,
        positionY: 0,
        rotation: 0,
        opacity: 100,
      },
    };

    projectStore.executeOperation(
      {
        op: 'add_clip',
        clip: newClip,
      },
      `Add ${preset.name} Text`
    );

    projectStore.selectClip(clipId);
  };

  const handleApplyAnimationToSelected = (animId: TextOverlayElement['animation']) => {
    if (!selectedClipId || !selectedClip?.textOverlay) return;
    projectStore.executeOperation(
      {
        op: 'update_text_overlay',
        clipId: selectedClipId,
        textOverlay: {
          animation: animId,
        },
      },
      `Change animation to ${animId}`
    );
  };

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-white uppercase tracking-wider block">
            Text & Kinetic Typography
          </span>
        </div>
        <span className="text-[10px] font-mono text-[#C9A84C] bg-[#1a1a1a] px-2 py-0.5 rounded border border-white/10">
          22 ANIMATIONS
        </span>
      </div>

      {/* Quick Input Input */}
      <div className="p-2.5 bg-[#141414] border border-white/10 rounded-lg space-y-2">
        <label className="text-[10px] text-[#808080] font-semibold uppercase tracking-wider block">
          Custom Text Content
        </label>
        <input
          type="text"
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          placeholder="Enter hook text..."
          className="w-full bg-[#0a0a0a] border border-white/10 rounded px-2.5 py-1.5 text-xs text-[#e0e0e0] focus:outline-none focus:border-[#C9A84C]"
        />
      </div>

      {/* Sub tabs */}
      <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveSubTab('presets')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeSubTab === 'presets'
                ? 'bg-[#222222] text-[#C9A84C] border border-[#C9A84C]/40'
                : 'text-[#888888] hover:text-white'
            }`}
          >
            Style Presets ({TEXT_PRESETS.length})
          </button>
          <button
            onClick={() => setActiveSubTab('animations')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeSubTab === 'animations'
                ? 'bg-[#222222] text-[#C9A84C] border border-[#C9A84C]/40'
                : 'text-[#888888] hover:text-white'
            }`}
          >
            22 Animations
          </button>
        </div>
      </div>

      {/* Presets List in CapCut Grid */}
      {activeSubTab === 'presets' && (
        <div className="grid grid-cols-2 gap-2 max-h-[420px] overflow-y-auto pr-1">
          {TEXT_PRESETS.map((p) => (
            <SamplePreviewCard
              key={p.id}
              id={p.id}
              name={p.name}
              badge={p.category}
              description={p.description}
              sampleText={customText || p.sampleText}
              type="text"
              onApply={() => handleAddTextPreset(p)}
            />
          ))}
        </div>
      )}

      {/* Animations List in CapCut Grid */}
      {activeSubTab === 'animations' && (
        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {isTextClipSelected && (
            <div className="p-2 bg-[#1a1a14] border border-[#C9A84C]/50 rounded text-[10px] text-[#C9A84C]">
              Text clip selected! Click any animation below to immediately apply to active clip.
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {TEXT_ANIMATIONS.map((anim) => (
              <SamplePreviewCard
                key={anim.id}
                id={anim.id}
                name={anim.name}
                description={anim.description}
                sampleText={customText || 'ANIMATED'}
                type="text"
                onApply={() => handleApplyAnimationToSelected(anim.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
