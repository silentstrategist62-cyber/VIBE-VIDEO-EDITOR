import React, { useState, useRef, useEffect } from 'react';
import {
  FolderOpen,
  Download,
  RotateCcw,
  RotateCw,
  History,
  Sparkles,
  Bot,
  Film,
  Sliders,
  Keyboard,
  Magnet,
  Check,
  Plus,
  Settings,
  Key,
  ShieldCheck,
  Cpu,
  Zap,
} from 'lucide-react';
import { projectStore, useProjectStore } from '../store/projectStore';

interface VerticalMenuBarProps {
  onBackToHome: () => void;
}

export const VerticalMenuBar: React.FC<VerticalMenuBarProps> = ({ onBackToHome }) => {
  const {
    isChatOpen,
    isLeftPanelCollapsed,
    isRightPanelOpen,
    isTimelineCollapsed,
    showTitleBars,
    layoutPreset,
    isMagneticRipple,
    project,
  } = useProjectStore();

  const [activeMenu, setActiveMenu] = useState<'file' | 'edit' | 'view' | 'settings' | 'help' | 'api' | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const canUndo = Boolean(project.history && project.history.past.length > 0);
  const canRedo = Boolean(project.history && project.history.future.length > 0);

  const menuButtons = [
    { id: 'file', label: 'File' },
    { id: 'edit', label: 'Edit' },
    { id: 'view', label: 'View' },
    { id: 'settings', label: 'Settings' },
    { id: 'help', label: 'Help' },
    { id: 'api', label: 'API' },
  ] as const;

  return (
    <nav
      id="vertical-editor-menu-bar"
      ref={menuRef}
      className="w-13 sm:w-14 bg-[#0a0a0a] border-r border-white/[0.08] flex flex-col items-center py-2.5 shrink-0 z-30 select-none text-[#EEF0F4]"
      aria-label="Editor Menu"
    >
      <div className="flex flex-col items-stretch gap-1.5 w-full px-1.5">
        {menuButtons.map((btn) => {
          const isActive = activeMenu === btn.id;
          return (
            <div key={btn.id} className="relative w-full">
              <button
                id={`btn-vmenu-${btn.id}`}
                onClick={() => setActiveMenu(isActive ? null : btn.id)}
                className={`w-full py-2 px-1 rounded-md text-[11px] font-medium tracking-wide transition-all cursor-pointer text-center ${
                  isActive
                    ? 'bg-[#1e1e1e] text-[#C9A84C] border border-[#C9A84C]/50 shadow-sm'
                    : 'text-[#888888] hover:text-[#EEF0F4] hover:bg-white/[0.06] border border-transparent'
                }`}
                title={btn.id === 'settings' ? 'Settings Menu' : `${btn.label} menu`}
              >
                {btn.id === 'settings' ? (
                  <Settings className={`w-4 h-4 mx-auto transition-colors ${isActive ? 'text-[#C9A84C]' : ''}`} />
                ) : (
                  btn.label
                )}
              </button>

              {/* Flyout Menu (Pops out to the right of the vertical rail) */}
              {isActive && (
                <div
                  className="absolute left-full top-0 ml-2 w-60 bg-[#141414] border border-white/[0.12] rounded-xl shadow-2xl py-1.5 z-50 text-xs backdrop-blur-md overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                >
                  {btn.id === 'file' && (
                    <div className="space-y-0.5">
                      <div className="px-3 py-1 text-[10px] font-mono text-[#888888] uppercase tracking-wider">
                        Project & Media
                      </div>
                      <button
                        onClick={() => {
                          setActiveMenu(null);
                          onBackToHome();
                        }}
                        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-white/[0.08] text-[#EEF0F4] transition-colors cursor-pointer text-left"
                      >
                        <span className="flex items-center gap-2">
                          <FolderOpen className="w-3.5 h-3.5 text-[#C9A84C]" />
                          HOME
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          setActiveMenu(null);
                          projectStore.toggleAutonomousModal(true);
                        }}
                        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-white/[0.08] text-[#EEF0F4] transition-colors cursor-pointer text-left"
                      >
                        <span className="flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-[#C9A84C]" />
                          Autonomous Presets
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          setActiveMenu(null);
                          projectStore.setActiveLeftTab('media');
                          projectStore.toggleLeftPanel(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-white/[0.08] text-[#EEF0F4] transition-colors cursor-pointer text-left"
                      >
                        <span className="flex items-center gap-2">
                          <Plus className="w-3.5 h-3.5 text-[#2ECC71]" />
                          Import Media Files...
                        </span>
                      </button>
                      <div className="h-px bg-white/[0.08] my-1" />
                      <button
                        onClick={() => {
                          setActiveMenu(null);
                          projectStore.toggleExport(true);
                        }}
                        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-white/[0.08] text-[#EEF0F4] transition-colors cursor-pointer text-left"
                      >
                        <span className="flex items-center gap-2">
                          <Download className="w-3.5 h-3.5 text-[#2ECC71]" />
                          Export 9:16 Video...
                        </span>
                        <span className="text-[10px] text-[#888888] font-mono">Ctrl+E</span>
                      </button>
                    </div>
                  )}

                  {btn.id === 'edit' && (
                    <div className="space-y-0.5">
                      <div className="px-3 py-1 text-[10px] font-mono text-[#888888] uppercase tracking-wider">
                        Timeline Editing
                      </div>
                      <button
                        onClick={() => {
                          projectStore.undo();
                          setActiveMenu(null);
                        }}
                        disabled={!canUndo}
                        className={`w-full flex items-center justify-between px-3 py-1.5 transition-colors text-left ${
                          canUndo
                            ? 'hover:bg-white/[0.08] text-[#EEF0F4] cursor-pointer'
                            : 'text-[#555555] cursor-not-allowed'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <RotateCcw className="w-3.5 h-3.5" />
                          Undo
                        </span>
                        <span className="text-[10px] text-[#888888] font-mono">Ctrl+Z</span>
                      </button>
                      <button
                        onClick={() => {
                          projectStore.redo();
                          setActiveMenu(null);
                        }}
                        disabled={!canRedo}
                        className={`w-full flex items-center justify-between px-3 py-1.5 transition-colors text-left ${
                          canRedo
                            ? 'hover:bg-white/[0.08] text-[#EEF0F4] cursor-pointer'
                            : 'text-[#555555] cursor-not-allowed'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <RotateCw className="w-3.5 h-3.5" />
                          Redo
                        </span>
                        <span className="text-[10px] text-[#888888] font-mono">Ctrl+Y</span>
                      </button>
                      <button
                        onClick={() => {
                          projectStore.splitAtPlayhead();
                          setActiveMenu(null);
                        }}
                        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-white/[0.08] text-[#EEF0F4] transition-colors cursor-pointer text-left"
                      >
                        <span>Split at Playhead</span>
                        <span className="text-[10px] text-[#888888] font-mono">S</span>
                      </button>
                      <button
                        onClick={() => {
                          projectStore.deleteSelectedClip();
                          setActiveMenu(null);
                        }}
                        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-white/[0.08] text-[#EEF0F4] transition-colors cursor-pointer text-left"
                      >
                        <span>Delete Clip</span>
                        <span className="text-[10px] text-[#888888] font-mono">Del</span>
                      </button>
                      <div className="h-px bg-white/[0.08] my-1" />
                      <button
                        onClick={() => {
                          setActiveMenu(null);
                          projectStore.toggleHistoryModal(true);
                        }}
                        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-white/[0.08] text-[#EEF0F4] transition-colors cursor-pointer text-left"
                      >
                        <span className="flex items-center gap-2">
                          <History className="w-3.5 h-3.5 text-[#C9A84C]" />
                          History Stack...
                        </span>
                        <span className="text-[10px] text-[#888888] font-mono">H</span>
                      </button>
                    </div>
                  )}

                  {btn.id === 'view' && (
                    <div className="space-y-0.5">
                      <div className="px-3 py-1 text-[10px] font-mono text-[#888888] uppercase tracking-wider">
                        Workspace Panels
                      </div>
                      <button
                        onClick={() => {
                          projectStore.toggleChat();
                          setActiveMenu(null);
                        }}
                        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-white/[0.08] text-[#EEF0F4] transition-colors cursor-pointer text-left"
                      >
                        <span className="flex items-center gap-2">
                          <Bot className="w-3.5 h-3.5 text-[#C9A84C]" />
                          AI Agent Panel
                        </span>
                        {isChatOpen && <Check className="w-3.5 h-3.5 text-[#2ECC71]" />}
                      </button>
                      <button
                        onClick={() => {
                          projectStore.toggleLeftPanel();
                          setActiveMenu(null);
                        }}
                        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-white/[0.08] text-[#EEF0F4] transition-colors cursor-pointer text-left"
                      >
                        <span className="flex items-center gap-2">
                          <FolderOpen className="w-3.5 h-3.5 text-[#C9A84C]" />
                          Tools & Media Drawer
                        </span>
                        {!isLeftPanelCollapsed && <Check className="w-3.5 h-3.5 text-[#2ECC71]" />}
                      </button>
                      <button
                        onClick={() => {
                          projectStore.toggleTimeline();
                          setActiveMenu(null);
                        }}
                        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-white/[0.08] text-[#EEF0F4] transition-colors cursor-pointer text-left"
                      >
                        <span className="flex items-center gap-2">
                          <Film className="w-3.5 h-3.5 text-[#2ECC71]" />
                          Multi-Track Timeline
                        </span>
                        {!isTimelineCollapsed && <Check className="w-3.5 h-3.5 text-[#2ECC71]" />}
                      </button>
                      <div className="h-px bg-white/[0.08] my-1" />
                      <button
                        onClick={() => {
                          projectStore.restoreDefaultLayout();
                          setActiveMenu(null);
                        }}
                        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-white/[0.08] text-[#C9A84C] transition-colors cursor-pointer text-left"
                      >
                        <span>Reset Workspace</span>
                      </button>
                    </div>
                  )}

                  {btn.id === 'settings' && (
                    <div className="space-y-0.5">
                      <div className="px-3 py-1 text-[10px] font-mono text-[#888888] uppercase tracking-wider">
                        Settings & Rules
                      </div>
                      <button
                        onClick={() => {
                          setActiveMenu(null);
                          projectStore.toggleSettings(true, 'skills');
                        }}
                        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-white/[0.08] text-[#EEF0F4] transition-colors cursor-pointer text-left"
                      >
                        <span>Skills & AI Rules...</span>
                      </button>
                      <button
                        onClick={() => {
                          setActiveMenu(null);
                          projectStore.toggleSettings(true, 'canvas');
                        }}
                        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-white/[0.08] text-[#EEF0F4] transition-colors cursor-pointer text-left"
                      >
                        <span>Canvas & Safe Zones...</span>
                      </button>
                      <button
                        onClick={() => {
                          setActiveMenu(null);
                          projectStore.toggleSettings(true, 'timeline');
                        }}
                        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-white/[0.08] text-[#EEF0F4] transition-colors cursor-pointer text-left"
                      >
                        <span>Timeline Preferences...</span>
                      </button>
                      <div className="h-px bg-white/[0.08] my-1" />
                      <button
                        onClick={() => {
                          projectStore.toggleMagneticRipple();
                          setActiveMenu(null);
                        }}
                        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-white/[0.08] text-[#EEF0F4] transition-colors cursor-pointer text-left"
                      >
                        <span className="flex items-center gap-2">
                          <Magnet className="w-3.5 h-3.5 text-[#C9A84C]" />
                          Magnetic Ripple Mode
                        </span>
                        {isMagneticRipple && <Check className="w-3.5 h-3.5 text-[#2ECC71]" />}
                      </button>
                    </div>
                  )}

                  {btn.id === 'help' && (
                    <div className="space-y-0.5">
                      <div className="px-3 py-1 text-[10px] font-mono text-[#888888] uppercase tracking-wider">
                        Help & Keys
                      </div>
                      <button
                        onClick={() => {
                          setActiveMenu(null);
                          projectStore.toggleApiKeys(true);
                        }}
                        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-white/[0.08] text-[#EEF0F4] transition-colors cursor-pointer text-left"
                      >
                        <span className="flex items-center gap-2">
                          <Key className="w-3.5 h-3.5 text-[#C9A84C]" />
                          LLM API Keys... (Multi-Model)
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          setActiveMenu(null);
                          projectStore.toggleShortcuts(true);
                        }}
                        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-white/[0.08] text-[#EEF0F4] transition-colors cursor-pointer text-left"
                      >
                        <span className="flex items-center gap-2">
                          <Keyboard className="w-3.5 h-3.5 text-[#C9A84C]" />
                          Keyboard Shortcuts
                        </span>
                        <span className="text-[10px] text-[#888888] font-mono">?</span>
                      </button>
                    </div>
                  )}

                  {btn.id === 'api' && (
                    <div className="space-y-0.5">
                      <div className="px-3 py-1 text-[10px] font-mono text-[#888888] uppercase tracking-wider">
                        LLM Model API Keys
                      </div>
                      <button
                        onClick={() => {
                          setActiveMenu(null);
                          projectStore.toggleApiKeys(true);
                        }}
                        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-white/[0.08] text-[#EEF0F4] transition-colors cursor-pointer text-left"
                      >
                        <span className="flex items-center gap-2">
                          <Key className="w-3.5 h-3.5 text-[#C9A84C]" />
                          Manage API Keys...
                        </span>
                        <span className="text-[10px] text-[#2ECC71] font-mono font-bold">MULTI</span>
                      </button>
                      <div className="h-px bg-white/[0.08] my-1" />
                      <div className="px-3 py-1 text-[10px] font-mono text-[#666666]">
                        Supported Providers:
                      </div>
                      <div className="px-3 py-1 text-[11px] text-[#aaaaaa] space-y-1">
                        <div className="flex items-center gap-1.5 text-blue-400 font-medium">
                          <Sparkles className="w-3 h-3" /> Google Gemini
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                          <Bot className="w-3 h-3" /> OpenAI GPT-4o
                        </div>
                        <div className="flex items-center gap-1.5 text-amber-400 font-medium">
                          <Zap className="w-3 h-3" /> Anthropic Claude 3.5
                        </div>
                        <div className="flex items-center gap-1.5 text-cyan-400 font-medium">
                          <Cpu className="w-3 h-3" /> DeepSeek & Groq
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
};
