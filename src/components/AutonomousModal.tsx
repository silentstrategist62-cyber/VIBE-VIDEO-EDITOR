import React, { useState, useMemo } from 'react';
import {
  X,
  Sparkles,
  Upload,
  FileText,
  Music,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Play,
  ArrowRight,
} from 'lucide-react';
import { projectStore, useProjectStore } from '../store/projectStore';
import { WORKFLOW_PRESETS } from '../data/presets';
import {
  SAMPLE_SCRIPT_TEXT,
  SAMPLE_AUDIO_ASSET,
  SAMPLE_IMAGE_ASSETS,
  SAMPLE_PROMPTS_TEXT,
} from '../data/sampleProject';
import { parseScriptSegments, extractIdFromFilename } from '../services/autonomousAssembler';
import { MediaAsset, OperationLog } from '../types/project';

export const AutonomousModal: React.FC = () => {
  const { isAutonomousModalOpen, project } = useProjectStore();

  const [selectedPresetId, setSelectedPresetId] = useState('strategist-longform');
  const [projectName, setProjectName] = useState('Autocut_Assemble_01');
  const [scriptText, setScriptText] = useState(SAMPLE_SCRIPT_TEXT);
  const [audioAsset, setAudioAsset] = useState<MediaAsset>(SAMPLE_AUDIO_ASSET);
  const [imageAssets, setImageAssets] = useState<MediaAsset[]>(SAMPLE_IMAGE_ASSETS);
  const [promptsText, setPromptsText] = useState(SAMPLE_PROMPTS_TEXT);
  const [isAssembling, setIsAssembling] = useState(false);

  const preset = useMemo(() => {
    return WORKFLOW_PRESETS.find((p) => p.presetId === selectedPresetId) || WORKFLOW_PRESETS[0];
  }, [selectedPresetId]);

  // Live gap report computation
  const liveGapReport = useMemo(() => {
    const segments = parseScriptSegments(scriptText);
    const imagesById = new Map<string, MediaAsset>();
    for (const img of imageAssets) {
      const id = extractIdFromFilename(img.filename);
      imagesById.set(id, img);
    }

    const matched: string[] = [];
    const missing: string[] = [];

    for (const seg of segments) {
      if (imagesById.has(seg.segmentId)) {
        matched.push(seg.segmentId);
      } else {
        missing.push(seg.segmentId);
      }
    }

    return {
      totalSegments: segments.length,
      matched,
      missing,
    };
  }, [scriptText, imageAssets]);

  if (!isAutonomousModalOpen) return null;

  const handleRunAssembly = async () => {
    setIsAssembling(true);
    try {
      // Call backend assembly engine to simulate AI thinking and processing
      const response = await fetch('/api/assemble', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presetId: selectedPresetId,
          projectName,
          scriptText,
          audioAsset,
          imageAssets,
          promptsText,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Assembly failed on server');
      }

      const result = await response.json();

      const previousTimeline = JSON.parse(JSON.stringify(project.timeline));
      const chosenPreset = WORKFLOW_PRESETS.find((p) => p.presetId === selectedPresetId);
      const description = `Autonomous Assembly: ${chosenPreset?.label || 'Preset'}`;

      const logEntry: OperationLog = {
        id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        op: { op: 'batch_operations', operations: [], description },
        inverse: { op: 'batch_operations', operations: [], description: 'Revert Autonomous Assembly' },
        timestamp: new Date().toISOString(),
        description,
        timelineSnapshotBefore: previousTimeline,
        timelineSnapshotAfter: JSON.parse(JSON.stringify(result.project.timeline)),
      };

      const projectWithHistory = {
        ...result.project,
        history: {
          past: [...(project.history?.past || []), logEntry],
          future: [],
        },
      };

      projectStore.setProject(projectWithHistory);
      projectStore.toggleAutonomousModal(false);
    } catch (err: any) {
      alert(`Assembly failed: ${err.message}`);
    } finally {
      setIsAssembling(false);
    }
  };

  const handleLoadSamplePack = () => {
    setScriptText(SAMPLE_SCRIPT_TEXT);
    setAudioAsset(SAMPLE_AUDIO_ASSET);
    setImageAssets(SAMPLE_IMAGE_ASSETS);
    setPromptsText(SAMPLE_PROMPTS_TEXT);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-3xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Autonomous Workflow Preset Assembly</h2>
              <p className="text-[11px] text-slate-400">
                Consumes raw script, audio & images to build a populated 9:16 timeline.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLoadSamplePack}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-semibold transition-colors"
            >
              Reset Sample Data
            </button>
            <button
              onClick={() => projectStore.toggleAutonomousModal(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* Step 1: Select Preset */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
              1. Choose Workflow Preset
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {WORKFLOW_PRESETS.map((p) => {
                const isSelected = p.presetId === selectedPresetId;
                return (
                  <div
                    key={p.presetId}
                    onClick={() => setSelectedPresetId(p.presetId)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-md'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{p.label}</span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                    </div>

                    {isSelected && (
                      <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-2 animate-fadeIn">
                        <p className="text-[11px] text-slate-400 leading-tight">{p.description}</p>
                        <div className="flex items-center gap-1 text-[9px] font-mono text-slate-500">
                          <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800">
                            {p.pacing.avgClipDuration}s avg
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800">
                            {p.captionStyle}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 2: Script Writing Section */}
          {preset.requiredInputs.includes('script') && (
            <div className="space-y-4 border-t border-slate-800/80 pt-5 mt-5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  2. Script Writing
                </label>
                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                    {liveGapReport.totalSegments} Segments
                  </span>
                </div>
              </div>
              
              <div className="bg-indigo-950/20 border border-indigo-900/30 rounded-xl p-3">
                <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
                  Write or paste your script here. Use <code className="text-indigo-300 bg-indigo-950/50 px-1 rounded">## [ID]</code> to mark segments. 
                  The assembler will automatically pair these segments with image filenames containing the same ID (e.g. <code>## B1</code> matches <code>B1_scene.png</code>).
                </p>
                <textarea
                  rows={6}
                  value={scriptText}
                  onChange={(e) => setScriptText(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 font-mono focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all leading-relaxed"
                  placeholder="## B1&#10;Your first line here...&#10;&#10;## B2&#10;Your second line here..."
                />
              </div>
            </div>
          )}

          {/* Step 3: Media Assets */}
          <div className="space-y-4 border-t border-slate-800/80 pt-5 mt-5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                {preset.requiredInputs.includes('script') ? '3. Media Assets' : '2. Media Assets'}
              </label>
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  {liveGapReport.matched.length} Matched
                </span>
                {liveGapReport.missing.length > 0 && (
                  <span className="flex items-center gap-1 text-amber-400">
                    <AlertTriangle className="w-3 h-3" />
                    {liveGapReport.missing.length} Gaps
                  </span>
                )}
              </div>
            </div>

            {/* Audio Voiceover Input */}
            <div>
              <div className="flex items-center justify-between text-xs text-slate-300 mb-1 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5 text-emerald-400" />
                  Voiceover Audio Track
                </span>
                <span className="text-[10px] font-mono text-emerald-400">
                  {audioAsset.duration}s duration
                </span>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Music className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{audioAsset.filename}</div>
                    <div className="text-[10px] text-slate-400">Precomputed waveform cached (80 samples)</div>
                  </div>
                </div>
                <span className="text-xs font-mono text-slate-400">WAV / MP3</span>
              </div>
            </div>

            {/* Image Assets Gallery & Positional ID Matching */}
            <div>
              <div className="flex items-center justify-between text-xs text-slate-300 mb-2 font-semibold">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                  Images Indexed by Prompt ID ({imageAssets.length} Assets)
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  Positional ID Join (Part 4.2)
                </span>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {imageAssets.map((img) => {
                  const id = extractIdFromFilename(img.filename);
                  const isMatched = liveGapReport.matched.includes(id);

                  return (
                    <div
                      key={img.assetId}
                      className={`relative aspect-[9/16] bg-slate-900 rounded-lg overflow-hidden border ${
                        isMatched ? 'border-emerald-500/50' : 'border-amber-500/50'
                      }`}
                    >
                      <img
                        src={img.url}
                        alt={img.filename}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-black/80 p-1 text-center">
                        <span className="text-[9px] font-mono font-bold text-white">{id}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Output: <span className="text-white font-bold">1080×1920 9:16 Portrait Timeline</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => projectStore.toggleAutonomousModal(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              id="btn-run-assembly"
              onClick={handleRunAssembly}
              disabled={isAssembling}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-950 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isAssembling ? 'Assembling...' : 'Run Autonomous Assembly'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
