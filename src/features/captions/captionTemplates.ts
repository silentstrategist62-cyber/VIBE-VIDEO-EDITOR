export interface CaptionTemplateDefinition {
  id: string;
  name: string;
  category: 'trending' | 'classic' | 'hits' | 'word' | 'glow' | 'lyrics' | 'new';
  badge?: 'PRO' | 'HOT' | 'NEW' | 'POPULAR' | 'TRENDING';
  isPro?: boolean;
  sampleText: string;
  description: string;
  style: {
    fontFamily: string;
    fontSize?: number;
    color: string;
    activeWordColor?: string;
    secondaryColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    backgroundColor?: string;
    backgroundPadding?: number;
    backgroundRadius?: number;
    shadowBlur?: number;
    shadowColor?: string;
    isItalic?: boolean;
    isBold?: boolean;
    textTransform?: 'uppercase' | 'lowercase' | 'capitalize' | 'none';
    animation?: string;
  };
}

export const CAPTION_CATEGORIES = [
  { id: 'all', label: 'All Templates', icon: 'Sparkles' },
  { id: 'favorites', label: 'Favorites', icon: 'Star' },
  { id: 'trending', label: 'Trending', icon: 'Flame' },
  { id: 'classic', label: 'Classic', icon: 'FileText' },
  { id: 'new', label: 'NEW', icon: 'Zap' },
  { id: 'hits', label: 'Hits', icon: 'Trophy' },
  { id: 'word', label: 'Word', icon: 'Type' },
  { id: 'glow', label: 'Glow', icon: 'Sun' },
  { id: 'lyrics', label: 'Auto lyrics', icon: 'Music' },
] as const;

export const CAPTION_TEMPLATES: CaptionTemplateDefinition[] = [
  {
    id: 'trending-green-italic',
    name: 'The Quick (Green Italic)',
    category: 'trending',
    badge: 'HOT',
    isPro: true,
    sampleText: 'The quick brown fox',
    description: 'Italic green highlight on key word with bold white text and black stroke',
    style: {
      fontFamily: 'Impact, sans-serif',
      color: '#FFFFFF',
      activeWordColor: '#22C55E',
      strokeColor: '#000000',
      strokeWidth: 4,
      isItalic: true,
      isBold: true,
      animation: 'bounce',
    },
  },
  {
    id: 'trending-hormozi-yellow',
    name: 'Hormozi Yellow Pop',
    category: 'trending',
    badge: 'TRENDING',
    isPro: true,
    sampleText: 'THE SECRET TO SUCCESS',
    description: 'High contrast all-caps bold text with bright neon yellow active word pop',
    style: {
      fontFamily: 'Impact, "Arial Black", sans-serif',
      color: '#FFFFFF',
      activeWordColor: '#FACC15',
      strokeColor: '#000000',
      strokeWidth: 6,
      textTransform: 'uppercase',
      shadowColor: 'rgba(0,0,0,0.8)',
      shadowBlur: 10,
      animation: 'bounce',
    },
  },
  {
    id: 'trending-reels-pill',
    name: 'Reels Bouncy Pill',
    category: 'trending',
    badge: 'POPULAR',
    sampleText: 'Wait for the end... 😱',
    description: 'Translucent dark pill with energetic bouncing yellow highlight',
    style: {
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      color: '#FFFFFF',
      activeWordColor: '#FACC15',
      backgroundColor: 'rgba(0, 0, 0, 0.82)',
      backgroundPadding: 12,
      backgroundRadius: 10,
      isBold: true,
      animation: 'slideUp',
    },
  },
  {
    id: 'classic-minimal-white',
    name: 'Clean Subtitle',
    category: 'classic',
    sampleText: 'Standard subtitle formatting',
    description: 'Clean readable white text with soft shadow for universal mobile videos',
    style: {
      fontFamily: 'system-ui, sans-serif',
      color: '#FFFFFF',
      shadowColor: 'rgba(0,0,0,0.9)',
      shadowBlur: 8,
      isBold: true,
    },
  },
  {
    id: 'glow-cyber-cyan',
    name: 'Cyber Neon Glow',
    category: 'glow',
    badge: 'NEW',
    isPro: true,
    sampleText: 'FUTURE IS NOW',
    description: 'Electric cyan glowing outline with neon vibe',
    style: {
      fontFamily: 'Impact, sans-serif',
      color: '#06B6D4',
      activeWordColor: '#C9A84C',
      shadowColor: '#06B6D4',
      shadowBlur: 20,
      textTransform: 'uppercase',
      isBold: true,
    },
  },
];
