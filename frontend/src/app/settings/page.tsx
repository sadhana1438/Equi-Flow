'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { SystemSettings } from '@/types';
import {
  Settings as SettingsIcon,
  Shield,
  Clock,
  Sliders,
  Sun,
  Moon,
  CheckCircle2,
  Lock,
  Loader2,
} from 'lucide-react';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Editable settings
  const [healthyThreshold, setHealthyThreshold] = useState(0.8);
  const [nearCapacityThreshold, setNearCapacityThreshold] = useState(1.0);
  const [defaultCapacity, setDefaultCapacity] = useState(8.0);
  const [rawRetentionDays, setRawRetentionDays] = useState(90);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await api.getSettings();
      setSettings(data);
      setHealthyThreshold(data.healthy_threshold);
      setNearCapacityThreshold(data.near_capacity_threshold);
      setDefaultCapacity(data.default_capacity);
      setRawRetentionDays(data.raw_retention_days);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.updateSettings({
        healthy_threshold: Number(healthyThreshold),
        near_capacity_threshold: Number(nearCapacityThreshold),
        default_capacity: Number(defaultCapacity),
        raw_retention_days: Number(rawRetentionDays),
        theme: theme,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <SettingsIcon className="w-7 h-7 text-zinc-400" />
          <span>System &amp; Workload Settings</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Configure mathematical thresholds, privacy compliance, and interface preferences.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>Settings saved successfully. All intelligence calculations updated.</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-slate-400 py-6">
          <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
          <span>Loading system parameters...</span>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Workload Thresholds Section */}
          <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-zinc-400" />
              <span>Workload Status Thresholds</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Set the capacity boundaries for dynamic status labeling.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Healthy Capacity Limit (Default: 0.8 = 80%)
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0.4"
                  max="1.0"
                  value={healthyThreshold}
                  onChange={(e) => setHealthyThreshold(parseFloat(e.target.value) || 0.8)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-zinc-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Overloaded Threshold (Default: 1.0 = 100%)
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0.8"
                  max="1.5"
                  value={nearCapacityThreshold}
                  onChange={(e) => setNearCapacityThreshold(parseFloat(e.target.value) || 1.0)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-zinc-500"
                />
              </div>
            </div>
          </div>

          {/* Capacity Defaults */}
          <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-400" />
              <span>Default Capacity &amp; Telemetry Retention</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Default Daily Member Capacity (Hours)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="2"
                  max="16"
                  value={defaultCapacity}
                  onChange={(e) => setDefaultCapacity(parseFloat(e.target.value) || 8)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-zinc-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Raw Event Retention Window (Days)
                </label>
                <input
                  type="number"
                  min="14"
                  max="365"
                  value={rawRetentionDays}
                  onChange={(e) => setRawRetentionDays(parseInt(e.target.value) || 90)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-zinc-500"
                />
              </div>
            </div>
          </div>

          {/* Theme Selector */}
          <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Appearance &amp; Theme
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Choose your preferred visual theme. Persisted across sessions.
            </p>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  theme === 'dark'
                    ? 'border-indigo-500 bg-zinc-100 dark:bg-zinc-800 text-indigo-400 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Moon className="w-4 h-4 text-indigo-400" />
                <span>Dark Enterprise Mode</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  theme === 'light'
                    ? 'border-indigo-500 bg-zinc-100 dark:bg-zinc-800 text-indigo-600 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Light Professional Mode</span>
              </button>
            </div>
          </div>

          {/* Privacy & Anti-Surveillance Policy */}
          <div className="p-6 rounded-2xl border border-emerald-200 dark:border-emerald-950/60 bg-emerald-50/30 dark:bg-emerald-950/10 text-xs space-y-2">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider">
              <Shield className="w-4 h-4" />
              <span>Anti-Surveillance &amp; Privacy Guarantee</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              EquiFlow is designed strictly for workload balancing and project risk forecasting. It does not rank employees, evaluate individual performance, track idle time, or inspect message content. All work events store only durations and category metadata.
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 font-bold text-xs shadow-xs transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save System Settings'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
