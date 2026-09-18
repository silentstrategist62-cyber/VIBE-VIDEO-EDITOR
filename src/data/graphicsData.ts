import { GraphicElement } from '../types/project';

export interface GraphicTemplate {
  id: string;
  name: string;
  category: 'shapes' | 'stickers' | 'lower_thirds' | 'badges' | 'backgrounds';
  preview: string; // emoji, svg snippet, or visual mark
  element: GraphicElement;
  defaultDuration: number;
}

export const GRAPHIC_TEMPLATES: GraphicTemplate[] = [
  // 1. Shapes
  {
    id: 'shape-rounded-card',
    name: 'Rounded Glass Card',
    category: 'shapes',
    preview: '▢',
    defaultDuration: 4.0,
    element: {
      id: 'shape-rounded-card',
      category: 'shape',
      shapeType: 'rounded_rect',
      fillColor: 'rgba(20, 20, 25, 0.85)',
      strokeColor: '#C9A84C',
      strokeWidth: 2,
      cornerRadius: 16,
      shadow: true,
    },
  },
  {
    id: 'shape-circle-ring',
    name: 'Circle Ring / Reticle',
    category: 'shapes',
    preview: '◯',
    defaultDuration: 3.5,
    element: {
      id: 'shape-circle-ring',
      category: 'shape',
      shapeType: 'circle',
      fillColor: 'rgba(201, 168, 76, 0.15)',
      strokeColor: '#C9A84C',
      strokeWidth: 4,
      shadow: true,
    },
  },
  {
    id: 'shape-star-5pt',
    name: 'Golden Star',
    category: 'shapes',
    preview: '★',
    defaultDuration: 3.0,
    element: {
      id: 'shape-star-5pt',
      category: 'shape',
      shapeType: 'star',
      fillColor: '#F59E0B',
      strokeColor: '#FEF3C7',
      strokeWidth: 2,
      shadow: true,
    },
  },
  {
    id: 'shape-arrow-right',
    name: 'Bold Accent Arrow',
    category: 'shapes',
    preview: '➔',
    defaultDuration: 3.0,
    element: {
      id: 'shape-arrow-right',
      category: 'shape',
      shapeType: 'arrow',
      fillColor: '#EF4444',
      strokeColor: '#FFFFFF',
      strokeWidth: 2,
      shadow: true,
    },
  },
  {
    id: 'shape-heart',
    name: 'Love Heart',
    category: 'shapes',
    preview: '♥',
    defaultDuration: 3.0,
    element: {
      id: 'shape-heart',
      category: 'shape',
      shapeType: 'heart',
      fillColor: '#EC4899',
      strokeColor: '#FFFFFF',
      strokeWidth: 2,
      shadow: true,
    },
  },
  {
    id: 'shape-callout-bubble',
    name: 'Speech Callout',
    category: 'shapes',
    preview: '💬',
    defaultDuration: 4.0,
    element: {
      id: 'shape-callout-bubble',
      category: 'shape',
      shapeType: 'bubble',
      fillColor: 'rgba(255, 255, 255, 0.95)',
      strokeColor: '#000000',
      strokeWidth: 3,
      cornerRadius: 18,
      shadow: true,
    },
  },
  {
    id: 'shape-divider-line',
    name: 'Gold Glow Divider',
    category: 'shapes',
    preview: '━',
    defaultDuration: 5.0,
    element: {
      id: 'shape-divider-line',
      category: 'shape',
      shapeType: 'divider',
      fillColor: '#C9A84C',
      strokeColor: '#FBBF24',
      strokeWidth: 3,
      shadow: true,
    },
  },
  {
    id: 'shape-progress-bar',
    name: 'Retention Progress Bar',
    category: 'shapes',
    preview: '▰',
    defaultDuration: 8.0,
    element: {
      id: 'shape-progress-bar',
      category: 'shape',
      shapeType: 'progress',
      fillColor: '#C9A84C',
      strokeColor: 'rgba(255, 255, 255, 0.2)',
      strokeWidth: 1,
      cornerRadius: 6,
      shadow: false,
    },
  },

  // 2. Stickers & Emojis
  {
    id: 'sticker-fire',
    name: 'Viral Fire',
    category: 'stickers',
    preview: '🔥',
    defaultDuration: 3.0,
    element: {
      id: 'sticker-fire',
      category: 'sticker',
      emoji: '🔥',
      shadow: true,
    },
  },
  {
    id: 'sticker-100',
    name: '100 Percent',
    category: 'stickers',
    preview: '💯',
    defaultDuration: 3.0,
    element: {
      id: 'sticker-100',
      category: 'sticker',
      emoji: '💯',
      shadow: true,
    },
  },
  {
    id: 'sticker-lightning',
    name: 'High Voltage',
    category: 'stickers',
    preview: '⚡',
    defaultDuration: 2.5,
    element: {
      id: 'sticker-lightning',
      category: 'sticker',
      emoji: '⚡',
      shadow: true,
    },
  },
  {
    id: 'sticker-skull',
    name: 'Dead / Skull',
    category: 'stickers',
    preview: '💀',
    defaultDuration: 3.0,
    element: {
      id: 'sticker-skull',
      category: 'sticker',
      emoji: '💀',
      shadow: true,
    },
  },
  {
    id: 'sticker-money',
    name: 'Money Bag',
    category: 'stickers',
    preview: '💰',
    defaultDuration: 3.5,
    element: {
      id: 'sticker-money',
      category: 'sticker',
      emoji: '💰',
      shadow: true,
    },
  },
  {
    id: 'sticker-shocked',
    name: 'Mind Blown',
    category: 'stickers',
    preview: '🤯',
    defaultDuration: 3.0,
    element: {
      id: 'sticker-shocked',
      category: 'sticker',
      emoji: '🤯',
      shadow: true,
    },
  },
  {
    id: 'sticker-eyes',
    name: 'Curious Eyes',
    category: 'stickers',
    preview: '👀',
    defaultDuration: 3.0,
    element: {
      id: 'sticker-eyes',
      category: 'sticker',
      emoji: '👀',
      shadow: true,
    },
  },
  {
    id: 'sticker-target',
    name: 'Target Bullseye',
    category: 'stickers',
    preview: '🎯',
    defaultDuration: 3.0,
    element: {
      id: 'sticker-target',
      category: 'sticker',
      emoji: '🎯',
      shadow: true,
    },
  },

  // 3. Badges & CTA
  {
    id: 'badge-subscribe',
    name: 'Subscribe Button',
    category: 'badges',
    preview: '🔔 SUBSCRIBE',
    defaultDuration: 4.0,
    element: {
      id: 'badge-subscribe',
      category: 'badge',
      badgeText: '🔔 SUBSCRIBE',
      fillColor: '#DC2626',
      strokeColor: '#FFFFFF',
      strokeWidth: 2,
      cornerRadius: 24,
      shadow: true,
    },
  },
  {
    id: 'badge-verified',
    name: 'Verified Checkmark',
    category: 'badges',
    preview: '☑ VERIFIED',
    defaultDuration: 4.0,
    element: {
      id: 'badge-verified',
      category: 'badge',
      badgeText: '✓ VERIFIED CREATOR',
      fillColor: '#0284C7',
      strokeColor: '#BAE6FD',
      strokeWidth: 1.5,
      cornerRadius: 12,
      shadow: true,
    },
  },
  {
    id: 'badge-4k-hdr',
    name: '4K Ultra HD Badge',
    category: 'badges',
    preview: '4K HDR',
    defaultDuration: 5.0,
    element: {
      id: 'badge-4k-hdr',
      category: 'badge',
      badgeText: '4K ULTRA HD',
      fillColor: 'rgba(0, 0, 0, 0.8)',
      strokeColor: '#F59E0B',
      strokeWidth: 2,
      cornerRadius: 6,
      shadow: true,
    },
  },
  {
    id: 'badge-new-alert',
    name: 'NEW DROP Alert',
    category: 'badges',
    preview: '★ NEW DROP',
    defaultDuration: 3.5,
    element: {
      id: 'badge-new-alert',
      category: 'badge',
      badgeText: '⚡ NEW EPISODE',
      fillColor: '#7C3AED',
      strokeColor: '#DDD6FE',
      strokeWidth: 2,
      cornerRadius: 20,
      shadow: true,
    },
  },

  // 4. Lower Thirds
  {
    id: 'lower-streamer',
    name: 'Creator Name & Handle',
    category: 'lower_thirds',
    preview: '👤 Creator',
    defaultDuration: 4.5,
    element: {
      id: 'lower-streamer',
      category: 'lower_third',
      title: 'ALEX VANCE',
      subtitle: '@alexvance_creator',
      fillColor: 'rgba(15, 15, 20, 0.92)',
      strokeColor: '#C9A84C',
      strokeWidth: 1.5,
      cornerRadius: 12,
      shadow: true,
    },
  },
  {
    id: 'lower-breaking-news',
    name: 'Breaking News Ticker',
    category: 'lower_thirds',
    preview: '🔴 BREAKING',
    defaultDuration: 5.0,
    element: {
      id: 'lower-breaking-news',
      category: 'lower_third',
      title: 'BREAKING REPORT',
      subtitle: 'Major breakthroughs announced live from development team',
      fillColor: 'rgba(185, 28, 28, 0.95)',
      strokeColor: '#FFFFFF',
      strokeWidth: 1,
      cornerRadius: 8,
      shadow: true,
    },
  },
  {
    id: 'lower-cyber-hud',
    name: 'Cyberpunk Tech Tag',
    category: 'lower_thirds',
    preview: '▰ SYSTEM: 01',
    defaultDuration: 4.0,
    element: {
      id: 'lower-cyber-hud',
      category: 'lower_third',
      title: 'SYS.PROTOCOL // ONLINE',
      subtitle: 'Neural link latency 0.4ms • 60 FPS verified',
      fillColor: 'rgba(6, 78, 59, 0.9)',
      strokeColor: '#C9A84C',
      strokeWidth: 2,
      cornerRadius: 4,
      shadow: true,
    },
  },
  {
    id: 'lower-quote-card',
    name: 'Minimalist Quote Card',
    category: 'lower_thirds',
    preview: '“ Quote Card ”',
    defaultDuration: 5.0,
    element: {
      id: 'lower-quote-card',
      category: 'lower_third',
      title: '“ Focus is a muscle that compounds. ”',
      subtitle: '— Daily Stoic Practice',
      fillColor: 'rgba(18, 18, 22, 0.9)',
      strokeColor: '#6B7280',
      strokeWidth: 1,
      cornerRadius: 14,
      shadow: true,
    },
  },

  // 5. Backgrounds & Patterns
  {
    id: 'bg-spotlight',
    name: 'Studio Spotlight',
    category: 'backgrounds',
    preview: 'Radial Glow',
    defaultDuration: 6.0,
    element: {
      id: 'bg-spotlight',
      category: 'background',
      fillColor: 'radial:#1e1e24:#09090b',
      shadow: false,
    },
  },
  {
    id: 'bg-cyber-grid',
    name: 'Cyberpunk Neon Grid',
    category: 'backgrounds',
    preview: 'Grid Matrix',
    defaultDuration: 6.0,
    element: {
      id: 'bg-cyber-grid',
      category: 'background',
      fillColor: '#0a0a12',
      strokeColor: 'rgba(56, 189, 248, 0.25)',
      shadow: false,
    },
  },
  {
    id: 'bg-sunset-gold',
    name: 'Golden Hour Gradient',
    category: 'backgrounds',
    preview: 'Gold Velvet',
    defaultDuration: 6.0,
    element: {
      id: 'bg-sunset-gold',
      category: 'background',
      fillColor: 'linear:#2a1b0a:#0a0a0c',
      strokeColor: '#C9A84C',
      shadow: false,
    },
  },
  {
    id: 'bg-matte-black',
    name: 'Pure Matte Black',
    category: 'backgrounds',
    preview: 'Matte Deep',
    defaultDuration: 6.0,
    element: {
      id: 'bg-matte-black',
      category: 'background',
      fillColor: '#0a0a0a',
      shadow: false,
    },
  },
];

export const GRAPHIC_CATEGORIES = [
  { id: 'all', label: 'All Graphics' },
  { id: 'shapes', label: 'Shapes & Lines' },
  { id: 'stickers', label: 'Stickers & Emojis' },
  { id: 'badges', label: 'Badges & CTAs' },
  { id: 'lower_thirds', label: 'Lower Thirds' },
  { id: 'backgrounds', label: 'Backgrounds' },
] as const;

/**
 * Creates a high-definition canvas data URL for a graphic element so it can be previewed or cached
 */
export function generateGraphicPreviewUrl(element: GraphicElement): string {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 340;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (element.category === 'sticker' && element.emoji) {
    ctx.font = '140px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(element.emoji, canvas.width / 2, canvas.height / 2);
  } else if (element.category === 'shape') {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    ctx.fillStyle = element.fillColor || '#C9A84C';
    ctx.strokeStyle = element.strokeColor || '#FFFFFF';
    ctx.lineWidth = element.strokeWidth || 3;

    if (element.shapeType === 'circle') {
      ctx.beginPath();
      ctx.arc(cx, cy, 90, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (element.shapeType === 'star') {
      ctx.beginPath();
      const points = 5;
      const outerR = 100;
      const innerR = 45;
      for (let i = 0; i < points * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (i * Math.PI) / points - Math.PI / 2;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      // Rounded rect default
      const w = 360;
      const h = 160;
      ctx.beginPath();
      const r = element.cornerRadius || 16;
      ctx.roundRect ? ctx.roundRect(cx - w / 2, cy - h / 2, w, h, r) : ctx.rect(cx - w / 2, cy - h / 2, w, h);
      ctx.fill();
      ctx.stroke();
    }
  } else if (element.category === 'badge' && element.badgeText) {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const w = 380;
    const h = 80;
    ctx.fillStyle = element.fillColor || '#DC2626';
    ctx.strokeStyle = element.strokeColor || '#FFFFFF';
    ctx.lineWidth = element.strokeWidth || 3;
    ctx.beginPath();
    const r = element.cornerRadius || 24;
    ctx.roundRect ? ctx.roundRect(cx - w / 2, cy - h / 2, w, h, r) : ctx.rect(cx - w / 2, cy - h / 2, w, h);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 30px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(element.badgeText, cx, cy);
  } else if (element.category === 'lower_third') {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const w = 480;
    const h = 120;
    ctx.fillStyle = element.fillColor || 'rgba(15,15,20,0.95)';
    ctx.strokeStyle = element.strokeColor || '#C9A84C';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 14) : ctx.rect(cx - w / 2, cy - h / 2, w, h);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(element.title || 'LOWER THIRD', cx, cy - 12);

    ctx.fillStyle = '#C9A84C';
    ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(element.subtitle || 'Subtext line goes here', cx, cy + 24);
  }

  return canvas.toDataURL('image/png');
}
