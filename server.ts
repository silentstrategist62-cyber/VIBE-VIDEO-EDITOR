import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { ProjectDocument, Operation, EditorSkill } from './src/types/project';
import { executeSkillAction } from './src/features/skills/actionLayer';
import { DEFAULT_EDITOR_SKILLS } from './src/data/defaultSkills';
import { createInitialDemoProject } from './src/data/sampleProject';
import { runAutonomousAssembly, AssemblyInputs } from './src/services/autonomousAssembler';
import { applyOperation } from './src/services/operationApplier';

dotenv.config();

const PORT = 3000;

// Persistence: JSON file-based storage
const DATA_DIR = path.join(process.cwd(), 'data');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const SKILLS_FILE = path.join(DATA_DIR, 'skills.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadProjectsFromDisk(): Map<string, ProjectDocument> {
  ensureDataDir();
  try {
    if (fs.existsSync(PROJECTS_FILE)) {
      const raw = fs.readFileSync(PROJECTS_FILE, 'utf-8');
      const arr: ProjectDocument[] = JSON.parse(raw);
      const map = new Map<string, ProjectDocument>();
      arr.forEach((p) => map.set(p.projectId, p));
      console.log(`[Persistence] Loaded ${map.size} projects from disk.`);
      return map;
    }
  } catch (e) {
    console.warn('[Persistence] Failed to load projects from disk:', e);
  }
  return new Map();
}

function saveProjectsToDisk(store: Map<string, ProjectDocument>) {
  try {
    ensureDataDir();
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(Array.from(store.values()), null, 2), 'utf-8');
  } catch (e) {
    console.warn('[Persistence] Failed to save projects to disk:', e);
  }
}

function loadSkillsFromDisk(): Map<string, EditorSkill> {
  ensureDataDir();
  try {
    if (fs.existsSync(SKILLS_FILE)) {
      const raw = fs.readFileSync(SKILLS_FILE, 'utf-8');
      const arr: EditorSkill[] = JSON.parse(raw);
      const map = new Map<string, EditorSkill>();
      arr.forEach((s) => map.set(s.id, s));
      console.log(`[Persistence] Loaded ${map.size} skills from disk.`);
      return map;
    }
  } catch (e) {
    console.warn('[Persistence] Failed to load skills from disk:', e);
  }
  return new Map();
}

function saveSkillsToDisk(store: Map<string, EditorSkill>) {
  try {
    ensureDataDir();
    fs.writeFileSync(SKILLS_FILE, JSON.stringify(Array.from(store.values()), null, 2), 'utf-8');
  } catch (e) {
    console.warn('[Persistence] Failed to save skills to disk:', e);
  }
}

// Load persisted data
const projectsStore: Map<string, ProjectDocument> = loadProjectsFromDisk();
const skillsStore: Map<string, EditorSkill> = loadSkillsFromDisk();

async function startServer() {
  // fall back to demo project if nothing saved
  if (projectsStore.size === 0) {
    const initialDemo = createInitialDemoProject();
    projectsStore.set(initialDemo.projectId, initialDemo);
    saveProjectsToDisk(projectsStore);
  }

  if (skillsStore.size === 0) {
    DEFAULT_EDITOR_SKILLS.forEach((skill) => {
      skillsStore.set(skill.id, { ...skill });
    });
    saveSkillsToDisk(skillsStore);
  }

  const app = express();
  app.use(express.json({ limit: '50mb' }));

  // Initialize Gemini AI client lazily
  let aiClient: GoogleGenAI | null = null;
  function getAiClient(): GoogleGenAI | null {
    if (!aiClient && process.env.GEMINI_API_KEY) {
      try {
        aiClient = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });
      } catch (err) {
        console.warn('Failed to initialize GoogleGenAI client:', err);
      }
    }
    return aiClient;
  }

  function getAiClientForKey(overrideApiKey?: string): GoogleGenAI | null {
    const keyToUse = overrideApiKey || process.env.GEMINI_API_KEY;
    if (!keyToUse) return null;
    try {
      return new GoogleGenAI({
        apiKey: keyToUse,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });
    } catch {
      return null;
    }
  }

  // --- API Routes ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString(), projectsCount: projectsStore.size });
  });

  // Test API Key
  app.post('/api/test-key', async (req, res) => {
    const { provider, apiKey, model, baseUrl } = req.body;
    if (!apiKey) {
      return res.status(400).json({ valid: false, error: 'No API key provided' });
    }

    try {
      if (provider === 'gemini') {
        const testClient = new GoogleGenAI({ apiKey });
        const models = ['gemini-2.5-flash', 'gemini-3.6-flash', 'gemini-3.5-flash'];
        let lastError = '';
        for (const m of models) {
          try {
            const result = await testClient.models.generateContent({
              model: m,
              contents: 'Reply with the word OK.',
            });
            if (result.text) {
              return res.json({ valid: true });
            }
          } catch (err: any) {
            const errStr = err.message || String(err);
            lastError = errStr;
            if (errStr.includes('RESOURCE_EXHAUSTED') || errStr.includes('quota')) {
              return res.json({ valid: true, warning: 'Key is valid but free quota reached.' });
            }
          }
        }
        return res.json({ valid: false, error: `All Gemini models failed. Last error: ${lastError}` });
      }

      if (['groq', 'openrouter', 'openai', 'deepseek'].includes(provider)) {
        let endpoint = '';
        let modelToUse = model;
        if (provider === 'groq') {
          endpoint = 'https://api.groq.com/openai/v1/chat/completions';
          modelToUse = model || 'llama-3.3-70b-versatile';
        } else if (provider === 'openrouter') {
          endpoint = 'https://openrouter.ai/api/v1/chat/completions';
          modelToUse = model || 'google/gemini-2.5-flash:free';
        } else if (provider === 'openai') {
          endpoint = 'https://api.openai.com/v1/chat/completions';
          modelToUse = model || 'gpt-4o-mini';
        } else if (provider === 'deepseek') {
          endpoint = 'https://api.deepseek.com/chat/completions';
          modelToUse = model || 'deepseek-chat';
        }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        };
        if (provider === 'openrouter') {
          headers['HTTP-Referer'] = 'http://localhost:3000';
          headers['X-Title'] = 'Autonomous Video Editor';
        }
        const resp = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: modelToUse,
            messages: [{ role: 'user', content: 'Reply OK' }],
            max_tokens: 10,
          }),
        });
        const data: any = await resp.json();
        if (data.choices?.[0]?.message?.content) {
          return res.json({ valid: true });
        }
        return res.json({ valid: false, error: data.error?.message || 'Invalid response from API' });
      }

      return res.json({ valid: true });
    } catch (err: any) {
      return res.json({ valid: false, error: err.message });
    }
  });

  // 1. List Projects
  app.get('/api/projects', (req, res) => {
    const list = Array.from(projectsStore.values()).map((p) => ({
      projectId: p.projectId,
      name: p.name,
      updatedAt: p.updatedAt,
      createdAt: p.createdAt,
      duration: p.timeline.duration,
      clipCount: p.timeline.tracks.reduce((acc, t) => acc + t.clips.length, 0),
      aspectRatio: p.settings?.aspectRatio || '9:16',
      tracksCount: p.timeline.tracks.length,
    }));
    res.json(list);
  });

  // 2. Get Project
  app.get('/api/projects/:id', (req, res) => {
    const project = projectsStore.get(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  });

  // 3. Create or Save Project
  app.post('/api/projects', (req, res) => {
    const project: ProjectDocument = req.body;
    if (!project || !project.projectId) {
      return res.status(400).json({ error: 'Invalid project payload' });
    }
    project.updatedAt = new Date().toISOString();
    projectsStore.set(project.projectId, project);
    saveProjectsToDisk(projectsStore);
    res.status(201).json(project);
  });

  app.put('/api/projects/:id', (req, res) => {
    const project: ProjectDocument = req.body;
    if (!project) {
      return res.status(400).json({ error: 'Invalid project payload' });
    }
    project.updatedAt = new Date().toISOString();
    projectsStore.set(req.params.id, project);
    saveProjectsToDisk(projectsStore);
    res.json(project);
  });

  app.delete('/api/projects/:id', (req, res) => {
    projectsStore.delete(req.params.id);
    saveProjectsToDisk(projectsStore);
    res.json({ success: true, deletedId: req.params.id });
  });

  // 4. Autonomous Assembly Engine API (PART 5)
  app.post('/api/assemble', async (req, res) => {
    try {
      const inputs: AssemblyInputs = req.body;
      if (!inputs.scriptText || !inputs.audioAsset || !inputs.imageAssets) {
        return res.status(400).json({ error: 'Missing required inputs (scriptText, audioAsset, or imageAssets)' });
      }

      // AI Agent "Thinking" state delay for simulated Whisper transcription processing
      await new Promise(resolve => setTimeout(resolve, 3500));

      const result = runAutonomousAssembly(inputs);
      projectsStore.set(result.project.projectId, result.project);
      saveProjectsToDisk(projectsStore);
      res.json(result);
    } catch (err: any) {
      console.error('Autonomous assembly failed:', err);
      res.status(500).json({ error: err.message || 'Assembly failed' });
    }
  });

  // 4b. Skills Management API (Claude-style rule definitions for editing activities)
  app.get('/api/skills', (req, res) => {
    res.json(Array.from(skillsStore.values()));
  });

  app.post('/api/skills', (req, res) => {
    const payload = req.body;
    if (Array.isArray(payload)) {
      payload.forEach((skill: EditorSkill) => {
        if (skill && skill.id) {
          skillsStore.set(skill.id, skill);
        }
      });
      saveSkillsToDisk(skillsStore);
      return res.json(Array.from(skillsStore.values()));
    }

    const skill: EditorSkill = payload;
    if (!skill || !skill.id || !skill.name) {
      return res.status(400).json({ error: 'Valid skill with id and name is required' });
    }
    skill.updatedAt = new Date().toISOString();
    skillsStore.set(skill.id, skill);
    saveSkillsToDisk(skillsStore);
    res.status(201).json(skill);
  });

  app.put('/api/skills/:id', (req, res) => {
    const skill: EditorSkill = req.body;
    if (!skill || !skill.name) {
      return res.status(400).json({ error: 'Valid skill with name is required' });
    }
    skill.id = req.params.id;
    skill.updatedAt = new Date().toISOString();
    skillsStore.set(req.params.id, skill);
    saveSkillsToDisk(skillsStore);
    res.json(skill);
  });

  app.delete('/api/skills/:id', (req, res) => {
    const id = req.params.id;
    skillsStore.delete(id);
    saveSkillsToDisk(skillsStore);
    res.json({ success: true, deletedId: id });
  });

  app.post('/api/skills/reset', (req, res) => {
    skillsStore.clear();
    DEFAULT_EDITOR_SKILLS.forEach((skill) => {
      skillsStore.set(skill.id, { ...skill });
    });
    saveSkillsToDisk(skillsStore);
    res.json(Array.from(skillsStore.values()));
  });

  // 5. Prompt-Driven Editing Service (Multi-turn conversational AI editor with free-tier model)
  app.post('/api/prompt-edit', async (req, res) => {
    const { instruction, project, history, skills, apiKeyConfig } = req.body as {
      instruction: string;
      project: ProjectDocument;
      history?: Array<{ role: string; text?: string; message?: string }>;
      skills?: EditorSkill[];
      apiKeyConfig?: { provider: string; apiKey: string; model?: string; baseUrl?: string } | null;
    };

    if (!instruction || !project) {
      return res.status(400).json({ error: 'instruction and project are required' });
    }

    // Resolve active enabled skills from request, project settings, or global skills store
    const resolvedSkills: EditorSkill[] = skills && skills.length > 0
      ? skills
      : project.skills && project.skills.length > 0
      ? project.skills
      : project.settings?.skills && project.settings.skills.length > 0
      ? project.settings.skills
      : Array.from(skillsStore.values());

    const activeSkills = resolvedSkills.filter((s) => s.enabled);

    // Build timeline context for the LLM
    const timelineClips = project.timeline.tracks.flatMap((t) =>
      t.clips.map((c) => ({
        clipId: c.clipId,
        trackId: c.trackId,
        startTime: c.startTime,
        duration: c.duration,
        sourceIn: c.sourceIn,
        sourceOut: c.sourceOut,
        sourceRef: c.sourceRef,
        speed: c.audio?.speed ?? 1.0,
        volume: c.audio?.volume ?? 0,
        hasTransitionIn: !!c.transitionIn,
        hasTransitionOut: !!c.transitionOut,
      }))
    );

    // Build available media assets context for the LLM
    const availableAssets = Object.values(project.assets || {}).map((asset) => ({
      assetId: asset.assetId,
      filename: asset.filename,
      type: asset.type,
      duration: asset.duration,
    }));

    const geminiKey = apiKeyConfig?.provider === 'gemini' && apiKeyConfig.apiKey ? apiKeyConfig.apiKey.trim() : undefined;
    const groqKey = apiKeyConfig?.provider === 'groq' && apiKeyConfig.apiKey ? apiKeyConfig.apiKey.trim() : process.env.GROQ_API_KEY;
    const client = getAiClientForKey(geminiKey) || getAiClient();
    const provider = apiKeyConfig?.provider || 'gemini';
    const usingCustomLlm = ['groq', 'openrouter', 'openai', 'deepseek'].includes(provider);
    const customKey = apiKeyConfig?.apiKey?.trim() || '';

    console.log(`[LLM] Provider: ${provider}, key-len: ${(geminiKey || customKey || '').length}`);
    let operations: Operation[] = [];
    let assistantMessage = '';
    let agentThinking = '';
    let llmHandled = false;
    let lastModelError = '';

    // --- OPENAI-COMPATIBLE BRANCH (Groq, OpenRouter, OpenAI, DeepSeek) ---
    if (usingCustomLlm && customKey) {
      try {
        const customSkillsSection = activeSkills.length > 0
          ? '\n\nACTIVE SKILLS:\n' + activeSkills.map((s, idx) => `### SKILL ${idx + 1}: ${s.name} [Category: ${s.category.toUpperCase()}]\nTarget Activity: ${s.activity}\nDescription: ${s.description}\nRules:\n${s.rules}`).join('\n\n')
          : '';

        const customSystemPrompt = `You are an Autonomous Video Editor with TOTAL CONTROL over the timeline. DO THE ACTUAL WORK — generate real JSON operations to manipulate the timeline.

CURRENT TIMELINE: ${project.timeline.duration}s duration
CLIPS: ${JSON.stringify(timelineClips)}
MEDIA BIN: ${JSON.stringify(availableAssets)}

ENFORCED WORKFLOW FOR VIDEO ASSEMBLY:
Regardless of the skill deployed, you MUST follow this strict step-by-step assembly workflow when creating a video from scratch:
STEP 1 - CONFIRM INPUTS: Look at the MEDIA BIN and the chat history. In your "message", you MUST report back whether you see the script, audio, images, and videos in your radar.
STEP 2 - SEPARATE MEDIA: In your "thinking", separate image media from audio media.
STEP 3 - EXTRACT & CLEAN NAMES: Extract the filenames. Clean the image filenames by removing underscores, trailing numbers, and timestamps (e.g., "The_printing_company_shipped_him_2K_20260916164450" becomes "The printing company shipped him").
STEP 4 - ORGANIZE CHRONOLOGICALLY: Organize the cleaned image names in the exact chronological order of the script. Note: Image names are capped at a maximum of 5 words, so they are cut off snippets of the script. Store this ordered list in your thinking.
STEP 5 - PLACE AUDIO & TRANSCRIBE: Use "add_clip" to put the audio on the timeline. If you do not have the word-level transcript yet, you MUST emit the "request_transcription" operation simultaneously to send the audio to Whisper. Wait for the transcript to be returned in the next turn.
STEP 6 - COMPARE & PLACE IMAGES: Once you receive the transcript, compare it against your organized image list. Place the images on the timeline in order ("add_clip").
STEP 7 - EXACT DURATIONS (STRETCH/CONTRACT): Calculate the exact duration for each image. The duration of Image 1 must stretch exactly to the start time of where the sentence for Image 2 begins in the transcript.
STEP 8 - APPLY CAPTIONS: Use the transcript and skill rules to generate and style captions.

OUTPUT: ONLY a valid JSON object: {"thinking":"<step-by-step reasoning>","message":"<response to user>","operations":[<Operation objects or []>]}

OPERATIONS: add_clip, trim_clip, delete_clip, move_clip, split_clip, set_speed, add_transition, remove_transition, set_transform, set_adjust, set_volume, add_keyframe, request_transcription, batch_operations.

add_clip format: {"op":"add_clip","clip":{"clipId":"<unique>","assetId":"<from media bin>","trackId":"V1","startTime":<s>,"duration":<s>,"sourceIn":0,"sourceOut":<s>,"transform":{"scale":1,"positionX":0,"positionY":0,"opacity":100},"keyframes":[]}}
request_transcription format: {"op":"request_transcription","assetId":"<audio-asset-id>"} (Use this FIRST if you need to read the spoken words of an audio file to align images to it. The system will auto-transcribe and return the text to you).${customSkillsSection}`;

        const customMessages = [
          { role: 'system', content: customSystemPrompt },
          ...((history || []).slice(-8)
            .filter((h: any) => h.role !== 'system' && (h.text || h.message))
            .map((h: any) => ({ role: h.role === 'user' ? 'user' : 'assistant', content: (h.text || h.message || '').trim() }))),
          { role: 'user', content: instruction },
        ];

        let endpoint = '';
        let customModels: string[] = [];

        if (provider === 'groq') {
          endpoint = 'https://api.groq.com/openai/v1/chat/completions';
          customModels = ['llama-3.3-70b-versatile', 'llama-3.1-70b-versatile'];
        } else if (provider === 'openrouter') {
          endpoint = 'https://openrouter.ai/api/v1/chat/completions';
          customModels = ['google/gemini-2.5-flash:free', 'qwen/qwen-2.5-72b-instruct:free', 'cognitivecomputations/dolphin3.0-r1-mistral-24b:free'];
        } else if (provider === 'openai') {
          endpoint = 'https://api.openai.com/v1/chat/completions';
          customModels = [apiKeyConfig?.modelName || 'gpt-4o', 'gpt-4o-mini'];
        } else if (provider === 'deepseek') {
          endpoint = 'https://api.deepseek.com/chat/completions';
          customModels = ['deepseek-chat', 'deepseek-reasoner'];
        }

        for (const model of customModels) {
          try {
            const headers: Record<string, string> = {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${customKey}`,
            };
            if (provider === 'openrouter') {
              headers['HTTP-Referer'] = 'http://localhost:3000';
              headers['X-Title'] = 'Autonomous Video Editor';
            }

            const res = await fetch(endpoint, {
              method: 'POST',
              headers,
              body: JSON.stringify({ model, messages: customMessages, temperature: 0.7, response_format: { type: 'json_object' } }),
            });
            const data: any = await res.json();
            const text = data?.choices?.[0]?.message?.content?.trim();
            
            if (text) {
              console.log(`[LLM] ${provider} success: ${model}`);
              let parsed: any;
              try { parsed = JSON.parse(text); } catch { parsed = null; }
              if (parsed) {
                agentThinking = parsed.thinking || '';
                const rawOps = Array.isArray(parsed.operations) ? parsed.operations : [];
                const allClips = project.timeline.tracks.flatMap((t: any) => t.clips);
                for (const op of rawOps) {
                  if (op.op === 'execute_skill_action') {
                    const targetClips = op.clipIds ? allClips.filter((c: any) => op.clipIds.includes(c.clipId)) : allClips.slice(0, 1);
                    if (targetClips.length > 0) operations.push(...executeSkillAction(op.actionType, op.variant, targetClips, op.params));
                  } else { operations.push(op); }
                }
                assistantMessage = parsed.message || parsed.explanation || (operations.length > 0 ? "Done — timeline updated." : "Ready. What would you like to do?");
                llmHandled = true;
                break;
              }
            } else if (data?.error) {
              lastModelError = data.error.message || JSON.stringify(data.error);
              console.error(`[LLM] ${provider} ${model} error:`, lastModelError);
            }
          } catch (err: any) {
            lastModelError = err.message;
            console.error(`[LLM] ${provider} ${model} failed:`, lastModelError);
          }
        }
      } catch (err: any) {
        lastModelError = err.message;
        console.error(`[LLM] ${provider} error:`, lastModelError);
      }
    }

    if (client && !llmHandled) {
      try {
        const skillsSection = activeSkills.length > 0
          ? `\n\nUSER-DEFINED SKILLS & EXECUTION RULES (CLAUDE-STYLE):
The user has configured explicit editing skills with plain English rules on how specific activities MUST be executed.
You MUST strictly follow and prioritize these execution rules whenever analyzing the cut, giving creative advice, or generating timeline operations:

${activeSkills.map((s, idx) => `### SKILL ${idx + 1}: ${s.name} [Category: ${s.category.toUpperCase()}]
Target Activity: ${s.activity}
Description: ${s.description}
Rules:
${s.rules}`).join('\n\n')}
`
          : '';

        const systemPrompt = `You are a highly intelligent, passionate, and articulate professional filmmaker and creative co-editor. You are collaborating with the user on their video project.

YOUR ROLE & HOW YOU COMMUNICATE:
- You have TOTAL CONTROL over the timeline. You are not a passive assistant; you are an autonomous AI Video Editor.
- DO THE ACTUAL WORK. If the user asks you to edit, assemble, or create something, DO NOT just return text explaining what you *would* do. You MUST generate the actual JSON \`operations\` to manipulate the timeline. 
- If the timeline is empty, pull assets from the PROJECT MEDIA BIN and use the \`add_clip\` operation to put them on the timeline. First, put the audio on the timeline. Then, arrange the images sequentially on top.
- ALWAYS ask the user questions first to understand their creative vision before making irreversible massive changes, but if they give you media and tell you to go, DO THE WORK. Always end your message with a question to engage them.
- If the user mentions a specific SKILL by name, you MUST read its rules completely from the context below and apply them flawlessly.

ENFORCED WORKFLOW FOR VIDEO ASSEMBLY:
Regardless of the skill deployed, you MUST follow this strict step-by-step assembly workflow when creating a video from scratch:
STEP 1 - CONFIRM INPUTS: Look at the MEDIA BIN and the chat history. In your "message", you MUST report back whether you see the script, audio, images, and videos in your radar.
STEP 2 - SEPARATE MEDIA: In your "thinking", separate image media from audio media.
STEP 3 - EXTRACT & CLEAN NAMES: Extract the filenames. Clean the image filenames by removing underscores, trailing numbers, and timestamps (e.g., "The_printing_company_shipped_him_2K_20260916164450" becomes "The printing company shipped him").
STEP 4 - ORGANIZE CHRONOLOGICALLY: Organize the cleaned image names in the exact chronological order of the script. Note: Image names are capped at a maximum of 5 words, so they are cut off snippets of the script. Store this ordered list in your thinking.
STEP 5 - PLACE AUDIO & TRANSCRIBE: Use "add_clip" to put the audio on the timeline. If you do not have the word-level transcript yet, you MUST emit the "request_transcription" operation simultaneously to send the audio to Whisper. Wait for the transcript to be returned in the next turn.
STEP 6 - COMPARE & PLACE IMAGES: Once you receive the transcript, compare it against your organized image list. Place the images on the timeline in order ("add_clip").
STEP 7 - EXACT DURATIONS (STRETCH/CONTRACT): Calculate the exact duration for each image. The duration of Image 1 must stretch exactly to the start time of where the sentence for Image 2 begins in the transcript.
STEP 8 - APPLY CAPTIONS: Use the transcript and skill rules to generate and style captions.

CURRENT TIMELINE STATE:
- Total Duration: ${project.timeline.duration}s
- Available Tracks & Clips:
${JSON.stringify(timelineClips, null, 2)}

PROJECT MEDIA BIN (AVAILABLE UPLOADED ASSETS):
${JSON.stringify(availableAssets, null, 2)}

SUPPORTED TIMELINE OPERATIONS:
1. Trim clip:
   { "op": "trim_clip", "clipId": "<id>", "sourceIn": <seconds>, "sourceOut": <seconds>, "duration": <seconds> }
2. Delete clip:
   { "op": "delete_clip", "clipId": "<id>" }
3. Split clip:
   { "op": "split_clip", "clipId": "<id>", "splitTime": <timelineSecond> }
4. Move clip:
   { "op": "move_clip", "clipId": "<id>", "newStartTime": <timelineSecond> }
5. Adjust speed:
   { "op": "set_speed", "clipId": "<id>", "speed": <multiplier, e.g. 1.5, 2.0, 0.75>, "maintainPitch": true }
6. Add transition:
   { "op": "add_transition", "clipId": "<id>", "position": "in"|"out", "type": "crossfade"|"dipToBlack"|"wipeLeft"|"zoomBlur"|"glitch", "duration": 0.3 }
7. Remove transition:
   { "op": "remove_transition", "clipId": "<id>", "position": "in"|"out" }
8. Transform:
   { "op": "set_transform", "clipId": "<id>", "transform": { "scale": 1.15, "positionX": 0, "positionY": 0, "opacity": 100 } }
9. Color grading adjustment:
   { "op": "set_adjust", "clipId": "<id>", "adjust": { "brightness": 10, "contrast": 15, "saturation": 20, "vignette": 25 } }
10. Audio volume:
    { "op": "set_volume", "clipId": "<id>", "volume": -6.0 }
11. Add keyframe:
    { "op": "add_keyframe", "clipId": "<id>", "keyframe": { "property": "scale"|"positionX"|"positionY"|"opacity", "time": <seconds>, "value": <number>, "easing": "easeInOut" } }
12. Batch operations:
    { "op": "batch_operations", "operations": [ ...subOperations ], "description": "<summary>" }
13. Execute High-Level Skill Action:
    { "op": "execute_skill_action", "actionType": "cut"|"add_transition"|"add_caption"|"insert_broll"|"adjust_pacing"|"apply_color", "variant": "<variant_string>", "clipIds": ["<id1>", "<id2>"], "params": {} }
14. Add media clip to timeline:
    { "op": "add_clip", "clip": { "clipId": "<unique_id>", "assetId": "<assetId_from_media_bin>", "trackId": "V1", "startTime": <seconds>, "duration": <seconds>, "sourceIn": 0, "sourceOut": <seconds>, "transform": { "scale": 1, "positionX": 0, "positionY": 0, "opacity": 100 }, "keyframes": [] } }
15. Request Audio Transcription:
    { "op": "request_transcription", "assetId": "<assetId_from_media_bin>" } (Use this FIRST if you need to read the spoken words of an audio file to align images to it. The system will auto-transcribe and return the text to you).

OUTPUT SPECIFICATION:
You must output ONLY a valid JSON object matching:
{
  "thinking": "<your detailed, step-by-step reasoning of how you interpret the user's intent, evaluate the timeline state, and decide on the exact editing operations>",
  "message": "<your natural, conversational response answering the user's questions or speaking as a human creative collaborator>",
  "operations": [ <array of valid Operation objects if an edit is requested, or [] if conversing/brainstorming/advising> ]
}

CRITICAL RULES:
- Output ONLY valid JSON.
- ALWAYS populate the "thinking" field with your genuine chain-of-thought.
- ALWAYS populate the "message" field with your response to the user.
- If the user is just saying hello, asking a question, or exploring concepts, set "operations": [].
- When applying an edit, always reference real clipIds from the provided context.
- Strictly adhere to any active user-defined skill rules below.${skillsSection}`;

        // Format multi-turn message history with proper alternating roles
        const contents: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
        if (Array.isArray(history)) {
          for (const item of history.slice(-8)) {
            if (item.role === 'system') continue;
            const textContent = (item.text || item.message || '').trim();
            if (!textContent) continue;
            const role = item.role === 'user' ? 'user' : 'model';
            if (contents.length > 0 && contents[contents.length - 1].role === role) {
              contents[contents.length - 1].parts[0].text += '\n' + textContent;
            } else {
              contents.push({
                role,
                parts: [{ text: textContent }],
              });
            }
          }
        }

        // Gemini multi-turn requires the first turn to be 'user'
        while (contents.length > 0 && contents[0].role !== 'user') {
          contents.shift();
        }

        if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
          contents[contents.length - 1].parts[0].text += '\n' + instruction;
        } else {
          contents.push({ role: 'user', parts: [{ text: instruction }] });
        }

        // Model priority: highest free-tier daily quota first
        // gemini-2.5-flash: 500 RPD | gemini-3.6-flash: 20 RPD (all use v1beta default)
        const modelsToTry = [
          'gemini-2.5-flash',      // 500 requests/day free
          'gemini-3.6-flash',      // 20 requests/day free
          'gemini-3.5-flash',      // fallback
        ];
        let response: any = null;

        for (const model of modelsToTry) {
          try {
            const geminiPromise = client.models.generateContent({
              model,
              contents,
              config: {
                systemInstruction: systemPrompt,
                temperature: 0.7,
                responseMimeType: "application/json",
              },
            });

            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Gemini call timed out')), 25000)
            );

            response = await Promise.race([geminiPromise, timeoutPromise]);
            if (response?.text) {
              console.log(`[LLM] Success with model: ${model}`);
              break;
            }
          } catch (_modelErr: any) {
            lastModelError = _modelErr.message || String(_modelErr);
            console.error(`[LLM] Model ${model} failed:`, lastModelError);
          }
        }

        let text = response?.text?.trim();
        if (text) {
          // Clean up markdown code blocks if present
          text = text.replace(/^```(json)?\n?/i, '').replace(/\n?```$/i, '').trim();
          
          let parsed;
          try {
            parsed = JSON.parse(text);
          } catch (jsonErr) {
            // Fix unescaped control characters inside JSON strings
            let inString = false;
            let fixedText = '';
            for (let i = 0; i < text.length; i++) {
              const char = text[i];
              if (char === '"' && text[i - 1] !== '\\') {
                inString = !inString;
                fixedText += char;
              } else if (inString && (char === '\n' || char === '\r' || char === '\t')) {
                if (char === '\n') fixedText += '\\n';
                if (char === '\r') fixedText += '\\r';
                if (char === '\t') fixedText += '\\t';
              } else if (!inString && (char < ' ' && char !== '\n' && char !== '\r' && char !== '\t')) {
                // Ignore illegal control chars outside strings
              } else {
                fixedText += char;
              }
            }
            try {
              parsed = JSON.parse(fixedText);
            } catch (err2) {
              console.error('Failed to auto-fix JSON:', err2.message);
              console.error('Raw LLM Output:\n', text);
              throw err2;
            }
          }
          agentThinking = parsed.thinking || '';
          if (Array.isArray(parsed.operations) || Array.isArray(parsed)) {
            const rawOps = Array.isArray(parsed.operations) ? parsed.operations : parsed;
            
            // Expand execute_skill_action pseudo-operations
            const allClips = project.timeline.tracks.flatMap(t => t.clips);
            for (const op of rawOps) {
              if (op.op === 'execute_skill_action') {
                const targetClips = op.clipIds 
                  ? allClips.filter(c => op.clipIds.includes(c.clipId)) 
                  : allClips.slice(0, 1);
                
                if (targetClips.length > 0) {
                  const expanded = executeSkillAction(op.actionType, op.variant, targetClips, op.params);
                  operations.push(...expanded);
                }
              } else {
                operations.push(op);
              }
            }

            assistantMessage = parsed.message || parsed.explanation || parsed.assistantMessage || parsed.response || (operations.length > 0 ? `I've updated the timeline based on what you asked for.` : "I'm right here with you. What direction are you thinking for this cut?");
            llmHandled = true;
          } else if (parsed.message || parsed.explanation || parsed.assistantMessage || parsed.response) {
            assistantMessage = parsed.message || parsed.explanation || parsed.assistantMessage || parsed.response;
            llmHandled = true;
          }
        }
      } catch (err: any) {
        // Fallback to local creative assistant
        console.error('LLM parse error:', err);
      }
    }

    // Heuristic fallback only if LLM is unavailable
    if (!llmHandled) {
      if (!client) {
        assistantMessage = "I cannot answer your question right now because no Gemini API key is configured. Please click the Settings gear to add your API key.";
      } else if (lastModelError.includes('RESOURCE_EXHAUSTED') || lastModelError.includes('quota')) {
        assistantMessage = "⚠️ Your Gemini API free quota has been reached (20 requests/day on free tier). Your key is valid, but you need to wait for the quota to reset or upgrade your Google AI plan at https://aistudio.google.com to continue.";
      } else if (lastModelError) {
        console.error('[LLM] All models failed. Last error:', lastModelError);
        assistantMessage = `I'm sorry, but the AI call failed. Error: ${lastModelError.slice(0, 200)}. Please verify your API key in Settings.`;
      } else {
        assistantMessage = "I'm sorry, something went wrong calling the AI. Please check your API key in Settings and try again.";
      }
      operations = [];
    }

    // Apply operations using the single shared applier
    let updatedDoc = project;
    try {
      for (const op of operations) {
        const result = applyOperation(updatedDoc, op, true, `Prompt Edit: "${instruction}"`);
        updatedDoc = result.document;
      }

      // Log to chatLog
      updatedDoc.chatLog = updatedDoc.chatLog || [];
      const now = new Date().toISOString();
      updatedDoc.chatLog.push({
        id: `chat-u-${Date.now()}`,
        role: 'user',
        message: instruction,
        timestamp: now,
      });
      updatedDoc.chatLog.push({
        id: `chat-a-${Date.now() + 1}`,
        role: 'assistant',
        message: assistantMessage,
        thinking: typeof agentThinking !== 'undefined' ? agentThinking : '',
        timestamp: now,
        operations,
      });

      projectsStore.set(updatedDoc.projectId, updatedDoc);
      saveProjectsToDisk(projectsStore);

      res.json({
        project: updatedDoc,
        operations,
        assistantMessage,
      });
    } catch (applyErr: any) {
      console.error('Failed to apply prompt operations:', applyErr);
      res.status(400).json({
        error: `Could not apply edit: ${applyErr.message}`,
        operations,
      });
    }
  });

  // 6. Audio Transcription Service (Using gemini-3.5-transcribe - Free tier model)
  app.post('/api/transcribe', async (req, res) => {
    const { audioBase64, mimeType, apiKey: requestApiKey } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'Missing audioBase64 payload' });
    }

    const client = getAiClientForKey(requestApiKey) || getAiClient();
    if (client) {
      try {
        const response = await client.models.generateContent({
          model: 'gemini-3.5-transcribe',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: mimeType || 'audio/webm',
                    data: audioBase64,
                  },
                },
                {
                  text: 'Transcribe this spoken audio accurately. Return only the plain transcribed text with no markdown formatting or commentary.',
                },
              ],
            },
          ],
        });

        const transcript = response.text?.trim() || '';
        return res.json({ transcript });
      } catch (err: any) {
        console.warn('Gemini audio transcription error:', err);
      }
    }

    res.json({ transcript: '' });
  });

  // 7. Export notification (actual video rendering is done client-side via Canvas + MediaRecorder)
  app.post('/api/export', (req, res) => {
    const { projectId, settings } = req.body;
    const project = projectsStore.get(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    // Client-side rendering via Canvas captureStream + MediaRecorder handles the actual encode.
    // This endpoint exists for API compatibility and logging purposes only.
    res.json({
      status: 'client_side_export',
      message: 'Export is rendered client-side in the browser using Canvas captureStream + MediaRecorder. Use the Export modal to download.',
      projectId,
      duration: project.timeline.duration,
      resolution: project.settings.resolution,
      fps: project.settings.fps,
    });
  });

  app.get('/api/export/:jobId', (req, res) => {
    res.status(404).json({ error: 'Server-side export downloads are not supported. Use the in-app Export modal to render and download your video.' });
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Autonomous Video Editor server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
