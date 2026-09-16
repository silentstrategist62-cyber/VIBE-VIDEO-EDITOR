export interface EffectDefinition {
  id: string;
  name: string;
  category: 'distort' | 'color' | 'retro' | 'blur_focus' | 'artistic';
  description: string;
  defaultIntensity: number; // 0 to 100
  badge?: string;
  iconName: string;
}

export const VISUAL_EFFECTS: EffectDefinition[] = [
  // Blur & Focus
  {
    id: 'blur',
    name: 'Gaussian Blur',
    category: 'blur_focus',
    description: 'Smooth optical blur depth of field effect',
    defaultIntensity: 40,
    iconName: 'Droplet',
  },
  {
    id: 'glow',
    name: 'Luminous Bloom / Glow',
    category: 'blur_focus',
    description: 'Radiant cinematic highlight glow and dream diffusion',
    defaultIntensity: 65,
    badge: 'Popular',
    iconName: 'Sparkles',
  },
  {
    id: 'sharpen',
    name: 'High-Pass Sharpen',
    category: 'blur_focus',
    description: 'Ultra crisp micro-contrast and edge clarity enhancement',
    defaultIntensity: 50,
    iconName: 'Focus',
  },

  // Glitch & Distort
  {
    id: 'glitch',
    name: 'Cyber Glitch Slices',
    category: 'distort',
    description: 'Dynamic horizontal scanline tear and sync distortion',
    defaultIntensity: 60,
    badge: 'Trending',
    iconName: 'Cpu',
  },
  {
    id: 'rgb_split',
    name: 'RGB Chromatic Shift',
    category: 'distort',
    description: 'Splits red, green, and blue optical color channels',
    defaultIntensity: 55,
    iconName: 'Layers',
  },
  {
    id: 'pixelate',
    name: '8-Bit Retro Mosaic',
    category: 'distort',
    description: 'Downsamples pixels into stylized arcade mosaic blocks',
    defaultIntensity: 50,
    iconName: 'Grid',
  },

  // Retro & Analog
  {
    id: 'vhs',
    name: 'VHS Camcorder 1994',
    category: 'retro',
    description: 'Interlaced analog scanlines, phosphor tint and tape flutter',
    defaultIntensity: 60,
    badge: 'Retro',
    iconName: 'Tv',
  },
  {
    id: 'film_grain',
    name: '35mm Film Grain',
    category: 'retro',
    description: 'Authentic organic silver halide emulsion grain particles',
    defaultIntensity: 45,
    iconName: 'Film',
  },
  {
    id: 'sepia',
    name: 'Vintage Warm Sepia',
    category: 'retro',
    description: 'Antique golden brown monochrome tone with warm decay',
    defaultIntensity: 70,
    iconName: 'Camera',
  },

  // Color & Grading
  {
    id: 'noir',
    name: 'Moody Film Noir',
    category: 'color',
    description: 'Dramatic high-contrast black & white with deep shadows',
    defaultIntensity: 85,
    iconName: 'Moon',
  },
  {
    id: 'duotone',
    name: 'Cyberpunk Duotone',
    category: 'color',
    description: 'Maps shadows to deep neon cyan and highlights to hot magenta',
    defaultIntensity: 75,
    badge: 'Vivid',
    iconName: 'Palette',
  },
  {
    id: 'heatmap',
    name: 'Thermal Heat Vision',
    category: 'color',
    description: 'Infrared pseudo-color temperature spectrum mapping',
    defaultIntensity: 70,
    iconName: 'Flame',
  },
  {
    id: 'invert',
    name: 'X-Ray Color Invert',
    category: 'color',
    description: 'Inverts negative luminescence and complimentary hues',
    defaultIntensity: 100,
    iconName: 'EyeOff',
  },

  // Artistic
  {
    id: 'edge_glow',
    name: 'Neon Contour Glow',
    category: 'artistic',
    description: 'Darkened canvas with high-voltage glowing edge detection',
    defaultIntensity: 60,
    iconName: 'Zap',
  },
  {
    id: 'halftone',
    name: 'Pop-Art Halftone',
    category: 'artistic',
    description: 'Retro comic book CMYK dot matrix printing pattern',
    defaultIntensity: 50,
    iconName: 'CircleDot',
  },
];

export const EFFECT_CATEGORIES = [
  { id: 'all', label: 'All Effects' },
  { id: 'blur_focus', label: 'Blur & Glow' },
  { id: 'distort', label: 'Glitch & Warp' },
  { id: 'retro', label: 'VHS & Grain' },
  { id: 'color', label: 'Color & Tone' },
  { id: 'artistic', label: 'Artistic & Neon' },
] as const;
