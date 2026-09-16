import { WorkflowPreset } from '../types/project';

export const WORKFLOW_PRESETS: WorkflowPreset[] = [
  {
    presetId: 'strategist-longform',
    label: 'Strategist Longform Style',
    description: 'Standard A/B roll assembly for YouTube documentaries & essays. ID-matched segments with gentle Ken Burns motion.',
    requiredInputs: ['script', 'audio', 'images'],
    optionalInputs: ['prompts'],
    pacing: {
      avgClipDuration: 4.5,
      cutStyle: 'hard',
    },
    captionStyle: 'strategist-default',
    defaultAnimation: {
      type: 'kenBurns',
      intensity: 0.12,
    },
    trackLayout: ['V1', 'A1', 'A2'],
  },
  {
    presetId: 'viral-shortform-autocut',
    label: 'Viral Shortform (Auto-Cut)',
    description: 'Fast-paced edits for TikTok, Reels & Shorts. Punch zoom animations and dynamic viral captions on beat.',
    requiredInputs: ['audio', 'images'],
    optionalInputs: [],
    pacing: {
      avgClipDuration: 1.4,
      cutStyle: 'hard',
    },
    captionStyle: 'viral-bold',
    defaultAnimation: {
      type: 'punchZoom',
      intensity: 0.25,
    },
    trackLayout: ['V1', 'A1'],
  },
  {
    presetId: 'faceless-broll',
    label: 'Faceless B-Roll Automation',
    description: 'Cinematic B-roll montage with ambient soundscapes, smooth slow-pan keyframes, and crossfades.',
    requiredInputs: ['script', 'audio', 'images'],
    optionalInputs: ['prompts'],
    pacing: {
      avgClipDuration: 3.2,
      cutStyle: 'crossfade',
    },
    captionStyle: 'clean-subtitles',
    defaultAnimation: {
      type: 'slowPan',
      intensity: 0.15,
    },
    trackLayout: ['V1', 'V2', 'A1', 'A2'],
  },
];
