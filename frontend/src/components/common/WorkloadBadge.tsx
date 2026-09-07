'use client';

import React from 'react';

interface WorkloadBadgeProps {
  status: 'HEALTHY' | 'NEAR_CAPACITY' | 'OVERLOADED' | string;
  percentage?: number;
  className?: string;
}

export default function WorkloadBadge({ status, percentage, className = '' }: WorkloadBadgeProps) {
  const config = {
    HEALTHY: {
      label: 'Healthy Capacity',
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-500/30',
    },
    NEAR_CAPACITY: {
      label: 'Near Capacity',
      bg: 'bg-amber-500/10 dark:bg-amber-500/20',
      text: 'text-amber-700 dark:text-amber-400',
      border: 'border-amber-500/30',
    },
    OVERLOADED: {
      label: 'Overloaded',
      bg: 'bg-rose-500/10 dark:bg-rose-500/20',
      text: 'text-rose-700 dark:text-rose-400',
      border: 'border-rose-500/30',
    },
  }[status.toUpperCase()] || {
    label: status,
    bg: 'bg-slate-500/10 dark:bg-slate-500/20',
    text: 'text-slate-700 dark:text-slate-400',
    border: 'border-slate-500/30',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      <span>{config.label}</span>
      {percentage !== undefined && (
        <span className="font-mono text-[11px] opacity-80">({percentage}%)</span>
      )}
    </span>
  );
}
