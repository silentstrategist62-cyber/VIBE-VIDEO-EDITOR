import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Settings,
  Sparkles,
  Sliders,
  Film,
  Music,
  Bot,
  Plus,
  Trash2,
  Edit3,
  Copy,
  RotateCcw,
  Check,
  Search,
  BookOpen,
  Code,
  Zap,
  Info,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  Play,
  Volume2,
  Scissors,
  Layers,
  FileText,
  HelpCircle,
  Eye,
  History,
  RotateCw,
  ChevronDown,
  ChevronRight,
  Key,
  List,
  Grid,
} from 'lucide-react';
import { projectStore, useProjectStore } from '../store/projectStore';
import { EditorSkill, SkillCategory } from '../types/skills';
import { DEFAULT_EDITOR_SKILLS } from '../data/defaultSkills';

export const SettingsModal: React.FC = () => {
  const { isSettingsOpen, settingsActiveTab, skills, project, isMagneticRipple } = useProjectStore();
  const skillsList = skills || [];
  const past = project.history?.past || [];
  const future = project.history?.future || [];

  const formatRelativeTime = (ts?: string) => {
    if (!ts) return 'Just now';
    const d = new Date(ts).getTime();
    const diff = Math.floor((Date.now() - d) / 1000);
    if (diff < 5) return 'Just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SkillCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'builtin' | 'custom'>('all');
  const [viewMode, setViewMode] = useState<'compact' | 'expanded'>('compact');
  const [expandedSkillId, setExpandedSkillId] = useState<string | null>(null);
  const [editingSkill, setEditingSkill] = useState<EditorSkill | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Form states for Skill editing
  const [formName, setFormName] = useState('');
  const [formActivity, setFormActivity] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState<SkillCategory>('pacing');
  const [formRules, setFormRules] = useState('');
  const [formExamples, setFormExamples] = useState('');

  // Bulk skill actions
  const handleEnableAll = () => {
    const updated = skillsList.map((s) => ({ ...s, enabled: true }));
    projectStore.updateSkills(updated);
    showToast('All skills enabled');
  };

  const handleDisableAll = () => {
    const updated = skillsList.map((s) => ({ ...s, enabled: false }));
    projectStore.updateSkills(updated);
    showToast('All skills disabled');
  };

  const handleResetDefaults = () => {
    projectStore.resetSkillsToDefault();
    showToast('Reset to default skills');
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSettingsOpen) {
        if (editingSkill) {
          setEditingSkill(null);
        } else {
          projectStore.toggleSettings(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsOpen, editingSkill]);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const activeSkillsCount = skillsList.filter((s) => s.enabled).length;

  const filteredSkills = useMemo(() => {
    return skillsList.filter((skill) => {
      const matchesCat = selectedCategory === 'all' || skill.category === selectedCategory;

      let matchesStatus = true;
      if (statusFilter === 'active') matchesStatus = skill.enabled;
      else if (statusFilter === 'builtin') matchesStatus = Boolean(skill.isBuiltIn);
      else if (statusFilter === 'custom') matchesStatus = !skill.isBuiltIn;

      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesCat && matchesStatus;
      const matchesSearch =
        skill.name.toLowerCase().includes(q) ||
        skill.activity.toLowerCase().includes(q) ||
        skill.description.toLowerCase().includes(q) ||
        skill.rules.toLowerCase().includes(q);
      return matchesCat && matchesStatus && matchesSearch;
    });
  }, [skillsList, selectedCategory, statusFilter, searchQuery]);

  const handleOpenEdit = (skill: EditorSkill) => {
    setEditingSkill(skill);
    setIsCreatingNew(false);
    setFormName(skill.name);
    setFormActivity(skill.activity);
    setFormDescription(skill.description);
    setFormCategory(skill.category);
    setFormRules(skill.rules);
    setFormExamples(skill.examples ? skill.examples.join('\n') : '');
  };

  const handleOpenCreateNew = () => {
    const newSkillId = `custom-skill-${Date.now()}`;
    const initial: EditorSkill = {
      id: newSkillId,
      name: 'Custom Editing Skill',
      activity: 'Custom workflow activity or style rule',
      description: 'Defines plain English execution rules for specific timeline activities.',
      category: 'general',
      enabled: true,
      rules: `# Custom Skill Rules\n\n1. Activity Execution:\n   - Write rules in clear, direct English.\n   - Specify exact thresholds, timings, or styling constraints.\n   - State what the AI editor should always or never do.`,
      examples: ['Execute this custom activity on the timeline'],
      updatedAt: new Date().toISOString(),
      isBuiltIn: false,
    };
    setEditingSkill(initial);
    setIsCreatingNew(true);
    setFormName(initial.name);
    setFormActivity(initial.activity);
    setFormDescription(initial.description);
    setFormCategory(initial.category);
    setFormRules(initial.rules);
    setFormExamples(initial.examples?.join('\n') || '');
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSkill || !formName.trim()) return;

    const updated: EditorSkill = {
      ...editingSkill,
      name: formName.trim(),
      activity: formActivity.trim() || 'General video editing activity',
      description: formDescription.trim() || 'Custom user-defined skill',
      category: formCategory,
      rules: formRules.trim() || '# Rules\n- Follow instructions carefully.',
      examples: formExamples
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      updatedAt: new Date().toISOString(),
      isBuiltIn: editingSkill.isBuiltIn && !isCreatingNew,
    };

    projectStore.saveSkill(updated);
    setEditingSkill(null);
    setIsCreatingNew(false);
    showToast(`Saved skill "${updated.name}"`);
  };

  const handleDuplicate = (skill: EditorSkill) => {
    const cloned: EditorSkill = {
      ...skill,
      id: `copy-${Date.now()}`,
      name: `${skill.name} (Copy)`,
      isBuiltIn: false,
      updatedAt: new Date().toISOString(),
    };
    projectStore.saveSkill(cloned);
    showToast(`Duplicated "${skill.name}"`);
  };

  const handleDelete = (skillId: string) => {
    const target = skillsList.find((s) => s.id === skillId);
    projectStore.deleteSkill(skillId);
    showToast(`Deleted "${target?.name || 'skill'}"`);
  };

  const handleTestInChat = (skill: EditorSkill) => {
    projectStore.toggleSettings(false);
    projectStore.toggleChat(true);
    const samplePrompt = skill.examples && skill.examples.length > 0
      ? skill.examples[0]
      : `How would you apply the rules from "${skill.name}" to our current cut?`;
    // Pass into prompt edit directly or let user edit it
    setTimeout(() => {
      projectStore.runPromptEdit(samplePrompt);
    }, 200);
  };

  const handleInsertQuickRule = (snippet: string) => {
    setFormRules((prev) => `${prev.trim()}\n\n${snippet}`);
  };

  const compiledPromptPreview = useMemo(() => {
    const active = skillsList.filter((s) => s.enabled);
    if (active.length === 0) {
      return '(No skills currently active. Enable skills on the left to inject rules into the AI prompt)';
    }
    return active
      .map(
        (s, idx) =>
          `[SKILL ${idx + 1}: ${s.name.toUpperCase()}]\nCategory: ${s.category.toUpperCase()}\nActivity Governed: ${s.activity}\nDescription: ${s.description}\nRules in English:\n${s.rules}`
      )
      .join('\n\n----------------------------------------\n\n');
  }, [skillsList]);

  if (!isSettingsOpen) return null;

  return (
    <div
      id="modal-settings-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 select-none animate-in fade-in duration-150"
      onClick={() => projectStore.toggleSettings(false)}
    >
      <div
        id="modal-settings-container"
        className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl h-[88vh] max-h-[780px] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="h-14 px-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                Studio Settings & AI Skills
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {notification && (
              <span className="text-xs text-emerald-400 flex items-center gap-1 animate-in fade-in">
                <Check className="w-3.5 h-3.5" />
                {notification}
              </span>
            )}
            <button
              id="btn-close-settings-modal"
              onClick={() => projectStore.toggleSettings(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Close Settings (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Body Layout: Sidebar + Main Content */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left Navigation Sidebar */}
          <aside className="w-52 sm:w-60 border-r border-slate-800/80 bg-slate-950/40 p-3 flex flex-col justify-between shrink-0">
            <nav className="space-y-1">
              <button
                id="btn-tab-skills"
                onClick={() => {
                  projectStore.setSettingsTab('skills');
                  setEditingSkill(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  settingsActiveTab === 'skills'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Skills & Rules</span>
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                    settingsActiveTab === 'skills'
                      ? 'bg-indigo-700/80 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {activeSkillsCount}
                </span>
              </button>

              <button
                id="btn-tab-apikeys"
                onClick={() => {
                  projectStore.setSettingsTab('api');
                  setEditingSkill(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  settingsActiveTab === 'api'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Key className="w-4 h-4 text-emerald-400" />
                  <span>LLM API Keys</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  MULTI
                </span>
              </button>

              <button
                id="btn-tab-timeline"
                onClick={() => {
                  projectStore.setSettingsTab('timeline');
                  setEditingSkill(null);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  settingsActiveTab === 'timeline'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <Scissors className="w-4 h-4 text-blue-400" />
                <span>Timeline & Trimming</span>
              </button>

              <button
                id="btn-tab-canvas"
                onClick={() => {
                  projectStore.setSettingsTab('canvas');
                  setEditingSkill(null);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  settingsActiveTab === 'canvas'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <Film className="w-4 h-4 text-emerald-400" />
                <span>Canvas & Aspect Ratio</span>
              </button>

              <button
                id="btn-tab-export"
                onClick={() => {
                  projectStore.setSettingsTab('export');
                  setEditingSkill(null);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  settingsActiveTab === 'export'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <Volume2 className="w-4 h-4 text-teal-400" />
                <span>Audio & Ducking</span>
              </button>

              <button
                id="btn-tab-ai"
                onClick={() => {
                  projectStore.setSettingsTab('ai');
                  setEditingSkill(null);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  settingsActiveTab === 'ai'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <Bot className="w-4 h-4 text-purple-400" />
                <span>AI Partner & Engine</span>
              </button>

              <button
                id="btn-tab-history"
                onClick={() => {
                  projectStore.setSettingsTab('history');
                  setEditingSkill(null);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  settingsActiveTab === 'history'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <History className="w-4 h-4 text-[#C9A84C]" />
                <span>History Stack & Undo</span>
              </button>
            </nav>

            {/* Sidebar Navigation Completed */}
          </aside>

          {/* Right Main Pane */}
          <main className="flex-1 flex flex-col min-w-0 bg-slate-900/60 overflow-y-auto p-5">
            {/* TAB: SKILLS */}
            {settingsActiveTab === 'skills' && (
              <div className="space-y-5">
                {/* When editing or creating a skill */}
                {editingSkill ? (
                  <form onSubmit={handleSaveForm} className="space-y-4 max-w-3xl">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <Edit3 className="w-4 h-4 text-indigo-400" />
                          <span>{isCreatingNew ? 'Create New Skill' : `Edit Skill: ${editingSkill.name}`}</span>
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingSkill(null)}
                        className="px-3 py-1 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-300">Skill Name</label>
                        <input
                          type="text"
                          value={formName}
                          onChange={(e) => setFormName(e.target.value)}
                          placeholder="e.g., Viral Hook Trimming"
                          required
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-300">Category</label>
                        <select
                          value={formCategory}
                          onChange={(e) => setFormCategory(e.target.value as SkillCategory)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                        >
                          <option value="pacing">Pacing & Trimming</option>
                          <option value="captions">Kinetic Captions</option>
                          <option value="broll">B-Roll & Visuals</option>
                          <option value="audio">Audio & Ducking</option>
                          <option value="color">Color Grading</option>
                          <option value="general">General Direction</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">
                        Governed Activity / Trigger
                      </label>
                      <input
                        type="text"
                        value={formActivity}
                        onChange={(e) => setFormActivity(e.target.value)}
                        placeholder="e.g., Pacing, hook trimming, silence removal, and cut frequency"
                        required
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                      <span className="text-[10px] text-slate-500">
                        Describes what specific workflow or editing action this skill guides.
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Description</label>
                      <input
                        type="text"
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        placeholder="Brief one-line summary of what the skill accomplishes"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Rules in English (Claude-Style) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Execution Rules (Written in Plain English)</span>
                        </label>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Markdown supported • {formRules.length} chars
                        </span>
                      </div>

                      {/* Quick rule insertion chips */}
                      <div className="flex flex-wrap gap-1.5 items-center p-2 bg-slate-950/60 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-400 mr-1 flex items-center gap-1 font-semibold">
                          <Zap className="w-3 h-3 text-amber-400" /> Quick Inserts:
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleInsertQuickRule(
                              '- Keep shots in the first 3 seconds strictly between 0.8s and 1.3s for hook retention.'
                            )
                          }
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] transition-colors"
                        >
                          + Hook Shot Length
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleInsertQuickRule(
                              '- Cut all dead air and breathing pauses longer than 0.35s on the dialogue voice track.'
                            )
                          }
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] transition-colors"
                        >
                          + Silence Cut
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleInsertQuickRule(
                              '- Limit caption cards to maximum 3 to 4 words per frame with electric yellow active word highlight.'
                            )
                          }
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] transition-colors"
                        >
                          + 3-4 Word Subtitles
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleInsertQuickRule(
                              '- Duck background music down to -20dB whenever speech is present on track A1.'
                            )
                          }
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] transition-colors"
                        >
                          + -20dB Ducking
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleInsertQuickRule(
                              '- Apply slow continuous Ken Burns zoom (1.0x to 1.15x scale) on all static image assets.'
                            )
                          }
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] transition-colors"
                        >
                          + Ken Burns Zoom
                        </button>
                      </div>

                      <textarea
                        value={formRules}
                        onChange={(e) => setFormRules(e.target.value)}
                        rows={9}
                        placeholder="Write rules in plain English:&#10;&#10;1. Hook Pacing:&#10;   - Cut every 1.0 to 1.5 seconds.&#10;   - Apply punch zoom on the first keyword.&#10;&#10;2. Silence Trim:&#10;   - Eliminate vocal pauses longer than 0.35s."
                        required
                        className="w-full font-mono text-xs bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-200 leading-relaxed focus:outline-none focus:border-indigo-500 resize-y"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">
                        Example Prompts / Triggers (One per line)
                      </label>
                      <textarea
                        value={formExamples}
                        onChange={(e) => setFormExamples(e.target.value)}
                        rows={2}
                        placeholder="Tighten the pacing in the intro&#10;Make the edit punchier and faster"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setEditingSkill(null)}
                        className="px-4 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-md shadow-indigo-900/30 transition-colors flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Save Skill Rules</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    {/* Skills Dashboard Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">Video Editing Skills</h3>
                        <span className="text-[11px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20 font-semibold">
                          {activeSkillsCount} Active
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          id="btn-add-new-skill"
                          onClick={handleOpenCreateNew}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-950/40 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>New Skill</span>
                        </button>
                      </div>
                    </div>

                    {/* Live System Prompt Inspector Drawer if toggled */}
                    {showPromptPreview && (
                      <div className="p-4 bg-slate-950 border border-indigo-500/30 rounded-xl space-y-2 animate-in fade-in">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                            <Code className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Active System Prompt Injection (Gemini Context)</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {activeSkillsCount} skills compiled
                          </span>
                        </div>
                        <pre className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-[11px] font-mono text-slate-300 leading-relaxed max-h-52 overflow-y-auto whitespace-pre-wrap select-text">
                          {compiledPromptPreview}
                        </pre>
                      </div>
                    )}

                    {/* Toolbar: Search & Bulk Controls */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                      {/* Search Bar */}
                      <div className="relative flex-1 max-w-xs">
                        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                        <input
                          id="input-search-skills"
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search saved skills..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      {/* Status Filter Pills */}
                      <div className="flex items-center gap-1 text-[11px]">
                        {(['all', 'active'] as const).map((st) => (
                          <button
                            key={st}
                            onClick={() => setStatusFilter(st)}
                            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                              statusFilter === st
                                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 font-semibold'
                                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                            }`}
                          >
                            {st === 'all'
                              ? `All (${skillsList.length})`
                              : `Active (${activeSkillsCount})`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Skills Render List */}
                    {viewMode === 'compact' ? (
                      /* Compact Accordion List View (Decluttered) */
                      <div className="space-y-2">
                        {filteredSkills.map((skill) => {
                          const isExpanded = expandedSkillId === skill.id;
                          const isEnabled = skill.enabled;

                          return (
                            <div
                              key={skill.id}
                              className={`rounded-xl border transition-all ${
                                isEnabled
                                  ? 'bg-slate-950/90 border-slate-800 hover:border-slate-700'
                                  : 'bg-slate-950/40 border-slate-800/50 opacity-60'
                              }`}
                            >
                              {/* Header Row */}
                              <div className="p-3 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <button
                                    onClick={() => setExpandedSkillId(isExpanded ? null : skill.id)}
                                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors shrink-0"
                                    title={isExpanded ? 'Collapse rules' : 'Expand rules'}
                                  >
                                    {isExpanded ? <ChevronDown className="w-4 h-4 text-indigo-400" /> : <ChevronRight className="w-4 h-4" />}
                                  </button>

                                  <span
                                    className={`text-[9px] font-mono px-2 py-0.5 rounded uppercase font-bold shrink-0 ${
                                      skill.category === 'pacing'
                                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                        : skill.category === 'captions'
                                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                        : skill.category === 'broll'
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                        : skill.category === 'audio'
                                        ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                                        : skill.category === 'color'
                                        ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                        : 'bg-slate-800 text-slate-300'
                                    }`}
                                  >
                                    {skill.category}
                                  </span>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <h4 className="text-xs font-bold text-white truncate">{skill.name}</h4>
                                      {skill.isBuiltIn && (
                                        <span className="text-[9px] text-slate-500 font-mono shrink-0">Built-In</span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-slate-400 truncate">{skill.activity}</p>
                                  </div>
                                </div>

                                {/* Right Controls */}
                                <div className="flex items-center gap-3 shrink-0">
                                  {/* Toggle Switch */}
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={skill.enabled}
                                      onChange={() => projectStore.toggleSkill(skill.id)}
                                      className="sr-only peer"
                                    />
                                    <div className="w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600" />
                                  </label>

                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleTestInChat(skill)}
                                      className="p-1 text-slate-400 hover:text-indigo-300 rounded hover:bg-slate-800 transition-colors"
                                      title="Test in AI Drawer"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleOpenEdit(skill)}
                                      className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                                      title="Edit Skill Rules"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDuplicate(skill)}
                                      className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                                      title="Duplicate Skill"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                    {!skill.isBuiltIn && (
                                      <button
                                        onClick={() => handleDelete(skill.id)}
                                        className="p-1 text-rose-400 hover:text-rose-300 rounded hover:bg-rose-950/30 transition-colors"
                                        title="Delete Skill"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Expanded Rules Drawer (Progressive Disclosure) */}
                              {isExpanded && (
                                <div className="p-3.5 bg-slate-900/90 border-t border-slate-800/80 space-y-3 animate-in fade-in">
                                  {/* Description & Category */}
                                  <div className="flex items-center justify-between text-xs">
                                    <p className="text-slate-300 leading-relaxed font-medium">{skill.description}</p>
                                    <span className="text-[10px] text-slate-400 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800 shrink-0">
                                      Category: {skill.category}
                                    </span>
                                  </div>

                                  {/* Required Inputs if defined */}
                                  {skill.requiredInputs && skill.requiredInputs.length > 0 && (
                                    <div className="space-y-1">
                                      <span className="text-[10px] font-semibold text-indigo-300 uppercase tracking-wider block">
                                        Required Inputs
                                      </span>
                                      <div className="flex flex-wrap gap-1">
                                        {skill.requiredInputs.map((inp) => (
                                          <span
                                            key={inp}
                                            className="text-[10px] font-mono px-2 py-0.5 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-md font-semibold uppercase"
                                          >
                                            {inp}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Workflow Steps if defined */}
                                  {skill.workflow && skill.workflow.length > 0 && (
                                    <div className="space-y-1">
                                      <span className="text-[10px] font-semibold text-indigo-300 uppercase tracking-wider block">
                                        Workflow Steps
                                      </span>
                                      <div className="space-y-1">
                                        {skill.workflow.map((step) => (
                                          <div
                                            key={step.id || step.stepNumber}
                                            className="p-2 bg-slate-950 border border-slate-800/80 rounded-lg text-xs flex items-start gap-2"
                                          >
                                            <span className="w-4 h-4 rounded bg-indigo-600/20 text-indigo-400 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                              {step.stepNumber}
                                            </span>
                                            <div>
                                              <span className="font-semibold text-slate-200 block text-[11px]">{step.title || `Step ${step.stepNumber}`}</span>
                                              <span className="text-slate-400 text-[10px]">{step.instruction}</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Plain English Execution Rules */}
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-semibold text-indigo-300 uppercase tracking-wider block">
                                      Execution Rules
                                    </span>
                                    <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-[11px] font-mono text-slate-300 leading-relaxed whitespace-pre-wrap select-text max-h-44 overflow-y-auto">
                                      {skill.rules}
                                    </div>
                                  </div>

                                  {skill.examples && skill.examples.length > 0 && (
                                    <div className="text-[10px] text-slate-400 italic">
                                      Trigger example: "{skill.examples[0]}"
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Detailed Cards View */
                      <div className="grid grid-cols-1 gap-3.5">
                        {filteredSkills.map((skill) => {
                          const isEnabled = skill.enabled;

                          return (
                            <div
                              key={skill.id}
                              className={`p-4 rounded-xl border transition-all ${
                                isEnabled
                                  ? 'bg-slate-950/80 border-slate-800 hover:border-indigo-500/40'
                                  : 'bg-slate-950/40 border-slate-800/60 opacity-65'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <h4 className="text-xs font-bold text-white tracking-tight">{skill.name}</h4>
                                    <span
                                      className={`text-[9px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                                        skill.category === 'pacing'
                                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                          : skill.category === 'captions'
                                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                          : skill.category === 'broll'
                                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                          : skill.category === 'audio'
                                          ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                                          : skill.category === 'color'
                                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                          : 'bg-slate-800 text-slate-300'
                                      }`}
                                    >
                                      {skill.category}
                                    </span>
                                    {skill.isBuiltIn && (
                                      <span className="text-[9px] text-slate-500 font-mono">Built-In</span>
                                    )}
                                  </div>

                                  <p className="text-[11px] text-indigo-300 font-medium mb-1">Activity: {skill.activity}</p>
                                  <p className="text-xs text-slate-400 leading-relaxed mb-2.5">{skill.description}</p>

                                  <div className="p-2.5 bg-slate-900 border border-slate-800/80 rounded-lg text-[11px] font-mono text-slate-300 leading-relaxed mb-3 max-h-28 overflow-y-auto whitespace-pre-wrap select-text">
                                    {skill.rules}
                                  </div>
                                </div>

                                <div className="flex flex-col items-end gap-2 shrink-0">
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={skill.enabled}
                                      onChange={() => projectStore.toggleSkill(skill.id)}
                                      className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
                                  </label>

                                  <div className="flex items-center gap-1 mt-1">
                                    <button
                                      onClick={() => handleTestInChat(skill)}
                                      className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-slate-800 rounded transition-colors"
                                      title="Test in AI Drawer"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleOpenEdit(skill)}
                                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                                      title="Edit English Rules"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDuplicate(skill)}
                                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                                      title="Duplicate Skill"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                    {!skill.isBuiltIn && (
                                      <button
                                        onClick={() => handleDelete(skill.id)}
                                        className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded transition-colors"
                                        title="Delete Custom Skill"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {filteredSkills.length === 0 && (
                      <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
                        <p className="text-xs text-slate-400">No skills match the current filter.</p>
                        <button
                          onClick={() => {
                            setSelectedCategory('all');
                            setStatusFilter('all');
                            setSearchQuery('');
                          }}
                          className="mt-2 text-xs text-indigo-400 hover:underline"
                        >
                          Clear filters
                        </button>
                      </div>
                    )}

                    {/* Reset Skills to default button */}
                    <div className="pt-4 border-t border-slate-800 flex items-center justify-end">
                      <button
                        onClick={handleResetDefaults}
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset All to Defaults</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* TAB: LLM API KEYS */}
            {settingsActiveTab === 'api' && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Key className="w-4 h-4 text-zinc-300" />
                    <span>Multi-Model LLM API Key Management</span>
                  </h3>
                </div>

                <div className="p-5 rounded-2xl bg-[#14161f] border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white">Multi-Provider LLM Suite</h4>
                    </div>
                    <button
                      onClick={() => projectStore.toggleApiKeys(true)}
                      className="px-4 py-2 bg-white text-black hover:bg-zinc-200 rounded-xl text-xs font-bold shadow-md transition-colors flex items-center gap-2"
                    >
                      <Key className="w-4 h-4" />
                      <span>Open API Keys Manager</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                    <div className="p-3 bg-[#0d0e13] rounded-xl border border-white/10 text-xs">
                      <span className="text-[10px] text-zinc-400 font-mono font-bold block">GOOGLE</span>
                      <span className="font-bold text-white">Gemini 2.5</span>
                    </div>
                    <div className="p-3 bg-[#0d0e13] rounded-xl border border-white/10 text-xs">
                      <span className="text-[10px] text-zinc-400 font-mono font-bold block">OPENAI</span>
                      <span className="font-bold text-white">GPT-4o</span>
                    </div>
                    <div className="p-3 bg-[#0d0e13] rounded-xl border border-white/10 text-xs">
                      <span className="text-[10px] text-zinc-400 font-mono font-bold block">ANTHROPIC</span>
                      <span className="font-bold text-white">Claude 3.5</span>
                    </div>
                    <div className="p-3 bg-[#0d0e13] rounded-xl border border-white/10 text-xs">
                      <span className="text-[10px] text-zinc-400 font-mono font-bold block">DEEPSEEK</span>
                      <span className="font-bold text-white">V3 / R1</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: TIMELINE & EDITING */}
            {settingsActiveTab === 'timeline' && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="text-sm font-bold text-white">Timeline & Trimming Preferences</h3>
                </div>

                <div className="space-y-4">
                  {/* Magnetic Ripple */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white">Magnetic Ripple Trimming</h4>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isMagneticRipple}
                        onChange={() => projectStore.toggleMagneticRipple()}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
                    </label>
                  </div>

                  {/* Overlap Resolution */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white">Auto-Resolve Track Overlaps</h4>
                    </div>
                    <button
                      onClick={() => {
                        projectStore.resolveOverlaps();
                        showToast('Track overlaps cleanly resolved');
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
                    >
                      Resolve Overlaps Now
                    </button>
                  </div>

                  {/* Default Transition Duration */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-white">Default Transition Duration</span>
                      <span className="font-mono text-indigo-400">0.30s</span>
                    </div>
                  </div>

                  {/* History Stack Manager */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white">History Stack Manager</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => projectStore.setSettingsTab('history')}
                      className="px-3 py-1.5 bg-[#C9A84C]/15 hover:bg-[#C9A84C]/25 text-[#E8C97A] border border-[#C9A84C]/40 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>Inspect History Stack</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: CANVAS & ASPECT RATIO */}
            {settingsActiveTab === 'canvas' && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="text-sm font-bold text-white">Canvas & Aspect Ratio Settings</h3>
                </div>

                <div className="space-y-4">
                  {/* Aspect Ratio Cards */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: '9:16', label: '9:16 Portrait', res: '1080 × 1920' },
                      { id: '16:9', label: '16:9 Landscape', res: '1920 × 1080' },
                      { id: '1:1', label: '1:1 Square', res: '1080 × 1080' },
                    ].map((fmt) => (
                      <div
                        key={fmt.id}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          project.settings.aspectRatio === fmt.id
                            ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-sm'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                        onClick={() => {
                          const [w, h] = fmt.id === '9:16' ? [1080, 1920] : fmt.id === '16:9' ? [1920, 1080] : [1080, 1080];
                          projectStore.setProject({
                            ...project,
                            settings: {
                              ...project.settings,
                              aspectRatio: fmt.id as any,
                              resolution: { width: w, height: h },
                            },
                          });
                          showToast(`Canvas set to ${fmt.label}`);
                        }}
                      >
                        <div className="font-bold text-xs">{fmt.label}</div>
                        <div className="text-[10px] font-mono text-indigo-400 mt-2">{fmt.res}</div>
                      </div>
                    ))}
                  </div>

                  {/* FPS */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white">Rendering Frame Rate</h4>
                    </div>
                    <span className="px-3 py-1 rounded bg-slate-800 text-xs font-mono text-indigo-300">
                      {project.settings.fps || 30} FPS
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: AUDIO & SOUND */}
            {settingsActiveTab === 'export' && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="text-sm font-bold text-white">Audio & Sound Design Engine</h3>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-white">Target Dialogue Ducking Level</span>
                      <span className="font-mono text-indigo-400">-20 dB</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-white">Audio Pitch Correction</span>
                      <span className="font-mono text-emerald-400">Enabled</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: AI PARTNER */}
            {settingsActiveTab === 'ai' && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="text-sm font-bold text-white">AI Co-Editor & Partner Configuration</h3>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-white">Selected AI Model</span>
                      <span className="font-mono text-indigo-400">Gemini 2.5 Flash / Flash-Lite</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-white">Active English Skills Applied</span>
                      <span className="font-mono text-indigo-400 font-bold">{activeSkillsCount} Active</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: HISTORY STACK & UNDO */}
            {settingsActiveTab === 'history' && (
              <div className="space-y-6 max-w-2xl">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <History className="w-4 h-4 text-[#C9A84C]" />
                      <span>History Stack Manager</span>
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => projectStore.undo()}
                      disabled={past.length === 0}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors ${
                        past.length > 0
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 cursor-pointer'
                          : 'text-slate-600 border-slate-800/50 cursor-not-allowed opacity-50'
                      }`}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Undo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => projectStore.redo()}
                      disabled={future.length === 0}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors ${
                        future.length > 0
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 cursor-pointer'
                          : 'text-slate-600 border-slate-800/50 cursor-not-allowed opacity-50'
                      }`}
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Redo</span>
                    </button>
                  </div>
                </div>

                {past.length === 0 && future.length === 0 ? (
                  <div className="py-12 text-center bg-slate-950/60 rounded-xl border border-slate-800/80">
                    <History className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    <h4 className="text-xs font-semibold text-slate-300">No edits recorded yet</h4>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                      Timeline edits such as splits, trims, clip movements, keyframes, and transitions will be listed here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Future / Redoable edits */}
                    {future.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                          <RotateCw className="w-3 h-3 text-slate-400" />
                          Future Redoable Edits
                        </span>
                        <div className="space-y-1.5">
                          {future.map((action, idx) => (
                            <div
                              key={action.id || `future-${idx}`}
                              onClick={() => projectStore.jumpToHistory(idx, true)}
                              className="group flex items-center justify-between p-2.5 rounded-lg border border-dashed border-slate-800 hover:border-indigo-500/50 bg-slate-950/40 hover:bg-indigo-950/20 transition-all cursor-pointer"
                            >
                              <div>
                                <div className="text-xs font-medium text-slate-300 group-hover:text-white">
                                  {action.description || 'Edit'}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  {formatRelativeTime(action.timestamp)}
                                </div>
                              </div>
                              <span className="text-xs text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                Redo to here &rarr;
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Current State */}
                    <div className="p-3 rounded-xl bg-slate-950 border border-indigo-500/30 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs font-bold text-white">Current Active State</span>
                      </div>
                      <span className="text-xs text-emerald-400 font-medium">Synchronized</span>
                    </div>

                    {/* Past Edits */}
                    {past.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                          <RotateCcw className="w-3 h-3 text-slate-400" />
                          Past Timeline Edits
                        </span>
                        <div className="space-y-1.5">
                          {[...past].reverse().map((action, revIdx) => {
                            const origIdx = past.length - 1 - revIdx;
                            const isLatest = revIdx === 0;
                            return (
                              <div
                                key={action.id || `past-${origIdx}`}
                                onClick={() => {
                                  if (!isLatest) projectStore.jumpToHistory(origIdx, false);
                                }}
                                className={`group flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                                  isLatest
                                    ? 'border-indigo-500/40 bg-indigo-950/20 cursor-default'
                                    : 'border-slate-800 hover:border-slate-700 bg-slate-950/60 hover:bg-slate-900 cursor-pointer'
                                }`}
                              >
                                <div>
                                  <div className="text-xs font-medium text-slate-200 group-hover:text-white">
                                    {action.description || 'Edit'}
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    {formatRelativeTime(action.timestamp)}
                                  </div>
                                </div>
                                {!isLatest ? (
                                  <span className="text-xs text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                    Revert to here
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-indigo-300 bg-indigo-500/20 px-1.5 py-0.5 rounded font-medium">
                                    Latest
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
