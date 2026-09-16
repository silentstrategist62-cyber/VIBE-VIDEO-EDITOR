import React, { useState } from 'react';
import { Sliders, Sparkles, Check, Trash2, Zap, Eye, RotateCcw, ChevronDown, ChevronRight, LayoutGrid, List } from 'lucide-react';
import { projectStore, useProjectStore } from '../../store/projectStore';
import { VISUAL_EFFECTS, EFFECT_CATEGORIES } from '../../data/effectsData';
import { ClipEffect } from '../../types/project';
import { SamplePreviewCard } from '../common/SamplePreviewCard';

export const EffectsTab: React.FC = () => {
  const { project, selectedClipId, playheadTime } = useProjectStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedEffectId, setExpandedEffectId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isColorAdjustExpanded, setIsColorAdjustExpanded] = useState<boolean>(false);

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

  const activeEffects: ClipEffect[] = activeClip?.effects || [];

  const handleToggleEffect = (effId: string, defaultIntensity: number) => {
    if (!targetClipId) return;
    const existing = activeEffects.find((e) => e.type === effId);
    let updated: ClipEffect[];

    if (existing) {
      // Toggle enabled or remove
      if (existing.enabled) {
        updated = activeEffects.filter((e) => e.type !== effId);
      } else {
        updated = activeEffects.map((e) => (e.type === effId ? { ...e, enabled: true } : e));
      }
    } else {
      updated = [
        ...activeEffects,
        {
          id: `eff-${Date.now()}-${effId}`,
          type: effId,
          enabled: true,
          intensity: defaultIntensity,
        },
      ];
    }

    projectStore.executeOperation(
      {
        op: 'set_effects',
        clipId: targetClipId,
        effects: updated,
      },
      `Toggle ${effId} effect`
    );
  };

  const handleIntensityChange = (effId: string, intensity: number) => {
    if (!targetClipId) return;
    const updated = activeEffects.map((e) => (e.type === effId ? { ...e, intensity } : e));
    projectStore.executeOperation(
      {
        op: 'set_effects',
        clipId: targetClipId,
        effects: updated,
      },
      `Adjust ${effId} intensity`
    );
  };

  const currentAdjust = activeClip?.adjust || {
    exposure: 0,
    brightness: 0,
    contrast: 0,
    saturation: 0,
    temperature: 0,
    vignette: 0,
  };

  const handleAdjustChange = (key: keyof typeof currentAdjust, value: number) => {
    if (!targetClipId) return;
    const nextAdjust = {
      ...currentAdjust,
      [key]: value,
    };
    projectStore.executeOperation(
      {
        op: 'set_adjust',
        clipId: targetClipId,
        adjust: nextAdjust,
      },
      `Set ${key} to ${value}`
    );
  };

  const handleResetAdjust = () => {
    if (!targetClipId) return;
    projectStore.executeOperation(
      {
        op: 'set_adjust',
        clipId: targetClipId,
        adjust: {
          exposure: 0,
          brightness: 0,
          contrast: 0,
          saturation: 0,
          temperature: 0,
          vignette: 0,
        },
      },
      'Reset color adjustments'
    );
  };

  const handleResetEffects = () => {
    if (!targetClipId) return;
    projectStore.executeOperation(
      {
        op: 'set_effects',
        clipId: targetClipId,
        effects: [],
      },
      'Reset all clip effects'
    );
  };

  const filteredEffects = VISUAL_EFFECTS.filter(
    (e) => selectedCategory === 'all' || e.category === selectedCategory
  );

  return (
    <div className="space-y-4">
      {/* Exposure & Color Adjustments Section (Collapsible Accordion) */}
      <div className="bg-[#141414] border border-white/10 rounded-lg overflow-hidden transition-all">
        <div
          onClick={() => setIsColorAdjustExpanded(!isColorAdjustExpanded)}
          className="p-3 flex items-center justify-between cursor-pointer hover:bg-[#1a1a1a] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-[#C9A84C]" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Color & Exposure
            </span>
            {(currentAdjust.exposure !== 0 || currentAdjust.brightness !== 0 || currentAdjust.contrast !== 0 || currentAdjust.saturation !== 0) && (
              <span className="px-1.5 py-0.2 text-[8px] font-bold bg-[#C9A84C] text-black rounded font-mono">
                Active
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleResetAdjust();
              }}
              className="flex items-center gap-1 text-[10px] text-[#808080] hover:text-white px-2 py-0.5 rounded bg-[#1f1f1f] border border-white/10 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Reset</span>
            </button>
            {isColorAdjustExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-[#C9A84C]" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-[#808080]" />
            )}
          </div>
        </div>

        {isColorAdjustExpanded && (
          <div className="p-3 pt-1 border-t border-white/5 space-y-3 bg-[#0f0f0f]">
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {/* Exposure Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-[#a0a0a0]">
                  <span>Exposure</span>
                  <span className="font-mono text-[#C9A84C]">
                    {currentAdjust.exposure > 0 ? `+${currentAdjust.exposure}` : currentAdjust.exposure}
                  </span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={currentAdjust.exposure}
                  onChange={(e) => handleAdjustChange('exposure', parseInt(e.target.value))}
                  className="w-full h-1 accent-[#C9A84C] bg-[#222222] rounded cursor-pointer"
                />
              </div>

              {/* Brightness Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-[#a0a0a0]">
                  <span>Brightness</span>
                  <span className="font-mono text-[#C9A84C]">
                    {currentAdjust.brightness > 0 ? `+${currentAdjust.brightness}` : currentAdjust.brightness}
                  </span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={currentAdjust.brightness}
                  onChange={(e) => handleAdjustChange('brightness', parseInt(e.target.value))}
                  className="w-full h-1 accent-[#C9A84C] bg-[#222222] rounded cursor-pointer"
                />
              </div>

              {/* Contrast Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-[#a0a0a0]">
                  <span>Contrast</span>
                  <span className="font-mono text-[#C9A84C]">
                    {currentAdjust.contrast > 0 ? `+${currentAdjust.contrast}` : currentAdjust.contrast}
                  </span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={currentAdjust.contrast}
                  onChange={(e) => handleAdjustChange('contrast', parseInt(e.target.value))}
                  className="w-full h-1 accent-[#C9A84C] bg-[#222222] rounded cursor-pointer"
                />
              </div>

              {/* Saturation Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-[#a0a0a0]">
                  <span>Saturation</span>
                  <span className="font-mono text-[#C9A84C]">
                    {currentAdjust.saturation > 0 ? `+${currentAdjust.saturation}` : currentAdjust.saturation}
                  </span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={currentAdjust.saturation}
                  onChange={(e) => handleAdjustChange('saturation', parseInt(e.target.value))}
                  className="w-full h-1 accent-[#C9A84C] bg-[#222222] rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Quick Exposure Preset Buttons */}
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-[9px] text-[#707070] uppercase tracking-wider font-semibold">Presets:</span>
              <button
                onClick={() => {
                  handleAdjustChange('exposure', 35);
                  handleAdjustChange('brightness', 15);
                }}
                className="px-2 py-0.5 bg-[#1f1f1f] hover:bg-[#2a2a2a] text-[#C9A84C] rounded text-[9px] font-semibold transition-colors border border-white/10 cursor-pointer"
              >
                Fix Dark Photo (+35)
              </button>
              <button
                onClick={() => {
                  handleAdjustChange('contrast', 25);
                  handleAdjustChange('saturation', 20);
                }}
                className="px-2 py-0.5 bg-[#1f1f1f] hover:bg-[#2a2a2a] text-[#dedede] rounded text-[9px] font-semibold transition-colors border border-white/10 cursor-pointer"
              >
                Vibrant Pop
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Header Info with View Switcher */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-white uppercase tracking-wider block">
            Visual Effects
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
          {activeEffects.length > 0 && (
            <button
              onClick={handleResetEffects}
              className="flex items-center gap-1 text-[10px] text-[#808080] hover:text-white px-2 py-0.5 rounded bg-[#181818] border border-white/10"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Reset ({activeEffects.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Categories */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
        {EFFECT_CATEGORIES.map((cat) => (
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
        <div className="grid grid-cols-2 gap-2 max-h-[460px] overflow-y-auto pr-1">
          {filteredEffects.map((eff) => {
            const applied = activeEffects.find((e) => e.type === eff.id);
            const isEnabled = !!applied && applied.enabled;

            return (
              <SamplePreviewCard
                key={eff.id}
                id={eff.id}
                name={eff.name}
                badge={eff.badge}
                description={eff.description}
                type="effect"
                isApplied={isEnabled}
                onApply={() => handleToggleEffect(eff.id, eff.defaultIntensity)}
              />
            );
          })}
        </div>
      ) : (
        /* Effects List View */
        <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
          {filteredEffects.map((eff) => {
            const applied = activeEffects.find((e) => e.type === eff.id);
            const isEnabled = !!applied && applied.enabled;
            const isExpanded = expandedEffectId === eff.id;

            return (
              <div
                key={eff.id}
                className={`bg-[#141414] border rounded-lg transition-all overflow-hidden ${
                  isEnabled
                    ? 'border-[#C9A84C] bg-[#1a1a14]'
                    : isExpanded
                    ? 'border-white/30 bg-[#181818]'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <button
                  onClick={() => setExpandedEffectId(isExpanded ? null : eff.id)}
                  className="w-full p-2.5 flex items-center justify-between text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#f0f0f0] group-hover:text-[#C9A84C] transition-colors">
                      {eff.name}
                    </span>
                    {eff.badge && (
                      <span className="px-1.5 py-0.2 text-[8px] font-semibold bg-[#262626] text-[#C9A84C] rounded border border-[#C9A84C]/30">
                        {eff.badge}
                      </span>
                    )}
                    {isEnabled && (
                      <span className="px-1.5 py-0.2 text-[8px] font-bold bg-[#C9A84C] text-black rounded">
                        Applied
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
                    <p className="text-[10px] text-[#a0a0a0] leading-relaxed">{eff.description}</p>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleEffect(eff.id, eff.defaultIntensity);
                        }}
                        className={`w-full py-1 rounded text-[10px] font-bold transition-colors border cursor-pointer ${
                          isEnabled
                            ? 'bg-[#C9A84C] text-black border-[#C9A84C]'
                            : 'bg-[#1f1f1f] text-[#dedede] hover:text-white border-white/10 hover:border-[#C9A84C]/40'
                        }`}
                      >
                        {isEnabled ? 'Remove Effect' : 'Apply Effect'}
                      </button>
                    </div>

                    {isEnabled && applied && (
                      <div className="pt-2 border-t border-white/5 space-y-1">
                        <div className="flex justify-between text-[10px] text-[#a0a0a0]">
                          <span>Intensity</span>
                          <span className="font-mono text-[#C9A84C]">{applied.intensity}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={applied.intensity}
                          onChange={(e) => handleIntensityChange(eff.id, parseInt(e.target.value))}
                          className="w-full h-1 accent-[#C9A84C] bg-[#222222] rounded cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
