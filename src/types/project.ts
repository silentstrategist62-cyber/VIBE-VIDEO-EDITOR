/**
 * Master Project Document Schema
 * Single source of truth across Autonomous, Manual, and Prompt-driven editing.
 */

import { EditorSkill } from './skills';
export * from './skills';

export interface Resolution {
  width: number;
  height: number;
}

export interface ProjectSettings {
  aspectRatio: '9:16' | '16:9' | '1:1';
  resolution: Resolution;
  fps: number;
  skills?: EditorSkill[];
}

export interface SourceRef {
  scriptSegmentId?: string;
  promptId?: string;
  originFilename?: string;
  matchedText?: string;
}

export interface Keyframe {
  property: 'scale' | 'positionX' | 'positionY' | 'rotation' | 'opacity';
  time: number; // seconds relative to clip start
  value: number;
  easing: 'linear' | 'easeInOut' | 'easeIn' | 'easeOut';
}

export interface Transform {
  scale: number;
  positionX: number;
  positionY: number;
  rotation: number;
  opacity: number;
}

export type TransitionType =
  // Fades & Dissolves (1-6)
  | 'crossfade'
  | 'dipToBlack'
  | 'dipToWhite'
  | 'lumaFade'
  | 'dreamyBlur'
  | 'vaporize'
  // Wipes & Blinds (7-15)
  | 'wipeLeft'
  | 'wipeRight'
  | 'wipeUp'
  | 'wipeDown'
  | 'wipeDiagonal'
  | 'wipeDiagonalInv'
  | 'clockWipe'
  | 'blindsHorizontal'
  | 'blindsVertical'
  // Slides & Pushes (16-21)
  | 'slideLeft'
  | 'slideRight'
  | 'slideUp'
  | 'slideDown'
  | 'splitHorizontal'
  | 'splitVertical'
  // Zooms & Scales (22-28)
  | 'zoomIn'
  | 'zoomOut'
  | 'zoomBlur'
  | 'crossZoom'
  | 'squeezeIn'
  | 'bounceIn'
  | 'elasticSnap'
  // Rotations & 3D (29-34)
  | 'spinClockwise'
  | 'spinCounter'
  | 'flipHorizontal'
  | 'flipVertical'
  | 'swirlVortex'
  | 'pageCurl'
  // Glitch & Distortions (35-42)
  | 'glitch'
  | 'rgbSplit'
  | 'tvStatic'
  | 'pixelateDissolve'
  | 'rippleWave'
  | 'kaleidoscope'
  | 'stretchHorizontal'
  | 'stretchVertical'
  // Shapes & Iris Reveals (43-49)
  | 'circleCropIn'
  | 'circleCropOut'
  | 'diamondReveal'
  | 'starReveal'
  | 'heartReveal'
  | 'checkerboard'
  | 'gridDissolve'
  // Light, Film & Dynamic (50-55)
  | 'filmBurn'
  | 'flashLightning'
  | 'filmRoll'
  | 'windStreak'
  | 'colorDistance'
  | 'doorway3D'
  | (string & {});

export interface Transition {
  type: TransitionType;
  duration: number; // in seconds, typically 0.2 - 0.6s
}

export interface ClipEffect {
  id: string;
  type:
    | 'blur'
    | 'glow'
    | 'glitch'
    | 'vhs'
    | 'pixelate'
    | 'invert'
    | 'sepia'
    | 'noir'
    | 'chromatic'
    | 'rgb_split'
    | 'heatmap'
    | 'duotone'
    | 'halftone'
    | 'sharpen'
    | 'edge_glow'
    | 'film_grain'
    | (string & {});
  name?: string;
  intensity: number; // 0 - 100
  enabled: boolean;
  params?: Record<string, any>;
}

export interface GraphicElement {
  id: string;
  category: 'shape' | 'sticker' | 'lower_third' | 'badge' | 'background' | 'overlay';
  shapeType?:
    | 'rect'
    | 'rounded_rect'
    | 'circle'
    | 'triangle'
    | 'star'
    | 'arrow'
    | 'hexagon'
    | 'heart'
    | 'diamond'
    | 'bubble'
    | 'tag'
    | 'divider'
    | 'progress';
  emoji?: string;
  title?: string;
  subtitle?: string;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  cornerRadius?: number;
  badgeText?: string;
  shadow?: boolean;
}

export interface TextOverlayElement {
  id: string;
  text: string;
  stylePreset:
    | 'viral_bold'
    | 'clean_sub'
    | 'neon_cyber'
    | 'cinematic_gold'
    | 'news_ticker'
    | 'retro_synth'
    | 'handwritten'
    | 'comic_pop'
    | 'gamer_badge'
    | 'luxury_serif';
  animation:
    | 'typewriter'
    | 'fadeIn'
    | 'slideUp'
    | 'slideDown'
    | 'slideLeft'
    | 'slideRight'
    | 'bounce'
    | 'elastic'
    | 'glitch'
    | 'karaokeGlow'
    | 'wave'
    | 'stompZoom'
    | 'blurToFocus'
    | 'neonFlicker'
    | 'flip3D'
    | 'skewRush'
    | 'tracking'
    | 'shimmer'
    | 'vaporize'
    | 'heartbeat'
    | 'tremor'
    | 'dropImpact';
  fontSize: number;
  fontFamily: string;
  color: string;
  strokeColor?: string;
  strokeWidth?: number;
  backgroundColor?: string;
  backgroundPadding?: number;
  backgroundRadius?: number;
  alignment: 'left' | 'center' | 'right';
  letterSpacing?: number;
  lineHeight?: number;
  shadowBlur?: number;
  shadowColor?: string;
}

export interface AudioSettings {
  volume: number; // in dB (e.g., 0dB is nominal, -6dB, +3dB) or linear multiplier
  fadeIn: number; // seconds
  fadeOut: number; // seconds
  speed: number; // e.g. 1.0, 1.25, 1.5
  maintainPitch: boolean;
  normalizeLoudness?: boolean;
}

export interface ColorAdjust {
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  saturation: number; // -100 to 100
  temperature: number; // -100 to 100 (warm/cool)
  exposure: number; // -100 to 100
  vignette: number; // 0 to 100
}

export interface WordTiming {
  word: string;
  start: number; // seconds relative to timeline or clip
  end: number;
}

export interface Caption {
  captionId: string;
  text: string;
  startTime: number;
  endTime: number;
  style: 'viral-bold' | 'strategist-default' | 'karaoke-glow' | 'clean-subtitles';
  wordTimings?: WordTiming[];
  styleOverride?: {
    fontSize?: number;
    color?: string;
    positionY?: number;
  };
}

export interface Clip {
  clipId: string;
  assetId: string;
  trackId: string;
  startTime: number; // seconds on timeline
  duration: number; // seconds
  sourceIn: number; // trim point in source
  sourceOut: number;
  transform: Transform;
  keyframes: Keyframe[];
  transitionIn?: Transition | null;
  transitionOut?: Transition | null;
  captions?: Caption[];
  audio?: AudioSettings;
  adjust?: ColorAdjust;
  effects?: ClipEffect[];
  graphic?: GraphicElement;
  textOverlay?: TextOverlayElement;
  sourceRef?: SourceRef;
}

export interface Track {
  trackId: string; // e.g. 'V1'-'V5', 'L1'-'L10', 'A1'-'A10'
  type: 'video' | 'audio' | 'overlay';
  name?: string;
  muted?: boolean;
  locked?: boolean;
  volume?: number;
  clips: Clip[];
}

export interface Timeline {
  duration: number; // total duration in seconds
  tracks: Track[];
}

export interface MediaAsset {
  assetId: string;
  type: 'image' | 'audio' | 'video';
  filename: string;
  url: string; // data url or object path
  width?: number;
  height?: number;
  duration?: number;
  waveformCache?: number[]; // precomputed audio peaks (0 to 1) for fast rendering
}

export interface ManifestSegment {
  segmentId: string; // e.g. "B1", "B5"
  scriptText: string;
  assetId: string | null;
  promptText?: string;
  status: 'matched' | 'missing_image' | 'low_confidence' | 'unmatched_image';
  startTime?: number;
  endTime?: number;
  confidence?: number;
}

export interface Manifest {
  segments: ManifestSegment[];
  unmatchedAssets?: string[]; // assetIds not tied to any segment
}

export interface OperationLog {
  id?: string;
  op: Operation;
  inverse: Operation;
  timestamp: string;
  description?: string;
  timelineSnapshotBefore?: Timeline;
  timelineSnapshotAfter?: Timeline;
  affectedClipId?: string;
  playheadPosition?: number;
}

export interface HistoryStack {
  past: OperationLog[];
  future: OperationLog[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  message: string;
  text?: string;
  thinking?: string;
  timestamp: string;
  operations?: Operation[];
  skillTag?: string;
  options?: string[];
  reactions?: { liked?: boolean; disliked?: boolean };
}

export interface ProjectDocument {
  projectId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  settings: ProjectSettings;
  manifest: Manifest;
  timeline: Timeline;
  assets: Record<string, MediaAsset>;
  history: HistoryStack;
  chatLog: ChatMessage[];
  skills?: EditorSkill[];
}

/**
 * Fixed Operation Schema for all three edit paths:
 * Manual timeline actions, Autonomous assembly, Prompt parser.
 */
export type Operation =
  | { op: 'trim_clip'; clipId: string; sourceIn: number; sourceOut: number; duration?: number; newStartTime?: number; previousStartTime?: number }
  | { op: 'delete_clip'; clipId: string; previousClip?: Clip }
  | { op: 'split_clip'; clipId: string; splitTime: number; newClipId?: string }
  | { op: 'reorder_clip'; clipId: string; newTrackId?: string; newStartTime: number; previousTrackId?: string; previousStartTime?: number; displace?: boolean }
  | { op: 'move_clip'; clipId: string; newStartTime: number; previousStartTime?: number; displace?: boolean }
  | { op: 'add_track'; trackId: string; type: 'video' | 'audio' | 'overlay'; name?: string }
  | { op: 'delete_track'; trackId: string }
  | { op: 'resolve_overlaps'; trackId?: string }
  | { op: 'set_speed'; clipId: string; speed: number; maintainPitch?: boolean; previousSpeed?: number }
  | { op: 'add_transition'; clipId: string; position: 'in' | 'out'; type: Transition['type']; duration: number; previousTransition?: Transition | null }
  | { op: 'remove_transition'; clipId: string; position: 'in' | 'out'; previousTransition?: Transition | null }
  | { op: 'add_caption'; caption: Caption }
  | { op: 'edit_caption'; captionId: string; changes: Partial<Caption>; previous?: Partial<Caption> }
  | { op: 'delete_caption'; captionId: string; previousCaption?: Caption }
  | { op: 'add_keyframe'; clipId: string; keyframe: Keyframe }
  | { op: 'delete_keyframe'; clipId: string; property: Keyframe['property']; time: number; previousKeyframe?: Keyframe }
  | { op: 'set_transform'; clipId: string; transform: Partial<Transform>; previousTransform?: Transform }
  | { op: 'set_adjust'; clipId: string; adjust: Partial<ColorAdjust>; previousAdjust?: ColorAdjust }
  | { op: 'set_volume'; clipId: string; volume: number; previousVolume?: number }
  | { op: 'set_audio_settings'; clipId: string; settings: Partial<AudioSettings>; previousSettings?: AudioSettings }
  | { op: 'replace_asset'; clipId: string; newAssetId: string; previousAssetId?: string }
  | { op: 'set_effects'; clipId: string; effects: ClipEffect[]; previousEffects?: ClipEffect[] }
  | { op: 'add_effect'; clipId: string; effect: ClipEffect }
  | { op: 'remove_effect'; clipId: string; effectId: string; previousEffect?: ClipEffect }
  | { op: 'update_graphic'; clipId: string; graphic: Partial<GraphicElement>; previousGraphic?: GraphicElement }
  | { op: 'update_text_overlay'; clipId: string; textOverlay: Partial<TextOverlayElement>; previousTextOverlay?: TextOverlayElement }
  | { op: 'add_clip'; clip: Clip }
  | { op: 'request_transcription'; assetId: string }
  | { op: 'batch_operations'; operations: Operation[]; description?: string };

export interface WorkflowPreset {
  presetId: string;
  label: string;
  description: string;
  requiredInputs: ('script' | 'audio' | 'images')[];
  optionalInputs: ('prompts')[];
  pacing: {
    avgClipDuration: number;
    cutStyle: 'hard' | 'crossfade';
  };
  captionStyle: 'viral-bold' | 'strategist-default' | 'karaoke-glow' | 'clean-subtitles';
  defaultAnimation: {
    type: 'kenBurns' | 'punchZoom' | 'slowPan' | 'none';
    intensity: number;
  };
  trackLayout: string[];
}
