import { EditorSkill } from '../../types/skills';

const CORE_MATCHING_WORKFLOW = [
  {
    id: 'step-1',
    stepNumber: 1,
    title: 'Check Inputs & AI Agent Thinking Initialization',
    type: 'fixed' as const,
    instruction: 'Confirm script (text), images (anchor phrase filenames), and audio (voiceover) are all present. AI Agent enters step-by-step thinking & validation mode.',
  },
  {
    id: 'step-2',
    stepNumber: 2,
    title: 'Connect to OpenAI Whisper STT for Word-Level Transcription',
    type: 'fixed' as const,
    instruction: 'Run voiceover audio through OpenAI Whisper STT (Large-v3 engine) to extract word-level speech timestamps (exact start/end time of every spoken word).',
  },
  {
    id: 'step-3',
    stepNumber: 3,
    title: 'Match Images to Script Anchors',
    type: 'fixed' as const,
    instruction: 'Extract anchor phrases from image filenames (~first 5 words of sentence). Search script text sequentially for exact/near-exact matches.',
  },
  {
    id: 'step-4',
    stepNumber: 4,
    title: 'Sequence Images',
    type: 'fixed' as const,
    instruction: 'Order image clips according to the exact sequence their matched anchor phrases appear in the script text from start to finish.',
  },
  {
    id: 'step-5',
    stepNumber: 5,
    title: 'Assign Timing to Each Image',
    type: 'fixed' as const,
    instruction: 'Set image start time to Whisper audio timestamp where anchor phrase begins. Set end time to timestamp where next anchor phrase starts.',
  },
  {
    id: 'step-6',
    stepNumber: 6,
    title: 'Confirm Full Timed Sequence',
    type: 'fixed' as const,
    instruction: 'Verify every image has a precise start time, end time, and continuous timeline position derived from script text and Whisper speech audio.',
  },
];

const CORE_MATCHING_RULES_TEXT = `# Silent Strategist Skill — Core Matching Workflow

This describes the foundation stage of the Silent Strategist Skill: turning a script, a set of images, and a voiceover audio file into a fully sequenced and timed video with OpenAI Whisper STT, AI thinking reasoning, motion varieties, and tailored subtitle formatting.

## Step 1: Check Inputs & AI Agent Thinking Process
Confirm that all three required inputs are received: script text, image files, and voiceover audio track. The AI Agent enters a structured thinking state (reasoning through input validation, acoustic waveform analysis, and sequence alignment before execution).

## Step 2: OpenAI Whisper STT Word-Level Transcription
Run the voiceover audio through OpenAI Whisper STT (Large-v3 / API) configured for forced alignment to return word-level timestamps (exact start and end time of every individual spoken word).

## Step 3: Match Images to Script Anchor Phrases
Each image's filename is a short anchor phrase (typically the first ~5 words of a sentence in the script). Search the script text to locate each image's anchor phrase sequentially. The remaining words in a sentence belong to that same image until the next anchor phrase begins.

## Step 4: Sequence the Images
Order images in the exact order their anchor phrases appear in the script from start to finish.

## Step 5: Assign Timing to Each Image using Whisper
Set each image's start time to the Whisper timestamp where its anchor phrase begins being spoken. Set end time to where the next anchor phrase starts.

## Step 6: Confirm Full Timed Sequence
Ensure zero gaps and continuous timeline coverage from start to finish.

## Step 7: Apply Rich Motion Varieties
Cycle clips through diverse motion varieties:
1. **Zoom In**: Scale 1.00 → 1.18
2. **Zoom Out**: Scale 1.20 → 1.00
3. **Move Left**: Pan X +35 → -35
4. **Move Right**: Pan X -35 → +35
5. **Move Up**: Tilt Y +35 → -35
6. **Move Down**: Tilt Y -35 → +35
7. **Zoom & Move Left**: Scale 1.00 → 1.22 + Pan X 0 → -40
8. **Zoom & Move Right**: Scale 1.00 → 1.22 + Pan X 0 → +40
9. **Zoom & Move Up**: Scale 1.00 → 1.22 + Tilt Y 0 → -40
10. **Zoom & Move Down**: Scale 1.00 → 1.22 + Tilt Y 0 → +40`;

export const DEFAULT_EDITOR_SKILLS: EditorSkill[] = [
  {
    id: 'skill-strategist-longform',
    name: 'Strategist Longform',
    activity: 'Core script-image-audio matching workflow & 16:9 widescreen longform video creation',
    description: 'Sequences images to voiceover audio using Whisper STT & anchor phrases for 16:9 longform videos with motion varieties & max 8-word subtitles.',
    category: 'longform',
    enabled: true,
    isBuiltIn: true,
    updatedAt: new Date().toISOString(),
    requiredInputs: ['script', 'images', 'audio'],
    workflow: [
      ...CORE_MATCHING_WORKFLOW,
      {
        id: 'step-7',
        stepNumber: 7,
        title: 'Apply 16:9 Longform Motion Varieties, Crossfades & Max 8-Word Subtitles',
        type: 'choice' as const,
        instruction: 'Apply 16:9 framing, cycle 10 motion varieties (Zoom In, Zoom Out, Move L/R/U/D, Zoom & Move), 0.5s crossfades, and cap subtitles at 8 words max per card (or fewer based on audio beats).',
        choiceOptions: ['motion_varieties_cycle', 'crossfade_transitions', 'max_8_words_subtitles'],
        decisionRule: 'Maintain clean, cinematic 16:9 documentary pacing with max 8 words per caption card.',
      },
    ],
    editingRules: `${CORE_MATCHING_RULES_TEXT}

## Longform 16:9 Finishing Stage:
1. **Aspect Ratio**: 16:9 Landscape (1920×1080).
2. **Motion Varieties**: Rotate across 10 motion patterns (Zoom In, Zoom Out, Move Left/Right/Up/Down, Zoom + Move combinations).
3. **Transitions**: 0.5s crossfades or dips-to-black.
4. **Subtitles**: Capped at **maximum 8 words appearing at a time** (can be fewer based on natural speech beats and pauses), positioned cleanly in the lower third.`,
    rules: `${CORE_MATCHING_RULES_TEXT}

## Longform 16:9 Finishing Stage:
- Format: 16:9 Widescreen (1920x1080)
- STT Engine: OpenAI Whisper word-level alignment
- AI Thinking: Step-by-step reasoning stream
- Motion: 10 motion varieties (Zoom In, Zoom Out, Move L/R/U/D, Zoom & Move)
- Subtitles: Max 8 words per card (or fewer based on beats)`,
    examples: [
      'Create a 16:9 longform documentary video from script, images and voiceover audio using Whisper',
      'Run the Strategist Longform workflow with 8-word max captions and motion varieties',
      'Align image clips to audio timestamps for longform video with Whisper',
    ],
  },
  {
    id: 'skill-strategist-shortform',
    name: 'Strategist Shortform',
    activity: 'Core script-image-audio matching workflow & 9:16 vertical viral shortform video creation',
    description: 'Sequences images to voiceover audio using Whisper STT & anchor phrases for 9:16 shortform videos with punch zooms & word-by-word kinetic captions.',
    category: 'shortform',
    enabled: true,
    isBuiltIn: true,
    updatedAt: new Date().toISOString(),
    requiredInputs: ['script', 'images', 'audio'],
    workflow: [
      ...CORE_MATCHING_WORKFLOW,
      {
        id: 'step-7',
        stepNumber: 7,
        title: 'Apply 9:16 Shortform Motion Varieties, Whip Cuts & Kinetic Captions',
        type: 'choice' as const,
        instruction: 'Apply 9:16 vertical framing, cycle motion varieties (Zoom In, Zoom Out, Move L/R/U/D, Zoom & Move), fast whip cuts, and word-by-word kinetic karaoke captions.',
        choiceOptions: ['motion_varieties_cycle', 'whip_cut_transition', 'word_by_word_kinetic_captions'],
        decisionRule: 'Maintain high-retention 9:16 vertical pacing with word-by-word kinetic karaoke captions.',
      },
    ],
    editingRules: `${CORE_MATCHING_RULES_TEXT}

## Shortform 9:16 Finishing Stage:
1. **Aspect Ratio**: 9:16 Vertical (1080×1920).
2. **Motion Varieties**: Rotate across 10 motion patterns (Zoom In, Zoom Out, Move Left/Right/Up/Down, Zoom + Move combinations).
3. **Transitions**: Fast 0.2s whip zooms or instant hard cuts.
4. **Subtitles**: **Word-by-word kinetic karaoke captions** anchored in the middle mobile safe zone.`,
    rules: `${CORE_MATCHING_RULES_TEXT}

## Shortform 9:16 Finishing Stage:
- Format: 9:16 Vertical (1080x1920)
- STT Engine: OpenAI Whisper word-level alignment
- AI Thinking: Step-by-step reasoning stream
- Motion: 10 motion varieties (Zoom In, Zoom Out, Move L/R/U/D, Zoom & Move)
- Subtitles: Word-by-word kinetic karaoke captions in mobile safe zone`,
    examples: [
      'Create a 9:16 shortform viral video from script, images and voiceover audio with Whisper',
      'Run the Strategist Shortform workflow with word-by-word kinetic captions',
      'Align image clips to audio timestamps for shortform TikTok/Reels with Whisper',
    ],
  },
  {
    id: 'skill-pacing-trimming',
    name: 'Viral Pacing & Hook Retention',
    activity: 'Pacing, hook trimming, silence removal, and cut frequency',
    description: 'Enforces rapid hook retention, tight jump-cut pacing, and micro-trimming of breath pauses for high watch-time.',
    category: 'pacing',
    enabled: true,
    isBuiltIn: true,
    updatedAt: new Date().toISOString(),
    requiredInputs: ['video', 'audio'],
    workflow: [
      {
        id: 'step-1',
        stepNumber: 1,
        title: 'Hook Optimization (First 3s)',
        type: 'fixed',
        instruction: 'Cut initial shot durations to 0.8s–1.4s maximum. Apply 1.15x punch zoom on first emphasized word.',
      },
      {
        id: 'step-2',
        stepNumber: 2,
        title: 'Dialogue Silence Trimming',
        type: 'choice',
        instruction: 'Trim dead air over 0.35s on A-Roll voice track.',
        choiceOptions: ['ripple_cut', 'l_cut', 'j_cut'],
        decisionRule: 'Choose L-cut if speech continues into B-Roll, otherwise snap ripple cut without gaps.',
      },
    ],
    editingRules: `# Pacing & Trimming Execution Rules
1. Keep individual shot durations between 0.8s and 1.4s during the first 3s hook.
2. Cut dead air over 0.35s on voice track.`,
    rules: `# Pacing & Trimming Execution Rules
1. Keep individual shot durations between 0.8s and 1.4s during the first 3s hook.
2. Cut dead air over 0.35s on voice track.`,
    examples: ['Make pacing punchier', 'Trim silence in audio'],
  },
  {
    id: 'skill-kinetic-captions',
    name: 'Kinetic Subtitles & Typography',
    activity: 'Word-timed kinetic captions, karaoke highlighting, and text positioning',
    description: 'Generates mobile-optimized captions with 3-4 words per card, active word glow, and safe zone alignment.',
    category: 'captions',
    enabled: true,
    isBuiltIn: true,
    updatedAt: new Date().toISOString(),
    requiredInputs: ['audio', 'video'],
    workflow: [
      {
        id: 'step-1',
        stepNumber: 1,
        title: 'Word Density & Alignment',
        type: 'fixed',
        instruction: 'Limit caption cards to 3-4 words. Position Y at 64% from top (mobile safe zone).',
      },
    ],
    editingRules: `# Kinetic Captions Execution Rules
1. Maximum 3 to 4 words per caption card.
2. Place at 64% vertical height in safe zone.`,
    rules: `# Kinetic Captions Execution Rules
1. Maximum 3 to 4 words per caption card.
2. Place at 64% vertical height in safe zone.`,
    examples: ['Add kinetic subtitles', 'Highlight active spoken words'],
  },
];

