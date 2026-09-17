import { ProjectDocument } from '../types/project';
import { renderCanvasFrame, preloadAllProjectAssets } from './previewRenderer';

export interface ExportOptions {
  width: number;
  height: number;
  fps: number;
  format: 'mp4' | 'webm';
  quality: 'high' | 'medium' | 'low';
  muteAudio: boolean;
  onProgress: (progress: number, frame: number, totalFrames: number) => void;
}

export interface ExportResult {
  blob: Blob;
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds: number;
}

/**
 * High-speed hardware-accelerated video exporter using HTML5 Canvas captureStream and MediaRecorder.
 * Renders all video layers, transitions, Ken Burns motion, and captions frame-by-frame with zero server strain.
 */
export async function exportVideo(
  project: ProjectDocument,
  options: ExportOptions
): Promise<ExportResult> {
  const { width, height, fps, format, quality, muteAudio, onProgress } = options;
  const duration = Math.max(1, project.timeline.duration);
  const totalFrames = Math.ceil(duration * fps);

  // 1. Preload all project media assets into memory
  await preloadAllProjectAssets(project);

  // 2. Off-screen render canvas (Must be in DOM for captureStream to work in some browsers)
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.style.position = 'fixed';
  canvas.style.top = '-9999px';
  canvas.style.left = '-9999px';
  canvas.style.opacity = '0.01'; // opacity 0 might cause throttle
  canvas.style.pointerEvents = 'none';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    document.body.removeChild(canvas);
    throw new Error('Failed to initialize 2D canvas context');
  }

  // 3. Multi-track audio stream mixing
  let audioStream: MediaStream | null = null;
  let audioCtx: AudioContext | null = null;

  if (!muteAudio) {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
        const dest = audioCtx.createMediaStreamDestination();

        const allAudioClips: Array<{ clip: typeof project.timeline.tracks[0]['clips'][0]; asset: typeof project.assets[string] }> = [];
        for (const track of project.timeline.tracks) {
          if (track.muted) continue;
          for (const clip of track.clips) {
            const asset = project.assets[clip.assetId];
            const isMedia = asset?.type === 'video' || asset?.type === 'audio' || !!asset?.filename?.match(/\.(mp4|mov|webm|mkv|avi|flv|m4v|mp3|wav|ogg)$/i);
            if (asset?.url && isMedia) {
              allAudioClips.push({ clip, asset });
            }
          }
        }

        let hasRealAudio = false;
        for (const { clip, asset } of allAudioClips) {
          try {
            const resp = await fetch(asset.url);
            const arrayBuffer = await resp.arrayBuffer();
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

            const source = audioCtx.createBufferSource();
            source.buffer = audioBuffer;

            const speed = clip.audio?.speed ?? 1.0;
            source.playbackRate.value = Math.max(0.25, Math.min(4.0, speed));

            const rawVol = clip.audio?.volume ?? 0;
            const linearVol = rawVol <= -60 ? 0 : Math.pow(10, rawVol / 20);
            const gainNode = audioCtx.createGain();
            gainNode.gain.value = linearVol;

            const fadeIn = clip.audio?.fadeIn ?? 0;
            if (fadeIn > 0) {
              gainNode.gain.setValueAtTime(0, clip.startTime);
              gainNode.gain.linearRampToValueAtTime(linearVol, clip.startTime + fadeIn);
            }

            const fadeOut = clip.audio?.fadeOut ?? 0;
            const clipEnd = clip.startTime + clip.duration;
            if (fadeOut > 0) {
              gainNode.gain.setValueAtTime(linearVol, clipEnd - fadeOut);
              gainNode.gain.linearRampToValueAtTime(0, clipEnd);
            }

            gainNode.connect(dest);
            source.connect(gainNode);
            // Fix audio sync: play the audio at the correct relative time for MediaRecorder
            source.start(0, clip.sourceIn);
            source.stop(clip.duration);
            hasRealAudio = true;
          } catch (err) {
            console.warn('Failed to encode audio clip in export:', clip.assetId, err);
          }
        }

        if (hasRealAudio) {
          audioStream = dest.stream;
        }
      }
    } catch (err) {
      console.warn('Audio export context initialization skipped:', err);
    }
  }

  try {
    const canvasStream = canvas.captureStream(fps);
    const combinedTracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];
    if (audioStream && audioStream.getAudioTracks().length > 0) {
      combinedTracks.push(...audioStream.getAudioTracks());
    }
    const combinedStream = new MediaStream(combinedTracks);

    let selectedMimeType = 'video/webm';
    if (format === 'mp4') {
      if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42E01E,mp4a.40.2')) {
        selectedMimeType = 'video/mp4;codecs=avc1.42E01E,mp4a.40.2';
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        selectedMimeType = 'video/mp4';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
        selectedMimeType = 'video/webm;codecs=vp9,opus';
      } else {
        selectedMimeType = 'video/webm';
      }
    } else {
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
        selectedMimeType = 'video/webm;codecs=vp9,opus';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
        selectedMimeType = 'video/webm;codecs=vp8,opus';
      } else {
        selectedMimeType = 'video/webm';
      }
    }

    // Adjust bitrate based on selected quality
    const baseBits = width >= 2160 ? 15_000_000 : width >= 1080 ? 8_000_000 : 4_000_000;
    let videoBitsPerSecond = baseBits;
    if (quality === 'high') videoBitsPerSecond = baseBits * 1.5;
    if (quality === 'low') videoBitsPerSecond = Math.max(1_000_000, baseBits * 0.25); // high compression

    const recorder = new MediaRecorder(combinedStream, {
      mimeType: selectedMimeType,
      videoBitsPerSecond,
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    const recordingPromise = new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => {
        const recordedBlob = new Blob(chunks, { type: selectedMimeType.split(';')[0] });
        resolve(recordedBlob);
      };
      recorder.onerror = (e) => reject(e);
    });

    recorder.start(100);

    function isTransitionFrame(t: number): boolean {
      for (const track of project.timeline.tracks) {
        for (const clip of track.clips) {
          if (clip.transitionIn && t >= clip.startTime - clip.transitionIn.duration && t <= clip.startTime + 0.1) return true;
          const clipEnd = clip.startTime + clip.duration;
          if (clip.transitionOut && t >= clipEnd - clip.transitionOut.duration - 0.1 && t <= clipEnd) return true;
        }
      }
      return false;
    }

    const yieldFrame = (extraMs = 0) =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          if (extraMs > 0) {
            setTimeout(resolve, extraMs);
          } else {
            const ch = new MessageChannel();
            ch.port1.onmessage = () => resolve();
            ch.port2.postMessage(null);
          }
        });
      });

    const baseYieldMs = Math.max(4, Math.floor(1000 / fps / 2));

    for (let frame = 0; frame <= totalFrames; frame++) {
      const currentTime = frame / fps;
      renderCanvasFrame(ctx, project, currentTime, width, height, true);

      const progressPct = Math.min(99, Math.round((frame / totalFrames) * 100));
      options.onProgress(progressPct, frame, totalFrames);

      const transitionExtra = isTransitionFrame(currentTime) ? baseYieldMs : 0;
      await yieldFrame(transitionExtra);
    }

    options.onProgress(100, totalFrames, totalFrames);
    recorder.stop();

    if (audioCtx && audioCtx.state !== 'closed') {
      try {
        audioCtx.close();
      } catch {}
    }

    const finalBlob = await recordingPromise;

    const isMp4 = selectedMimeType.includes('mp4');
    const extension = isMp4 ? 'mp4' : 'webm';
    const cleanProjectName = project.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${cleanProjectName}_${width}x${height}_${fps}fps.${extension}`;
    const url = URL.createObjectURL(finalBlob);

    return {
      blob: finalBlob,
      url,
      filename,
      mimeType: isMp4 ? 'video/mp4' : 'video/webm',
      sizeBytes: finalBlob.size,
      durationSeconds: duration,
    };
  } finally {
    document.body.removeChild(canvas);
  }
}
