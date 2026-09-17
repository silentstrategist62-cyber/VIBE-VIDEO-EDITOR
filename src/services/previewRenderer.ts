import { ProjectDocument, Clip, Transform, ColorAdjust, ClipEffect, GraphicElement, TextOverlayElement } from '../types/project';
import { projectStore } from '../store/projectStore';

/**
 * Keyframe property interpolator with easing
 */
export function interpolateKeyframes(
  clip: Clip,
  currentTimeInClip: number,
  baseTransform: Transform
): Transform {
  const result: Transform = { ...baseTransform };
  if (!clip.keyframes || clip.keyframes.length === 0) {
    return result;
  }

  // Properties to check
  const properties: (keyof Transform)[] = ['scale', 'positionX', 'positionY', 'rotation', 'opacity'];

  for (const prop of properties) {
    const kfs = clip.keyframes
      .filter((k) => k.property === prop)
      .sort((a, b) => a.time - b.time);

    if (kfs.length === 0) continue;

    if (currentTimeInClip <= kfs[0].time) {
      result[prop] = kfs[0].value;
      continue;
    }

    if (currentTimeInClip >= kfs[kfs.length - 1].time) {
      result[prop] = kfs[kfs.length - 1].value;
      continue;
    }

    // Find bounding keyframes
    for (let i = 0; i < kfs.length - 1; i++) {
      const k1 = kfs[i];
      const k2 = kfs[i + 1];
      if (currentTimeInClip >= k1.time && currentTimeInClip <= k2.time) {
        const segDuration = k2.time - k1.time;
        if (segDuration <= 0) {
          result[prop] = k1.value;
        } else {
          let t = (currentTimeInClip - k1.time) / segDuration;

          // Easing
          if (k1.easing === 'easeInOut') {
            t = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
          } else if (k1.easing === 'easeIn') {
            t = t * t;
          } else if (k1.easing === 'easeOut') {
            t = t * (2 - t);
          }

          result[prop] = k1.value + (k2.value - k1.value) * t;
        }
        break;
      }
    }
  }

  return result;
}

/**
 * Image and Video cache for smooth 60fps canvas playback
 */
export interface MediaStatus {
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  element?: HTMLVideoElement | HTMLImageElement;
}

const mediaStatusCache = new Map<string, MediaStatus>();
const imageCache: Map<string, HTMLImageElement> = new Map();
const videoCache: Map<string, HTMLVideoElement> = new Map();

function parseVideoError(err: MediaError | null): string {
  if (!err) return 'Failed to load video file source';
  switch (err.code) {
    case 1:
      return 'Video loading was aborted by browser';
    case 2:
      return 'Network error occurred while fetching video source';
    case 3:
      return 'Video decoding failed (unsupported format or corrupted file)';
    case 4:
      return 'Video source not supported or URL expired';
    default:
      return err.message || 'Video file source could not be played';
  }
}

export function getVideoStatus(url: string): MediaStatus {
  if (!url) return { status: 'error', error: 'No media source URL provided' };
  const cached = mediaStatusCache.get(url);
  if (cached) return cached;

  const vid = videoCache.get(url);
  if (vid) {
    if (vid.error) {
      return { status: 'error', error: parseVideoError(vid.error), element: vid };
    }
    if (vid.readyState >= 2) {
      return { status: 'ready', error: null, element: vid };
    }
    return { status: 'loading', error: null, element: vid };
  }
  return { status: 'loading', error: null };
}

export function retryVideoLoad(url: string): void {
  const vid = videoCache.get(url);
  if (vid) {
    mediaStatusCache.set(url, { status: 'loading', error: null, element: vid });
    try {
      vid.load();
    } catch {}
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('canvas-needs-redraw'));
    }
  }
}

export function getImageStatus(url: string): MediaStatus {
  if (!url) return { status: 'error', error: 'No image source URL provided' };
  const cached = mediaStatusCache.get(url);
  if (cached) return cached;
  const img = imageCache.get(url);
  if (img) {
    if (img.complete && img.naturalWidth > 0) {
      return { status: 'ready', error: null, element: img };
    }
  }
  return { status: 'loading', error: null };
}

export function getOrCreateVideoElement(url: string): HTMLVideoElement {
  let vid = videoCache.get(url);
  if (!vid) {
    vid = document.createElement('video');
    if (!url.startsWith('blob:') && !url.startsWith('data:')) {
      vid.crossOrigin = 'anonymous';
    }
    vid.muted = false;
    vid.playsInline = true;
    vid.preload = 'auto';

    mediaStatusCache.set(url, { status: 'loading', error: null, element: vid });

    vid.onloadeddata = () => {
      mediaStatusCache.set(url, { status: 'ready', error: null, element: vid });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('canvas-needs-redraw'));
      }
    };
    vid.oncanplay = () => {
      mediaStatusCache.set(url, { status: 'ready', error: null, element: vid });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('canvas-needs-redraw'));
      }
    };
    vid.onseeked = () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('canvas-needs-redraw'));
      }
    };
    vid.onerror = () => {
      const errMsg = parseVideoError(vid.error);
      mediaStatusCache.set(url, { status: 'error', error: errMsg, element: vid });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('canvas-needs-redraw'));
      }
    };

    vid.src = url;
    try {
      vid.load();
    } catch {
      // Ignore load trigger error
    }
    videoCache.set(url, vid);
  }
  return vid;
}

export function preloadImage(url: string): Promise<HTMLImageElement> {
  if (imageCache.has(url)) {
    return Promise.resolve(imageCache.get(url)!);
  }
  const img = new Image();
  if (!url.startsWith('blob:') && !url.startsWith('data:')) {
    img.crossOrigin = 'anonymous';
  }
  imageCache.set(url, img);
  mediaStatusCache.set(url, { status: 'loading', error: null, element: img });

  return new Promise((resolve) => {
    img.onload = () => {
      mediaStatusCache.set(url, { status: 'ready', error: null, element: img });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('canvas-needs-redraw'));
      }
      resolve(img);
    };
    img.onerror = () => {
      // Fallback load without crossOrigin for local/blob/non-CORS assets
      const fallback = new Image();
      fallback.onload = () => {
        imageCache.set(url, fallback);
        mediaStatusCache.set(url, { status: 'ready', error: null, element: fallback });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('canvas-needs-redraw'));
        }
        resolve(fallback);
      };
      fallback.onerror = () => {
        mediaStatusCache.set(url, { status: 'error', error: 'Failed to load image file source', element: fallback });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('canvas-needs-redraw'));
        }
        resolve(fallback);
      };
      fallback.src = url;
    };
    img.src = url;
  });
}

/**
 * Preloads all media assets in the project document
 */
export async function preloadAllProjectAssets(project: ProjectDocument): Promise<void> {
  const urls = Object.values(project.assets)
    .filter((a) => a.url)
    .map((a) => a.url);
  await Promise.all(urls.map((u) => preloadImage(u)));
}

/**
 * Safe rounded rectangle helper
 */
export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(x, y, w, h, r);
  } else {
    const radius = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}

export function renderMediaErrorCard(
  ctx: CanvasRenderingContext2D,
  filename: string,
  errorText: string,
  drawW: number,
  drawH: number
): void {
  ctx.fillStyle = '#140c10';
  ctx.beginPath();
  drawRoundedRect(ctx, -drawW * 0.4, -drawH * 0.2, drawW * 0.8, drawH * 0.4, 20);
  ctx.fill();
  ctx.strokeStyle = '#F43F5E';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = '#F43F5E';
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚠️ MEDIA SOURCE ERROR', 0, -35);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(filename, 0, 10);

  ctx.fillStyle = '#FDA4AF';
  ctx.font = '16px sans-serif';
  ctx.fillText(errorText, 0, 48);
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Applies one of the 55 transitions on an incoming clip canvas context
 */
function applyTransitionTransformAndClip(
  ctx: CanvasRenderingContext2D,
  type: string,
  progress: number, // 0 (start of transition) to 1 (fully visible)
  drawW: number,
  drawH: number
): { alphaMultiplier: number; postOverlay?: (ctx: CanvasRenderingContext2D) => void } {
  let alphaMultiplier = 1.0;
  let postOverlay: ((ctx: CanvasRenderingContext2D) => void) | undefined;
  const rawP = Math.max(0, Math.min(1, progress));
  const p = easeInOutCubic(rawP);

  switch (type) {
    // 1. Fades & Dissolves
    case 'crossfade':
      alphaMultiplier = p;
      break;

    case 'dipToBlack':
      alphaMultiplier = p < 0.4 ? 0 : (p - 0.4) / 0.6;
      postOverlay = (oCtx) => {
        if (p < 0.5) {
          oCtx.fillStyle = `rgba(0, 0, 0, ${(1 - p * 2).toFixed(2)})`;
          oCtx.fillRect(-drawW / 2, -drawH / 2, drawW, drawH);
        }
      };
      break;

    case 'dipToWhite':
      alphaMultiplier = p < 0.35 ? 0 : (p - 0.35) / 0.65;
      postOverlay = (oCtx) => {
        if (p < 0.6) {
          const wAlpha = p < 0.3 ? p / 0.3 : (0.6 - p) / 0.3;
          oCtx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, wAlpha * 1.5).toFixed(2)})`;
          oCtx.fillRect(-drawW / 2, -drawH / 2, drawW, drawH);
        }
      };
      break;

    case 'lumaFade':
      alphaMultiplier = Math.pow(p, 1.4);
      break;

    case 'dreamyBlur':
      alphaMultiplier = p;
      if (p < 0.9) {
        ctx.filter = `blur(${(1 - p) * 18}px)`;
      }
      break;

    case 'vaporize':
      alphaMultiplier = Math.pow(p, 1.8);
      ctx.scale(1 + (1 - p) * 0.15, 1 + (1 - p) * 0.15);
      break;

    // 2. Wipes & Blinds
    case 'wipeLeft': {
      ctx.beginPath();
      const cutX = -drawW / 2 + drawW * (1 - p);
      ctx.rect(cutX, -drawH / 2, drawW * p, drawH);
      ctx.clip();
      break;
    }
    case 'wipeRight': {
      ctx.beginPath();
      ctx.rect(-drawW / 2, -drawH / 2, drawW * p, drawH);
      ctx.clip();
      break;
    }
    case 'wipeUp': {
      ctx.beginPath();
      const cutY = -drawH / 2 + drawH * (1 - p);
      ctx.rect(-drawW / 2, cutY, drawW, drawH * p);
      ctx.clip();
      break;
    }
    case 'wipeDown': {
      ctx.beginPath();
      ctx.rect(-drawW / 2, -drawH / 2, drawW, drawH * p);
      ctx.clip();
      break;
    }
    case 'wipeDiagonal': {
      ctx.beginPath();
      const d = (drawW + drawH) * p;
      ctx.moveTo(-drawW / 2, -drawH / 2);
      ctx.lineTo(-drawW / 2 + d, -drawH / 2);
      ctx.lineTo(-drawW / 2, -drawH / 2 + d);
      ctx.closePath();
      ctx.clip();
      break;
    }
    case 'wipeDiagonalInv': {
      ctx.beginPath();
      const d = (drawW + drawH) * p;
      ctx.moveTo(drawW / 2, -drawH / 2);
      ctx.lineTo(drawW / 2 - d, -drawH / 2);
      ctx.lineTo(drawW / 2, -drawH / 2 + d);
      ctx.closePath();
      ctx.clip();
      break;
    }
    case 'clockWipe': {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, Math.max(drawW, drawH) * 1.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p);
      ctx.closePath();
      ctx.clip();
      break;
    }
    case 'blindsHorizontal': {
      ctx.beginPath();
      const slats = 8;
      const slatH = drawH / slats;
      for (let i = 0; i < slats; i++) {
        ctx.rect(-drawW / 2, -drawH / 2 + i * slatH, drawW, slatH * p);
      }
      ctx.clip();
      break;
    }
    case 'blindsVertical': {
      ctx.beginPath();
      const slats = 8;
      const slatW = drawW / slats;
      for (let i = 0; i < slats; i++) {
        ctx.rect(-drawW / 2 + i * slatW, -drawH / 2, slatW * p, drawH);
      }
      ctx.clip();
      break;
    }

    // 3. Slides & Pushes
    case 'slideLeft':
      ctx.translate(drawW * (1 - p), 0);
      break;
    case 'slideRight':
      ctx.translate(-drawW * (1 - p), 0);
      break;
    case 'slideUp':
      ctx.translate(0, drawH * (1 - p));
      break;
    case 'slideDown':
      ctx.translate(0, -drawH * (1 - p));
      break;
    case 'splitHorizontal': {
      ctx.beginPath();
      const openW = (drawW / 2) * p;
      ctx.rect(-openW, -drawH / 2, openW * 2, drawH);
      ctx.clip();
      break;
    }
    case 'splitVertical': {
      ctx.beginPath();
      const openH = (drawH / 2) * p;
      ctx.rect(-drawW / 2, -openH, drawW, openH * 2);
      ctx.clip();
      break;
    }

    // 4. Zooms & Scales
    case 'zoomIn': {
      const s = 0.2 + 0.8 * p;
      ctx.scale(s, s);
      alphaMultiplier = p;
      break;
    }
    case 'zoomOut': {
      const s = 2.0 - 1.0 * p;
      ctx.scale(s, s);
      alphaMultiplier = p;
      break;
    }
    case 'zoomBlur': {
      const s = 0.5 + 0.5 * p;
      ctx.scale(s, s);
      alphaMultiplier = p;
      if (p < 0.8) {
        ctx.filter = `blur(${(1 - p) * 14}px)`;
      }
      break;
    }
    case 'crossZoom': {
      const s = 1.6 - 0.6 * p;
      ctx.scale(s, s);
      alphaMultiplier = p;
      break;
    }
    case 'squeezeIn': {
      ctx.scale(p, 1);
      alphaMultiplier = p;
      break;
    }
    case 'bounceIn': {
      let bScale = p < 0.6 ? (p / 0.6) * 1.15 : 1.15 - ((p - 0.6) / 0.4) * 0.15;
      ctx.scale(bScale, bScale);
      alphaMultiplier = Math.min(1, p * 1.5);
      break;
    }
    case 'elasticSnap': {
      const overshoot = Math.sin(p * Math.PI) * 0.2;
      const s = p + overshoot;
      ctx.scale(s, s);
      alphaMultiplier = p;
      break;
    }

    // 5. Rotations & 3D
    case 'spinClockwise':
      ctx.rotate((1 - p) * Math.PI * 2);
      ctx.scale(p, p);
      alphaMultiplier = p;
      break;
    case 'spinCounter':
      ctx.rotate(-(1 - p) * Math.PI * 2);
      ctx.scale(p, p);
      alphaMultiplier = p;
      break;
    case 'flipHorizontal': {
      const cosAngle = Math.abs(Math.cos((1 - p) * Math.PI * 0.5));
      ctx.scale(Math.max(0.01, cosAngle), 1);
      alphaMultiplier = p;
      break;
    }
    case 'flipVertical': {
      const cosAngle = Math.abs(Math.cos((1 - p) * Math.PI * 0.5));
      ctx.scale(1, Math.max(0.01, cosAngle));
      alphaMultiplier = p;
      break;
    }
    case 'swirlVortex':
      ctx.rotate((1 - p) * Math.PI);
      ctx.scale(p, p);
      alphaMultiplier = p;
      break;
    case 'pageCurl': {
      ctx.beginPath();
      const w = drawW;
      const h = drawH;
      const C = (w * w + h * h) * (0.5 - 1.35 * p);

      if (C >= 0.5 * (w * w + h * h)) {
        ctx.rect(-w / 2, -h / 2, 0, 0);
      } else if (C <= -0.5 * (w * w + h * h)) {
        ctx.rect(-w / 2, -h / 2, w, h);
      } else {
        ctx.moveTo(w / 2, h / 2);
        const xBottom = Math.min(w / 2, Math.max(-w / 2, (C - (h * h) / 2) / w));
        ctx.lineTo(xBottom, h / 2);

        const yLeft = Math.min(h / 2, Math.max(-h / 2, (C + (w * w) / 2) / h));
        if (xBottom <= -w / 2) {
          ctx.lineTo(-w / 2, yLeft);
        }

        const xTop = Math.min(w / 2, Math.max(-w / 2, (C + (h * h) / 2) / w));
        if (yLeft <= -h / 2) {
          ctx.lineTo(xTop, -h / 2);
        }

        const yRight = Math.min(h / 2, Math.max(-h / 2, (C - (w * w) / 2) / h));
        ctx.lineTo(w / 2, yRight);
        ctx.closePath();
      }
      ctx.clip();

      postOverlay = (oCtx) => {
        if (p > 0.02 && p < 0.98) {
          oCtx.save();
          const x1 = -w / 2;
          const y1 = Math.min(h / 2, Math.max(-h / 2, (C - w * x1) / h));
          const x2 = w / 2;
          const y2 = Math.min(h / 2, Math.max(-h / 2, (C - w * x2) / h));

          oCtx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
          oCtx.lineWidth = 12;
          oCtx.shadowColor = 'rgba(0, 0, 0, 0.6)';
          oCtx.shadowBlur = 10;
          oCtx.beginPath();
          oCtx.moveTo(x1, y1);
          oCtx.lineTo(x2, y2);
          oCtx.stroke();
          oCtx.restore();

          oCtx.save();
          oCtx.strokeStyle = '#F0EAD6';
          oCtx.lineWidth = 6;
          oCtx.beginPath();
          oCtx.moveTo(x1, y1);
          oCtx.lineTo(x2, y2);
          oCtx.stroke();

          oCtx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
          oCtx.lineWidth = 2;
          oCtx.beginPath();
          oCtx.moveTo(x1, y1);
          oCtx.lineTo(x2, y2);
          oCtx.stroke();
          oCtx.restore();
        }
      };
      break;
    }

    // 6. Glitch & Distortions
    case 'glitch': {
      alphaMultiplier = p;
      if (p < 0.8) {
        const jitter = (Math.random() - 0.5) * 40 * (1 - p);
        ctx.translate(jitter, 0);
      }
      break;
    }
    case 'rgbSplit': {
      alphaMultiplier = p;
      if (p < 0.85) {
        ctx.translate((Math.random() - 0.5) * 20 * (1 - p), 0);
      }
      break;
    }
    case 'tvStatic':
      alphaMultiplier = p;
      postOverlay = (oCtx) => {
        if (p < 0.7) {
          oCtx.fillStyle = `rgba(255, 255, 255, ${((1 - p) * 0.35).toFixed(2)})`;
          for (let y = -drawH / 2; y < drawH / 2; y += 8) {
            oCtx.fillRect(-drawW / 2, y, drawW, 2);
          }
        }
      };
      break;
    case 'pixelateDissolve':
      alphaMultiplier = p;
      break;
    case 'rippleWave': {
      const wave = Math.sin(p * Math.PI * 4) * 20 * (1 - p);
      ctx.translate(wave, 0);
      alphaMultiplier = p;
      break;
    }
    case 'kaleidoscope':
      alphaMultiplier = p;
      ctx.rotate((1 - p) * 0.5);
      break;
    case 'stretchHorizontal':
      ctx.scale(1 + (1 - p) * 1.5, 1);
      alphaMultiplier = p;
      break;
    case 'stretchVertical':
      ctx.scale(1, 1 + (1 - p) * 1.5);
      alphaMultiplier = p;
      break;

    // 7. Shapes & Iris Reveals
    case 'circleCropIn': {
      ctx.beginPath();
      const maxR = Math.hypot(drawW, drawH) / 2;
      ctx.arc(0, 0, maxR * p, 0, Math.PI * 2);
      ctx.clip();
      break;
    }
    case 'circleCropOut': {
      ctx.beginPath();
      const maxR = Math.hypot(drawW, drawH) / 2;
      ctx.arc(0, 0, maxR * (1 - p * 0.5), 0, Math.PI * 2);
      ctx.clip();
      alphaMultiplier = p;
      break;
    }
    case 'diamondReveal': {
      ctx.beginPath();
      const maxD = Math.max(drawW, drawH) * p;
      ctx.moveTo(0, -maxD);
      ctx.lineTo(maxD, 0);
      ctx.lineTo(0, maxD);
      ctx.lineTo(-maxD, 0);
      ctx.closePath();
      ctx.clip();
      break;
    }
    case 'starReveal': {
      ctx.beginPath();
      const points = 5;
      const outerR = Math.max(drawW, drawH) * p;
      const innerR = outerR * 0.45;
      for (let i = 0; i < points * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (i * Math.PI) / points - Math.PI / 2;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.clip();
      break;
    }
    case 'heartReveal': {
      ctx.beginPath();
      const s = (Math.max(drawW, drawH) / 250) * p;
      ctx.scale(s, s);
      ctx.moveTo(0, -50);
      ctx.bezierCurveTo(-50, -120, -150, -60, -150, 20);
      ctx.bezierCurveTo(-150, 90, -70, 160, 0, 220);
      ctx.bezierCurveTo(70, 160, 150, 90, 150, 20);
      ctx.bezierCurveTo(150, -60, 50, -120, 0, -50);
      ctx.closePath();
      ctx.clip();
      break;
    }
    case 'checkerboard': {
      ctx.beginPath();
      const grid = 6;
      const stepW = drawW / grid;
      const stepH = drawH / grid;
      for (let gx = 0; gx < grid; gx++) {
        for (let gy = 0; gy < grid; gy++) {
          if ((gx + gy) % 2 === 0 || p > 0.5) {
            ctx.rect(-drawW / 2 + gx * stepW, -drawH / 2 + gy * stepH, stepW * Math.min(1, p * 1.5), stepH * Math.min(1, p * 1.5));
          }
        }
      }
      ctx.clip();
      break;
    }
    case 'gridDissolve': {
      ctx.beginPath();
      const cols = 5;
      const rows = 8;
      const bw = drawW / cols;
      const bh = drawH / rows;
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const thresh = ((c * 7 + r * 13) % 40) / 40;
          if (p >= thresh) {
            ctx.rect(-drawW / 2 + c * bw, -drawH / 2 + r * bh, bw, bh);
          }
        }
      }
      ctx.clip();
      break;
    }

    // 8. Light, Film & Dynamic
    case 'filmBurn':
      alphaMultiplier = p;
      postOverlay = (oCtx) => {
        if (p < 0.7) {
          const burnAlpha = ((1 - p) * 0.7).toFixed(2);
          const grad = oCtx.createRadialGradient(0, 0, 10, 0, 0, drawW * 0.8);
          grad.addColorStop(0, `rgba(255, 200, 100, ${burnAlpha})`);
          grad.addColorStop(0.5, `rgba(230, 80, 20, ${burnAlpha})`);
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          oCtx.fillStyle = grad;
          oCtx.fillRect(-drawW / 2, -drawH / 2, drawW, drawH);
        }
      };
      break;
    case 'flashLightning':
      alphaMultiplier = p < 0.2 ? 0 : (p - 0.2) / 0.8;
      postOverlay = (oCtx) => {
        if (p < 0.4) {
          oCtx.fillStyle = `rgba(255, 255, 255, ${(0.8 - p * 2).toFixed(2)})`;
          oCtx.fillRect(-drawW / 2, -drawH / 2, drawW, drawH);
        }
      };
      break;
    case 'filmRoll':
      ctx.translate(0, (1 - p) * drawH * 0.4);
      alphaMultiplier = p;
      break;
    case 'windStreak':
      ctx.translate((1 - p) * drawW * 0.35, 0);
      alphaMultiplier = p;
      break;
    case 'colorDistance':
      alphaMultiplier = p;
      postOverlay = (oCtx) => {
        if (p < 0.6) {
          oCtx.fillStyle = `rgba(200, 50, 255, ${(0.3 * (1 - p)).toFixed(2)})`;
          oCtx.fillRect(-drawW / 2, -drawH / 2, drawW, drawH);
        }
      };
      break;
    case 'doorway3D':
      ctx.scale(0.4 + 0.6 * p, 0.4 + 0.6 * p);
      alphaMultiplier = p;
      break;

    default:
      alphaMultiplier = p;
      break;
  }

  return { alphaMultiplier, postOverlay };
}

/**
 * Applies active visual effects onto canvas for a clip
 */
function applyVisualEffectsToClip(
  ctx: CanvasRenderingContext2D,
  effects: ClipEffect[] | undefined,
  drawW: number,
  drawH: number
): void {
  if (!effects || effects.length === 0) return;

  for (const eff of effects) {
    if (!eff.enabled) continue;
    const intensity = eff.intensity / 100;

    switch (eff.type) {
      case 'blur':
        ctx.filter = `${ctx.filter !== 'none' ? ctx.filter : ''} blur(${intensity * 20}px)`.trim();
        break;

      case 'glow':
        // Highlight bloom glow
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = intensity * 0.45;
        ctx.filter = `blur(${intensity * 25}px)`;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
        break;

      case 'sharpen':
        ctx.filter = `${ctx.filter !== 'none' ? ctx.filter : ''} contrast(${100 + intensity * 60}%)`.trim();
        break;

      case 'glitch':
        // Horizontal scanline displacement slices
        if (Math.random() < 0.35 * intensity) {
          const sliceH = Math.random() * 40 + 10;
          const sliceY = -drawH / 2 + Math.random() * (drawH - sliceH);
          const offset = (Math.random() - 0.5) * 50 * intensity;
          ctx.save();
          ctx.beginPath();
          ctx.rect(-drawW / 2, sliceY, drawW, sliceH);
          ctx.clip();
          ctx.translate(offset, 0);
          ctx.restore();
        }
        break;

      case 'rgb_split':
        // Channel separation
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = `rgba(255, 0, 50, ${intensity * 0.15})`;
        ctx.fillRect(-drawW / 2 - 8 * intensity, -drawH / 2, drawW, drawH);
        ctx.fillStyle = `rgba(0, 220, 255, ${intensity * 0.15})`;
        ctx.fillRect(-drawW / 2 + 8 * intensity, -drawH / 2, drawW, drawH);
        ctx.restore();
        break;

      case 'vhs':
        // Interlaced scanlines & tape noise
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        for (let y = -drawH / 2; y < drawH / 2; y += 6) {
          ctx.fillRect(-drawW / 2, y, drawW, 2);
        }
        // Phosphor edge tint
        ctx.fillStyle = `rgba(0, 255, 100, ${intensity * 0.08})`;
        ctx.fillRect(-drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
        break;

      case 'film_grain':
        // Random micro grain particles
        ctx.save();
        ctx.fillStyle = `rgba(255, 255, 255, ${intensity * 0.12})`;
        const grainCount = Math.floor(150 * intensity);
        for (let i = 0; i < grainCount; i++) {
          const gx = -drawW / 2 + Math.random() * drawW;
          const gy = -drawH / 2 + Math.random() * drawH;
          const sz = Math.random() * 2 + 1;
          ctx.fillRect(gx, gy, sz, sz);
        }
        ctx.restore();
        break;

      case 'sepia':
        ctx.filter = `${ctx.filter !== 'none' ? ctx.filter : ''} sepia(${intensity * 100}%)`.trim();
        break;

      case 'noir':
        ctx.filter = `${ctx.filter !== 'none' ? ctx.filter : ''} grayscale(100%) contrast(${100 + intensity * 70}%)`.trim();
        break;

      case 'duotone':
        // Cyan-magenta synthwave mapping
        ctx.save();
        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = `rgba(6, 182, 212, ${intensity * 0.6})`;
        ctx.fillRect(-drawW / 2, -drawH / 2, drawW, drawH);
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = `rgba(236, 72, 153, ${intensity * 0.6})`;
        ctx.fillRect(-drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
        break;

      case 'heatmap':
        ctx.save();
        ctx.globalCompositeOperation = 'difference';
        ctx.fillStyle = `rgba(239, 68, 68, ${intensity * 0.8})`;
        ctx.fillRect(-drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
        break;

      case 'invert':
        ctx.filter = `${ctx.filter !== 'none' ? ctx.filter : ''} invert(${intensity * 100}%)`.trim();
        break;

      case 'edge_glow':
        ctx.filter = `${ctx.filter !== 'none' ? ctx.filter : ''} contrast(200%)`.trim();
        ctx.save();
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 2;
        ctx.strokeRect(-drawW / 2 + 10, -drawH / 2 + 10, drawW - 20, drawH - 20);
        ctx.restore();
        break;

      case 'halftone':
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        for (let x = -drawW / 2; x < drawW / 2; x += 16) {
          for (let y = -drawH / 2; y < drawH / 2; y += 16) {
            ctx.beginPath();
            ctx.arc(x + 8, y + 8, 3 * intensity, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
        break;
    }
  }
}

/**
 * Renders graphic elements (shapes, stickers, lower thirds, badges, backgrounds)
 */
function renderGraphicElement(
  ctx: CanvasRenderingContext2D,
  element: GraphicElement,
  drawW: number,
  drawH: number
): void {
  ctx.save();

  if (element.shadow) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 6;
  }

  if (element.category === 'sticker' && element.emoji) {
    ctx.font = '160px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(element.emoji, 0, 0);
  } else if (element.category === 'shape') {
    ctx.fillStyle = element.fillColor || '#C9A84C';
    ctx.strokeStyle = element.strokeColor || '#FFFFFF';
    ctx.lineWidth = element.strokeWidth || 3;

    if (element.shapeType === 'circle') {
      ctx.beginPath();
      ctx.arc(0, 0, Math.min(drawW, drawH) * 0.25, 0, Math.PI * 2);
      ctx.fill();
      if (element.strokeWidth) ctx.stroke();
    } else if (element.shapeType === 'star') {
      ctx.beginPath();
      const points = 5;
      const outerR = Math.min(drawW, drawH) * 0.28;
      const innerR = outerR * 0.45;
      for (let i = 0; i < points * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (i * Math.PI) / points - Math.PI / 2;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      if (element.strokeWidth) ctx.stroke();
    } else if (element.shapeType === 'arrow') {
      ctx.beginPath();
      const w = 240;
      const h = 120;
      ctx.moveTo(-w / 2, -h / 4);
      ctx.lineTo(0, -h / 4);
      ctx.lineTo(0, -h / 2);
      ctx.lineTo(w / 2, 0);
      ctx.lineTo(0, h / 2);
      ctx.lineTo(0, h / 4);
      ctx.lineTo(-w / 2, h / 4);
      ctx.closePath();
      ctx.fill();
      if (element.strokeWidth) ctx.stroke();
    } else if (element.shapeType === 'heart') {
      ctx.beginPath();
      ctx.scale(1.2, 1.2);
      ctx.moveTo(0, -30);
      ctx.bezierCurveTo(-40, -80, -100, -40, -100, 20);
      ctx.bezierCurveTo(-100, 70, -40, 110, 0, 150);
      ctx.bezierCurveTo(40, 110, 100, 70, 100, 20);
      ctx.bezierCurveTo(100, -40, 40, -80, 0, -30);
      ctx.closePath();
      ctx.fill();
      if (element.strokeWidth) ctx.stroke();
    } else if (element.shapeType === 'divider') {
      ctx.fillStyle = element.fillColor || '#C9A84C';
      ctx.fillRect(-drawW * 0.4, -3, drawW * 0.8, 6);
    } else if (element.shapeType === 'progress') {
      const pw = drawW * 0.85;
      const ph = 14;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      drawRoundedRect(ctx, -pw / 2, 0, pw, ph, 7);
      ctx.fill();
      ctx.fillStyle = element.fillColor || '#10B981';
      drawRoundedRect(ctx, -pw / 2, 0, pw * 0.65, ph, 7);
      ctx.fill();
    } else {
      // Rounded rect default
      const w = 340;
      const h = 160;
      ctx.beginPath();
      drawRoundedRect(ctx, -w / 2, -h / 2, w, h, element.cornerRadius || 16);
      ctx.fill();
      if (element.strokeWidth) ctx.stroke();
    }
  } else if (element.category === 'badge' && element.badgeText) {
    const w = 380;
    const h = 84;
    ctx.fillStyle = element.fillColor || '#DC2626';
    ctx.strokeStyle = element.strokeColor || '#FFFFFF';
    ctx.lineWidth = element.strokeWidth || 3;
    ctx.beginPath();
    drawRoundedRect(ctx, -w / 2, -h / 2, w, h, element.cornerRadius || 24);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 30px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(element.badgeText, 0, 0);
  } else if (element.category === 'lower_third') {
    const w = 520;
    const h = 130;
    ctx.fillStyle = element.fillColor || 'rgba(15,15,20,0.92)';
    ctx.strokeStyle = element.strokeColor || '#C9A84C';
    ctx.lineWidth = 2;
    ctx.beginPath();
    drawRoundedRect(ctx, -w / 2, -h / 2, w, h, element.cornerRadius || 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(element.title || 'TITLE', 0, -12);

    ctx.fillStyle = '#C9A84C';
    ctx.font = '19px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(element.subtitle || 'Subtitle description', 0, 26);
  } else if (element.category === 'background') {
    if (element.fillColor?.startsWith('radial:')) {
      const grad = ctx.createRadialGradient(0, 0, 50, 0, 0, drawW * 0.75);
      grad.addColorStop(0, '#242430');
      grad.addColorStop(1, '#09090c');
      ctx.fillStyle = grad;
    } else if (element.fillColor?.startsWith('linear:')) {
      const grad = ctx.createLinearGradient(0, -drawH / 2, 0, drawH / 2);
      grad.addColorStop(0, '#38230b');
      grad.addColorStop(1, '#0a0a0c');
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = element.fillColor || '#0a0a0a';
    }
    ctx.fillRect(-drawW / 2, -drawH / 2, drawW, drawH);
  }

  ctx.restore();
}

/**
 * Renders kinetic text overlays with 20+ animation styles
 */
function renderTextOverlay(
  ctx: CanvasRenderingContext2D,
  textItem: TextOverlayElement,
  timeInClip: number
): void {
  ctx.save();

  // Animation timing factor (0 to 1 over first 0.6s)
  const animT = Math.max(0, Math.min(1, timeInClip / 0.6));

  switch (textItem.animation) {
    case 'slideUp':
      ctx.translate(0, (1 - animT) * 70);
      ctx.globalAlpha = animT;
      break;
    case 'slideDown':
      ctx.translate(0, -(1 - animT) * 70);
      ctx.globalAlpha = animT;
      break;
    case 'slideLeft':
      ctx.translate((1 - animT) * 90, 0);
      ctx.globalAlpha = animT;
      break;
    case 'slideRight':
      ctx.translate(-(1 - animT) * 90, 0);
      ctx.globalAlpha = animT;
      break;
    case 'bounce': {
      const b = animT < 0.6 ? (animT / 0.6) * 1.2 : 1.2 - ((animT - 0.6) / 0.4) * 0.2;
      ctx.scale(b, b);
      ctx.globalAlpha = animT;
      break;
    }
    case 'elastic': {
      const e = animT + Math.sin(animT * Math.PI) * 0.25;
      ctx.scale(e, e);
      ctx.globalAlpha = animT;
      break;
    }
    case 'stompZoom': {
      const s = 1.8 - 0.8 * animT;
      ctx.scale(s, s);
      ctx.globalAlpha = animT;
      break;
    }
    case 'blurToFocus':
      if (animT < 0.9) ctx.filter = `blur(${(1 - animT) * 16}px)`;
      ctx.globalAlpha = animT;
      break;
    case 'neonFlicker':
      if (timeInClip < 1.0) {
        ctx.globalAlpha = Math.random() > 0.15 ? 1.0 : 0.3;
      }
      break;
    case 'flip3D': {
      const cosA = Math.abs(Math.cos((1 - animT) * Math.PI * 0.5));
      ctx.scale(1, Math.max(0.01, cosA));
      ctx.globalAlpha = animT;
      break;
    }
    case 'skewRush':
      ctx.transform(1, 0, (1 - animT) * -0.5, 1, (1 - animT) * -120, 0);
      ctx.globalAlpha = animT;
      break;
    case 'wave':
      ctx.translate(0, Math.sin(timeInClip * 3) * 12);
      break;
    case 'heartbeat': {
      const hb = 1.0 + Math.sin(timeInClip * 5) * 0.08;
      ctx.scale(hb, hb);
      break;
    }
    case 'tremor':
      ctx.translate((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4);
      break;
    case 'fadeIn':
    default:
      ctx.globalAlpha = animT;
      break;
  }

  // Typewriter text slicing
  let textToDraw = textItem.text;
  if (textItem.animation === 'typewriter') {
    const charsToShow = Math.floor(textItem.text.length * Math.min(1, timeInClip / 1.5));
    textToDraw = textItem.text.slice(0, charsToShow);
  }

  ctx.font = `bold ${textItem.fontSize || 44}px ${textItem.fontFamily || '-apple-system, sans-serif'}`;
  ctx.textAlign = textItem.alignment || 'center';
  ctx.textBaseline = 'middle';

  const metrics = ctx.measureText(textToDraw);
  const textWidth = metrics.width;
  const textHeight = textItem.fontSize || 44;

  // Background card / pill
  if (textItem.backgroundColor) {
    const pad = textItem.backgroundPadding || 18;
    const rad = textItem.backgroundRadius || 14;
    ctx.fillStyle = textItem.backgroundColor;
    ctx.beginPath();
    drawRoundedRect(ctx, -textWidth / 2 - pad, -textHeight / 2 - pad, textWidth + pad * 2, textHeight + pad * 2, rad);
    ctx.fill();
  }

  // Shadow
  if (textItem.shadowBlur) {
    ctx.shadowBlur = textItem.shadowBlur;
    ctx.shadowColor = textItem.shadowColor || 'rgba(0,0,0,0.8)';
  }

  // Stroke / Outline
  if (textItem.strokeWidth && textItem.strokeWidth > 0) {
    ctx.strokeStyle = textItem.strokeColor || '#000000';
    ctx.lineWidth = textItem.strokeWidth;
    ctx.lineJoin = 'round';
    ctx.strokeText(textToDraw, 0, 0);
  }

  // Fill
  ctx.fillStyle = textItem.color || '#FFFFFF';
  ctx.fillText(textToDraw, 0, 0);

  ctx.restore();
}

/**
 * Renders the current frame at `playheadTime` onto a 9:16 canvas
 */
export function renderCanvasFrame(
  ctx: CanvasRenderingContext2D,
  project: ProjectDocument,
  playheadTime: number,
  canvasWidth = 1080,
  canvasHeight = 1920,
  isPlaying = false
): void {
  try {
    // Clear canvas with deep matte black
    ctx.save();
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Find all active visual tracks sorted from bottom to top (V1..V5, then L1..L10)
    const visualTracks = project.timeline.tracks
      .filter(
        (t) =>
          t.type === 'video' || t.type === 'overlay' || t.trackId.startsWith('V') || t.trackId.startsWith('L')
      )
      .sort((a, b) => {
        const aIsOverlay = a.type === 'overlay' || a.trackId.startsWith('L');
        const bIsOverlay = b.type === 'overlay' || b.trackId.startsWith('L');
        if (!aIsOverlay && bIsOverlay) return -1;
        if (aIsOverlay && !bIsOverlay) return 1;
        return a.trackId.localeCompare(b.trackId, undefined, { numeric: true });
      });

    let activeCaptionsToRender: { text: string; style: string; wordTimings?: any[] }[] = [];

    for (const track of visualTracks) {
      const activeClips = track.clips.filter(
        (c) => playheadTime >= c.startTime && playheadTime < c.startTime + c.duration
      );

      if (activeClips.length === 0) continue;

      // Prefer selected clip if active at playhead, otherwise pick last clip in track
      const selectedClipId = projectStore.getState().selectedClipId;
      const activeClip =
        activeClips.find((c) => c.clipId === selectedClipId) ||
        activeClips[activeClips.length - 1];

      const timeInClip = playheadTime - activeClip.startTime;
      const asset = project.assets[activeClip.assetId];

      ctx.save();

      // Calculate keyframe interpolated transform
      const transform = interpolateKeyframes(activeClip, timeInClip, activeClip.transform);

      // Center point for transform
      const cx = canvasWidth / 2 + transform.positionX;
      const cy = canvasHeight / 2 + transform.positionY;

      ctx.translate(cx, cy);
      if (transform.rotation !== 0) {
        ctx.rotate((transform.rotation * Math.PI) / 180);
      }
      ctx.scale(transform.scale, transform.scale);

      const drawW = canvasWidth;
      const drawH = canvasHeight;

      // Handle transitions (any of the 55 transitions)
      let transitionOpacity = 1.0;
      let postTransitionOverlay: ((ctx: CanvasRenderingContext2D) => void) | undefined;

      if (activeClip.transitionIn && timeInClip < activeClip.transitionIn.duration) {
        const progress = timeInClip / activeClip.transitionIn.duration;
        const res = applyTransitionTransformAndClip(ctx, activeClip.transitionIn.type, progress, drawW, drawH);
        transitionOpacity = res.alphaMultiplier;
        postTransitionOverlay = res.postOverlay;
      }
      if (activeClip.transitionOut && timeInClip > activeClip.duration - activeClip.transitionOut.duration) {
        const progress = (activeClip.duration - timeInClip) / activeClip.transitionOut.duration;
        transitionOpacity = Math.min(transitionOpacity, Math.max(0, Math.min(1, progress)));
      }

      // Normalize opacity (handle both 0-1 and 0-100 formats)
      const normalizedOpacity = transform.opacity <= 1 ? transform.opacity : transform.opacity / 100;
      ctx.globalAlpha = Math.max(0, Math.min(1, normalizedOpacity * transitionOpacity));

      // Apply Color Adjustments via canvas filter ONLY if there are meaningful adjustments
      // This prevents a common GPU bug in some Chromium versions where any ctx.filter causes massive darkening
      if (activeClip.adjust) {
        const bVal = activeClip.adjust.brightness || 0;
        const cVal = activeClip.adjust.contrast || 0;
        const sVal = activeClip.adjust.saturation || 0;
        const hueVal = activeClip.adjust.temperature || 0;
        const expVal = activeClip.adjust.exposure || 0;

        // If all values are roughly 0 or their legacy default values (10, 5, etc), skip the filter entirely
        const hasSignificantAdjustment = Math.abs(bVal) > 10 || Math.abs(cVal) > 5 || Math.abs(sVal) > 5 || Math.abs(hueVal) > 5 || Math.abs(expVal) > 15;

        if (hasSignificantAdjustment) {
          const b = Math.max(10, 100 + bVal + (expVal * 1.5));
          const c = Math.max(10, 100 + cVal);
          const s = Math.max(0, 100 + sVal);
          const hue = hueVal * 0.4;

          const filterParts = [
            `brightness(${b}%)`,
            `contrast(${c}%)`,
            `saturate(${s}%)`,
          ];
          if (hue !== 0) {
            filterParts.push(`hue-rotate(${hue.toFixed(1)}deg)`);
          }
          ctx.filter = filterParts.join(' ');
        } else {
          ctx.filter = 'none';
        }
      } else {
        ctx.filter = 'none';
      }

      // Check if this clip has a custom Graphic or Text Overlay
      if (activeClip.graphic) {
        renderGraphicElement(ctx, activeClip.graphic, drawW, drawH);
      } else if (activeClip.textOverlay) {
        renderTextOverlay(ctx, activeClip.textOverlay, timeInClip);
      } else if (asset && asset.url) {
        const isVideoAsset = asset.type === 'video' || !!asset.filename?.match(/\.(mp4|mov|webm|mkv|avi|flv|m4v)$/i);

        if (isVideoAsset) {
          const vid = getOrCreateVideoElement(asset.url);
          const vStatus = getVideoStatus(asset.url);

          if (vid.error || vStatus.status === 'error') {
            const errorMsg = vStatus.error || parseVideoError(vid.error);
            renderMediaErrorCard(ctx, asset.filename || 'Video Source', errorMsg, drawW, drawH);
          } else {
            if (vid.readyState === 0 && !vid.error) {
              try { vid.load(); } catch {}
            }

            if (isPlaying) {
              const targetTime = timeInClip + activeClip.sourceIn;
              
              // Apply volume from clip settings (Decibels to Linear)
              const rawVol = activeClip.audio?.volume ?? 0;
              const isMuted = (activeClip.audio as any)?.muted ?? (track as any).muted ?? false;
              if (isMuted || rawVol <= -60) {
                vid.volume = 0;
              } else {
                const linearVol = Math.pow(10, rawVol / 20);
                vid.volume = Math.max(0, Math.min(1, linearVol));
              }

              if (vid.paused) {
                try {
                  vid.currentTime = targetTime;
                  vid.play().catch((err) => {
                    if (err.name !== 'AbortError') {
                      mediaStatusCache.set(asset.url, { status: 'error', error: err.message || 'Playback failed', element: vid });
                    }
                  });
                } catch {}
              } else if (!vid.seeking && Math.abs(vid.currentTime - targetTime) > 0.3) {
                try { vid.currentTime = targetTime; } catch {}
              }
            } else {
              if (!vid.paused) {
                try { vid.pause(); } catch {}
              }
              const targetTime = timeInClip + activeClip.sourceIn;
              if (!vid.seeking && Math.abs(vid.currentTime - targetTime) > 0.08) {
                try { vid.currentTime = targetTime; } catch {}
              }
            }

            const vidW = vid.videoWidth || asset.width || canvasWidth;
            const vidH = vid.videoHeight || asset.height || canvasHeight;
            const mediaAspect = vidW / vidH;
            const canvasAspect = canvasWidth / canvasHeight;

            let imgDrawW = canvasWidth;
            let imgDrawH = canvasHeight;

            if (mediaAspect > canvasAspect) {
              imgDrawW = canvasWidth;
              imgDrawH = canvasWidth / mediaAspect;
            } else {
              imgDrawH = canvasHeight;
              imgDrawW = canvasHeight * mediaAspect;
            }

            try {
              if (vid.readyState >= 2) {
                // === Blurred fill background ===
                if (Math.abs(mediaAspect - canvasAspect) > 0.05) {
                  const currentTransform = ctx.getTransform();
                  ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform to canvas coords
                  
                  ctx.save();
                  ctx.filter = 'blur(30px)';
                  const bgScale = Math.max(canvasWidth / vidW, canvasHeight / vidH);
                  const bgW = vidW * bgScale;
                  const bgH = vidH * bgScale;
                  ctx.globalAlpha = Math.max(0, Math.min(1, transitionOpacity));
                  ctx.drawImage(vid, (canvasWidth - bgW) / 2, (canvasHeight - bgH) / 2, bgW, bgH);
                  ctx.restore();

                  ctx.setTransform(currentTransform); // Restore transforms (keeping clip paths intact)
                }

                // Draw main video centered in translated space
                ctx.drawImage(vid, -imgDrawW / 2, -imgDrawH / 2, imgDrawW, imgDrawH);
              } else {
                // Buffering placeholder — clear grey rect with text
                ctx.fillStyle = '#1e293b';
                ctx.fillRect(-drawW / 2, -drawH / 2, drawW, drawH);
                ctx.fillStyle = '#94a3b8';
                ctx.font = 'bold 32px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('⏳ Loading video...', 0, 0);
              }
            } catch (drawErr) {
              renderMediaErrorCard(ctx, asset.filename || 'Video Source', 'Video frame draw failed', drawW, drawH);
            }
          }
        } else {
          let img = imageCache.get(asset.url);
          if (!img) {
            preloadImage(asset.url);
            img = imageCache.get(asset.url);
          }
          const imgStatus = getImageStatus(asset.url);

          if (imgStatus.status === 'error') {
            renderMediaErrorCard(ctx, asset.filename || 'Image Source', imgStatus.error || 'Failed to display image source', drawW, drawH);
          } else if (img) {
            const imgW = img.naturalWidth || asset.width || canvasWidth;
            const imgH = img.naturalHeight || asset.height || canvasHeight;
            const mediaAspect = imgW / imgH;
            const canvasAspect = canvasWidth / canvasHeight;

            let imgDrawW = canvasWidth;
            let imgDrawH = canvasHeight;

            if (mediaAspect > canvasAspect) {
              imgDrawW = canvasWidth;
              imgDrawH = canvasWidth / mediaAspect;
            } else {
              imgDrawH = canvasHeight;
              imgDrawW = canvasHeight * mediaAspect;
            }

            try {
              // Draw blurred fill background FIRST (using absolute canvas coords, before transformed space)
              if (img.complete && img.naturalWidth > 0 && Math.abs(mediaAspect - canvasAspect) > 0.05) {
                ctx.restore(); // Step back to raw canvas coordinate space
                ctx.save();    // Save at raw canvas level for blur pass
                ctx.filter = 'blur(30px)';
                const bgScale = Math.max(canvasWidth / imgW, canvasHeight / imgH);
                const bgW = imgW * bgScale;
                const bgH = imgH * bgScale;
                ctx.drawImage(img, (canvasWidth - bgW) / 2, (canvasHeight - bgH) / 2, bgW, bgH);
                ctx.restore(); // Done with blur pass

                // Re-apply the original transform
                ctx.save();
                ctx.translate(cx, cy);
                if (transform.rotation !== 0) ctx.rotate((transform.rotation * Math.PI) / 180);
                ctx.scale(transform.scale, transform.scale);
                const normalizedOpacity = transform.opacity <= 1 ? transform.opacity : transform.opacity / 100;
                ctx.globalAlpha = Math.max(0, Math.min(1, normalizedOpacity * transitionOpacity));
                ctx.filter = 'none';
              }

              if (img.complete && img.naturalWidth > 0) {
                ctx.drawImage(img, -imgDrawW / 2, -imgDrawH / 2, imgDrawW, imgDrawH);
              } else {
                // Loading placeholder
                ctx.fillStyle = '#1e293b';
                ctx.fillRect(-drawW / 2, -drawH / 2, drawW, drawH);
                ctx.fillStyle = '#64748b';
                ctx.font = 'bold 32px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('⏳ Loading image...', 0, 0);
              }
            } catch {
              renderMediaErrorCard(ctx, asset.filename || 'Image Source', 'Image draw failed', drawW, drawH);
            }
          }
        }
      } else {
        // Fallback for missing/unlinked asset so playhead never shows pure darkness
        renderMediaErrorCard(ctx, 'Missing Asset Source', 'Media clip has no linked project asset or valid URL', drawW, drawH);
      }

      // Apply active visual effects
      applyVisualEffectsToClip(ctx, activeClip.effects, drawW, drawH);

      // Draw vignette if configured
      if (activeClip.adjust && activeClip.adjust.vignette > 0) {
        const grad = ctx.createRadialGradient(0, 0, canvasWidth * 0.35, 0, 0, canvasWidth * 0.85);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, `rgba(0,0,0,${activeClip.adjust.vignette / 100})`);
        ctx.fillStyle = grad;
        ctx.fillRect(-drawW / 2, -drawH / 2, drawW, drawH);
      }

      // Execute post transition light/flash overlays if active
      if (postTransitionOverlay) {
        postTransitionOverlay(ctx);
      }

      ctx.restore();

      // Collect active captions
      if (activeClip.captions) {
        for (const cap of activeClip.captions) {
          if (playheadTime >= cap.startTime && playheadTime <= cap.endTime) {
            activeCaptionsToRender.push({
              text: cap.text,
              style: cap.style || 'viral-bold',
              wordTimings: cap.wordTimings,
            });
          }
        }
      }
    }

    // Render Captions Layer on top
    if (activeCaptionsToRender.length > 0) {
      for (const cap of activeCaptionsToRender) {
        renderCaptionText(ctx, cap, playheadTime, canvasWidth, canvasHeight);
      }
    }

    ctx.restore();
  } catch (renderError) {
    console.warn('Canvas render error suppressed:', renderError);
    try {
      ctx.restore();
    } catch {
      // Ignored
    }
  }
}

/**
 * Renders stylish captions with word-level highlight
 */
function renderCaptionText(
  ctx: CanvasRenderingContext2D,
  caption: { text: string; style: string; wordTimings?: any[] },
  playheadTime: number,
  canvasWidth: number,
  canvasHeight: number
): void {
  ctx.save();
  const centerY = canvasHeight * 0.76;

  if (caption.style === 'viral-bold') {
    ctx.font = '900 48px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const words =
      caption.wordTimings && caption.wordTimings.length > 0
        ? caption.wordTimings
        : caption.text.split(' ').map((w) => ({ word: w, start: 0, end: 999 }));

    const wordWidths = words.map((w) => ctx.measureText(w.word).width);
    const spaceWidth = ctx.measureText(' ').width;
    const totalLineWidth = wordWidths.reduce((a, b) => a + b, 0) + spaceWidth * (words.length - 1);

    if (totalLineWidth > canvasWidth - 120) {
      ctx.font = '900 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    }

    // Render background pill
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    const boxW = Math.min(totalLineWidth + 80, canvasWidth - 80);
    ctx.beginPath();
    drawRoundedRect(ctx, canvasWidth / 2 - boxW / 2, centerY - 45, boxW, 90, 20);
    ctx.fill();

    // Render words with active highlight
    let curX = canvasWidth / 2 - totalLineWidth / 2;
    for (let i = 0; i < words.length; i++) {
      const item = words[i];
      const wWidth = ctx.measureText(item.word).width;
      const isWordActive = playheadTime >= item.start && playheadTime <= item.end;

      ctx.save();
      ctx.translate(curX + wWidth / 2, centerY);

      if (isWordActive) {
        ctx.scale(1.15, 1.15);
        ctx.fillStyle = '#FACC15';
      } else {
        ctx.fillStyle = '#FFFFFF';
      }

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 8;
      ctx.lineJoin = 'round';
      ctx.strokeText(item.word, 0, 0);
      ctx.fillText(item.word, 0, 0);
      ctx.restore();

      curX += wWidth + spaceWidth;
    }
  } else if (caption.style === 'karaoke-glow') {
    ctx.font = '800 42px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.shadowColor = '#06B6D4';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(caption.text, canvasWidth / 2, centerY);
  } else {
    ctx.font = '600 34px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textWidth = ctx.measureText(caption.text).width;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.beginPath();
    drawRoundedRect(ctx, canvasWidth / 2 - textWidth / 2 - 30, centerY - 32, textWidth + 60, 64, 12);
    ctx.fill();

    ctx.fillStyle = '#F8FAFC';
    ctx.fillText(caption.text, canvasWidth / 2, centerY);
  }

  ctx.restore();
}
