import { TextOverlayElement } from '../types/project';

export interface TextPresetDefinition {
  id: TextOverlayElement['stylePreset'];
  name: string;
  category: 'viral' | 'clean' | 'cyber' | 'cinematic' | 'retro';
  description: string;
  sampleText: string;
  defaultConfig: Partial<TextOverlayElement>;
}

export const TEXT_PRESETS: TextPresetDefinition[] = [
  {
    id: 'viral_bold',
    name: 'Viral Yellow Hook',
    category: 'viral',
    description: 'High-contrast bold punch text with heavy outline & drop shadow (MrBeast / Reels standard)',
    sampleText: 'WAIT FOR THE END! 😱',
    defaultConfig: {
      fontFamily: 'Impact, -apple-system, sans-serif',
      fontSize: 54,
      color: '#FACC15',
      strokeColor: '#000000',
      strokeWidth: 8,
      shadowBlur: 16,
      shadowColor: 'rgba(0,0,0,0.85)',
      animation: 'bounce',
    },
  },
  {
    id: 'cinematic_gold',
    name: 'Cinematic Gold Serif',
    category: 'cinematic',
    description: 'Letterspaced luxury gold serif for dramatic storytelling & film intros',
    sampleText: 'THE FORGOTTEN DYNASTY',
    defaultConfig: {
      fontFamily: 'Cinzel, Georgia, serif',
      fontSize: 44,
      color: '#C9A84C',
      strokeColor: '#000000',
      strokeWidth: 3,
      letterSpacing: 8,
      animation: 'fadeIn',
    },
  },
  {
    id: 'clean_sub',
    name: 'Clean Dark Pill Subtitle',
    category: 'clean',
    description: 'Ultra-readable translucent dark pill with crisp white typography',
    sampleText: 'Every second counts when building the future.',
    defaultConfig: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: 34,
      color: '#FFFFFF',
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backgroundPadding: 16,
      backgroundRadius: 12,
      strokeWidth: 0,
      animation: 'slideUp',
    },
  },
  {
    id: 'neon_cyber',
    name: 'Neon Cyber Glow',
    category: 'cyber',
    description: 'Electric cyan with luminous outer neon bloom and cyberpunk vibration',
    sampleText: 'SYSTEM BREACH DETECTED',
    defaultConfig: {
      fontFamily: '"Roboto Mono", monospace',
      fontSize: 42,
      color: '#00F0FF',
      strokeColor: '#003366',
      strokeWidth: 4,
      shadowBlur: 25,
      shadowColor: '#00F0FF',
      animation: 'neonFlicker',
    },
  },
  {
    id: 'news_ticker',
    name: 'Breaking News Ticker',
    category: 'viral',
    description: 'Red banner live broadcast header with urgent warning style',
    sampleText: 'BREAKING: MAJOR DISCOVERY CONFIRMED',
    defaultConfig: {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: 38,
      color: '#FFFFFF',
      backgroundColor: 'rgba(220, 38, 38, 0.95)',
      backgroundPadding: 14,
      backgroundRadius: 4,
      animation: 'slideLeft',
    },
  },
  {
    id: 'retro_synth',
    name: 'Retro 80s Synthwave',
    category: 'retro',
    description: 'Hot pink gradient vibe with magenta drop shadow and nostalgic flare',
    sampleText: 'MIDNIGHT RUNNER 1984',
    defaultConfig: {
      fontFamily: '"Arial Black", Impact, sans-serif',
      fontSize: 46,
      color: '#F43F5E',
      strokeColor: '#4C0519',
      strokeWidth: 6,
      shadowBlur: 14,
      shadowColor: '#9333EA',
      animation: 'shimmer',
    },
  },
  {
    id: 'handwritten',
    name: 'Handwritten Casual Note',
    category: 'clean',
    description: 'Personal, informal cursive marker style for thoughts & vlogs',
    sampleText: 'Don’t forget to hydrate today ✨',
    defaultConfig: {
      fontFamily: 'Caveat, "Brush Script MT", cursive',
      fontSize: 48,
      color: '#FDE047',
      strokeWidth: 0,
      shadowBlur: 8,
      shadowColor: 'rgba(0,0,0,0.5)',
      animation: 'typewriter',
    },
  },
  {
    id: 'comic_pop',
    name: 'Comic Book Impact',
    category: 'viral',
    description: 'Tilted dynamic pop style with thick cartoon outline',
    sampleText: 'BOOM! 💥',
    defaultConfig: {
      fontFamily: 'Impact, sans-serif',
      fontSize: 60,
      color: '#FFFFFF',
      strokeColor: '#000000',
      strokeWidth: 10,
      animation: 'stompZoom',
    },
  },
  {
    id: 'gamer_badge',
    name: 'Gaming Streamer Tag',
    category: 'cyber',
    description: 'Sleek esports streamer lower badge with purple & cyan aura',
    sampleText: 'VICTORY ROYALE 👑',
    defaultConfig: {
      fontFamily: '"Roboto Mono", sans-serif',
      fontSize: 40,
      color: '#A855F7',
      strokeColor: '#3B0764',
      strokeWidth: 4,
      shadowBlur: 18,
      shadowColor: '#A855F7',
      animation: 'flip3D',
    },
  },
  {
    id: 'luxury_serif',
    name: 'Luxury Editorial Serif',
    category: 'cinematic',
    description: 'High-fashion modern editorial typography with refined balance',
    sampleText: 'The Architecture of Silence',
    defaultConfig: {
      fontFamily: '"Playfair Display", Georgia, serif',
      fontSize: 42,
      color: '#F3F4F6',
      strokeWidth: 0,
      letterSpacing: 4,
      animation: 'blurToFocus',
    },
  },
];

export interface TextAnimationDefinition {
  id: TextOverlayElement['animation'];
  name: string;
  category: 'motion' | 'elastic' | 'reveals' | 'effects';
  description: string;
}

export const TEXT_ANIMATIONS: TextAnimationDefinition[] = [
  // Motion
  { id: 'fadeIn', name: 'Fade In / Out', category: 'motion', description: 'Smooth optical alpha dissolve' },
  { id: 'slideUp', name: 'Slide Up', category: 'motion', description: 'Dynamic slide entrance from below' },
  { id: 'slideDown', name: 'Slide Down', category: 'motion', description: 'Graceful slide entrance from above' },
  { id: 'slideLeft', name: 'Slide Left', category: 'motion', description: 'Horizontal push entrance from right' },
  { id: 'slideRight', name: 'Slide Right', category: 'motion', description: 'Horizontal push entrance from left' },

  // Elastic & Bounce
  { id: 'bounce', name: 'Pop & Spring Bounce', category: 'elastic', description: 'Overshoot energetic viral bounce' },
  { id: 'elastic', name: 'Elastic Snap', category: 'elastic', description: 'High-tension rubber band snap' },
  { id: 'stompZoom', name: 'Stomp Punch Zoom', category: 'elastic', description: 'High-speed punch zoom with camera shake' },
  { id: 'dropImpact', name: 'Drop with Ground Impact', category: 'elastic', description: 'Falls from top with heavy ground thud' },

  // Reveals & Typography
  { id: 'typewriter', name: 'Typewriter Reveal', category: 'reveals', description: 'Letter-by-letter mechanical keystroke reveal' },
  { id: 'karaokeGlow', name: 'Karaoke Word Glow', category: 'reveals', description: 'Word-by-word synchronized karaoke highlight' },
  { id: 'blurToFocus', name: 'Blur to Sharp Focus', category: 'reveals', description: 'Lens focus rack resolving into clear text' },
  { id: 'tracking', name: 'Letter Tracking Expand', category: 'reveals', description: 'Slow dramatic letter-spacing expansion' },
  { id: 'flip3D', name: '3D Axis Card Flip', category: 'reveals', description: 'Flips around horizontal axis into position' },

  // Effects & Distortion
  { id: 'glitch', name: 'Cyber Glitch Tear', category: 'effects', description: 'RGB split flicker and scanline distortion' },
  { id: 'neonFlicker', name: 'Neon Sign Flicker', category: 'effects', description: 'Realistic tube ignition electrical flicker' },
  { id: 'shimmer', name: 'Metallic Shimmer Sweep', category: 'effects', description: 'Bright light gleam sweeping across characters' },
  { id: 'wave', name: 'Wave Float & Sway', category: 'effects', description: 'Gentle continuous rhythmic floating wave' },
  { id: 'skewRush', name: 'Italic Skew Rush', category: 'effects', description: 'Aggressive racing angle with fast entrance' },
  { id: 'vaporize', name: 'Vaporize Disperse', category: 'effects', description: 'Dissolves into floating particle dust' },
  { id: 'heartbeat', name: 'Heartbeat Pulse', category: 'effects', description: 'Rhythmic biological double pulse' },
  { id: 'tremor', name: 'Sub-bass Tremor Shake', category: 'effects', description: 'High-frequency microscopic vibration' },
];

export const FONT_OPTIONS = [
  { id: 'Impact, sans-serif', label: 'Impact (Viral Punch)' },
  { id: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', label: 'System Clean (Sans-Serif)' },
  { id: '"Playfair Display", Georgia, serif', label: 'Playfair Display (Editorial)' },
  { id: 'Cinzel, Georgia, serif', label: 'Cinzel (Cinematic Gold)' },
  { id: '"Roboto Mono", monospace', label: 'Roboto Mono (Tech / Cyber)' },
  { id: 'Caveat, cursive', label: 'Caveat (Casual Handwriting)' },
  { id: '"Arial Black", sans-serif', label: 'Arial Black (Heavy Duty)' },
];
