import { ProjectDocument, WorkflowPreset } from '../types/project';

export interface AIVideoTemplate {
  id: string;
  title: string;
  tagline: string;
  category: 'viral' | 'story' | 'educational' | 'commercial';
  badge: string;
  description: string;
  pacing: string;
  avgDuration: number; // seconds
  sampleTopic: string;
  suggestedPrompt: string;
  captionStyle: 'viral-bold' | 'strategist-default' | 'karaoke-glow' | 'clean-subtitles';
  transitionStyle: string;
  segments: {
    text: string;
    duration: number;
    visualStyle: string;
    graphicOverlay?: string;
  }[];
}

export const OPENREELS_AI_TEMPLATES: AIVideoTemplate[] = [
  {
    id: 'curiosity-hook',
    title: 'Curiosity Hook ("Did You Know?")',
    tagline: 'High-retention psychological hook opening that stops scrollers instantly',
    category: 'viral',
    badge: '92% Retention',
    description: 'Designed around curiosity gaps and visual pattern interrupts. Fast-paced 2.5s scene cuts with bold kinetic captions and sound accents.',
    pacing: 'Fast (2.2s - 2.8s cuts)',
    avgDuration: 24,
    sampleTopic: 'The Hidden Ocean Beneath Earth’s Crust',
    suggestedPrompt: 'Generate a high-energy short about the subterranean Ringwoodite water reservoir 400 miles deep inside Earth.',
    captionStyle: 'viral-bold',
    transitionStyle: 'punchZoom',
    segments: [
      {
        text: 'Scientists just discovered something terrifying under our feet.',
        duration: 2.8,
        visualStyle: 'Deep geological earth core cross-section with glowing mineral strata',
        graphicOverlay: '⚠️ BREAKING DISCOVERY',
      },
      {
        text: 'Four hundred miles beneath the surface sits a subterranean ocean.',
        duration: 2.6,
        visualStyle: 'Vast underground sapphire blue crystalline reservoir cavern',
      },
      {
        text: 'It contains THREE TIMES more water than all surface oceans combined.',
        duration: 3.0,
        visualStyle: 'Massive scale comparison with Earth ocean volume 3D holographic wireframe',
        graphicOverlay: '3X MORE WATER 🌊',
      },
      {
        text: 'Trapped inside a rare blue rock called Ringwoodite.',
        duration: 2.8,
        visualStyle: 'Microscopic crystalline lattice glowing with trapped moisture particles',
      },
      {
        text: 'If this water ever breached upward, it would cover the entire planet.',
        duration: 3.2,
        visualStyle: 'Cinematic rising water currents engulfing continental horizons',
        graphicOverlay: '🔥 WAIT FOR THIS',
      },
      {
        text: 'Double tap if you never knew this existed!',
        duration: 2.4,
        visualStyle: 'Earth planetary view with deep blue mantle luminescence',
        graphicOverlay: '🔔 SUBSCRIBE',
      },
    ],
  },
  {
    id: 'top-5-countdown',
    title: 'Top 5 Viral Listicle Countdown',
    tagline: 'Step-by-step numbered ranking keeping viewers glued until #1',
    category: 'viral',
    badge: 'Viral Listicle',
    description: 'Proven countdown pacing with numbered graphic badges, rising tension music, and snappy wipe transitions on every ranking beat.',
    pacing: 'Medium-Fast (3.0s cuts)',
    avgDuration: 30,
    sampleTopic: 'Top 5 Deadliest Planets in the Known Universe',
    suggestedPrompt: 'Create a Top 5 countdown video ranking the most extreme exoplanets where it rains glass sideways.',
    captionStyle: 'viral-bold',
    transitionStyle: 'slideLeft',
    segments: [
      {
        text: 'Top 5 most extreme alien planets you won’t survive 1 second on.',
        duration: 3.2,
        visualStyle: 'Epic deep space observatory view with alien star cluster',
        graphicOverlay: 'TOP 5 RANKING 🚀',
      },
      {
        text: 'Number 5: HD 189733b, where it literally rains molten glass sideways at Mach 7.',
        duration: 3.5,
        visualStyle: 'Cobalt blue gas giant lashed by howling horizontal glass storms',
        graphicOverlay: 'RANK #5 💎',
      },
      {
        text: 'Number 4: TrES-2b, the pitch-black planet that absorbs 99% of all light.',
        duration: 3.2,
        visualStyle: 'Obsidian coal-black planet faintly glowing with molten red lava streaks',
        graphicOverlay: 'RANK #4 🌑',
      },
      {
        text: 'Number 3: 55 Cancri e, an entire world composed of solid diamond.',
        duration: 3.2,
        visualStyle: 'Shimmering diamond carbon crust reflecting blinding supernova glare',
        graphicOverlay: 'RANK #3 💎',
      },
      {
        text: 'Number 2: WASP-76b, where temperatures vaporize iron and rain it back as liquid metal.',
        duration: 3.4,
        visualStyle: 'Tidally locked inferno with burning metallic rain squalls',
        graphicOverlay: 'RANK #2 ⚡',
      },
      {
        text: 'And Number 1 will shock you... check the pinned comment!',
        duration: 2.8,
        visualStyle: 'Supermassive cosmic anomaly swirling on horizon',
        graphicOverlay: 'RANK #1 👑',
      },
    ],
  },
  {
    id: 'reddit-story',
    title: 'Storytelling & Mystery Tales',
    tagline: 'Atmospheric narrative arc with immersive pacing and noir grading',
    category: 'story',
    badge: 'Narrative Arc',
    description: 'Subtle slow Ken Burns zooms, deep ambient pads, and clean minimalist subtitles designed for long watch time and high comment engagement.',
    pacing: 'Cinematic Paced (4.0s cuts)',
    avgDuration: 28,
    sampleTopic: 'The Unsolved Mystery of the Lighthouse Keepers',
    suggestedPrompt: 'Generate a suspenseful storytelling video about the three Flannan Isle lighthouse keepers who disappeared in 1900 without a trace.',
    captionStyle: 'clean-subtitles',
    transitionStyle: 'crossfade',
    segments: [
      {
        text: 'On December 26, 1900, a supply ship arrived at an isolated Scottish lighthouse.',
        duration: 4.2,
        visualStyle: 'Misty stormy Atlantic sea crashing against rugged Scottish cliff lighthouse',
        graphicOverlay: 'FLANNAN ISLE, 1900',
      },
      {
        text: 'The flag was missing, the lamps were trimmed, and an untouched meal sat on the table.',
        duration: 4.0,
        visualStyle: 'Dim oil lamp lantern illuminating dark wooden dining table inside stone chamber',
      },
      {
        text: 'All three seasoned keepers had vanished into thin air.',
        duration: 3.8,
        visualStyle: 'Empty cliffside stairs leading down to churning black waves in rain',
      },
      {
        text: 'The last entry in the logbook read: "God is over all. The storm has ceased."',
        duration: 4.4,
        visualStyle: 'Aged weathered logbook with handwritten fountain pen script in candlelight',
        graphicOverlay: '“ God is over all. ”',
      },
      {
        text: 'Yet records showed no storm ever hit the island that week.',
        duration: 3.8,
        visualStyle: 'Aerial slow zoom on towering lighthouse beacon piercing fog',
      },
    ],
  },
  {
    id: 'motivational-speech',
    title: 'Motivational & Stoic Mindset',
    tagline: 'High-impact inspirational speech with golden typography and epic music',
    category: 'viral',
    badge: 'High Engagement',
    description: 'Cinematic contrast, slow deliberate camera push, gold serif captions, and punchy cadence built for daily reminder shorts.',
    pacing: 'Dynamic Rhythmic (3.0s cuts)',
    avgDuration: 26,
    sampleTopic: 'The Power of Unbroken Focus',
    suggestedPrompt: 'Create a motivational mindset video on discipline over motivation with stoic classical statue visuals.',
    captionStyle: 'strategist-default',
    transitionStyle: 'zoomBlur',
    segments: [
      {
        text: 'Most people fail not because their goals are too high.',
        duration: 3.2,
        visualStyle: 'Classical marble statue of Marcus Aurelius in dramatic chiaroscuro shadow',
      },
      {
        text: 'They fail because their daily discipline is too low.',
        duration: 3.0,
        visualStyle: 'Lone runner ascending mountain ridge at twilight before sunrise',
        graphicOverlay: 'DISCIPLINE > MOTIVATION',
      },
      {
        text: 'Motivation is an emotional impulse. It fades when you get tired.',
        duration: 3.4,
        visualStyle: 'Heavy raindrops hitting dark asphalt street under solitary streetlight',
      },
      {
        text: 'Discipline is a code. You execute whether you feel like it or not.',
        duration: 3.2,
        visualStyle: 'Sparks flying from blacksmith hammer striking incandescent red steel',
        graphicOverlay: 'EXECUTE DAILY ⚔️',
      },
      {
        text: 'Stop waiting for inspiration. Build the habit today.',
        duration: 3.0,
        visualStyle: 'High-altitude panoramic view of mountain peak basking in golden dawn light',
        graphicOverlay: '🔔 SAVE FOR LATER',
      },
    ],
  },
  {
    id: 'tech-explainer',
    title: 'Tech Explainer & AI News',
    tagline: 'Cyberpunk HUD overlays, glitch transitions, and clean electric captions',
    category: 'educational',
    badge: 'Tech Trend',
    description: 'Fast-paced tech teardown featuring RGB chromatic shifts, tech badges, and neon glowing text for product announcements and AI breakthroughs.',
    pacing: 'Snappy (2.5s cuts)',
    avgDuration: 25,
    sampleTopic: 'Quantum Computing Breakthrough in Silicon',
    suggestedPrompt: 'Generate a modern cyberpunk tech explainer on 1-million qubit quantum chips and quantum error correction.',
    captionStyle: 'karaoke-glow',
    transitionStyle: 'glitch',
    segments: [
      {
        text: 'Quantum computing just hit an exponential inflection point.',
        duration: 2.8,
        visualStyle: 'Cryogenic quantum dilution refrigerator glowing gold inside sterile cleanroom',
        graphicOverlay: 'QUANTUM BREAKTHROUGH',
      },
      {
        text: 'Engineers demonstrated quantum error correction on a million-qubit chip.',
        duration: 3.2,
        visualStyle: 'Microchip silicon wafer with microscopic superconducting circuit traces',
      },
      {
        text: 'This computes in 3 minutes what would take supercomputers 10,000 years.',
        duration: 3.0,
        visualStyle: 'Digital data streams accelerating in hyperspace fiber optic conduits',
        graphicOverlay: '10,000 YEARS ➔ 3 MINS ⚡',
      },
      {
        text: 'Encryption as we know it is about to change forever.',
        duration: 2.8,
        visualStyle: 'Cryptographic hash matrix shifting dynamically in holographic display',
      },
      {
        text: 'Follow for the daily AI and quantum tech briefing.',
        duration: 2.4,
        visualStyle: 'Futuristic research laboratory with illuminated glass partitions',
        graphicOverlay: '✓ VERIFIED TECH',
      },
    ],
  },
  {
    id: 'product-ad',
    title: 'Product Commercial & E-Commerce',
    tagline: 'Clean studio presentation with callout pills and animated CTA badges',
    category: 'commercial',
    badge: 'E-Commerce Ready',
    description: 'Studio product lighting, feature callout stickers, smooth slide transitions, and clear "BUY NOW / LINK IN BIO" conversion end cards.',
    pacing: 'Commercial (2.8s cuts)',
    avgDuration: 22,
    sampleTopic: 'Titanium Smart Ring Health Tracker',
    suggestedPrompt: 'Create a sleek luxury commercial for a Grade 5 titanium health tracking smart ring.',
    captionStyle: 'clean-subtitles',
    transitionStyle: 'slideRight',
    segments: [
      {
        text: 'Meet the most advanced health tracker ever engineered.',
        duration: 2.8,
        visualStyle: 'Aerospace Grade 5 titanium smart ring rotating slowly over dark velvet pedestal',
        graphicOverlay: 'TITANIUM SMART RING',
      },
      {
        text: 'Ultra-lightweight titanium. Zero screens. 7-day battery life.',
        duration: 3.0,
        visualStyle: 'Exploded technical CAD render of inner bio-sensors and micro-battery',
        graphicOverlay: '✓ 7-DAY BATTERY',
      },
      {
        text: 'Continuous heart rate, sleep stages, and recovery metrics.',
        duration: 3.2,
        visualStyle: 'Futuristic HUD smartphone dashboard displaying real-time cardiovascular telemetry',
      },
      {
        text: 'Water resistant to 100 meters. Built for extreme athletes.',
        duration: 2.8,
        visualStyle: 'Swimmer slicing through crystal clear pool water with glowing green ring sensor',
        graphicOverlay: '100M WATER RESISTANT',
      },
      {
        text: 'Claim 40% off during launch week. Link in bio.',
        duration: 2.6,
        visualStyle: 'Sleek luxury product packaging box opening under warm spotlight',
        graphicOverlay: '🛍️ 40% OFF LAUNCH SALE',
      },
    ],
  },
];
