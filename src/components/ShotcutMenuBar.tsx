import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Check,
  RotateCcw,
  RotateCw,
  FolderOpen,
  Save,
  Download,
  Sliders,
  Sparkles,
  Bot,
  Film,
  Keyboard,
  History,
  LayoutTemplate,
  Maximize2,
  Grid,
  Menu,
  Magnet,
} from 'lucide-react';
import { projectStore, useProjectStore } from '../store/projectStore';

export const ShotcutMenuBar: React.FC<{ onBackToHome: () => void }> = ({ onBackToHome }) => {
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

  const [activeMenu, setActiveMenu] = useState<'file' | 'edit' | 'view' | 'settings' | 'help' | 'mobile_all' | null>(null);
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

  return (
    <div ref={menuRef} className="relative flex items-center text-xs font-medium text-slate-300 select-none">
      {/* Mobile Compact Menu Dropdown Button */}
      <div className="md:hidden relative">
        <button
          onClick={() => setActiveMenu(activeMenu === 'mobile_all' ? null : 'mobile_all')}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-colors cursor-pointer border ${
            activeMenu === 'mobile_all'
              ? 'bg-slate-800 text-white border-slate-700'
              : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:text-white'
          }`}
          title="Shotcut Editor Menu"
        >
          <Menu className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs font-semibold">Menu</span>
        </button>

        {activeMenu === 'mobile_all' && (
          <div className="absolute left-0 top-full mt-1.5 w-64 bg-slate-900/98 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 text-xs backdrop-blur-md max-h-[75vh] overflow-y-auto space-y-2">
            <div>
              <div className="text-[10px] font-mono uppercase text-slate-400 font-bold px-2 py-1">HOME</div>
              <button
                onClick={() => {
                  setActiveMenu(null);
                  onBackToHome();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-slate-800 text-slate-200 cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
                <span>HOME</span>
              </button>
              <button
                onClick={() => {
                  setActiveMenu(null);
                  projectStore.toggleAutonomousModal(true);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-slate-800 text-slate-200 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Autonomous Manifest Presets</span>
              </button>
            </div>

            <div className="border-t border-slate-800 pt-1.5">
              <div className="text-[10px] font-mono uppercase text-slate-400 font-bold px-2 py-1">Workspace Views</div>
              <button
                onClick={() => {
                  setActiveMenu(null);
                  projectStore.setMobileView('agent');
                  projectStore.toggleChat(true);
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-slate-800 text-slate-200 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Bot className="w-3.5 h-3.5 text-cyan-400" />
                  <span>AI Co-Editor</span>
                </span>
                {isChatOpen && <Check className="w-3.5 h-3.5 text-cyan-400" />}
              </button>
              <button
                onClick={() => {
                  setActiveMenu(null);
                  projectStore.setMobileView('media');
                  projectStore.toggleLeftPanel(false);
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-slate-800 text-slate-200 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span>Media / Playlist</span>
                </span>
                {!isLeftPanelCollapsed && <Check className="w-3.5 h-3.5 text-amber-400" />}
              </button>
              <button
                onClick={() => {
                  setActiveMenu(null);
                  projectStore.setMobileView('timeline');
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-slate-800 text-slate-200 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Film className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Timeline</span>
                </span>
                {!isTimelineCollapsed && <Check className="w-3.5 h-3.5 text-emerald-400" />}
              </button>
              <button
                onClick={() => {
                  setActiveMenu(null);
                  projectStore.setMobileView('inspector');
                  projectStore.toggleRightPanel(true);
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-slate-800 text-slate-200 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Properties / Inspector</span>
                </span>
                {isRightPanelOpen && <Check className="w-3.5 h-3.5 text-indigo-400" />}
              </button>
            </div>

            <div className="border-t border-slate-800 pt-1.5">
              <div className="text-[10px] font-mono uppercase text-slate-400 font-bold px-2 py-1">Settings & Shortcuts</div>
              <button
                onClick={() => {
                  setActiveMenu(null);
                  projectStore.toggleSettings(true, 'skills');
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-slate-800 text-slate-200 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Skills & Rules</span>
              </button>
              <button
                onClick={() => {
                  setActiveMenu(null);
                  projectStore.toggleShortcuts(true);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-slate-800 text-slate-200 cursor-pointer"
              >
                <Keyboard className="w-3.5 h-3.5 text-indigo-400" />
                <span>Keyboard Shortcuts</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Desktop inline menus */}
      <div className="hidden md:flex items-center">
      {/* Menu Item: File */}
      <div className="relative">
        <button
          onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')}
          className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
            activeMenu === 'file' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/80 hover:text-white'
          }`}
        >
          File
        </button>
        {activeMenu === 'file' && (
          <div className="absolute left-0 top-full mt-1 w-52 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl py-1 z-50 text-xs">
            <button
              onClick={() => {
                setActiveMenu(null);
                onBackToHome();
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800 text-slate-200 hover:text-white"
            >
              <span className="flex items-center gap-2">
                <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
                HOME
              </span>
            </button>
            <button
              onClick={() => {
                setActiveMenu(null);
                projectStore.toggleAutonomousModal(true);
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800 text-slate-200 hover:text-white"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Autonomous Manifest Presets
              </span>
            </button>
            <div className="h-px bg-slate-800 my-1" />
            <button
              onClick={() => {
                setActiveMenu(null);
                projectStore.toggleExport(true);
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800 text-slate-200 hover:text-white"
            >
              <span className="flex items-center gap-2">
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                Export 9:16 Video...
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Ctrl+E</span>
            </button>
          </div>
        )}
      </div>

      {/* Menu Item: Edit */}
      <div className="relative">
        <button
          onClick={() => setActiveMenu(activeMenu === 'edit' ? null : 'edit')}
          className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
            activeMenu === 'edit' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/80 hover:text-white'
          }`}
        >
          Edit
        </button>
        {activeMenu === 'edit' && (
          <div className="absolute left-0 top-full mt-1 w-52 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl py-1 z-50 text-xs">
            <button
              onClick={() => {
                projectStore.undo();
                setActiveMenu(null);
              }}
              disabled={!canUndo}
              className={`w-full flex items-center justify-between px-3 py-1.5 ${
                canUndo ? 'hover:bg-slate-800 text-slate-200 hover:text-white' : 'text-slate-600 cursor-not-allowed'
              }`}
            >
              <span className="flex items-center gap-2">
                <RotateCcw className="w-3.5 h-3.5" />
                Undo
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Ctrl+Z</span>
            </button>
            <button
              onClick={() => {
                projectStore.redo();
                setActiveMenu(null);
              }}
              disabled={!canRedo}
              className={`w-full flex items-center justify-between px-3 py-1.5 ${
                canRedo ? 'hover:bg-slate-800 text-slate-200 hover:text-white' : 'text-slate-600 cursor-not-allowed'
              }`}
            >
              <span className="flex items-center gap-2">
                <RotateCw className="w-3.5 h-3.5" />
                Redo
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Ctrl+Y</span>
            </button>
            <button
              onClick={() => {
                setActiveMenu(null);
                projectStore.toggleHistoryModal(true);
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800 text-slate-200 hover:text-white"
            >
              <span className="flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-indigo-400" />
                History Stack...
              </span>
              <span className="text-[10px] text-slate-500 font-mono">H</span>
            </button>
          </div>
        )}
      </div>

      {/* Menu Item: View (Shotcut Layout & Collapsible Panels) */}
      <div className="relative">
        <button
          onClick={() => setActiveMenu(activeMenu === 'view' ? null : 'view')}
          className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
            activeMenu === 'view' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/80 hover:text-white'
          }`}
        >
          View
        </button>
        {activeMenu === 'view' && (
          <div className="absolute left-0 top-full mt-1 w-64 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl py-1 z-50 text-xs">
            <div className="px-3 py-1 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              Layout Presets
            </div>
            <button
              onClick={() => {
                projectStore.setLayoutPreset('default');
                setActiveMenu(null);
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800 text-slate-200 hover:text-white"
            >
              <span>Default (All Docks Open)</span>
              {layoutPreset === 'default' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
            </button>
            <button
              onClick={() => {
                projectStore.setLayoutPreset('ai_focus');
                setActiveMenu(null);
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800 text-slate-200 hover:text-white"
            >
              <span>AI Co-Pilot Focus</span>
              {layoutPreset === 'ai_focus' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
            </button>
            <button
              onClick={() => {
                projectStore.setLayoutPreset('editing');
                setActiveMenu(null);
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800 text-slate-200 hover:text-white"
            >
              <span>Editing (Timeline & Media)</span>
              {layoutPreset === 'editing' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
            </button>
            <button
              onClick={() => {
                projectStore.setLayoutPreset('color_fx');
                setActiveMenu(null);
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800 text-slate-200 hover:text-white"
            >
              <span>Color & Audio FX</span>
              {layoutPreset === 'color_fx' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
            </button>
            <button
              onClick={() => {
                projectStore.setLayoutPreset('compact');
                setActiveMenu(null);
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800 text-slate-200 hover:text-white"
            >
              <span>Compact / Max Canvas</span>
              {layoutPreset === 'compact' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
            </button>
            <button
              onClick={() => {
                projectStore.restoreDefaultLayout();
                setActiveMenu(null);
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 font-medium"
            >
              <span>Restore Default Layout</span>
            </button>

            <div className="h-px bg-slate-800 my-1" />
            <div className="px-3 py-1 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              Toggle Panels
            </div>
            <button
              onClick={() => {
                projectStore.toggleChat();
                setActiveMenu(null);
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800 text-slate-200 hover:text-white"
            >
              <span className="flex items-center gap-2">
                <Bot className="w-3.5 h-3.5 text-cyan-400" />
                AI Agent Panel
              </span>
              {isChatOpen && <Check className="w-3.5 h-3.5 text-cyan-400" />}
            </button>
            <button
              onClick={() => {
                projectStore.toggleLeftPanel();
                setActiveMenu(null);
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800 text-slate-200 hover:text-white"
            >
              <span className="flex items-center gap-2">
                <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                Playlist & Media Drawer
              </span>
              {!isLeftPanelCollapsed && <Check className="w-3.5 h-3.5 text-cyan-400" />}
            </button>
            <button
              onClick={() => {
                projectStore.toggleRightPanel();
                setActiveMenu(null);
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800 text-slate-200 hover:text-white"
            >
              <span className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                Properties / Inspector
              </span>
              {isRightPanelOpen && <Check className="w-3.5 h-3.5 text-cyan-400" />}
            </button>
            <button
              onClick={() => {
                projectStore.toggleTimeline();
                setActiveMenu(null);
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800 text-slate-200 hover:text-white"
            >
              <span className="flex items-center gap-2">
                <Film className="w-3.5 h-3.5 text-emerald-400" />
                Multi-Track Timeline
              </span>
              {!isTimelineCollapsed && <Check className="w-3.5 h-3.5 text-cyan-400" />}
            </button>

            <div className="h-px bg-slate-800 my-1" />
            <button
              onClick={() => {
                projectStore.toggleShowTitleBars();
                setActiveMenu(null);
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800 text-slate-200 hover:text-white"
            >
              <span>Show Panel Title Bars</span>
              {showTitleBars && <Check className="w-3.5 h-3.5 text-cyan-400" />}
            </button>
          </div>
        )}
      </div>

      {/* Menu Item: Settings */}
      <div className="relative">
        <button
          onClick={() => setActiveMenu(activeMenu === 'settings' ? null : 'settings')}
          className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
            activeMenu === 'settings' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/80 hover:text-white'
          }`}
        >
          Settings
        </button>
        {activeMenu === 'settings' && (
          <div className="absolute left-0 top-full mt-1 w-64 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl py-1 z-50 text-xs">
            <button
              onClick={() => {
                setActiveMenu(null);
                projectStore.toggleSettings(true, 'skills');
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800 text-slate-200 hover:text-white"
            >
              <span>Skills & AI Rules...</span>
            </button>
            <button
              onClick={() => {
                setActiveMenu(null);
                projectStore.toggleSettings(true, 'timeline');
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800 text-slate-200 hover:text-white"
            >
              <span>Timeline Preferences...</span>
            </button>
            <button
              onClick={() => {
                projectStore.toggleMagneticRipple();
                setActiveMenu(null);
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800 text-slate-200 hover:text-white"
            >
              <span className="flex items-center gap-2">
                <Magnet className="w-3.5 h-3.5 text-[#C9A84C]" />
                Magnetic Ripple Mode
              </span>
              {isMagneticRipple && <Check className="w-3.5 h-3.5 text-cyan-400" />}
            </button>
            <button
              onClick={() => {
                setActiveMenu(null);
                projectStore.toggleSettings(true, 'history');
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800 text-slate-200 hover:text-white"
            >
              <span className="flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-[#C9A84C]" />
                History Stack Manager...
              </span>
            </button>
            <button
              onClick={() => {
                setActiveMenu(null);
                projectStore.toggleSettings(true, 'canvas');
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800 text-slate-200 hover:text-white"
            >
              <span>Canvas & Safe Zones...</span>
            </button>
          </div>
        )}
      </div>

      {/* Menu Item: Help */}
      <div className="relative">
        <button
          onClick={() => setActiveMenu(activeMenu === 'help' ? null : 'help')}
          className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
            activeMenu === 'help' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/80 hover:text-white'
          }`}
        >
          Help
        </button>
        {activeMenu === 'help' && (
          <div className="absolute left-0 top-full mt-1 w-52 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl py-1 z-50 text-xs">
            <button
              onClick={() => {
                setActiveMenu(null);
                projectStore.toggleShortcuts(true);
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800 text-slate-200 hover:text-white"
            >
              <span className="flex items-center gap-2">
                <Keyboard className="w-3.5 h-3.5 text-indigo-400" />
                Keyboard Shortcuts
              </span>
              <span className="text-[10px] text-slate-500 font-mono">?</span>
            </button>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};
