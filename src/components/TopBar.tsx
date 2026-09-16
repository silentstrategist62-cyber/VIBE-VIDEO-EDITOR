import React from 'react';
import {
  Download,
  Sparkles,
  ChevronLeft,
  Sliders,
  FolderOpen,
  Music,
  Type,
  Shuffle,
  Flame,
  Bot,
} from 'lucide-react';
import { projectStore, useProjectStore } from '../store/projectStore';

interface TopBarProps {
  onBackToHome: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onBackToHome }) => {
  const {
    isChatOpen,
    isSettingsOpen,
    activeLeftTab,
    isLeftPanelCollapsed,
  } = useProjectStore();

  const horizontalTabs = [
    { id: 'presets', label: 'Presets', icon: Sparkles },
    { id: 'media', label: 'Media', icon: FolderOpen },
    { id: 'captions', label: 'Captions', icon: Type },
    { id: 'transitions', label: 'Transitions', icon: Shuffle },
    { id: 'effects', label: 'Adjust', icon: Sliders },
    { id: 'audio', label: 'Audio', icon: Music },
    { id: 'recipes', label: 'Recipes', icon: Flame },
  ] as const;

  const handleTabClick = (tabId: typeof activeLeftTab) => {
    if (activeLeftTab === tabId && !isLeftPanelCollapsed) {
      projectStore.toggleLeftPanel(true);
    } else {
      projectStore.setActiveLeftTab(tabId);
      if (isLeftPanelCollapsed) {
        projectStore.toggleLeftPanel(false);
      }
    }
  };

  return (
    <header className="h-13 bg-black/95 backdrop-blur border-b border-white/[0.08] pl-3 pr-3 sm:pl-4 sm:pr-4 flex items-center justify-between select-none z-30 shrink-0 gap-3">
      {/* Left section: Navigation & Tool Buttons (Image 7 moved leftwards where Image 5 was removed) */}
      <div className="flex items-center gap-2.5 shrink min-w-0">
        <button
          id="btn-back-home"
          onClick={onBackToHome}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[#7A8290] hover:text-[#EEF0F4] hover:bg-white/[0.04] text-xs font-medium transition-colors cursor-pointer shrink-0"
          title="Back to Projects"
        >
          <ChevronLeft className="w-4 h-4 text-[#C9A84C]" />
          <span className="hidden sm:inline font-cinzel text-[11px] tracking-wider uppercase">Projects</span>
        </button>

        <div className="h-4 w-px bg-white/[0.08] shrink-0" />

        {/* Horizontal Tool Tabs (Image 7) moved further left where Image 5 was removed */}
        <nav
          id="top-horizontal-tools"
          className="hidden md:flex items-center gap-1 bg-[#111111] p-1 rounded-lg border border-white/[0.08] overflow-x-auto no-scrollbar shrink"
        >
          {horizontalTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive =
              !isLeftPanelCollapsed &&
              ((tab.id === 'media' && ['media', 'ai_generate', 'graphics'].includes(activeLeftTab)) ||
                (tab.id === 'captions' && ['captions', 'text'].includes(activeLeftTab)) ||
                activeLeftTab === tab.id);

            return (
              <button
                key={tab.id}
                id={`top-tab-${tab.id}`}
                onClick={() => handleTabClick(tab.id)}
                className={`flex flex-col items-center justify-center px-2.5 sm:px-3 py-1 rounded-md transition-all cursor-pointer min-w-[48px] ${
                  isActive
                    ? 'text-[#E8C97A] bg-[#C9A84C]/15 border border-[#C9A84C]/50 gold-glow-subtle'
                    : 'text-[#7A8290] hover:text-[#EEF0F4] hover:bg-white/[0.04]'
                }`}
                title={`${tab.label} (Click to open ${tab.label} drawer)`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${
                    isActive ? 'text-[#E8C97A] drop-shadow-[0_0_6px_rgba(201,168,76,0.6)]' : 'text-[#7A8290]'
                  }`}
                />
                <span className="text-[9px] font-medium leading-none tracking-tight mt-1">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Right section: AI Agent toggle / Skills / Export */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* AI Agent Visibility Toggle (Desktop) */}
        <button
          id="btn-toggle-chat"
          onClick={() => {
            projectStore.toggleChat();
          }}
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold font-cinzel tracking-wider border transition-all cursor-pointer ${
            isChatOpen
              ? 'bg-[#C9A84C]/15 text-[#E8C97A] border-[#C9A84C]/60 gold-glow-subtle'
              : 'bg-[#111111] text-[#7A8290] border-white/[0.08] hover:bg-white/[0.04] hover:text-[#EEF0F4]'
          }`}
          title={isChatOpen ? "Collapse AI Agent (drag right border to resize)" : "Expand AI Agent"}
        >
          <Bot className="w-3.5 h-3.5 text-[#C9A84C]" />
          <span className="hidden sm:inline">AI Agent</span>
          <span className={`w-1.5 h-1.5 rounded-full ${isChatOpen ? 'bg-[#2ECC71] shadow-[0_0_6px_rgba(46,204,113,0.8)]' : 'bg-[#4A5260]'}`} />
        </button>

        {/* Skills & Settings Button (Noise-free, no number badge) */}
        <button
          id="btn-open-settings-skills"
          onClick={() => projectStore.toggleSettings(true, 'skills')}
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
            isSettingsOpen
              ? 'bg-[#C9A84C]/15 text-[#E8C97A] border-[#C9A84C]/50'
              : 'bg-[#111111] text-[#7A8290] border-white/[0.08] hover:bg-white/[0.04] hover:text-white'
          }`}
          title="Skills & Execution Rules"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#C9A84C]" />
          <span className="hidden lg:inline font-cinzel text-[10px] tracking-wider uppercase">Skills</span>
        </button>

        {/* Export Deliverable Button */}
        <button
          id="btn-open-export"
          onClick={() => projectStore.toggleExport(true)}
          className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-[#C9A84C] to-[#E8C97A] text-black hover:brightness-110 rounded-md text-xs font-bold font-cinzel tracking-wider shadow-[0_0_15px_rgba(201,168,76,0.35)] transition-all cursor-pointer shrink-0"
        >
          <Download className="w-3.5 h-3.5 stroke-[2.5]" />
          <span className="hidden sm:inline">Export</span>
        </button>
      </div>
    </header>
  );
};
