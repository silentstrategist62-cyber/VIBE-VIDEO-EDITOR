import { useEffect } from 'react';
import { projectStore } from '../store/projectStore';
import { ProjectDocument } from '../types/project';

export interface ShortcutItem {
  key: string;
  label: string;
  category: 'Playback' | 'Navigation' | 'Editing' | 'Timeline';
}

export const KEYBOARD_SHORTCUTS_LIST: ShortcutItem[] = [
  { key: 'Space', label: 'Play / Pause video', category: 'Playback' },
  { key: '← / →', label: 'Step 1 frame backward / forward', category: 'Navigation' },
  { key: 'Shift + ← / →', label: 'Step 1 second backward / forward', category: 'Navigation' },
  { key: '↑ / ↓', label: 'Jump to previous / next cut point', category: 'Navigation' },
  { key: 'Home / End', label: 'Jump to timeline start / end', category: 'Navigation' },
  { key: 'J / K / L', label: 'Shuttle rewind / pause / play', category: 'Playback' },
  { key: 'S or C', label: 'Split clip at playhead', category: 'Editing' },
  { key: 'Del / Backspace', label: 'Delete selected clip', category: 'Editing' },
  { key: 'K', label: 'Add keyframe at playhead', category: 'Editing' },
  { key: 'Ctrl/Cmd + Z', label: 'Undo operation', category: 'Timeline' },
  { key: 'Ctrl/Cmd + Shift + Z / Y', label: 'Redo operation', category: 'Timeline' },
  { key: '+ / -', label: 'Zoom timeline in / out', category: 'Timeline' },
  { key: 'M', label: 'Toggle audio mute', category: 'Playback' },
  { key: 'Ctrl/Cmd + ,', label: 'Open Settings & Skills', category: 'Timeline' },
  { key: '?', label: 'Open keyboard shortcuts guide', category: 'Timeline' },
  { key: 'Esc', label: 'Close modals / active overlays', category: 'Timeline' },
];

/**
 * Calculates all cut points (clip boundaries + timeline bounds) across all tracks
 */
export function getTimelineCutPoints(project: ProjectDocument): number[] {
  const points = new Set<number>();
  points.add(0);
  points.add(Number(project.timeline.duration.toFixed(2)));

  for (const track of project.timeline.tracks) {
    for (const clip of track.clips) {
      points.add(Number(clip.startTime.toFixed(2)));
      points.add(Number((clip.startTime + clip.duration).toFixed(2)));
    }
  }

  return Array.from(points).sort((a, b) => a - b);
}

/**
 * Global Keyboard Shortcut hook for NLE video editing
 */
export function useGlobalKeyboardShortcuts(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Guard against capturing keystrokes when typing in inputs or text areas
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        // Still allow Escape to blur input
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      const state = projectStore.getState();
      const { project, playheadTime, isPlaying, zoom } = state;
      const fps = project.settings?.fps || 30;
      const frameStep = 1 / fps;
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      // Handle Undo / Redo
      if (isCmdOrCtrl) {
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          if (e.shiftKey) {
            projectStore.redo();
          } else {
            projectStore.undo();
          }
          return;
        }
        if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          projectStore.redo();
          return;
        }
        // Zoom in/out with Ctrl/Cmd + Plus/Minus
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          projectStore.setZoom(zoom + 8);
          return;
        }
        if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          projectStore.setZoom(zoom - 8);
          return;
        }
      }

      // Space: Play / Pause
      if (e.code === 'Space') {
        e.preventDefault();
        projectStore.setIsPlaying(!isPlaying);
        return;
      }

      // Frame stepping: Left / Right Arrows
      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (e.shiftKey) {
          // Jump 1 full second
          projectStore.seekPlayheadTime(Math.max(0, playheadTime - 1.0));
        } else {
          // Step back exactly 1 frame
          const currentFrame = Math.round(playheadTime * fps);
          const targetFrame = Math.max(0, currentFrame - 1);
          projectStore.seekPlayheadTime(Number((targetFrame * frameStep).toFixed(4)));
        }
        return;
      }

      if (e.code === 'ArrowRight') {
        e.preventDefault();
        const maxDuration = project.timeline.duration;
        if (e.shiftKey) {
          // Jump 1 full second
          projectStore.seekPlayheadTime(Math.min(maxDuration, playheadTime + 1.0));
        } else {
          // Step forward exactly 1 frame
          const currentFrame = Math.round(playheadTime * fps);
          const maxFrame = Math.round(maxDuration * fps);
          const targetFrame = Math.min(maxFrame, currentFrame + 1);
          projectStore.seekPlayheadTime(Number((targetFrame * frameStep).toFixed(4)));
        }
        return;
      }

      // Jump to previous / next cut point: Up / Down Arrows
      if (e.code === 'ArrowUp') {
        e.preventDefault();
        const cutPoints = getTimelineCutPoints(project);
        const epsilon = 0.04;
        const prevPoints = cutPoints.filter((pt) => pt < playheadTime - epsilon);
        if (prevPoints.length > 0) {
          projectStore.seekPlayheadTime(prevPoints[prevPoints.length - 1]);
        } else {
          projectStore.seekPlayheadTime(0);
        }
        return;
      }

      if (e.code === 'ArrowDown') {
        e.preventDefault();
        const cutPoints = getTimelineCutPoints(project);
        const epsilon = 0.04;
        const nextPoints = cutPoints.filter((pt) => pt > playheadTime + epsilon);
        if (nextPoints.length > 0) {
          projectStore.seekPlayheadTime(nextPoints[0]);
        } else {
          projectStore.seekPlayheadTime(project.timeline.duration);
        }
        return;
      }

      // Home & End: Jump to Start / End
      if (e.code === 'Home') {
        e.preventDefault();
        projectStore.seekPlayheadTime(0);
        return;
      }

      if (e.code === 'End') {
        e.preventDefault();
        projectStore.seekPlayheadTime(project.timeline.duration);
        return;
      }

      // Split Clip at Playhead: S or C
      if (e.code === 'KeyS' || e.code === 'KeyC') {
        e.preventDefault();
        projectStore.splitAtPlayhead();
        return;
      }

      // Delete Selected Clip: Delete or Backspace
      if (e.code === 'Delete' || e.code === 'Backspace') {
        e.preventDefault();
        projectStore.deleteSelectedClip();
        return;
      }

      // Add Keyframe: K
      if (e.code === 'KeyK' && !isCmdOrCtrl) {
        e.preventDefault();
        projectStore.addKeyframeAtPlayhead();
        return;
      }

      // J / K / L Shuttle Controls
      if (e.code === 'KeyJ' && !isCmdOrCtrl) {
        e.preventDefault();
        projectStore.setIsPlaying(false);
        // Step back 5 frames
        projectStore.seekPlayheadTime(Math.max(0, playheadTime - 5 * frameStep));
        return;
      }

      if (e.code === 'KeyL' && !isCmdOrCtrl) {
        e.preventDefault();
        projectStore.setIsPlaying(true);
        return;
      }

      // Zoom Timeline: Plus or Minus
      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        projectStore.setZoom(zoom + 8);
        return;
      }

      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        projectStore.setZoom(zoom - 8);
        return;
      }

      // Help / Cheat Sheet: ? or /
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        projectStore.toggleShortcuts();
        return;
      }

      // Settings & Skills: Ctrl/Cmd + ,
      if (isCmdOrCtrl && (e.key === ',' || e.code === 'Comma')) {
        e.preventDefault();
        projectStore.toggleSettings();
        return;
      }

      // Escape: Close modals or exit full viewing experience
      if (e.code === 'Escape') {
        if (state.isFullscreenViewer) {
          projectStore.toggleFullscreenViewer(false);
          return;
        }
        if (state.isSettingsOpen) {
          projectStore.toggleSettings(false);
          return;
        }
        if (state.isShortcutsOpen) {
          projectStore.toggleShortcuts(false);
          return;
        }
        if (state.isExportOpen) {
          projectStore.toggleExport(false);
          return;
        }
        if (state.isAutonomousModalOpen) {
          projectStore.toggleAutonomousModal(false);
          return;
        }
        if (state.isChatOpen) {
          projectStore.toggleChat(false);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled]);
}
