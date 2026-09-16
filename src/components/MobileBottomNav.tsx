import React from 'react';
import { Bot, FolderOpen, Film, Sliders, Download } from 'lucide-react';
import { projectStore, useProjectStore } from '../store/projectStore';

export const MobileBottomNav: React.FC = () => {
  const { mobileView, isChatOpen, isLeftPanelCollapsed, isRightPanelOpen } = useProjectStore();

  const navItems = [
    {
      id: 'agent' as const,
      label: 'AI Agent',
      icon: Bot,
      activeColor: 'text-cyan-400 border-cyan-500/50 bg-cyan-950/40',
      badge: true,
      onClick: () => {
        projectStore.setMobileView('agent');
        projectStore.toggleChat(true);
      },
    },
    {
      id: 'media' as const,
      label: 'Media / Tools',
      icon: FolderOpen,
      activeColor: 'text-amber-400 border-amber-500/50 bg-amber-950/40',
      badge: false,
      onClick: () => {
        projectStore.setMobileView('media');
        projectStore.toggleLeftPanel(false);
      },
    },
    {
      id: 'timeline' as const,
      label: 'Timeline',
      icon: Film,
      activeColor: 'text-emerald-400 border-emerald-500/50 bg-emerald-950/40',
      badge: false,
      onClick: () => {
        projectStore.setMobileView('timeline');
      },
    },
    {
      id: 'inspector' as const,
      label: 'Adjust',
      icon: Sliders,
      activeColor: 'text-indigo-400 border-indigo-500/50 bg-indigo-950/40',
      badge: false,
      onClick: () => {
        projectStore.setMobileView('inspector');
        projectStore.toggleRightPanel(true);
      },
    },
    {
      id: 'export' as const,
      label: 'Export',
      icon: Download,
      activeColor: 'text-rose-400 border-rose-500/50 bg-rose-950/40',
      badge: false,
      onClick: () => {
        projectStore.toggleExport(true);
      },
    },
  ];

  return (
    <nav
      id="mobile-bottom-nav"
      aria-label="Mobile Navigation"
      className="md:hidden h-14 bg-slate-950/98 border-t border-slate-800/90 px-1 flex items-center justify-around shrink-0 z-40 select-none pb-safe backdrop-blur-md"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = mobileView === item.id;
        return (
          <button
            key={item.id}
            onClick={item.onClick}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-all cursor-pointer min-w-[56px] ${
              isActive
                ? `${item.activeColor} border shadow-[0_0_12px_rgba(6,182,212,0.15)]`
                : 'text-slate-400 hover:text-slate-200 active:scale-95'
            }`}
          >
            <div className="relative">
              <Icon className={`w-4 h-4 ${isActive ? 'scale-110' : ''}`} />
              {item.badge && (
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse absolute -top-0.5 -right-1" />
              )}
            </div>
            <span className={`text-[10px] tracking-tight mt-0.5 font-medium ${isActive ? 'font-bold' : ''}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
