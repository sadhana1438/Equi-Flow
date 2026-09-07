'use client';

import React from 'react';

interface HealthBadgeProps {
  health: 'HEALTHY' | 'ON_TRACK' | 'WARNING' | 'AT_RISK' | 'CRITICAL' | string;
  className?: string;
}

export default function HealthBadge({ health, className = '' }: HealthBadgeProps) {
  const config = {
    HEALTHY: {
      label: 'Healthy',
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-500/30',
      dot: 'bg-emerald-500',
    },
    ON_TRACK: {
      label: 'On Track',
      bg: 'bg-blue-500/10 dark:bg-blue-500/20',
      text: 'text-blue-700 dark:text-blue-400',
      border: 'border-blue-500/30',
      dot: 'bg-blue-500',
    },
    WARNING: {
      label: 'Warning',
      bg: 'bg-amber-500/10 dark:bg-amber-500/20',
      text: 'text-amber-700 dark:text-amber-400',
      border: 'border-amber-500/30',
      dot: 'bg-amber-500',
    },
    AT_RISK: {
      label: 'At Risk',
      bg: 'bg-orange-500/10 dark:bg-orange-500/20',
      text: 'text-orange-700 dark:text-orange-400',
      border: 'border-orange-500/30',
      dot: 'bg-orange-500',
    },
    CRITICAL: {
      label: 'Critical',
      bg: 'bg-rose-500/10 dark:bg-rose-500/20',
      text: 'text-rose-700 dark:text-rose-400',
      border: 'border-rose-500/30',
      dot: 'bg-rose-500',
    },
  }[health.toUpperCase()] || {
    label: health,
    bg: 'bg-slate-500/10 dark:bg-slate-500/20',
    text: 'text-slate-700 dark:text-slate-400',
    border: 'border-slate-500/30',
    dot: 'bg-slate-500',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
