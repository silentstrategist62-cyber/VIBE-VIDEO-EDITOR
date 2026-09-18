import { ProjectDocument, Operation, OperationLog, Clip, Keyframe, Caption, Transition } from '../types/project';

function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function findClip(doc: ProjectDocument, clipId: string): { clip: Clip; trackIndex: number; clipIndex: number } | null {
  for (let t = 0; t < doc.timeline.tracks.length; t++) {
    const track = doc.timeline.tracks[t];
    const cIdx = track.clips.findIndex((c) => c.clipId === clipId);
    if (cIdx !== -1) {
      return { clip: track.clips[cIdx], trackIndex: t, clipIndex: cIdx };
    }
  }
  return null;
}

function recalculateTimelineDuration(doc: ProjectDocument): void {
  let maxTime = 0;
  for (const track of doc.timeline.tracks) {
    for (const clip of track.clips) {
      const end = clip.startTime + clip.duration;
      if (end > maxTime) maxTime = end;
    }
  }
  doc.timeline.duration = Math.max(maxTime, 5); // Minimum 5s
}

/**
 * Applies a single operation or batch to the Project Document.
 * Guarantees that every edit path (Manual UI, Autonomous preset, Prompt Chatbox)
 * updates state identically and generates a reversible inverse operation.
 */
export function applyOperation(
  currentDoc: ProjectDocument,
  operation: Operation,
  recordHistory = true,
  description?: string
): { document: ProjectDocument; inverse: Operation } {
  const doc = clone(currentDoc);
  let inverse: Operation;

  switch (operation.op) {
    case 'trim_clip': {
      const target = findClip(doc, operation.clipId);
      if (!target) throw new Error(`Clip ${operation.clipId} not found`);
      const { clip } = target;
      const prevIn = clip.sourceIn;
      const prevOut = clip.sourceOut;
      const prevDuration = clip.duration;
      const prevStartTime = clip.startTime;

      clip.sourceIn = operation.sourceIn;
      clip.sourceOut = operation.sourceOut;
      clip.duration = operation.duration ?? (operation.sourceOut - operation.sourceIn);
      if (operation.newStartTime !== undefined) {
        clip.startTime = operation.newStartTime;
      }

      inverse = {
        op: 'trim_clip',
        clipId: operation.clipId,
        sourceIn: prevIn,
        sourceOut: prevOut,
        duration: prevDuration,
        newStartTime: prevStartTime,
      };
      break;
    }

    case 'delete_clip': {
      const target = findClip(doc, operation.clipId);
      if (!target) throw new Error(`Clip ${operation.clipId} not found`);
      const deletedClip = clone(target.clip);
      const track = doc.timeline.tracks[target.trackIndex];
      track.clips.splice(target.clipIndex, 1);

      // On main timeline (V1), fill in the gap left by the deleted clip
      if (track.trackId === 'V1') {
        track.clips.sort((a, b) => a.startTime - b.startTime);
        for (const c of track.clips) {
          if (c.startTime >= deletedClip.startTime - 0.05) {
            c.startTime = Math.max(0, Number((c.startTime - deletedClip.duration).toFixed(2)));
          }
        }
        let curTime = 0;
        for (let i = 0; i < track.clips.length; i++) {
          if (i === 0 && track.clips[0].startTime <= 0.05) {
            track.clips[0].startTime = 0;
            curTime = track.clips[0].duration;
          } else {
            track.clips[i].startTime = Number(curTime.toFixed(2));
            curTime += track.clips[i].duration;
          }
        }
      }

      inverse = {
        op: 'add_clip',
        clip: deletedClip,
      };
      break;
    }

    case 'add_clip': {
      const { clip } = operation;
      let track = doc.timeline.tracks.find((t) => t.trackId === clip.trackId);
      if (!track) {
        // Create track if not existing
        track = {
          trackId: clip.trackId,
          type: clip.trackId.startsWith('A') ? 'audio' : 'video',
          clips: [],
        };
        doc.timeline.tracks.push(track);
      }

      const newStart = clip.startTime;
      const newEnd = clip.startTime + clip.duration;

      // Filter out existing clips on this track that are completely covered by the new clip
      track.clips = track.clips.filter((c) => {
        const cStart = c.startTime;
        const cEnd = c.startTime + c.duration;
        return !(cStart >= newStart && cEnd <= newEnd);
      });

      // Trim partial overlaps
      for (const c of track.clips) {
        const cStart = c.startTime;
        const cEnd = c.startTime + c.duration;

        // Clip overlaps start of new clip
        if (cStart < newStart && cEnd > newStart && cEnd <= newEnd) {
          c.duration = Number((newStart - cStart).toFixed(2));
          c.sourceOut = c.sourceIn + c.duration;
        }
        // Clip overlaps end of new clip
        else if (cStart >= newStart && cStart < newEnd && cEnd > newEnd) {
          const cutAmount = newEnd - cStart;
          c.startTime = Number(newEnd.toFixed(2));
          c.duration = Number((c.duration - cutAmount).toFixed(2));
          c.sourceIn += cutAmount;
        }
      }

      track.clips.push(clone(clip));
      // Sort clips by startTime
      track.clips.sort((a, b) => a.startTime - b.startTime);

      inverse = {
        op: 'delete_clip',
        clipId: clip.clipId,
      };
      break;
    }

    case 'split_clip': {
      const target = findClip(doc, operation.clipId);
      if (!target) throw new Error(`Clip ${operation.clipId} not found`);
      const { clip, trackIndex, clipIndex } = target;
      const { splitTime } = operation;

      if (splitTime <= clip.startTime || splitTime >= clip.startTime + clip.duration) {
        throw new Error(`Split time ${splitTime} must be strictly within clip bounds (${clip.startTime} - ${clip.startTime + clip.duration})`);
      }

      const originalClip = clone(clip);
      const splitOffset = splitTime - clip.startTime;
      const originalDuration = clip.duration;
      const originalSourceIn = clip.sourceIn;
      const originalSourceOut = clip.sourceOut;

      // Clip 1 (first half)
      clip.duration = splitOffset;
      clip.sourceOut = originalSourceIn + splitOffset;

      // Clip 2 (second half)
      const newClipId = operation.newClipId || `clip-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      operation.newClipId = newClipId;
      const secondClip: Clip = {
        ...clone(originalClip),
        clipId: newClipId,
        startTime: splitTime,
        duration: originalDuration - splitOffset,
        sourceIn: originalSourceIn + splitOffset,
        sourceOut: originalSourceOut,
        transitionIn: null, // clear incoming transition on second half
      };

      doc.timeline.tracks[trackIndex].clips.splice(clipIndex + 1, 0, secondClip);

      inverse = {
        op: 'batch_operations',
        operations: [
          { op: 'delete_clip', clipId: newClipId },
          {
            op: 'trim_clip',
            clipId: originalClip.clipId,
            sourceIn: originalClip.sourceIn,
            sourceOut: originalClip.sourceOut,
            duration: originalClip.duration,
          },
        ],
        description: 'Undo split clip',
      };
      break;
    }

    case 'move_clip':
    case 'reorder_clip': {
      const target = findClip(doc, operation.clipId);
      if (!target) throw new Error(`Clip ${operation.clipId} not found`);
      const { clip, trackIndex, clipIndex } = target;
      const prevTrackId = clip.trackId;
      const prevStartTime = clip.startTime;
      const prevDuration = clip.duration;
      const targetTrackId =
        operation.op === 'reorder_clip' && operation.newTrackId
          ? operation.newTrackId
          : prevTrackId;

      if (prevTrackId === 'V1' && targetTrackId !== 'V1') {
        // 1. Moving from main timeline (V1) to a layer or audio track:
        // Remove from V1 and ripple subsequent clips so b3 fills b2's space and gaps are closed
        doc.timeline.tracks[trackIndex].clips.splice(clipIndex, 1);
        const v1Track = doc.timeline.tracks[trackIndex];
        v1Track.clips.sort((a, b) => a.startTime - b.startTime);
        for (const c of v1Track.clips) {
          if (c.startTime >= prevStartTime - 0.05) {
            c.startTime = Math.max(0, Number((c.startTime - prevDuration).toFixed(2)));
          }
        }
        let curTime = 0;
        for (let i = 0; i < v1Track.clips.length; i++) {
          if (i === 0 && v1Track.clips[0].startTime <= 0.05) {
            v1Track.clips[0].startTime = 0;
            curTime = v1Track.clips[0].duration;
          } else {
            v1Track.clips[i].startTime = Number(curTime.toFixed(2));
            curTime += v1Track.clips[i].duration;
          }
        }

        // Add to destination layer track without displacing existing clips
        let destTrack = doc.timeline.tracks.find((t) => t.trackId === targetTrackId);
        if (!destTrack) {
          const isAudio = targetTrackId.startsWith('A');
          const isOverlay = targetTrackId.startsWith('L');
          destTrack = {
            trackId: targetTrackId,
            type: isAudio ? 'audio' : isOverlay ? 'overlay' : 'video',
            name: `${isAudio ? 'Audio Track' : isOverlay ? 'Graphic Layer' : 'Video Track'} (${targetTrackId})`,
            clips: [],
          };
          if (isOverlay) {
            doc.timeline.tracks.unshift(destTrack);
          } else {
            doc.timeline.tracks.push(destTrack);
          }
        }
        clip.trackId = targetTrackId;
        clip.startTime = Math.max(0, Number(operation.newStartTime.toFixed(2)));
        destTrack.clips.push(clip);
        destTrack.clips.sort((a, b) => a.startTime - b.startTime);
      } else if (prevTrackId === 'V1' && targetTrackId === 'V1') {
        // 2. Moving within main timeline (V1): sequence magnetically without gaps
        const v1Track = doc.timeline.tracks[trackIndex];
        const otherClips = v1Track.clips
          .filter((c) => c.clipId !== clip.clipId)
          .sort((a, b) => a.startTime - b.startTime);

        let insertIndex = otherClips.length;
        for (let i = 0; i < otherClips.length; i++) {
          const c = otherClips[i];
          const displaceThreshold = c.startTime + Math.min(c.duration * 0.75, Math.max(0.1, c.duration - 0.2));
          if (operation.newStartTime < displaceThreshold) {
            insertIndex = i;
            break;
          }
        }
        otherClips.splice(insertIndex, 0, clip);

        let curTime = 0;
        for (const c of otherClips) {
          c.startTime = Number(curTime.toFixed(2));
          curTime += c.duration;
        }
        v1Track.clips = otherClips;
      } else if (prevTrackId !== 'V1' && targetTrackId === 'V1') {
        // 3. Moving from a layer back into main timeline (V1):
        // Displace the targeted clip and push it forward with the rest of the timeline to occupy that space
        doc.timeline.tracks[trackIndex].clips.splice(clipIndex, 1);
        let v1Track = doc.timeline.tracks.find((t) => t.trackId === 'V1');
        if (!v1Track) {
          v1Track = { trackId: 'V1', type: 'video', name: 'Main Video (V1)', clips: [] };
          doc.timeline.tracks.push(v1Track);
        }
        clip.trackId = 'V1';
        const otherClips = v1Track.clips.sort((a, b) => a.startTime - b.startTime);
        let insertIndex = otherClips.length;
        for (let i = 0; i < otherClips.length; i++) {
          const c = otherClips[i];
          const displaceThreshold = c.startTime + Math.min(c.duration * 0.75, Math.max(0.1, c.duration - 0.2));
          if (operation.newStartTime < displaceThreshold) {
            insertIndex = i;
            break;
          }
        }
        otherClips.splice(insertIndex, 0, clip);
        let curTime = 0;
        for (const c of otherClips) {
          c.startTime = Number(curTime.toFixed(2));
          curTime += c.duration;
        }
        v1Track.clips = otherClips;
      } else {
        // 4. Moving within or between layer/audio tracks: free placement without displacement
        if (targetTrackId !== prevTrackId) {
          doc.timeline.tracks[trackIndex].clips.splice(clipIndex, 1);
          let destTrack = doc.timeline.tracks.find((t) => t.trackId === targetTrackId);
          if (!destTrack) {
            const isAudio = targetTrackId.startsWith('A');
            const isOverlay = targetTrackId.startsWith('L');
            destTrack = {
              trackId: targetTrackId,
              type: isAudio ? 'audio' : isOverlay ? 'overlay' : 'video',
              name: `${isAudio ? 'Audio Track' : isOverlay ? 'Graphic Layer' : 'Video Track'} (${targetTrackId})`,
              clips: [],
            };
            if (isOverlay) {
              doc.timeline.tracks.unshift(destTrack);
            } else {
              doc.timeline.tracks.push(destTrack);
            }
          }
          clip.trackId = targetTrackId;
          destTrack.clips.push(clip);
        }
        clip.startTime = Math.max(0, Number(operation.newStartTime.toFixed(2)));
        const currentTrack = doc.timeline.tracks.find((t) => t.trackId === clip.trackId);
        if (currentTrack) {
          currentTrack.clips.sort((a, b) => a.startTime - b.startTime);
        }
      }

      recalculateTimelineDuration(doc);

      inverse = {
        op: 'reorder_clip',
        clipId: operation.clipId,
        newTrackId: prevTrackId,
        newStartTime: prevStartTime,
      };
      break;
    }

    case 'add_track': {
      const existing = doc.timeline.tracks.find((t) => t.trackId === operation.trackId);
      if (!existing) {
        const defaultName =
          operation.name ||
          (operation.type === 'overlay'
            ? `Graphic Layer (${operation.trackId})`
            : operation.type === 'video'
            ? `Video Track (${operation.trackId})`
            : `Audio Track (${operation.trackId})`);

        const newTrack = {
          trackId: operation.trackId,
          type: operation.type,
          name: defaultName,
          clips: [],
        };
        if (operation.type === 'overlay') {
          // Insert overlay tracks at the top
          doc.timeline.tracks.unshift(newTrack);
        } else if (operation.type === 'video') {
          // Insert video tracks before audio tracks
          const firstAudio = doc.timeline.tracks.findIndex((t) => t.type === 'audio');
          if (firstAudio !== -1) {
            doc.timeline.tracks.splice(firstAudio, 0, newTrack);
          } else {
            doc.timeline.tracks.push(newTrack);
          }
        } else {
          doc.timeline.tracks.push(newTrack);
        }
      }
      inverse = { op: 'delete_track', trackId: operation.trackId };
      break;
    }

    case 'delete_track': {
      const idx = doc.timeline.tracks.findIndex((t) => t.trackId === operation.trackId);
      if (idx !== -1) {
        const removed = doc.timeline.tracks.splice(idx, 1)[0];
        inverse = {
          op: 'add_track',
          trackId: removed.trackId,
          type: removed.type,
          name: removed.name,
        };
      } else {
        inverse = { op: 'batch_operations', operations: [] };
      }
      break;
    }

    case 'resolve_overlaps': {
      for (const track of doc.timeline.tracks) {
        if (operation.trackId && track.trackId !== operation.trackId) continue;
        track.clips.sort((a, b) => a.startTime - b.startTime);
        for (let i = 0; i < track.clips.length - 1; i++) {
          const current = track.clips[i];
          const next = track.clips[i + 1];
          const currentEnd = Number((current.startTime + current.duration).toFixed(2));
          if (next.startTime < currentEnd - 0.05) {
            const shift = Number((currentEnd - next.startTime).toFixed(2));
            for (let j = i + 1; j < track.clips.length; j++) {
              track.clips[j].startTime = Number((track.clips[j].startTime + shift).toFixed(2));
            }
          }
        }
      }
      recalculateTimelineDuration(doc);
      inverse = { op: 'batch_operations', operations: [] };
      break;
    }

    case 'set_speed': {
      const target = findClip(doc, operation.clipId);
      if (!target) throw new Error(`Clip ${operation.clipId} not found`);
      const { clip } = target;
      const prevSpeed = clip.audio?.speed ?? 1.0;
      if (!clip.audio) {
        clip.audio = {
          volume: 0,
          fadeIn: 0,
          fadeOut: 0,
          speed: operation.speed,
          maintainPitch: operation.maintainPitch ?? true,
        };
      } else {
        clip.audio.speed = operation.speed;
        if (operation.maintainPitch !== undefined) {
          clip.audio.maintainPitch = operation.maintainPitch;
        }
      }

      // Adjust clip duration accordingly
      const prevDuration = clip.duration;
      clip.duration = (clip.sourceOut - clip.sourceIn) / operation.speed;

      inverse = {
        op: 'set_speed',
        clipId: operation.clipId,
        speed: prevSpeed,
        previousSpeed: operation.speed,
      };
      break;
    }

    case 'add_transition': {
      const target = findClip(doc, operation.clipId);
      if (!target) throw new Error(`Clip ${operation.clipId} not found`);
      const { clip } = target;
      const prevTrans = operation.position === 'in' ? clip.transitionIn : clip.transitionOut;

      const newTransition: Transition = {
        type: operation.type,
        duration: operation.duration,
      };

      if (operation.position === 'in') {
        clip.transitionIn = newTransition;
      } else {
        clip.transitionOut = newTransition;
      }

      inverse = prevTrans
        ? {
            op: 'add_transition',
            clipId: operation.clipId,
            position: operation.position,
            type: prevTrans.type,
            duration: prevTrans.duration,
          }
        : {
            op: 'remove_transition',
            clipId: operation.clipId,
            position: operation.position,
          };
      break;
    }

    case 'remove_transition': {
      const target = findClip(doc, operation.clipId);
      if (!target) throw new Error(`Clip ${operation.clipId} not found`);
      const { clip } = target;
      const prevTrans = operation.position === 'in' ? clip.transitionIn : clip.transitionOut;

      if (operation.position === 'in') {
        clip.transitionIn = null;
      } else {
        clip.transitionOut = null;
      }

      inverse = prevTrans
        ? {
            op: 'add_transition',
            clipId: operation.clipId,
            position: operation.position,
            type: prevTrans.type,
            duration: prevTrans.duration,
          }
        : {
            op: 'remove_transition',
            clipId: operation.clipId,
            position: operation.position,
          };
      break;
    }

    case 'set_transform': {
      const target = findClip(doc, operation.clipId);
      if (!target) throw new Error(`Clip ${operation.clipId} not found`);
      const { clip } = target;
      const prevTransform = clone(clip.transform);

      clip.transform = {
        ...clip.transform,
        ...operation.transform,
      };

      inverse = {
        op: 'set_transform',
        clipId: operation.clipId,
        transform: prevTransform,
      };
      break;
    }

    case 'set_adjust': {
      const target = findClip(doc, operation.clipId);
      if (!target) throw new Error(`Clip ${operation.clipId} not found`);
      const { clip } = target;
      const prevAdjust = clone(
        clip.adjust || {
          brightness: 0,
          contrast: 0,
          saturation: 0,
          temperature: 0,
          exposure: 0,
          vignette: 0,
        }
      );

      clip.adjust = {
        ...prevAdjust,
        ...operation.adjust,
      };

      inverse = {
        op: 'set_adjust',
        clipId: operation.clipId,
        adjust: prevAdjust,
      };
      break;
    }

    case 'set_effects': {
      const target = findClip(doc, operation.clipId);
      if (!target) throw new Error(`Clip ${operation.clipId} not found`);
      const { clip } = target;
      const prevEffects = clone(clip.effects || []);
      clip.effects = clone(operation.effects);

      inverse = {
        op: 'set_effects',
        clipId: operation.clipId,
        effects: prevEffects,
      };
      break;
    }

    case 'add_effect': {
      const target = findClip(doc, operation.clipId);
      if (!target) throw new Error(`Clip ${operation.clipId} not found`);
      const { clip } = target;
      if (!clip.effects) clip.effects = [];
      clip.effects.push(clone(operation.effect));

      inverse = {
        op: 'remove_effect',
        clipId: operation.clipId,
        effectId: operation.effect.id,
        previousEffect: clone(operation.effect),
      };
      break;
    }

    case 'remove_effect': {
      const target = findClip(doc, operation.clipId);
      if (!target) throw new Error(`Clip ${operation.clipId} not found`);
      const { clip } = target;
      const prevEffect = clip.effects?.find((e) => e.id === operation.effectId);
      if (clip.effects) {
        clip.effects = clip.effects.filter((e) => e.id !== operation.effectId);
      }

      inverse = prevEffect
        ? {
            op: 'add_effect',
            clipId: operation.clipId,
            effect: clone(prevEffect),
          }
        : {
            op: 'batch_operations',
            operations: [],
          };
      break;
    }

    case 'update_graphic': {
      const target = findClip(doc, operation.clipId);
      if (!target) throw new Error(`Clip ${operation.clipId} not found`);
      const { clip } = target;
      const prevGraphic = clone(clip.graphic);
      if (!clip.graphic) {
        clip.graphic = { id: `graphic-${Date.now()}`, category: 'shape', ...operation.graphic };
      } else {
        clip.graphic = { ...clip.graphic, ...operation.graphic };
      }

      inverse = {
        op: 'update_graphic',
        clipId: operation.clipId,
        graphic: prevGraphic || {},
      };
      break;
    }

    case 'update_text_overlay': {
      const target = findClip(doc, operation.clipId);
      if (!target) throw new Error(`Clip ${operation.clipId} not found`);
      const { clip } = target;
      const prevTextOverlay = clone(clip.textOverlay);
      if (!clip.textOverlay) {
        clip.textOverlay = {
          id: `txt-${Date.now()}`,
          text: 'New Text',
          stylePreset: 'viral_bold',
          animation: 'bounce',
          fontSize: 44,
          fontFamily: 'Impact, sans-serif',
          color: '#FACC15',
          alignment: 'center',
          ...operation.textOverlay,
        };
      } else {
        clip.textOverlay = { ...clip.textOverlay, ...operation.textOverlay };
      }

      inverse = {
        op: 'update_text_overlay',
        clipId: operation.clipId,
        textOverlay: prevTextOverlay || {},
      };
      break;
    }

    case 'set_volume': {
      const target = findClip(doc, operation.clipId);
      if (!target) throw new Error(`Clip ${operation.clipId} not found`);
      const { clip } = target;
      if (!clip.audio) {
        clip.audio = {
          volume: operation.volume,
          fadeIn: 0,
          fadeOut: 0,
          speed: 1.0,
          maintainPitch: true,
        };
      }
      const prevVolume = clip.audio.volume;
      clip.audio.volume = operation.volume;

      inverse = {
        op: 'set_volume',
        clipId: operation.clipId,
        volume: prevVolume,
      };
      break;
    }

    case 'set_audio_settings': {
      const target = findClip(doc, operation.clipId);
      if (!target) throw new Error(`Clip ${operation.clipId} not found`);
      const { clip } = target;
      const prevSettings = clone(
        clip.audio || {
          volume: 0,
          fadeIn: 0,
          fadeOut: 0,
          speed: 1.0,
          maintainPitch: true,
        }
      );

      clip.audio = {
        ...prevSettings,
        ...operation.settings,
      };

      inverse = {
        op: 'set_audio_settings',
        clipId: operation.clipId,
        settings: prevSettings,
      };
      break;
    }

    case 'add_keyframe': {
      const target = findClip(doc, operation.clipId);
      if (!target) throw new Error(`Clip ${operation.clipId} not found`);
      const { clip } = target;
      const kf = operation.keyframe;
      if (!kf) return { document: doc, inverse: { op: 'batch_operations', operations: [] } };
      const existingIdx = clip.keyframes.findIndex((k) => k.property === kf.property && Math.abs(k.time - kf.time) < 0.05);

      let prevKf: Keyframe | undefined;
      if (existingIdx !== -1) {
        prevKf = clone(clip.keyframes[existingIdx]);
        clip.keyframes[existingIdx] = clone(kf);
      } else {
        clip.keyframes.push(clone(kf));
      }
      clip.keyframes.sort((a, b) => a.time - b.time);

      inverse = prevKf
        ? {
            op: 'add_keyframe',
            clipId: operation.clipId,
            keyframe: prevKf,
          }
        : {
            op: 'delete_keyframe',
            clipId: operation.clipId,
            property: kf.property,
            time: kf.time,
          };
      break;
    }

    case 'delete_keyframe': {
      const target = findClip(doc, operation.clipId);
      if (!target) throw new Error(`Clip ${operation.clipId} not found`);
      const { clip } = target;
      const idx = clip.keyframes.findIndex((k) => k.property === operation.property && Math.abs(k.time - operation.time) < 0.05);
      if (idx === -1) throw new Error(`Keyframe not found at time ${operation.time}`);
      const deletedKf = clone(clip.keyframes[idx]);
      clip.keyframes.splice(idx, 1);

      inverse = {
        op: 'add_keyframe',
        clipId: operation.clipId,
        keyframe: deletedKf,
      };
      break;
    }

    case 'replace_asset': {
      const target = findClip(doc, operation.clipId);
      if (!target) throw new Error(`Clip ${operation.clipId} not found`);
      const { clip } = target;
      const prevAssetId = clip.assetId;
      clip.assetId = operation.newAssetId;

      inverse = {
        op: 'replace_asset',
        clipId: operation.clipId,
        newAssetId: prevAssetId,
      };
      break;
    }

    case 'add_caption': {
      // Add caption to target clip or first video track clip
      let added = false;
      for (const track of doc.timeline.tracks) {
        for (const clip of track.clips) {
          if (operation.caption.startTime >= clip.startTime && operation.caption.startTime < clip.startTime + clip.duration) {
            clip.captions = clip.captions || [];
            clip.captions.push(clone(operation.caption));
            added = true;
            break;
          }
        }
        if (added) break;
      }
      if (!added && doc.timeline.tracks[0]?.clips[0]) {
        const firstClip = doc.timeline.tracks[0].clips[0];
        firstClip.captions = firstClip.captions || [];
        firstClip.captions.push(clone(operation.caption));
      }

      inverse = {
        op: 'delete_caption',
        captionId: operation.caption.captionId,
      };
      break;
    }

    case 'edit_caption': {
      let foundCaption: Caption | null = null;
      let prevCaptionData: Partial<Caption> = {};

      for (const track of doc.timeline.tracks) {
        for (const clip of track.clips) {
          if (clip.captions) {
            const cIdx = clip.captions.findIndex((c) => c.captionId === operation.captionId);
            if (cIdx !== -1) {
              foundCaption = clip.captions[cIdx];
              prevCaptionData = clone(foundCaption);
              clip.captions[cIdx] = {
                ...foundCaption,
                ...operation.changes,
              };
              break;
            }
          }
        }
        if (foundCaption) break;
      }

      inverse = {
        op: 'edit_caption',
        captionId: operation.captionId,
        changes: prevCaptionData,
      };
      break;
    }

    case 'delete_caption': {
      let deleted: Caption | null = null;
      for (const track of doc.timeline.tracks) {
        for (const clip of track.clips) {
          if (clip.captions) {
            const cIdx = clip.captions.findIndex((c) => c.captionId === operation.captionId);
            if (cIdx !== -1) {
              deleted = clone(clip.captions[cIdx]);
              clip.captions.splice(cIdx, 1);
              break;
            }
          }
        }
        if (deleted) break;
      }

      inverse = deleted
        ? {
            op: 'add_caption',
            caption: deleted,
          }
        : {
            op: 'batch_operations',
            operations: [],
          };
      break;
    }

    case 'batch_operations': {
      const inverseOps: Operation[] = [];
      let tempDoc = doc;

      const subOps = Array.isArray(operation.operations) ? operation.operations : [];
      for (const subOp of subOps) {
        const res = applyOperation(tempDoc, subOp, false);
        tempDoc = res.document;
        inverseOps.unshift(res.inverse);
      }

      // Copy mutated properties over
      doc.timeline = tempDoc.timeline;
      doc.manifest = tempDoc.manifest;
      doc.assets = tempDoc.assets;

      inverse = {
        op: 'batch_operations',
        operations: inverseOps,
        description: `Undo ${operation.description || 'batch edit'}`,
      };
      break;
    }

    case 'request_transcription': {
      // This is a side-effect operation handled by projectStore.ts
      // We just pass it through without mutating the document.
      inverse = { op: 'request_transcription', assetId: operation.assetId };
      break;
    }

    default:
      throw new Error(`Unsupported operation: ${(operation as any).op}`);
  }

  recalculateTimelineDuration(doc);
  doc.updatedAt = new Date().toISOString();

  if (recordHistory) {
    if (!doc.history) {
      doc.history = { past: [], future: [] };
    }
    const logEntry: OperationLog = {
      id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      op: operation,
      inverse,
      timestamp: new Date().toISOString(),
      description: description || getDefaultDescription(operation),
      timelineSnapshotBefore: clone(currentDoc.timeline),
      timelineSnapshotAfter: clone(doc.timeline),
      affectedClipId: getAffectedClipId(operation),
    };
    doc.history.past.push(logEntry);
    // Cap past stack size at 50 to prevent unbounded memory growth
    if (doc.history.past.length > 50) {
      doc.history.past.shift();
    }
    // Clear future redo stack on any new edit
    doc.history.future = [];
  }

  return { document: doc, inverse };
}

/**
 * Generate a friendly human-readable label for any timeline operation
 */
export function getDefaultDescription(op: Operation): string {
  switch (op.op) {
    case 'trim_clip':
      return 'Trim clip duration';
    case 'delete_clip':
      return 'Delete clip from timeline';
    case 'split_clip':
      return `Split clip at ${op.splitTime.toFixed(1)}s`;
    case 'move_clip':
      return `Move clip to ${op.newStartTime.toFixed(1)}s`;
    case 'reorder_clip':
      return op.newTrackId ? `Move clip to ${op.newTrackId}` : `Move clip to ${op.newStartTime.toFixed(1)}s`;
    case 'add_track':
      return `Add ${op.type} track (${op.trackId})`;
    case 'delete_track':
      return `Delete track ${op.trackId}`;
    case 'resolve_overlaps':
      return 'Resolve track overlaps';
    case 'set_speed':
      return `Set playback speed to ${op.speed}x`;
    case 'add_transition':
      return `Add ${op.type} transition (${op.position})`;
    case 'remove_transition':
      return `Remove transition (${op.position})`;
    case 'add_caption':
      return `Add caption: "${op.caption.text.slice(0, 24)}"`;
    case 'edit_caption':
      return 'Edit caption';
    case 'delete_caption':
      return 'Delete caption';
    case 'add_keyframe':
      return `Add ${op.keyframe?.property || 'motion'} keyframe`;
    case 'delete_keyframe':
      return `Delete keyframe at ${op.time}s`;
    case 'set_transform':
      return 'Adjust clip scale / position';
    case 'set_adjust':
      return 'Adjust color grading';
    case 'set_volume':
      return `Set audio volume (${op.volume}dB)`;
    case 'set_audio_settings':
      return 'Adjust audio properties';
    case 'replace_asset':
      return 'Replace media asset';
    case 'add_clip':
      return 'Add clip to timeline';
    case 'batch_operations':
      return op.description || 'Batch timeline edit';
    default:
      return 'Timeline edit';
  }
}

/**
 * Extracts target clipId if affected by operation
 */
export function getAffectedClipId(op: Operation): string | undefined {
  if ('clipId' in op && typeof op.clipId === 'string') {
    return op.clipId;
  }
  if (op.op === 'add_clip' && op.clip?.clipId) {
    return op.clip.clipId;
  }
  if (op.op === 'batch_operations' && op.operations.length > 0) {
    for (const sub of op.operations) {
      const found = getAffectedClipId(sub);
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * Undo operation returning updated document and the action that was reverted
 */
export function undoOperation(doc: ProjectDocument): { document: ProjectDocument; action: OperationLog | null } {
  if (!doc.history || doc.history.past.length === 0) {
    return { document: doc, action: null };
  }
  const newDoc = clone(doc);
  const lastAction = newDoc.history.past.pop()!;

  // High-fidelity restoration using stored snapshot if available
  if (lastAction.timelineSnapshotBefore) {
    newDoc.timeline = clone(lastAction.timelineSnapshotBefore);
    recalculateTimelineDuration(newDoc);
    newDoc.updatedAt = new Date().toISOString();
  } else {
    // Inverse fallback
    try {
      const result = applyOperation(newDoc, lastAction.inverse, false);
      newDoc.timeline = result.document.timeline;
      newDoc.manifest = result.document.manifest;
      newDoc.assets = result.document.assets;
      newDoc.updatedAt = new Date().toISOString();
    } catch (err) {
      console.warn('Inverse application fallback error:', err);
    }
  }

  if (!newDoc.history.future) {
    newDoc.history.future = [];
  }
  newDoc.history.future.push(lastAction);
  return { document: newDoc, action: lastAction };
}

/**
 * Redo operation returning updated document and the action that was reapplied
 */
export function redoOperation(doc: ProjectDocument): { document: ProjectDocument; action: OperationLog | null } {
  if (!doc.history || doc.history.future.length === 0) {
    return { document: doc, action: null };
  }
  const newDoc = clone(doc);
  const nextAction = newDoc.history.future.pop()!;

  // High-fidelity restoration using stored snapshot if available
  if (nextAction.timelineSnapshotAfter) {
    newDoc.timeline = clone(nextAction.timelineSnapshotAfter);
    recalculateTimelineDuration(newDoc);
    newDoc.updatedAt = new Date().toISOString();
  } else {
    // Operation fallback
    try {
      const result = applyOperation(newDoc, nextAction.op, false);
      newDoc.timeline = result.document.timeline;
      newDoc.manifest = result.document.manifest;
      newDoc.assets = result.document.assets;
      newDoc.updatedAt = new Date().toISOString();
    } catch (err) {
      console.warn('Redo application fallback error:', err);
    }
  }

  if (!newDoc.history.past) {
    newDoc.history.past = [];
  }
  newDoc.history.past.push(nextAction);
  return { document: newDoc, action: nextAction };
}

/**
 * Jump (time travel) to a specific step in history
 * If isTargetFuture is true: targetIndex is in future array (0 = immediate next redo, etc.)
 * If isTargetFuture is false: targetIndex is in past array (0 = oldest edit, length-1 = most recent)
 */
export function jumpToHistoryStep(
  doc: ProjectDocument,
  targetIndex: number,
  isTargetFuture: boolean
): { document: ProjectDocument; targetAction: OperationLog | null } {
  let currentDoc = doc;
  let lastAction: OperationLog | null = null;

  if (isTargetFuture) {
    // User wants to redo multiple steps until and including targetIndex in future
    const stepsToRedo = targetIndex + 1;
    for (let i = 0; i < stepsToRedo; i++) {
      const res = redoOperation(currentDoc);
      if (!res.action) break;
      currentDoc = res.document;
      lastAction = res.action;
    }
  } else {
    // User wants to revert back to past[targetIndex]
    // Steps to undo is: past.length - 1 - targetIndex
    const currentPastLen = currentDoc.history?.past.length || 0;
    const stepsToUndo = currentPastLen - 1 - targetIndex;
    for (let i = 0; i < stepsToUndo; i++) {
      const res = undoOperation(currentDoc);
      if (!res.action) break;
      currentDoc = res.document;
      lastAction = res.action;
    }
  }

  return { document: currentDoc, targetAction: lastAction };
}

/**
 * Clear all history stacks
 */
export function clearProjectHistory(doc: ProjectDocument): ProjectDocument {
  const newDoc = clone(doc);
  newDoc.history = { past: [], future: [] };
  newDoc.updatedAt = new Date().toISOString();
  return newDoc;
}

/**
 * Backward-compatible undo function
 */
export function undo(doc: ProjectDocument): ProjectDocument {
  return undoOperation(doc).document;
}

/**
 * Backward-compatible redo function
 */
export function redo(doc: ProjectDocument): ProjectDocument {
  return redoOperation(doc).document;
}
