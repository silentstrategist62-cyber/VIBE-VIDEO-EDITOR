/**
 * Web Audio Engine for real-time timeline playback and preview mixing.
 * Designed to eliminate audio buffer stutter and slicing artifacts.
 */

class AudioEngine {
  private audioCtx: AudioContext | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private currentUrl: string | null = null;
  private isPlaying = false;
  private isLoaded = false;
  private currentVolume = 1.0;
  private currentSpeed = 1.0;

  private initContext() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }

  public setAudioSource(url: string) {
    if (this.currentUrl === url && this.audioElement) return;
    this.currentUrl = url;
    this.isLoaded = false;

    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
    }

    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.preload = 'auto';

    this.audioElement.addEventListener('canplay', () => {
      this.isLoaded = true;
    });

    this.audioElement.addEventListener('error', (err) => {
      console.warn('AudioEngine error loading source:', err);
      this.isPlaying = false;
      this.isLoaded = false;
    });

    this.audioElement.src = url;
  }

  public playFrom(time: number, volume = 1.0, speed = 1.0, normalize = false) {
    this.initContext();
    if (!this.audioElement || !this.currentUrl) return;

    this.currentVolume = Math.max(0, Math.min(1, normalize ? this.applyNormalizeLoudness(volume, true) : volume));
    this.currentSpeed = Math.max(0.25, Math.min(3.0, speed));

    this.audioElement.volume = this.currentVolume;
    this.audioElement.playbackRate = this.currentSpeed;

    // Set time accurately when starting playback
    try {
      if (Math.abs(this.audioElement.currentTime - time) > 0.05) {
        this.audioElement.currentTime = Math.max(0, time);
      }
    } catch {
      // Ignored if metadata still resolving
    }

    const playPromise = this.audioElement.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          this.isPlaying = true;
        })
        .catch((err) => {
          console.warn('Audio play auto-policy warning:', err);
          this.isPlaying = false;
        });
    }
  }

  public pause() {
    if (this.audioElement) {
      this.audioElement.pause();
    }
    this.isPlaying = false;
  }

  public seek(time: number) {
    if (!this.audioElement || this.audioElement.error) return;
    try {
      this.audioElement.currentTime = Math.max(0, time);
    } catch {
      // Ignored if metadata still resolving
    }
  }

  public getCurrentTime(): number | null {
    if (this.audioElement && !this.audioElement.error && !isNaN(this.audioElement.currentTime)) {
      return this.audioElement.currentTime;
    }
    return null;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying && !!this.audioElement && !this.audioElement.paused && !this.audioElement.error;
  }

  public setVolume(volume: number) {
    this.currentVolume = Math.max(0, Math.min(1, volume));
    if (this.audioElement) {
      this.audioElement.volume = this.currentVolume;
    }
  }

  public setSpeed(speed: number) {
    this.currentSpeed = Math.max(0.25, Math.min(3.0, speed));
    if (this.audioElement) {
      this.audioElement.playbackRate = this.currentSpeed;
    }
  }

  public stop() {
    this.pause();
    this.seek(0);
  }

  /**
   * Returns the current playback volume, accounting for dB-based normalization.
   * If normalizeLoudness is true, applies a +3 to +6dB boost and clips protection.
   */
  public applyNormalizeLoudness(volumeLinear: number, normalize: boolean): number {
    if (!normalize || volumeLinear <= 0) return volumeLinear;
    // Simple loudness normalization: boost to target -14 LUFS equivalent (~1.5x linear)
    const normalized = Math.min(1.0, volumeLinear * 1.5);
    return normalized;
  }
}

export const audioEngine = new AudioEngine();

/**
 * Computes normalized waveform peaks from an audio asset URL.
 * Returns an array of 0-1 amplitude values for waveform visualization.
 */
export async function computeWaveformPeaks(url: string, buckets = 200): Promise<number[]> {
  try {
    const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    if (!AudioContextClass) return [];

    const resp = await fetch(url);
    const arrayBuffer = await resp.arrayBuffer();
    const audioCtx = new AudioContextClass();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    audioCtx.close();

    // Use first channel for peak analysis
    const channelData = audioBuffer.getChannelData(0);
    const totalSamples = channelData.length;
    const samplesPerBucket = Math.max(1, Math.floor(totalSamples / buckets));
    const peaks: number[] = [];

    for (let b = 0; b < buckets; b++) {
      const start = b * samplesPerBucket;
      const end = Math.min(start + samplesPerBucket, totalSamples);
      let max = 0;
      for (let i = start; i < end; i++) {
        const abs = Math.abs(channelData[i]);
        if (abs > max) max = abs;
      }
      peaks.push(Number(max.toFixed(3)));
    }

    // Normalize so the loudest peak is 1.0
    const globalMax = Math.max(...peaks, 0.001);
    return peaks.map((p) => Number((p / globalMax).toFixed(3)));
  } catch (err) {
    console.warn('Failed to compute waveform peaks:', err);
    return [];
  }
}
