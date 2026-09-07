'use client';

import React, { useEffect, useState } from 'react';
import { useProject } from '@/context/ProjectContext';
import { api } from '@/lib/api';
import { MemberWorkload } from '@/types';
import WorkloadBadge from '@/components/common/WorkloadBadge';
import EmptyState from '@/components/common/EmptyState';
import {
  Activity,
  Filter,
  Clock,
  Zap,
  Users,
  AlertTriangle,
  GitPullRequest,
  LifeBuoy,
  MessageSquare,
  Sparkles,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

export default function WorkloadPage() {
  const { selectedProjectId } = useProject();

  const [workloads, setWorkloads] = useState<MemberWorkload[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadWorkloadData = async () => {
    try {
      setLoading(true);
      const data = await api.getWorkload(selectedProjectId || undefined);
      setWorkloads(data);
    } catch (err) {
      console.error('Failed to load workload data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkloadData();
  }, [selectedProjectId]);

  const filteredWorkloads = workloads.filter((m) => {
    const matchesStatus = statusFilter === 'ALL' || m.status === statusFilter;
    const matchesQuery =
      !searchQuery ||
      m.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.role.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesQuery;
  });

  const overloadedCount = workloads.filter(w => w.status === 'OVERLOADED').length;
  const healthyCount = workloads.filter(w => w.status === 'HEALTHY').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Activity className="w-7 h-7 text-zinc-400" />
            <span>Workload & Hidden Work Intelligence</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Calculated from: <code>W_total = ((T_assigned + H_tracked) / max(C - M, 0.5)) &times; F_fragmentation</code>
          </p>
        </div>

        <Link
          href="/simulation"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 font-semibold text-xs shadow-xs transition-all self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4" />
          <span>Simulate Workload Rebalance</span>
        </Link>
      </div>

      {/* Summary Stat Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Evaluated</span>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
              {workloads.length} Members
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-zinc-100 dark:bg-zinc-800 text-zinc-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-white dark:bg-[#121215] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overloaded (&gt;100%)</span>
            <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
              {overloadedCount} Member(s)
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-500">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-white dark:bg-[#121215] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Healthy Capacity (&le;80%)</span>
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              {healthyCount} Member(s)
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500">
            <Zap className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Status:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-zinc-500"
          >
            <option value="ALL">All Workload States</option>
            <option value="OVERLOADED">Overloaded (&gt;100%)</option>
            <option value="NEAR_CAPACITY">Near Capacity (80% - 100%)</option>
            <option value="HEALTHY">Healthy (&le;80%)</option>
          </select>
        </div>

        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="Search member or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-zinc-500"
          />
        </div>
      </div>

      {/* Workload Cards List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh]">
          <Loader2 className="w-8 h-8 text-zinc-400 animate-spin mb-2" />
          <p className="text-xs text-slate-400">Computing team workload intelligence...</p>
        </div>
      ) : filteredWorkloads.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No team members found"
          description="Add team members and assign tasks or log actual work events to calculate workload scores."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredWorkloads.map((m) => {
            const isOverloaded = m.status === 'OVERLOADED';
            const cardBorder = isOverloaded
              ? 'border-rose-300 dark:border-rose-900/60 bg-gradient-to-br from-rose-50/20 via-white to-white dark:from-rose-950/10 dark:via-slate-850 dark:to-slate-850'
              : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215]';

            return (
              <div
                key={m.user_id}
                className={`rounded-2xl border p-6 shadow-sm transition-all flex flex-col justify-between ${cardBorder}`}
              >
                <div>
                  {/* Member Name + Role + Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{m.user_name}</span>
                        {m.no_task_capacity && (
                          <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[10px] font-bold border border-rose-500/30">
                            No Task-Work Capacity Today
                          </span>
                        )}
                      </h3>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {m.role} &bull; Configured Daily Capacity: <strong className="font-mono text-slate-800 dark:text-slate-200">{m.daily_capacity}h</strong>
                      </span>
                    </div>

                    <WorkloadBadge
                      status={m.status}
                      percentage={Math.round(m.total_workload * 100)}
                    />
                  </div>

                  {/* Workload Progress Bar Stack */}
                  <div className="mt-5 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Workload Capacity Consumption</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {Math.round(m.total_workload * 100)}%
                      </span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex shadow-inner">
                      <div
                        className="bg-indigo-500 h-full transition-all"
                        style={{ width: `${Math.min((m.assigned_work / (m.available_capacity || 8)) * 100, 100)}%` }}
                        title={`Assigned: ${m.assigned_work}h`}
                      />
                      <div
                        className="bg-amber-400 h-full transition-all"
                        style={{ width: `${Math.min((m.hidden_work / (m.available_capacity || 8)) * 100, 100)}%` }}
                        title={`Hidden Work: ${m.hidden_work}h`}
                      />
                    </div>
                    <div className="flex items-center gap-4 text-[10px] text-slate-400 pt-0.5">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        <span>Assigned Work ({m.assigned_work}h)</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        <span>Hidden Tracked Work (+{m.hidden_work}h)</span>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Math Breakdown Grid */}
                  <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50/80 dark:bg-zinc-900/60 border border-slate-100 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">T_assigned</span>
                      <div className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                        {m.assigned_work}h/day
                      </div>
                      <span className="text-[10px] text-slate-400">({m.active_tasks_count} tasks)</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">H_tracked</span>
                      <div className="font-mono font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                        +{m.hidden_work}h
                      </div>
                      <span className="text-[10px] text-slate-400">Hidden load</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Usable Capacity</span>
                      <div className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                        {m.available_capacity}h
                      </div>
                      <span className="text-[10px] text-slate-400">(-{m.meetings}h mtgs)</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Fragmentation</span>
                      <div className="font-mono font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                        {m.fragmentation_factor}x
                      </div>
                      <span className="text-[10px] text-slate-400">({m.context_switches_count} switches)</span>
                    </div>
                  </div>

                  {/* Hidden Work Composition */}
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Hidden Composition:</span>
                    <span className="flex items-center gap-1">
                      <GitPullRequest className="w-3 h-3 text-indigo-400" />
                      PR Reviews: <strong className="text-slate-800 dark:text-slate-200 font-mono">{m.pr_review_hours}h</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <LifeBuoy className="w-3 h-3 text-amber-400" />
                      Support: <strong className="text-slate-800 dark:text-slate-200 font-mono">{m.support_hours}h</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-rose-400" />
                      Rework: <strong className="text-slate-800 dark:text-slate-200 font-mono">{m.rework_hours}h</strong>
                    </span>
                  </div>
                </div>

                {/* Card Action */}
                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <Link
                    href={`/simulation?target_id=${m.user_id}`}
                    className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 hover:underline flex items-center gap-1"
                  >
                    <span>Simulate Reallocation</span>
                    <Sparkles className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
