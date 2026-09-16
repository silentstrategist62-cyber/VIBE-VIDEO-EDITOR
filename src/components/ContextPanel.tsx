import React, { useState } from 'react';
import {
  Sliders,
  Move,
  Key,
  RotateCw,
  Sun,
  Eye,
  Volume2,
  Gauge,
  Sparkles,
  Info,
  Check,
  Music,
  Film,
  Type,
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  SlidersHorizontal,
  X,
  RotateCcw,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ArrowUpToLine,
  ArrowDownToLine,
  Maximize2,
  Diamond,
  Zap,
  Mic,
  VolumeX,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { projectStore, useProjectStore } from '../store/projectStore';
import { Clip, Keyframe } from '../types/project';
import { useIsMobile } from '../hooks/useIsMobile';

export const ContextPanel: React.FC = () => {
  const { project, selectedClipId, playheadTime, isRightPanelOpen } = useProjectStore();
  const isMobile = useIsMobile();

  // Find strictly selected clip (no fallback to playhead when deselecting)
  let selectedClip: Clip | null = null;
  if (selectedClipId) {
    for (const track of project.timeline.tracks) {
      const found = track.clips.find((c) => c.clipId === selectedClipId);
      if (found) {
        selectedClip = found;
        break;
      }
    }
  }

  // State for Video tabs
  const [videoTab, setVideoTab] = useState<'video' | 'animation' | 'adjust' | 'ai'>('video');
  const [videoSubPill, setVideoSubPill] = useState<'basic' | 'remove_bg' | 'mask' | 'retouch'>('basic');
  const [isTransformExpanded, setIsTransformExpanded] = useState(true);
  const [uniformScale, setUniformScale] = useState(true);

  // State for Audio tabs
  const [audioTab, setAudioTab] = useState<'basic' | 'voice_changer' | 'speed'>('basic');
  const [isAudioBasicExpanded, setIsAudioBasicExpanded] = useState(true);
  const [normalizeLoudness, setNormalizeLoudness] = useState(false);
  const [enhanceVoice, setEnhanceVoice] = useState(false);
  const [enhanceLevel, setEnhanceLevel] = useState(65);
  const [reduceNoise, setReduceNoise] = useState(false);
  const [voicePreset, setVoicePreset] = useState<string>('none');

  // If no clip is selected
  if (!selectedClip) {
    if (!isMobile) {
      // Desktop: Hide panel completely so PlayerPreview occupies the whole spacious area
      return null;
    }
    return (
      <aside className="w-full h-full bg-[#0d0d0d] select-none p-4 flex flex-col items-center justify-center text-center">
        <SlidersHorizontal className="w-8 h-8 text-[#555555] mb-2" />
        <p className="text-xs text-[#888888] mb-3">Select an image, video, or audio clip on the timeline to inspect options.</p>
        <button
          onClick={() => projectStore.setMobileView('timeline')}
          className="px-3 py-1.5 rounded-md bg-[#181818] border border-white/[0.08] text-xs text-[#C9A84C] hover:text-[#E8C97A]"
        >
          Back to Timeline
        </button>
      </aside>
    );
  }

  const isAudioClip =
    selectedClip.trackId.startsWith('A') ||
    project.timeline.tracks.find((t) => t.trackId === selectedClip?.trackId)?.type === 'audio';

  const isVideoOrImage = !isAudioClip;
  const isImageLayer =
    selectedClip.trackId.startsWith('L') ||
    project.timeline.tracks.find((t) => t.trackId === selectedClip?.trackId)?.type === 'overlay';

  const asset = project.assets[selectedClip.assetId];

  // Keyframe helpers
  const handleAddKeyframeAtPlayhead = (property: 'scale' | 'positionX' | 'positionY' | 'rotation' | 'opacity') => {
    if (!selectedClip) return;
    const offsetTime = Math.max(0, Math.min(selectedClip.duration, playheadTime - selectedClip.startTime));
    const currentValue =
      property === 'scale'
        ? selectedClip.transform.scale
        : property === 'positionX'
        ? selectedClip.transform.positionX
        : property === 'positionY'
        ? selectedClip.transform.positionY
        : property === 'rotation'
        ? selectedClip.transform.rotation
        : selectedClip.transform.opacity;

    projectStore.executeOperation(
      {
        op: 'add_keyframe',
        clipId: selectedClip.clipId,
        keyframe: {
          property,
          time: Number(offsetTime.toFixed(2)),
          value: currentValue,
          easing: 'easeInOut',
        },
      },
      `Add ${property} keyframe`
    );
  };

  // Transform updates
  const handleTransformChange = (key: keyof Clip['transform'], value: number) => {
    if (!selectedClip) return;
    projectStore.executeOperation(
      {
        op: 'set_transform',
        clipId: selectedClip.clipId,
        transform: {
          ...selectedClip.transform,
          [key]: value,
        },
      },
      `Update ${key}`
    );
  };

  // Color Adjust updates
  const handleAdjustChange = (key: string, value: number) => {
    if (!selectedClip) return;
    const currentAdjust = selectedClip.adjust || {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      temperature: 0,
      exposure: 0,
      vignette: 0,
    };
    projectStore.executeOperation(
      {
        op: 'set_adjust',
        clipId: selectedClip.clipId,
        adjust: {
          ...currentAdjust,
          [key]: value,
        },
      },
      `Set ${key}`
    );
  };

  // Audio updates
  const handleAudioSettingsChange = (partial: Partial<NonNullable<Clip['audio']>>) => {
    if (!selectedClip) return;
    const currentAudio = selectedClip.audio || {
      volume: 0,
      fadeIn: 0,
      fadeOut: 0,
      speed: 1.0,
      maintainPitch: true,
    };
    projectStore.executeOperation(
      {
        op: 'set_audio_settings',
        clipId: selectedClip.clipId,
        settings: {
          ...currentAudio,
          ...partial,
        },
      },
      'Update audio settings'
    );
  };

  // Quick Ken Burns
  const handleQuickKenBurns = (type: 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'clear') => {
    if (!selectedClip) return;
    if (type === 'clear') {
      projectStore.executeOperation({
        op: 'batch_operations',
        operations: (selectedClip.keyframes || []).map((kf) => ({
          op: 'delete_keyframe' as const,
          clipId: selectedClip!.clipId,
          property: kf.property,
          time: kf.time,
        })),
        description: 'Clear all keyframes',
      });
      return;
    }

    const dur = selectedClip.duration;
    let kfOps: any[] = [];
    if (type === 'zoom-in') {
      kfOps = [
        { op: 'add_keyframe', clipId: selectedClip.clipId, keyframe: { property: 'scale', time: 0, value: 1.0, easing: 'easeInOut' } },
        { op: 'add_keyframe', clipId: selectedClip.clipId, keyframe: { property: 'scale', time: dur, value: 1.25, easing: 'easeInOut' } },
      ];
    } else if (type === 'zoom-out') {
      kfOps = [
        { op: 'add_keyframe', clipId: selectedClip.clipId, keyframe: { property: 'scale', time: 0, value: 1.25, easing: 'easeInOut' } },
        { op: 'add_keyframe', clipId: selectedClip.clipId, keyframe: { property: 'scale', time: dur, value: 1.0, easing: 'easeInOut' } },
      ];
    } else if (type === 'pan-left') {
      kfOps = [
        { op: 'add_keyframe', clipId: selectedClip.clipId, keyframe: { property: 'positionX', time: 0, value: 40, easing: 'easeInOut' } },
        { op: 'add_keyframe', clipId: selectedClip.clipId, keyframe: { property: 'positionX', time: dur, value: -40, easing: 'easeInOut' } },
      ];
    } else if (type === 'pan-right') {
      kfOps = [
        { op: 'add_keyframe', clipId: selectedClip.clipId, keyframe: { property: 'positionX', time: 0, value: -40, easing: 'easeInOut' } },
        { op: 'add_keyframe', clipId: selectedClip.clipId, keyframe: { property: 'positionX', time: dur, value: 40, easing: 'easeInOut' } },
      ];
    }

    projectStore.executeOperation({
      op: 'batch_operations',
      operations: kfOps,
      description: `Apply Ken Burns ${type}`,
    });
  };

  return (
    <aside
      id="capcut-details-inspector"
      className="w-full h-full bg-[#111111] select-none overflow-y-auto z-20 flex flex-col shrink-0 text-[#EEF0F4]"
    >
      {/* 1. Header Bar with Close Button */}
      <div className="h-10 px-3 pr-3.5 border-b border-white/[0.08] flex items-center justify-between bg-[#0d0d0d] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-bold tracking-wider text-[#C9A84C] uppercase">
            {isAudioClip ? 'Audio' : isImageLayer ? 'Graphic' : 'Video'}
          </span>
          <span className="text-[10px] text-[#666666] font-mono truncate max-w-[150px]">
            {asset?.filename || selectedClip.clipId}
          </span>
        </div>
        <button
          id="btn-dismiss-capcut-options"
          onClick={() => {
            projectStore.selectClip(null);
            if (isMobile) {
              projectStore.setMobileView('timeline');
            }
          }}
          className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/[0.08] text-[#888888] hover:text-[#EEF0F4] transition-colors cursor-pointer"
          title="Close details (Click off)"
          aria-label="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ========================================================================= */}
      {/* CAPCUT VIDEO / IMAGE DETAILS (Image 1 & 2)                                */}
      {/* ========================================================================= */}
      {isVideoOrImage && (
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Main Tabs: Video | Animation | Adjust | AI stylize */}
          <div className="flex border-b border-white/[0.08] bg-[#0f0f0f] px-2 text-xs font-medium text-[#888888] shrink-0">
            <button
              id="tab-capcut-video"
              onClick={() => setVideoTab('video')}
              className={`py-2 px-2.5 relative transition-colors cursor-pointer ${
                videoTab === 'video' ? 'text-[#EEF0F4] font-semibold' : 'hover:text-[#CCCCCC]'
              }`}
            >
              Video
              {videoTab === 'video' && (
                <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#C9A84C] rounded-full" />
              )}
            </button>
            <button
              id="tab-capcut-animation"
              onClick={() => setVideoTab('animation')}
              className={`py-2 px-2.5 relative transition-colors cursor-pointer ${
                videoTab === 'animation' ? 'text-[#EEF0F4] font-semibold' : 'hover:text-[#CCCCCC]'
              }`}
            >
              Animation
              {videoTab === 'animation' && (
                <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#C9A84C] rounded-full" />
              )}
            </button>
            <button
              id="tab-capcut-adjust"
              onClick={() => setVideoTab('adjust')}
              className={`py-2 px-2.5 relative transition-colors cursor-pointer ${
                videoTab === 'adjust' ? 'text-[#EEF0F4] font-semibold' : 'hover:text-[#CCCCCC]'
              }`}
            >
              Adjust
              {videoTab === 'adjust' && (
                <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#C9A84C] rounded-full" />
              )}
            </button>
            <button
              id="tab-capcut-ai"
              onClick={() => setVideoTab('ai')}
              className={`py-2 px-2.5 relative transition-colors cursor-pointer ${
                videoTab === 'ai' ? 'text-[#EEF0F4] font-semibold' : 'hover:text-[#CCCCCC]'
              }`}
            >
              AI stylize
              {videoTab === 'ai' && (
                <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#C9A84C] rounded-full" />
              )}
            </button>
          </div>

          {/* TAB 1: VIDEO (Sub-pills: Basic | Remove BG | Mask | Retouch) */}
          {videoTab === 'video' && (
            <div className="flex-1 p-3 space-y-4 text-xs">
              {/* Sub-pills */}
              <div className="flex items-center gap-1.5 pb-1 overflow-x-auto no-scrollbar">
                {(['basic', 'remove_bg', 'mask', 'retouch'] as const).map((pill) => {
                  const titles = {
                    basic: 'Basic',
                    remove_bg: 'Remove BG',
                    mask: 'Mask',
                    retouch: 'Retouch',
                  };
                  const active = videoSubPill === pill;
                  return (
                    <button
                      key={pill}
                      onClick={() => setVideoSubPill(pill)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer shrink-0 ${
                        active
                          ? 'bg-[#222222] text-[#EEF0F4] border border-white/[0.12]'
                          : 'bg-[#141414] text-[#777777] hover:text-[#AAAAAA] hover:bg-[#1a1a1a]'
                      }`}
                    >
                      {titles[pill]}
                    </button>
                  );
                })}
              </div>

              {/* Sub-pill: BASIC */}
              {videoSubPill === 'basic' && (
                <div className="space-y-4">
                  {/* TEXT OVERLAY CONTROLS (If Text Clip Selected) */}
                  {selectedClip.textOverlay && (
                    <div className="p-3 bg-[#161616] border border-[#C9A84C]/40 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#C9A84C] uppercase tracking-wider">
                          Text Typography & FX
                        </span>
                        <span className="text-[9px] font-mono text-[#888888]">Live Overlay</span>
                      </div>

                      {/* Text String Input */}
                      <div>
                        <label className="text-[10px] text-[#888888] font-semibold block mb-1">
                          Text Content
                        </label>
                        <input
                          type="text"
                          value={selectedClip.textOverlay.text}
                          onChange={(e) =>
                            projectStore.executeOperation(
                              {
                                op: 'update_text_overlay',
                                clipId: selectedClip!.clipId,
                                textOverlay: { text: e.target.value },
                              },
                              'Update Text String'
                            )
                          }
                          className="w-full bg-[#0a0a0a] border border-white/10 rounded px-2 py-1 text-xs text-[#EEF0F4] focus:outline-none focus:border-[#C9A84C]"
                        />
                      </div>

                      {/* Font Size & Animation */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="flex justify-between text-[10px] text-[#888888] mb-1">
                            <span>Font Size</span>
                            <span className="font-mono text-[#C9A84C]">
                              {selectedClip.textOverlay.fontSize || 44}px
                            </span>
                          </div>
                          <input
                            type="range"
                            min="20"
                            max="90"
                            value={selectedClip.textOverlay.fontSize || 44}
                            onChange={(e) =>
                              projectStore.executeOperation(
                                {
                                  op: 'update_text_overlay',
                                  clipId: selectedClip!.clipId,
                                  textOverlay: { fontSize: parseInt(e.target.value) },
                                },
                                'Update Font Size'
                              )
                            }
                            className="w-full h-1 accent-[#C9A84C] bg-[#222222] rounded cursor-pointer"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-[#888888] font-semibold block mb-1">
                            Kinetic Animation
                          </label>
                          <select
                            value={selectedClip.textOverlay.animation || 'bounce'}
                            onChange={(e) =>
                              projectStore.executeOperation(
                                {
                                  op: 'update_text_overlay',
                                  clipId: selectedClip!.clipId,
                                  textOverlay: { animation: e.target.value as any },
                                },
                                'Change Text Animation'
                              )
                            }
                            className="w-full bg-[#0a0a0a] border border-white/10 rounded px-2 py-1 text-xs text-[#EEF0F4] focus:outline-none focus:border-[#C9A84C]"
                          >
                            <option value="bounce">Pop & Bounce</option>
                            <option value="typewriter">Typewriter Reveal</option>
                            <option value="slideUp">Slide Up</option>
                            <option value="slideDown">Slide Down</option>
                            <option value="slideLeft">Slide Left</option>
                            <option value="elastic">Elastic Snap</option>
                            <option value="stompZoom">Stomp Punch Zoom</option>
                            <option value="blurToFocus">Blur to Focus</option>
                            <option value="neonFlicker">Neon Tube Flicker</option>
                            <option value="flip3D">3D Card Flip</option>
                            <option value="wave">Floating Wave</option>
                            <option value="heartbeat">Heartbeat Pulse</option>
                            <option value="fadeIn">Clean Fade In</option>
                          </select>
                        </div>
                      </div>

                      {/* Color Palette Controls */}
                      <div className="flex items-center gap-3 pt-1">
                        <div>
                          <label className="text-[9px] text-[#888888] block mb-0.5">Fill</label>
                          <input
                            type="color"
                            value={selectedClip.textOverlay.color || '#FFFFFF'}
                            onChange={(e) =>
                              projectStore.executeOperation(
                                {
                                  op: 'update_text_overlay',
                                  clipId: selectedClip!.clipId,
                                  textOverlay: { color: e.target.value },
                                },
                                'Change Text Fill'
                              )
                            }
                            className="w-7 h-7 rounded border border-white/10 bg-transparent cursor-pointer"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] text-[#888888] block mb-0.5">Stroke</label>
                          <input
                            type="color"
                            value={selectedClip.textOverlay.strokeColor || '#000000'}
                            onChange={(e) =>
                              projectStore.executeOperation(
                                {
                                  op: 'update_text_overlay',
                                  clipId: selectedClip!.clipId,
                                  textOverlay: { strokeColor: e.target.value },
                                },
                                'Change Text Stroke'
                              )
                            }
                            className="w-7 h-7 rounded border border-white/10 bg-transparent cursor-pointer"
                          />
                        </div>

                        <div className="flex-1">
                          <div className="flex justify-between text-[9px] text-[#888888] mb-1">
                            <span>Outline Stroke</span>
                            <span className="font-mono text-[#C9A84C]">
                              {selectedClip.textOverlay.strokeWidth ?? 6}px
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="16"
                            value={selectedClip.textOverlay.strokeWidth ?? 6}
                            onChange={(e) =>
                              projectStore.executeOperation(
                                {
                                  op: 'update_text_overlay',
                                  clipId: selectedClip!.clipId,
                                  textOverlay: { strokeWidth: parseInt(e.target.value) },
                                },
                                'Change Stroke Width'
                              )
                            }
                            className="w-full h-1 accent-[#C9A84C] bg-[#222222] rounded cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* GRAPHIC ELEMENT CONTROLS (If Graphic Clip Selected) */}
                  {selectedClip.graphic && (
                    <div className="p-3 bg-[#161616] border border-[#C9A84C]/40 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#C9A84C] uppercase tracking-wider">
                          Graphic Element Options
                        </span>
                        <span className="text-[9px] font-mono text-[#888888] capitalize">
                          {selectedClip.graphic.category}
                        </span>
                      </div>

                      {selectedClip.graphic.category === 'lower_third' && (
                        <div className="space-y-2">
                          <div>
                            <label className="text-[10px] text-[#888888] font-semibold block mb-1">
                              Headline
                            </label>
                            <input
                              type="text"
                              value={selectedClip.graphic.title || ''}
                              onChange={(e) =>
                                projectStore.executeOperation(
                                  {
                                    op: 'update_graphic',
                                    clipId: selectedClip!.clipId,
                                    graphic: { title: e.target.value },
                                  },
                                  'Update Graphic Title'
                                )
                              }
                              className="w-full bg-[#0a0a0a] border border-white/10 rounded px-2 py-1 text-xs text-[#EEF0F4] focus:outline-none focus:border-[#C9A84C]"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-[#888888] font-semibold block mb-1">
                              Subtitle
                            </label>
                            <input
                              type="text"
                              value={selectedClip.graphic.subtitle || ''}
                              onChange={(e) =>
                                projectStore.executeOperation(
                                  {
                                    op: 'update_graphic',
                                    clipId: selectedClip!.clipId,
                                    graphic: { subtitle: e.target.value },
                                  },
                                  'Update Graphic Subtitle'
                                )
                              }
                              className="w-full bg-[#0a0a0a] border border-white/10 rounded px-2 py-1 text-xs text-[#EEF0F4] focus:outline-none focus:border-[#C9A84C]"
                            />
                          </div>
                        </div>
                      )}

                      {selectedClip.graphic.category === 'badge' && (
                        <div>
                          <label className="text-[10px] text-[#888888] font-semibold block mb-1">
                            Badge Text
                          </label>
                          <input
                            type="text"
                            value={selectedClip.graphic.badgeText || ''}
                            onChange={(e) =>
                              projectStore.executeOperation(
                                {
                                  op: 'update_graphic',
                                  clipId: selectedClip!.clipId,
                                  graphic: { badgeText: e.target.value },
                                },
                                'Update Badge Text'
                              )
                            }
                            className="w-full bg-[#0a0a0a] border border-white/10 rounded px-2 py-1 text-xs text-[#EEF0F4] focus:outline-none focus:border-[#C9A84C]"
                          />
                        </div>
                      )}

                      <div className="flex items-center gap-3 pt-1">
                        <div>
                          <label className="text-[9px] text-[#888888] block mb-0.5">Fill</label>
                          <input
                            type="color"
                            value={selectedClip.graphic.fillColor?.startsWith('#') ? selectedClip.graphic.fillColor : '#C9A84C'}
                            onChange={(e) =>
                              projectStore.executeOperation(
                                {
                                  op: 'update_graphic',
                                  clipId: selectedClip!.clipId,
                                  graphic: { fillColor: e.target.value },
                                },
                                'Change Graphic Fill'
                              )
                            }
                            className="w-7 h-7 rounded border border-white/10 bg-transparent cursor-pointer"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-[#888888] block mb-0.5">Border</label>
                          <input
                            type="color"
                            value={selectedClip.graphic.strokeColor?.startsWith('#') ? selectedClip.graphic.strokeColor : '#FFFFFF'}
                            onChange={(e) =>
                              projectStore.executeOperation(
                                {
                                  op: 'update_graphic',
                                  clipId: selectedClip!.clipId,
                                  graphic: { strokeColor: e.target.value },
                                },
                                'Change Graphic Border'
                              )
                            }
                            className="w-7 h-7 rounded border border-white/10 bg-transparent cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Transform Section Header */}
                  <div className="flex items-center justify-between text-xs text-[#EEF0F4] font-semibold pt-1">
                    <button
                      onClick={() => setIsTransformExpanded(!isTransformExpanded)}
                      className="flex items-center gap-1 hover:text-[#C9A84C] cursor-pointer"
                    >
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-[#888888] transition-transform ${
                          isTransformExpanded ? 'rotate-0' : '-rotate-90'
                        }`}
                      />
                      <span>Transform</span>
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          projectStore.executeOperation(
                            {
                              op: 'set_transform',
                              clipId: selectedClip!.clipId,
                              transform: { scale: 1, positionX: 0, positionY: 0, rotation: 0, opacity: 100 },
                            },
                            'Reset transform'
                          );
                        }}
                        className="text-[#777777] hover:text-[#EEF0F4] cursor-pointer"
                        title="Reset Transform"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleAddKeyframeAtPlayhead('scale')}
                        className="text-[#777777] hover:text-[#C9A84C] cursor-pointer"
                        title="Add Transform Keyframe at Playhead (◇)"
                      >
                        <Diamond className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {isTransformExpanded && (
                    <div className="space-y-3.5">
                      {/* Scale */}
                      <div>
                        <div className="flex items-center justify-between text-[#888888] text-[11px] mb-1.5">
                          <span>Scale</span>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center bg-[#181818] border border-white/[0.08] rounded px-1.5 py-0.5">
                              <span className="font-mono text-[#EEF0F4] text-[11px] w-12 text-right">
                                {Math.round((selectedClip.transform?.scale ?? 1) * 100)}%
                              </span>
                              <div className="flex flex-col ml-1">
                                <button
                                  onClick={() =>
                                    handleTransformChange(
                                      'scale',
                                      Math.min(3, (selectedClip.transform?.scale ?? 1) + 0.05)
                                    )
                                  }
                                  className="text-[8px] text-[#777777] hover:text-white leading-none"
                                >
                                  ▲
                                </button>
                                <button
                                  onClick={() =>
                                    handleTransformChange(
                                      'scale',
                                      Math.max(0.1, (selectedClip.transform?.scale ?? 1) - 0.05)
                                    )
                                  }
                                  className="text-[8px] text-[#777777] hover:text-white leading-none"
                                >
                                  ▼
                                </button>
                              </div>
                            </div>
                            <button
                              onClick={() => handleAddKeyframeAtPlayhead('scale')}
                              className="text-[#666666] hover:text-[#C9A84C] cursor-pointer"
                              title="Keyframe Scale"
                            >
                              <Diamond className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <input
                          type="range"
                          min="0.2"
                          max="2.5"
                          step="0.02"
                          value={selectedClip.transform?.scale ?? 1}
                          onChange={(e) => handleTransformChange('scale', parseFloat(e.target.value))}
                          className="w-full h-1 accent-[#C9A84C] bg-[#222222] rounded cursor-pointer"
                        />
                      </div>

                      {/* Uniform Scale Toggle */}
                      <div className="flex items-center justify-between text-[#888888] text-[11px]">
                        <span>Uniform scale</span>
                        <button
                          onClick={() => setUniformScale(!uniformScale)}
                          className={`w-7 h-4 rounded-full transition-colors relative cursor-pointer ${
                            uniformScale ? 'bg-[#C9A84C]' : 'bg-[#2a2a2a]'
                          }`}
                        >
                          <span
                            className={`w-3 h-3 rounded-full bg-[#111111] absolute top-0.5 transition-transform ${
                              uniformScale ? 'left-3.5' : 'left-0.5'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Position X and Y */}
                      <div>
                        <div className="flex items-center justify-between text-[#888888] text-[11px] mb-1.5">
                          <span>Position</span>
                          <button
                            onClick={() => {
                              handleAddKeyframeAtPlayhead('positionX');
                              handleAddKeyframeAtPlayhead('positionY');
                            }}
                            className="text-[#666666] hover:text-[#C9A84C] cursor-pointer"
                            title="Keyframe Position"
                          >
                            <Diamond className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center justify-between bg-[#181818] border border-white/[0.08] rounded px-2 py-1 text-[11px]">
                            <span className="text-[#666666] font-mono">X</span>
                            <span className="font-mono text-[#EEF0F4]">
                              {selectedClip.transform?.positionX ?? 0}
                            </span>
                            <div className="flex flex-col ml-1">
                              <button
                                onClick={() =>
                                  handleTransformChange('positionX', (selectedClip.transform?.positionX ?? 0) + 10)
                                }
                                className="text-[8px] text-[#777777] hover:text-white leading-none"
                              >
                                ▲
                              </button>
                              <button
                                onClick={() =>
                                  handleTransformChange('positionX', (selectedClip.transform?.positionX ?? 0) - 10)
                                }
                                className="text-[8px] text-[#777777] hover:text-white leading-none"
                              >
                                ▼
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between bg-[#181818] border border-white/[0.08] rounded px-2 py-1 text-[11px]">
                            <span className="text-[#666666] font-mono">Y</span>
                            <span className="font-mono text-[#EEF0F4]">
                              {selectedClip.transform?.positionY ?? 0}
                            </span>
                            <div className="flex flex-col ml-1">
                              <button
                                onClick={() =>
                                  handleTransformChange('positionY', (selectedClip.transform?.positionY ?? 0) + 10)
                                }
                                className="text-[8px] text-[#777777] hover:text-white leading-none"
                              >
                                ▲
                              </button>
                              <button
                                onClick={() =>
                                  handleTransformChange('positionY', (selectedClip.transform?.positionY ?? 0) - 10)
                                }
                                className="text-[8px] text-[#777777] hover:text-white leading-none"
                              >
                                ▼
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Rotate */}
                      <div>
                        <div className="flex items-center justify-between text-[#888888] text-[11px] mb-1.5">
                          <span>Rotate</span>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center bg-[#181818] border border-white/[0.08] rounded px-1.5 py-0.5">
                              <span className="font-mono text-[#EEF0F4] text-[11px] w-12 text-right">
                                {(selectedClip.transform?.rotation ?? 0).toFixed(1)}°
                              </span>
                              <div className="flex flex-col ml-1">
                                <button
                                  onClick={() =>
                                    handleTransformChange('rotation', (selectedClip.transform?.rotation ?? 0) + 15)
                                  }
                                  className="text-[8px] text-[#777777] hover:text-white leading-none"
                                >
                                  ▲
                                </button>
                                <button
                                  onClick={() =>
                                    handleTransformChange('rotation', (selectedClip.transform?.rotation ?? 0) - 15)
                                  }
                                  className="text-[8px] text-[#777777] hover:text-white leading-none"
                                >
                                  ▼
                                </button>
                              </div>
                            </div>
                            <button
                              onClick={() =>
                                handleTransformChange(
                                  'rotation',
                                  ((selectedClip.transform?.rotation ?? 0) + 90) % 360
                                )
                              }
                              className="w-5 h-5 flex items-center justify-center text-[#777777] hover:text-[#EEF0F4]"
                              title="Turn 90° Clockwise"
                            >
                              <RotateCw className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleAddKeyframeAtPlayhead('rotation')}
                              className="text-[#666666] hover:text-[#C9A84C] cursor-pointer"
                              title="Keyframe Rotate"
                            >
                              <Diamond className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Alignment Bar (CapCut 7 action buttons) */}
                      <div className="pt-1">
                        <span className="text-[#666666] text-[10px] block mb-1.5 uppercase font-medium tracking-wider">
                          Align
                        </span>
                        <div className="flex items-center justify-between bg-[#161616] p-1 rounded-md border border-white/[0.06]">
                          {/* Align Left */}
                          <button
                            onClick={() => handleTransformChange('positionX', -100)}
                            className="p-1 rounded hover:bg-white/[0.08] text-[#888888] hover:text-[#EEF0F4] transition-colors"
                            title="Align Left"
                          >
                            <AlignLeft className="w-3.5 h-3.5" />
                          </button>
                          {/* Align Center X */}
                          <button
                            onClick={() => handleTransformChange('positionX', 0)}
                            className="p-1 rounded hover:bg-white/[0.08] text-[#888888] hover:text-[#EEF0F4] transition-colors"
                            title="Center Horizontally"
                          >
                            <AlignCenter className="w-3.5 h-3.5" />
                          </button>
                          {/* Align Right */}
                          <button
                            onClick={() => handleTransformChange('positionX', 100)}
                            className="p-1 rounded hover:bg-white/[0.08] text-[#888888] hover:text-[#EEF0F4] transition-colors"
                            title="Align Right"
                          >
                            <AlignRight className="w-3.5 h-3.5" />
                          </button>
                          {/* Align Top */}
                          <button
                            onClick={() => handleTransformChange('positionY', -150)}
                            className="p-1 rounded hover:bg-white/[0.08] text-[#888888] hover:text-[#EEF0F4] transition-colors"
                            title="Align Top"
                          >
                            <ArrowUpToLine className="w-3.5 h-3.5" />
                          </button>
                          {/* Align Center Y */}
                          <button
                            onClick={() => handleTransformChange('positionY', 0)}
                            className="p-1 rounded hover:bg-white/[0.08] text-[#888888] hover:text-[#EEF0F4] transition-colors"
                            title="Center Vertically"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                          </button>
                          {/* Align Bottom */}
                          <button
                            onClick={() => handleTransformChange('positionY', 150)}
                            className="p-1 rounded hover:bg-white/[0.08] text-[#888888] hover:text-[#EEF0F4] transition-colors"
                            title="Align Bottom"
                          >
                            <ArrowDownToLine className="w-3.5 h-3.5" />
                          </button>
                          {/* Reset Center */}
                          <button
                            onClick={() => {
                              handleTransformChange('positionX', 0);
                              handleTransformChange('positionY', 0);
                            }}
                            className="p-1 rounded hover:bg-white/[0.08] text-[#C9A84C] hover:text-[#E8C97A] transition-colors font-mono text-[10px] px-1.5"
                            title="Center Canvas (0,0)"
                          >
                            0,0
                          </button>
                        </div>
                      </div>

                      {/* Opacity */}
                      <div className="pt-2 border-t border-white/[0.06]">
                        <div className="flex items-center justify-between text-[#888888] text-[11px] mb-1.5">
                          <span>Opacity</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[#EEF0F4] text-[11px]">
                              {selectedClip.transform?.opacity ?? 100}%
                            </span>
                            <button
                              onClick={() => handleAddKeyframeAtPlayhead('opacity')}
                              className="text-[#666666] hover:text-[#C9A84C] cursor-pointer"
                              title="Keyframe Opacity"
                            >
                              <Diamond className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={selectedClip.transform?.opacity ?? 100}
                          onChange={(e) => handleTransformChange('opacity', parseInt(e.target.value))}
                          className="w-full h-1 accent-[#C9A84C] bg-[#222222] rounded cursor-pointer"
                        />
                      </div>

                      {/* Keyframe Animation for Transform */}
                      <div className="pt-2.5 border-t border-white/[0.06] space-y-2">
                        <div className="flex items-center justify-between text-[#888888] text-[11px]">
                          <span className="font-semibold text-[#EEF0F4] flex items-center gap-1.5">
                            <Diamond className="w-3 h-3 text-[#C9A84C]" />
                            Keyframe Animation
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAddKeyframeAtPlayhead('scale')}
                            className="text-[#C9A84C] hover:text-[#E8C97A] text-[10px] flex items-center gap-1 cursor-pointer font-medium"
                            title="Add Transform Keyframe at Playhead"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Keyframe</span>
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                          <button
                            type="button"
                            onClick={() => handleQuickKenBurns('zoom-in')}
                            className="py-1 px-2 bg-[#161616] hover:bg-[#202020] border border-white/[0.08] hover:border-[#C9A84C]/40 rounded text-left transition-colors cursor-pointer text-[10px]"
                          >
                            <span className="text-[#EEF0F4] font-medium block">Zoom In</span>
                            <span className="text-[#777777] font-mono text-[9px]">1.0 &rarr; 1.25</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickKenBurns('zoom-out')}
                            className="py-1 px-2 bg-[#161616] hover:bg-[#202020] border border-white/[0.08] hover:border-[#C9A84C]/40 rounded text-left transition-colors cursor-pointer text-[10px]"
                          >
                            <span className="text-[#EEF0F4] font-medium block">Zoom Out</span>
                            <span className="text-[#777777] font-mono text-[9px]">1.25 &rarr; 1.0</span>
                          </button>
                        </div>
                        {(selectedClip.keyframes || []).length > 0 && (
                          <div className="space-y-1 pt-1">
                            {(selectedClip.keyframes || []).map((kf, idx) => (
                              <div
                                key={`${kf.property}-${kf.time}-${idx}`}
                                className="flex items-center justify-between px-2 py-1 bg-[#141414] rounded border border-white/[0.05] text-[10px]"
                              >
                                <span className="font-mono text-[#C9A84C]">
                                  {kf.property}: {kf.value}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-[#777777]">{kf.time.toFixed(1)}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      projectStore.executeOperation({
                                        op: 'delete_keyframe',
                                        clipId: selectedClip!.clipId,
                                        property: kf.property,
                                        time: kf.time,
                                      }, 'Delete keyframe');
                                    }}
                                    className="text-[#666666] hover:text-rose-400 cursor-pointer"
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sub-pill: REMOVE BG */}
              {videoSubPill === 'remove_bg' && (
                <div className="space-y-3 pt-1">
                  <div className="p-3 bg-[#161616] border border-white/[0.08] rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-[#EEF0F4]">Auto Cutout</span>
                        <span className="px-1.5 py-0.2 rounded bg-purple-900/60 text-purple-300 text-[9px] font-bold">
                          PRO
                        </span>
                      </div>
                      <input type="checkbox" className="accent-[#C9A84C] cursor-pointer" />
                    </div>
                    <p className="text-[11px] text-[#777777] leading-relaxed">
                      Automatically isolate subjects and remove background behind videos or images.
                    </p>
                  </div>

                  <div className="p-3 bg-[#161616] border border-white/[0.08] rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#EEF0F4]">Chroma Key</span>
                      <input type="checkbox" className="accent-[#C9A84C] cursor-pointer" />
                    </div>
                    <p className="text-[11px] text-[#777777] leading-relaxed">
                      Select green screen or custom background color to key out with adjustable tolerance.
                    </p>
                  </div>
                </div>
              )}

              {/* Sub-pill: MASK */}
              {videoSubPill === 'mask' && (
                <div className="space-y-3 pt-1">
                  <span className="text-[11px] text-[#888888] font-medium block">Mask Shape</span>
                  <div className="grid grid-cols-3 gap-2">
                    {['None', 'Split', 'Filmstrip', 'Circle', 'Rectangle', 'Heart'].map((shape) => (
                      <button
                        key={shape}
                        className="p-2.5 bg-[#161616] hover:bg-[#202020] border border-white/[0.08] rounded-lg text-center text-xs text-[#CCCCCC] hover:text-white transition-colors"
                      >
                        {shape}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sub-pill: RETOUCH */}
              {videoSubPill === 'retouch' && (
                <div className="space-y-3 pt-1">
                  <span className="text-[11px] text-[#888888] font-medium block">Portrait Retouch</span>
                  <div className="space-y-2.5">
                    <div>
                      <div className="flex justify-between text-[11px] text-[#888888] mb-1">
                        <span>Smooth</span>
                        <span className="font-mono text-[#EEF0F4]">0</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        defaultValue="0"
                        className="w-full h-1 accent-[#C9A84C] bg-[#222222] rounded"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] text-[#888888] mb-1">
                        <span>Skin tone</span>
                        <span className="font-mono text-[#EEF0F4]">0</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        defaultValue="0"
                        className="w-full h-1 accent-[#C9A84C] bg-[#222222] rounded"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] text-[#888888] mb-1">
                        <span>Whitening</span>
                        <span className="font-mono text-[#EEF0F4]">0</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        defaultValue="0"
                        className="w-full h-1 accent-[#C9A84C] bg-[#222222] rounded"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ANIMATION (Motion & Ken Burns) */}
          {videoTab === 'animation' && (
            <div className="flex-1 p-3 space-y-4 text-xs">
              <div>
                <span className="text-[11px] font-semibold text-[#888888] uppercase tracking-wider block mb-2">
                  Ken Burns Presets
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleQuickKenBurns('zoom-in')}
                    className="p-2.5 bg-[#161616] border border-white/[0.08] hover:border-[#C9A84C]/50 rounded-lg text-left transition-colors cursor-pointer"
                  >
                    <span className="font-bold text-[#EEF0F4] block">Zoom In</span>
                    <span className="text-[9px] text-[#777777] font-mono">1.0x → 1.25x</span>
                  </button>
                  <button
                    onClick={() => handleQuickKenBurns('zoom-out')}
                    className="p-2.5 bg-[#161616] border border-white/[0.08] hover:border-[#C9A84C]/50 rounded-lg text-left transition-colors cursor-pointer"
                  >
                    <span className="font-bold text-[#EEF0F4] block">Zoom Out</span>
                    <span className="text-[9px] text-[#777777] font-mono">1.25x → 1.0x</span>
                  </button>
                  <button
                    onClick={() => handleQuickKenBurns('pan-left')}
                    className="p-2.5 bg-[#161616] border border-white/[0.08] hover:border-[#C9A84C]/50 rounded-lg text-left transition-colors cursor-pointer"
                  >
                    <span className="font-bold text-[#EEF0F4] block">Pan Left</span>
                    <span className="text-[9px] text-[#777777] font-mono">+40px → -40px</span>
                  </button>
                  <button
                    onClick={() => handleQuickKenBurns('pan-right')}
                    className="p-2.5 bg-[#161616] border border-white/[0.08] hover:border-[#C9A84C]/50 rounded-lg text-left transition-colors cursor-pointer"
                  >
                    <span className="font-bold text-[#EEF0F4] block">Pan Right</span>
                    <span className="text-[9px] text-[#777777] font-mono">-40px → +40px</span>
                  </button>
                </div>
              </div>

              <button
                onClick={() => handleQuickKenBurns('clear')}
                className="w-full py-2 bg-[#181818] hover:bg-[#251515] text-[#888888] hover:text-rose-300 border border-white/[0.08] rounded-md text-[11px] font-medium transition-colors cursor-pointer"
              >
                Clear Motion Keyframes
              </button>

              {/* Keyframe List */}
              <div className="pt-2 border-t border-white/[0.08] space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-[#888888] uppercase tracking-wider">
                  <span>Keyframes ({(selectedClip.keyframes || []).length})</span>
                  <button
                    onClick={() => handleAddKeyframeAtPlayhead('scale')}
                    className="text-[#C9A84C] hover:text-[#E8C97A] cursor-pointer flex items-center gap-1 normal-case font-normal"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add at playhead</span>
                  </button>
                </div>
                {(selectedClip.keyframes || []).map((kf, idx) => (
                  <div
                    key={`${kf.property}-${kf.time}-${idx}`}
                    className="flex items-center justify-between p-1.5 bg-[#161616] rounded border border-white/[0.06] text-[11px]"
                  >
                    <span className="font-mono text-[#C9A84C]">
                      {kf.property}: {kf.value}
                    </span>
                    <span className="font-mono text-[#777777]">{kf.time.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: ADJUST (Color Grade & Exposure) */}
          {videoTab === 'adjust' && (
            <div className="flex-1 p-3 space-y-3.5 text-xs">
              {/* Quick Light & Exposure Presets */}
              <div className="p-2.5 bg-[#161616] border border-[#C9A84C]/30 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold text-[#C9A84C] uppercase tracking-wider">
                  <span>Quick Light & Exposure Presets</span>
                  <Sun className="w-3.5 h-3.5 text-[#C9A84C]" />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => {
                      projectStore.executeOperation(
                        {
                          op: 'set_adjust',
                          clipId: selectedClip!.clipId,
                          adjust: {
                            ...(selectedClip?.adjust || {}),
                            exposure: 20,
                            brightness: 15,
                            contrast: 8,
                          },
                        },
                        'Auto Light Boost (+25%)'
                      );
                    }}
                    className="p-1.5 bg-[#202020] hover:bg-[#2a2a2a] border border-white/10 rounded text-[10px] font-medium text-[#EEF0F4] hover:text-[#C9A84C] transition-colors cursor-pointer text-left"
                  >
                    ☀️ Auto Light (+25%)
                  </button>
                  <button
                    onClick={() => {
                      projectStore.executeOperation(
                        {
                          op: 'set_adjust',
                          clipId: selectedClip!.clipId,
                          adjust: {
                            ...(selectedClip?.adjust || {}),
                            exposure: 35,
                            brightness: 25,
                            contrast: 12,
                            saturation: 10,
                          },
                        },
                        'Studio Bright (+40%)'
                      );
                    }}
                    className="p-1.5 bg-[#202020] hover:bg-[#2a2a2a] border border-white/10 rounded text-[10px] font-medium text-[#EEF0F4] hover:text-[#C9A84C] transition-colors cursor-pointer text-left"
                  >
                    🌟 Studio Bright (+40%)
                  </button>
                  <button
                    onClick={() => {
                      projectStore.executeOperation(
                        {
                          op: 'set_adjust',
                          clipId: selectedClip!.clipId,
                          adjust: {
                            ...(selectedClip?.adjust || {}),
                            exposure: 15,
                            contrast: 25,
                            saturation: 15,
                          },
                        },
                        'High Contrast Punch'
                      );
                    }}
                    className="p-1.5 bg-[#202020] hover:bg-[#2a2a2a] border border-white/10 rounded text-[10px] font-medium text-[#EEF0F4] hover:text-[#C9A84C] transition-colors cursor-pointer text-left"
                  >
                    ⚡ High Contrast
                  </button>
                  <button
                    onClick={() => {
                      projectStore.executeOperation(
                        {
                          op: 'set_adjust',
                          clipId: selectedClip!.clipId,
                          adjust: {
                            ...(selectedClip?.adjust || {}),
                            exposure: 18,
                            brightness: 12,
                            temperature: 15,
                            saturation: 12,
                          },
                        },
                        'Warm Sunlight'
                      );
                    }}
                    className="p-1.5 bg-[#202020] hover:bg-[#2a2a2a] border border-white/10 rounded text-[10px] font-medium text-[#EEF0F4] hover:text-[#C9A84C] transition-colors cursor-pointer text-left"
                  >
                    🌅 Warm Sunlight
                  </button>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[#888888] text-[11px] mb-1">
                  <span>Exposure Gain</span>
                  <span className="font-mono text-[#C9A84C] font-semibold">
                    {selectedClip.adjust?.exposure ?? 0}
                  </span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="60"
                  value={selectedClip.adjust?.exposure ?? 0}
                  onChange={(e) => handleAdjustChange('exposure', parseInt(e.target.value))}
                  className="w-full h-1 accent-[#C9A84C] bg-[#222222] rounded cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[#888888] text-[11px] mb-1">
                  <span>Brightness</span>
                  <span className="font-mono text-[#EEF0F4]">
                    {selectedClip.adjust?.brightness ?? 0}
                  </span>
                </div>
                <input
                  type="range"
                  min="-60"
                  max="60"
                  value={selectedClip.adjust?.brightness ?? 0}
                  onChange={(e) => handleAdjustChange('brightness', parseInt(e.target.value))}
                  className="w-full h-1 accent-[#C9A84C] bg-[#222222] rounded cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[#888888] text-[11px] mb-1">
                  <span>Contrast</span>
                  <span className="font-mono text-[#EEF0F4]">
                    {selectedClip.adjust?.contrast ?? 0}
                  </span>
                </div>
                <input
                  type="range"
                  min="-40"
                  max="40"
                  value={selectedClip.adjust?.contrast ?? 0}
                  onChange={(e) => handleAdjustChange('contrast', parseInt(e.target.value))}
                  className="w-full h-1 accent-[#C9A84C] bg-[#222222] rounded cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[#888888] text-[11px] mb-1">
                  <span>Saturation</span>
                  <span className="font-mono text-[#EEF0F4]">
                    {selectedClip.adjust?.saturation ?? 0}
                  </span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={selectedClip.adjust?.saturation ?? 0}
                  onChange={(e) => handleAdjustChange('saturation', parseInt(e.target.value))}
                  className="w-full h-1 accent-[#C9A84C] bg-[#222222] rounded cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[#888888] text-[11px] mb-1">
                  <span>Temperature</span>
                  <span className="font-mono text-[#EEF0F4]">
                    {selectedClip.adjust?.temperature ?? 0}
                  </span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={selectedClip.adjust?.temperature ?? 0}
                  onChange={(e) => handleAdjustChange('temperature', parseInt(e.target.value))}
                  className="w-full h-1 accent-[#C9A84C] bg-[#222222] rounded cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[#888888] text-[11px] mb-1">
                  <span>Vignette</span>
                  <span className="font-mono text-[#EEF0F4]">
                    {selectedClip.adjust?.vignette ?? 0}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="80"
                  value={selectedClip.adjust?.vignette ?? 0}
                  onChange={(e) => handleAdjustChange('vignette', parseInt(e.target.value))}
                  className="w-full h-1 accent-[#C9A84C] bg-[#222222] rounded cursor-pointer"
                />
              </div>

              <button
                onClick={() => {
                  projectStore.executeOperation(
                    {
                      op: 'set_adjust',
                      clipId: selectedClip!.clipId,
                      adjust: { brightness: 0, contrast: 0, saturation: 0, temperature: 0, exposure: 0, vignette: 0 },
                    },
                    'Reset color adjustments'
                  );
                }}
                className="w-full py-2 bg-[#181818] hover:bg-[#202020] text-[#888888] hover:text-[#EEF0F4] border border-white/[0.08] rounded-md text-[11px] font-medium transition-colors cursor-pointer"
              >
                Reset Color Grade
              </button>
            </div>
          )}

          {/* TAB 4: AI STYLIZE */}
          {videoTab === 'ai' && (
            <div className="flex-1 p-3 space-y-3 text-xs">
              <div className="p-3 bg-[#161616] border border-white/[0.08] rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#EEF0F4]">AI Portrait Framing</span>
                  <Sparkles className="w-4 h-4 text-[#C9A84C]" />
                </div>
                <p className="text-[11px] text-[#777777] leading-relaxed">
                  Dynamic auto-centering keep faces and human subjects inside 9:16 vertical viewports.
                </p>
                <button
                  onClick={() => {
                    handleTransformChange('positionX', 0);
                    handleTransformChange('positionY', 0);
                    handleTransformChange('scale', 1.15);
                  }}
                  className="w-full py-1.5 bg-[#C9A84C]/15 hover:bg-[#C9A84C]/25 text-[#E8C97A] border border-[#C9A84C]/40 rounded text-[11px] font-medium transition-colors"
                >
                  Apply Smart Re-center
                </button>
              </div>

              <div className="p-3 bg-[#161616] border border-white/[0.08] rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#EEF0F4]">Viral Cinematic Warmth</span>
                  <Zap className="w-4 h-4 text-[#C9A84C]" />
                </div>
                <p className="text-[11px] text-[#777777] leading-relaxed">
                  Subtle contrast curve enhancement with golden hour color temperature.
                </p>
                <button
                  onClick={() => {
                    handleAdjustChange('contrast', 12);
                    handleAdjustChange('saturation', 15);
                    handleAdjustChange('temperature', 8);
                  }}
                  className="w-full py-1.5 bg-[#181818] hover:bg-[#202020] text-[#CCCCCC] border border-white/[0.08] rounded text-[11px] font-medium transition-colors"
                >
                  Apply Film Look
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* CAPCUT AUDIO DETAILS (Image 3)                                            */}
      {/* ========================================================================= */}
      {isAudioClip && (
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Main Tabs: Basic | Voice changer | Speed */}
          <div className="flex border-b border-white/[0.08] bg-[#0f0f0f] px-2 text-xs font-medium text-[#888888] shrink-0">
            <button
              id="tab-capcut-audio-basic"
              onClick={() => setAudioTab('basic')}
              className={`py-2 px-3 relative transition-colors cursor-pointer ${
                audioTab === 'basic' ? 'text-[#EEF0F4] font-semibold' : 'hover:text-[#CCCCCC]'
              }`}
            >
              Basic
              {audioTab === 'basic' && (
                <div className="absolute bottom-0 left-3 right-3 h-0.5 bg-[#C9A84C] rounded-full" />
              )}
            </button>
            <button
              id="tab-capcut-audio-voice"
              onClick={() => setAudioTab('voice_changer')}
              className={`py-2 px-3 relative transition-colors cursor-pointer ${
                audioTab === 'voice_changer' ? 'text-[#EEF0F4] font-semibold' : 'hover:text-[#CCCCCC]'
              }`}
            >
              Voice changer
              {audioTab === 'voice_changer' && (
                <div className="absolute bottom-0 left-3 right-3 h-0.5 bg-[#C9A84C] rounded-full" />
              )}
            </button>
            <button
              id="tab-capcut-audio-speed"
              onClick={() => setAudioTab('speed')}
              className={`py-2 px-3 relative transition-colors cursor-pointer ${
                audioTab === 'speed' ? 'text-[#EEF0F4] font-semibold' : 'hover:text-[#CCCCCC]'
              }`}
            >
              Speed
              {audioTab === 'speed' && (
                <div className="absolute bottom-0 left-3 right-3 h-0.5 bg-[#C9A84C] rounded-full" />
              )}
            </button>
          </div>

          {/* TAB: BASIC (Exact CapCut Image 3 Layout) */}
          {audioTab === 'basic' && (
            <div className="flex-1 p-3 space-y-4 text-xs">
              {/* Section Header: Checkbox ☑ Basic ▾, Reset ↺, Keyframe ◇ */}
              <div className="flex items-center justify-between text-xs text-[#EEF0F4] font-semibold pt-1">
                <button
                  onClick={() => setIsAudioBasicExpanded(!isAudioBasicExpanded)}
                  className="flex items-center gap-1.5 hover:text-[#C9A84C] cursor-pointer"
                >
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-[#888888] transition-transform ${
                      isAudioBasicExpanded ? 'rotate-0' : '-rotate-90'
                    }`}
                  />
                  <span>Basic</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      handleAudioSettingsChange({ volume: 0, fadeIn: 0, fadeOut: 0 });
                    }}
                    className="text-[#777777] hover:text-[#EEF0F4] cursor-pointer"
                    title="Reset Audio Levels"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleAddKeyframeAtPlayhead('opacity')}
                    className="text-[#777777] hover:text-[#C9A84C] cursor-pointer"
                    title="Keyframe Audio"
                  >
                    <Diamond className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {isAudioBasicExpanded && (
                <div className="space-y-4">
                  {/* 1. Volume Slider & Stepper */}
                  <div>
                    <div className="flex items-center justify-between text-[#888888] text-[11px] mb-1.5">
                      <span>Volume</span>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center bg-[#181818] border border-white/[0.08] rounded px-1.5 py-0.5">
                          <span className="font-mono text-[#EEF0F4] text-[11px] w-14 text-right">
                            {(selectedClip.audio?.volume ?? 0).toFixed(1)} dB
                          </span>
                          <div className="flex flex-col ml-1">
                            <button
                              onClick={() =>
                                handleAudioSettingsChange({
                                  volume: Math.min(12, (selectedClip.audio?.volume ?? 0) + 1),
                                })
                              }
                              className="text-[8px] text-[#777777] hover:text-white leading-none"
                            >
                              ▲
                            </button>
                            <button
                              onClick={() =>
                                handleAudioSettingsChange({
                                  volume: Math.max(-40, (selectedClip.audio?.volume ?? 0) - 1),
                                })
                              }
                              className="text-[8px] text-[#777777] hover:text-white leading-none"
                            >
                              ▼
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddKeyframeAtPlayhead('opacity')}
                          className="text-[#666666] hover:text-[#C9A84C] cursor-pointer"
                          title="Keyframe Volume"
                        >
                          <Diamond className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="-30"
                      max="12"
                      step="0.5"
                      value={selectedClip.audio?.volume ?? 0}
                      onChange={(e) => handleAudioSettingsChange({ volume: parseFloat(e.target.value) })}
                      className="w-full h-1 accent-[#C9A84C] bg-[#222222] rounded cursor-pointer"
                    />
                  </div>

                  {/* 2. Fade in */}
                  <div>
                    <div className="flex items-center justify-between text-[#888888] text-[11px] mb-1.5">
                      <span>Fade in</span>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center bg-[#181818] border border-white/[0.08] rounded px-1.5 py-0.5">
                          <span className="font-mono text-[#EEF0F4] text-[11px] w-12 text-right">
                            {(selectedClip.audio?.fadeIn ?? 0).toFixed(1)}
                          </span>
                          <div className="flex flex-col ml-1">
                            <button
                              onClick={() =>
                                handleAudioSettingsChange({
                                  fadeIn: Math.min(5, (selectedClip.audio?.fadeIn ?? 0) + 0.2),
                                })
                              }
                              className="text-[8px] text-[#777777] hover:text-white leading-none"
                            >
                              ▲
                            </button>
                            <button
                              onClick={() =>
                                handleAudioSettingsChange({
                                  fadeIn: Math.max(0, (selectedClip.audio?.fadeIn ?? 0) - 0.2),
                                })
                              }
                              className="text-[8px] text-[#777777] hover:text-white leading-none"
                            >
                              ▼
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddKeyframeAtPlayhead('opacity')}
                          className="text-[#666666] hover:text-[#C9A84C] cursor-pointer"
                          title="Keyframe Fade In"
                        >
                          <Diamond className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.1"
                      value={selectedClip.audio?.fadeIn ?? 0}
                      onChange={(e) => handleAudioSettingsChange({ fadeIn: parseFloat(e.target.value) })}
                      className="w-full h-1 accent-[#C9A84C] bg-[#222222] rounded cursor-pointer"
                    />
                  </div>

                  {/* 3. Fade out */}
                  <div>
                    <div className="flex items-center justify-between text-[#888888] text-[11px] mb-1.5">
                      <span>Fade out</span>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center bg-[#181818] border border-white/[0.08] rounded px-1.5 py-0.5">
                          <span className="font-mono text-[#EEF0F4] text-[11px] w-12 text-right">
                            {(selectedClip.audio?.fadeOut ?? 0).toFixed(1)}
                          </span>
                          <div className="flex flex-col ml-1">
                            <button
                              onClick={() =>
                                handleAudioSettingsChange({
                                  fadeOut: Math.min(5, (selectedClip.audio?.fadeOut ?? 0) + 0.2),
                                })
                              }
                              className="text-[8px] text-[#777777] hover:text-white leading-none"
                            >
                              ▲
                            </button>
                            <button
                              onClick={() =>
                                handleAudioSettingsChange({
                                  fadeOut: Math.max(0, (selectedClip.audio?.fadeOut ?? 0) - 0.2),
                                })
                              }
                              className="text-[8px] text-[#777777] hover:text-white leading-none"
                            >
                              ▼
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddKeyframeAtPlayhead('opacity')}
                          className="text-[#666666] hover:text-[#C9A84C] cursor-pointer"
                          title="Keyframe Fade Out"
                        >
                          <Diamond className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.1"
                      value={selectedClip.audio?.fadeOut ?? 0}
                      onChange={(e) => handleAudioSettingsChange({ fadeOut: parseFloat(e.target.value) })}
                      className="w-full h-1 accent-[#C9A84C] bg-[#222222] rounded cursor-pointer"
                    />
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-white/[0.06] my-2" />

                  {/* 4. Normalize loudness (CapCut Pro) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-[#EEF0F4]">Normalize loudness</span>
                        <span className="px-1.5 py-0.2 rounded bg-purple-900/60 text-purple-300 text-[9px] font-bold">
                          PRO
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={normalizeLoudness}
                        onChange={(e) => setNormalizeLoudness(e.target.checked)}
                        className="accent-[#C9A84C] cursor-pointer w-4 h-4"
                      />
                    </div>
                    <p className="text-[11px] text-[#777777] leading-relaxed">
                      Normalize the loudness of the selected clip or clips to a target level.
                    </p>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-white/[0.06] my-2" />

                  {/* 5. Enhance voice (CapCut Pro) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-[#EEF0F4]">Enhance voice</span>
                        <span className="px-1.5 py-0.2 rounded bg-purple-900/60 text-purple-300 text-[9px] font-bold">
                          PRO
                        </span>
                        <Info className="w-3 h-3 text-[#666666]" />
                      </div>
                      <div className="flex items-center gap-2">
                        {enhanceVoice && (
                          <button
                            onClick={() => setEnhanceLevel(65)}
                            className="text-[#666666] hover:text-[#EEF0F4]"
                            title="Reset Enhance"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </button>
                        )}
                        <input
                          type="checkbox"
                          checked={enhanceVoice}
                          onChange={(e) => setEnhanceVoice(e.target.checked)}
                          className="accent-[#C9A84C] cursor-pointer w-4 h-4"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-[#777777] leading-relaxed">
                      Cleans background noise and elevates vocal frequencies.
                    </p>
                    {enhanceVoice && (
                      <div className="pt-1">
                        <div className="flex justify-between text-[11px] text-[#888888] mb-1">
                          <span>Noise cleanup intensity</span>
                          <span className="font-mono text-[#EEF0F4]">{enhanceLevel}%</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          value={enhanceLevel}
                          onChange={(e) => setEnhanceLevel(parseInt(e.target.value))}
                          className="w-full h-1 accent-[#C9A84C] bg-[#222222] rounded cursor-pointer"
                        />
                      </div>
                    )}
                  </div>

                  {/* 6. Reduce noise */}
                  <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-[#EEF0F4]">Reduce noise</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={reduceNoise}
                      onChange={(e) => setReduceNoise(e.target.checked)}
                      className="accent-[#C9A84C] cursor-pointer w-4 h-4"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: VOICE CHANGER */}
          {audioTab === 'voice_changer' && (
            <div className="flex-1 p-3 space-y-3 text-xs">
              <span className="text-[11px] font-semibold text-[#888888] uppercase tracking-wider block">
                Voice Character Presets
              </span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'none', label: 'Original / None' },
                  { id: 'deep', label: 'Deep Pitch' },
                  { id: 'echo', label: 'Stage Echo' },
                  { id: 'megaphone', label: 'Megaphone' },
                  { id: 'chipmunk', label: 'High Chipmunk' },
                  { id: 'robot', label: 'Synthetic Robot' },
                  { id: 'studio', label: 'Studio Mic' },
                  { id: 'telephone', label: 'Lo-Fi Telephone' },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setVoicePreset(preset.id)}
                    className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                      voicePreset === preset.id
                        ? 'bg-[#222222] border-[#C9A84C] text-[#E8C97A]'
                        : 'bg-[#161616] border-white/[0.08] text-[#888888] hover:text-[#EEF0F4] hover:bg-[#1a1a1a]'
                    }`}
                  >
                    <span className="font-semibold block text-xs">{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB: SPEED */}
          {audioTab === 'speed' && (
            <div className="flex-1 p-3 space-y-4 text-xs">
              <div>
                <div className="flex justify-between text-[#888888] text-[11px] mb-1.5">
                  <span>Playback Speed</span>
                  <span className="font-mono text-[#EEF0F4] font-bold">
                    {(selectedClip.audio?.speed ?? 1.0).toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.25"
                  max="4.0"
                  step="0.05"
                  value={selectedClip.audio?.speed ?? 1.0}
                  onChange={(e) =>
                    handleAudioSettingsChange({
                      speed: parseFloat(e.target.value),
                    })
                  }
                  className="w-full h-1 accent-[#C9A84C] bg-[#222222] rounded cursor-pointer"
                />
              </div>

              {/* Speed quick pills */}
              <div className="grid grid-cols-4 gap-1.5">
                {[0.5, 1.0, 1.5, 2.0].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleAudioSettingsChange({ speed: s })}
                    className={`py-1 rounded text-center font-mono text-[11px] transition-colors cursor-pointer ${
                      (selectedClip.audio?.speed ?? 1.0) === s
                        ? 'bg-[#C9A84C]/20 border border-[#C9A84C] text-[#E8C97A]'
                        : 'bg-[#161616] border border-white/[0.08] text-[#888888] hover:text-white'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>

              {/* Pitch toggle */}
              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[#888888] text-[11px]">
                <span>Maintain pitch</span>
                <button
                  onClick={() =>
                    handleAudioSettingsChange({
                      maintainPitch: !(selectedClip.audio?.maintainPitch ?? true),
                    })
                  }
                  className={`w-7 h-4 rounded-full transition-colors relative cursor-pointer ${
                    (selectedClip.audio?.maintainPitch ?? true) ? 'bg-[#C9A84C]' : 'bg-[#2a2a2a]'
                  }`}
                >
                  <span
                    className={`w-3 h-3 rounded-full bg-[#111111] absolute top-0.5 transition-transform ${
                      (selectedClip.audio?.maintainPitch ?? true) ? 'left-3.5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
