import { useState, useEffect } from 'react';
import { ProjectDocument, Operation, Clip, ChatMessage, OperationLog, Timeline, EditorSkill, MediaAsset, ActiveSkillSessionState } from '../types/project';
import { ApiKeyConfig } from '../types/apiKeys';
import { DEFAULT_EDITOR_SKILLS } from '../data/defaultSkills';
import { DEFAULT_API_KEYS } from '../data/defaultApiKeys';
import { createInitialDemoProject } from '../data/sampleProject';
import { validateSkillInputs } from '../features/skills/skillInputChecker';
import {
  applyOperation,
  undo,
  redo,
  undoOperation,
  redoOperation,
  jumpToHistoryStep,
  clearProjectHistory,
  findClip,
} from '../services/operationApplier';
import { audioEngine, computeWaveformPeaks } from '../services/audioEngine';

export interface ProjectListItem {
  projectId: string;
  name: string;
  updatedAt: string;
  duration: number;
  clipCount: number;
  aspectRatio: string;
}

export interface HistoryToastState {
  message: string;
  type: 'undo' | 'redo' | 'jump' | 'clear';
  id: number;
}

export interface ProjectState {
  project: ProjectDocument;
  playheadTime: number;
  isPlaying: boolean;
  zoom: number; // pixels per second
  selectedClipId: string | null;
  selectedCaptionId: string | null;
  activeLeftTab:
    | 'ai_generate'
    | 'graphics'
    | 'text'
    | 'media'
    | 'presets'
    | 'captions'
    | 'transitions'
    | 'effects'
    | 'audio'
    | 'recipes';
  isChatOpen: boolean;
  chatPanelWidth: number;
  isExportOpen: boolean;
  isAutonomousModalOpen: boolean;
  isShortcutsOpen: boolean;
  isHistoryModalOpen: boolean;
  isFullscreenViewer: boolean;
  isSettingsOpen: boolean;
  isApiKeysOpen: boolean;
  settingsActiveTab: 'skills' | 'timeline' | 'canvas' | 'export' | 'ai' | 'history' | 'api';
  skills: EditorSkill[];
  apiKeys: ApiKeyConfig[];
  isPromptLoading: boolean;
  isLeftPanelCollapsed: boolean;
  isRightPanelOpen: boolean;
  isTimelineCollapsed: boolean;
  showTitleBars: boolean;
  layoutPreset: 'default' | 'ai_focus' | 'editing' | 'color_fx' | 'compact';
  floatingPanels: {
    chat?: boolean;
    left?: boolean;
    right?: boolean;
  };
  isMagneticRipple: boolean;
  mobileView: 'timeline' | 'agent' | 'media' | 'inspector';
  historyToast: HistoryToastState | null;
  availableProjects: ProjectListItem[];
  activeSkillSession: ActiveSkillSessionState;
}

let initialProject = createInitialDemoProject();
// Ensure L1 (overlay layer), V1 (main video), and A1 (audio) are ready initially
initialProject.timeline.tracks = initialProject.timeline.tracks.filter(
  (t) => t.trackId === 'L1' || t.trackId === 'V1' || t.trackId === 'A1' || t.clips.length > 0
);
if (!initialProject.timeline.tracks.some((t) => t.trackId === 'L1')) {
  initialProject.timeline.tracks.unshift({
    trackId: 'L1',
    type: 'overlay',
    name: 'Graphic Layer (L1)',
    clips: [],
  });
}

// Ensure any existing demo overlaps are neatly sequenced
for (const track of initialProject.timeline.tracks) {
  track.clips.sort((a, b) => a.startTime - b.startTime);
  for (let i = 0; i < track.clips.length - 1; i++) {
    const current = track.clips[i];
    const next = track.clips[i + 1];
    const currentEnd = Number((current.startTime + current.duration).toFixed(2));
    if (next.startTime < currentEnd - 0.05) {
      const shift = Number((currentEnd - next.startTime).toFixed(2));
      for (let j = i + 1; j < track.clips.length; j++) {
        track.clips[j].startTime = Number((track.clips[j].startTime + shift).toFixed(2));
      }
    }
  }
}

function getInitialSkills(): EditorSkill[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem('remix_video_skills');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasLongform = parsed.some((s: EditorSkill) => s.id === 'skill-strategist-longform');
          const hasShortform = parsed.some((s: EditorSkill) => s.id === 'skill-strategist-shortform');
          if (hasLongform && hasShortform) {
            return parsed;
          }
        }
      }
    }
  } catch {
    // Ignore
  }
  return DEFAULT_EDITOR_SKILLS.map((s) => ({ ...s }));
}

function getInitialApiKeys(): ApiKeyConfig[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem('remix_api_keys_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch {
    // Ignore
  }
  return DEFAULT_API_KEYS.map((k) => ({ ...k }));
}

const initialSkills = getInitialSkills();
const initialApiKeys = getInitialApiKeys();
initialProject.skills = initialSkills;
if (!initialProject.settings) {
  initialProject.settings = {
    aspectRatio: '9:16',
    resolution: { width: 1080, height: 1920 },
    fps: 30,
  };
}
initialProject.settings.skills = initialSkills;

let state: ProjectState = {
  project: initialProject,
  playheadTime: 0,
  isPlaying: false,
  zoom: 36,
  selectedClipId: null, // null by default so Viewer covers full width until clip clicked
  selectedCaptionId: null,
  activeLeftTab: 'media',
  isChatOpen: false,
  chatPanelWidth: 384,
  isExportOpen: false,
  isAutonomousModalOpen: false,
  isShortcutsOpen: false,
  isHistoryModalOpen: false,
  isFullscreenViewer: false,
  isSettingsOpen: false,
  isApiKeysOpen: false,
  settingsActiveTab: 'skills',
  skills: initialSkills,
  apiKeys: initialApiKeys,
  isPromptLoading: false,
  isLeftPanelCollapsed: true,
  isRightPanelOpen: false,
  isTimelineCollapsed: false,
  showTitleBars: true,
  layoutPreset: 'default',
  floatingPanels: {},
  isMagneticRipple: true,
  mobileView: 'timeline',
  historyToast: null,
  availableProjects: [],
  activeSkillSession: {
    activeSkillId: null,
    activeSkillName: null,
    currentStepIndex: 0,
    completedStepIds: [],
    choiceHistory: {},
    missingInputs: [],
    status: 'idle',
    pendingConfirmationSkill: null,
  },
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export const projectStore = {
  getState() {
    return state;
  },

  setState(partial: Partial<ProjectState>) {
    state = { ...state, ...partial };
    notify();
  },

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  setProject(newProject: ProjectDocument) {
    state = {
      ...state,
      project: newProject,
      playheadTime: Math.min(state.playheadTime, newProject.timeline.duration),
    };
    notify();
    this.syncBackend(newProject);
  },

  createEmptyProject(name = 'New Project') {
    const emptyProject: ProjectDocument = {
      projectId: `proj-${Date.now().toString(36)}`,
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      manifest: { segments: [] },
      history: { past: [], future: [] },
      chatLog: [],
      settings: { aspectRatio: '9:16', resolution: { width: 1080, height: 1920 }, fps: 30 },
      assets: {},
      timeline: {
        duration: 30, // 30 sec default timeline view
        tracks: [
          { trackId: 'L1', type: 'overlay', name: 'Graphic Layer (L1)', clips: [] },
          { trackId: 'V1', type: 'video', name: 'Main Video (V1)', clips: [] },
          { trackId: 'A1', type: 'audio', name: 'Voiceover (A1)', clips: [] },
          { trackId: 'A2', type: 'audio', name: 'BGM / Music (A2)', clips: [] },
        ],
      },
    };
    state = { ...state, project: emptyProject, playheadTime: 0, selectedClipId: null };
    notify();
    this.syncBackend(emptyProject);
  },

  setPlayheadTime(time: number, isPlaybackTick = false) {
    const clamped = Math.max(0, Math.min(state.project.timeline.duration, Number(time.toFixed(2))));
    state = { ...state, playheadTime: clamped };
    notify();

    // If this is a manual seek (NOT a continuous playback tick), sync the audio engine
    if (!isPlaybackTick) {
      const audioClips = state.project.timeline.tracks
        .filter((t) => t.type === 'audio' || t.trackId.startsWith('A'))
        .flatMap((t) => t.clips);
      const audioClip = audioClips.find(
        (c) => clamped >= c.startTime && clamped <= c.startTime + c.duration
      );

      if (audioClip) {
        const asset = state.project.assets[audioClip.assetId];
        if (asset?.url) {
          audioEngine.setAudioSource(asset.url);
          const clipOffset = Math.max(0, clamped - audioClip.startTime + audioClip.sourceIn);
          audioEngine.seek(clipOffset);
          if (state.isPlaying) {
            const vol = (audioClip.audio?.volume ?? 0) <= -50 ? 0 : Math.pow(10, (audioClip.audio?.volume ?? 0) / 20);
            const spd = audioClip.audio?.speed ?? 1.0;
            const normalize = audioClip.audio?.normalizeLoudness ?? false;
            audioEngine.playFrom(clipOffset, vol, spd, normalize);
          }
        }
      } else {
        audioEngine.pause();
      }
    }
  },

  seekPlayheadTime(time: number) {
    this.setPlayheadTime(time, false);
  },

  setIsPlaying(isPlaying: boolean) {
    state = { ...state, isPlaying };
    notify();

    const audioClips = state.project.timeline.tracks
      .filter((t) => t.type === 'audio' || t.trackId.startsWith('A'))
      .flatMap((t) => t.clips);
    const audioClip = audioClips.find(
      (c) => state.playheadTime >= c.startTime && state.playheadTime <= c.startTime + c.duration
    );

    if (isPlaying) {
      if (audioClip) {
        const asset = state.project.assets[audioClip.assetId];
        if (asset?.url) {
          audioEngine.setAudioSource(asset.url);
          const clipOffset = Math.max(0, state.playheadTime - audioClip.startTime + audioClip.sourceIn);
          const vol = (audioClip.audio?.volume ?? 0) <= -50 ? 0 : Math.pow(10, (audioClip.audio?.volume ?? 0) / 20);
          const spd = audioClip.audio?.speed ?? 1.0;
          const normalize = audioClip.audio?.normalizeLoudness ?? false;
          audioEngine.playFrom(clipOffset, vol, spd, normalize);
        }
      }
    } else {
      audioEngine.pause();
    }
  },

  executeOperation(op: Operation, description?: string) {
    try {
      const result = applyOperation(state.project, op, true, description);
      state = { ...state, project: result.document };
      notify();
      this.syncBackend(result.document);
    } catch (err) {
      console.error('Failed to execute operation:', err);
    }
  },

  undo() {
    const { document: updated, action } = undoOperation(state.project);
    if (updated !== state.project && action) {
      let nextSelectedClipId = state.selectedClipId;
      if (action.affectedClipId) {
        const found = findClip(updated, action.affectedClipId);
        nextSelectedClipId = found ? action.affectedClipId : null;
      }

      const toastId = Date.now();
      state = {
        ...state,
        project: updated,
        selectedClipId: nextSelectedClipId,
        historyToast: {
          message: `Undone: ${action.description || 'Edit'}`,
          type: 'undo',
          id: toastId,
        },
      };
      notify();
      this.syncBackend(updated);

      setTimeout(() => {
        if (state.historyToast?.id === toastId) {
          state = { ...state, historyToast: null };
          notify();
        }
      }, 2500);
    }
  },

  redo() {
    const { document: updated, action } = redoOperation(state.project);
    if (updated !== state.project && action) {
      let nextSelectedClipId = state.selectedClipId;
      if (action.affectedClipId) {
        const found = findClip(updated, action.affectedClipId);
        nextSelectedClipId = found ? action.affectedClipId : null;
      }

      const toastId = Date.now();
      state = {
        ...state,
        project: updated,
        selectedClipId: nextSelectedClipId,
        historyToast: {
          message: `Redone: ${action.description || 'Edit'}`,
          type: 'redo',
          id: toastId,
        },
      };
      notify();
      this.syncBackend(updated);

      setTimeout(() => {
        if (state.historyToast?.id === toastId) {
          state = { ...state, historyToast: null };
          notify();
        }
      }, 2500);
    }
  },

  jumpToHistory(targetIndex: number, isTargetFuture: boolean) {
    const { document: updated, targetAction } = jumpToHistoryStep(state.project, targetIndex, isTargetFuture);
    if (updated !== state.project) {
      let nextSelectedClipId = state.selectedClipId;
      if (targetAction?.affectedClipId) {
        const found = findClip(updated, targetAction.affectedClipId);
        nextSelectedClipId = found ? targetAction.affectedClipId : null;
      }

      const toastId = Date.now();
      state = {
        ...state,
        project: updated,
        selectedClipId: nextSelectedClipId,
        historyToast: {
          message: `Restored: ${targetAction?.description || 'history state'}`,
          type: 'jump',
          id: toastId,
        },
      };
      notify();
      this.syncBackend(updated);

      setTimeout(() => {
        if (state.historyToast?.id === toastId) {
          state = { ...state, historyToast: null };
          notify();
        }
      }, 2500);
    }
  },

  clearHistory() {
    const updated = clearProjectHistory(state.project);
    const toastId = Date.now();
    state = {
      ...state,
      project: updated,
      historyToast: {
        message: 'History stack cleared',
        type: 'clear',
        id: toastId,
      },
    };
    notify();
    this.syncBackend(updated);

    setTimeout(() => {
      if (state.historyToast?.id === toastId) {
        state = { ...state, historyToast: null };
        notify();
      }
    }, 2500);
  },

  toggleHistoryModal(open?: boolean) {
    state = {
      ...state,
      isHistoryModalOpen: open !== undefined ? open : !state.isHistoryModalOpen,
    };
    notify();
  },

  replaceTimelineWithUndo(newTimeline: Timeline, description = 'Apply preset assembly') {
    const clonePrev = JSON.parse(JSON.stringify(state.project.timeline));
    const cloneNext = JSON.parse(JSON.stringify(newTimeline));
    const op: Operation = {
      op: 'batch_operations',
      operations: [],
      description,
    };
    const logEntry: OperationLog = {
      id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      op,
      inverse: op,
      timestamp: new Date().toISOString(),
      description,
      timelineSnapshotBefore: clonePrev,
      timelineSnapshotAfter: cloneNext,
    };
    const updated = {
      ...state.project,
      timeline: cloneNext,
      history: {
        past: [...(state.project.history?.past || []), logEntry],
        future: [],
      },
      updatedAt: new Date().toISOString(),
    };
    state = {
      ...state,
      project: updated,
      playheadTime: 0,
      selectedClipId: newTimeline.tracks[0]?.clips[0]?.clipId || null,
    };
    notify();
    this.syncBackend(updated);
  },

  setZoom(zoom: number) {
    state = { ...state, zoom: Math.max(12, Math.min(140, zoom)) };
    notify();
  },

  selectClip(clipId: string | null) {
    state = { ...state, selectedClipId: clipId, selectedCaptionId: null };
    notify();
  },

  selectCaption(captionId: string | null) {
    state = { ...state, selectedCaptionId: captionId };
    notify();
  },

  setActiveLeftTab(tab: ProjectState['activeLeftTab']) {
    state = { ...state, activeLeftTab: tab };
    notify();
  },

  toggleLeftPanel(collapsed?: boolean) {
    state = {
      ...state,
      isLeftPanelCollapsed: collapsed !== undefined ? collapsed : !state.isLeftPanelCollapsed,
    };
    notify();
  },

  toggleRightPanel(open?: boolean) {
    state = {
      ...state,
      isRightPanelOpen: open !== undefined ? open : !state.isRightPanelOpen,
    };
    notify();
  },

  toggleMagneticRipple(enable?: boolean) {
    state = {
      ...state,
      isMagneticRipple: enable !== undefined ? enable : !state.isMagneticRipple,
    };
    notify();
  },

  resolveOverlaps(trackId?: string) {
    this.executeOperation({
      op: 'resolve_overlaps',
      trackId,
    }, 'Auto-displace overlapping clips');
  },

  addTrack(type: 'video' | 'overlay' | 'audio'): boolean {
    const tracks = state.project.timeline.tracks;

    if (type === 'video') {
      const existingVideoTracks = tracks.filter(
        (t) => (t.type === 'video' || t.trackId.startsWith('V')) && !t.trackId.startsWith('L')
      );
      if (existingVideoTracks.length >= 5) {
        return false;
      }
      // Find smallest unused index 1..5
      let nextNum = 1;
      for (let i = 1; i <= 5; i++) {
        if (!existingVideoTracks.some((t) => t.trackId === `V${i}`)) {
          nextNum = i;
          break;
        }
      }
      const nextTrackId = `V${nextNum}`;
      this.executeOperation({
        op: 'add_track',
        trackId: nextTrackId,
        type: 'video',
        name: nextNum === 1 ? 'Main Video (V1)' : `Video Track (${nextTrackId})`,
      }, `Add Video Track ${nextTrackId}`);
      return true;
    } else if (type === 'overlay') {
      const existingOverlayTracks = tracks.filter(
        (t) => t.type === 'overlay' || t.trackId.startsWith('L')
      );
      if (existingOverlayTracks.length >= 10) {
        return false;
      }
      // Find smallest unused index 1..10
      let nextNum = 1;
      for (let i = 1; i <= 10; i++) {
        if (!existingOverlayTracks.some((t) => t.trackId === `L${i}`)) {
          nextNum = i;
          break;
        }
      }
      const nextTrackId = `L${nextNum}`;
      this.executeOperation({
        op: 'add_track',
        trackId: nextTrackId,
        type: 'overlay',
        name: `Graphic Layer (${nextTrackId})`,
      }, `Add Graphic / Sticker Layer ${nextTrackId}`);
      return true;
    } else {
      const existingAudioTracks = tracks.filter(
        (t) => t.type === 'audio' || t.trackId.startsWith('A')
      );
      if (existingAudioTracks.length >= 10) {
        return false;
      }
      // Find smallest unused index 1..10
      let nextNum = 1;
      for (let i = 1; i <= 10; i++) {
        if (!existingAudioTracks.some((t) => t.trackId === `A${i}`)) {
          nextNum = i;
          break;
        }
      }
      const nextTrackId = `A${nextNum}`;
      this.executeOperation({
        op: 'add_track',
        trackId: nextTrackId,
        type: 'audio',
        name: nextNum === 1 ? 'Voiceover (A1)' : nextNum === 2 ? 'BGM / Music (A2)' : `Audio Track (${nextTrackId})`,
      }, `Add Audio Track ${nextTrackId}`);
      return true;
    }
  },

  addAsset(asset: MediaAsset) {
    const nextAssets = { ...state.project.assets, [asset.assetId]: asset };
    const updatedProject = { ...state.project, assets: nextAssets };
    state = { ...state, project: updatedProject };
    notify();
    this.syncBackend(updatedProject);
    // Asynchronously compute waveform peaks for audio assets
    if (asset.type === 'audio' && asset.url && !asset.waveformCache) {
      computeWaveformPeaks(asset.url).then((peaks) => {
        if (peaks.length > 0) {
          const enrichedAsset = { ...asset, waveformCache: peaks };
          const updatedAssets = { ...state.project.assets, [asset.assetId]: enrichedAsset };
          const enriched = { ...state.project, assets: updatedAssets };
          state = { ...state, project: enriched };
          notify();
          this.syncBackend(enriched);
        }
      }).catch(() => {});
    }
  },

  addMediaAsset(asset: MediaAsset) {
    this.addAsset(asset);
  },

  addMediaAssets(assets: MediaAsset[]) {
    if (!assets || assets.length === 0) return;
    const nextAssets = { ...state.project.assets };
    for (const a of assets) {
      nextAssets[a.assetId] = a;
    }
    const updatedProject = { ...state.project, assets: nextAssets };
    state = { ...state, project: updatedProject };
    notify();
    this.syncBackend(updatedProject);
  },

  setAspectRatio(aspectRatio: '9:16' | '16:9' | '1:1') {
    const res = aspectRatio === '16:9' ? { width: 1920, height: 1080 } : aspectRatio === '1:1' ? { width: 1080, height: 1080 } : { width: 1080, height: 1920 };
    const updatedSettings = {
      ...state.project.settings,
      aspectRatio,
      resolution: res,
    };
    const updatedProject = { ...state.project, settings: updatedSettings };
    state = { ...state, project: updatedProject };
    notify();
    this.syncBackend(updatedProject);
  },

  clearTimelineClips() {
    const updatedTracks = state.project.timeline.tracks.map((t) => ({
      ...t,
      clips: [],
    }));
    const updatedProject = {
      ...state.project,
      timeline: {
        ...state.project.timeline,
        tracks: updatedTracks,
      },
    };
    state = { ...state, project: updatedProject, selectedClipId: null };
    notify();
    this.syncBackend(updatedProject);
  },

  deleteAsset(assetId: string) {
    const nextAssets = { ...state.project.assets };
    delete nextAssets[assetId];
    const updatedProject = { ...state.project, assets: nextAssets };
    state = { ...state, project: updatedProject };
    notify();
    this.syncBackend(updatedProject);
  },

  deleteTrack(trackId: string) {
    this.executeOperation({
      op: 'delete_track',
      trackId,
    }, `Delete Track ${trackId}`);
  },

  moveClipToTrack(clipId: string, newTrackId: string, newStartTime?: number) {
    const found = findClip(state.project, clipId);
    if (!found) return;
    const targetStart = newStartTime !== undefined ? newStartTime : found.clip.startTime;
    this.executeOperation({
      op: 'reorder_clip',
      clipId,
      newTrackId,
      newStartTime: targetStart,
      displace: state.isMagneticRipple,
    }, `Move clip to ${newTrackId}`);
  },

  toggleChat(open?: boolean) {
    state = { ...state, isChatOpen: open !== undefined ? open : !state.isChatOpen };
    notify();
  },

  setChatPanelWidth(width: number) {
    const clamped = Math.max(260, Math.min(760, Math.round(width)));
    state = { ...state, chatPanelWidth: clamped };
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('remix_agent_panel_width', String(clamped));
      }
    } catch {
      // Ignore
    }
    notify();
  },

  setMobileView(view: ProjectState['mobileView']) {
    state = { ...state, mobileView: view };
    notify();
  },

  toggleTimeline(collapsed?: boolean) {
    state = { ...state, isTimelineCollapsed: collapsed !== undefined ? collapsed : !state.isTimelineCollapsed };
    notify();
  },

  toggleShowTitleBars(show?: boolean) {
    state = { ...state, showTitleBars: show !== undefined ? show : !state.showTitleBars };
    notify();
  },

  toggleFloatingPanel(panel: 'chat' | 'left' | 'right', floating?: boolean) {
    const current = state.floatingPanels || {};
    const nextVal = floating !== undefined ? floating : !current[panel];
    state = {
      ...state,
      floatingPanels: {
        ...current,
        [panel]: nextVal,
      },
    };
    notify();
  },

  setLayoutPreset(preset: 'default' | 'ai_focus' | 'editing' | 'color_fx' | 'compact') {
    if (preset === 'default') {
      state = {
        ...state,
        layoutPreset: 'default',
        isChatOpen: true,
        isLeftPanelCollapsed: true,
        isRightPanelOpen: false,
        isTimelineCollapsed: false,
      };
    } else if (preset === 'ai_focus') {
      state = {
        ...state,
        layoutPreset: 'ai_focus',
        isChatOpen: true,
        isLeftPanelCollapsed: true,
        isRightPanelOpen: false,
        isTimelineCollapsed: false,
      };
    } else if (preset === 'editing') {
      state = {
        ...state,
        layoutPreset: 'editing',
        isChatOpen: false,
        isLeftPanelCollapsed: false,
        isRightPanelOpen: true,
        isTimelineCollapsed: false,
      };
    } else if (preset === 'color_fx') {
      state = {
        ...state,
        layoutPreset: 'color_fx',
        isChatOpen: false,
        isLeftPanelCollapsed: false,
        activeLeftTab: 'effects',
        isRightPanelOpen: true,
        isTimelineCollapsed: false,
      };
    } else if (preset === 'compact') {
      state = {
        ...state,
        layoutPreset: 'compact',
        isChatOpen: false,
        isLeftPanelCollapsed: true,
        isRightPanelOpen: false,
        isTimelineCollapsed: false,
      };
    }
    notify();
  },

  restoreDefaultLayout() {
    this.setLayoutPreset('default');
  },

  toggleExport(open?: boolean) {
    state = { ...state, isExportOpen: open !== undefined ? open : !state.isExportOpen };
    notify();
  },

  toggleAutonomousModal(open?: boolean) {
    state = { ...state, isAutonomousModalOpen: open !== undefined ? open : !state.isAutonomousModalOpen };
    notify();
  },

  toggleShortcuts(open?: boolean) {
    state = { ...state, isShortcutsOpen: open !== undefined ? open : !state.isShortcutsOpen };
    notify();
  },

  toggleFullscreenViewer(open?: boolean) {
    state = {
      ...state,
      isFullscreenViewer: open !== undefined ? open : !state.isFullscreenViewer,
    };
    notify();
  },

  toggleSettings(open?: boolean, tab?: 'skills' | 'timeline' | 'canvas' | 'export' | 'ai' | 'history' | 'api') {
    const nextOpen = open !== undefined ? open : !state.isSettingsOpen;
    state = {
      ...state,
      isSettingsOpen: nextOpen,
      settingsActiveTab: tab || state.settingsActiveTab || 'skills',
    };
    notify();
  },

  setSettingsTab(tab: 'skills' | 'timeline' | 'canvas' | 'export' | 'ai' | 'history' | 'api') {
    state = { ...state, settingsActiveTab: tab };
    notify();
  },

  toggleApiKeys(open?: boolean) {
    state = { ...state, isApiKeysOpen: open !== undefined ? open : !state.isApiKeysOpen };
    notify();
  },

  saveApiKey(apiKey: ApiKeyConfig) {
    const exists = state.apiKeys.some((k) => k.id === apiKey.id);
    let nextKeys: ApiKeyConfig[];
    if (apiKey.isDefault) {
      nextKeys = state.apiKeys.map((k) => ({ ...k, isDefault: k.id === apiKey.id }));
    } else {
      nextKeys = [...state.apiKeys];
    }

    if (exists) {
      nextKeys = nextKeys.map((k) => (k.id === apiKey.id ? apiKey : k));
    } else {
      nextKeys = [apiKey, ...nextKeys];
    }
    this.updateApiKeys(nextKeys);
  },

  deleteApiKey(id: string) {
    const nextKeys = state.apiKeys.filter((k) => k.id !== id);
    this.updateApiKeys(nextKeys);
  },

  setDefaultApiKey(id: string) {
    const nextKeys = state.apiKeys.map((k) => ({
      ...k,
      isDefault: k.id === id,
    }));
    this.updateApiKeys(nextKeys);
  },

  toggleApiKeyActive(id: string, active?: boolean) {
    const nextKeys = state.apiKeys.map((k) => {
      if (k.id === id) {
        return { ...k, isActive: active !== undefined ? active : !k.isActive };
      }
      return k;
    });
    this.updateApiKeys(nextKeys);
  },

  updateApiKeys(apiKeys: ApiKeyConfig[]) {
    state = { ...state, apiKeys };
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('remix_api_keys_v1', JSON.stringify(apiKeys));
      }
    } catch {
      // Ignore
    }
    notify();
  },

  activateSingleSkill(skillId: string, confirmSwitch = false): boolean {
    const targetSkill = state.skills.find((s) => s.id === skillId || s.name.toLowerCase() === skillId.toLowerCase());
    if (!targetSkill) return false;

    const currentSession = state.activeSkillSession;

    // Build Spec: Only one Skill can be active per session. If the user mentions a different Skill mid-session, ask them to confirm before switching.
    if (
      currentSession.activeSkillId &&
      currentSession.activeSkillId !== targetSkill.id &&
      currentSession.status === 'running' &&
      !confirmSwitch
    ) {
      state = {
        ...state,
        activeSkillSession: {
          ...currentSession,
          pendingConfirmationSkill: targetSkill,
        },
      };
      notify();
      return false;
    }

    // Single skill active exclusivity: enable ONLY targetSkill, disable all others
    const nextSkills = state.skills.map((s) => ({
      ...s,
      enabled: s.id === targetSkill.id,
    }));

    // Check required inputs before starting
    const inputCheck = validateSkillInputs(targetSkill, state.project);

    const newSessionState: ActiveSkillSessionState = {
      activeSkillId: targetSkill.id,
      activeSkillName: targetSkill.name,
      currentStepIndex: 0,
      completedStepIds: [],
      choiceHistory: {},
      missingInputs: inputCheck.missingInputs,
      status: inputCheck.isSatisfied ? 'running' : 'paused_for_input',
      pendingConfirmationSkill: null,
    };

    state = {
      ...state,
      skills: nextSkills,
      activeSkillSession: newSessionState,
    };
    notify();

    // Notify user in AI chat log of skill activation or missing inputs
    const logId = `msg-skill-${Date.now()}`;
    if (!inputCheck.isSatisfied) {
      const missingMsg: ChatMessage = {
        id: logId,
        role: 'system',
        message: inputCheck.message || `[Skill Alert]: ${targetSkill.name} requires missing inputs before running.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        skillTag: targetSkill.name,
      };
      state = {
        ...state,
        project: {
          ...state.project,
          chatLog: [...state.project.chatLog, missingMsg],
        },
      };
      notify();
    } else {
      const activatedMsg: ChatMessage = {
        id: logId,
        role: 'system',
        message: `[Skill Active]: Loaded "@${targetSkill.name}". Workflow step 1 ready: "${targetSkill.workflow?.[0]?.title || 'Execution Rules'}".`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        skillTag: targetSkill.name,
      };
      state = {
        ...state,
        project: {
          ...state.project,
          chatLog: [...state.project.chatLog, activatedMsg],
        },
      };
      notify();
    }

    this.updateSkills(nextSkills);
    return inputCheck.isSatisfied;
  },

  confirmSkillSwitch() {
    const pending = state.activeSkillSession.pendingConfirmationSkill;
    if (pending) {
      this.activateSingleSkill(pending.id, true);
    }
  },

  cancelSkillSwitch() {
    state = {
      ...state,
      activeSkillSession: {
        ...state.activeSkillSession,
        pendingConfirmationSkill: null,
      },
    };
    notify();
  },

  recordChoiceInSession(actionType: string, variant: string) {
    const history = { ...state.activeSkillSession.choiceHistory };
    if (!history[actionType]) {
      history[actionType] = [];
    }
    history[actionType] = [...history[actionType], variant];

    state = {
      ...state,
      activeSkillSession: {
        ...state.activeSkillSession,
        choiceHistory: history,
      },
    };
    notify();
  },

  toggleSkill(skillId: string, enabled?: boolean) {
    const nextSkills = state.skills.map((s) => {
      if (s.id === skillId) {
        return {
          ...s,
          enabled: enabled !== undefined ? enabled : !s.enabled,
          updatedAt: new Date().toISOString(),
        };
      }
      return s;
    });
    this.updateSkills(nextSkills);
  },

  saveSkill(skill: EditorSkill) {
    const exists = state.skills.some((s) => s.id === skill.id);
    let nextSkills: EditorSkill[];
    if (exists) {
      nextSkills = state.skills.map((s) =>
        s.id === skill.id ? { ...skill, updatedAt: new Date().toISOString() } : s
      );
    } else {
      nextSkills = [{ ...skill, updatedAt: new Date().toISOString() }, ...state.skills];
    }
    this.updateSkills(nextSkills);
  },

  deleteSkill(skillId: string) {
    const nextSkills = state.skills.filter((s) => s.id !== skillId);
    this.updateSkills(nextSkills);
  },

  resetSkillsToDefault() {
    const cloned = DEFAULT_EDITOR_SKILLS.map((s) => ({
      ...s,
      updatedAt: new Date().toISOString(),
    }));
    this.updateSkills(cloned);
  },

  updateSkills(skills: EditorSkill[]) {
    state = {
      ...state,
      skills,
      project: {
        ...state.project,
        skills,
        settings: {
          ...state.project.settings,
          skills,
        },
      },
    };
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('remix_video_skills', JSON.stringify(skills));
      }
    } catch {
      // Ignore
    }
    notify();

    // Async sync with server
    fetch('/api/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(skills),
    }).catch(() => {});
  },

  addKeyframeAtPlayhead() {
    let targetClipId = state.selectedClipId;
    if (!targetClipId) {
      for (const track of state.project.timeline.tracks) {
        const found = track.clips.find(
          (c) => state.playheadTime >= c.startTime && state.playheadTime <= c.startTime + c.duration
        );
        if (found) {
          targetClipId = found.clipId;
          break;
        }
      }
    }
    if (!targetClipId) return;
    const found = findClip(state.project, targetClipId);
    if (!found) return;
    const { clip } = found;
    const timeInClip = Math.max(0, Math.min(clip.duration, state.playheadTime - clip.startTime));
    this.executeOperation(
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
      `Add keyframe to ${clip.sourceRef?.scriptSegmentId || 'clip'} at ${state.playheadTime.toFixed(1)}s`
    );
  },

  addCaptionAtPlayhead(text: string, style = 'viral-bold') {
    // Find active clip at playhead or selected clip
    let clipId = state.selectedClipId;
    if (!clipId) {
      const vTrack = state.project.timeline.tracks.find((t) => t.type === 'video');
      const found = vTrack?.clips.find((c) => state.playheadTime >= c.startTime && state.playheadTime <= c.startTime + c.duration);
      if (found) clipId = found.clipId;
    }
    if (!clipId) return;

    this.executeOperation({
      op: 'add_caption',
      caption: {
        captionId: `cap-${Date.now().toString(36)}`,
        startTime: state.playheadTime,
        endTime: state.playheadTime + 2.0,
        text,
        style: style as any,
      },
    }, `Add caption "${text}"`);
  },

  splitAtPlayhead() {
    let targetClipId = state.selectedClipId;
    if (targetClipId) {
      const found = findClip(state.project, targetClipId);
      if (
        !found ||
        state.playheadTime <= found.clip.startTime + 0.05 ||
        state.playheadTime >= found.clip.startTime + found.clip.duration - 0.05
      ) {
        targetClipId = null;
      }
    }

    // If selected clip doesn't intersect playhead, look across video tracks then audio
    if (!targetClipId) {
      for (const track of state.project.timeline.tracks) {
        const found = track.clips.find(
          (c) => state.playheadTime > c.startTime + 0.05 && state.playheadTime < c.startTime + c.duration - 0.05
        );
        if (found) {
          targetClipId = found.clipId;
          break;
        }
      }
    }

    if (!targetClipId) return;
    const found = findClip(state.project, targetClipId);
    if (!found) return;

    const { clip } = found;
    if (state.playheadTime > clip.startTime + 0.05 && state.playheadTime < clip.startTime + clip.duration - 0.05) {
      this.executeOperation({
        op: 'split_clip',
        clipId: clip.clipId,
        splitTime: Number(state.playheadTime.toFixed(2)),
      }, `Split ${clip.sourceRef?.scriptSegmentId || 'clip'} at ${state.playheadTime.toFixed(1)}s`);
      this.selectClip(clip.clipId);
    }
  },

  deleteSelectedClip() {
    let clipId = state.selectedClipId;
    if (!clipId) {
      // Find clip intersecting playheadTime
      for (const track of state.project.timeline.tracks) {
        const found = track.clips.find(
          (c) => state.playheadTime >= c.startTime && state.playheadTime <= c.startTime + c.duration
        );
        if (found) {
          clipId = found.clipId;
          break;
        }
      }
    }

    if (!clipId) return;
    state = { ...state, selectedClipId: null };
    this.executeOperation({
      op: 'delete_clip',
      clipId,
    }, 'Delete clip');
  },

  async runPromptEdit(instruction: string) {
    const userMsg: ChatMessage = {
      id: `chat-u-${Date.now()}`,
      role: 'user',
      message: instruction,
      text: instruction,
      timestamp: new Date().toISOString(),
    };

    const updatedWithUser = {
      ...state.project,
      chatLog: [...state.project.chatLog, userMsg],
    };

    state = { ...state, project: updatedWithUser, isPromptLoading: true };
    notify();

    try {
      // Find the active/default API key to forward to the server
      const activeKey = state.apiKeys?.find((k) => k.isDefault && k.apiKey) || state.apiKeys?.find((k) => k.apiKey && k.isActive);
      const res = await fetch('/api/prompt-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction,
          project: state.project,
          history: state.project.chatLog,
          skills: state.skills,
          apiKeyConfig: activeKey ? { provider: activeKey.provider, apiKey: activeKey.apiKey, modelName: activeKey.modelName, baseUrl: activeKey.baseUrl } : null,
        }),
      });

      if (!res.ok) {
        throw new Error(`Prompt edit server error: ${res.statusText}`);
      }

      const data = await res.json();
      
      let pendingTranscriptionAssetId: string | null = null;
      if (Array.isArray(data.operations)) {
        const transcribeOp = data.operations.find((op: any) => op.op === 'request_transcription');
        if (transcribeOp && transcribeOp.assetId) {
          pendingTranscriptionAssetId = transcribeOp.assetId;
        }
      }

      if (data.project) {
        state = {
          ...state,
          project: data.project,
          isPromptLoading: !pendingTranscriptionAssetId ? false : true,
        };
        notify();
      } else {
        state = { ...state, isPromptLoading: !pendingTranscriptionAssetId ? false : true };
        notify();
      }

      // If transcription was requested, run it locally and recursively trigger the AI again
      if (pendingTranscriptionAssetId) {
        const asset = state.project.assets[pendingTranscriptionAssetId];
        if (asset && asset.url && activeKey) {
          try {
             const resp = await fetch(asset.url);
             const blob = await resp.blob();
             const reader = new FileReader();
             const base64Audio = await new Promise<string>((resolve) => {
               reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
               reader.readAsDataURL(blob);
             });
             
             const transcribeRes = await fetch('/api/transcribe', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ audioBase64: base64Audio, mimeType: blob.type, apiKey: activeKey.apiKey }),
             });
             
             if (transcribeRes.ok) {
                const trData = await transcribeRes.json();
                const transcriptText = trData.transcript;
                
                if (transcriptText) {
                  // Recursively prompt the AI with the transcript so it can finish its job
                  const followUp = `SYSTEM LOG: You requested transcription for asset ${asset.filename}. Here is the complete transcript of the spoken words:\n\n"${transcriptText}"\n\nPlease proceed to match images to these words and generate the exact timeline operations to assemble the cut based on your skills.`;
                  await this.runPromptEdit(followUp);
                } else {
                  state = { ...state, isPromptLoading: false };
                  notify();
                }
             } else {
                state = { ...state, isPromptLoading: false };
                notify();
             }
          } catch (e) {
             console.error("Agentic transcription failed:", e);
             state = { ...state, isPromptLoading: false };
             notify();
          }
        } else {
          state = { ...state, isPromptLoading: false };
          notify();
        }
      }
    } catch (err: any) {
      console.error('Prompt handler failed:', err);
      
      const errorMsg = err.message || 'The server could not be reached. Ensure it is running and you have a valid API key.';
      const assistantFallback: ChatMessage = {
        id: `chat-e-${Date.now()}`,
        role: 'assistant',
        message: `⚠️ **Connection Error**\n\nI couldn't reach the AI provider to process your request. \n\n**Details:** ${errorMsg}\n\nPlease check your internet connection, verify your API keys in Settings, and ensure the provider is not currently down.`,
        text: errorMsg,
        timestamp: new Date().toISOString(),
      };
      
      state = {
        ...state,
        project: {
          ...state.project,
          chatLog: [...state.project.chatLog, assistantFallback],
        },
        isPromptLoading: false,
      };
      notify();
    }
  },

  async syncBackend(project: ProjectDocument) {
    try {
      await fetch(`/api/projects/${project.projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project),
      });
    } catch {
      // Offline fallback is silent
    }
  },

  async loadProjectsList() {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const list = await res.json();
        state = { ...state, availableProjects: list };
        notify();
      }
    } catch {
      // Ignored
    }
  },

  async loadProject(id: string) {
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (res.ok) {
        const loaded = await res.json();
        this.setProject(loaded);
      }
    } catch {
      // Ignored
    }
  },
};

export function useProjectStore() {
  const [snapshot, setSnapshot] = useState(projectStore.getState());

  useEffect(() => {
    const unsub = projectStore.subscribe(() => {
      setSnapshot(projectStore.getState());
    });
    return unsub;
  }, []);

  return snapshot;
}
