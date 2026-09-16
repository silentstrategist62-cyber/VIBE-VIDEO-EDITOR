import { TransitionType } from '../../types/project';

export interface TransitionDefinition {
  id: TransitionType;
  name: string;
  category: 'fades' | 'wipes' | 'slides' | 'zooms' | 'rotations' | 'glitch' | 'shapes' | 'light';
  description: string;
  iconName: string;
  defaultDuration: number;
}

export const TRANSITION_CATEGORIES = [
  { id: 'all', label: 'All Transitions', count: 55 },
  { id: 'fades', label: 'Fades & Dissolves', count: 6 },
  { id: 'wipes', label: 'Wipes & Sweeps', count: 8 },
  { id: 'slides', label: 'Slides & Pushes', count: 8 },
  { id: 'zooms', label: 'Zooms & Scale', count: 7 },
  { id: 'rotations', label: 'Spins & Rotations', count: 6 },
  { id: 'glitch', label: 'Glitch & Digital', count: 7 },
  { id: 'shapes', label: 'Shapes & Geometric', count: 7 },
  { id: 'light', label: 'Light Leaks & Flares', count: 6 },
] as const;

export const TRANSITIONS_55: TransitionDefinition[] = [
  {
    id: 'crossfade',
    name: 'Crossfade',
    category: 'fades',
    description: 'Smooth linear optical dissolve between adjacent clips',
    iconName: 'Blend',
    defaultDuration: 0.35,
  },
  {
    id: 'dipToBlack',
    name: 'Dip to Black',
    category: 'fades',
    description: 'Fade out to pitch black before revealing the incoming clip',
    iconName: 'Moon',
    defaultDuration: 0.4,
  },
  {
    id: 'dipToWhite',
    name: 'Dip to White',
    category: 'fades',
    description: 'Flash dissolve through glowing pure white highlights',
    iconName: 'Sun',
    defaultDuration: 0.35,
  },
  {
    id: 'lumaFade',
    name: 'Luma Key Fade',
    category: 'fades',
    description: 'Luminance threshold dissolve prioritizing bright areas',
    iconName: 'Sparkles',
    defaultDuration: 0.45,
  },
  {
    id: 'dreamyBlur',
    name: 'Dreamy Blur',
    category: 'fades',
    description: 'Soft ethereal blur dissolve with light bloom diffusion',
    iconName: 'Cloud',
    defaultDuration: 0.5,
  },
  {
    id: 'zoomIn',
    name: 'Zoom In',
    category: 'zooms',
    description: 'Rapid camera push into the center focal point',
    iconName: 'ZoomIn',
    defaultDuration: 0.3,
  },
  {
    id: 'spinCW',
    name: 'Spin Clockwise',
    category: 'rotations',
    description: 'High-speed 360 degree rotational whip transition',
    iconName: 'RotateCw',
    defaultDuration: 0.4,
  },
];
