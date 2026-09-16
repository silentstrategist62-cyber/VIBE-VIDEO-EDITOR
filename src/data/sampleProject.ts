import { ProjectDocument, MediaAsset } from '../types/project';
import { runAutonomousAssembly } from '../services/autonomousAssembler';

// Generate lightweight visual SVG data URLs for sample images
function createSampleImageSvg(id: string, title: string, bgGradient: string, accentColor: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        ${bgGradient}
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="45%" r="70%">
        <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.45"/>
        <stop offset="50%" stop-color="${accentColor}" stop-opacity="0.15"/>
        <stop offset="100%" stop-color="#050814" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="cardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="rgba(15, 23, 42, 0.75)"/>
        <stop offset="100%" stop-color="rgba(2, 6, 23, 0.95)"/>
      </linearGradient>
    </defs>

    <!-- Full-bleed Rich Backdrop -->
    <rect width="1080" height="1920" fill="url(#bg)"/>
    <rect width="1080" height="1920" fill="url(#glow)"/>

    <!-- Ambient Lighting Elements -->
    <circle cx="280" cy="500" r="360" fill="${accentColor}" fill-opacity="0.12" filter="blur(60px)"/>
    <circle cx="820" cy="1100" r="420" fill="#38BDF8" fill-opacity="0.08" filter="blur(80px)"/>

    <!-- Top Cinematic Header -->
    <text x="540" y="240" fill="#94A3B8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="600" text-anchor="middle" letter-spacing="6">CHAPTER ${id}</text>
    <line x1="440" y1="280" x2="640" y2="280" stroke="${accentColor}" stroke-width="3" stroke-linecap="round"/>

    <!-- Center Cinematic Focal Motif -->
    <circle cx="540" cy="850" r="260" fill="none" stroke="${accentColor}" stroke-width="2" stroke-opacity="0.3"/>
    <circle cx="540" cy="850" r="190" fill="rgba(15, 23, 42, 0.6)" stroke="rgba(255, 255, 255, 0.15)" stroke-width="1.5"/>
    <text x="540" y="880" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="110" font-weight="900" text-anchor="middle" letter-spacing="2">${id}</text>

    <!-- Lower Headline Overlay Card -->
    <rect x="80" y="1380" width="920" height="320" rx="24" fill="url(#cardGrad)" stroke="rgba(255, 255, 255, 0.14)" stroke-width="2"/>
    <text x="140" y="1460" fill="${accentColor}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="700" letter-spacing="4">NARRATIVE VISUAL • SCENE ${id}</text>
    <text x="140" y="1535" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="46" font-weight="800">${title.replace(/&/g, '&amp;')}</text>
    <text x="140" y="1610" fill="#94A3B8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="26">9:16 Vertical Delivery • Ultra High Resolution</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Precomputed waveform normalized peaks (80 points)
const SAMPLE_WAVEFORM: number[] = [
  0.15, 0.35, 0.65, 0.82, 0.95, 0.74, 0.58, 0.42, 0.68, 0.88,
  0.72, 0.51, 0.38, 0.22, 0.48, 0.76, 0.89, 0.91, 0.64, 0.52,
  0.33, 0.62, 0.85, 0.79, 0.68, 0.54, 0.41, 0.71, 0.92, 0.84,
  0.69, 0.45, 0.25, 0.55, 0.83, 0.96, 0.78, 0.61, 0.39, 0.29,
  0.58, 0.77, 0.86, 0.92, 0.65, 0.48, 0.32, 0.64, 0.81, 0.73,
  0.59, 0.42, 0.28, 0.53, 0.79, 0.88, 0.94, 0.71, 0.56, 0.38,
  0.27, 0.61, 0.84, 0.76, 0.63, 0.49, 0.35, 0.68, 0.89, 0.82,
  0.66, 0.43, 0.26, 0.52, 0.78, 0.91, 0.74, 0.57, 0.39, 0.18
];

// Generate an offline, lightweight ambient WAV audio data URL to guarantee 100% reliable local playback
function createSampleAudioWavUrl(durationSeconds = 12): string {
  const sampleRate = 8000;
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const buffer = new Uint8Array(44 + numSamples);

  // RIFF header
  buffer.set([0x52, 0x49, 0x46, 0x46], 0); // "RIFF"
  const fileSize = 36 + numSamples;
  buffer[4] = fileSize & 0xff;
  buffer[5] = (fileSize >> 8) & 0xff;
  buffer[6] = (fileSize >> 16) & 0xff;
  buffer[7] = (fileSize >> 24) & 0xff;
  buffer.set([0x57, 0x41, 0x56, 0x45], 8); // "WAVE"

  // fmt chunk
  buffer.set([0x66, 0x6d, 0x74, 0x20], 12); // "fmt "
  buffer.set([16, 0, 0, 0], 16); // Subchunk1Size (16 for PCM)
  buffer.set([1, 0], 20); // AudioFormat (1 = PCM)
  buffer.set([1, 0], 22); // NumChannels (1 = Mono)
  buffer[24] = sampleRate & 0xff;
  buffer[25] = (sampleRate >> 8) & 0xff;
  buffer[26] = (sampleRate >> 16) & 0xff;
  buffer[27] = (sampleRate >> 24) & 0xff;
  buffer[28] = sampleRate & 0xff;
  buffer[29] = (sampleRate >> 8) & 0xff;
  buffer[30] = (sampleRate >> 16) & 0xff;
  buffer[31] = (sampleRate >> 24) & 0xff;
  buffer.set([1, 0], 32); // BlockAlign (1 byte)
  buffer.set([8, 0], 34); // BitsPerSample (8 bits)

  // data chunk
  buffer.set([0x64, 0x61, 0x74, 0x61], 36); // "data"
  buffer[40] = numSamples & 0xff;
  buffer[41] = (numSamples >> 8) & 0xff;
  buffer[42] = (numSamples >> 16) & 0xff;
  buffer[43] = (numSamples >> 24) & 0xff;

  // Generate soothing ambient synth chord (220Hz / 261Hz / 330Hz)
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const wave1 = Math.sin(2 * Math.PI * 220 * t);
    const wave2 = Math.sin(2 * Math.PI * 261.63 * t) * 0.7;
    const wave3 = Math.sin(2 * Math.PI * 329.63 * t) * 0.5;
    const env = 0.5 + 0.3 * Math.sin(2 * Math.PI * 0.2 * t);
    const mixed = ((wave1 + wave2 + wave3) / 2.2) * env * 0.35;
    buffer[44 + i] = Math.floor(128 + mixed * 127);
  }

  let binary = '';
  const len = buffer.byteLength;
  const chunk = 8192;
  for (let i = 0; i < len; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(buffer.subarray(i, Math.min(i + chunk, len))));
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

export const SAMPLE_AUDIO_ASSET: MediaAsset = {
  assetId: 'asset-audio-master',
  type: 'audio',
  filename: 'Generated Audio September 06, 2026 - 6.10PM (1).wav',
  url: createSampleAudioWavUrl(16),
  duration: 38.4,
  waveformCache: SAMPLE_WAVEFORM,
};

export const SAMPLE_IMAGE_ASSETS: MediaAsset[] = [
  {
    assetId: 'asset-img-b1',
    type: 'image',
    filename: 'B1.jpg',
    url: createSampleImageSvg('B1', 'The Hidden Architecture of Habit', '<stop offset="0%" stop-color="#0f172a"/><stop offset="100%" stop-color="#1e1b4b"/>', '#818CF8'),
    width: 1080,
    height: 1920,
  },
  {
    assetId: 'asset-img-b2',
    type: 'image',
    filename: 'B2-childhood-memory.jpg',
    url: createSampleImageSvg('B2', 'Trauma Begun From Childhood', '<stop offset="0%" stop-color="#18181b"/><stop offset="100%" stop-color="#312e81"/>', '#A78BFA'),
    width: 1080,
    height: 1920,
  },
  {
    assetId: 'asset-img-b3',
    type: 'image',
    filename: 'B3.jpg',
    url: createSampleImageSvg('B3', 'The Loop of Repeating Patterns', '<stop offset="0%" stop-color="#0f172a"/><stop offset="100%" stop-color="#064e3b"/>', '#34D399'),
    width: 1080,
    height: 1920,
  },
  {
    assetId: 'asset-img-b4',
    type: 'image',
    filename: 'B4-sudden-realization.jpg',
    url: createSampleImageSvg('B4', 'The Moment of Recognition', '<stop offset="0%" stop-color="#172554"/><stop offset="100%" stop-color="#0f172a"/>', '#38BDF8'),
    width: 1080,
    height: 1920,
  },
  {
    assetId: 'asset-img-b5',
    type: 'image',
    filename: 'B5.jpg',
    url: createSampleImageSvg('B5', 'A Dim Childhood Bedroom', '<stop offset="0%" stop-color="#262626"/><stop offset="100%" stop-color="#7c2d12"/>', '#FB923C'),
    width: 1080,
    height: 1920,
  },
  {
    assetId: 'asset-img-b6',
    type: 'image',
    filename: 'B6-breakthrough.png',
    url: createSampleImageSvg('B6', 'Breaking Through the Barrier', '<stop offset="0%" stop-color="#18181b"/><stop offset="100%" stop-color="#701a75"/>', '#F472B6'),
    width: 1080,
    height: 1920,
  },
  {
    assetId: 'asset-img-b7',
    type: 'image',
    filename: 'B7.jpg',
    url: createSampleImageSvg('B7', 'The Modern Synthesis', '<stop offset="0%" stop-color="#022c22"/><stop offset="100%" stop-color="#0f172a"/>', '#4ADE80'),
    width: 1080,
    height: 1920,
  },
  {
    assetId: 'asset-img-b8',
    type: 'image',
    filename: 'B8-actionable-framework.jpg',
    url: createSampleImageSvg('B8', 'Actionable Framework & Outro', '<stop offset="0%" stop-color="#0f172a"/><stop offset="100%" stop-color="#1e293b"/>', '#FBBF24'),
    width: 1080,
    height: 1920,
  },
];

export const SAMPLE_SCRIPT_TEXT = `## B1
The human mind operates on subconscious loops that dictate our everyday reactions before we even formulate a conscious thought.

## B2
Trauma begun from childhood casts a long shadow, silently rewiring neural pathways and perception.

## B3
We find ourselves trapped in recurring cycles, mistaking conditioning for authentic destiny.

## B4
Until a sudden realization shatters the illusion, revealing that the cage door was unlocked the entire time.

## B5
In a dim childhood bedroom with warm nostalgic light filtering through cracked blinds, the truth becomes clear.

## B6
Breaking through the barrier demands radical editorial courage and intentional cognitive reframing.

## B7
When modern neuroscience merges with timeless philosophical stoicism, clarity replaces paralysis.

## B8
This is the actionable blueprint: observe the impulse, dismantle the reflex, and architect your reality.`;

export const SAMPLE_PROMPTS_TEXT = `## B1
Cinematic high-angle shot of abstract neural networks glowing in deep indigo with intricate geometric light patterns, 8k, hyper-detailed, 9:16 portrait.

## B2
Moody atmospheric visual of an antique doorway partially open into a mysterious childhood hallway, dusty light beams, nostalgic tone, 9:16 portrait.

## B3
Surreal endless staircase loop in architectural brutalist style, emerald green ambient glow, cinematic depth of field, 9:16 portrait.

## B4
An expressive silhouette of a person standing under a piercing single spotlight against obsidian blackness, cyan rim lighting, 9:16 portrait.

## B5
A dim childhood bedroom, warm nostalgic golden hour light streaming through wooden blinds, vintage tape recorder on desk, 9:16 portrait.

## B6
Dramatic shattered glass prism splitting pure white light into vivid magenta and violet spectra, high speed shutter freeze, 9:16 portrait.

## B7
Futuristic minimalist laboratory with marble surfaces and holographic floating formulas, clean green bio-luminescence, 9:16 portrait.

## B8
Golden dawn breaking over a vast mountain peak summit, high contrast silhouette looking toward the horizon, inspirational aesthetic, 9:16 portrait.`;

/**
 * Creates the initial loaded project matching the master specification
 */
export function createInitialDemoProject(): ProjectDocument {
  const result = runAutonomousAssembly({
    presetId: 'strategist-longform',
    projectName: 'Kitchen_Final',
    scriptText: SAMPLE_SCRIPT_TEXT,
    audioAsset: SAMPLE_AUDIO_ASSET,
    imageAssets: SAMPLE_IMAGE_ASSETS,
    promptsText: SAMPLE_PROMPTS_TEXT,
  });

  return result.project;
}
