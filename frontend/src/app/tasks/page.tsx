'use client';

import React, { useEffect, useState } from 'react';
import { useProject } from '@/context/ProjectContext';
import { api } from '@/lib/api';
import { Task, User, Skill, TaskDependency } from '@/types';
import EmptyState from '@/components/common/EmptyState';
import Modal from '@/components/common/Modal';
import {
  CheckSquare,
  Plus,
  GitFork,
  Trash2,
  Edit2,
  Filter,
  Calendar,
  Clock,
  AlertCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react';

export default function TasksPage() {
  const { selectedProjectId, projects } = useProject();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  // Modals
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [depModalOpen, setDepModalOpen] = useState(false);

  // Task Form State
  const [taskForm, setTaskForm] = useState({
    id: '',
    title: '',
    description: '',
    project_id: '',
    assignee_id: '',
    estimated_hours: 4.0,
    remaining_hours: 4.0,
    status: 'TODO',
    priority: 'MEDIUM',
    complexity: 'MEDIUM',
    due_date: '',
    required_skill_id: '',
  });

  // Dependency Form State
  const [depForm, setDepForm] = useState({
    blocking_task_id: '',
    dependent_task_id: '',
    confidence: 'EXPLICIT',
  });
  const [depError, setDepError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [tData, uData, sData, dData] = await Promise.all([
        api.getTasks({
          project_id: selectedProjectId || undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
        }),
        api.getUsers(),
        api.getSkills(),
        api.getDependencies(),
      ]);
      setTasks(tData);
      setUsers(uData);
      setSkills(sData);
      setDependencies(dData);
    } catch (err) {
      console.error('Failed to load tasks data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedProjectId, statusFilter, priorityFilter]);

  const handleOpenCreateTask = () => {
    setEditingTask(null);
    setTaskForm({
      id: '',
      title: '',
      description: '',
      project_id: selectedProjectId || (projects[0]?.id || ''),
      assignee_id: '',
      estimated_hours: 4.0,
      remaining_hours: 4.0,
      status: 'TODO',
      priority: 'MEDIUM',
      complexity: 'MEDIUM',
      due_date: '',
      required_skill_id: '',
    });
    setTaskModalOpen(true);
  };

  const handleOpenEditTask = (t: Task) => {
    setEditingTask(t);
    setTaskForm({
      id: t.id,
      title: t.title,
      description: t.description || '',
      project_id: t.project_id,
      assignee_id: t.assignee_id || '',
      estimated_hours: t.estimated_hours || 4.0,
      remaining_hours: t.remaining_hours,
      status: t.status,
      priority: t.priority,
      complexity: t.complexity,
      due_date: t.due_date ? t.due_date.split('T')[0] : '',
      required_skill_id: t.required_skill_id || '',
    });
    setTaskModalOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title.trim() || !taskForm.project_id) return;

    try {
      const payload: Partial<Task> = {
        title: taskForm.title.trim(),
        description: taskForm.description.trim() || null,
        project_id: taskForm.project_id,
        assignee_id: taskForm.assignee_id || null,
        estimated_hours: Number(taskForm.estimated_hours),
        remaining_hours: Number(taskForm.remaining_hours),
        status: taskForm.status as any,
        priority: taskForm.priority as any,
        complexity: taskForm.complexity as any,
        due_date: taskForm.due_date ? new Date(taskForm.due_date).toISOString() : null,
        required_skill_id: taskForm.required_skill_id || null,
      };

      if (editingTask) {
        await api.updateTask(editingTask.id, payload);
      } else {
        if (taskForm.id.trim()) {
          payload.id = taskForm.id.trim();
        }
        await api.createTask(payload);
      }

      await loadData();
      setTaskModalOpen(false);
    } catch (err: any) {
      alert(`Failed to save task: ${err.message}`);
    }
  };

  const handleDeleteTask = async (id: string, title: string) => {
    if (!confirm(`Delete task "${title}"?`)) return;
    try {
      await api.deleteTask(id);
      await loadData();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  // Inline quick reassign
  const handleQuickReassign = async (taskId: string, newAssigneeId: string) => {
    try {
      await api.updateTask(taskId, { assignee_id: newAssigneeId || null });
      await loadData();
    } catch (err: any) {
      alert(`Reassignment failed: ${err.message}`);
    }
  };

  // Inline quick status update
  const handleQuickStatus = async (taskId: string, newStatus: string) => {
    try {
      await api.updateTask(taskId, { status: newStatus as any });
      await loadData();
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  // Manage Dependency Add
  const handleAddDependency = async (e: React.FormEvent) => {
    e.preventDefault();
    setDepError('');
    if (!depForm.blocking_task_id || !depForm.dependent_task_id) return;

    try {
      await api.createDependency({
        blocking_task_id: depForm.blocking_task_id,
        dependent_task_id: depForm.dependent_task_id,
        confidence: depForm.confidence,
      });
      const updatedDeps = await api.getDependencies();
      setDependencies(updatedDeps);
      setDepForm({ blocking_task_id: '', dependent_task_id: '', confidence: 'EXPLICIT' });
    } catch (err: any) {
      setDepError(err.message);
    }
  };

  const handleDeleteDependency = async (id: string) => {
    try {
      await api.deleteDependency(id);
      const updatedDeps = await api.getDependencies();
      setDependencies(updatedDeps);
    } catch (err: any) {
      alert(`Failed to remove dependency: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <CheckSquare className="w-7 h-7 text-zinc-400" />
            <span>Tasks & Assignments</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Real-time task tracking with remaining effort estimates and dependency mapping.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => setDepModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-zinc-400 dark:hover:border-zinc-600 transition-all shadow-sm"
          >
            <GitFork className="w-3.5 h-3.5 text-zinc-400" />
            <span>Manage Dependencies</span>
          </button>
          <button
            onClick={handleOpenCreateTask}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 font-semibold text-xs transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Filter:</span>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-zinc-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="DONE">Done</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-zinc-500"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
          Showing <strong>{tasks.length}</strong> task(s)
        </div>
      </div>

      {/* Tasks Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh]">
          <Loader2 className="w-8 h-8 text-zinc-400 animate-spin mb-2" />
          <p className="text-xs text-slate-400">Loading tasks...</p>
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="Add tasks to begin workload analysis"
          description="Enter task estimates, due dates, and assignments to let EquiFlow calculate workload distribution and dependency bottlenecks."
          actionText="Create Task"
          onAction={handleOpenCreateTask}
        />
      ) : (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-zinc-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Task ID</th>
                  <th className="px-5 py-3.5">Title</th>
                  <th className="px-5 py-3.5">Assignee</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Priority</th>
                  <th className="px-5 py-3.5">Remaining</th>
                  <th className="px-5 py-3.5">Due Date</th>
                  <th className="px-5 py-3.5">Required Skill</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tasks.map((task) => {
                  const priorityColors = {
                    CRITICAL: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
                    HIGH: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
                    MEDIUM: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
                    LOW: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30',
                  }[task.priority] || '';

                  return (
                    <tr
                      key={task.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* ID */}
                      <td className="px-5 py-3 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {task.id}
                      </td>

                      {/* Title */}
                      <td className="px-5 py-3 font-medium text-slate-900 dark:text-white max-w-xs truncate">
                        <div className="flex flex-col">
                          <span className="truncate">{task.title}</span>
                          {task.project_name && (
                            <span className="text-[10px] text-slate-400 truncate">
                              {task.project_name}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Quick Inline Reassign */}
                      <td className="px-5 py-3">
                        <select
                          value={task.assignee_id || ''}
                          onChange={(e) => handleQuickReassign(task.id, e.target.value)}
                          className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-zinc-500"
                        >
                          <option value="">Unassigned</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Quick Status Dropdown */}
                      <td className="px-5 py-3">
                        <select
                          value={task.status}
                          onChange={(e) => handleQuickStatus(task.id, e.target.value)}
                          className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200"
                        >
                          <option value="TODO">To Do</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="IN_REVIEW">In Review</option>
                          <option value="DONE">Done</option>
                        </select>
                      </td>

                      {/* Priority Badge */}
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${priorityColors}`}>
                          {task.priority}
                        </span>
                      </td>

                      {/* Remaining Hours */}
                      <td className="px-5 py-3 font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {task.remaining_hours}h
                      </td>

                      {/* Due Date */}
                      <td className="px-5 py-3 text-slate-500 dark:text-slate-400">
                        {task.due_date ? new Date(task.due_date).toLocaleDateString() : '—'}
                      </td>

                      {/* Required Skill */}
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                        {task.required_skill_name ? (
                          <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium border border-zinc-200 dark:border-zinc-800">
                            {task.required_skill_name}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">None</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditTask(task)}
                            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Edit task"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id, task.title)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Delete task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Task Create / Edit Modal */}
      <Modal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        title={editingTask ? `Edit Task: ${editingTask.id}` : 'Create New Task'}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveTask} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Task ID (Optional)
              </label>
              <input
                type="text"
                disabled={!!editingTask}
                value={taskForm.id}
                onChange={(e) => setTaskForm({ ...taskForm, id: e.target.value })}
                placeholder="e.g. TASK-201"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-zinc-500 disabled:opacity-50"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Task Title *
              </label>
              <input
                type="text"
                required
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                placeholder="e.g. Optimize Redis Caching Layer"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-zinc-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={taskForm.description}
              onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
              placeholder="Task details and deliverables..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-zinc-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Project *
              </label>
              <select
                required
                value={taskForm.project_id}
                onChange={(e) => setTaskForm({ ...taskForm, project_id: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-zinc-500"
              >
                <option value="">Select Project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Assignee
              </label>
              <select
                value={taskForm.assignee_id}
                onChange={(e) => setTaskForm({ ...taskForm, assignee_id: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-zinc-500"
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={taskForm.status}
                onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-zinc-500"
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="DONE">Done</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={taskForm.priority}
                onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-zinc-500"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Complexity
              </label>
              <select
                value={taskForm.complexity}
                onChange={(e) => setTaskForm({ ...taskForm, complexity: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-zinc-500"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Remaining Hours *
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                required
                value={taskForm.remaining_hours}
                onChange={(e) => setTaskForm({ ...taskForm, remaining_hours: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-zinc-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Estimated Hours
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={taskForm.estimated_hours}
                onChange={(e) => setTaskForm({ ...taskForm, estimated_hours: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-zinc-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={taskForm.due_date}
                onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-zinc-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Required Skill
            </label>
            <select
              value={taskForm.required_skill_id}
              onChange={(e) => setTaskForm({ ...taskForm, required_skill_id: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-zinc-500"
            >
              <option value="">None (General Work)</option>
              {skills.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.category})
                </option>
              ))}
            </select>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setTaskModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 text-xs font-semibold shadow-xs transition-all"
            >
              {editingTask ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Manage Dependencies Modal */}
      <Modal
        isOpen={depModalOpen}
        onClose={() => setDepModalOpen(false)}
        title="Manage Task Dependencies (DAG)"
        maxWidth="lg"
      >
        <div className="space-y-6">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Define blocking relationships. Tasks cannot depend on each other cyclically.
          </p>

          {/* Add Dependency Form */}
          <form onSubmit={handleAddDependency} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#121215]/70 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Add New Dependency
            </span>

            {depError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{depError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Blocking Task (Prerequisite)
                </label>
                <select
                  required
                  value={depForm.blocking_task_id}
                  onChange={(e) => setDepForm({ ...depForm, blocking_task_id: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                >
                  <option value="">Select Task</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.id}: {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Dependent Task (Blocked)
                </label>
                <select
                  required
                  value={depForm.dependent_task_id}
                  onChange={(e) => setDepForm({ ...depForm, dependent_task_id: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                >
                  <option value="">Select Task</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.id}: {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Confidence
                </label>
                <select
                  value={depForm.confidence}
                  onChange={(e) => setDepForm({ ...depForm, confidence: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                >
                  <option value="EXPLICIT">Explicit (Solid Edge)</option>
                  <option value="INFERRED">Inferred (Dashed Edge)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 font-semibold text-xs transition-all shadow-sm"
              >
                Add Dependency
              </button>
            </div>
          </form>

          {/* List Current Dependencies */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Existing Dependencies ({dependencies.length})
            </h4>

            {dependencies.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                No dependencies defined yet.
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                {dependencies.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2 font-mono">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        {d.blocking_task_id}
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {d.dependent_task_id}
                      </span>
                      <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                        d.confidence === 'EXPLICIT'
                          ? 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                          : 'bg-amber-500/10 text-amber-600 border-amber-500/30 border-dashed'
                      }`}>
                        {d.confidence}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDeleteDependency(d.id)}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                      title="Remove dependency"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
