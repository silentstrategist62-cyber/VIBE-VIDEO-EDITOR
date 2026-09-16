import React, { useState } from 'react';
import { projectStore, useProjectStore } from './store/projectStore';
import { TopBar } from './components/TopBar';
import { HomeView } from './components/HomeView';
import { LeftPanel } from './components/LeftPanel';
import { VerticalMenuBar } from './components/VerticalMenuBar';
import { PlayerPreview } from './components/PlayerPreview';
import { Timeline } from './components/Timeline';
import { ContextPanel } from './components/ContextPanel';
import { ChatboxPanel } from './components/ChatboxPanel';
import { MobileBottomNav } from './components/MobileBottomNav';
import { AutonomousModal } from './components/AutonomousModal';
import { ExportModal } from './components/ExportModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { HistoryStackModal } from './components/HistoryStackModal';
import { SettingsModal } from './components/SettingsModal';
import { ApiKeysModal } from './components/ApiKeysModal';
import { HistoryToast } from './components/HistoryToast';
import { ShotcutLeftDockHandle, ShotcutRightDockHandle, ShotcutTimelineDockHandle } from './components/ShotcutDockHandle';
import { useGlobalKeyboardShortcuts } from './hooks/useGlobalKeyboardShortcuts';
import { useIsMobile } from './hooks/useIsMobile';

export default function App() {
  const [currentView, setCurrentView] = useState<'editor' | 'home'>('editor');
  const { isTimelineCollapsed, mobileView, selectedClipId, project, isFullscreenViewer, isRightPanelOpen } = useProjectStore();
  const isMobile = useIsMobile();

  // Selected clip for contextual inspector options
  const selectedClip = selectedClipId
    ? project.timeline.tracks.flatMap((t) => t.clips).find((c) => c.clipId === selectedClipId)
    : null;

  // Activate global keyboard shortcuts when in editor view
  useGlobalKeyboardShortcuts(currentView === 'editor');

  if (currentView === 'home') {
    return (
      <main className="min-h-screen bg-[#080808] text-[#EEF0F4] font-sans relative">
        <div className="noise-overlay" />
        <HomeView onOpenProject={() => setCurrentView('editor')} />
        <AutonomousModal />
        <SettingsModal />
      </main>
    );
  }

  // Expanded uninterrupted viewing experience: hide all editing controls and sidebars
  if (isFullscreenViewer) {
    return (
      <main className="h-screen w-screen bg-[#000000] text-[#EEF0F4] font-sans overflow-hidden select-none relative flex flex-col items-center justify-center">
        <PlayerPreview isImmersiveMode={true} onExitImmersive={() => projectStore.toggleFullscreenViewer(false)} />
      </main>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-black text-[#EEF0F4] font-sans overflow-hidden select-none relative">
      <div className="noise-overlay" />
      {/* Top Navigation Bar with Shotcut Menu */}
      <TopBar onBackToHome={() => setCurrentView('home')} />

      {/* Main Studio Body: Responsive Switch between Mobile Single-Pane & Desktop Multi-Dock */}
      {isMobile ? (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          {/* Mobile Single-Pane Active View */}
          {mobileView === 'agent' && (
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <ChatboxPanel />
            </div>
          )}

          {mobileView === 'media' && (
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <LeftPanel />
            </div>
          )}

          {mobileView === 'inspector' && (
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <ContextPanel />
            </div>
          )}

          {mobileView === 'timeline' && (
            <main className="flex-1 flex flex-col min-h-0 bg-black overflow-hidden">
              {/* Top: 9:16 Portrait Canvas Player ("Viewer") */}
              <div className="flex-1 min-h-0 relative border-b border-slate-800/80">
                <PlayerPreview />
              </div>

              {/* Bottom: Multi-Track Timeline */}
              <div className="h-[210px] relative shrink-0">
                <Timeline />
              </div>
            </main>
          )}

          {/* Mobile Bottom Navigation Bar */}
          <MobileBottomNav />
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden relative">
          {/* Leftmost Column: Vertical Menu Bar (File, Edit, View, Settings, Help) replacing Image 6 */}
          <VerticalMenuBar onBackToHome={() => setCurrentView('home')} />

          {/* Dock handles for collapsed Left docks (AI Agent, Playlist) */}
          <ShotcutLeftDockHandle />

          {/* Leftmost Column: AI Agent (Image 1 placement) */}
          <ChatboxPanel />

          {/* Secondary Column: Tool & Asset Drawer (Presets, Media, Captions, etc.) */}
          <LeftPanel />

          {/* Center Canvas Player & Multi-Track Timeline */}
          <main className="flex-1 flex flex-col min-w-0 bg-black overflow-hidden p-1.5 sm:p-2 pr-3 sm:pr-4 pb-2 sm:pb-2.5 gap-2">
            {/* Top: 9:16 Portrait Canvas Player ("Viewer") & Inspector Dock */}
            <div className="basis-1/2 h-1/2 min-h-0 relative rounded-xl border border-white/[0.08] bg-[#0a0a0a] flex overflow-hidden shadow-sm">
              <div className="flex-1 min-w-0 h-full relative overflow-hidden">
                <PlayerPreview />
              </div>

              {/* CapCut-style Options on the right third of the screen only when a clip is actively selected */}
              {selectedClip && (
                <div className="w-80 lg:w-96 border-l border-white/[0.08] h-full overflow-hidden shrink-0 bg-[#0e0e0e] z-20">
                  <ContextPanel />
                </div>
              )}
            </div>

            {/* Bottom: Multi-Track Timeline (Expandable/Collapsible) */}
            {!isTimelineCollapsed ? (
              <div className="basis-1/2 h-1/2 min-h-0 relative rounded-xl border border-white/[0.08] bg-black overflow-hidden shadow-sm">
                <Timeline />
              </div>
            ) : (
              <ShotcutTimelineDockHandle />
            )}
          </main>
        </div>
      )}

      {/* Modals & Notifications */}
      <AutonomousModal />
      <ExportModal />
      <ShortcutsModal />
      <HistoryStackModal />
      <SettingsModal />
      <ApiKeysModal />
      <HistoryToast />
    </div>
  );
}
