export type SkillCategory = 'pacing' | 'captions' | 'broll' | 'audio' | 'color' | 'general' | 'longform' | 'shortform';

export type SkillRequiredInput = 'script' | 'images' | 'video' | 'audio' | 'prompt';

export interface SkillWorkflowStep {
  id: string;
  stepNumber: number;
  title: string;
  type: 'fixed' | 'choice';
  instruction: string;
  choiceOptions?: string[];
  decisionRule?: string;
  requiresApproval?: boolean;
}

export interface EditorSkill {
  id: string;
  name: string;
  activity: string; // Specific activity or workflow this skill governs
  description: string; // Brief description of the skill's purpose
  category: SkillCategory;
  enabled: boolean;
  rules: string; // Plain English rules on how specific activities are executed (like Claude)
  examples?: string[]; // Example natural language prompts or situations that trigger this skill
  updatedAt: string;
  isBuiltIn?: boolean;

  // Build Spec 4-Part Structure:
  requiredInputs?: SkillRequiredInput[];
  workflow?: SkillWorkflowStep[];
  editingRules?: string;
}

export type ActionLayerType =
  | 'cut'
  | 'add_transition'
  | 'add_caption'
  | 'insert_broll'
  | 'adjust_pacing'
  | 'apply_color'
  | 'render_preview';

export interface ActionDefinition {
  type: ActionLayerType;
  name: string;
  description: string;
  variants: string[];
}

export interface ActiveSkillSessionState {
  activeSkillId: string | null;
  activeSkillName: string | null;
  currentStepIndex: number;
  completedStepIds: string[];
  choiceHistory: Record<string, string[]>; // Action -> list of chosen variants
  missingInputs: SkillRequiredInput[];
  status: 'idle' | 'checking_inputs' | 'running' | 'paused_for_input' | 'completed';
  pendingConfirmationSkill: EditorSkill | null;
}

export interface SettingsTabState {
  activeTab: 'skills' | 'timeline' | 'canvas' | 'export' | 'ai';
}
