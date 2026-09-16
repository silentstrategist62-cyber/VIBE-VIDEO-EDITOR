export interface PresetDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
}

export const PRESET_LIST: PresetDefinition[] = [
  { id: 'viral-tiktok', name: 'Viral TikTok 9:16', category: 'social', description: 'Fast hook, kinetic captions, auto ducking' },
  { id: 'reels-aesthetic', name: 'Reels Aesthetic', category: 'social', description: 'Cinematic mood grade, minimal subtitles' },
  { id: 'youtube-docu', name: 'YouTube Docu 16:9', category: 'longform', description: 'Chapter markers, subtle lower-thirds, b-roll cadence' },
];
