'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  badge?: React.ReactNode;
  variant?: 'default' | 'warning' | 'danger' | 'success';
}

export default function KPICard({
  title,
  value,
  subtext,
  icon: Icon,
  badge,
  variant = 'default',
}: KPICardProps) {
  const borderVariants = {
    default: 'hover:border-zinc-300 dark:hover:border-zinc-700',
    warning: 'border-amber-500/40 bg-amber-500/5 dark:border-amber-500/30',
    danger: 'border-rose-500/40 bg-rose-500/5 dark:border-rose-500/30',
    success: 'border-emerald-500/40 bg-emerald-500/5 dark:border-emerald-500/30',
  }[variant];

  const iconColors = {
    default: 'text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800',
    warning: 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/40',
    danger: 'text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/40',
    success: 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/40',
  }[variant];

  return (
    <div
      className={`relative p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] shadow-xs transition-all duration-200 ${borderVariants}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-mono">
            {title}
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 font-mono">
              {value}
            </span>
            {badge && <div className="ml-1">{badge}</div>}
          </div>
          {subtext && (
            <span className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {subtext}
            </span>
          )}
        </div>
        <div className={`p-2 rounded-lg ${iconColors}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}
