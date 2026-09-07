'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useProject } from '@/context/ProjectContext';
import { api } from '@/lib/api';
import { BottleneckItem } from '@/types';
import EmptyState from '@/components/common/EmptyState';
import {
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  Layers,
  ArrowRight,
  TrendingUp,
  Clock,
  Loader2,
} from 'lucide-react';

export default function BottlenecksPage() {
  const { selectedProjectId } = useProject();

  const [bottlenecks, setBottlenecks] = useState<BottleneckItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBottlenecks = async () => {
    try {
      setLoading(true);
      const data = await api.getBottlenecks(selectedProjectId || undefined);
      setBottlenecks(data);
    } catch (err) {
      console.error('Failed to load bottlenecks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBottlenecks();
  }, [selectedProjectId]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <AlertTriangle className="w-7 h-7 text-rose-500" />
            <span>Bottleneck Intelligence</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Dynamically discovered from member workload strain, critical paths, and downstream blocking dependencies.
          </p>
        </div>

        <Link
          href="/graph"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-zinc-400 dark:hover:border-zinc-600 transition-all shadow-sm self-start sm:self-auto"
        >
          <Layers className="w-4 h-4 text-zinc-400" />
          <span>View Dependency Graph</span>
        </Link>
      </div>

      {/* Bottlenecks Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh]">
          <Loader2 className="w-8 h-8 text-zinc-400 animate-spin mb-2" />
          <p className="text-xs text-slate-400">Evaluating dependency bottlenecks...</p>
        </div>
      ) : bottlenecks.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No Critical Bottlenecks Detected"
          description="Your team's workload is well-balanced across dependent tasks, and no critical path is currently delayed."
        />
      ) : (
        <div className="space-y-4">
          {bottlenecks.map((b, idx) => (
            <div
              key={b.task_id}
              className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-[#121215] p-6 shadow-sm hover:border-rose-400 dark:hover:border-rose-700 transition-all flex flex-col justify-between"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-500/30">
                      Rank #{idx + 1} &bull; Severity: {b.severity_score}
                    </span>
                    <span className="font-mono text-xs text-slate-400">
                      {b.task_id}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {b.task_title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Assignee: <strong className="text-slate-800 dark:text-slate-200">{b.assignee_name || 'Unassigned'}</strong> &bull; Operating Workload: <strong className="font-mono text-rose-600 dark:text-rose-400">{b.workload_percentage}%</strong>
                  </p>
                </div>

                {/* Delay Risk Indicator */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-slate-800 self-start sm:self-auto text-xs">
                  <TrendingUp className="w-4 h-4 text-rose-500" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Delay Risk</span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-sm">
                      {b.delay_risk_percentage}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Data-driven reasons */}
              <div className="mt-5 space-y-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Calculated Bottleneck Reasons:
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {b.reasons.map((reason, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/40 border border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Downstream Impact & Simulation Action */}
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
                  <Layers className="w-4 h-4 text-zinc-400" />
                  <span>Blocks <strong>{b.blocking_tasks_count}</strong> downstream task(s): {b.downstream_task_ids.slice(0, 4).join(', ')}{b.downstream_task_ids.length > 4 ? '...' : ''}</span>
                </div>

                <Link
                  href={`/simulation?task_id=${b.task_id}`}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 font-semibold text-xs transition-all shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Simulate Solution</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
