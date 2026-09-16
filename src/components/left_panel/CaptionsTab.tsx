import React, { useState, useRef } from 'react';
import {
  Search,
  SlidersHorizontal,
  Star,
  Flame,
  FileText,
  Zap,
  Trophy,
  Type,
  Sun,
  Music,
  Mic,
  MicOff,
  Plus,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Download,
  Check,
} from 'lucide-react';
import { projectStore, useProjectStore } from '../../store/projectStore';
import {
  CAPTION_TEMPLATES,
  CAPTION_CATEGORIES,
  CaptionTemplateDefinition,
} from '../../data/captionTemplatesData';
import { SamplePreviewCard } from '../common/SamplePreviewCard';
import { startVoiceInput, TranscriptionSession } from '../../services/voiceTranscription';

export const CaptionsTab: React.FC = () => {
  const { project, playheadTime } = useProjectStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set(['trending-green-italic', 'hits-blue-punch']));
  const [isTemplatesExpanded, setIsTemplatesExpanded] = useState<boolean>(true);
  const [isInsertCaptionExpanded, setIsInsertCaptionExpanded] = useState<boolean>(false);

  // Auto captions input state
  const [newCaptionText, setNewCaptionText] = useState<string>('Bold viral hook statement');
  const [isCaptionListening, setIsCaptionListening] = useState<boolean>(false);
  const captionSessionRef = useRef<TranscriptionSession | null>(null);

  // Toggle Favorite
  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filter templates
  const filteredTemplates = CAPTION_TEMPLATES.filter((template) => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        template.name.toLowerCase().includes(q) ||
        template.sampleText.toLowerCase().includes(q) ||
        template.description.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }

    // Category filter
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'favorites') return favorites.has(template.id);
    return template.category === selectedCategory;
  });

  const handleApplyCaptionTemplate = (template: CaptionTemplateDefinition) => {
    const vTrack = project.timeline.tracks.find((t) => t.type === 'video');
    if (!vTrack) return;

    const ops: any[] = [];
    vTrack.clips.forEach((c) => {
      if (c.captions && c.captions.length > 0) {
        c.captions.forEach((cap) => {
          ops.push({
            op: 'edit_caption',
            captionId: cap.captionId,
            changes: { style: template.id as any },
          });
        });
      }
    });

    if (ops.length > 0) {
      projectStore.executeOperation(
        {
          op: 'batch_operations',
          operations: ops,
          description: `Apply ${template.name} caption template`,
        },
        `Apply ${template.name} caption template`
      );
    } else {
      // If no captions exist on track, insert a new caption at playhead with this style
      projectStore.addCaptionAtPlayhead(template.sampleText);
    }
  };

  return (
    <div className="space-y-3.5 select-none">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-white uppercase tracking-wider block">
            Auto Captions & Templates
          </span>
        </div>
        <span className="text-[10px] font-mono text-[#C9A84C] bg-[#1a1a1a] px-2 py-0.5 rounded border border-white/10">
          {CAPTION_TEMPLATES.length} TEMPLATES
        </span>
      </div>

      {/* Auto Captions Tool Box (Collapsible) */}
      <div className="bg-[#141417] border border-white/10 rounded-xl overflow-hidden shadow-sm transition-all">
        <div
          onClick={() => setIsInsertCaptionExpanded(!isInsertCaptionExpanded)}
          className="p-3 flex items-center justify-between cursor-pointer hover:bg-[#18181c] transition-colors"
        >
          <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5 text-[#C9A84C]" />
            Insert Caption at Playhead
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (isCaptionListening) {
                  if (captionSessionRef.current) {
                    captionSessionRef.current.stop();
                    captionSessionRef.current = null;
                  }
                  setIsCaptionListening(false);
                } else {
                  setIsCaptionListening(true);
                  setIsInsertCaptionExpanded(true);
                  const session = startVoiceInput({
                    onTranscript: (spoken) => {
                      setNewCaptionText(spoken);
                      setIsCaptionListening(false);
                    },
                    onInterim: (interim) => {
                      setNewCaptionText(interim);
                    },
                    onError: () => setIsCaptionListening(false),
                    onEnd: () => setIsCaptionListening(false),
                  });
                  captionSessionRef.current = session;
                }
              }}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer border ${
                isCaptionListening
                  ? 'bg-red-950/60 text-red-300 border-red-500 animate-pulse'
                  : 'bg-[#1f1f24] text-[#dedede] border-white/10 hover:border-[#C9A84C]/40'
              }`}
            >
              {isCaptionListening ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
              <span>{isCaptionListening ? 'Listening...' : 'Dictate'}</span>
            </button>
            {isInsertCaptionExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-[#C9A84C]" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-[#808080]" />
            )}
          </div>
        </div>

        {isInsertCaptionExpanded && (
          <div className="p-3 pt-1 border-t border-white/5 space-y-2.5 bg-[#0e0e10]">
            <input
              type="text"
              value={newCaptionText}
              onChange={(e) => setNewCaptionText(e.target.value)}
              placeholder="Enter caption text or speak..."
              className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-[#e0e0e0] focus:outline-none focus:border-[#C9A84C]"
            />

            <button
              onClick={() => {
                if (newCaptionText.trim()) {
                  projectStore.addCaptionAtPlayhead(newCaptionText.trim());
                }
              }}
              className="w-full py-1.5 bg-[#1f1f24] hover:bg-[#282830] text-[#dedede] hover:text-[#C9A84C] border border-white/10 hover:border-[#C9A84C]/50 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Insert Caption at {playheadTime.toFixed(1)}s</span>
            </button>
          </div>
        )}
      </div>

      {/* CapCut Search & Filter Header */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-[#808080] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Basic, Classic, Glow..."
            className="w-full bg-[#121215] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-[11px] text-[#e0e0e0] placeholder-[#606060] focus:outline-none focus:border-[#C9A84C]"
          />
        </div>
        <button
          className="p-1.5 bg-[#121215] border border-white/10 hover:border-white/20 rounded-lg text-[#808080] hover:text-white transition-colors cursor-pointer"
          title="Filter options"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Accordion Categories Sidebar / Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {CAPTION_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                isSelected
                  ? 'bg-[#1f1f24] text-[#C9A84C] border border-[#C9A84C]/50 shadow-sm'
                  : 'bg-[#121215] text-[#808080] border border-white/5 hover:text-white hover:bg-[#18181c]'
              }`}
            >
              {cat.id === 'favorites' && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
              {cat.id === 'trending' && <Flame className="w-3 h-3 text-rose-500" />}
              {cat.id === 'classic' && <FileText className="w-3 h-3 text-sky-400" />}
              {cat.id === 'new' && <Zap className="w-3 h-3 text-amber-300" />}
              {cat.id === 'hits' && <Trophy className="w-3 h-3 text-yellow-500" />}
              {cat.id === 'word' && <Type className="w-3 h-3 text-emerald-400" />}
              {cat.id === 'glow' && <Sun className="w-3 h-3 text-cyan-400" />}
              {cat.id === 'lyrics' && <Music className="w-3 h-3 text-purple-400" />}
              <span>{cat.label}</span>
              {cat.id === 'favorites' && favorites.size > 0 && (
                <span className="ml-0.5 px-1 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-bold">
                  {favorites.size}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Category Header Label */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[11px] font-bold text-white capitalize">
          {selectedCategory === 'all'
            ? 'All CapCut Caption Styles'
            : selectedCategory === 'favorites'
            ? 'Your Favorite Templates'
            : `${selectedCategory} Templates`}
        </span>
        <span className="text-[10px] text-[#808080]">
          Showing {filteredTemplates.length} templates
        </span>
      </div>

      {/* Template Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="py-8 text-center bg-[#121215] border border-white/5 rounded-xl text-[#808080] text-xs space-y-1">
          <p>No caption templates found matching "{searchQuery}"</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}
            className="text-[10px] text-[#C9A84C] underline cursor-pointer hover:text-amber-300"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 max-h-[460px] overflow-y-auto pr-1 scrollbar-thin">
          {filteredTemplates.map((template) => {
            const isFav = favorites.has(template.id);
            return (
              <div key={template.id} className="relative group">
                <SamplePreviewCard
                  id={template.id}
                  name={template.name}
                  badge={template.badge}
                  type="caption"
                  sampleText={template.sampleText}
                  onApply={() => handleApplyCaptionTemplate(template)}
                />

                {/* Pro Diamond Icon Badge (Matching CapCut Screenshot) */}
                {template.isPro && (
                  <div className="absolute top-1.5 left-1.5 z-10 p-1 bg-black/70 backdrop-blur-md border border-purple-500/40 rounded-full shadow-lg">
                    <span className="text-[10px] leading-none" title="CapCut Pro Template">
                      💎
                    </span>
                  </div>
                )}

                {/* Favorite Star Button Toggle (Matching CapCut Screenshot) */}
                <button
                  onClick={(e) => toggleFavorite(template.id, e)}
                  title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                  className={`absolute bottom-8 left-2 z-10 p-1.5 rounded-full backdrop-blur-md transition-all cursor-pointer ${
                    isFav
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                      : 'bg-black/60 text-[#a0a0a0] hover:text-amber-300 border border-white/10 opacity-80 group-hover:opacity-100'
                  }`}
                >
                  <Star className={`w-3 h-3 ${isFav ? 'fill-amber-400' : ''}`} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
