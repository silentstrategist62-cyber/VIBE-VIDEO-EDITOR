import React, { useEffect, useState } from 'react';
import { Plus, Video, Clock, Film, Trash2, ArrowUpRight, Sparkles } from 'lucide-react';
import { projectStore, useProjectStore, ProjectListItem } from '../store/projectStore';
import { createInitialDemoProject } from '../data/sampleProject';

interface HomeViewProps {
  onOpenProject: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onOpenProject }) => {
  const { project } = useProjectStore();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/projects');
      if (res.ok) {
        const list = await res.json();
        setProjects(list);
      } else {
        // Fallback with current project
        setProjects([
          {
            projectId: project.projectId,
            name: project.name,
            updatedAt: project.updatedAt,
            duration: project.timeline.duration,
            clipCount: project.timeline.tracks.reduce((a, t) => a + t.clips.length, 0),
            aspectRatio: project.settings.aspectRatio,
          },
        ]);
      }
    } catch {
      setProjects([
        {
          projectId: project.projectId,
          name: project.name,
          updatedAt: project.updatedAt,
          duration: project.timeline.duration,
          clipCount: project.timeline.tracks.reduce((a, t) => a + t.clips.length, 0),
          aspectRatio: project.settings.aspectRatio,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewProject = () => {
    // Create an empty project and go straight to the timeline
    projectStore.createEmptyProject('New Project');
    onOpenProject();
  };

  const handleOpenExisting = async (pId: string) => {
    if (pId === project.projectId) {
      onOpenProject();
      return;
    }
    try {
      const res = await fetch(`/api/projects/${pId}`);
      if (res.ok) {
        const doc = await res.json();
        projectStore.setProject(doc);
      }
    } catch {
      // Ignored
    }
    onOpenProject();
  };

  const handleDeleteProject = async (e: React.MouseEvent, pId: string) => {
    e.stopPropagation();
    try {
      await fetch(`/api/projects/${pId}`, { method: 'DELETE' });
      setProjects((prev) => prev.filter((p) => p.projectId !== pId));
    } catch {
      setProjects((prev) => prev.filter((p) => p.projectId !== pId));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start p-6 sm:p-12 selection:bg-indigo-500/30">
      {/* Container strictly adhering to Part 1.3: One clean primary action, no clutter */}
      <div className="w-full max-w-4xl flex flex-col items-center mt-8">
        {/* Brand mark & Settings */}
        <div className="w-full flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-900/30 border border-indigo-400/20">
              <Film className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Autonomous Video Editor</h1>
              <p className="text-xs text-slate-400">CapCut Assembly Replacement • 9:16 Portrait Pipeline</p>
            </div>
          </div>

          <button
            id="btn-home-skills-settings"
            onClick={() => projectStore.toggleSettings(true, 'skills')}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 transition-all shadow-sm"
            title="Configure Claude-style skills and editing rules"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Skills & Rules</span>
          </button>
        </div>

        {/* Single Primary Hero Action (Part 1.3 & 14.3) */}
        <button
          id="btn-new-project"
          onClick={handleCreateNewProject}
          className="group relative w-full sm:w-80 h-36 bg-gradient-to-b from-slate-900 to-slate-900/80 hover:from-slate-800 hover:to-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.99]"
        >
          <div className="w-12 h-12 rounded-full bg-indigo-600 group-hover:bg-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-900/40 transition-colors">
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div className="text-center">
            <span className="text-base font-bold text-white tracking-wide block">New Project</span>
            <span className="text-xs text-slate-400">Autonomous workflow or manual edit</span>
          </div>
        </button>

        {/* Projects List beneath */}
        <div className="w-full mt-16">
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Recent Projects</h2>
            <span className="text-xs text-slate-500 font-mono">{projects.length} saved</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {projects.map((p) => {
              const isCurrent = p.projectId === project.projectId;
              return (
                <div
                  key={p.projectId}
                  id={`project-card-${p.projectId}`}
                  onClick={() => handleOpenExisting(p.projectId)}
                  className="group bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 rounded-xl p-4 cursor-pointer transition-all hover:shadow-lg flex flex-col justify-between relative overflow-hidden"
                >
                  {/* Aspect ratio vertical indicator badge */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-16 bg-slate-950 rounded-md border border-slate-800 flex items-center justify-center text-[10px] font-mono text-slate-400 group-hover:border-indigo-500/40 transition-colors">
                      9:16
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isCurrent && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          Active
                        </span>
                      )}
                      <button
                        id={`btn-delete-${p.projectId}`}
                        onClick={(e) => handleDeleteProject(e, p.projectId)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-all"
                        title="Delete project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-100 group-hover:text-white truncate">
                      {p.name}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-2 font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {Math.round(p.duration)}s
                      </span>
                      <span className="flex items-center gap-1">
                        <Video className="w-3 h-3 text-slate-500" />
                        {p.clipCount} clips
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{new Date(p.updatedAt).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1 text-indigo-400 font-medium group-hover:translate-x-0.5 transition-transform">
                      Open <ArrowUpRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
