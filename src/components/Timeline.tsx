import React, { useRef, useState, useEffect } from 'react';
import {
  Scissors,
  Trash2,
  ZoomIn,
  ZoomOut,
  Layers,
  Key,
  Film,
  Music,
  Plus,
  Magnet,
  Sparkles,
  ChevronDown,
  RotateCcw,
  RotateCw,
  History,
  Eraser,
} from 'lucide-react';
import { projectStore, useProjectStore } from '../store/projectStore';
import { Clip, Track, MediaAsset } from '../types/project';
import { useIsMobile } from '../hooks/useIsMobile';

interface DraggingClipState {
  clipId: string;
  startX: number;
  startY: number;
  originalStart: number;
  originalTrackId: string;
  targetTrackId: string;
  currentStart: number;
  duration: number;
  trackType: 'video' | 'audio' | 'overlay';
  isSnapped: boolean;
}

interface TrimmingClipState {
  clipId: string;
  side: 'left' | 'right';
  startX: number;
  originalIn: number;
  originalOut: number;
  originalStart: number;
  currentIn: number;
  currentOut: number;
  currentDuration: number;
  currentStart: number;
}

export const Timeline: React.FC = () => {
  const { project, playheadTime, zoom, selectedClipId, isMagneticRipple, isPlaying } = useProjectStore();
  const isMobile = useIsMobile();
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const trackHeadersRef = useRef<HTMLDivElement | null>(null);
  const rulerRef = useRef<HTMLDivElement | null>(null);
  const wasPlayingBeforeScrubRef = useRef(false);

  const handleTimelineScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (trackHeadersRef.current) {
      trackHeadersRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [draggingClip, setDraggingClip] = useState<DraggingClipState | null>(null);
  const [trimmingClip, setTrimmingClip] = useState<TrimmingClipState | null>(null);

  const totalDuration = Math.max(project.timeline.duration, 12);
  const timelinePixelWidth = Math.max(1400, totalDuration * zoom + 240);

  // Group and sort tracks for multi-layer NLE layout:
  // 1. Overlay/Graphic layers: L10 down to L1 (highest visual layer on top)
  // 2. Video layers: V5 down to V1 (e.g. V2 on top of V1)
  // 3. Audio tracks: A1 down to A10
  const overlayTracks = project.timeline.tracks
    .filter((t) => t.type === 'overlay' || t.trackId.startsWith('L'))
    .sort((a, b) => b.trackId.localeCompare(a.trackId, undefined, { numeric: true }));

  // Ensure L1 (Graphic Layer) is always visible so layering/stacking is instantly available without searching
  const activeOverlayTracks: Track[] =
    overlayTracks.length > 0
      ? [...overlayTracks]
      : [
          {
            trackId: 'L1',
            type: 'overlay',
            name: 'Graphic Layer (L1)',
            clips: [],
          },
        ];

  // If user is currently dragging to stack onto an upper layer like L2, dynamically present it
  if (
    draggingClip?.targetTrackId.startsWith('L') &&
    !activeOverlayTracks.some((t) => t.trackId === draggingClip.targetTrackId)
  ) {
    activeOverlayTracks.unshift({
      trackId: draggingClip.targetTrackId,
      type: 'overlay',
      name: `Graphic Layer (${draggingClip.targetTrackId})`,
      clips: [],
    });
  }

  const videoTracks = project.timeline.tracks
    .filter((t) => (t.type === 'video' || t.trackId.startsWith('V')) && !t.trackId.startsWith('L'))
    .sort((a, b) => b.trackId.localeCompare(a.trackId, undefined, { numeric: true }));

  const existingAudioTracks = project.timeline.tracks
    .filter((t) => t.type === 'audio' || t.trackId.startsWith('A'))
    .sort((a, b) => a.trackId.localeCompare(b.trackId, undefined, { numeric: true }));

  const activeAudioTracks: Track[] = [...existingAudioTracks];

  // Ensure A1 and A2 are always present in the timeline view for multi-track audio stacking
  if (!activeAudioTracks.some((t) => t.trackId === 'A1')) {
    activeAudioTracks.push({
      trackId: 'A1',
      type: 'audio',
      name: 'Voiceover (A1)',
      clips: [],
    });
  }
  if (!activeAudioTracks.some((t) => t.trackId === 'A2')) {
    activeAudioTracks.push({
      trackId: 'A2',
      type: 'audio',
      name: 'BGM / Music (A2)',
      clips: [],
    });
  }

  // Always keep an open drop lane A(max+1) below the lowest active audio track so users can stack downwards
  const maxAudioNum = Math.max(
    ...activeAudioTracks.map((t) => parseInt(t.trackId.replace('A', ''), 10) || 1)
  );
  if (maxAudioNum < 10) {
    const nextAudioTrackId = `A${maxAudioNum + 1}`;
    if (!activeAudioTracks.some((t) => t.trackId === nextAudioTrackId)) {
      activeAudioTracks.push({
        trackId: nextAudioTrackId,
        type: 'audio',
        name: `Audio Track (${nextAudioTrackId})`,
        clips: [],
      });
    }
  }

  // If user is currently dragging an audio clip to target a specific lower audio track (e.g. A4), fill up to targetTrackId
  if (draggingClip?.targetTrackId.startsWith('A')) {
    const targetNum = parseInt(draggingClip.targetTrackId.replace('A', ''), 10) || 1;
    for (let i = 1; i <= Math.min(10, targetNum); i++) {
      const tid = `A${i}`;
      if (!activeAudioTracks.some((t) => t.trackId === tid)) {
        activeAudioTracks.push({
          trackId: tid,
          type: 'audio',
          name: `Audio Track (${tid})`,
          clips: [],
        });
      }
    }
  }

  activeAudioTracks.sort((a, b) => a.trackId.localeCompare(b.trackId, undefined, { numeric: true }));

  const displayTracks: Track[] = [...activeOverlayTracks, ...videoTracks, ...activeAudioTracks];

  // Track counts & limits
  const videoCount = videoTracks.length;
  const overlayCount = overlayTracks.length;
  const audioCount = activeAudioTracks.length;

  // Detect if any track has overlapping clips right now
  const hasOverlaps = project.timeline.tracks.some((t) => {
    const sorted = [...t.clips].sort((a, b) => a.startTime - b.startTime);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i + 1].startTime < sorted[i].startTime + sorted[i].duration - 0.05) {
        return true;
      }
    }
    return false;
  });

  // Find active clip (explicitly selected or under playhead)
  let activeClip: Clip | null = null;
  if (selectedClipId) {
    for (const track of project.timeline.tracks) {
      const found = track.clips.find((c) => c.clipId === selectedClipId);
      if (found) {
        activeClip = found;
        break;
      }
    }
  }
  if (!activeClip) {
    for (const track of project.timeline.tracks) {
      const found = track.clips.find((c) => playheadTime >= c.startTime && playheadTime <= c.startTime + c.duration);
      if (found) {
        activeClip = found;
        break;
      }
    }
  }

  // Playhead scrubber drag
  const handleRulerMouseDown = (e: React.MouseEvent) => {
    projectStore.selectClip(null);
    if (isPlaying) {
      wasPlayingBeforeScrubRef.current = true;
      projectStore.setIsPlaying(false);
    } else {
      wasPlayingBeforeScrubRef.current = false;
    }
    setIsDraggingPlayhead(true);
    updatePlayheadFromMouseEvent(e);
  };

  const updatePlayheadFromMouseEvent = (e: React.MouseEvent | MouseEvent) => {
    if (!timelineScrollRef.current) return;
    const containerRect = timelineScrollRef.current.getBoundingClientRect();
    const scrollLeft = timelineScrollRef.current.scrollLeft;
    // Calculate click position relative to the scrollable content canvas
    const clickX = e.clientX - containerRect.left + scrollLeft;
    const newTime = Math.max(0, Math.min(totalDuration, Number((clickX / zoom).toFixed(2))));
    projectStore.seekPlayheadTime(newTime);
  };

  // Global Mouse Move & Mouse Up listener
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingPlayhead) {
        updatePlayheadFromMouseEvent(e);
      } else if (draggingClip) {
        const deltaPx = e.clientX - draggingClip.startX;
        const deltaY = e.clientY - draggingClip.startY;
        const deltaSeconds = deltaPx / zoom;
        let candidateStart = Math.max(0, draggingClip.originalStart + deltaSeconds);

        // Detect vertical track under pointer
        const elements = document.elementsFromPoint(e.clientX, e.clientY);
        let hoveredTrackId: string | null = null;
        let hoveredTrackType: string | null = null;

        for (const el of elements) {
          const trackEl = el.closest('[data-track-id]');
          if (trackEl) {
            hoveredTrackId = trackEl.getAttribute('data-track-id');
            hoveredTrackType = trackEl.getAttribute('data-track-type');
            break;
          }
        }

        let targetTrackId = draggingClip.originalTrackId;
        const isDraggingVisual =
          draggingClip.trackType === 'video' ||
          draggingClip.trackType === 'overlay' ||
          draggingClip.originalTrackId.startsWith('V') ||
          draggingClip.originalTrackId.startsWith('L');

        if (isDraggingVisual) {
          // Direct hover match
          if (hoveredTrackId) {
            const isHoveredVisual =
              hoveredTrackType === 'video' ||
              hoveredTrackType === 'overlay' ||
              hoveredTrackId.startsWith('V') ||
              hoveredTrackId.startsWith('L');
            if (isHoveredVisual) {
              targetTrackId = hoveredTrackId;
            }
          }

          // Gesture assist:
          if (draggingClip.originalTrackId === 'V1') {
            // Dragging upwards from V1 into Graphic Layer L1 (or L2)
            if (deltaY < -12) {
              const l1Track = project.timeline.tracks.find((t) => t.trackId === 'L1');
              const hasL1Collision = l1Track?.clips.some(
                (c) =>
                  c.clipId !== draggingClip.clipId &&
                  c.startTime < candidateStart + draggingClip.duration - 0.05 &&
                  c.startTime + c.duration > candidateStart + 0.05
              );
              targetTrackId = hasL1Collision || deltaY < -42 ? 'L2' : 'L1';
            }
          } else if (draggingClip.originalTrackId.startsWith('L')) {
            // Taking clip back from Layer to any part of Main Timeline (V1)
            if (deltaY > 10 || hoveredTrackId === 'V1') {
              targetTrackId = 'V1';
            }
          }
        } else {
          // Audio dragging downward or upward across audio tracks (A1 down to A10)
          if (hoveredTrackId && (hoveredTrackType === 'audio' || hoveredTrackId.startsWith('A'))) {
            targetTrackId = hoveredTrackId;
          } else {
            const origAudioNum = parseInt(draggingClip.originalTrackId.replace('A', ''), 10) || 1;
            const trackRowOffset = Math.round(deltaY / 28); // Each audio track lane is ~32px
            const calculatedAudioIndex = Math.max(1, Math.min(10, origAudioNum + trackRowOffset));
            targetTrackId = `A${calculatedAudioIndex}`;
          }
        }

        // Magnetic Snapping calculation
        let isSnapped = false;
        const snapThreshold = 14 / zoom;
        const snapPoints: number[] = [0, playheadTime];

        const targetTrack = project.timeline.tracks.find((t) => t.trackId === targetTrackId);
        if (targetTrack) {
          for (const other of targetTrack.clips) {
            if (other.clipId === draggingClip.clipId) continue;
            snapPoints.push(other.startTime);
            snapPoints.push(other.startTime + other.duration);
            // Snap clip end to other start
            snapPoints.push(Math.max(0, other.startTime - draggingClip.duration));
          }
        }

        // When stacking visual clips onto a layer (e.g. L1/L2), also snap directly to clips on V1
        // (so that dragging b2 on top of b1 snaps perfectly to b1.startTime and b1.endTime)
        if (isDraggingVisual && targetTrackId !== 'V1') {
          const v1Track = project.timeline.tracks.find((t) => t.trackId === 'V1');
          if (v1Track) {
            for (const vClip of v1Track.clips) {
              if (vClip.clipId === draggingClip.clipId) continue;
              snapPoints.push(vClip.startTime);
              snapPoints.push(vClip.startTime + vClip.duration);
              snapPoints.push(Math.max(0, vClip.startTime + vClip.duration - draggingClip.duration));
            }
          }
        }

        // When stacking audio, also snap to A1 clips
        if (!isDraggingVisual && targetTrackId !== 'A1') {
          const a1Track = project.timeline.tracks.find((t) => t.trackId === 'A1');
          if (a1Track) {
            for (const aClip of a1Track.clips) {
              if (aClip.clipId === draggingClip.clipId) continue;
              snapPoints.push(aClip.startTime);
              snapPoints.push(aClip.startTime + aClip.duration);
            }
          }
        }

        for (const pt of snapPoints) {
          if (Math.abs(candidateStart - pt) < snapThreshold) {
            candidateStart = pt;
            isSnapped = true;
            break;
          }
        }

        setDraggingClip((prev) =>
          prev
            ? {
                ...prev,
                currentStart: Number(candidateStart.toFixed(2)),
                targetTrackId,
                isSnapped,
              }
            : null
        );
      } else if (trimmingClip) {
        const deltaPx = e.clientX - trimmingClip.startX;
        const deltaSeconds = deltaPx / zoom;

        if (trimmingClip.side === 'right') {
          const newOut = Math.max(trimmingClip.originalIn + 0.3, trimmingClip.originalOut + deltaSeconds);
          const newDur = newOut - trimmingClip.originalIn;
          setTrimmingClip((prev) =>
            prev
              ? {
                  ...prev,
                  currentOut: Number(newOut.toFixed(2)),
                  currentDuration: Number(newDur.toFixed(2)),
                }
              : null
          );
        } else {
          const newIn = Math.min(trimmingClip.originalOut - 0.3, Math.max(0, trimmingClip.originalIn + deltaSeconds));
          const newStart = Math.max(0, trimmingClip.originalStart + deltaSeconds);
          const newDur = trimmingClip.originalOut - newIn;
          setTrimmingClip((prev) =>
            prev
              ? {
                  ...prev,
                  currentIn: Number(newIn.toFixed(2)),
                  currentStart: Number(newStart.toFixed(2)),
                  currentDuration: Number(newDur.toFixed(2)),
                }
              : null
          );
        }
      }
    };

    const handleMouseUp = () => {
      if (isDraggingPlayhead) {
        setIsDraggingPlayhead(false);
        if (wasPlayingBeforeScrubRef.current) {
          wasPlayingBeforeScrubRef.current = false;
          projectStore.setIsPlaying(true);
        }
      }

      if (draggingClip) {
        const { clipId, currentStart, originalStart, originalTrackId, targetTrackId } = draggingClip;

        if (targetTrackId !== originalTrackId) {
          // Cross-track layer move: automatic ripple on V1, non-displacing layer placement
          projectStore.moveClipToTrack(clipId, targetTrackId, currentStart);
        } else if (Math.abs(currentStart - originalStart) > 0.02) {
          // Same track move: sequence seamlessly on V1, free position on layers
          projectStore.executeOperation(
            {
              op: 'reorder_clip',
              clipId,
              newTrackId: originalTrackId,
              newStartTime: currentStart,
              displace: isMagneticRipple,
            },
            'Move clip'
          );
        }
        setDraggingClip(null);
      }

      if (trimmingClip) {
        if (trimmingClip.side === 'right') {
          projectStore.executeOperation(
            {
              op: 'trim_clip',
              clipId: trimmingClip.clipId,
              sourceIn: trimmingClip.currentIn,
              sourceOut: trimmingClip.currentOut,
              duration: trimmingClip.currentDuration,
            },
            'Trim right'
          );
        } else {
          projectStore.executeOperation(
            {
              op: 'trim_clip',
              clipId: trimmingClip.clipId,
              sourceIn: trimmingClip.currentIn,
              sourceOut: trimmingClip.originalOut,
              duration: trimmingClip.currentDuration,
              newStartTime: trimmingClip.currentStart,
            },
            'Trim clip start'
          );
        }
        setTrimmingClip(null);
      }
    };

    if (isDraggingPlayhead || draggingClip || trimmingClip) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingPlayhead, draggingClip, trimmingClip, zoom, totalDuration, isMagneticRipple, playheadTime, project.timeline.tracks]);

  // Touchpad pinch-to-zoom support
  useEffect(() => {
    const scrollEl = timelineScrollRef.current;
    if (!scrollEl) return;

    const handleWheel = (e: WheelEvent) => {
      // Touchpad pinch gesture is emitted as a wheel event with ctrlKey or metaKey = true
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault(); // Stop entire browser page zoom

        const currentZoom = projectStore.getState().zoom;
        const rect = scrollEl.getBoundingClientRect();
        const mouseXInScroll = Math.max(0, e.clientX - rect.left + scrollEl.scrollLeft);
        const focalTime = mouseXInScroll / currentZoom;

        // Smooth pinch sensitivity
        const zoomDelta = -e.deltaY * 0.45;
        const nextZoom = Math.max(12, Math.min(200, Math.round(currentZoom + zoomDelta)));

        if (nextZoom !== currentZoom) {
          projectStore.setZoom(nextZoom);

          // Maintain focal position under cursor
          requestAnimationFrame(() => {
            if (scrollEl) {
              const newMouseXInScroll = focalTime * nextZoom;
              scrollEl.scrollLeft = Math.max(0, newMouseXInScroll - (e.clientX - rect.left));
            }
          });
        }
      }
    };

    const handleGestureStart = (e: Event) => {
      e.preventDefault();
    };

    const handleGestureChange = (e: any) => {
      e.preventDefault();
      if (e.scale && e.scale !== 1) {
        const currentZoom = projectStore.getState().zoom;
        const factor = e.scale > 1 ? 1.04 : 0.96;
        const nextZoom = Math.max(12, Math.min(200, Math.round(currentZoom * factor)));
        if (nextZoom !== currentZoom) {
          projectStore.setZoom(nextZoom);
        }
      }
    };

    scrollEl.addEventListener('wheel', handleWheel, { passive: false });
    scrollEl.addEventListener('gesturestart', handleGestureStart, { passive: false });
    scrollEl.addEventListener('gesturechange', handleGestureChange, { passive: false });

    return () => {
      scrollEl.removeEventListener('wheel', handleWheel);
      scrollEl.removeEventListener('gesturestart', handleGestureStart);
      scrollEl.removeEventListener('gesturechange', handleGestureChange);
    };
  }, []);

  const handleDropExternalAsset = (e: React.DragEvent<HTMLDivElement>, targetTrackId: string) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
    if (!raw) return;

    try {
      const asset: MediaAsset = JSON.parse(raw);
      if (!asset || !asset.assetId) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const dropX = Math.max(0, e.clientX - rect.left);
      const dropTime = Math.max(0, dropX / zoom);

      const duration = asset.duration || 4.0;
      const clipId = `clip-${Date.now()}`;

      const newClip: Clip = {
        clipId,
        assetId: asset.assetId,
        trackId: targetTrackId,
        startTime: Number(dropTime.toFixed(2)),
        duration,
        sourceIn: 0,
        sourceOut: duration,
        effects: [],
        transform: { scale: 1, positionX: 0, positionY: 0, rotation: 0, opacity: 1 },
        keyframes: [],
      };

      projectStore.executeOperation(
        {
          op: 'add_clip',
          clip: newClip,
        },
        `Drop asset ${asset.filename || asset.assetId} onto ${targetTrackId}`
      );
      projectStore.selectClip(clipId);
    } catch (err) {
      console.error('Failed to parse dropped media asset:', err);
    }
  };

  // CapCut-style dynamic audio graph bars (Image 4):
  // Low volume = short bars, high volume = tall bars with amber peak tips
  const renderCapCutAudioWaveform = (clipWidthPx: number, duration: number, waveform?: number[]) => {
    const barWidth = 2;
    const barGap = 1;
    const slot = barWidth + barGap;
    const numBars = Math.max(6, Math.floor((clipWidthPx - 8) / slot));
    const sampleSource = waveform && waveform.length > 0 ? waveform : [0.2, 0.4, 0.7, 0.9, 0.6, 0.3, 0.8, 0.5];

    const bars = [];
    for (let i = 0; i < numBars; i++) {
      const progress = i / numBars;
      const idx = Math.floor(progress * sampleSource.length) % sampleSource.length;
      const baseAmp = sampleSource[idx] ?? 0.3;

      // Realistic audio cadence with quiet passages and louder accents
      const cadence = 0.55 + 0.45 * Math.sin(i * 0.28) * Math.cos(i * 0.12);
      const volumeLevel = Math.max(0.06, Math.min(1.0, baseAmp * cadence));

      // Bar height between 2px (low volume) and 20px (peak volume)
      const barHeightPx = Math.max(2, Math.round(volumeLevel * 20));
      const isPeak = volumeLevel > 0.68;

      bars.push(
        <div
          key={i}
          className="flex flex-col justify-end shrink-0"
          style={{ width: `${barWidth}px`, height: '22px' }}
        >
          <div
            style={{ height: `${barHeightPx}px` }}
            className={`w-full rounded-[1px] transition-all ${
              isPeak
                ? 'bg-gradient-to-t from-sky-500 via-sky-400 to-[#F59E0B]'
                : 'bg-sky-400/80'
            }`}
          />
        </div>
      );
    }

    return (
      <div className="relative w-full h-full flex items-center overflow-hidden">
        {/* CapCut Unity Gain / Volume Baseline (Horizontal line across clip) */}
        <div className="absolute left-0 right-0 top-[55%] h-[1px] bg-white/35 pointer-events-none z-10" />

        {/* Dynamic Waveform Graph Bars */}
        <div className="flex items-end gap-[1px] px-1 w-full h-full justify-start overflow-hidden">
          {bars}
        </div>
      </div>
    );
  };

  // Generate high-accuracy ruler ticks (CapCut Image 4 style with many intermediate sticks)
  const renderRulerTicks = () => {
    const ticks = [];
    // Sub-second intervals based on zoom:
    // When zoom is high (>= 40px/s): ticks every 0.1s (10 sticks per second)
    // When zoom is medium (20 - 39px/s): ticks every 0.2s (5 sticks per second)
    // When zoom is low (< 20px/s): ticks every 0.5s
    const step = zoom >= 45 ? 0.1 : zoom >= 24 ? 0.2 : 0.5;
    const maxTime = totalDuration + 3;

    for (let t = 0; t <= maxTime; t += step) {
      const roundedT = Math.round(t * 100) / 100;
      const left = roundedT * zoom;
      const isWholeSecond = Math.abs(roundedT - Math.round(roundedT)) < 0.01;
      const isHalfSecond = Math.abs((roundedT % 1) - 0.5) < 0.01;

      if (isWholeSecond) {
        const sec = Math.round(roundedT);
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        const label = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

        ticks.push(
          <div
            key={`sec-${sec}`}
            style={{ left: `${left}px` }}
            className="absolute top-2.5 bottom-0 pointer-events-none select-none flex items-start"
          >
            {/* Crisp vertical stick */}
            <div className="w-[1px] h-3 bg-white/70" />
            {/* Timestamp label e.g. 00:01 */}
            <span className="text-[9px] font-mono font-medium text-neutral-300 pl-1 -mt-0.5 tracking-tight">
              {label}
            </span>
          </div>
        );
      } else if (isHalfSecond) {
        ticks.push(
          <div
            key={`half-${roundedT}`}
            style={{ left: `${left}px` }}
            className="absolute top-2.5 pointer-events-none select-none"
          >
            <div className="w-[1px] h-2 bg-white/40" />
          </div>
        );
      } else {
        ticks.push(
          <div
            key={`sub-${roundedT}`}
            style={{ left: `${left}px` }}
            className="absolute top-2.5 pointer-events-none select-none"
          >
            <div className="w-[1px] h-1.5 bg-white/20" />
          </div>
        );
      }
    }
    return ticks;
  };

  const handleSplit = () => {
    projectStore.splitAtPlayhead();
  };

  const handleDelete = () => {
    projectStore.deleteSelectedClip();
  };

  const handleAddKeyframe = () => {
    if (!activeClip) return;
    const clip = activeClip;
    const timeInClip = Math.max(0, Math.min(clip.duration, playheadTime - clip.startTime));
    projectStore.executeOperation(
      {
        op: 'add_keyframe',
        clipId: clip.clipId,
        keyframe: {
          property: 'scale',
          time: Number(timeInClip.toFixed(2)),
          value: 1.15,
          easing: 'easeInOut',
        },
      },
      `Add scale keyframe at ${timeInClip.toFixed(2)}s`
    );
  };

  const canUndo = Boolean(project.history && project.history.past.length > 0);
  const canRedo = Boolean(project.history && project.history.future.length > 0);
  const undoCount = project.history?.past.length || 0;
  const lastUndoAction = project.history?.past[project.history.past.length - 1];
  const nextRedoAction = project.history?.future[project.history.future.length - 1];

  return (
    <div className="h-full flex flex-col bg-black select-none">
      {/* Timeline Action Bar */}
      <div className="h-11 py-2 px-3 sm:px-4 flex items-center justify-between border-b border-white/[0.08] bg-[#0c0c0c]/95 text-[#EEF0F4] text-xs overflow-x-auto no-scrollbar gap-1.5 shrink-0">
        {/* Left tools group (Image 6 Toolbar) */}
        <div className="flex items-center gap-1 shrink-0">
          {/* 1. Undo button */}
          <div className="relative group">
            <button
              id="btn-timeline-undo"
              onClick={() => projectStore.undo()}
              disabled={!canUndo}
              className={`w-7 h-7 flex items-center justify-center rounded-md border transition-colors ${
                canUndo
                  ? 'bg-[#161616] border-white/[0.08] hover:bg-[#222222] hover:border-white/[0.18] text-[#C9A84C] hover:text-[#E8C97A] cursor-pointer'
                  : 'bg-[#121212] border-white/[0.04] text-[#444444] cursor-not-allowed opacity-50'
              }`}
              title={`Undo ${lastUndoAction ? `"${lastUndoAction.description}"` : ''} (Ctrl/Cmd+Z)`}
              aria-label="Undo"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[#161616] border border-white/[0.1] px-1.5 py-0.5 text-[10px] font-medium text-[#f0f0f2] shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50">
              {lastUndoAction ? `Undo: ${lastUndoAction.description}` : 'Undo (Ctrl+Z)'}
            </div>
          </div>

          {/* 2. Redo button */}
          <div className="relative group">
            <button
              id="btn-timeline-redo"
              onClick={() => projectStore.redo()}
              disabled={!canRedo}
              className={`w-7 h-7 flex items-center justify-center rounded-md border transition-colors ${
                canRedo
                  ? 'bg-[#161616] border-white/[0.08] hover:bg-[#222222] hover:border-white/[0.18] text-[#C9A84C] hover:text-[#E8C97A] cursor-pointer'
                  : 'bg-[#121212] border-white/[0.04] text-[#444444] cursor-not-allowed opacity-50'
              }`}
              title={`Redo ${nextRedoAction ? `"${nextRedoAction.description}"` : ''} (Ctrl/Cmd+Shift+Z)`}
              aria-label="Redo"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
            <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[#161616] border border-white/[0.1] px-1.5 py-0.5 text-[10px] font-medium text-[#f0f0f2] shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50">
              {nextRedoAction ? `Redo: ${nextRedoAction.description}` : 'Redo (Ctrl+Shift+Z)'}
            </div>
          </div>

          <div className="h-4 w-px bg-white/[0.08] mx-1" />

          {/* 3. Split button */}
          <div className="relative group">
            <button
              id="btn-split-clip"
              onClick={handleSplit}
              disabled={!activeClip}
              className={`w-7 h-7 flex items-center justify-center rounded-md border transition-colors ${
                activeClip
                  ? 'bg-[#161616] border-white/[0.08] hover:bg-[#222222] hover:border-white/[0.18] text-[#C9A84C] hover:text-[#E8C97A] cursor-pointer'
                  : 'bg-[#121212] border-white/[0.04] text-[#444444] cursor-not-allowed opacity-50'
              }`}
              title="Split Clip at Playhead (S)"
              aria-label="Split"
            >
              <Scissors className="w-3.5 h-3.5" />
            </button>
            <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[#161616] border border-white/[0.1] px-1.5 py-0.5 text-[10px] font-medium text-[#f0f0f2] shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50">
              Split (S)
            </div>
          </div>

          {/* 4. Delete clip button */}
          <div className="relative group">
            <button
              id="btn-delete-clip"
              onClick={handleDelete}
              disabled={!activeClip}
              className={`w-7 h-7 flex items-center justify-center rounded-md border transition-colors ${
                activeClip
                  ? 'bg-[#161616] border-white/[0.08] hover:bg-[#222222] hover:border-white/[0.18] text-[#C9A84C] hover:text-[#E8C97A] cursor-pointer'
                  : 'bg-[#121212] border-white/[0.04] text-[#444444] cursor-not-allowed opacity-50'
              }`}
              title="Delete Selected Clip (Del)"
              aria-label="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[#161616] border border-white/[0.1] px-1.5 py-0.5 text-[10px] font-medium text-[#f0f0f2] shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50">
              Delete (Del)
            </div>
          </div>

          {/* Clear Timeline Clips button */}
          <div className="relative group">
            <button
              id="btn-clear-timeline-clips"
              onClick={() => {
                if (window.confirm('Clear all clips from the timeline to start fresh?')) {
                  projectStore.clearTimelineClips();
                }
              }}
              className="w-7 h-7 flex items-center justify-center rounded-md border bg-[#161616] border-white/[0.08] hover:bg-red-950/40 hover:border-red-500/40 text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
              title="Clear All Clips from Timeline"
              aria-label="Clear Timeline"
            >
              <Eraser className="w-3.5 h-3.5" />
            </button>
            <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[#161616] border border-white/[0.1] px-1.5 py-0.5 text-[10px] font-medium text-[#f0f0f2] shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50">
              Clear Timeline
            </div>
          </div>

          <div className="h-4 w-px bg-white/[0.08] mx-1" />

          {/* 5. Resolve Overlaps / Align Clips Button */}
          <div className="relative group">
            <button
              id="btn-resolve-overlaps"
              onClick={() => projectStore.resolveOverlaps()}
              className={`w-7 h-7 flex items-center justify-center rounded-md border transition-colors cursor-pointer ${
                hasOverlaps
                  ? 'bg-[#C9A84C]/20 text-[#E8C97A] border-[#C9A84C]/60 animate-pulse'
                  : 'bg-[#161616] text-[#C9A84C] hover:text-[#E8C97A] hover:bg-[#222222] border-white/[0.08] hover:border-white/[0.18]'
              }`}
              title="Align Clips: Ensure all clips sequence cleanly without gaps"
              aria-label="Align Clips"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
            <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[#161616] border border-white/[0.1] px-1.5 py-0.5 text-[10px] font-medium text-[#f0f0f2] shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50">
              {hasOverlaps ? 'Fix Overlaps' : 'Align Clips'}
            </div>
          </div>

          <div className="h-4 w-px bg-white/[0.08] mx-1" />

          {/* Direct Add Track Quick Buttons */}
          {/* 9. Add Video Track (up to 5) */}
          <div className="relative group">
            <button
              id="btn-quick-add-video-layer"
              onClick={() => projectStore.addTrack('video')}
              disabled={videoCount >= 5}
              className={`w-7 h-7 flex items-center justify-center rounded-md border transition-colors ${
                videoCount >= 5
                  ? 'bg-[#121212] border-white/[0.04] text-[#444444] cursor-not-allowed opacity-50'
                  : 'bg-[#161616] border-white/[0.08] hover:border-white/[0.18] text-[#C9A84C] hover:text-[#E8C97A] hover:bg-[#222222] cursor-pointer'
              }`}
              title={`Add Video Track (up to 5) • Current: ${videoCount}/5`}
              aria-label="Add Video Track"
            >
              <div className="relative flex items-center justify-center">
                <Film className="w-3.5 h-3.5" />
                <Plus className="w-2 h-2 text-[#E8C97A] absolute -top-1 -right-1 stroke-[3]" />
              </div>
            </button>
            <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[#161616] border border-white/[0.1] px-1.5 py-0.5 text-[10px] font-medium text-[#f0f0f2] shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50">
              {videoCount >= 5 ? 'Max Video Tracks (5/5)' : `+ Video Track (${videoCount}/5)`}
            </div>
          </div>

          {/* 10. Add Graphic / Sticker / Image Layer (up to 10) */}
          <div className="relative group">
            <button
              id="btn-quick-add-overlay-layer"
              onClick={() => projectStore.addTrack('overlay')}
              disabled={overlayCount >= 10}
              className={`w-7 h-7 flex items-center justify-center rounded-md border transition-colors ${
                overlayCount >= 10
                  ? 'bg-[#121212] border-white/[0.04] text-[#444444] cursor-not-allowed opacity-50'
                  : 'bg-[#161616] border-white/[0.08] hover:border-white/[0.18] text-[#C9A84C] hover:text-[#E8C97A] hover:bg-[#222222] cursor-pointer'
              }`}
              title={`Add Graphic / Image Layer (up to 10) • Current: ${overlayCount}/10`}
              aria-label="Add Graphic Layer"
            >
              <div className="relative flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5" />
                <Plus className="w-2 h-2 text-[#E8C97A] absolute -top-1 -right-1 stroke-[3]" />
              </div>
            </button>
            <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[#161616] border border-white/[0.1] px-1.5 py-0.5 text-[10px] font-medium text-[#f0f0f2] shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50">
              {overlayCount >= 10 ? 'Max Graphic Layers (10/10)' : `+ Graphic Layer (${overlayCount}/10)`}
            </div>
          </div>

          {/* 11. Add Audio Track (up to 10) */}
          <div className="relative group">
            <button
              id="btn-quick-add-audio-track"
              onClick={() => projectStore.addTrack('audio')}
              disabled={audioCount >= 10}
              className={`w-7 h-7 flex items-center justify-center rounded-md border transition-colors ${
                audioCount >= 10
                  ? 'bg-[#121212] border-white/[0.04] text-[#444444] cursor-not-allowed opacity-50'
                  : 'bg-[#161616] border-white/[0.08] hover:border-white/[0.18] text-[#C9A84C] hover:text-[#E8C97A] hover:bg-[#222222] cursor-pointer'
              }`}
              title={`Add Audio Track (up to 10) • Current: ${audioCount}/10`}
              aria-label="Add Audio Track"
            >
              <div className="relative flex items-center justify-center">
                <Music className="w-3.5 h-3.5" />
                <Plus className="w-2 h-2 text-[#E8C97A] absolute -top-1 -right-1 stroke-[3]" />
              </div>
            </button>
            <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[#161616] border border-white/[0.1] px-1.5 py-0.5 text-[10px] font-medium text-[#f0f0f2] shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50">
              {audioCount >= 10 ? 'Max Audio Tracks (10/10)' : `+ Audio Track (${audioCount}/10)`}
            </div>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5 pr-2 sm:pr-3">
          <div className="relative group">
            <button
              id="btn-zoom-out"
              onClick={() => projectStore.setZoom(zoom - 8)}
              className="w-7 h-7 flex items-center justify-center hover:bg-white/[0.06] rounded-md text-[#808080] hover:text-[#f0f0f2] transition-colors cursor-pointer"
              title="Zoom Out"
              aria-label="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[#161616] border border-white/[0.1] px-1.5 py-0.5 text-[10px] font-medium text-[#f0f0f2] shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50">
              Zoom Out
            </div>
          </div>

          <input
            id="timeline-zoom-slider"
            type="range"
            min="12"
            max="120"
            step="4"
            value={zoom}
            onChange={(e) => projectStore.setZoom(parseFloat(e.target.value))}
            className="w-20 h-1 accent-[#C9A84C] bg-[#222222] rounded cursor-pointer"
            title={`Timeline Zoom: ${zoom}px/sec`}
          />

          <div className="relative group">
            <button
              id="btn-zoom-in"
              onClick={() => projectStore.setZoom(zoom + 8)}
              className="w-7 h-7 flex items-center justify-center hover:bg-white/[0.06] rounded-md text-[#808080] hover:text-[#f0f0f2] transition-colors cursor-pointer"
              title="Zoom In"
              aria-label="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[#161616] border border-white/[0.1] px-1.5 py-0.5 text-[10px] font-medium text-[#f0f0f2] shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50">
              Zoom In
            </div>
          </div>

          <span className="text-[10px] text-[#808080] font-mono w-8 text-right">{zoom}px</span>

          <div className="h-4 w-px bg-white/[0.08] mx-1" />

          <button
            id="btn-collapse-timeline-dock"
            onClick={() => projectStore.toggleTimeline(true)}
            className="w-7 h-7 flex items-center justify-center hover:bg-white/[0.06] rounded-md text-[#808080] hover:text-[#f0f0f2] transition-colors cursor-pointer"
            title="Collapse Timeline Dock (Shotcut format)"
            aria-label="Collapse Timeline"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Timeline Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Track Headers (Left sidebar) - Clean icons, no v/L/S labels, synced vertical scrolling */}
        <div
          ref={trackHeadersRef}
          className="w-10 sm:w-12 flex flex-col border-r border-white/[0.08] bg-[#0c0c0c] z-10 shrink-0 overflow-y-hidden select-none"
        >
          {/* Header spacer matching ruler height (sticky at top) */}
          <div className="h-8 border-b border-white/[0.08] bg-[#0c0c0c] shrink-0 sticky top-0 z-20" />

          {/* Track Labels */}
          {displayTracks.map((track) => {
            const isOverlay = track.type === 'overlay' || track.trackId.startsWith('L');
            const isVideo = (track.type === 'video' || track.trackId.startsWith('V')) && !isOverlay;
            const isAudio = track.type === 'audio' || track.trackId.startsWith('A');
            const isHoveredTarget = draggingClip?.targetTrackId === track.trackId;
            const trackFullName = track.name || (isOverlay ? 'Graphic Layer' : isVideo ? 'Video Track' : 'Audio Track');

            return (
              <div
                key={track.trackId}
                data-track-id={track.trackId}
                data-track-type={track.type}
                title={trackFullName}
                className={`h-8 border-b border-white/[0.06] flex items-center justify-center relative group transition-colors select-none shrink-0 ${
                  isHoveredTarget
                    ? 'bg-sky-950/40 border-sky-500/50'
                    : 'bg-[#0c0c0c]'
                }`}
              >
                {/* Clean, single centered icon. No 'v', 'L', 'S', or track ID text */}
                {isOverlay ? (
                  <Sparkles className="w-3.5 h-3.5 text-amber-400/80" />
                ) : isVideo ? (
                  <Film className="w-3.5 h-3.5 text-[#38BDF8]/80" />
                ) : (
                  <Music className="w-3.5 h-3.5 text-[#2ECC71]/80" />
                )}
              </div>
            );
          })}
        </div>

        {/* Scrollable Tracks Area (Supports both horizontal timeline scroll and vertical layer scroll) */}
        <div
          ref={timelineScrollRef}
          onScroll={handleTimelineScroll}
          className="flex-1 relative overflow-auto bg-black pr-4 sm:pr-6 select-none"
        >
          <div style={{ width: `${timelinePixelWidth}px` }} className="relative min-h-full pr-16">
            {/* Time Ruler (Sticky top pin) */}
            <div
              ref={rulerRef}
              onMouseDown={(e) => {
                projectStore.selectClip(null);
                handleRulerMouseDown(e);
              }}
              className="h-8 border-b border-white/[0.08] relative cursor-pointer bg-[#0e0e0e] sticky top-0 z-20"
            >
              {renderRulerTicks()}
            </div>

            {/* Track Lanes (Height reduced by half from h-16 to h-8) */}
            {displayTracks.map((track) => {
              const isOverlay = track.type === 'overlay' || track.trackId.startsWith('L');
              const isVideo = (track.type === 'video' || track.trackId.startsWith('V')) && !isOverlay;
              const isAudio = track.type === 'audio' || track.trackId.startsWith('A');
              const isHoveredTarget = draggingClip?.targetTrackId === track.trackId;

              return (
                <div
                  key={track.trackId}
                  data-track-id={track.trackId}
                  data-track-type={track.type}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';
                  }}
                  onDrop={(e) => handleDropExternalAsset(e, track.trackId)}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const newTime = Math.max(0, Math.min(totalDuration, clickX / zoom));
                    projectStore.seekPlayheadTime(newTime);
                    projectStore.selectClip(null);
                  }}
                  className={`h-8 border-b relative cursor-pointer transition-colors ${
                    isHoveredTarget
                      ? 'bg-sky-950/30 border-sky-500/50'
                      : 'bg-black/60 border-white/[0.06]'
                  }`}
                >
                  {/* Dragged Clip Ghost Preview when hovering over target track */}
                  {draggingClip && draggingClip.targetTrackId === track.trackId && draggingClip.originalTrackId !== track.trackId && (
                    <div
                      style={{
                        left: `${draggingClip.currentStart * zoom}px`,
                        width: `${Math.max(20, draggingClip.duration * zoom)}px`,
                      }}
                      className={`absolute top-0.5 bottom-0.5 rounded-md border-2 border-dashed flex items-center px-2 overflow-hidden pointer-events-none z-30 opacity-95 ${
                        isOverlay
                          ? 'border-fuchsia-400 bg-fuchsia-950/80 ring-1 ring-fuchsia-500/40 text-fuchsia-200'
                          : isVideo
                          ? 'border-amber-400 bg-amber-950/85 ring-2 ring-amber-400/60 text-amber-200 shadow-[0_0_18px_rgba(251,191,36,0.6)]'
                          : 'border-emerald-400 bg-emerald-950/80 ring-1 ring-emerald-500/40 text-emerald-200'
                      }`}
                    >
                      <span className="text-[10px] font-medium truncate flex items-center gap-1.5">
                        {isOverlay ? (
                          <>
                            <Sparkles className="w-3 h-3 text-fuchsia-300 shrink-0" />
                            <span>Stack as Layer</span>
                          </>
                        ) : isVideo ? (
                          <>
                            <Film className="w-3.5 h-3.5 text-amber-300 shrink-0 animate-pulse" />
                            <span className="font-semibold text-amber-100 drop-shadow-[0_0_4px_rgba(251,191,36,0.8)]">
                              Displace & Push Timeline Forward
                            </span>
                          </>
                        ) : (
                          <>
                            <Music className="w-3 h-3 text-emerald-300 shrink-0" />
                            <span>Stack Audio ({track.trackId})</span>
                          </>
                        )}
                      </span>
                    </div>
                  )}

                  {track.clips.map((clip) => {
                    const isSelected = clip.clipId === selectedClipId;
                    const isCurrentlyDragging = draggingClip?.clipId === clip.clipId;
                    const isTrimmingThis = trimmingClip?.clipId === clip.clipId;

                    // Calculate position and width considering active drag or trim preview
                    let displayStart = clip.startTime;
                    let displayDur = clip.duration;

                    if (isCurrentlyDragging) {
                      displayStart = draggingClip.currentStart;
                    } else if (isTrimmingThis) {
                      displayStart = trimmingClip.currentStart;
                      displayDur = trimmingClip.currentDuration;
                    }

                    // Hide on original track if being dragged to another track
                    if (isCurrentlyDragging && draggingClip.targetTrackId !== track.trackId) {
                      return null;
                    }

                    const clipLeft = displayStart * zoom;
                    const clipWidth = displayDur * zoom;
                    const asset = project.assets[clip.assetId];

                    return (
                      <div
                        key={clip.clipId}
                        id={`timeline-clip-${clip.clipId}`}
                        style={{
                          left: `${clipLeft}px`,
                          width: `${Math.max(20, clipWidth)}px`,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          projectStore.selectClip(clip.clipId);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          projectStore.selectClip(clip.clipId);
                        }}
                        onMouseDown={(e) => {
                          if ((e.target as HTMLElement).classList.contains('trim-handle')) return;
                          projectStore.selectClip(clip.clipId);
                          setDraggingClip({
                            clipId: clip.clipId,
                            startX: e.clientX,
                            startY: e.clientY,
                            originalStart: clip.startTime,
                            originalTrackId: track.trackId,
                            targetTrackId: track.trackId,
                            currentStart: clip.startTime,
                            duration: clip.duration,
                            trackType: track.type,
                            isSnapped: false,
                          });
                        }}
                        className={`absolute top-0.5 bottom-0.5 rounded-md border flex items-center overflow-hidden cursor-grab active:cursor-grabbing transition-all ${
                          isSelected
                            ? 'border-amber-400 ring-2 ring-amber-300 shadow-[0_0_22px_rgba(251,191,36,0.85),0_0_38px_rgba(245,158,11,0.45)] z-30 brightness-115'
                            : isCurrentlyDragging
                            ? 'border-sky-400 ring-2 ring-sky-400/80 shadow-[0_0_16px_rgba(56,189,248,0.6)] z-25 opacity-90'
                            : isOverlay
                            ? 'border-purple-500/40 hover:border-purple-300/80'
                            : isVideo
                            ? 'border-white/[0.12] hover:border-white/[0.4]'
                            : 'border-sky-500/40 hover:border-sky-300/80'
                        } ${
                          isOverlay
                            ? 'bg-gradient-to-r from-purple-950/90 to-fuchsia-950/70'
                            : isVideo
                            ? 'bg-[#181818]'
                            : 'bg-[#0B253A]'
                        }`}
                      >
                        {/* Selected Media Radiant Glow Wash & Edge Brackets */}
                        {isSelected && (
                          <>
                            <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 via-amber-300/10 to-amber-400/20 pointer-events-none z-10 animate-pulse" />
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-300 shadow-[0_0_10px_rgba(251,191,36,1)] pointer-events-none z-25" />
                            <div className="absolute right-0 top-0 bottom-0 w-1 bg-amber-300 shadow-[0_0_10px_rgba(251,191,36,1)] pointer-events-none z-25" />
                            <div className="absolute left-0 right-0 top-0 h-[2px] bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.9)] pointer-events-none z-25" />
                            <div className="absolute left-0 right-0 bottom-0 h-[2px] bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.9)] pointer-events-none z-25" />
                          </>
                        )}

                        {/* Magnetic Snap highlight border */}
                        {isCurrentlyDragging && draggingClip.isSnapped && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400 shadow-sm shadow-amber-400 z-20" />
                        )}

                        {/* Trim Handle Left */}
                        <div
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            projectStore.selectClip(clip.clipId);
                            setTrimmingClip({
                              clipId: clip.clipId,
                              side: 'left',
                              startX: e.clientX,
                              originalIn: clip.sourceIn,
                              originalOut: clip.sourceOut,
                              originalStart: clip.startTime,
                              currentIn: clip.sourceIn,
                              currentOut: clip.sourceOut,
                              currentDuration: clip.duration,
                              currentStart: clip.startTime,
                            });
                          }}
                          className="trim-handle absolute left-0 top-0 bottom-0 w-1.5 hover:w-2 bg-sky-500/40 hover:bg-sky-400 cursor-ew-resize z-20 transition-all"
                        />

                        {/* Trim Handle Right */}
                        <div
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            projectStore.selectClip(clip.clipId);
                            setTrimmingClip({
                              clipId: clip.clipId,
                              side: 'right',
                              startX: e.clientX,
                              originalIn: clip.sourceIn,
                              originalOut: clip.sourceOut,
                              originalStart: clip.startTime,
                              currentIn: clip.sourceIn,
                              currentOut: clip.sourceOut,
                              currentDuration: clip.duration,
                              currentStart: clip.startTime,
                            });
                          }}
                          className="trim-handle absolute right-0 top-0 bottom-0 w-1.5 hover:w-2 bg-sky-500/40 hover:bg-sky-400 cursor-ew-resize z-20 transition-all"
                        />

                        {/* Clip Content Preview */}
                        <div className="flex items-center gap-1.5 px-1.5 py-0.5 h-full w-full overflow-hidden select-none z-10">
                          {/* Image thumbnail on video clips */}
                          {isVideo && asset && asset.url && (
                            <div className={`w-6 h-full rounded-sm overflow-hidden bg-black shrink-0 border ${isSelected ? 'border-amber-400/60 shadow-[0_0_6px_rgba(251,191,36,0.6)]' : 'border-white/[0.1]'}`}>
                              <img
                                src={asset.url}
                                alt={clip.sourceRef?.originFilename || 'thumb'}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}

                          {/* Duration count only (e.g. 6.2) */}
                          {isVideo && (
                            <div className="flex items-center min-w-0">
                              <span className={`text-[9px] font-mono font-medium ${isSelected ? 'text-amber-200 font-bold drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]' : 'text-neutral-200'}`}>
                                {displayDur.toFixed(1)}
                              </span>
                            </div>
                          )}

                          {/* Audio clip: Duration count + CapCut dynamic volume waveform (Image 4) */}
                          {!isVideo && (
                            <div className="flex items-center gap-1.5 w-full h-full relative overflow-hidden pr-1">
                              <span className={`text-[9px] font-mono font-medium shrink-0 px-1 rounded border z-10 ${isSelected ? 'bg-amber-950/80 text-amber-200 border-amber-400/60 shadow-[0_0_8px_rgba(251,191,36,0.7)]' : 'bg-sky-950/60 text-sky-200 border-sky-500/20'}`}>
                                {displayDur.toFixed(1)}
                              </span>
                              <div className="flex-1 h-full flex items-center overflow-hidden">
                                {renderCapCutAudioWaveform(clipWidth, displayDur, asset?.waveformCache)}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Gold Playhead Scrubber Line spanning all tracks */}
            <div
              style={{ left: `${playheadTime * zoom}px` }}
              className="absolute top-0 bottom-0 w-0.5 bg-[#E8C97A] z-40 pointer-events-none shadow-[0_0_10px_rgba(201,168,76,0.7)]"
            >
              {/* Professional NLE playhead top pointer (Sticky at top when scrolling down) */}
              <div
                onMouseDown={(e) => {
                  e.stopPropagation();
                  handleRulerMouseDown(e);
                }}
                className="sticky top-0 -left-[6px] w-[13px] h-[18px] bg-[#E8C97A] rounded-b-sm flex items-center justify-center shadow-[0_0_8px_rgba(201,168,76,0.9)] cursor-ew-resize pointer-events-auto hover:brightness-110 active:scale-105 transition-transform"
                title="Drag playhead scrubber"
              >
                <div className="w-[1px] h-[8px] bg-black/80 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
