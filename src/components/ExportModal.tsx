import React, { useState } from 'react';
import {
  X,
  Download,
  CheckCircle2,
  Film,
  Sparkles,
  Play,
  FileVideo,
  Clock,
  Layers,
  HardDrive,
  AlertCircle,
} from 'lucide-react';
import { projectStore, useProjectStore } from '../store/projectStore';
import { exportVideo, ExportResult } from '../services/videoExporter';

export const ExportModal: React.FC = () => {
  const { project, isExportOpen } = useProjectStore();

  const [resolution, setResolution] = useState<'1440x2560' | '1080x1920' | '720x1280'>('1080x1920');
  const [fps, setFps] = useState<30 | 60>(30);
  const [format, setFormat] = useState<'mp4' | 'webm'>('mp4');
  const [quality, setQuality] = useState<'high' | 'medium' | 'low'>('medium');
  const [muteAudio, setMuteAudio] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isExportOpen) return null;

  const handleStartExport = async () => {
    setIsRendering(true);
    setRenderProgress(0);
    setCurrentFrame(0);
    setTotalFrames(0);
    setExportResult(null);
    setErrorMessage(null);

    const [wStr, hStr] = resolution.split('x');
    const width = parseInt(wStr);
    const height = parseInt(hStr);

    try {
      const result = await exportVideo(project, {
        width,
        height,
        fps,
        format,
        quality,
        muteAudio,
        onProgress: (pct, frame, total) => {
          setRenderProgress(pct);
          setCurrentFrame(frame);
          setTotalFrames(total);
        },
      });

      setExportResult(result);
      setIsRendering(false);
    } catch (err: any) {
      console.error('Video export error:', err);
      setErrorMessage(err.message || 'Failed to render video');
      setIsRendering(false);
    }
  };

  const handleDownloadVideo = () => {
    if (!exportResult) return;
    const a = document.createElement('a');
    a.href = exportResult.url;
    a.download = exportResult.filename;
    a.click();
  };

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(project, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '_')}_project.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-lg bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Export Video Deliverable</h2>
              <p className="text-[11px] text-slate-400">
                Fast client-side hardware-accelerated encoder (Zero server bottleneck)
              </p>
            </div>
          </div>

          <button
            onClick={() => projectStore.toggleExport(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Specifications Card */}
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Aspect Ratio:</span>
              <span className="font-bold text-emerald-400">9:16 Portrait (Shorts / Reels / TikTok)</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Timeline Duration:</span>
              <span className="font-mono text-slate-200">{project.timeline.duration.toFixed(1)}s</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Tracks & Layers:</span>
              <span className="font-mono text-slate-200">
                {project.timeline.tracks.length} tracks (
                {project.timeline.tracks.reduce((acc, t) => acc + t.clips.length, 0)} clips)
              </span>
            </div>
          </div>

          {/* Config Options (only when not rendered yet) */}
          {!exportResult && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold mb-1.5 block">Resolution</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setResolution('1440x2560')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      resolution === '1440x2560'
                        ? 'border-emerald-500 bg-emerald-950/20 text-white font-bold shadow-sm shadow-emerald-500/10'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div>1440 × 2560</div>
                    <span className="text-[10px] text-slate-500 font-normal">2K Quality</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setResolution('1080x1920')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      resolution === '1080x1920'
                        ? 'border-emerald-500 bg-emerald-950/20 text-white font-bold shadow-sm shadow-emerald-500/10'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div>1080 × 1920</div>
                    <span className="text-[10px] text-slate-500 font-normal">FHD (Standard)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setResolution('720x1280')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      resolution === '720x1280'
                        ? 'border-emerald-500 bg-emerald-950/20 text-white font-bold shadow-sm shadow-emerald-500/10'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div>720 × 1280</div>
                    <span className="text-[10px] text-slate-500 font-normal">HD (Fast/Light)</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold mb-1.5 block">Frame Rate</label>
                  <select
                    value={fps}
                    onChange={(e) => setFps(parseInt(e.target.value) as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value={30}>30 fps</option>
                    <option value={60}>60 fps</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold mb-1.5 block">Compression</label>
                  <select
                    value={quality}
                    onChange={(e) => setQuality(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="high">High (Large File)</option>
                    <option value="medium">Medium (Standard)</option>
                    <option value="low">Low (Small File)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold mb-1.5 block">Audio</label>
                  <button
                    type="button"
                    onClick={() => setMuteAudio(!muteAudio)}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      muteAudio
                        ? 'border-rose-500/50 bg-rose-950/20 text-rose-300'
                        : 'border-slate-800 bg-slate-900 text-slate-300 hover:text-white'
                    }`}
                  >
                    <span>{muteAudio ? 'Muted' : 'Enabled'}</span>
                    <div className={`w-3 h-3 rounded-full ${muteAudio ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Progress bar when rendering */}
          {isRendering && (
            <div className="space-y-2 p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
              <div className="flex justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-2 text-emerald-400">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  Encoding video frames...
                </span>
                <span className="font-mono text-emerald-300">{renderProgress}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  style={{ width: `${renderProgress}%` }}
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-150"
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                <span>
                  Frame {currentFrame} / {totalFrames}
                </span>
                <span>Hardware Accelerated GPU</span>
              </div>
            </div>
          )}

          {/* Success state & Video Player Preview */}
          {exportResult && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-white">Video Rendered Successfully!</h4>
                    <p className="text-[11px] text-emerald-300/80 font-mono mt-0.5">
                      {exportResult.filename} • {formatFileSize(exportResult.sizeBytes)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Video Player Preview */}
              <div className="flex flex-col items-center">
                <div className="w-48 aspect-[9/16] rounded-xl overflow-hidden bg-black border border-slate-700 shadow-2xl relative">
                  <video
                    src={exportResult.url}
                    controls
                    autoPlay
                    loop
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              {/* Primary Action Button */}
              <button
                onClick={handleDownloadVideo}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Save {exportResult.mimeType.includes('mp4') ? '.MP4' : '.WebM'} Video to Device</span>
              </button>

              <button
                onClick={handleDownloadJson}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              >
                Download Project Timeline Package (.json)
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between shrink-0">
          <button
            onClick={() => projectStore.toggleExport(false)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
          {!exportResult && (
            <button
              id="btn-confirm-export"
              onClick={handleStartExport}
              disabled={isRendering}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              <span>{isRendering ? 'Rendering Frames...' : 'Start Hardware Export'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
