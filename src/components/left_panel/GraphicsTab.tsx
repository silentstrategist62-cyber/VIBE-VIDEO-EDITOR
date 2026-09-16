import React, { useState } from 'react';
import { Layers, Plus, Sparkles, Shapes, Image, Tag, UserCheck, Palette } from 'lucide-react';
import { projectStore, useProjectStore } from '../../store/projectStore';
import { GRAPHIC_TEMPLATES, GRAPHIC_CATEGORIES, GraphicTemplate } from '../../data/graphicsData';
import { Clip, Track } from '../../types/project';
import { SamplePreviewCard } from '../common/SamplePreviewCard';

export const GraphicsTab: React.FC = () => {
  const { project, playheadTime } = useProjectStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredTemplates = GRAPHIC_TEMPLATES.filter(
    (t) => selectedCategory === 'all' || t.category === selectedCategory
  );

  const handleAddGraphicToTimeline = (template: GraphicTemplate) => {
    // Check if an overlay track (L1..L10) exists, otherwise create L1
    let overlayTrack = project.timeline.tracks.find(
      (t) => t.trackId.startsWith('L') || t.type === 'overlay'
    );

    if (!overlayTrack) {
      projectStore.executeOperation(
        {
          op: 'add_track',
          trackId: 'L1',
          type: 'overlay',
          name: 'Graphics & Overlays (L1)',
        },
        'Add Overlay Track L1'
      );
    }

    const clipId = `graphic-clip-${Date.now()}`;
    const newClip: Clip = {
      clipId,
      assetId: `asset-${template.id}`,
      trackId: overlayTrack?.trackId || 'L1',
      startTime: playheadTime,
      duration: template.defaultDuration,
      sourceIn: 0,
      sourceOut: template.defaultDuration,
      keyframes: [],
      graphic: { ...template.element, id: `elem-${Date.now()}` },
      transform: {
        scale: 1,
        positionX: 0,
        positionY: template.category === 'lower_thirds' ? 260 : 0,
        rotation: 0,
        opacity: 100,
      },
    };

    projectStore.executeOperation(
      {
        op: 'add_clip',
        clip: newClip,
      },
      `Add ${template.name} Graphic`
    );

    // Select new clip so user can immediately transform or inspect
    projectStore.selectClip(clipId);
  };

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-white uppercase tracking-wider block">
            Graphics & Overlays
          </span>
        </div>
        <span className="text-[10px] font-mono text-[#C9A84C] bg-[#1a1a1a] px-2 py-0.5 rounded border border-white/10">
          {GRAPHIC_TEMPLATES.length} ASSETS
        </span>
      </div>

      {/* Categories */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
        {GRAPHIC_CATEGORIES.map((cat) => (
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

      {/* Grid of Templates */}
      <div className="grid grid-cols-2 gap-2 max-h-[460px] overflow-y-auto pr-1">
        {filteredTemplates.map((item) => (
          <SamplePreviewCard
            key={item.id}
            id={item.id}
            name={item.name}
            badge={item.category.replace('_', ' ')}
            type="graphic"
            onApply={() => handleAddGraphicToTimeline(item)}
          />
        ))}
      </div>
    </div>
  );
};
