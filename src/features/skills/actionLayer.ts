import { ActionDefinition, ActionLayerType } from '../../types/skills';
import { Operation, Clip, Transition, ColorAdjust } from '../../types/project';

export const ACTION_LAYER_REGISTRY: Record<ActionLayerType, ActionDefinition> = {
  cut: {
    type: 'cut',
    name: 'Cut & Trim',
    description: 'Trims clip boundaries, removes silence, or splits tracks.',
    variants: ['jump_cut', 'ripple_cut', 'l_cut', 'j_cut'],
  },
  add_transition: {
    type: 'add_transition',
    name: 'Add Transition',
    description: 'Inserts visual optical or geometric transitions between adjacent clips.',
    variants: ['crossfade', 'dipToBlack', 'dipToWhite', 'zoomIn', 'spinCW', 'lumaFade'],
  },
  add_caption: {
    type: 'add_caption',
    name: 'Add Kinetic Caption',
    description: 'Overlays word-timed kinetic typography and subtitle cards.',
    variants: ['trending-green-italic', 'trending-hormozi-yellow', 'trending-reels-pill', 'classic-minimal-white', 'glow-cyber-cyan'],
  },
  insert_broll: {
    type: 'insert_broll',
    name: 'Insert B-Roll',
    description: 'Places cutaway B-Roll footage or images matching script concepts.',
    variants: ['semantic_match', 'ken_burns_pan_zoom', 'tight_macro_cutaway'],
  },
  adjust_pacing: {
    type: 'adjust_pacing',
    name: 'Adjust Pacing',
    description: 'Accelerates bridge sections, tightens vocal gaps, or speeds up dialogue.',
    variants: ['tighten_dialogue_pauses', 'accelerate_bridge_1.25x', 'hook_zoom_0.8s'],
  },
  apply_color: {
    type: 'apply_color',
    name: 'Apply Color Style',
    description: 'Applies color grading curves, warmth adjustments, vignettes, and skin-tone protection.',
    variants: ['cinematic_warm_film', 'high_contrast_punch', 'moody_shadow_lift', 'vivid_social'],
  },
  render_preview: {
    type: 'render_preview',
    name: 'Render Preview',
    description: 'Generates low-latency preview composite frame for user inspection.',
    variants: ['standard_preview_frame', 'high_quality_composite'],
  },
};

export class SessionVarietyTracker {
  private choiceHistory: Record<string, string[]> = {};

  recordChoice(actionType: string, variantChosen: string) {
    if (!this.choiceHistory[actionType]) {
      this.choiceHistory[actionType] = [];
    }
    this.choiceHistory[actionType].push(variantChosen);
  }

  getRecentChoices(actionType: string, count = 3): string[] {
    const list = this.choiceHistory[actionType] || [];
    return list.slice(-count);
  }

  getBestAlternative(actionType: string, candidateVariants: string[]): string {
    const recent = this.getRecentChoices(actionType, 2);
    // Find first candidate variant that was not used in the last 2 choices
    const freshOption = candidateVariants.find((v) => !recent.includes(v));
    return freshOption || candidateVariants[0];
  }

  getHistory(): Record<string, string[]> {
    return { ...this.choiceHistory };
  }

  clear() {
    this.choiceHistory = {};
  }
}

/**
 * Translates an ActionLayerType + variant into concrete Operation[] for a given clip.
 * This bridges the skill registry to the operation applier.
 */
export function executeSkillAction(
  actionType: ActionLayerType,
  variant: string,
  targetClips: Clip[],
  params?: Record<string, any>
): Operation[] {
  const ops: Operation[] = [];

  switch (actionType) {
    case 'cut': {
      // Trim silence / cut: reduce each clip's end by a small amount to tighten pacing
      const trimAmount = params?.trimSeconds ?? 0.15;
      for (const clip of targetClips) {
        if (clip.duration > trimAmount * 2 + 0.5) {
          ops.push({
            op: 'trim_clip',
            clipId: clip.clipId,
            sourceIn: clip.sourceIn,
            sourceOut: clip.sourceOut - trimAmount,
            duration: clip.duration - trimAmount,
          });
        }
      }
      break;
    }

    case 'add_transition': {
      const transitionMap: Record<string, string> = {
        crossfade: 'crossfade',
        dipToBlack: 'dipToBlack',
        dipToWhite: 'dipToWhite',
        zoomIn: 'zoomIn',
        spinCW: 'spinClockwise',
        lumaFade: 'lumaFade',
      };
      const transType = transitionMap[variant] || variant || 'crossfade';
      const duration = params?.duration ?? 0.3;
      for (const clip of targetClips) {
        ops.push({
          op: 'add_transition',
          clipId: clip.clipId,
          position: 'in',
          type: transType as Transition['type'],
          duration,
        });
      }
      break;
    }

    case 'add_caption': {
      // Captions are added via the autonomous assembler; this action adds a caption to a clip
      // Requires caption text in params
      const text = params?.text || 'Caption';
      const style = params?.style || 'viral-bold';
      for (const clip of targetClips) {
        ops.push({
          op: 'add_caption',
          caption: {
            captionId: `cap-skill-${Date.now()}-${clip.clipId}`,
            text,
            startTime: clip.startTime,
            endTime: clip.startTime + clip.duration,
            style: style as any,
          },
        });
      }
      break;
    }

    case 'adjust_pacing': {
      const speedMap: Record<string, number> = {
        'accelerate_bridge_1.25x': 1.25,
        'hook_zoom_0.8s': 1.2,
        'tighten_dialogue_pauses': 1.1,
      };
      const speed = speedMap[variant] || params?.speed || 1.25;
      for (const clip of targetClips) {
        ops.push({ op: 'set_speed', clipId: clip.clipId, speed, maintainPitch: true });
      }
      break;
    }

    case 'apply_color': {
      const colorPresets: Record<string, Partial<ColorAdjust>> = {
        cinematic_warm_film:   { brightness: 5, contrast: 12, saturation: -10, temperature: 15, vignette: 20 },
        high_contrast_punch:   { brightness: 0, contrast: 25, saturation: 20, temperature: 0,  vignette: 15 },
        moody_shadow_lift:     { brightness: 10, contrast: 8, saturation: -20, temperature: -10, vignette: 30 },
        vivid_social:          { brightness: 8, contrast: 10, saturation: 30, temperature: 5,  vignette: 5 },
      };
      const adjust = colorPresets[variant] || { brightness: 5, contrast: 10, saturation: 15, vignette: 10 };
      for (const clip of targetClips) {
        ops.push({ op: 'set_adjust', clipId: clip.clipId, adjust });
      }
      break;
    }

    case 'insert_broll': {
      // B-roll insertion requires assets; apply Ken Burns zoom as a proxy action
      for (const clip of targetClips) {
        ops.push({
          op: 'add_keyframe',
          clipId: clip.clipId,
          keyframe: { property: 'scale', time: clip.duration, value: 1.15, easing: 'easeInOut' },
        });
      }
      break;
    }

    case 'render_preview':
      // render_preview is a no-op at the operation level; rendering happens in previewRenderer
      break;
  }

  return ops;
}
