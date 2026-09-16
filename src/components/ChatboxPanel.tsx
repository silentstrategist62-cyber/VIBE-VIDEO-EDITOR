import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  RotateCcw,
  ChevronLeft,
  Plus,
  Settings,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  Mic,
  MicOff,
  ArrowUp,
  Palette,
  BookOpen,
  FileText,
  Bot,
  User,
  CheckCircle2,
  ChevronDown,
  GripVertical,
  X,
  Maximize2,
  Minimize2,
  AlertTriangle,
  Zap,
  Sliders,
  Layers,
} from 'lucide-react';
import { projectStore, useProjectStore } from '../store/projectStore';
import { startVoiceInput, TranscriptionSession } from '../services/voiceTranscription';
import { Clip } from '../types/project';
import { useIsMobile } from '../hooks/useIsMobile';
import { EditorSkill } from '../types/skills';

export const ChatboxPanel: React.FC = () => {
  const { project, isChatOpen, isPromptLoading, skills, activeSkillSession, selectedClipId, floatingPanels, chatPanelWidth } = useProjectStore();
  const isMobile = useIsMobile();
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [agentMode, setAgentMode] = useState<'Agent' | 'Director' | 'Editor'>('Agent');
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [reactions, setReactions] = useState<Record<string, 'liked' | 'disliked'>>({});
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);
  const [skillSearchQuery, setSkillSearchQuery] = useState('');
  const [showScriptEditor, setShowScriptEditor] = useState(false);
  const [scriptDraft, setScriptDraft] = useState('');
  const [isResizing, setIsResizing] = useState(false);

  const activeSessionRef = useRef<TranscriptionSession | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const panelWidth = chatPanelWidth || 384;
  const allSkills = skills || [];
  const activeSkillsList = allSkills.filter((s) => s.enabled);
  const primarySkill = activeSkillsList[0]?.name || activeSkillSession?.activeSkillName || 'talking-head-guide';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [project.chatLog, isPromptLoading]);

  // Clean up ongoing audio recording when unmounting
  useEffect(() => {
    return () => {
      if (activeSessionRef.current) {
        activeSessionRef.current.stop();
      }
    };
  }, []);

  // Horizontal resizing drag handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = panelWidth;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const maxAllowed = Math.min(760, Math.round(window.innerWidth * 0.6));
      const newWidth = Math.max(260, Math.min(maxAllowed, startWidth + deltaX));
      projectStore.setChatPanelWidth(newWidth);
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      setIsResizing(false);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      if (upEvent.clientX < 210) {
        projectStore.toggleChat(false);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handleToggleVoice = () => {
    if (isListening) {
      if (activeSessionRef.current) {
        activeSessionRef.current.stop();
        activeSessionRef.current = null;
      }
      setIsListening(false);
    } else {
      setIsListening(true);
      const activeKey = (projectStore.getState().apiKeys || []).find((k) => k.isDefault && k.apiKey)?.apiKey;
      const session = startVoiceInput({
        onTranscript: (finalText) => {
          setInputValue((prev) => (prev ? `${prev} ${finalText}` : finalText));
          setIsListening(false);
        },
        onInterim: (interimText) => {
          setInputValue((prev) => {
            const trimmed = prev.trim();
            return trimmed ? `${trimmed} ${interimText}` : interimText;
          });
        },
        onError: (err) => {
          console.warn('Voice error:', err);
          setIsListening(false);
        },
        onEnd: () => {
          setIsListening(false);
        },
        apiKey: activeKey,
        language: 'en-US', // could be made configurable later
      });
      activeSessionRef.current = session;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputValue(val);

    // Build Spec: When the user types "@", show a small dropdown listing the Skills currently saved in the library
    const lastAtIndex = val.lastIndexOf('@');
    if (lastAtIndex !== -1 && lastAtIndex >= val.length - 20) {
      const query = val.slice(lastAtIndex + 1).toLowerCase();
      setSkillSearchQuery(query);
      setShowSkillDropdown(true);
    } else {
      setShowSkillDropdown(false);
    }
  };

  const handleSelectSkill = (skill: EditorSkill) => {
    const lastAtIndex = inputValue.lastIndexOf('@');
    let newText = '';
    if (lastAtIndex !== -1) {
      newText = `${inputValue.slice(0, lastAtIndex)}@${skill.name} `;
    } else {
      newText = `@${skill.name} ${inputValue}`;
    }

    setInputValue(newText);
    setShowSkillDropdown(false);

    // Activate Skill (checks single-session exclusivity and required inputs)
    projectStore.activateSingleSkill(skill.id);
    inputRef.current?.focus();
  };

  const handleSend = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputValue).trim();
    if (!textToSend || isPromptLoading) return;

    if (isListening && activeSessionRef.current) {
      activeSessionRef.current.stop();
      setIsListening(false);
    }

    // Check if prompt starts with or mentions a skill with "@"
    if (textToSend.includes('@')) {
      const match = textToSend.match(/@([a-zA-Z0-9\s&–-]+)/);
      if (match && match[1]) {
        const skillName = match[1].trim();
        const found = allSkills.find((s) => s.name.toLowerCase().includes(skillName.toLowerCase()));
        if (found) {
          projectStore.activateSingleSkill(found.id);
        }
      }
    }

    setInputValue('');
    setShowMediaPicker(false);
    setShowSkillDropdown(false);
    await projectStore.runPromptEdit(textToSend);
  };

  const handleOptionClick = async (optionText: string) => {
    // Perform concrete timeline actions if the option matches known commands
    const lower = optionText.toLowerCase();
    if (lower.includes('cross dissolve') || lower.includes('transitions')) {
      const vTrack = project.timeline.tracks.find((t) => t.type === 'video');
      if (vTrack) {
        vTrack.clips.forEach((clip, idx) => {
          if (idx > 0) {
            clip.transitionIn = {
              type: lower.includes('dip to black') ? 'dipToBlack' : 'crossfade',
              duration: 0.6,
            };
          }
        });
      }
    }

    if (lower.includes('ken burns') || lower.includes('zoom/pan')) {
      const vTrack = project.timeline.tracks.find((t) => t.type === 'video');
      if (vTrack) {
        vTrack.clips.forEach((clip) => {
          if (clip.transform) {
            clip.transform.scale = 1.08;
          }
          if (clip.adjust) {
            clip.adjust.brightness = (clip.adjust.brightness || 0) + 5;
          }
        });
      }
    }

    await handleSend(optionText);
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleReaction = (msgId: string, type: 'liked' | 'disliked') => {
    setReactions((prev) => ({
      ...prev,
      [msgId]: prev[msgId] === type ? undefined! : type,
    }));
  };

  const handleResetChat = () => {
    projectStore.setProject({
      ...project,
      chatLog: [
        {
          id: `msg-1`,
          role: 'assistant',
          message: 'The total visual track runs the full length of the audio narration.',
          timestamp: new Date().toISOString(),
        },
        {
          id: `msg-2`,
          role: 'user',
          message: 'i want animations on the images and transitions between the images.',
          timestamp: new Date().toISOString(),
        },
        {
          id: `msg-3`,
          role: 'assistant',
          skillTag: 'talking-head-guide',
          message:
            'For animations on images, the two standard techniques are Ken Burns (gentle zoom/pan movement on each still) and transitions between them (cross dissolves, etc.).\n\nWhat would you like?',
          options: [
            'Ken Burns zoom/pan on each image + Cross Dissolve transitions',
            'Ken Burns zoom/pan on each image only (no transitions)',
            'Cross Dissolve transitions only (no movement on images)',
            'A different transition style (e.g. Dip to Black, Flash, Wipe)',
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
  };

  const handleInsertMediaTag = (assetName: string) => {
    setInputValue((prev) => `${prev} @${assetName} `);
    setShowMediaPicker(false);
    inputRef.current?.focus();
  };

  if (!isChatOpen && !floatingPanels?.chat) {
    return null;
  }

  const allAssets = Object.values(project.assets);

  const panelContent = (
    <div
      id="ai-agent-panel"
      style={{
        width: isMobile ? '100%' : (floatingPanels?.chat ? undefined : `${panelWidth}px`),
      }}
      className={`h-full flex flex-col bg-[#0a0a0a] border-r border-white/[0.08] select-none z-20 shrink-0 relative overflow-hidden ${
        isMobile ? 'w-full max-w-full' : ''
      } ${
        isResizing ? 'select-none transition-none' : 'transition-[width] duration-75'
      } ${
        floatingPanels?.chat
          ? 'w-96 max-h-[80vh] rounded-xl border border-[#C9A84C]/30 shadow-2xl overflow-hidden'
          : ''
      }`}
    >
      {/* Single Unified Header */}
      <div className="h-10 px-3 bg-[#0a0a0a] border-b border-white/[0.08] flex items-center justify-between shrink-0 select-none text-xs">
        <div className="flex items-center gap-2 min-w-0">
          {!isMobile && <GripVertical className="w-3 h-3 text-[#4A5260] shrink-0 opacity-70 cursor-grab" />}
          <h2 className="text-xs font-bold text-[#f0f0f2] font-cinzel tracking-wider flex items-center gap-1.5 shrink-0">
            <Bot className="w-3.5 h-3.5 text-[#C9A84C]" />
            <span>AI Agent</span>
          </h2>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#141414] border border-[#C9A84C]/30 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2ECC71] shadow-[0_0_6px_rgba(46,204,113,0.8)] shrink-0" />
            <span className="text-[10px] text-[#E8C97A] font-mono truncate max-w-[110px] sm:max-w-[150px]">
              {primarySkill}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-0.5 shrink-0 text-[#808080]">
          <button
            onClick={handleResetChat}
            className="p-1 hover:text-[#f0f0f2] rounded-md hover:bg-white/[0.04] transition-colors cursor-pointer"
            title="Start new chat conversation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => projectStore.toggleSettings(true, 'skills')}
            className="p-1 hover:text-[#f0f0f2] rounded-md hover:bg-white/[0.04] transition-colors cursor-pointer"
            title="Configure skills & editing rules"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          {!isMobile && (
            <button
              onClick={() => projectStore.toggleFloatingPanel('chat')}
              className="p-1 hover:text-[#f0f0f2] rounded-md hover:bg-white/[0.04] transition-colors cursor-pointer"
              title={floatingPanels?.chat ? 'Dock into workspace' : 'Undock into floating window'}
            >
              {floatingPanels?.chat ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
          <button
            onClick={() => {
              if (isMobile) {
                projectStore.setMobileView('timeline');
              } else {
                projectStore.toggleChat(false);
              }
            }}
            className="p-1 hover:text-[#f0f0f2] rounded-md hover:bg-white/[0.04] transition-colors cursor-pointer"
            title={isMobile ? "Back to Timeline" : "Collapse AI Agent panel"}
          >
            {isMobile ? <X className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Message History Container */}
      <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-4 text-xs bg-[#0a0a0a]">
        {project.chatLog.map((item) => {
          const isUser = item.role === 'user';
          const isSys = item.role === 'system';
          const reaction = reactions[item.id];
          const isCopied = copiedId === item.id;

          if (isUser) {
            return (
              <div key={item.id} className="flex justify-end">
                <div className="max-w-[88%] bg-[#181818] border border-[#C9A84C]/35 text-[#f0f0f2] rounded-2xl rounded-tr-sm px-3.5 py-2.5 leading-relaxed shadow-sm">
                  <p className="whitespace-pre-wrap">{item.message || (item as any).text}</p>
                </div>
              </div>
            );
          }

          return (
            <div key={item.id} className="flex flex-col items-start gap-1.5 max-w-[95%]">
              {/* Skill Tag if present (Image 1 style) */}
              {item.skillTag && (
                <div className="flex items-center gap-1.5 text-[11px] text-[#2ECC71] font-medium ml-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2ECC71] shadow-[0_0_6px_rgba(46,204,113,0.8)]" />
                  <span>Loaded {item.skillTag}</span>
                </div>
              )}

              {/* AI Message Card */}
              <div className="w-full bg-[#121212] border border-white/[0.08] rounded-2xl rounded-tl-sm p-3.5 text-[#f0f0f2] leading-relaxed shadow-sm">
                
                {/* Agent Thinking Process */}
                {item.thinking && (
                  <div className="mb-3 p-2.5 rounded-xl bg-black/40 border border-[#C9A84C]/20 text-[#8e8e93] text-[11px] font-mono italic leading-relaxed">
                    <div className="flex items-center gap-1.5 mb-1.5 text-[#C9A84C]/80 not-italic font-sans text-[10px] font-bold uppercase tracking-wider">
                      <Bot className="w-3 h-3" />
                      Agent Thought Process
                    </div>
                    <div className="whitespace-pre-wrap">{item.thinking}</div>
                  </div>
                )}

                <p className="whitespace-pre-wrap font-normal text-[12.5px] text-[#f0f0f2]">{item.message || (item as any).text}</p>

                {/* Interactive Option Chips (Image 1 style) */}
                {item.options && item.options.length > 0 && (
                  <div className="mt-3.5 pt-3 border-t border-white/[0.08] flex flex-col gap-2">
                    {item.options.map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleOptionClick(opt)}
                        disabled={isPromptLoading}
                        className="text-left px-3 py-2.5 rounded-xl bg-[#171717] hover:bg-[#C9A84C]/10 border border-[#C9A84C]/25 hover:border-[#C9A84C]/60 text-[#f0f0f2] hover:text-[#E8C97A] transition-all text-xs font-medium cursor-pointer shadow-xs active:scale-[0.99] flex items-center justify-between group"
                      >
                        <span>{opt}</span>
                        <span className="opacity-0 group-hover:opacity-100 text-[10px] text-[#E8C97A] font-cinzel tracking-wider uppercase shrink-0 ml-2">
                          Apply
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Operations Executed Pill */}
                {item.operations && item.operations.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-white/[0.08] flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1 text-[#2ECC71] font-mono">
                      <CheckCircle2 className="w-3 h-3" />
                      {item.operations.length} timeline edit{item.operations.length > 1 ? 's' : ''} applied
                    </span>
                    <button
                      onClick={() => projectStore.undo()}
                      className="text-[#7A8290] hover:text-[#EEF0F4] flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <RotateCcw className="w-2.5 h-2.5" /> Revert
                    </button>
                  </div>
                )}
              </div>

              {/* Message Action Bar: Thumbs Up / Down / Copy (Image 1) */}
              <div className="flex items-center gap-1 ml-1 text-[#7A8290]">
                <button
                  onClick={() => handleCopyMessage(item.id, item.message || (item as any).text)}
                  className="p-1 hover:text-[#EEF0F4] rounded hover:bg-white/[0.04] transition-colors cursor-pointer"
                  title="Copy message text"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-[#2ECC71]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => handleReaction(item.id, 'liked')}
                  className={`p-1 rounded hover:bg-white/[0.04] transition-colors cursor-pointer ${
                    reaction === 'liked' ? 'text-[#C9A84C]' : 'hover:text-[#EEF0F4]'
                  }`}
                  title="Good response"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleReaction(item.id, 'disliked')}
                  className={`p-1 rounded hover:bg-white/[0.04] transition-colors cursor-pointer ${
                    reaction === 'disliked' ? 'text-[#E84855]' : 'hover:text-[#EEF0F4]'
                  }`}
                  title="Poor response"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {isPromptLoading && (
          <div className="flex items-center gap-2 text-cyan-400 text-xs p-3 bg-slate-900/60 border border-slate-800 rounded-xl animate-pulse">
            <Sparkles className="w-4 h-4 animate-spin" />
            <span>AI Co-Pilot analyzing cuts & applying direction...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Mid-Session Skill Switch Confirmation Modal/Banner */}
      {activeSkillSession?.pendingConfirmationSkill && (
        <div className="mx-3 mb-2 p-3 bg-amber-950/80 border border-amber-500/50 rounded-xl shadow-xl space-y-2 animate-in fade-in">
          <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Switch Active Skill Mid-Session?</span>
          </div>
          <p className="text-[11px] text-amber-200/90 leading-relaxed">
            "{activeSkillSession.activeSkillName}" is currently active. The Build Spec enforces that only one Skill runs per session. Switch to "{activeSkillSession.pendingConfirmationSkill.name}"?
          </p>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => projectStore.cancelSkillSwitch()}
              className="px-2.5 py-1 text-[11px] text-amber-300 hover:text-white bg-amber-900/60 rounded-lg hover:bg-amber-900 transition-colors"
            >
              Keep Current Skill
            </button>
            <button
              onClick={() => projectStore.confirmSkillSwitch()}
              className="px-3 py-1 text-[11px] font-semibold text-black bg-amber-400 hover:bg-amber-300 rounded-lg shadow-sm transition-colors flex items-center gap-1"
            >
              <Zap className="w-3 h-3" /> Confirm Switch
            </button>
          </div>
        </div>
      )}

      {/* @ Skill Mention Popover */}
      {showSkillDropdown && (
        <div className="mx-3 mb-2 p-2 bg-[#141414] border border-[#C9A84C]/40 rounded-xl shadow-2xl max-h-48 overflow-y-auto z-40">
          <div className="text-[10px] font-cinzel tracking-wider uppercase text-[#C9A84C] px-2 py-1 flex items-center justify-between">
            <span>Select Editor Skill (@ Mention)</span>
            <span className="text-[9px] text-[#8e8e93] font-mono">1 Skill per Session</span>
          </div>
          <div className="space-y-1">
            {allSkills
              .filter((s) => !skillSearchQuery || s.name.toLowerCase().includes(skillSearchQuery) || s.category.toLowerCase().includes(skillSearchQuery))
              .map((skill) => (
                <button
                  key={skill.id}
                  onClick={() => handleSelectSkill(skill)}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.08] text-xs text-[#f0f0f2] hover:text-[#E8C97A] flex items-center justify-between transition-colors group"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Zap className="w-3 h-3 text-[#C9A84C] shrink-0" />
                    <span className="font-medium truncate">{skill.name}</span>
                  </div>
                  <span className="text-[10px] text-[#8e8e93] uppercase font-mono group-hover:text-white shrink-0 ml-2">
                    {skill.category}
                  </span>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Media mention popover if '@' triggered */}
      {showMediaPicker && (
        <div className="mx-3 mb-2 p-2 bg-slate-900 border border-slate-800 rounded-xl shadow-xl max-h-36 overflow-y-auto">
          <div className="text-[10px] font-mono uppercase text-slate-400 px-2 py-1">Reference Media Asset:</div>
          <div className="grid grid-cols-1 gap-1">
            {allAssets.map((asset) => (
              <button
                key={asset.assetId}
                onClick={() => handleInsertMediaTag(asset.filename)}
                className="text-left px-2 py-1 rounded hover:bg-slate-800 text-xs text-slate-200 flex items-center justify-between"
              >
                <span className="truncate">{asset.filename}</span>
                <span className="text-[10px] text-slate-500 font-mono">{asset.type}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Input Area Styled Exactly Like Image 1 */}
      <div className="p-3 border-t border-white/[0.08] bg-[#0a0a0a]">
        <div className="bg-[#141414] border border-[#C9A84C]/30 rounded-2xl p-2.5 shadow-2xl focus-within:border-[#C9A84C] focus-within:gold-glow-subtle transition-all">
          {/* Textarea Input */}
          <textarea
            ref={inputRef}
            rows={2}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={
              isListening
                ? 'Listening to your voice... (free real-time transcription)'
                : 'Direct your co-editor — tell AI what edits, pacing, or audio to arrange'
            }
            className="w-full bg-transparent border-0 resize-none text-xs text-[#f0f0f2] placeholder-[#808080] focus:outline-none focus:ring-0 leading-relaxed max-h-24 overflow-y-auto"
          />

          {/* Bottom Toolbar inside the input card (Image 1) */}
          <div className="flex items-center justify-between pt-1.5 border-t border-white/[0.06] mt-1">
            {/* Left Tools */}
            <div className="flex items-center gap-1.5">
              {/* Agent Mode Pill Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowModeDropdown(!showModeDropdown)}
                  className="group flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.03] hover:bg-white/[0.06] text-[#8e8e93] hover:text-[#f0f0f2] text-[11px] font-cinzel tracking-wider border border-white/[0.08] hover:border-white/[0.15] transition-colors cursor-pointer"
                >
                  <Bot className="w-3 h-3 text-[#8e8e93] group-hover:text-[#f0f0f2] transition-colors" />
                  <span>{agentMode}</span>
                  <ChevronDown className="w-2.5 h-2.5 text-[#8e8e93] group-hover:text-[#f0f0f2] transition-colors" />
                </button>

                {showModeDropdown && (
                  <div className="absolute bottom-full left-0 mb-1.5 w-40 bg-[#161616] border border-[#C9A84C]/30 rounded-xl shadow-2xl overflow-hidden z-30 font-cinzel">
                    <button
                      onClick={() => {
                        setAgentMode('Agent');
                        setShowModeDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-[#f0f0f2] hover:bg-white/[0.06] hover:text-[#E8C97A]"
                    >
                      🤖 Agent
                    </button>
                    <button
                      onClick={() => {
                        setAgentMode('Director');
                        setShowModeDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-[#f0f0f2] hover:bg-white/[0.06] hover:text-[#E8C97A]"
                    >
                      🎬 Creative Director
                    </button>
                    <button
                      onClick={() => {
                        setAgentMode('Editor');
                        setShowModeDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-[#f0f0f2] hover:bg-white/[0.06] hover:text-[#E8C97A]"
                    >
                      ⚡ Speed Editor
                    </button>
                  </div>
                )}
              </div>

              {/* Settings Icon */}
              <button
                type="button"
                onClick={() => projectStore.toggleSettings(true, 'skills')}
                className="p-1 text-[#8e8e93] hover:text-[#f0f0f2] rounded hover:bg-white/[0.06] transition-colors cursor-pointer"
                title="AI Skills Configuration"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>

              {/* Plus Button: Insert Media or Mention */}
              <button
                type="button"
                onClick={() => setShowMediaPicker(!showMediaPicker)}
                className="p-1 text-[#8e8e93] hover:text-[#f0f0f2] rounded hover:bg-white/[0.06] transition-colors cursor-pointer"
                title="Reference Media Asset (@)"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              {/* Color Style Quick Prompt */}
              <button
                type="button"
                onClick={() => {
                  setInputValue((prev) => `${prev} Suggest a cinematic color grade for this video `);
                  inputRef.current?.focus();
                }}
                className="p-1 text-[#8e8e93] hover:text-[#f0f0f2] rounded hover:bg-white/[0.06] transition-colors cursor-pointer"
                title="Suggest Color Grade"
              >
                <Palette className="w-3.5 h-3.5" />
              </button>

              {/* Script Editor Popover */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowScriptEditor(!showScriptEditor)}
                  className={`p-1 rounded transition-colors cursor-pointer ${
                    showScriptEditor
                      ? 'text-[#C9A84C] bg-[#C9A84C]/10'
                      : 'text-[#8e8e93] hover:text-[#f0f0f2] hover:bg-white/[0.06]'
                  }`}
                  title="Draft or attach a script"
                >
                  <FileText className="w-3.5 h-3.5" />
                </button>

                {showScriptEditor && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-[#161616] border border-[#C9A84C]/30 rounded-xl shadow-2xl overflow-hidden z-30 flex flex-col">
                    <div className="text-[10px] font-mono uppercase text-[#C9A84C] font-bold px-3 py-2 border-b border-white/[0.06] bg-[#1a1a1a]">
                      Script & Storyboard
                    </div>
                    <textarea
                      rows={6}
                      value={scriptDraft}
                      onChange={(e) => setScriptDraft(e.target.value)}
                      placeholder="Type or paste your script here to give the AI context..."
                      className="w-full bg-transparent p-3 text-xs text-[#f0f0f2] placeholder-[#808080] border-none resize-none focus:outline-none focus:ring-0 leading-relaxed"
                    />
                    <div className="px-3 py-2 border-t border-white/[0.06] flex justify-end">
                      <button
                        onClick={() => {
                          setShowScriptEditor(false);
                          if (scriptDraft.trim().length > 0) {
                            setInputValue((prev) => `${prev}\n\nHere is my script context:\n${scriptDraft}`);
                            inputRef.current?.focus();
                          }
                        }}
                        className="px-3 py-1 bg-[#C9A84C] text-[#0a0a0a] rounded text-[10px] font-bold uppercase cursor-pointer hover:bg-[#E8C97A] transition-colors"
                      >
                        Attach to Chat
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Microphone Speech Dictation */}
              <button
                type="button"
                onClick={handleToggleVoice}
                className={`p-1 rounded transition-colors cursor-pointer ${
                  isListening
                    ? 'text-rose-400 bg-rose-950/50 animate-pulse'
                    : 'text-[#8e8e93] hover:text-[#f0f0f2] hover:bg-white/[0.06]'
                }`}
                title={isListening ? 'Stop voice recording' : 'Dictate with Microphone'}
              >
                {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Right: Circular Send Button with Up Arrow (Image 1) */}
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={!inputValue.trim() || isPromptLoading}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-md cursor-pointer ${
                inputValue.trim() && !isPromptLoading
                  ? 'bg-gradient-to-r from-[#C9A84C] to-[#E8C97A] text-black hover:brightness-110 active:scale-95 shadow-[0_0_12px_rgba(201,168,76,0.4)]'
                  : 'bg-white/[0.06] text-[#4A5260] cursor-not-allowed'
              }`}
              title="Send to AI Agent (Enter)"
            >
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {isListening && (
          <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-rose-400">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
            <span>Voice dictation active (speak naturally)...</span>
          </div>
        )}
      </div>

      {/* Resizer Handle on Right Border */}
      {!isMobile && !floatingPanels?.chat && (
        <div
          onPointerDown={handlePointerDown}
          onDoubleClick={() => projectStore.setChatPanelWidth(384)}
          className={`absolute top-0 -right-1 bottom-0 w-2 z-30 cursor-col-resize transition-colors ${
            isResizing ? 'bg-[#C9A84C]' : 'hover:bg-[#C9A84C]/40'
          }`}
          title="Drag horizontally to resize AI Agent panel • Double-click to reset (384px)"
        >
          {/* Live Width Indicator while dragging */}
          {isResizing && (
            <div className="pointer-events-none absolute top-12 left-4 whitespace-nowrap px-2 py-1 rounded bg-black/95 border border-[#C9A84C]/50 text-[11px] font-mono text-[#E8C97A] shadow-xl z-50">
              {panelWidth}px
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (floatingPanels?.chat) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
        <div className="relative animate-in fade-in zoom-in-95 duration-150">
          {panelContent}
        </div>
      </div>
    );
  }

  return panelContent;
};
