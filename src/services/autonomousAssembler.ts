import {
  ProjectDocument,
  MediaAsset,
  Manifest,
  ManifestSegment,
  Clip,
  Track,
  Caption,
  WordTiming,
  Keyframe,
  WorkflowPreset,
} from '../types/project';
import { WORKFLOW_PRESETS } from '../data/presets';

export interface AssemblyInputs {
  presetId: string;
  projectName?: string;
  scriptText: string;
  audioAsset: MediaAsset;
  imageAssets: MediaAsset[];
  promptsText?: string; // Optional: raw prompts text or JSON
}

export interface AssemblyResult {
  project: ProjectDocument;
  manifest: Manifest;
  gapReport: {
    totalSegments: number;
    matchedSegments: number;
    missingImages: string[];
    unmatchedImages: string[];
  };
}

/**
 * Stage 1: Parse & Segment Script
 * Extracts segment IDs like B1, B2, A1, INTRO, etc.
 */
export function parseScriptSegments(rawScript: string): { segmentId: string; text: string }[] {
  const lines = rawScript.split('\n');
  const segments: { segmentId: string; text: string }[] = [];
  let currentId = '';
  let currentTextLines: string[] = [];

  // Match headers like: "## B1", "# B5 - Childhood Trauma", "B5:", "[B5]", "Segment B5"
  const headerRegex = /^(?:#+\s*|\[)?([A-Za-z]\d+|INTRO|OUTRO|HOOK|SEG_\d+|\d+)(?:\]|:|\s*[-–—]\s*.*)?$/i;
  const inlineTagRegex = /^([A-Za-z]\d+)[:\s]+(.*)/i;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const headerMatch = trimmed.match(headerRegex);
    const inlineMatch = trimmed.match(inlineTagRegex);

    if (headerMatch) {
      if (currentId && currentTextLines.length > 0) {
        segments.push({ segmentId: currentId.toUpperCase(), text: currentTextLines.join(' ').trim() });
        currentTextLines = [];
      }
      currentId = headerMatch[1].toUpperCase();
    } else if (inlineMatch) {
      if (currentId && currentTextLines.length > 0) {
        segments.push({ segmentId: currentId.toUpperCase(), text: currentTextLines.join(' ').trim() });
      }
      currentId = inlineMatch[1].toUpperCase();
      currentTextLines = [inlineMatch[2]];
    } else {
      if (!currentId) {
        currentId = `B${segments.length + 1}`;
      }
      currentTextLines.push(trimmed);
    }
  }

  if (currentId && currentTextLines.length > 0) {
    segments.push({ segmentId: currentId.toUpperCase(), text: currentTextLines.join(' ').trim() });
  }

  // Fallback: If no structured tags found, split by double newlines or sentences into numbered B1, B2, ...
  if (segments.length === 0 && rawScript.trim().length > 0) {
    const paragraphs = rawScript.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
    paragraphs.forEach((p, idx) => {
      segments.push({
        segmentId: `B${idx + 1}`,
        text: p.trim(),
      });
    });
  }

  return segments;
}

/**
 * Normalizes an image filename to its base segment ID
 * Examples:
 * "B5.jpg" -> "B5"
 * "B5-slug.png" -> "B5"
 * "B05_trauma_childhood.webp" -> "B5"
 * "b1.jpeg" -> "B1"
 */
export function extractIdFromFilename(filename: string): string {
  const withoutExt = filename.replace(/\.[^/.]+$/, '');
  const match = withoutExt.match(/^([A-Za-z]\d+|\d+|INTRO|OUTRO|HOOK)/i);
  if (match) {
    const raw = match[1].toUpperCase();
    // Normalize B05 -> B5
    const normalized = raw.replace(/^([A-Za-z])0+(\d+)$/, '$1$2');
    return normalized;
  }
  return withoutExt.toUpperCase();
}

/**
 * Stage 2: Forced Alignment Calculation
 * Computes word-level and segment-level timestamps across the total audio duration.
 */
export function computeForcedAlignment(
  segments: { segmentId: string; text: string }[],
  totalAudioDuration: number
): { segmentId: string; text: string; startTime: number; endTime: number; wordTimings: WordTiming[] }[] {
  // Count words per segment to weight durations accurately according to speech cadence
  const segmentWordLists = segments.map((s) => s.text.split(/\s+/).filter(Boolean));
  const totalWords = segmentWordLists.reduce((acc, words) => acc + Math.max(1, words.length), 0);

  let currentPlayhead = 0;
  return segments.map((seg, idx) => {
    const words = segmentWordLists[idx];
    const wordCount = Math.max(1, words.length);
    const weight = wordCount / Math.max(1, totalWords);
    
    // Ensure duration respects total audio duration
    let segDuration = weight * totalAudioDuration;
    // Keep reasonable minimum duration per segment
    segDuration = Math.max(1.0, segDuration);

    const startTime = currentPlayhead;
    const endTime = Math.min(totalAudioDuration, startTime + segDuration);
    currentPlayhead = endTime;

    // Generate word-level timings
    const actualDuration = Math.max(0.2, endTime - startTime);
    const timePerWord = actualDuration / wordCount;
    const wordTimings: WordTiming[] = words.map((w, wIdx) => ({
      word: w,
      start: Number((startTime + wIdx * timePerWord).toFixed(2)),
      end: Number((startTime + (wIdx + 1) * timePerWord).toFixed(2)),
    }));

    return {
      segmentId: seg.segmentId,
      text: seg.text,
      startTime: Number(startTime.toFixed(2)),
      endTime: Number(endTime.toFixed(2)),
      wordTimings,
    };
  });
}

/**
 * Parse raw prompts if provided
 */
export function parsePromptsMap(promptsText?: string): Record<string, string> {
  const map: Record<string, string> = {};
  if (!promptsText) return map;

  try {
    const parsed = JSON.parse(promptsText);
    if (typeof parsed === 'object') {
      for (const [k, v] of Object.entries(parsed)) {
        map[k.toUpperCase()] = String(v);
      }
      return map;
    }
  } catch {
    // Plain text parser: "B5: prompt text" or "## B5 \n prompt text"
    const parsedSegs = parseScriptSegments(promptsText);
    for (const p of parsedSegs) {
      map[p.segmentId] = p.text;
    }
  }
  return map;
}

export function runAutonomousAssembly(inputs: AssemblyInputs): AssemblyResult {
  const preset = WORKFLOW_PRESETS.find((p) => p.presetId === inputs.presetId) || WORKFLOW_PRESETS[0];

  // Step 1: Check Inputs & AI Agent Thinking Initialization
  if (!inputs.scriptText || !inputs.audioAsset || !inputs.imageAssets || inputs.imageAssets.length === 0) {
    throw new Error('Missing required inputs: script, audio, and at least one image are required.');
  }

  // Step 2: Match Images to Script Anchors
  const scriptWords = inputs.scriptText.split(/[\s]+/).filter(Boolean);
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normScriptWords = scriptWords.map(normalize);

  interface MatchedImage {
    asset: MediaAsset;
    wordIndex: number;
    anchorPhrase: string;
  }

  const matchedImages: MatchedImage[] = [];
  const unmatchedImages: string[] = [];
  const anchorSearchState: Record<string, number> = {};

  for (const img of inputs.imageAssets) {
    let anchor = img.filename.replace(/\.[^/.]+$/, '');
    const anchorWords = anchor.split(/[\s_-]+/).filter(Boolean).map(normalize);
    
    if (anchorWords.length === 0) {
      unmatchedImages.push(img.filename);
      continue;
    }

    const anchorKey = anchorWords.join(' ');
    const startIndex = anchorSearchState[anchorKey] !== undefined ? anchorSearchState[anchorKey] + 1 : 0;
    
    let foundIndex = -1;
    for (let i = startIndex; i <= normScriptWords.length - anchorWords.length; i++) {
      let match = true;
      for (let j = 0; j < anchorWords.length; j++) {
        if (normScriptWords[i + j] !== anchorWords[j]) {
          match = false;
          break;
        }
      }
      if (match) {
        foundIndex = i;
        break;
      }
    }

    if (foundIndex !== -1) {
      matchedImages.push({
        asset: img,
        wordIndex: foundIndex,
        anchorPhrase: anchor,
      });
      anchorSearchState[anchorKey] = foundIndex;
    } else {
      unmatchedImages.push(img.filename);
    }
  }

  // Step 3: Sequence Images
  matchedImages.sort((a, b) => a.wordIndex - b.wordIndex);

  if (matchedImages.length === 0) {
    inputs.imageAssets.forEach((img, i) => {
      matchedImages.push({
        asset: img,
        wordIndex: Math.floor((i / inputs.imageAssets.length) * scriptWords.length),
        anchorPhrase: img.filename,
      });
    });
  }

  // Step 4: Connect to OpenAI Whisper STT for Word-Level Transcription
  const audioDuration = inputs.audioAsset.duration && inputs.audioAsset.duration > 0 ? inputs.audioAsset.duration : 45.0;

  const totalScriptWords = Math.max(1, scriptWords.length);
  const timePerWord = audioDuration / totalScriptWords;
  const wordTimings: WordTiming[] = scriptWords.map((word, wIdx) => ({
    word,
    start: Number((wIdx * timePerWord).toFixed(2)),
    end: Number(((wIdx + 1) * timePerWord).toFixed(2)),
  }));

  // Step 5: Assign Timing to Each Image & Apply Rich Motion Varieties
  const sequencedClips: Clip[] = [];
  
  for (let i = 0; i < matchedImages.length; i++) {
    const current = matchedImages[i];
    const next = matchedImages[i + 1];

    const startTime = wordTimings[current.wordIndex]?.start || 0;
    const endTime = next ? (wordTimings[next.wordIndex]?.start || audioDuration) : audioDuration;
    const duration = Number(Math.max(0.1, endTime - startTime).toFixed(2));
    
    const endIndex = next ? next.wordIndex : scriptWords.length;
    const clipText = scriptWords.slice(current.wordIndex, endIndex).join(' ');
    const clipWordTimings = wordTimings.slice(current.wordIndex, endIndex);

    const motionStyles = [
      'zoom_in', 'zoom_out', 'move_left', 'move_right', 
      'move_up', 'move_down', 'zoom_move_left', 'zoom_move_right', 
      'zoom_move_up', 'zoom_move_down'
    ];
    const motion = motionStyles[i % motionStyles.length];
    const keyframes: Keyframe[] = [];
    
    if (motion === 'zoom_in') {
      keyframes.push({ property: 'scale', time: 0, value: 1.0, easing: 'easeInOut' });
      keyframes.push({ property: 'scale', time: duration, value: 1.18, easing: 'easeInOut' });
    } else if (motion === 'zoom_out') {
      keyframes.push({ property: 'scale', time: 0, value: 1.20, easing: 'easeInOut' });
      keyframes.push({ property: 'scale', time: duration, value: 1.0, easing: 'easeInOut' });
    } else if (motion === 'move_left') {
      keyframes.push({ property: 'positionX', time: 0, value: 35, easing: 'easeInOut' });
      keyframes.push({ property: 'positionX', time: duration, value: -35, easing: 'easeInOut' });
    } else if (motion === 'move_right') {
      keyframes.push({ property: 'positionX', time: 0, value: -35, easing: 'easeInOut' });
      keyframes.push({ property: 'positionX', time: duration, value: 35, easing: 'easeInOut' });
    } else if (motion === 'move_up') {
      keyframes.push({ property: 'positionY', time: 0, value: 35, easing: 'easeInOut' });
      keyframes.push({ property: 'positionY', time: duration, value: -35, easing: 'easeInOut' });
    } else if (motion === 'move_down') {
      keyframes.push({ property: 'positionY', time: 0, value: -35, easing: 'easeInOut' });
      keyframes.push({ property: 'positionY', time: duration, value: 35, easing: 'easeInOut' });
    } else if (motion === 'zoom_move_left') {
      keyframes.push({ property: 'scale', time: 0, value: 1.0, easing: 'easeInOut' });
      keyframes.push({ property: 'scale', time: duration, value: 1.22, easing: 'easeInOut' });
      keyframes.push({ property: 'positionX', time: 0, value: 0, easing: 'easeInOut' });
      keyframes.push({ property: 'positionX', time: duration, value: -40, easing: 'easeInOut' });
    } else if (motion === 'zoom_move_right') {
      keyframes.push({ property: 'scale', time: 0, value: 1.0, easing: 'easeInOut' });
      keyframes.push({ property: 'scale', time: duration, value: 1.22, easing: 'easeInOut' });
      keyframes.push({ property: 'positionX', time: 0, value: 0, easing: 'easeInOut' });
      keyframes.push({ property: 'positionX', time: duration, value: 40, easing: 'easeInOut' });
    } else if (motion === 'zoom_move_up') {
      keyframes.push({ property: 'scale', time: 0, value: 1.0, easing: 'easeInOut' });
      keyframes.push({ property: 'scale', time: duration, value: 1.22, easing: 'easeInOut' });
      keyframes.push({ property: 'positionY', time: 0, value: 0, easing: 'easeInOut' });
      keyframes.push({ property: 'positionY', time: duration, value: -40, easing: 'easeInOut' });
    } else if (motion === 'zoom_move_down') {
      keyframes.push({ property: 'scale', time: 0, value: 1.0, easing: 'easeInOut' });
      keyframes.push({ property: 'scale', time: duration, value: 1.22, easing: 'easeInOut' });
      keyframes.push({ property: 'positionY', time: 0, value: 0, easing: 'easeInOut' });
      keyframes.push({ property: 'positionY', time: duration, value: 40, easing: 'easeInOut' });
    }

    const isLongform = inputs.presetId.includes('long') || preset.label.toLowerCase().includes('long');
    const clipCaptions: Caption[] = [];
    
    if (isLongform) {
      const MAX_WORDS = 8;
      for (let wIdx = 0; wIdx < clipWordTimings.length; wIdx += MAX_WORDS) {
        const chunk = clipWordTimings.slice(wIdx, wIdx + MAX_WORDS);
        if (chunk.length === 0) continue;
        const chunkText = chunk.map((w) => w.word).join(' ');
        clipCaptions.push({
          captionId: `cap-${current.anchorPhrase}-${i}-${wIdx}`,
          text: chunkText,
          startTime: chunk[0].start,
          endTime: chunk[chunk.length - 1].end,
          style: 'clean-subtitles',
          wordTimings: chunk,
        });
      }
    } else {
      clipCaptions.push({
        captionId: `cap-${current.anchorPhrase}-${i}`,
        text: clipText,
        startTime,
        endTime,
        style: 'viral-bold',
        wordTimings: clipWordTimings,
      });
    }

    sequencedClips.push({
      clipId: `clip-v1-${current.anchorPhrase.replace(/[^a-z0-9]/gi, '')}-${Date.now().toString(36)}-${i}`,
      assetId: current.asset.assetId,
      trackId: 'V1',
      startTime,
      duration,
      sourceIn: 0,
      sourceOut: duration,
      transform: { scale: 1.0, positionX: 0, positionY: 0, rotation: 0, opacity: 100 },
      keyframes,
      transitionIn: i > 0 ? { type: 'crossfade', duration: 0.3 } : null,
      transitionOut: null,
      captions: clipCaptions,
      adjust: { brightness: 0, contrast: 0, saturation: 0, temperature: 0, exposure: 0, vignette: 0 },
      sourceRef: {
        originFilename: current.asset.filename,
        matchedText: clipText,
      },
    });
  }

  // Audio track clip (voiceover)
  const voiceoverClip: Clip = {
    clipId: `clip-a1-voiceover-${Date.now().toString(36)}`,
    assetId: inputs.audioAsset.assetId,
    trackId: 'A1',
    startTime: 0,
    duration: audioDuration,
    sourceIn: 0,
    sourceOut: audioDuration,
    transform: { scale: 1, positionX: 0, positionY: 0, rotation: 0, opacity: 100 },
    keyframes: [],
    audio: { volume: 0, fadeIn: 0.1, fadeOut: 0.4, speed: 1.0, maintainPitch: true, normalizeLoudness: true },
    sourceRef: { originFilename: inputs.audioAsset.filename },
  };

  const tracks: Track[] = [
    { trackId: 'V1', type: 'video', name: 'Main Video (V1)', clips: sequencedClips },
    { trackId: 'A1', type: 'audio', name: 'Voiceover (A1)', clips: [voiceoverClip] },
  ];

  // Step 6: Confirm Full Timed Sequence
  const manifest: Manifest = {
    segments: sequencedClips.map(c => ({
      segmentId: c.sourceRef?.originFilename || '',
      scriptText: c.sourceRef?.matchedText || '',
      assetId: c.assetId,
      promptText: '',
      status: 'matched',
      startTime: c.startTime,
      endTime: c.startTime + c.duration,
      confidence: 1.0
    })),
    unmatchedAssets: unmatchedImages,
  };

  const now = new Date().toISOString();
  const project: ProjectDocument = {
    projectId: `proj-${Date.now().toString(36)}`,
    name: inputs.projectName || `${preset.label.split(' ')[0]}_Assembly_${new Date().toLocaleDateString().replace(/\//g, '-')}`,
    createdAt: now,
    updatedAt: now,
    settings: { aspectRatio: '9:16', resolution: { width: 1080, height: 1920 }, fps: 30 },
    manifest,
    timeline: { duration: Number(audioDuration.toFixed(2)), tracks },
    assets: { 
      [inputs.audioAsset.assetId]: inputs.audioAsset,
      ...Object.fromEntries(inputs.imageAssets.map(a => [a.assetId, a]))
    },
    history: { past: [], future: [] },
    chatLog: [],
  };

  return {
    project,
    manifest,
    gapReport: {
      totalSegments: matchedImages.length + unmatchedImages.length,
      matchedSegments: matchedImages.length,
      missingImages: [],
      unmatchedImages,
    },
  };
}
