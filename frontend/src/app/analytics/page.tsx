'use client';

import React, { useEffect, useState } from 'react';
import { useProject } from '@/context/ProjectContext';
import { api } from '@/lib/api';
import { AnalyticsData } from '@/types';
import EmptyState from '@/components/common/EmptyState';
import {
  BarChart3,
  TrendingUp,
  Clock,
  PieChart as PieIcon,
  Calendar,
  Loader2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#6366f1', '#f59e0b', '#ec4899', '#10b981', '#06b6d4'];

export default function AnalyticsPage() {
  const { selectedProjectId } = useProject();

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const data = await api.getAnalytics(selectedProjectId || undefined);
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [selectedProjectId]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <BarChart3 className="w-7 h-7 text-zinc-400" />
          <span>Historical Analytics &amp; Trends</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Derived from actual logged work events and timeline records. Never fabricated or simulated.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh]">
          <Loader2 className="w-8 h-8 text-zinc-400 animate-spin mb-2" />
          <p className="text-xs text-slate-400">Aggregating historical data points...</p>
        </div>
      ) : !analytics || !analytics.has_sufficient_data ? (
        <EmptyState
          icon={BarChart3}
          title="Not enough historical data for this analysis"
          description="Log daily work events (PR reviews, meetings, support hours) to generate trend lines and capacity utilization graphs."
        />
      ) : (
        <div className="space-y-6">
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Daily Trends Bar Chart */}
            <div className="lg:col-span-8 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-zinc-400" />
                  <span>Daily Hidden Work vs Meeting Hours</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">Past Days</span>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.daily_trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #1e293b',
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                        color: '#f8fafc',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Bar dataKey="hidden_hours" name="Hidden Work (h)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="meeting_hours" name="Meeting Load (h)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Breakdown Pie Chart */}
            <div className="lg:col-span-4 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                  <PieIcon className="w-4 h-4 text-amber-500" />
                  <span>Workload By Category</span>
                </h3>

                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.category_distribution}
                        dataKey="hours"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        outerRadius={75}
                        innerRadius={45}
                        paddingAngle={4}
                      >
                        {analytics.category_distribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #1e293b',
                          borderRadius: '0.75rem',
                          fontSize: '12px',
                          color: '#f8fafc',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Legend List */}
              <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                {analytics.category_distribution.map((item, idx) => (
                  <div key={item.category} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      <span className="text-slate-600 dark:text-slate-300">{item.category}</span>
                    </div>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{item.hours}h</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
