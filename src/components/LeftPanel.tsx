import React, { useState, useRef } from 'react';
import {
  Wand2,
  FolderOpen,
  Sparkles,
  Music,
  Type,
  Shuffle,
  Sliders,
  Layers,
  Flame,
  Plus,
  Upload,
  Check,
  Play,
  Film,
  Info,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Trash2,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  X,
  FileAudio,
  GripVertical,
  Video,
  Grid,
  List,
} from 'lucide-react';
import { SamplePreviewCard } from './common/SamplePreviewCard';

function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new DataView(new ArrayBuffer(length));
  let channels: Float32Array[] = [];
  let sampleRate = buffer.sampleRate;
  let offset = 0;
  let pos = 0;

  function setUint16(data: number) {
    out.setUint16(pos, data, true);
    pos += 2;
  }
  function setUint32(data: number) {
    out.setUint32(pos, data, true);
    pos += 4;
  }

  // RIFF header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8);
  setUint32(0x45564157); // "WAVE"

  // fmt chunk
  setUint32(0x20746d66); // "fmt "
  setUint32(16);
  setUint16(1); // PCM
  setUint16(numOfChan);
  setUint32(sampleRate);
  setUint32(sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2);
  setUint16(16);

  // data chunk
  setUint32(0x61746164);
  setUint32(length - pos - 4);

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (offset < buffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      out.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([out], { type: 'audio/wav' });
}
import { projectStore, useProjectStore } from '../store/projectStore';
import { WORKFLOW_PRESETS } from '../data/presets';
import { Clip, MediaAsset, Track } from '../types/project';
import { startVoiceInput, TranscriptionSession } from '../services/voiceTranscription';
import { ShotcutTitleBar } from './ShotcutTitleBar';
import { useIsMobile } from '../hooks/useIsMobile';
import { TransitionsTab } from './left_panel/TransitionsTab';
import { EffectsTab } from './left_panel/EffectsTab';
import { GraphicsTab } from './left_panel/GraphicsTab';
import { TextTab } from './left_panel/TextTab';
import { AIGenerateTab } from './left_panel/AIGenerateTab';
import { CaptionsTab } from './left_panel/CaptionsTab';

export const LeftPanel: React.FC = () => {
  const { project, activeLeftTab, selectedClipId, playheadTime, isLeftPanelCollapsed } = useProjectStore();
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const videoExtractInputRef = useRef<HTMLInputElement | null>(null);
  const [isExtractingAudio, setIsExtractingAudio] = useState(false);

  const [newCaptionText, setNewCaptionText] = useState('Bold viral hook statement');
  const [isCaptionListening, setIsCaptionListening] = useState(false);
  const captionSessionRef = useRef<TranscriptionSession | null>(null);

  const [expandedPresetId, setExpandedPresetId] = useState<string | null>(null);
  const [expandedCaptionId, setExpandedCaptionId] = useState<string | null>(null);
  const [expandedAudioId, setExpandedAudioId] = useState<string | null>(null);

  const [mediaSubTab, setMediaSubTab] = useState<'uploads' | 'ai' | 'graphics'>('uploads');
  const [captionsSubTab, setCaptionsSubTab] = useState<'captions' | 'text'>('captions');

  React.useEffect(() => {
    return () => {
      if (captionSessionRef.current) {
        captionSessionRef.current.stop();
      }
    };
  }, []);

  React.useEffect(() => {
    if (activeLeftTab === 'ai_generate') {
      setMediaSubTab('ai');
    } else if (activeLeftTab === 'graphics') {
      setMediaSubTab('graphics');
    } else if (activeLeftTab === 'media') {
      setMediaSubTab('uploads');
    } else if (activeLeftTab === 'text') {
      setCaptionsSubTab('text');
    } else if (activeLeftTab === 'captions') {
      setCaptionsSubTab('captions');
    }
  }, [activeLeftTab]);

  const getPanelTitle = () => {
    if (['media', 'ai_generate', 'graphics'].includes(activeLeftTab)) return 'MEDIA';
    if (['captions', 'text'].includes(activeLeftTab)) return 'CAPTIONS & TEXT';
    if (activeLeftTab === 'transitions') return 'TRANSITIONS';
    if (activeLeftTab === 'effects') return 'ADJUST & EFFECTS';
    if (activeLeftTab === 'audio') return 'AUDIO';
    if (activeLeftTab === 'presets') return 'PRESETS';
    return 'TOOLKIT';
  };

  const tabs = [
    { id: 'ai_generate', label: 'AI Create', icon: Wand2 },
    { id: 'media', label: 'Media', icon: FolderOpen },
    { id: 'text', label: 'Text', icon: Type },
    { id: 'graphics', label: 'Graphics', icon: Layers },
    { id: 'transitions', label: 'Transitions', icon: Shuffle },
    { id: 'effects', label: 'Effects', icon: Sliders },
    { id: 'captions', label: 'Captions', icon: Mic },
    { id: 'audio', label: 'Audio', icon: Music },
    { id: 'presets', label: 'Presets', icon: Sparkles },
  ] as const;

  const handleTabClick = (tabId: typeof activeLeftTab) => {
    if (activeLeftTab === tabId) {
      projectStore.toggleLeftPanel();
    } else {
      projectStore.setActiveLeftTab(tabId);
      if (isLeftPanelCollapsed) {
        projectStore.toggleLeftPanel(false);
      }
    }
  };

  const processFile = (file: File, index: number): Promise<MediaAsset> => {
    const isAudio = file.type.startsWith('audio') || !!file.name.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/i);
    const isVideo = file.type.startsWith('video') || !!file.name.match(/\.(mp4|mov|webm|mkv|avi|m4v)$/i);
    const type: 'audio' | 'video' | 'image' = isAudio ? 'audio' : isVideo ? 'video' : 'image';

    const url = URL.createObjectURL(file);
    const assetId = `custom-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`;

    if (type === 'video') {
      return new Promise((resolve) => {
        const vid = document.createElement('video');
        vid.preload = 'metadata';
        vid.onloadedmetadata = () => {
          resolve({
            assetId,
            type: 'video',
            filename: file.name,
            url,
            duration: vid.duration && !isNaN(vid.duration) && vid.duration > 0 ? vid.duration : 10.0,
            width: vid.videoWidth || 1920,
            height: vid.videoHeight || 1080,
          });
        };
        vid.onerror = () => {
          resolve({
            assetId,
            type: 'video',
            filename: file.name,
            url,
            duration: 10.0,
            width: 1920,
            height: 1080,
          });
        };
        vid.src = url;
      });
    } else if (type === 'image') {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          resolve({
            assetId,
            type: 'image',
            filename: file.name,
            url,
            duration: 4.0,
            width: img.naturalWidth || 1080,
            height: img.naturalHeight || 1080,
          });
        };
        img.onerror = () => {
          resolve({
            assetId,
            type: 'image',
            filename: file.name,
            url,
            duration: 4.0,
            width: 1080,
            height: 1080,
          });
        };
        img.src = url;
      });
    } else {
      return new Promise((resolve) => {
        const audio = new Audio();
        audio.onloadedmetadata = () => {
          resolve({
            assetId,
            type: 'audio',
            filename: file.name,
            url,
            duration: audio.duration && !isNaN(audio.duration) && audio.duration > 0 ? audio.duration : 10.0,
          });
        };
        audio.onerror = () => {
          resolve({
            assetId,
            type: 'audio',
            filename: file.name,
            url,
            duration: 10.0,
          });
        };
        audio.src = url;
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const newAssets = await Promise.all(fileList.map((f, idx) => processFile(f, idx)));

    projectStore.addMediaAssets(newAssets);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImportAudio = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file, idx) => {
      const url = URL.createObjectURL(file);
      const audioObj = new Audio(url);
      audioObj.onloadedmetadata = () => {
        const asset: MediaAsset = {
          assetId: `audio-${Date.now()}-${idx}`,
          type: 'audio',
          filename: file.name,
          url,
          duration: audioObj.duration || 10.0,
        };
        projectStore.addMediaAsset(asset);
        handleAddMediaToTimeline(asset, false);
      };
      // Fallback if metadata event is delayed
      audioObj.onerror = () => {
        const asset: MediaAsset = {
          assetId: `audio-${Date.now()}-${idx}`,
          type: 'audio',
          filename: file.name,
          url,
          duration: 10.0,
        };
        projectStore.addMediaAsset(asset);
        handleAddMediaToTimeline(asset, false);
      };
    });

    if (audioInputRef.current) {
      audioInputRef.current.value = '';
    }
  };

  const handleExtractAudioFromVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsExtractingAudio(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) throw new Error('AudioContext unavailable');

      const audioCtx = new AudioContextClass();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      const wavBlob = audioBufferToWavBlob(audioBuffer);
      const audioUrl = URL.createObjectURL(wavBlob);
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      const filename = `${cleanName} (Extracted Audio).wav`;

      const asset: MediaAsset = {
        assetId: `audio-ext-${Date.now()}`,
        type: 'audio',
        filename,
        url: audioUrl,
        duration: audioBuffer.duration || 10.0,
      };

      projectStore.addMediaAsset(asset);
      handleAddMediaToTimeline(asset, false);
    } catch (err) {
      console.warn('Fallback audio extraction from video:', err);
      const audioUrl = URL.createObjectURL(file);
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      const filename = `${cleanName} (Extracted Audio).mp3`;

      const asset: MediaAsset = {
        assetId: `audio-ext-${Date.now()}`,
        type: 'audio',
        filename,
        url: audioUrl,
        duration: 12.0,
      };

      projectStore.addMediaAsset(asset);
      handleAddMediaToTimeline(asset, false);
    } finally {
      setIsExtractingAudio(false);
      if (videoExtractInputRef.current) {
        videoExtractInputRef.current.value = '';
      }
    }
  };

  const handleAddMediaToTimeline = (asset: MediaAsset, asOverlay = false) => {
    const duration = asset.duration || 4.0;

    let targetTrackId = 'V1';
    if (asOverlay) {
      targetTrackId = project.timeline.tracks.find((t) => t.trackId.startsWith('L'))?.trackId || 'L1';
    } else if (asset.type === 'audio') {
      // Intelligently find an audio track with no overlap at playheadTime, or stack down to next available audio track
      const existingAudioTracks = project.timeline.tracks
        .filter((t) => t.type === 'audio' || t.trackId.startsWith('A'))
        .sort((a, b) => a.trackId.localeCompare(b.trackId, undefined, { numeric: true }));

      let chosenTrackId = 'A1';
      let foundAvailable = false;

      for (const t of existingAudioTracks) {
        const hasOverlap = t.clips.some(
          (c) => playheadTime < c.startTime + c.duration - 0.05 && playheadTime + duration > c.startTime + 0.05
        );
        if (!hasOverlap) {
          chosenTrackId = t.trackId;
          foundAvailable = true;
          break;
        }
      }

      if (!foundAvailable) {
        // Stack downwards onto the next available audio track
        const maxNum = Math.max(0, ...existingAudioTracks.map((t) => parseInt(t.trackId.replace('A', ''), 10) || 1));
        const nextNum = Math.min(10, maxNum + 1);
        chosenTrackId = `A${nextNum}`;
      }

      targetTrackId = chosenTrackId;
    }

    // Ensure track exists
    let track = project.timeline.tracks.find((t) => t.trackId === targetTrackId);
    if (!track && asOverlay) {
      projectStore.executeOperation(
        {
          op: 'add_track',
          trackId: 'L1',
          type: 'overlay',
          name: 'Graphics & Overlays (L1)',
        },
        'Create L1 track'
      );
    }

    const clipId = `clip-${Date.now()}`;
    const newClip: Clip = {
      clipId,
      assetId: asset.assetId,
      trackId: targetTrackId,
      startTime: playheadTime,
      duration,
      sourceIn: 0,
      sourceOut: duration,
      keyframes: [],
      transform: {
        scale: 1,
        positionX: 0,
        positionY: 0,
        rotation: 0,
        opacity: 100,
      },
      adjust: {
        exposure: 0,
        brightness: 0,
        contrast: 0,
        saturation: 0,
        temperature: 0,
        vignette: 0,
      },
    };

    projectStore.executeOperation(
      {
        op: 'add_clip',
        clip: newClip,
      },
      `Add ${asset.filename} to ${targetTrackId}`
    );

    projectStore.selectClip(clipId);
  };

  const handleApplyCaptionStyle = (styleId: any) => {
    const vTrack = project.timeline.tracks.find((t) => t.type === 'video');
    if (!vTrack) return;

    const ops: any[] = [];
    vTrack.clips.forEach((c) => {
      if (c.captions && c.captions.length > 0) {
        c.captions.forEach((cap) => {
          ops.push({
            op: 'edit_caption',
            captionId: cap.captionId,
            changes: { style: styleId },
          });
        });
      }
    });

    if (ops.length > 0) {
      projectStore.executeOperation(
        {
          op: 'batch_operations',
          operations: ops,
          description: `Apply ${styleId} caption style`,
        },
        `Apply ${styleId} caption style`
      );
    }
  };

  const handleApplyPresetWorkflow = (presetId: string) => {
    const preset = WORKFLOW_PRESETS.find((p) => p.presetId === presetId);
    if (!preset) return;
    const vTrack = project.timeline.tracks.find((t) => t.type === 'video');
    if (!vTrack) return;

    const ops: any[] = [];
    vTrack.clips.forEach((c) => {
      if (c.captions && c.captions.length > 0) {
        c.captions.forEach((cap) => {
          ops.push({
            op: 'edit_caption',
            captionId: cap.captionId,
            changes: { style: preset.captionStyle },
          });
        });
      }
    });

    if (ops.length > 0) {
      projectStore.executeOperation(
        {
          op: 'batch_operations',
          operations: ops,
          description: `Apply ${preset.label} preset`,
        },
        `Apply ${preset.label} preset`
      );
    }
  };

  // If collapsed on desktop, VerticalMenuBar already serves as the left rail (replacing Image 6)
  if (isLeftPanelCollapsed && !isMobile) {
    return null;
  }

  return (
    <aside className="w-80 lg:w-88 bg-[#0c0c0c] border-r border-white/10 flex flex-col shrink-0 z-30 select-none overflow-hidden">
      {/* Title bar with collapse button */}
      <ShotcutTitleBar
        title={getPanelTitle()}
        onClose={() => projectStore.toggleLeftPanel(true)}
      />

      {/* Main Drawer Content Panel */}
      <div className="flex-1 overflow-y-auto p-3.5 text-xs text-[#d0d0d0] space-y-4">
        {/* TAB GROUP 1: MEDIA (Uploads, AI Create, Graphics) */}
        {(activeLeftTab === 'media' || activeLeftTab === 'ai_generate' || activeLeftTab === 'graphics') && (
          <div className="space-y-4">
            {/* Sub-navigation Toggles */}
            <div className="flex items-center gap-1 bg-[#121212] p-1 rounded-lg border border-white/[0.08]">
              <button
                onClick={() => setMediaSubTab('uploads')}
                className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mediaSubTab === 'uploads'
                    ? 'bg-[#1f1f1f] text-[#C9A84C] border border-[#C9A84C]/40 shadow-sm'
                    : 'text-[#808080] hover:text-[#EEF0F4] hover:bg-white/[0.04]'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Uploads</span>
              </button>

              <button
                onClick={() => setMediaSubTab('ai')}
                className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mediaSubTab === 'ai'
                    ? 'bg-[#1f1f1f] text-[#C9A84C] border border-[#C9A84C]/40 shadow-sm'
                    : 'text-[#808080] hover:text-[#EEF0F4] hover:bg-white/[0.04]'
                }`}
              >
                <Wand2 className="w-3.5 h-3.5 text-[#C9A84C]" />
                <span>AI Create</span>
              </button>

              <button
                onClick={() => setMediaSubTab('graphics')}
                className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mediaSubTab === 'graphics'
                    ? 'bg-[#1f1f1f] text-[#C9A84C] border border-[#C9A84C]/40 shadow-sm'
                    : 'text-[#808080] hover:text-[#EEF0F4] hover:bg-white/[0.04]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Graphics</span>
              </button>
            </div>

            {/* Sub-view: Uploads */}
            {mediaSubTab === 'uploads' && (
              <div className="space-y-4">
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    multiple
                    accept="image/*,audio/*,video/*"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2 bg-[#1a1a1a] hover:bg-[#252525] text-[#dedede] hover:text-[#C9A84C] border border-white/10 hover:border-[#C9A84C]/50 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload</span>
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#a0a0a0] font-semibold">Available Project Assets</span>
                  <span className="text-[10px] text-[#707070] font-mono">
                    {Object.keys(project.assets).length} items
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {(Object.values(project.assets) as MediaAsset[]).map((asset) => {
                    const isImage = asset.type === 'image';
                    const isVideo = asset.type === 'video';
                    return (
                      <div
                        key={asset.assetId}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/json', JSON.stringify(asset));
                          e.dataTransfer.setData('text/plain', JSON.stringify(asset));
                        }}
                        onClick={() => handleAddMediaToTimeline(asset, false)}
                        title="Click to insert at playhead or drag directly onto timeline"
                        className="p-2 bg-[#141414] border border-white/10 hover:border-[#C9A84C]/60 rounded-lg flex flex-col justify-between transition-all group relative cursor-grab active:cursor-grabbing hover:bg-[#191919]"
                      >
                        <div className="w-full h-28 bg-[#0a0a0a] rounded mb-1.5 overflow-hidden relative border border-white/5 flex items-center justify-center p-0.5">
                          {isVideo ? (
                            <div className="w-full h-full relative flex items-center justify-center overflow-hidden rounded">
                              <video
                                src={asset.url}
                                className="max-w-full max-h-full object-contain rounded"
                                muted
                                preload="metadata"
                              />
                              <div className="absolute top-1 left-1 bg-black/85 px-1.5 py-0.5 rounded text-[8px] font-mono text-[#C9A84C] flex items-center gap-1 border border-sky-500/30 backdrop-blur-sm">
                                <Video className="w-2.5 h-2.5 text-sky-400" />
                                <span>{asset.width && asset.height ? `${asset.width}×${asset.height}` : 'VIDEO'}</span>
                              </div>
                            </div>
                          ) : isImage ? (
                            <div className="w-full h-full relative flex items-center justify-center overflow-hidden rounded">
                              <img
                                src={asset.url}
                                alt={asset.filename}
                                className="max-w-full max-h-full object-contain rounded group-hover:scale-105 transition-transform"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute top-1 left-1 bg-black/85 px-1.5 py-0.5 rounded text-[8px] font-mono text-[#C9A84C] border border-amber-500/30 backdrop-blur-sm">
                                {asset.width && asset.height ? `${asset.width}×${asset.height}` : 'IMG'}
                              </div>
                            </div>
                          ) : (
                            <div className="w-full h-full bg-[#0d0d0d] border border-white/5 rounded flex items-center justify-center text-[#C9A84C]">
                              <Music className="w-6 h-6" />
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-1">
                          <div className="text-[10px] font-medium text-[#c0c0c0] truncate flex-1" title={asset.filename}>
                            {asset.filename}
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              projectStore.deleteAsset(asset.assetId);
                            }}
                            title="Delete media asset"
                            className="p-1 text-[#707070] hover:text-red-400 hover:bg-red-950/60 rounded transition-colors cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sub-view: AI Create */}
            {mediaSubTab === 'ai' && <AIGenerateTab />}

            {/* Sub-view: Graphics */}
            {mediaSubTab === 'graphics' && <GraphicsTab />}
          </div>
        )}

        {/* TAB GROUP 2: CAPTIONS & TEXT (Auto Captions, Motion Titles) */}
        {(activeLeftTab === 'captions' || activeLeftTab === 'text') && (
          <div className="space-y-4">
            {/* Sub-navigation Toggles */}
            <div className="flex items-center gap-1 bg-[#121212] p-1 rounded-lg border border-white/[0.08]">
              <button
                onClick={() => setCaptionsSubTab('captions')}
                className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  captionsSubTab === 'captions'
                    ? 'bg-[#1f1f1f] text-[#C9A84C] border border-[#C9A84C]/40 shadow-sm'
                    : 'text-[#808080] hover:text-[#EEF0F4] hover:bg-white/[0.04]'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Auto Captions</span>
              </button>

              <button
                onClick={() => setCaptionsSubTab('text')}
                className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  captionsSubTab === 'text'
                    ? 'bg-[#1f1f1f] text-[#C9A84C] border border-[#C9A84C]/40 shadow-sm'
                    : 'text-[#808080] hover:text-[#EEF0F4] hover:bg-white/[0.04]'
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                <span>Text & Titles</span>
              </button>
            </div>

            {/* Sub-view: Auto Captions */}
            {captionsSubTab === 'captions' && <CaptionsTab />}

            {/* Sub-view: Text & Titles */}
            {captionsSubTab === 'text' && <TextTab />}
          </div>
        )}

        {/* TAB: TRANSITIONS */}
        {activeLeftTab === 'transitions' && <TransitionsTab />}

        {/* TAB: ADJUST & EFFECTS */}
        {activeLeftTab === 'effects' && <EffectsTab />}

        {/* TAB: AUDIO */}
        {activeLeftTab === 'audio' && (
          <div className="space-y-3">
            {/* Audio Action Buttons */}
            <div className="space-y-2">
              <input
                type="file"
                ref={audioInputRef}
                onChange={handleImportAudio}
                multiple
                accept="audio/*"
                className="hidden"
              />
              <input
                type="file"
                ref={videoExtractInputRef}
                onChange={handleExtractAudioFromVideo}
                accept="video/*"
                className="hidden"
              />

              <button
                onClick={() => audioInputRef.current?.click()}
                className="w-full py-2 bg-[#1a1a1a] hover:bg-[#252525] text-[#dedede] hover:text-[#C9A84C] border border-white/10 hover:border-[#C9A84C]/50 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-[#C9A84C]" />
                <span>Import Audio File</span>
              </button>

              <button
                onClick={() => videoExtractInputRef.current?.click()}
                disabled={isExtractingAudio}
                className="w-full py-2 bg-[#1a1a1a] hover:bg-[#252525] text-[#dedede] hover:text-[#C9A84C] border border-white/10 hover:border-[#C9A84C]/50 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <FileAudio className="w-3.5 h-3.5 text-[#C9A84C]" />
                <span>{isExtractingAudio ? 'Extracting Audio Track...' : 'Extract Audio from Video'}</span>
              </button>
            </div>

            <span className="text-[11px] font-semibold text-[#808080] uppercase tracking-wider block pt-1">
              Soundtracks & Atmosphere
            </span>

            {[
              {
                id: 'tension-synth',
                title: 'Cyber Tension Synth Pad',
                desc: 'Sub-bass drone with building psychological tension',
                duration: 25.0,
                url: 'https://cdn.freesound.org/previews/568/568600_12394276-lq.mp3',
              },
              {
                id: 'cinematic-pulse',
                title: 'Cinematic Low Pulse',
                desc: 'Rhythmic bass impact hits and cinematic riser atmosphere',
                duration: 20.0,
                url: 'https://cdn.freesound.org/previews/415/415804_5121236-lq.mp3',
              },
              {
                id: 'ambient-lofi',
                title: 'Deep Focus Ambient Vinyl',
                desc: 'Mellow warm vinyl crackle and soothing chord progression',
                duration: 30.0,
                url: 'https://cdn.freesound.org/previews/387/387232_1474204-lq.mp3',
              },
            ].map((sound) => {
              const isExpanded = expandedAudioId === sound.id;
              return (
                <div
                  key={sound.id}
                  className={`bg-[#141414] border rounded-lg transition-all overflow-hidden ${
                    isExpanded
                      ? 'border-[#C9A84C]/60 bg-[#181814]'
                      : 'border-white/10 hover:border-[#C9A84C]/40'
                  }`}
                >
                  <button
                    onClick={() => setExpandedAudioId(isExpanded ? null : sound.id)}
                    className="w-full p-2.5 flex items-center justify-between text-left cursor-pointer group"
                  >
                    <span className="text-xs font-bold text-white group-hover:text-[#C9A84C] transition-colors truncate">
                      {sound.title}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[9px] font-mono text-[#808080]">{sound.duration}s</span>
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-[#C9A84C]" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-[#808080] group-hover:text-[#C9A84C]" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-2.5 pb-2.5 pt-1 border-t border-white/5 space-y-2">
                      <p className="text-[10px] text-[#a0a0a0] leading-relaxed">{sound.desc}</p>
                      <button
                        onClick={() => {
                          const asset: MediaAsset = {
                            assetId: sound.id,
                            type: 'audio',
                            filename: `${sound.title}.mp3`,
                            url: sound.url,
                            duration: sound.duration,
                          };
                          projectStore.addMediaAsset(asset);
                          handleAddMediaToTimeline(asset, false);
                        }}
                        className="w-full py-1 bg-[#1f1f1f] hover:bg-[#2a2a2a] text-[#dedede] hover:text-[#C9A84C] border border-white/10 hover:border-[#C9A84C]/50 rounded text-[10px] font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add to Audio Track A1</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* TAB: WORKFLOW PRESETS & RECIPES */}
        {(activeLeftTab === 'presets' || activeLeftTab === 'recipes') && (
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-[#808080] uppercase tracking-wider block mb-1">
              Viral Pacing Presets
            </span>

            {WORKFLOW_PRESETS.map((preset) => {
              const isExpanded = expandedPresetId === preset.presetId;
              return (
                <div
                  key={preset.presetId}
                  className={`bg-[#141414] border rounded-lg transition-all overflow-hidden ${
                    isExpanded
                      ? 'border-[#C9A84C]/60 bg-[#181814]'
                      : 'border-white/10 hover:border-[#C9A84C]/40'
                  }`}
                >
                  <button
                    onClick={() => setExpandedPresetId(isExpanded ? null : preset.presetId)}
                    className="w-full p-2.5 flex items-center justify-between text-left cursor-pointer group"
                  >
                    <span className="text-xs font-bold text-white group-hover:text-[#C9A84C] transition-colors">
                      {preset.label}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {!isExpanded && (
                        <span className="text-[9px] font-mono text-[#C9A84C] bg-[#1a1a1a] px-1.5 py-0.5 rounded border border-white/10">
                          {preset.captionStyle}
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-[#C9A84C]" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-[#808080] group-hover:text-[#C9A84C]" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-2.5 pb-2.5 pt-1 border-t border-white/5 space-y-2">
                      <p className="text-[10px] text-[#a0a0a0] leading-relaxed">{preset.description}</p>
                      
                      <div className="flex items-center gap-2 text-[9px] font-mono text-[#808080]">
                        <span className="px-1.5 py-0.5 rounded bg-[#0a0a0a] border border-white/10 text-[#C9A84C]">
                          Tag: {preset.captionStyle}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-[#0a0a0a] border border-white/10">
                          Avg: {preset.pacing.avgClipDuration}s
                        </span>
                      </div>

                      <button
                        onClick={() => handleApplyPresetWorkflow(preset.presetId)}
                        className="w-full py-1.5 bg-[#C9A84C] hover:bg-[#d9b85c] text-black rounded text-[10px] font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Apply Workflow</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};
