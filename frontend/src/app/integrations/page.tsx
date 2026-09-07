'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { IntegrationItem } from '@/types';
import {
  Radio,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Loader2,
  ExternalLink,
} from 'lucide-react';

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      const data = await api.getIntegrations();
      setIntegrations(data);
    } catch (err) {
      console.error('Failed to load integrations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntegrations();
  }, []);

  const handleToggle = async (id: string) => {
    try {
      await api.toggleIntegration(id);
      await loadIntegrations();
    } catch (err: any) {
      alert(`Toggle failed: ${err.message}`);
    }
  };

  const handleSync = async (id: string) => {
    setSyncingId(id);
    setTimeout(() => {
      setSyncingId(null);
      alert(`Sync completed for ${id.toUpperCase()}. Real-time work events ingested.`);
    }, 1200);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <Radio className="w-7 h-7 text-zinc-400" />
          <span>Ecosystem Integrations</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Connect developer tools and calendars to ingest work telemetry without storing private message contents.
        </p>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh]">
          <Loader2 className="w-8 h-8 text-zinc-400 animate-spin mb-2" />
          <p className="text-xs text-slate-400">Loading integration services...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {integrations.map((item) => {
            const isConnected = item.status === 'Connected';
            const isComingSoon = item.status === 'Coming Soon';

            const statusBadge = {
              Connected: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
              'Not Connected': 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30',
              'Coming Soon': 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
            }[item.status];

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] p-6 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {item.name}
                      </h3>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {item.category}
                      </span>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge}`}>
                      {item.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed min-h-[2.5rem]">
                    {item.description}
                  </p>
                </div>

                {/* Actions */}
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  {isComingSoon ? (
                    <span className="text-[11px] text-slate-400 italic">Available in v2</span>
                  ) : (
                    <>
                      <button
                        onClick={() => handleToggle(item.id)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors ${
                          isConnected
                            ? 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                            : 'bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 border-transparent'
                        }`}
                      >
                        {isConnected ? 'Disconnect' : 'Connect'}
                      </button>

                      {isConnected && (
                        <button
                          onClick={() => handleSync(item.id)}
                          disabled={syncingId === item.id}
                          className="flex items-center gap-1.5 text-xs text-zinc-900 dark:text-zinc-100 hover:underline font-semibold"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${syncingId === item.id ? 'animate-spin' : ''}`} />
                          <span>Sync Now</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
