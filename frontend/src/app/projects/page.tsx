'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProject } from '@/context/ProjectContext';
import { api } from '@/lib/api';
import { Project, ProjectIntelligenceSummary } from '@/types';
import HealthBadge from '@/components/common/HealthBadge';
import EmptyState from '@/components/common/EmptyState';
import Modal from '@/components/common/Modal';
import {
  FolderKanban,
  Plus,
  Calendar,
  AlertTriangle,
  Zap,
  Clock,
  ArrowRight,
  Edit2,
  Trash2,
  Copy,
  Check,
  Loader2,
} from 'lucide-react';

export default function ProjectsPage() {
  const router = useRouter();
  const { projects, refreshProjects, setSelectedProjectId } = useProject();

  const [summaries, setSummaries] = useState<Record<string, ProjectIntelligenceSummary>>({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    target_end_date: '',
  });
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadSummaries = async () => {
    try {
      setLoading(true);
      const sumMap: Record<string, ProjectIntelligenceSummary> = {};
      await Promise.all(
        projects.map(async (p) => {
          try {
            const sum = await api.getProjectSummary(p.id);
            sumMap[p.id] = sum;
          } catch (e) {
            console.warn(`Could not load summary for project ${p.id}:`, e);
          }
        })
      );
      setSummaries(sumMap);
    } catch (err) {
      console.error('Failed to load project summaries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projects.length > 0) {
      loadSummaries();
    } else {
      setLoading(false);
    }
  }, [projects]);

  const handleOpenCreate = () => {
    setEditingProject(null);
    setFormData({
      name: '',
      description: '',
      start_date: new Date().toISOString().split('T')[0],
      target_end_date: '',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (proj: Project) => {
    setEditingProject(proj);
    setFormData({
      name: proj.name,
      description: proj.description || '',
      start_date: proj.start_date ? proj.start_date.split('T')[0] : '',
      target_end_date: proj.target_end_date ? proj.target_end_date.split('T')[0] : '',
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete project "${name}"? All associated tasks, dependencies, and members will be removed.`)) {
      return;
    }
    try {
      await api.deleteProject(id);
      await refreshProjects();
    } catch (err: any) {
      alert(`Failed to delete project: ${err.message}`);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        name: formData.name,
        description: formData.description || null,
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
        target_end_date: formData.target_end_date ? new Date(formData.target_end_date).toISOString() : null,
      };

      if (editingProject) {
        await api.updateProject(editingProject.id, payload);
      } else {
        await api.createProject(payload);
      }
      await refreshProjects();
      setModalOpen(false);
    } catch (err: any) {
      alert(`Failed to save project: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-zinc-500" />
            <span>Projects Intelligence</span>
          </h1>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Real-time project health, bottleneck pressure, and capacity consumption.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 font-medium text-xs transition-all shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Project</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh]">
          <Loader2 className="w-6 h-6 text-zinc-400 animate-spin mb-2" />
          <p className="text-xs text-zinc-400 font-mono">Computing project intelligence...</p>
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects configured yet"
          description="Create a project to begin tracking tasks, logging PR reviews, and monitoring delivery bottlenecks."
          actionText="Create First Project"
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((proj) => {
            const sum = summaries[proj.id];
            return (
              <div
                key={proj.id}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] p-5 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-800 dark:group-hover:text-white transition-colors">
                      {proj.name}
                    </h3>
                    {sum && <HealthBadge health={sum.health} />}
                  </div>

                  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 min-h-[2.5rem]">
                    {proj.description || 'No description provided.'}
                  </p>

                  {/* Project Join Code Banner */}
                  <div className="mt-3 flex items-center justify-between px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 font-mono">Join Code:</span>
                      <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 tracking-wider">{proj.join_code}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(proj.join_code);
                        setCopiedId(proj.id);
                        setTimeout(() => setCopiedId(null), 1500);
                      }}
                      className="flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                      title="Copy join code for team members"
                    >
                      {copiedId === proj.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-500 font-semibold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Dynamic Metrics Row */}
                  {sum ? (
                    <div className="mt-4 grid grid-cols-2 gap-3 py-2.5 border-y border-zinc-100 dark:border-zinc-800/80 text-xs">
                      <div className="flex flex-col">
                        <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                          <Zap className="w-3 h-3 text-zinc-400" /> Workload
                        </span>
                        <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                          {Math.round(sum.overall_workload * 100)}%
                        </span>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-500" /> Hidden Work
                        </span>
                        <span className="font-mono font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                          {sum.total_hidden_work.toFixed(1)}h
                        </span>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-rose-500" /> Bottlenecks
                        </span>
                        <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                          {sum.bottleneck_count}
                        </span>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-[11px] text-zinc-400">Delay Risk</span>
                        <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                          {sum.delay_risk}%
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 py-3 border-y border-zinc-100 dark:border-zinc-800/80 text-center text-xs text-zinc-400 font-mono">
                      Calculating metrics...
                    </div>
                  )}

                  {/* Timeline & Completion */}
                  <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {proj.target_end_date ? new Date(proj.target_end_date).toLocaleDateString() : 'No deadline'}
                    </span>
                    <span>{sum ? `${sum.completion_percentage}% completed` : '0%'}</span>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="mt-5 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(proj)}
                      className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      title="Edit project"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(proj.id, proj.name)}
                      className="p-1 rounded-md text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Delete project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedProjectId(proj.id);
                      router.push('/dashboard');
                    }}
                    className="flex items-center gap-1 text-xs font-medium text-zinc-900 dark:text-zinc-100 hover:underline"
                  >
                    <span>Open Dashboard</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Project Form Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingProject ? 'Edit Project' : 'Create New Project'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Project Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Distributed Core Service"
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the project scope and core goals..."
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Target End Date
              </label>
              <input
                type="date"
                value={formData.target_end_date}
                onChange={(e) => setFormData({ ...formData, target_end_date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              />
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 text-xs font-medium shadow-xs transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingProject ? 'Update Project' : 'Create Project'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
