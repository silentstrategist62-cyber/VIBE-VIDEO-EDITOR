import React, { useState } from 'react';
import { Sparkles, Play, Film, Clock, Zap, Check, Wand2 } from 'lucide-react';
import { projectStore, useProjectStore } from '../../store/projectStore';
import { OPENREELS_AI_TEMPLATES, AIVideoTemplate } from '../../data/aiTemplatesData';
import { Track, Clip, MediaAsset, Caption, TransitionType } from '../../types/project';

export const AIGenerateTab: React.FC = () => {
  const { project } = useProjectStore();
  const [selectedTemplate, setSelectedTemplate] = useState<AIVideoTemplate>(OPENREELS_AI_TEMPLATES[0]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleApplyTemplate = async (template: AIVideoTemplate) => {
    setIsGenerating(true);

    try {
      // Simulate brief realistic generation pipeline (0.5s)
      await new Promise((resolve) => setTimeout(resolve, 500));

      const newAssets: Record<string, MediaAsset> = { ...project.assets };

      // Base demo images available in the project
      const fallbackImages = [
        'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1080&q=80',
        'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1080&q=80',
        'https://images.unsplash.com/photo-1507499739999-097706ad8914?auto=format&fit=crop&w=1080&q=80',
        'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1080&q=80',
        'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1080&q=80',
      ];

      // Build Video Track V1
      const videoClips: Clip[] = [];
      let cumulativeTime = 0;

      for (let i = 0; i < template.segments.length; i++) {
        const seg = template.segments[i];
        const assetId = `ai-asset-${template.id}-${i}`;
        const imgUrl = fallbackImages[i % fallbackImages.length];

        newAssets[assetId] = {
          assetId,
          type: 'image',
          filename: `${template.id}-scene-${i + 1}.jpg`,
          url: imgUrl,
          duration: seg.duration,
        };

        // Caption words
        const words = seg.text.split(' ');
        const wordDuration = seg.duration / Math.max(1, words.length);
        const wordTimings = words.map((w, wIdx) => ({
          word: w,
          start: cumulativeTime + wIdx * wordDuration,
          end: cumulativeTime + (wIdx + 1) * wordDuration,
        }));

        const captions: Caption[] = [
          {
            captionId: `cap-${Date.now()}-${i}`,
            startTime: cumulativeTime,
            endTime: cumulativeTime + seg.duration,
            text: seg.text,
            style: (template.captionStyle as any) || 'viral-bold',
            wordTimings,
          },
        ];

        const clip: Clip = {
          clipId: `clip-ai-${i}-${Date.now()}`,
          assetId,
          trackId: 'V1',
          startTime: cumulativeTime,
          duration: seg.duration,
          sourceIn: 0,
          sourceOut: seg.duration,
          keyframes: [],
          captions,
          transitionIn:
            i > 0
              ? {
                  type: template.transitionStyle as TransitionType,
                  duration: 0.35,
                }
              : undefined,
          transform: {
            scale: 1,
            positionX: 0,
            positionY: 0,
            rotation: 0,
            opacity: 100,
          },
        };

        videoClips.push(clip);
        cumulativeTime += seg.duration;
      }

      // Build Overlay Track L1 for template badges/stickers
      const overlayClips: Clip[] = [];
      let overlayTime = 0;
      for (let i = 0; i < template.segments.length; i++) {
        const seg = template.segments[i];
        if (seg.graphicOverlay) {
          overlayClips.push({
            clipId: `overlay-ai-${i}-${Date.now()}`,
            assetId: `badge-${i}`,
            trackId: 'L1',
            startTime: overlayTime,
            duration: Math.min(2.5, seg.duration),
            sourceIn: 0,
            sourceOut: Math.min(2.5, seg.duration),
            keyframes: [],
            graphic: {
              id: `g-${i}`,
              category: 'badge',
              badgeText: seg.graphicOverlay,
              fillColor: '#DC2626',
              strokeColor: '#FFFFFF',
              strokeWidth: 2,
              cornerRadius: 18,
              shadow: true,
            },
            transform: {
              scale: 0.9,
              positionX: 0,
              positionY: -280, // Top alert badge
              rotation: 0,
              opacity: 100,
            },
          });
        }
        overlayTime += seg.duration;
      }

      // Build Audio Track A1
      const audioAssetId = `audio-tension-${Date.now()}`;
      newAssets[audioAssetId] = {
        assetId: audioAssetId,
        type: 'audio',
        filename: `${template.title} Tension Synth.mp3`,
        url: 'https://cdn.freesound.org/previews/568/568600_12394276-lq.mp3',
        duration: cumulativeTime,
      };

      const audioClip: Clip = {
        clipId: `clip-audio-${Date.now()}`,
        assetId: audioAssetId,
        trackId: 'A1',
        startTime: 0,
        duration: cumulativeTime,
        sourceIn: 0,
        sourceOut: cumulativeTime,
        keyframes: [],
        transform: {
          scale: 1,
          positionX: 0,
          positionY: 0,
          rotation: 0,
          opacity: 100,
        },
        audio: {
          volume: 0,
          fadeIn: 0.5,
          fadeOut: 0.5,
          speed: 1.0,
          maintainPitch: true,
        },
      };

      // Create tracks
      const tracks: Track[] = [
        {
          trackId: 'L1',
          type: 'overlay',
          name: 'Graphics & Overlays (L1)',
          muted: false,
          locked: false,
          clips: overlayClips,
        },
        {
          trackId: 'V1',
          type: 'video',
          name: 'Main Video (V1)',
          muted: false,
          locked: false,
          clips: videoClips,
        },
        {
          trackId: 'A1',
          type: 'audio',
          name: 'Background Score (A1)',
          muted: false,
          locked: false,
          clips: [audioClip],
        },
      ];

      // Update full project document
      const updatedDoc = {
        ...project,
        name: `${template.title} (AI Generated)`,
        assets: newAssets,
        timeline: {
          ...project.timeline,
          duration: cumulativeTime,
          tracks,
        },
      };

      projectStore.setProject(updatedDoc);
      projectStore.seekPlayheadTime(0);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-white uppercase tracking-wider block">
            OpenReels AI Video Templates
          </span>
        </div>
        <span className="text-[10px] font-mono text-[#C9A84C] bg-[#1a1a1a] px-2 py-0.5 rounded border border-white/10">
          AUTO ENGINE
        </span>
      </div>

      {/* Templates Carousel / Selector */}
      <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
        {OPENREELS_AI_TEMPLATES.map((tpl) => {
          const isSelected = selectedTemplate.id === tpl.id;
          return (
            <div
              key={tpl.id}
              onClick={() => setSelectedTemplate(tpl)}
              className={`p-3 bg-[#141414] border rounded-lg cursor-pointer transition-colors ${
                isSelected ? 'border-[#C9A84C] bg-[#1a1a14]' : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-white group-hover:text-[#C9A84C]">
                  {tpl.title}
                </span>
                <span className="text-[9px] font-semibold bg-[#262626] text-[#C9A84C] px-1.5 py-0.5 rounded border border-[#C9A84C]/30">
                  {tpl.badge}
                </span>
              </div>

              <p className="text-[10px] text-[#909090] mb-2 leading-relaxed">{tpl.tagline}</p>

              <div className="flex items-center gap-3 text-[9px] text-[#707070] font-mono mb-2.5">
                <span>⏱ {tpl.avgDuration}s Duration</span>
                <span>✂ {tpl.pacing}</span>
                <span>⚡ {tpl.transitionStyle} cuts</span>
              </div>

              {isSelected && (
                <div className="pt-2 border-t border-white/5 space-y-2">
                  <div className="text-[10px] text-[#808080] font-medium">
                    Sample: <span className="text-[#dedede]">{tpl.sampleTopic}</span>
                  </div>

                  {/* Same button styling */}
                  <button
                    disabled={isGenerating}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApplyTemplate(tpl);
                    }}
                    className="w-full py-1.5 bg-[#1f1f1f] hover:bg-[#2a2a2a] text-[#dedede] hover:text-[#C9A84C] border border-white/10 hover:border-[#C9A84C]/50 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>
                      {isGenerating ? 'Generating Scenes & Audio...' : 'Generate & Load into Timeline'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
