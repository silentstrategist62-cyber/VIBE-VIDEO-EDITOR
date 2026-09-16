import React, { useEffect, useRef, useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { projectStore } from '../../store/projectStore';
import { renderCanvasFrame } from '../../services/previewRenderer';

interface SamplePreviewCardProps {
  id: string;
  name: string;
  category?: string;
  badge?: string;
  description?: string;
  type: 'effect' | 'transition' | 'text' | 'graphic' | 'caption';
  isApplied?: boolean;
  onApply: () => void;
  sampleText?: string;
}

// Global High-Resolution Photographic Nature Images (Forest and Sea)
const FOREST_PHOTO = new Image();
FOREST_PHOTO.crossOrigin = 'anonymous';
FOREST_PHOTO.src = 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=400&q=80';

const SEA_PHOTO = new Image();
SEA_PHOTO.crossOrigin = 'anonymous';
SEA_PHOTO.src = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80';

export const SamplePreviewCard: React.FC<SamplePreviewCardProps> = ({
  id,
  name,
  badge,
  type,
  isApplied,
  onApply,
  sampleText,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Canvas animation loop for 3-sec sample video preview
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const startTime = performance.now();

    const renderFrame = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      const loopTime = elapsed % 3; // 3-second looping sample video
      const progress = loopTime / 3;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (type === 'effect') {
        renderEffectSample(ctx, id, canvas.width, canvas.height, progress, loopTime);
      } else if (type === 'transition') {
        renderTransitionSample(ctx, id, canvas.width, canvas.height, progress, loopTime);
      } else if (type === 'text') {
        renderTextSample(ctx, id, name, sampleText || 'CAPCUT STYLE', canvas.width, canvas.height, progress, loopTime);
      } else if (type === 'caption') {
        renderCaptionSample(ctx, id, name, sampleText || 'BOLD VIRAL HOOK', canvas.width, canvas.height, progress, loopTime);
      } else if (type === 'graphic') {
        renderGraphicSample(ctx, id, name, canvas.width, canvas.height, progress, loopTime);
      }

      // Draw subtle "3s LIVE" watermark overlay on hover/active
      if (isHovered || isPlaying) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(4, 4, 42, 16);
        ctx.fillStyle = '#C9A84C';
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText('3s LIVE', 8, 16);
      }

      animId = requestAnimationFrame(renderFrame);
    };

    animId = requestAnimationFrame(renderFrame);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [id, type, name, sampleText, isHovered, isPlaying]);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => {
        setIsPlaying(!isPlaying);
        onApply();
      }}
      className={`group relative flex flex-col rounded-xl overflow-hidden bg-[#16161a] border transition-all cursor-pointer select-none ${
        isApplied
          ? 'border-[#C9A84C] shadow-lg shadow-[#C9A84C]/10 ring-1 ring-[#C9A84C]'
          : isHovered
          ? 'border-white/40 shadow-md translate-y-[-2px]'
          : 'border-white/10 hover:border-white/20'
      }`}
    >
      {/* Visual Canvas Sample Box (CapCut 3-second Sample Video) */}
      <div className="relative aspect-[4/3] w-full bg-black overflow-hidden flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={180}
          height={135}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Badges */}
        {badge && (
          <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 text-[8px] font-extrabold bg-[#C9A84C] text-black rounded uppercase tracking-wider shadow">
            {badge}
          </span>
        )}

        {isApplied && (
          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 text-[8px] font-extrabold bg-[#C9A84C] text-black rounded flex items-center gap-0.5 shadow">
            <Check className="w-2.5 h-2.5" /> ACTIVE
          </span>
        )}
      </div>

      {/* Title Bar */}
      <div className="p-2 flex items-center justify-between bg-[#121214] border-t border-white/5">
        <span className="text-[11px] font-bold text-[#e0e0e0] truncate group-hover:text-[#C9A84C] transition-colors">
          {name}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onApply();
          }}
          className={`p-1 rounded-md transition-colors ${
            isApplied
              ? 'bg-[#C9A84C] text-black'
              : 'bg-[#222226] text-[#a0a0a0] hover:text-white hover:bg-[#333338]'
          }`}
          title={isApplied ? 'Applied' : 'Apply to clip'}
        >
          {isApplied ? <Check className="w-3 h-3 font-bold" /> : <Sparkles className="w-3 h-3" />}
        </button>
      </div>
    </div>
  );
};

// --- REAL-TIME CANVAS NATURE SAMPLE RENDERERS ---

// Helper: render user's actual timeline frame as base background
function drawUserFrameScene(ctx: CanvasRenderingContext2D, w: number, h: number) {
  try {
    const state = projectStore.getState();
    const project = state.project;
    const time = state.playheadTime;
    
    // Draw real frame
    renderCanvasFrame(ctx, project, time, w, h);
    
    // Fallback if blank (e.g., no clips at playhead)
    const imgData = ctx.getImageData(0, 0, w, h);
    let isEmpty = true;
    for (let i = 3; i < imgData.data.length; i += 4) {
      if (imgData.data[i] > 0) {
        isEmpty = false;
        break;
      }
    }
    if (isEmpty) {
      drawForestScene(ctx, w, h, time);
    }
  } catch (err) {
    drawForestScene(ctx, w, h, 0);
  }
}

// Forest Photographic Nature Scene (Scene A)
function drawForestScene(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
  if (FOREST_PHOTO.complete && FOREST_PHOTO.naturalWidth !== 0) {
    ctx.drawImage(FOREST_PHOTO, 0, 0, w, h);
  } else {
    // Deep Forest Fallback
    const forestGrad = ctx.createLinearGradient(0, 0, 0, h);
    forestGrad.addColorStop(0, '#1a331e');
    forestGrad.addColorStop(0.5, '#0d2212');
    forestGrad.addColorStop(1, '#051108');
    ctx.fillStyle = forestGrad;
    ctx.fillRect(0, 0, w, h);

    // Pine tree silhouettes
    ctx.fillStyle = '#020a04';
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 8) {
      const ph = Math.sin(x * 0.1) * 12 + 25;
      ctx.lineTo(x - 2, h * 0.7);
      ctx.lineTo(x, h * 0.7 - ph);
      ctx.lineTo(x + 2, h * 0.7);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();
  }

  // Subtle sunbeam rays over forest trees
  ctx.fillStyle = 'rgba(255, 230, 150, 0.08)';
  ctx.beginPath();
  ctx.moveTo(w * 0.2, 0);
  ctx.lineTo(w * 0.6, h);
  ctx.lineTo(w * 0.4, h);
  ctx.lineTo(w * 0.1, 0);
  ctx.closePath();
  ctx.fill();
}

// Sea / Ocean Photographic Nature Scene (Scene B)
function drawSeaScene(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
  if (SEA_PHOTO.complete && SEA_PHOTO.naturalWidth !== 0) {
    ctx.drawImage(SEA_PHOTO, 0, 0, w, h);
  } else {
    // Tropical Sea Fallback
    const seaGrad = ctx.createLinearGradient(0, 0, 0, h);
    seaGrad.addColorStop(0, '#0284c7');
    seaGrad.addColorStop(0.5, '#06b6d4');
    seaGrad.addColorStop(1, '#14b8a6');
    ctx.fillStyle = seaGrad;
    ctx.fillRect(0, 0, w, h);
  }

  // Shimmering water wave highlights
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  const wy = h * 0.6 + Math.sin(time * 3) * 2;
  ctx.fillRect(0, wy, w, 2);
  ctx.fillRect(0, wy + 8, w, 1.5);
}

// Legacy alias compatibility
const drawNatureSceneA = drawForestScene;
const drawNatureSceneB = drawSeaScene;

// 1. Effects Render Loop (Photographic Forest Background)
function renderEffectSample(
  ctx: CanvasRenderingContext2D,
  id: string,
  w: number,
  h: number,
  progress: number,
  time: number
) {
  const cx = w / 2;
  const cy = h / 2;

  // Base Forest Photo Scene
  drawUserFrameScene(ctx, w, h);

  if (id === 'blur' || id === 'gaussian_blur') {
    // Soft blur bokeh over forest
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 5; i++) {
      const bx = (cx + Math.sin(time + i * 2) * 40 + w) % w;
      const by = (cy + Math.cos(time * 0.8 + i) * 25 + h) % h;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.beginPath();
      ctx.arc(bx, by, 18 + i * 4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === 'glitch' || id === 'vhs' || id === 'rgb_split' || id.includes('glitch')) {
    // RGB Chromatic Aberration tearing over forest
    const shift = Math.sin(time * 14) * 6;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(255, 0, 80, 0.4)';
    ctx.fillRect(shift, 0, w, h);
    ctx.fillStyle = 'rgba(0, 240, 255, 0.4)';
    ctx.fillRect(-shift, 0, w, h);
    ctx.restore();
  } else if (id === 'glow' || id === 'butterfly_spark' || id === 'luminous_bloom' || id === 'bokeh') {
    // Golden floating sparkles over forest trees
    for (let i = 0; i < 8; i++) {
      const px = (cx + Math.sin(time * 2 + i) * 50 + w) % w;
      const py = (cy - (progress * h * 1.1 + i * 18)) % h;
      ctx.fillStyle = '#FFE082';
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === 'halftone' || id === 'popart') {
    // Halftone cinema dot matrix over forest
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, w, h);
    for (let x = 6; x < w; x += 10) {
      for (let y = 6; y < h; y += 10) {
        const r = (Math.sin((x + y) * 0.06 + time * 3) + 1.2) * 2;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (id === 'ray_burst' || id === 'light_leak') {
    // Volumetric sun rays piercing forest
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const angle = time * 0.6;
    for (let i = 0; i < 6; i++) {
      const a = angle + (i * Math.PI) / 3;
      ctx.fillStyle = 'rgba(255, 200, 100, 0.25)';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a - 0.2) * w, cy + Math.sin(a - 0.2) * h);
      ctx.lineTo(cx + Math.cos(a + 0.2) * w, cy + Math.sin(a + 0.2) * h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  } else {
    // Luminous ambient pulse
    const pulse = Math.sin(time * 3) * 0.15 + 0.85;
    ctx.fillStyle = 'rgba(201, 168, 76, 0.25)';
    ctx.beginPath();
    ctx.arc(cx, cy, 40 * pulse, 0, Math.PI * 2);
    ctx.fill();
  }
}

function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

// Core Transition Execution (from Scene A to Scene B over progress p)
function renderTransitionCore(
  ctx: CanvasRenderingContext2D,
  id: string,
  w: number,
  h: number,
  p: number,
  time: number,
  drawA: (ctx: CanvasRenderingContext2D, w: number, h: number, time: number) => void,
  drawB: (ctx: CanvasRenderingContext2D, w: number, h: number, time: number) => void
) {
  const cx = w / 2;
  const cy = h / 2;
  const maxR = Math.sqrt(w * w + h * h) * 0.7;

  // --- 1. FADES & DISSOLVES ---
  if (id === 'crossfade') {
    drawA(ctx, w, h, time);
    ctx.save();
    ctx.globalAlpha = p;
    drawB(ctx, w, h, time);
    ctx.restore();
  } else if (id === 'dipToBlack') {
    drawA(ctx, w, h, time);
    const fade = Math.sin(p * Math.PI);
    ctx.fillStyle = `rgba(0, 0, 0, ${fade})`;
    ctx.fillRect(0, 0, w, h);
    if (p > 0.5) {
      ctx.save();
      ctx.globalAlpha = (p - 0.5) * 2;
      drawB(ctx, w, h, time);
      ctx.restore();
    }
  } else if (id === 'dipToWhite') {
    drawA(ctx, w, h, time);
    const flash = Math.sin(p * Math.PI);
    ctx.fillStyle = `rgba(255, 255, 255, ${flash})`;
    ctx.fillRect(0, 0, w, h);
    if (p > 0.5) {
      ctx.save();
      ctx.globalAlpha = (p - 0.5) * 2;
      drawB(ctx, w, h, time);
      ctx.restore();
    }
  } else if (id === 'lumaFade') {
    drawA(ctx, w, h, time);
    ctx.save();
    ctx.globalAlpha = p;
    drawB(ctx, w, h, time);
    ctx.restore();
    ctx.fillStyle = `rgba(255, 240, 200, ${Math.sin(p * Math.PI) * 0.35})`;
    ctx.fillRect(0, 0, w, h);
  } else if (id === 'dreamyBlur') {
    drawA(ctx, w, h, time);
    ctx.save();
    ctx.globalAlpha = p;
    drawB(ctx, w, h, time);
    ctx.restore();
    const bloom = Math.sin(p * Math.PI) * 0.5;
    ctx.fillStyle = `rgba(255, 255, 255, ${bloom})`;
    ctx.fillRect(0, 0, w, h);
  } else if (id === 'vaporize') {
    drawA(ctx, w, h, time);
    ctx.save();
    ctx.globalAlpha = p;
    drawB(ctx, w, h, time);
    ctx.restore();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    for (let i = 0; i < 20; i++) {
      const px = (cx + Math.sin(i * 1.5 + p * 10) * w * 0.4);
      const py = (cy + Math.cos(i * 2.1 + p * 8) * h * 0.4) - p * 20;
      ctx.beginPath();
      ctx.arc(px, py, (1 - p) * 4 + 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- 2. WIPES & BLINDS ---
  else if (id === 'wipeLeft') {
    const x = w * (1 - p);
    drawA(ctx, w, h, time);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, 0, w - x, h);
    ctx.clip();
    drawB(ctx, w, h, time);
    ctx.restore();
    ctx.fillStyle = '#C9A84C';
    ctx.fillRect(x - 1, 0, 2, h);
  } else if (id === 'wipeRight') {
    const x = w * p;
    drawA(ctx, w, h, time);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, x, h);
    ctx.clip();
    drawB(ctx, w, h, time);
    ctx.restore();
    ctx.fillStyle = '#C9A84C';
    ctx.fillRect(x - 1, 0, 2, h);
  } else if (id === 'wipeUp') {
    const y = h * (1 - p);
    drawA(ctx, w, h, time);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, y, w, h - y);
    ctx.clip();
    drawB(ctx, w, h, time);
    ctx.restore();
    ctx.fillStyle = '#C9A84C';
    ctx.fillRect(0, y - 1, w, 2);
  } else if (id === 'wipeDown') {
    const y = h * p;
    drawA(ctx, w, h, time);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, y);
    ctx.clip();
    drawB(ctx, w, h, time);
    ctx.restore();
    ctx.fillStyle = '#C9A84C';
    ctx.fillRect(0, y - 1, w, 2);
  } else if (id === 'wipeDiagonal') {
    const d = p * (w + h);
    drawA(ctx, w, h, time);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.min(d, w), Math.max(0, d - w));
    ctx.lineTo(Math.max(0, d - h), Math.min(d, h));
    ctx.closePath();
    ctx.clip();
    drawB(ctx, w, h, time);
    ctx.restore();
  } else if (id === 'wipeDiagonalInv') {
    const d = p * (w + h);
    drawA(ctx, w, h, time);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(w, 0);
    ctx.lineTo(Math.max(0, w - d), Math.max(0, d - w));
    ctx.lineTo(Math.min(w, 2 * w - d), Math.min(h, d));
    ctx.closePath();
    ctx.clip();
    drawB(ctx, w, h, time);
    ctx.restore();
  } else if (id === 'clockWipe') {
    const angle = p * Math.PI * 2;
    drawA(ctx, w, h, time);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, maxR, -Math.PI / 2, -Math.PI / 2 + angle, false);
    ctx.closePath();
    ctx.clip();
    drawB(ctx, w, h, time);
    ctx.restore();
    ctx.strokeStyle = '#C9A84C';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(-Math.PI / 2 + angle) * maxR, cy + Math.sin(-Math.PI / 2 + angle) * maxR);
    ctx.stroke();
  } else if (id === 'blindsHorizontal') {
    drawA(ctx, w, h, time);
    const numSlats = 8;
    const slatH = h / numSlats;
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < numSlats; i++) {
      ctx.rect(0, i * slatH, w * p, slatH);
    }
    ctx.clip();
    drawB(ctx, w, h, time);
    ctx.restore();
  } else if (id === 'blindsVertical') {
    drawA(ctx, w, h, time);
    const numCols = 10;
    const colW = w / numCols;
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < numCols; i++) {
      ctx.rect(i * colW, 0, colW * p, h);
    }
    ctx.clip();
    drawB(ctx, w, h, time);
    ctx.restore();
  }

  // --- 3. SLIDES & PUSHES ---
  else if (id === 'slideLeft') {
    ctx.save();
    ctx.translate(-p * w, 0);
    drawA(ctx, w, h, time);
    ctx.translate(w, 0);
    drawB(ctx, w, h, time);
    ctx.restore();
  } else if (id === 'slideRight') {
    ctx.save();
    ctx.translate(p * w, 0);
    drawA(ctx, w, h, time);
    ctx.translate(-w, 0);
    drawB(ctx, w, h, time);
    ctx.restore();
  } else if (id === 'slideUp') {
    ctx.save();
    ctx.translate(0, -p * h);
    drawA(ctx, w, h, time);
    ctx.translate(0, h);
    drawB(ctx, w, h, time);
    ctx.restore();
  } else if (id === 'slideDown') {
    ctx.save();
    ctx.translate(0, p * h);
    drawA(ctx, w, h, time);
    ctx.translate(0, -h);
    drawB(ctx, w, h, time);
    ctx.restore();
  } else if (id === 'splitHorizontal') {
    drawB(ctx, w, h, time);
    const shift = p * cx;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0 - shift, 0, cx, h);
    ctx.clip();
    drawA(ctx, w, h, time);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(cx + shift, 0, cx, h);
    ctx.clip();
    drawA(ctx, w, h, time);
    ctx.restore();
  } else if (id === 'splitVertical') {
    drawB(ctx, w, h, time);
    const shift = p * cy;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0 - shift, w, cy);
    ctx.clip();
    drawA(ctx, w, h, time);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, cy + shift, w, cy);
    ctx.clip();
    drawA(ctx, w, h, time);
    ctx.restore();
  }

  // --- 4. ZOOMS & SCALES ---
  else if (id === 'zoomIn') {
    ctx.save();
    ctx.translate(cx, cy);
    const s = 1 + p * 1.2;
    ctx.scale(s, s);
    ctx.translate(-cx, -cy);
    drawA(ctx, w, h, time);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = p;
    drawB(ctx, w, h, time);
    ctx.restore();
  } else if (id === 'zoomOut') {
    drawB(ctx, w, h, time);
    ctx.save();
    ctx.translate(cx, cy);
    const s = Math.max(0.01, 1 - p * 0.8);
    ctx.scale(s, s);
    ctx.translate(-cx, -cy);
    ctx.globalAlpha = 1 - p;
    drawA(ctx, w, h, time);
    ctx.restore();
  } else if (id === 'zoomBlur') {
    drawA(ctx, w, h, time);
    ctx.save();
    ctx.globalAlpha = p;
    drawB(ctx, w, h, time);
    ctx.restore();
    ctx.strokeStyle = `rgba(255, 255, 255, ${Math.sin(p * Math.PI) * 0.4})`;
    ctx.lineWidth = 1.5;
    for (let a = 0; a < 12; a++) {
      const ang = (a * Math.PI) / 6;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * 10, cy + Math.sin(ang) * 10);
      ctx.lineTo(cx + Math.cos(ang) * maxR, cy + Math.sin(ang) * maxR);
      ctx.stroke();
    }
  } else if (id === 'crossZoom') {
    if (p < 0.5) {
      const s = 1 + p * 2.5;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(s, s);
      ctx.translate(-cx, -cy);
      drawA(ctx, w, h, time);
      ctx.restore();
    } else {
      const s = 2.5 - (p - 0.5) * 3;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(Math.max(1, s), Math.max(1, s));
      ctx.translate(-cx, -cy);
      drawB(ctx, w, h, time);
      ctx.restore();
    }
    const flash = Math.sin(p * Math.PI);
    ctx.fillStyle = `rgba(255, 255, 255, ${flash * 0.8})`;
    ctx.fillRect(0, 0, w, h);
  } else if (id === 'squeezeIn') {
    const sq = Math.abs(Math.cos(p * Math.PI));
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(sq, 1);
    ctx.translate(-cx, -cy);
    if (p < 0.5) {
      drawA(ctx, w, h, time);
    } else {
      drawB(ctx, w, h, time);
    }
    ctx.restore();
  } else if (id === 'bounceIn') {
    const bounce = 1 + Math.sin(p * Math.PI * 2.5) * Math.exp(-p * 3) * 0.35;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(bounce, bounce);
    ctx.translate(-cx, -cy);
    if (p < 0.5) {
      drawA(ctx, w, h, time);
    } else {
      drawB(ctx, w, h, time);
    }
    ctx.restore();
  } else if (id === 'elasticSnap') {
    const shift = Math.sin(p * Math.PI * 3) * Math.exp(-p * 2) * w * 0.3;
    ctx.save();
    ctx.translate(shift, 0);
    if (p < 0.5) {
      drawA(ctx, w, h, time);
    } else {
      drawB(ctx, w, h, time);
    }
    ctx.restore();
  }

  // --- 5. ROTATIONS & 3D ---
  else if (id === 'spinClockwise') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(p * Math.PI * 2);
    const s = 1 - p * 0.5;
    ctx.scale(s, s);
    ctx.translate(-cx, -cy);
    drawA(ctx, w, h, time);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = p;
    ctx.translate(cx, cy);
    ctx.rotate((p - 1) * Math.PI * 2);
    ctx.translate(-cx, -cy);
    drawB(ctx, w, h, time);
    ctx.restore();
  } else if (id === 'spinCounter') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-p * Math.PI * 2);
    const s = 1 - p * 0.5;
    ctx.scale(s, s);
    ctx.translate(-cx, -cy);
    drawA(ctx, w, h, time);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = p;
    ctx.translate(cx, cy);
    ctx.rotate((1 - p) * Math.PI * 2);
    ctx.translate(-cx, -cy);
    drawB(ctx, w, h, time);
    ctx.restore();
  } else if (id === 'flipHorizontal') {
    const angle = p * Math.PI;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(Math.cos(angle), 1);
    ctx.translate(-cx, -cy);
    if (p < 0.5) {
      drawA(ctx, w, h, time);
    } else {
      ctx.translate(cx, cy);
      ctx.scale(-1, 1);
      ctx.translate(-cx, -cy);
      drawB(ctx, w, h, time);
    }
    ctx.restore();
  } else if (id === 'flipVertical') {
    const angle = p * Math.PI;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, Math.cos(angle));
    ctx.translate(-cx, -cy);
    if (p < 0.5) {
      drawA(ctx, w, h, time);
    } else {
      ctx.translate(cx, cy);
      ctx.scale(1, -1);
      ctx.translate(-cx, -cy);
      drawB(ctx, w, h, time);
    }
    ctx.restore();
  } else if (id === 'swirlVortex') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(p * Math.PI * 3);
    const s = Math.abs(Math.cos(p * Math.PI));
    ctx.scale(s, s);
    ctx.translate(-cx, -cy);
    if (p < 0.5) {
      drawA(ctx, w, h, time);
    } else {
      drawB(ctx, w, h, time);
    }
    ctx.restore();
  } else if (id === 'pageCurl') {
    // Realistic 3D Page Curl peeling from Bottom-Right to Top-Left
    drawB(ctx, w, h, time);

    const totalD = w * w + h * h;
    const C = totalD * (1 - 1.35 * p);

    if (C > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      const xTop = Math.min(w, C / w);
      ctx.lineTo(xTop, 0);

      if (C / w >= w) {
        const yRight = Math.min(h, (C - w * w) / h);
        if (yRight > 0) ctx.lineTo(w, yRight);
      }

      if (C - w * w >= h * h) {
        ctx.lineTo(w, h);
      }

      const xBottom = Math.max(0, (C - h * h) / w);
      if (xBottom > 0 || C >= h * h) {
        ctx.lineTo(xBottom, h);
      }

      const yLeft = Math.min(h, C / h);
      ctx.lineTo(0, yLeft);
      ctx.closePath();
      ctx.clip();
      drawA(ctx, w, h, time);
      ctx.restore();

      // Curled paper roll & shadow along fold line wx + hy = C
      if (p > 0.02 && p < 0.98) {
        let p1 = { x: C / w <= w ? C / w : w, y: C / w <= w ? 0 : (C - w * w) / h };
        let p2 = { x: C / h <= h ? 0 : (C - h * h) / w, y: C / h <= h ? C / h : h };

        ctx.save();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 12;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.strokeStyle = '#F0EAD6';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // --- 6. GLITCH & WARP ---
  else if (id === 'glitch') {
    drawA(ctx, w, h, time);
    ctx.save();
    ctx.globalAlpha = p;
    drawB(ctx, w, h, time);
    ctx.restore();

    ctx.fillStyle = 'rgba(0, 240, 255, 0.5)';
    ctx.fillRect(0, (Math.sin(time * 20) * 0.5 + 0.5) * h, w, 4);
    ctx.fillStyle = 'rgba(255, 0, 100, 0.5)';
    ctx.fillRect(0, (Math.cos(time * 25) * 0.5 + 0.5) * h, w, 3);
  } else if (id === 'rgbSplit') {
    const shift = Math.sin(p * Math.PI) * 12;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.fillRect(-shift, 0, w, h);
    ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
    ctx.fillRect(shift, 0, w, h);
    ctx.restore();

    if (p < 0.5) {
      drawA(ctx, w, h, time);
    } else {
      drawB(ctx, w, h, time);
    }
  } else if (id === 'tvStatic') {
    if (p < 0.45) {
      drawA(ctx, w, h, time);
    } else if (p > 0.55) {
      drawB(ctx, w, h, time);
    } else {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#FFFFFF';
      for (let i = 0; i < 80; i++) {
        ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
      }
      ctx.fillRect(0, cy - 1, w, 2);
    }
  } else if (id === 'pixelateDissolve') {
    const blockSize = Math.sin(p * Math.PI) * 18 + 1;
    if (p < 0.5) {
      drawA(ctx, w, h, time);
    } else {
      drawB(ctx, w, h, time);
    }
    if (blockSize > 2) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      for (let x = 0; x < w; x += blockSize) {
        for (let y = 0; y < h; y += blockSize) {
          if ((x + y) % 2 === 0) {
            ctx.fillRect(x, y, blockSize, blockSize);
          }
        }
      }
    }
  } else if (id === 'rippleWave') {
    const r = p * maxR;
    drawA(ctx, w, h, time);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    drawB(ctx, w, h, time);
    ctx.restore();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  } else if (id === 'kaleidoscope') {
    drawA(ctx, w, h, time);
    ctx.save();
    ctx.globalAlpha = p;
    drawB(ctx, w, h, time);
    ctx.restore();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 + p * Math.PI;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR);
      ctx.stroke();
    }
  } else if (id === 'stretchHorizontal') {
    const sX = 1 + Math.sin(p * Math.PI) * 2;
    const sY = 1 - Math.sin(p * Math.PI) * 0.7;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(sX, sY);
    ctx.translate(-cx, -cy);
    if (p < 0.5) {
      drawA(ctx, w, h, time);
    } else {
      drawB(ctx, w, h, time);
    }
    ctx.restore();
    ctx.fillStyle = `rgba(0, 240, 255, ${Math.sin(p * Math.PI) * 0.6})`;
    ctx.fillRect(0, cy - 2, w, 4);
  } else if (id === 'stretchVertical') {
    const sY = 1 + Math.sin(p * Math.PI) * 2.5;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, sY);
    ctx.translate(-cx, -cy);
    if (p < 0.5) {
      drawA(ctx, w, h, time);
    } else {
      drawB(ctx, w, h, time);
    }
    ctx.restore();
  }

  // --- 7. SHAPES & IRIS ---
  else if (id === 'circleCropIn') {
    const r = p * maxR;
    drawA(ctx, w, h, time);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    drawB(ctx, w, h, time);
    ctx.restore();
    ctx.strokeStyle = '#C9A84C';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  } else if (id === 'circleCropOut') {
    const r = (1 - p) * maxR;
    drawB(ctx, w, h, time);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    drawA(ctx, w, h, time);
    ctx.restore();
    ctx.strokeStyle = '#C9A84C';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  } else if (id === 'diamondReveal') {
    const d = p * maxR;
    drawA(ctx, w, h, time);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy - d);
    ctx.lineTo(cx + d, cy);
    ctx.lineTo(cx, cy + d);
    ctx.lineTo(cx - d, cy);
    ctx.closePath();
    ctx.clip();
    drawB(ctx, w, h, time);
    ctx.restore();
  } else if (id === 'starReveal') {
    const r = p * maxR;
    drawA(ctx, w, h, time);
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const aOuter = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      const aInner = aOuter + Math.PI / 5;
      ctx.lineTo(cx + Math.cos(aOuter) * r, cy + Math.sin(aOuter) * r);
      ctx.lineTo(cx + Math.cos(aInner) * (r * 0.4), cy + Math.sin(aInner) * (r * 0.4));
    }
    ctx.closePath();
    ctx.clip();
    drawB(ctx, w, h, time);
    ctx.restore();
  } else if (id === 'heartReveal') {
    const s = p * maxR * 0.035;
    drawA(ctx, w, h, time);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy + s * 10);
    ctx.bezierCurveTo(cx - s * 20, cy - s * 10, cx - s * 25, cy + s * 15, cx, cy + s * 28);
    ctx.bezierCurveTo(cx + s * 25, cy + s * 15, cx + s * 20, cy - s * 10, cx, cy + s * 10);
    ctx.closePath();
    ctx.clip();
    drawB(ctx, w, h, time);
    ctx.restore();
  } else if (id === 'checkerboard') {
    drawA(ctx, w, h, time);
    const cols = 6, rows = 4;
    const cw = w / cols, rh = h / rows;
    ctx.save();
    ctx.beginPath();
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if ((c + r) % 2 === 0) {
          ctx.rect(c * cw, r * rh, cw * p, rh);
        } else {
          ctx.rect(c * cw, r * rh, cw, rh * p);
        }
      }
    }
    ctx.clip();
    drawB(ctx, w, h, time);
    ctx.restore();
  } else if (id === 'gridDissolve') {
    drawA(ctx, w, h, time);
    const cols = 8, rows = 6;
    const cw = w / cols, rh = h / rows;
    ctx.save();
    ctx.beginPath();
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const hash = ((c * 17 + r * 31) % 100) / 100;
        if (p > hash) {
          ctx.rect(c * cw, r * rh, cw, rh);
        }
      }
    }
    ctx.clip();
    drawB(ctx, w, h, time);
    ctx.restore();
  }

  // --- 8. LIGHT & RETRO ---
  else if (id === 'filmBurn') {
    drawA(ctx, w, h, time);
    ctx.save();
    ctx.globalAlpha = p;
    drawB(ctx, w, h, time);
    ctx.restore();

    const flareP = Math.sin(p * Math.PI);
    const grad = ctx.createRadialGradient(w, cy, 0, w, cy, w * flareP * 1.2);
    grad.addColorStop(0, 'rgba(255, 200, 50, 0.85)');
    grad.addColorStop(0.5, 'rgba(255, 80, 0, 0.5)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  } else if (id === 'flashLightning') {
    drawA(ctx, w, h, time);
    ctx.save();
    ctx.globalAlpha = p;
    drawB(ctx, w, h, time);
    ctx.restore();

    if (Math.sin(p * 25) > 0.4) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);
    }
  } else if (id === 'filmRoll') {
    const rollY = p * h;
    ctx.save();
    ctx.translate(0, -rollY);
    drawA(ctx, w, h, time);
    ctx.translate(0, h);
    drawB(ctx, w, h, time);
    ctx.restore();

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, h - rollY - 4, w, 8);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(4, h - rollY - 2, 4, 4);
    ctx.fillRect(w - 8, h - rollY - 2, 4, 4);
  } else if (id === 'windStreak') {
    const shift = (1 - p) * w * 0.8;
    ctx.save();
    ctx.translate(-shift, 0);
    drawA(ctx, w, h, time);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = p;
    drawB(ctx, w, h, time);
    ctx.restore();

    ctx.strokeStyle = `rgba(255, 255, 255, ${Math.sin(p * Math.PI) * 0.5})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const wy = (i * 12 + time * 40) % h;
      ctx.beginPath();
      ctx.moveTo(0, wy);
      ctx.lineTo(w, wy);
      ctx.stroke();
    }
  } else if (id === 'colorDistance') {
    drawA(ctx, w, h, time);
    ctx.save();
    ctx.globalAlpha = p;
    drawB(ctx, w, h, time);
    ctx.restore();

    const rainbow = ctx.createLinearGradient(0, 0, w, h);
    rainbow.addColorStop(0, 'rgba(255, 0, 0, 0.25)');
    rainbow.addColorStop(0.25, 'rgba(255, 255, 0, 0.25)');
    rainbow.addColorStop(0.5, 'rgba(0, 255, 0, 0.25)');
    rainbow.addColorStop(0.75, 'rgba(0, 255, 255, 0.25)');
    rainbow.addColorStop(1, 'rgba(255, 0, 255, 0.25)');
    ctx.fillStyle = rainbow;
    ctx.fillRect(0, 0, w, h);
  } else if (id === 'doorway3D') {
    drawB(ctx, w, h, time);

    const doorW = cx * (1 - p);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, doorW, h);
    ctx.clip();
    drawA(ctx, w, h, time);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(w - doorW, 0, doorW, h);
    ctx.clip();
    drawA(ctx, w, h, time);
    ctx.restore();
  }

  // --- DEFAULT CROSSFADE ---
  else {
    drawA(ctx, w, h, time);
    ctx.save();
    ctx.globalAlpha = p;
    drawB(ctx, w, h, time);
    ctx.restore();
  }
}

// 2. Transition Render Loop (Photographic Forest <-> Sea Seamless Ping-Pong Loop)
function renderTransitionSample(
  ctx: CanvasRenderingContext2D,
  id: string,
  w: number,
  h: number,
  progress: number,
  time: number
) {
  const t = progress; // 0.0 to 1.0

  // Seamless Ping-Pong Timing Curve (UserFrame -> Sea -> UserFrame)
  if (t <= 0.08) {
    drawUserFrameScene(ctx, w, h);
    return;
  } else if (t > 0.08 && t < 0.46) {
    const rawP = (t - 0.08) / 0.38;
    const p = easeInOutCubic(rawP);
    renderTransitionCore(ctx, id, w, h, p, time, (c, w, h) => drawUserFrameScene(c, w, h), drawSeaScene);
  } else if (t >= 0.46 && t <= 0.54) {
    drawSeaScene(ctx, w, h, time);
    return;
  } else if (t > 0.54 && t < 0.92) {
    const rawP = (t - 0.54) / 0.38;
    const p = easeInOutCubic(rawP);
    renderTransitionCore(ctx, id, w, h, p, time, drawSeaScene, (c, w, h) => drawUserFrameScene(c, w, h));
  } else {
    drawUserFrameScene(ctx, w, h);
    return;
  }
}

// 3. Text Sample Render Loop
function renderTextSample(
  ctx: CanvasRenderingContext2D,
  id: string,
  title: string,
  sampleText: string,
  w: number,
  h: number,
  progress: number,
  time: number
) {
  drawUserFrameScene(ctx, w, h);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const textToDraw = sampleText || title.toUpperCase();

  if (id.includes('glitch') || id.includes('cyber')) {
    ctx.font = '900 12px Impact, sans-serif';
    ctx.fillStyle = '#00F0FF';
    ctx.fillText(textToDraw, cx - 1.5, cy);
    ctx.fillStyle = '#FF007F';
    ctx.fillText(textToDraw, cx + 1.5, cy);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(textToDraw, cx, cy);
  } else if (id.includes('neon') || id.includes('glow')) {
    ctx.font = 'bold 12px Arial, sans-serif';
    ctx.shadowColor = '#C9A84C';
    ctx.shadowBlur = Math.sin(time * 6) * 10 + 4;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(textToDraw, cx, cy);
    ctx.shadowBlur = 0;
  } else if (id.includes('bounce') || id.includes('pop')) {
    const scale = Math.sin(time * 5) * 0.15 + 1;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.font = '900 12px sans-serif';
    ctx.fillStyle = '#C9A84C';
    ctx.fillText(textToDraw, 0, 0);
    ctx.restore();
  } else {
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(textToDraw, cx, cy);
  }
}

// 4. Caption Style Sample Render Loop
function renderCaptionSample(
  ctx: CanvasRenderingContext2D,
  id: string,
  title: string,
  sampleText: string,
  w: number,
  h: number,
  progress: number,
  time: number
) {
  drawUserFrameScene(ctx, w, h);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h * 0.62;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Specific CapCut Template Visuals
  if (id === 'trending-green-italic' || id.includes('green-italic')) {
    const pop = Math.sin(time * 6) * 0.08 + 1;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(pop, pop);
    ctx.font = 'italic 900 13px Impact, sans-serif';

    // Measure texts
    const part1 = 'The ';
    const part2 = 'quick';
    const w1 = ctx.measureText(part1).width;
    const w2 = ctx.measureText(part2).width;
    const totalW = w1 + w2;
    const startX = -totalW / 2;

    ctx.textAlign = 'left';

    // Green italic "The "
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3.5;
    ctx.strokeText(part1, startX, 0);
    ctx.fillStyle = '#22C55E';
    ctx.fillText(part1, startX, 0);

    // White italic "quick"
    ctx.strokeText(part2, startX + w1, 0);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(part2, startX + w1, 0);
    ctx.restore();
  } else if (id === 'classic-dark-pill' || id.includes('dark-pill')) {
    const text = sampleText || 'THE QUICK BROWN FOX';
    ctx.font = '900 9px "Arial Black", sans-serif';
    const tw = ctx.measureText(text).width;
    const pw = tw + 18;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
    ctx.beginPath();
    ctx.roundRect(cx - pw / 2, cy - 10, pw, 20, 6);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(text, cx, cy);
  } else if (id === 'hits-blue-punch' || id.includes('blue-punch')) {
    const scale = Math.sin(time * 7) * 0.1 + 1;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    ctx.font = '900 18px Impact, sans-serif';
    ctx.shadowColor = '#2563EB';
    ctx.shadowBlur = 12;

    ctx.lineWidth = 6;
    ctx.strokeStyle = '#2563EB';
    ctx.strokeText('THE', 0, 0);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('THE', 0, 0);
    ctx.shadowBlur = 0;
    ctx.restore();
  } else if (id === 'classic-quick-yellow' || id.includes('quick-yellow')) {
    ctx.font = '900 13px Impact, sans-serif';
    const p1 = 'THE ';
    const p2 = 'QUICK';
    const w1 = ctx.measureText(p1).width;
    const w2 = ctx.measureText(p2).width;
    const startX = -(w1 + w2) / 2;

    ctx.textAlign = 'left';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3.5;

    ctx.strokeText(p1, startX, cy);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(p1, startX, cy);

    ctx.strokeText(p2, startX + w1, cy);
    ctx.fillStyle = '#FACC15';
    ctx.fillText(p2, startX + w1, cy);
  } else if (id.includes('cyan') || id.includes('electric') || id.includes('glow')) {
    ctx.font = 'bold 11px "Roboto Mono", monospace';
    ctx.shadowColor = '#00F0FF';
    ctx.shadowBlur = Math.sin(time * 8) * 12 + 8;
    ctx.strokeStyle = '#003366';
    ctx.lineWidth = 2;
    ctx.strokeText(sampleText || 'ELECTRIC VIBE', cx, cy);
    ctx.fillStyle = '#00F0FF';
    ctx.fillText(sampleText || 'ELECTRIC VIBE', cx, cy);
    ctx.shadowBlur = 0;
  } else if (id.includes('cursive') || id.includes('lyrics')) {
    ctx.font = 'italic 15px Caveat, cursive';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.fillStyle = '#FDE047';
    ctx.fillText('The quick brown fox...', cx, cy);
    ctx.shadowBlur = 0;
  } else if (id.includes('hormozi') || id.includes('yellow')) {
    const pop = Math.sin(time * 8) * 0.1 + 1;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(pop, pop);
    ctx.font = '900 12px Impact, sans-serif';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.strokeText('VIRAL HOOK', 0, 0);
    ctx.fillStyle = '#FACC15';
    ctx.fillText('VIRAL HOOK', 0, 0);
    ctx.restore();
  } else {
    // Default fallback style
    ctx.font = 'bold 11px sans-serif';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeText(title, cx, cy);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(title, cx, cy);
  }
}

// 5. Graphic Sample Render Loop
function renderGraphicSample(
  ctx: CanvasRenderingContext2D,
  id: string,
  title: string,
  w: number,
  h: number,
  progress: number,
  time: number
) {
  // Studio dark background grid
  ctx.fillStyle = '#111116';
  ctx.fillRect(0, 0, w, h);

  // Subtle grid lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += 16) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  const cx = w / 2;
  const cy = h / 2;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 1. Shapes
  if (id.includes('rounded-card') || id.includes('rounded')) {
    const pulse = Math.sin(time * 4) * 2;
    ctx.fillStyle = 'rgba(20, 20, 28, 0.9)';
    ctx.strokeStyle = '#C9A84C';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#C9A84C';
    ctx.shadowBlur = 8 + pulse;

    ctx.beginPath();
    ctx.roundRect(cx - 50, cy - 25, 100, 50, 10);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('GLASS CARD', cx, cy);
  } else if (id.includes('circle-ring') || id.includes('circle')) {
    const radius = 28 + Math.sin(time * 5) * 3;
    ctx.strokeStyle = '#00F0FF';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00F0FF';
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  } else if (id.includes('star')) {
    const scale = Math.sin(time * 5) * 0.1 + 1;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    ctx.fillStyle = '#F59E0B';
    ctx.shadowColor = '#F59E0B';
    ctx.shadowBlur = 12;

    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      ctx.lineTo(
        Math.cos(((18 + i * 72) * Math.PI) / 180) * 26,
        -Math.sin(((18 + i * 72) * Math.PI) / 180) * 26
      );
      ctx.lineTo(
        Math.cos(((54 + i * 72) * Math.PI) / 180) * 12,
        -Math.sin(((54 + i * 72) * Math.PI) / 180) * 12
      );
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else if (id.includes('arrow')) {
    const shift = Math.sin(time * 6) * 4;
    ctx.save();
    ctx.translate(cx + shift, cy);

    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.moveTo(-20, -12);
    ctx.lineTo(5, -12);
    ctx.lineTo(5, -22);
    ctx.lineTo(25, 0);
    ctx.lineTo(5, 22);
    ctx.lineTo(5, 12);
    ctx.lineTo(-20, 12);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  } else if (id.includes('heart')) {
    const pulse = Math.sin(time * 6) * 0.15 + 1;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(pulse, pulse);

    ctx.fillStyle = '#EC4899';
    ctx.shadowColor = '#EC4899';
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.bezierCurveTo(-20, -10, -35, -25, 0, -35);
    ctx.bezierCurveTo(35, -25, 20, -10, 0, 10);
    ctx.fill();
    ctx.restore();
  } else if (id.includes('bubble') || id.includes('callout')) {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(cx - 45, cy - 22, 90, 36, 10);
    ctx.fill();

    // Bubble pointer
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy + 14);
    ctx.lineTo(cx - 20, cy + 24);
    ctx.lineTo(cx - 2, cy + 14);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('SPEECH', cx, cy - 4);
  } else if (id.includes('divider')) {
    ctx.strokeStyle = '#C9A84C';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#C9A84C';
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.moveTo(cx - 55, cy);
    ctx.lineTo(cx + 55, cy);
    ctx.stroke();

    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  } else if (id.includes('progress')) {
    const pw = 100;
    const ph = 12;
    const fillW = pw * (0.3 + ((time * 0.3) % 0.7));

    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.roundRect(cx - pw / 2, cy - ph / 2, pw, ph, 6);
    ctx.fill();

    ctx.fillStyle = '#10B981';
    ctx.beginPath();
    ctx.roundRect(cx - pw / 2, cy - ph / 2, fillW, ph, 6);
    ctx.fill();
  }

  // 2. Stickers / Emojis
  else if (id.includes('sticker') || id.includes('fire') || id.includes('100') || id.includes('lightning') || id.includes('skull') || id.includes('money') || id.includes('eyes') || id.includes('target') || id.includes('shocked')) {
    let emoji = '🔥';
    if (id.includes('100')) emoji = '💯';
    else if (id.includes('lightning')) emoji = '⚡';
    else if (id.includes('skull')) emoji = '💀';
    else if (id.includes('money')) emoji = '💰';
    else if (id.includes('shocked')) emoji = '🤯';
    else if (id.includes('eyes')) emoji = '👀';
    else if (id.includes('target')) emoji = '🎯';

    const bounce = Math.sin(time * 6) * 4;
    ctx.font = '36px sans-serif';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 8;
    ctx.fillText(emoji, cx, cy + bounce);
    ctx.shadowBlur = 0;
  }

  // 3. Badges
  else if (id.includes('badge') || id.includes('subscribe') || id.includes('verified') || id.includes('4k') || id.includes('new')) {
    if (id.includes('subscribe')) {
      ctx.fillStyle = '#DC2626';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(cx - 55, cy - 14, 110, 28, 14);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('🔔 SUBSCRIBE', cx, cy);
    } else if (id.includes('verified')) {
      ctx.fillStyle = '#0284C7';
      ctx.beginPath();
      ctx.roundRect(cx - 55, cy - 12, 110, 24, 12);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 8px sans-serif';
      ctx.fillText('✓ VERIFIED', cx, cy);
    } else if (id.includes('4k')) {
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(cx - 45, cy - 12, 90, 24, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#F59E0B';
      ctx.font = '900 9px sans-serif';
      ctx.fillText('4K ULTRA HD', cx, cy);
    } else {
      ctx.fillStyle = '#7C3AED';
      ctx.beginPath();
      ctx.roundRect(cx - 50, cy - 12, 100, 24, 12);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 8px sans-serif';
      ctx.fillText('⚡ NEW DROP', cx, cy);
    }
  }

  // 4. Lower Thirds
  else if (id.includes('lower') || id.includes('streamer') || id.includes('news') || id.includes('cyber') || id.includes('quote')) {
    const lY = h * 0.72;
    if (id.includes('news')) {
      ctx.fillStyle = 'rgba(185, 28, 28, 0.95)';
      ctx.fillRect(10, lY - 14, w - 20, 28);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 8px sans-serif';
      ctx.fillText('🔴 BREAKING NEWS TICKER', cx, lY);
    } else if (id.includes('cyber')) {
      ctx.fillStyle = 'rgba(6, 78, 59, 0.9)';
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 1;
      ctx.fillRect(15, lY - 14, w - 30, 28);
      ctx.strokeRect(15, lY - 14, w - 30, 28);

      ctx.fillStyle = '#10B981';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('SYS.PROTOCOL // ONLINE', cx, lY);
    } else {
      ctx.fillStyle = 'rgba(15, 15, 20, 0.92)';
      ctx.strokeStyle = '#C9A84C';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(15, lY - 16, w - 30, 32, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('ALEX VANCE', cx, lY - 3);

      ctx.fillStyle = '#C9A84C';
      ctx.font = '7px sans-serif';
      ctx.fillText('@alexvance_creator', cx, lY + 7);
    }
  }

  // 5. Default Fallback Graphic
  else {
    ctx.fillStyle = '#C9A84C';
    ctx.beginPath();
    ctx.roundRect(cx - 45, cy - 14, 90, 28, 8);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.font = 'extrabold 9px sans-serif';
    ctx.fillText(title.toUpperCase().slice(0, 12), cx, cy);
  }
}
