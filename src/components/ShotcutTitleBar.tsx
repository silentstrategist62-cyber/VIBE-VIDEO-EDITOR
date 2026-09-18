import React from 'react';
import { Minus, X, Maximize2, Minimize2, GripVertical, ChevronLeft, ChevronRight } from 'lucide-react';
import { useProjectStore } from '../store/projectStore';

interface ShotcutTitleBarProps {
  title: string;
  badge?: string;
  badgeColor?: 'emerald' | 'cyan' | 'indigo' | 'amber';
  onCollapse?: () => void;
  onFloatToggle?: () => void;
  onClose?: () => void;
  isFloating?: boolean;
  collapseDirection?: 'left' | 'right' | 'down';
  children?: React.ReactNode;
}

export const ShotcutTitleBar: React.FC<ShotcutTitleBarProps> = ({
  title,
  badge,
  badgeColor = 'cyan',
  onCollapse,
  onFloatToggle,
  onClose,
  isFloating = false,
  collapseDirection = 'left',
  children,
}) => {
  const { showTitleBars } = useProjectStore();

  if (!showTitleBars) return null;

  const getBadgeClass = () => {
    switch (badgeColor) {
      case 'emerald':
        return 'bg-[#C9A84C]/15 text-[#C9A84C] border-[#C9A84C]/30';
      case 'amber':
        return 'bg-[#C9A84C]/20 text-[#E8C97A] border-[#C9A84C]/40';
      case 'indigo':
        return 'bg-[#C9A84C]/15 text-[#E8C97A] border-[#C9A84C]/30';
      default:
        return 'bg-[#C9A84C]/15 text-[#E8C97A] border-[#C9A84C]/30';
    }
  };

  return (
    <div className="h-8 px-2.5 bg-[#0c0c0c]/95 border-b border-white/[0.08] flex items-center justify-between shrink-0 select-none text-xs font-semibold tracking-wide text-[#EEF0F4]">
      {/* Title & Grip */}
      <div className="flex items-center gap-1.5 min-w-0">
        <GripVertical className="w-3 h-3 text-[#4A5260] shrink-0 cursor-grab active:cursor-grabbing opacity-70 hover:opacity-100" />
        <span className="uppercase text-[11px] font-cinzel font-semibold text-[#EEF0F4] tracking-widest truncate">{title}</span>
        {badge && (
          <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border truncate ${getBadgeClass()}`}>
            {badge}
          </span>
        )}
      </div>

      {/* Middle custom controls (tabs, filters, etc.) */}
      {children && <div className="flex items-center gap-1 mx-2 overflow-x-auto no-scrollbar">{children}</div>}

      {/* Right Controls: Minimize / Undock / Close */}
      <div className="flex items-center gap-0.5 shrink-0 text-[#7A8290]">
        {onFloatToggle && (
          <button
            onClick={onFloatToggle}
            className="p-1 rounded hover:text-[#EEF0F4] hover:bg-white/[0.04] transition-colors"
            title={isFloating ? 'Dock panel into workspace' : 'Undock into floating window'}
          >
            {isFloating ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </button>
        )}

        {onCollapse && (
          <button
            onClick={onCollapse}
            className="p-1 rounded hover:text-[#EEF0F4] hover:bg-white/[0.04] transition-colors"
            title="Collapse panel"
          >
            {collapseDirection === 'right' ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : collapseDirection === 'down' ? (
              <Minus className="w-3 h-3" />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5" />
            )}
          </button>
        )}

        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded hover:text-rose-400 hover:bg-white/[0.04] transition-colors"
            title="Close dock (re-open from View menu or toolbar)"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
