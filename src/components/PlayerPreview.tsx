import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Repeat,
  Eye,
  EyeOff,
  Smartphone,
  Monitor,
  Square,
  AlertTriangle,
  RefreshCw,
  Upload,
  Video,
  Image as ImageIcon,
  Sun,
} from 'lucide-react';
import { projectStore, useProjectStore } from '../store/projectStore';
import {
  renderCanvasFrame,
  getVideoStatus,
  getImageStatus,
  retryVideoLoad,
} from '../services/previewRenderer';
import { audioEngine } from '../services/audioEngine';

export interface PlayerPreviewProps {
  isImmersiveMode?: boolean;
  onExitImmersive?: () => void;
}

export const PlayerPreview: React.FC<PlayerPreviewProps> = ({ isImmersiveMode = false, onExitImmersive }) => {
  const { project, playheadTime, isPlaying, isFullscreenViewer } = useProjectStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const effectiveImmersive = isImmersiveMode || isFullscreenViewer;
  const [controlsVisible, setControlsVisible] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

  const [isLooping, setIsLooping] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [showSafeZones, setShowSafeZones] = useState(false);

  const handleMouseMove = () => {
    if (!effectiveImmersive) return;
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      setControlsVisible(false);
    }, 2500);
  };

  const currentRatio = project.settings?.aspectRatio || '9:16';
  const is169 = currentRatio === '16:9';
  const is11 = currentRatio === '1:1';

  const canvasW = is169 ? 1920 : 1080;
  const canvasH = is169 ? 1080 : is11 ? 1080 : 1920;
  const aspectClass = is169
    ? 'aspect-[16/9] w-full max-w-2xl'
    : is11
    ? 'aspect-[1/1] h-full max-h-full'
    : 'aspect-[9/16] h-full max-h-full';

  // Inspect active media clip & verify source URL & loading status at playhead
  const activeMediaInfo = useMemo(() => {
    const visualTracks = project.timeline.tracks.filter(
      (t) => t.type === 'video' || t.type === 'overlay' || t.trackId.startsWith('V') || t.trackId.startsWith('L')
    );
    for (const track of visualTracks) {
      const activeClips = track.clips.filter(
        (c) => playheadTime >= c.startTime && playheadTime < c.startTime + c.duration
      );
      if (activeClips.length > 0) {
        const selectedClipId = projectStore.getState().selectedClipId;
        const clip = activeClips.find((c) => c.clipId === selectedClipId) || activeClips[activeClips.length - 1];
        if (clip.graphic || clip.textOverlay) return null; // Built-in graphics or text overlays

        const asset = project.assets[clip.assetId];
        if (!asset) {
          return {
            hasError: true,
            errorTitle: 'Missing Linked Media Asset',
            errorMessage: `Clip requires project asset "${clip.assetId}" which is not found in store assets.`,
            filename: 'Unlinked Media Asset',
            url: '',
            clip,
          };
        }
        if (!asset.url) {
          return {
            hasError: true,
            errorTitle: 'Empty Source URL',
            errorMessage: `Asset "${asset.filename || asset.assetId}" has no media source URL.`,
            filename: asset.filename || 'Empty Asset',
            url: '',
            clip,
          };
        }

        const isVideo = asset.type === 'video' || !!asset.filename?.match(/\.(mp4|mov|webm|mkv|avi|flv|m4v)$/i);
        if (isVideo) {
          const vStatus = getVideoStatus(asset.url);
          if (vStatus.status === 'error') {
            return {
              hasError: true,
              errorTitle: 'Video Source Load Error',
              errorMessage: vStatus.error || 'Failed to decode or play video file source.',
              filename: asset.filename || 'Uploaded Video',
              url: asset.url,
              asset,
              clip,
            };
          }
          return {
            hasError: false,
            status: vStatus.status,
            filename: asset.filename || 'Uploaded Video',
            url: asset.url,
            asset,
            clip,
            isVideo: true,
          };
        } else {
          const imgStatus = getImageStatus(asset.url);
          if (imgStatus.status === 'error') {
            return {
              hasError: true,
              errorTitle: 'Image Source Load Error',
              errorMessage: imgStatus.error || 'Failed to load image file source.',
              filename: asset.filename || 'Uploaded Image',
              url: asset.url,
              asset,
              clip,
            };
          }
          return {
            hasError: false,
            status: imgStatus.status,
            filename: asset.filename || 'Uploaded Image',
            url: asset.url,
            asset,
            clip,
            isImage: true,
          };
        }
      }
    }
    return null;
  }, [project, playheadTime]);

  // Real-time canvas frame render
  const drawCurrentFrame = useCallback(() => {
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      renderCanvasFrame(ctx, project, playheadTime, canvasW, canvasH, isPlaying);
    } catch (err) {
      console.warn('Frame render error in PlayerPreview:', err);
    }
  }, [project, playheadTime, canvasW, canvasH, isPlaying]);

  useEffect(() => {
    drawCurrentFrame();

    const handleRedraw = () => {
      drawCurrentFrame();
    };
    window.addEventListener('canvas-needs-redraw', handleRedraw);
    return () => {
      window.removeEventListener('canvas-needs-redraw', handleRedraw);
    };
  }, [drawCurrentFrame]);

  // Playback animation loop
  useEffect(() => {
    if (!isPlaying) return;

    let animId: number;
    let lastTimestamp = performance.now();

    const loop = (now: number) => {
      const delta = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      // Master clock is the timeline's playheadTime advancing smoothly by frame delta
      const currentTime = projectStore.getState().playheadTime;
      let newTime = currentTime + delta;
      const totalDuration = projectStore.getState().project.timeline.duration;

      // Intelligent audio synchronization
      const audioTime = audioEngine.getCurrentTime();
      if (audioTime !== null && audioEngine.getIsPlaying()) {
        const audioTrack = projectStore.getState().project.timeline.tracks.find((t) => t.type === 'audio');
        const audioClip = audioTrack?.clips.find(
          (c) => currentTime >= c.startTime && currentTime < c.startTime + c.duration
        );
        if (audioClip) {
          const expectedAudioTime = currentTime - audioClip.startTime + audioClip.sourceIn;
          const drift = audioTime - expectedAudioTime;
          // If slight drift (< 0.25s), smoothly lock cadence
          if (Math.abs(drift) < 0.25) {
            newTime = audioClip.startTime + audioTime - audioClip.sourceIn;
          } else if (Math.abs(drift) >= 0.25) {
            // Re-sync audio to playhead, never jump playhead to 0
            audioEngine.seek(Math.max(0, expectedAudioTime));
          }
        }
      }

      if (newTime >= totalDuration) {
        if (isLooping) {
          projectStore.setPlayheadTime(0, false);
          audioEngine.seek(0);
          audioEngine.playFrom(0, isMuted ? 0 : volume);
        } else {
          projectStore.setIsPlaying(false);
          projectStore.setPlayheadTime(totalDuration, false);
          return;
        }
      } else {
        // Flag isPlaybackTick = true so it never triggers manual seek resets on frame ticks
        projectStore.setPlayheadTime(newTime, true);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isPlaying, isLooping, isMuted, volume]);

  const handleTogglePlay = () => {
    projectStore.setIsPlaying(!isPlaying);
  };

  const handleSeek = (delta: number) => {
    projectStore.seekPlayheadTime(playheadTime + delta);
  };

  const handleResetToStart = () => {
    projectStore.seekPlayheadTime(0);
    audioEngine.stop();
  };

  const handleToggleLightBoost = () => {
    if (!activeMediaInfo?.clip) return;
    const currentExp = activeMediaInfo.clip.adjust?.exposure || 0;
    let nextExp = 25;
    if (currentExp >= 20 && currentExp < 40) {
      nextExp = 45;
    } else if (currentExp >= 40) {
      nextExp = 0;
    }
    projectStore.executeOperation(
      {
        op: 'set_adjust',
        clipId: activeMediaInfo.clip.clipId,
        adjust: {
          ...(activeMediaInfo.clip.adjust || {}),
          exposure: nextExp,
          brightness: nextExp > 0 ? 15 : 0,
        },
      },
      `Toggle light boost (${nextExp})`
    );
  };

  const formatTimecode = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const f = Math.floor((secs % 1) * 30);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${f.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          projectStore.selectClip(null);
        }
      }}
      className={`relative flex flex-col items-center justify-between select-none ${
        effectiveImmersive
          ? 'fixed inset-0 z-50 bg-[#000000] p-4 sm:p-6 w-screen h-screen'
          : 'h-full w-full bg-[#0a0a0a] p-1.5'
      }`}
    >
      {/* Immersive Mode Exit Button (Only visible on hover/mouse move for uninterrupted view) */}
      {effectiveImmersive && (
        <div
          className={`absolute top-4 right-4 z-50 transition-opacity duration-300 ${
            controlsVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 hover:opacity-100 pointer-events-auto'
          }`}
        >
          <button
            id="btn-exit-fullscreen-preview"
            onClick={() => {
              if (onExitImmersive) onExitImmersive();
              else projectStore.toggleFullscreenViewer(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#141414]/90 hover:bg-[#202020] text-[#EEF0F4] hover:text-[#C9A84C] border border-white/10 rounded-full shadow-2xl backdrop-blur-md text-xs font-medium cursor-pointer transition-all active:scale-95"
            title="Exit Full View (Esc)"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Exit Full View</span>
            <kbd className="text-[10px] text-[#777777] bg-white/[0.08] px-1.5 py-0.5 rounded ml-1 font-mono">
              Esc
            </kbd>
          </button>
        </div>
      )}

      {/* Preview Frame Container with Dynamic Aspect Ratio & Quick Aspect Switcher */}
      <div 
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            projectStore.selectClip(null);
          }
        }}
        className="relative flex-1 w-full flex items-center justify-center min-h-0 py-0.5"
      >
        <div className={`relative ${aspectClass} rounded-lg overflow-hidden shadow-2xl shadow-black border border-white/[0.12] bg-[#050505] group ${effectiveImmersive ? 'max-w-[calc(100vh*16/9)]' : ''}`}>
          {/* Canvas */}
          <canvas
            ref={canvasRef}
            width={canvasW}
            height={canvasH}
            className="w-full h-full object-contain cursor-pointer"
            onClick={handleTogglePlay}
          />

          {/* Safe-zones Overlay */}
          {showSafeZones && (
            <div className="absolute inset-0 pointer-events-none border border-[#C9A84C]/30 m-4 sm:m-6 rounded flex flex-col justify-between p-3">
              <div className="bg-[#121212]/90 text-[#C9A84C] text-[9px] px-2 py-0.5 rounded w-max border border-[#C9A84C]/30 font-mono">
                Top Safe Zone (UI Header)
              </div>
              <div className="text-center text-[#C9A84C]/60 text-[9px] uppercase tracking-widest font-mono">
                9:16 Active Target
              </div>
              <div className="bg-[#121212]/90 text-[#C9A84C] text-[9px] px-2 py-0.5 rounded w-max border border-[#C9A84C]/30 self-center font-mono">
                Caption Safe Area (~70%)
              </div>
            </div>
          )}

          {/* Active Verified Media Source Badge */}
          {activeMediaInfo && !activeMediaInfo.hasError && (
            <div className="absolute top-2 left-2 z-20 pointer-events-none transition-opacity opacity-0 group-hover:opacity-100 duration-200">
              <div className="bg-black/85 border border-white/15 rounded-md px-2.5 py-1 flex items-center gap-1.5 text-[10px] font-mono backdrop-blur-md text-[#d0d0d0] shadow-lg">
                {activeMediaInfo.isVideo ? (
                  <Video className="w-3 h-3 text-[#C9A84C]" />
                ) : (
                  <ImageIcon className="w-3 h-3 text-[#C9A84C]" />
                )}
                <span className="truncate max-w-[150px] text-white font-medium">{activeMediaInfo.filename}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Media Source Verified & Ready" />
              </div>
            </div>
          )}

          {/* Interactive Error UI State Overlay inside Player Container */}
          {activeMediaInfo?.hasError && (
            <div className="absolute inset-0 bg-[#0d090b]/95 border-2 border-rose-500/60 rounded-lg p-4 sm:p-6 flex flex-col items-center justify-center text-center z-40 backdrop-blur-md">
              <div className="w-12 h-12 rounded-full bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-3 animate-pulse">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1 tracking-wide">
                {activeMediaInfo.errorTitle}
              </h3>
              <p className="text-xs text-rose-300/90 font-medium max-w-xs mb-3 leading-relaxed">
                {activeMediaInfo.errorMessage}
              </p>
              <div className="bg-black/80 border border-white/10 rounded-md px-3 py-1.5 text-[11px] font-mono text-[#a0a0a0] max-w-xs truncate mb-4 w-full">
                Source: <span className="text-white font-semibold">{activeMediaInfo.filename}</span>
              </div>
              <div className="flex items-center gap-2">
                {activeMediaInfo.url && (
                  <button
                    onClick={() => {
                      if (activeMediaInfo.url) retryVideoLoad(activeMediaInfo.url);
                    }}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-md flex items-center gap-1.5 shadow-lg transition-all active:scale-95 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Loading</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    projectStore.toggleLeftPanel(true);
                  }}
                  className="px-3.5 py-1.5 bg-[#1f1f1f] hover:bg-[#2a2a2a] text-[#dedede] hover:text-white border border-white/15 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-[#C9A84C]" />
                  <span>Re-upload Media</span>
                </button>
              </div>
            </div>
          )}

          {/* Subtle Hover Play/Pause button on canvas (does not obscure artwork when paused) */}
          <div
            onClick={handleTogglePlay}
            className={`absolute inset-0 flex items-center justify-center transition-opacity cursor-pointer ${
              isPlaying
                ? 'opacity-0 hover:opacity-100 bg-black/20'
                : 'opacity-0 group-hover:opacity-100 bg-black/30'
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-[#141414]/90 text-[#EEF0F4] flex items-center justify-center pl-0.5 border border-white/20 shadow-2xl backdrop-blur-sm transform hover:scale-105 transition-transform">
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current pl-0.5" />}
            </div>
          </div>
        </div>

        {/* Vertical Aspect Ratio Switcher on Far Right */}
        {!effectiveImmersive && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 bg-[#141414]/90 p-1.5 rounded-xl border border-white/10 shadow-2xl z-20 backdrop-blur-md">
            <button
              onClick={() => projectStore.setAspectRatio('9:16')}
              title="9:16 Vertical (TikTok / Reels / Shorts)"
              className={`p-2 rounded-lg transition-all cursor-pointer ${
                currentRatio === '9:16'
                  ? 'bg-[#C9A84C] text-black shadow-md font-bold'
                  : 'text-[#a0a0a0] hover:text-white hover:bg-white/10'
              }`}
            >
              <Smartphone className="w-4 h-4" />
            </button>
            <button
              onClick={() => projectStore.setAspectRatio('16:9')}
              title="16:9 Widescreen (YouTube / Landscape)"
              className={`p-2 rounded-lg transition-all cursor-pointer ${
                currentRatio === '16:9'
                  ? 'bg-[#C9A84C] text-black shadow-md font-bold'
                  : 'text-[#a0a0a0] hover:text-white hover:bg-white/10'
              }`}
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => projectStore.setAspectRatio('1:1')}
              title="1:1 Square (Instagram / Post)"
              className={`p-2 rounded-lg transition-all cursor-pointer ${
                currentRatio === '1:1'
                  ? 'bg-[#C9A84C] text-black shadow-md font-bold'
                  : 'text-[#a0a0a0] hover:text-white hover:bg-white/10'
              }`}
            >
              <Square className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Sleek Minimalist Transport Dock - Hidden when expanded for uninterrupted viewing */}
      {!effectiveImmersive && (
        <div className="w-full max-w-md bg-[#121212]/95 border border-[#C9A84C]/25 rounded-xl px-2 sm:px-3 py-1.5 flex items-center justify-between shadow-xl backdrop-blur-md text-xs shrink-0 gap-1">
          {/* Playback Controls */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            <button
              onClick={handleResetToStart}
              className="p-1 text-[#7A8290] hover:text-[#EEF0F4] rounded hover:bg-white/[0.04] transition-colors"
              title="Jump to Start (Home)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleSeek(-1.0)}
              className="p-1 text-[#7A8290] hover:text-[#EEF0F4] rounded hover:bg-white/[0.04] transition-colors"
              title="Back 1 sec (Shift+Left)"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            {/* Primary Play Button */}
            <button
              id="btn-play-pause"
              onClick={handleTogglePlay}
              className="w-7 h-7 rounded-full bg-gradient-to-r from-[#C9A84C] to-[#E8C97A] text-black hover:brightness-110 flex items-center justify-center shadow-[0_0_12px_rgba(201,168,76,0.35)] transition-transform active:scale-95 mx-0.5 cursor-pointer"
              title="Play / Pause (Space)"
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current pl-0.5" />
              )}
            </button>

            <button
              onClick={() => handleSeek(1.0)}
              className="p-1 text-[#7A8290] hover:text-[#EEF0F4] rounded hover:bg-white/[0.04] transition-colors"
              title="Forward 1 sec (Shift+Right)"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsLooping(!isLooping)}
              className={`hidden sm:inline-flex p-1 rounded transition-colors ${
                isLooping ? 'text-[#E8C97A] bg-[#C9A84C]/15' : 'text-[#7A8290] hover:text-[#EEF0F4]'
              }`}
              title="Toggle Loop Playback"
            >
              <Repeat className="w-3 h-3" />
            </button>
          </div>

          {/* Formatted Timecode */}
          <div className="font-mono text-[10px] sm:text-[11px] text-[#EEF0F4] px-2 flex items-center gap-1 bg-black py-0.5 rounded-md border border-[#C9A84C]/30 shrink-0">
            <span className="text-[#E8C97A] font-semibold">{formatTimecode(playheadTime)}</span>
            <span className="text-[#7A8290]">/</span>
            <span className="text-[#7A8290]">{formatTimecode(project.timeline.duration)}</span>
          </div>

          {/* Right Controls: Volume, Safe zones, Expand Fullscreen */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Volume slider */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-1 text-[#7A8290] hover:text-[#EEF0F4] transition-colors"
                title="Mute / Unmute"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setVolume(val);
                  setIsMuted(false);
                }}
                className="hidden sm:block w-12 h-1 accent-[#C9A84C] bg-white/[0.08] rounded cursor-pointer"
              />
            </div>

            <div className="hidden sm:block h-3 w-px bg-white/[0.08] mx-0.5" />

            {/* Quick Light Boost Button */}
            {activeMediaInfo?.clip && (
              <button
                onClick={handleToggleLightBoost}
                className={`p-1 rounded transition-all cursor-pointer flex items-center gap-1 ${
                  (activeMediaInfo.clip.adjust?.exposure || 0) > 0
                    ? 'bg-[#C9A84C]/25 text-[#E8C97A] font-bold border border-[#C9A84C]/40'
                    : 'text-[#7A8290] hover:text-[#EEF0F4] hover:bg-white/[0.04]'
                }`}
                title={`Quick Light Boost (Current Exposure: ${(activeMediaInfo.clip.adjust?.exposure || 0) > 0 ? '+' + activeMediaInfo.clip.adjust?.exposure : 'Normal'})`}
              >
                <Sun className="w-3.5 h-3.5 text-[#C9A84C]" />
                <span className="hidden sm:inline text-[9px] font-mono">
                  {(activeMediaInfo.clip.adjust?.exposure || 0) > 0
                    ? `+${activeMediaInfo.clip.adjust?.exposure}`
                    : 'Light'}
                </span>
              </button>
            )}

            {/* Safe Zones */}
            <button
              onClick={() => setShowSafeZones(!showSafeZones)}
              className={`p-1 rounded transition-colors ${
                showSafeZones ? 'text-[#C9A84C] bg-[#C9A84C]/15' : 'text-[#7A8290] hover:text-[#EEF0F4]'
              }`}
              title="Toggle 9:16 Safe Guides"
            >
              {showSafeZones ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>

            {/* Expand Viewing Experience Button */}
            <button
              id="btn-expand-preview"
              onClick={() => projectStore.toggleFullscreenViewer(true)}
              className="p-1 text-[#7A8290] hover:text-[#EEF0F4] rounded hover:bg-white/[0.04] transition-colors cursor-pointer"
              title="Expand Viewing Experience"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
