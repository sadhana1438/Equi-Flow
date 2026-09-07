'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { NotificationItem } from '@/types';
import EmptyState from '@/components/common/EmptyState';
import {
  Bell,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  Loader2,
} from 'lucide-react';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <Bell className="w-7 h-7 text-zinc-400" />
          <span>System Alerts &amp; Notifications</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          State-driven alerts generated dynamically when workload thresholds, bottlenecks, or delay risks are triggered.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh]">
          <Loader2 className="w-8 h-8 text-zinc-400 animate-spin mb-2" />
          <p className="text-xs text-slate-400">Checking system triggers...</p>
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="All systems optimal — No active alerts"
          description="EquiFlow has detected no overloaded assignees, blocking bottlenecks, or critical delay risks."
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const isCritical = n.severity === 'CRITICAL';
            const iconBg = isCritical
              ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
              : 'bg-amber-500/10 text-amber-500 border-amber-500/20';

            return (
              <div
                key={n.id}
                className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
              >
                <div className="flex items-start gap-3.5">
                  <div className={`p-2.5 rounded-xl border ${iconBg} flex-shrink-0 mt-0.5`}>
                    {isCritical ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : (
                      <Clock className="w-5 h-5" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {n.title}
                      </h4>
                      <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold uppercase border ${
                        isCritical ? 'bg-rose-500/10 text-rose-600 border-rose-500/30' : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                      }`}>
                        {n.severity}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {n.message}
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                      {n.timestamp}
                    </span>
                  </div>
                </div>

                {n.action_link && (
                  <Link
                    href={n.action_link}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all flex-shrink-0 self-end sm:self-auto"
                  >
                    <span>Inspect</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
