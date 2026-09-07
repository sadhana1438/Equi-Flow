'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useProject } from '@/context/ProjectContext';
import { api } from '@/lib/api';
import { Task, User, SimulationResult } from '@/types';
import HealthBadge from '@/components/common/HealthBadge';
import EmptyState from '@/components/common/EmptyState';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  TrendingDown,
  Clock,
  Layers,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Check,
} from 'lucide-react';

function SimulationContent() {
  const searchParams = useSearchParams();
  const initialTaskId = searchParams.get('task_id') || '';
  const initialTargetId = searchParams.get('target_id') || '';

  const { selectedProjectId } = useProject();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Simulation inputs
  const [selectedTaskId, setSelectedTaskId] = useState(initialTaskId);
  const [selectedTargetId, setSelectedTargetId] = useState(initialTargetId);

  // Results
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [applying, setApplying] = useState(false);
  const [applySuccess, setApplySuccess] = useState('');
  const [applyError, setApplyError] = useState('');

  const loadContextData = async () => {
    try {
      setLoading(true);
      const [tData, uData] = await Promise.all([
        api.getTasks({ project_id: selectedProjectId || undefined }),
        api.getUsers(),
      ]);
      setTasks(tData);
      setUsers(uData);

      // Default selection if not present
      if (!selectedTaskId && tData.length > 0) {
        setSelectedTaskId(tData[0].id);
      }
      if (!selectedTargetId && uData.length > 1) {
        setSelectedTargetId(uData[1].id);
      }
    } catch (err) {
      console.error('Failed to load simulation inputs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContextData();
  }, [selectedProjectId]);

  const handleRunSimulation = async () => {
    if (!selectedTaskId || !selectedTargetId) return;

    try {
      setSimulating(true);
      setApplySuccess('');
      setApplyError('');
      const res = await api.simulate({
        task_id: selectedTaskId,
        target_assignee_id: selectedTargetId,
      });
      setSimulationResult(res);
    } catch (err: any) {
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setSimulating(false);
    }
  };

  const handleApplyChange = async () => {
    if (!selectedTaskId || !selectedTargetId) return;

    try {
      setApplying(true);
      setApplyError('');
      const res = await api.applySimulation({
        task_id: selectedTaskId,
        target_assignee_id: selectedTargetId,
      });

      setApplySuccess(res.message);
      // Reload context to reflect actual DB mutation
      await loadContextData();
    } catch (err: any) {
      setApplyError(err.message || 'Failed to apply change.');
    } finally {
      setApplying(false);
    }
  };

  const currentTask = tasks.find(t => t.id === selectedTaskId);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <Sparkles className="w-7 h-7 text-zinc-400" />
          <span>What-If Simulation Sandbox</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Hypothetical workload reallocation simulator. Tests changes in memory using skill-aware effort multipliers and in-progress handoff penalties before committing to production.
        </p>
      </div>

      {applySuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2.5 shadow-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{applySuccess} Production database updated & all project intelligence recalculated.</span>
        </div>
      )}

      {applyError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center gap-2.5 shadow-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{applyError}</span>
        </div>
      )}

      {/* Control Panel: Select Task + Target Assignee */}
      <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
          1. Configure Hypothetical Reassignment
        </h3>

        {loading ? (
          <div className="flex items-center gap-2 text-xs text-slate-400 py-4">
            <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
            <span>Loading project tasks and members...</span>
          </div>
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No tasks available to simulate"
            description="Create project tasks with assignees to test reallocation simulations."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            {/* Task Select */}
            <div className="md:col-span-5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select Task to Reassign
              </label>
              <select
                value={selectedTaskId}
                onChange={(e) => {
                  setSelectedTaskId(e.target.value);
                  setSimulationResult(null);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-zinc-500"
              >
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.id}: {t.title} ({t.remaining_hours}h rem &bull; {t.assignee_name || 'Unassigned'})
                  </option>
                ))}
              </select>
            </div>

            {/* Target Assignee Select */}
            <div className="md:col-span-5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Proposed Target Assignee
              </label>
              <select
                value={selectedTargetId}
                onChange={(e) => {
                  setSelectedTargetId(e.target.value);
                  setSimulationResult(null);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-zinc-500"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role}) &bull; Cap: {u.daily_capacity}h
                  </option>
                ))}
              </select>
            </div>

            {/* Run Button */}
            <div className="md:col-span-2">
              <button
                onClick={handleRunSimulation}
                disabled={simulating || !selectedTaskId || !selectedTargetId}
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 font-semibold text-xs transition-all shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {simulating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>Simulate</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Simulation Results: BEFORE vs PROPOSED vs AFTER */}
      {simulationResult && (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              2. Projected Hypothetical Impact
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-indigo-700 dark:text-indigo-300 text-xs font-mono font-bold">
              Sandbox Safe (Zero Database Mutation)
            </span>
          </div>

          {/* Three Comparison Cards: Before, Proposed, After */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* BEFORE Card */}
            <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Current (Before)
                  </span>
                  <HealthBadge health={simulationResult.before_project_health} />
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Source Assignee ({simulationResult.current_assignee_name}):</span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                      {simulationResult.before_source_workload}%
                    </span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Target Assignee ({simulationResult.target_assignee_name}):</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {simulationResult.before_target_workload}%
                    </span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Active Bottlenecks:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {simulationResult.before_bottleneck_count}
                    </span>
                  </div>

                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Project Delay Risk:</span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                      {simulationResult.before_delay_risk}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                Current baseline values
              </div>
            </div>

            {/* PROPOSED CHANGE Card */}
            <div className="p-6 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/50 via-white to-white dark:from-indigo-950/20 dark:via-slate-850 dark:to-slate-850 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                    Proposed Change
                  </span>
                  <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-[10px] font-bold">
                    {simulationResult.skill_level} Skill Match
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="py-1 border-b border-indigo-100 dark:border-indigo-950/60">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Task</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {simulationResult.task_title}
                    </span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-indigo-100 dark:border-indigo-950/60">
                    <span className="text-slate-500">Skill Multiplier:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {simulationResult.skill_multiplier}x effort
                    </span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-indigo-100 dark:border-indigo-950/60">
                    <span className="text-slate-500">In-Progress Handoff Penalty:</span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                      +{simulationResult.handoff_penalty_hours}h
                    </span>
                  </div>

                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">New Task Duration:</span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      {simulationResult.simulated_remaining_hours}h (was {simulationResult.original_remaining_hours}h)
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-indigo-100 dark:border-indigo-950/60 text-[11px] text-slate-400">
                Formula: (E_rem &times; S_mult) + H_handoff
              </div>
            </div>

            {/* AFTER Card */}
            <div className="p-6 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-gradient-to-br from-emerald-50/50 via-white to-white dark:from-emerald-950/20 dark:via-slate-850 dark:to-slate-850 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Projected (After)
                  </span>
                  <HealthBadge health={simulationResult.after_project_health} />
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-emerald-100 dark:border-emerald-950/60">
                    <span className="text-slate-500">Source Assignee ({simulationResult.current_assignee_name}):</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      {simulationResult.after_source_workload}%
                      <TrendingDown className="w-3 h-3 text-emerald-500" />
                    </span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-emerald-100 dark:border-emerald-950/60">
                    <span className="text-slate-500">Target Assignee ({simulationResult.target_assignee_name}):</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {simulationResult.after_target_workload}%
                    </span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-emerald-100 dark:border-emerald-950/60">
                    <span className="text-slate-500">Active Bottlenecks:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {simulationResult.after_bottleneck_count}
                    </span>
                  </div>

                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Project Delay Risk:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {simulationResult.after_delay_risk}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-emerald-100 dark:border-emerald-950/60 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                Unblocks {simulationResult.downstream_impact_resolved} downstream task(s)
              </div>
            </div>
          </div>

          {/* Dynamic Explanation & Apply Action */}
          <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1 max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Mathematical Rationale
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {simulationResult.explanation}
              </p>
            </div>

            <button
              onClick={handleApplyChange}
              disabled={applying}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all flex-shrink-0 disabled:opacity-50"
            >
              {applying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>Apply Change to Production</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SimulationPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-slate-400">Loading simulation sandbox...</div>}>
      <SimulationContent />
    </Suspense>
  );
}
