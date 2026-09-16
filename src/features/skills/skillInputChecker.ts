import { EditorSkill, SkillRequiredInput } from '../../types/skills';
import { ProjectDocument } from '../../types/project';

export interface SkillInputCheckResult {
  isSatisfied: boolean;
  missingInputs: SkillRequiredInput[];
  providedInputs: SkillRequiredInput[];
  message?: string;
}

export function validateSkillInputs(skill: EditorSkill, project: ProjectDocument): SkillInputCheckResult {
  const required = skill.requiredInputs || [];
  if (required.length === 0) {
    return { isSatisfied: true, missingInputs: [], providedInputs: ['prompt'] };
  }

  const provided: SkillRequiredInput[] = ['prompt']; // Always have user prompt

  // Check timeline tracks for media assets
  const videoClips = project.timeline.tracks.filter((t) => t.type === 'video').flatMap((t) => t.clips);
  const audioClips = project.timeline.tracks.filter((t) => t.type === 'audio').flatMap((t) => t.clips);

  if (videoClips.length > 0) {
    provided.push('video');
  }

  if (audioClips.length > 0) {
    provided.push('audio');
  }

  // Check if images or script exist in assets or text clips
  const assetList = Object.values(project.assets || {});
  const imageAssets = assetList.filter((a) => a.type === 'image');
  if (imageAssets.length > 0) {
    provided.push('images');
  }

  if (project.manifest.segments?.some((s) => s.scriptText) || project.name) {
    provided.push('script');
  }

  const missing = required.filter((req) => !provided.includes(req));

  if (missing.length > 0) {
    const formattedMissing = missing.map((m) => m.toUpperCase()).join(', ');
    return {
      isSatisfied: false,
      missingInputs: missing,
      providedInputs: provided,
      message: `The Skill "${skill.name}" requires the following missing inputs before starting: [${formattedMissing}]. Please add them to your project first.`,
    };
  }

  return {
    isSatisfied: true,
    missingInputs: [],
    providedInputs: provided,
  };
}
