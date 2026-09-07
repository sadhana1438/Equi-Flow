'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useProject } from '@/context/ProjectContext';
import { api } from '@/lib/api';
import Modal from '@/components/common/Modal';
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface LogWorkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function LogWorkModal({ isOpen, onClose, onSuccess }: LogWorkModalProps) {
  const { user } = useAuth();
  const { selectedProjectId } = useProject();

  const [eventType, setEventType] = useState('PR_REVIEW');
  const [hours, setHours] = useState(1.5);
  const [context, setContext] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setErrorMsg('Please sign in or select your profile first.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');
      await api.createWorkEvent({
        user_id: user.id,
        project_id: selectedProjectId || undefined,
        event_type: eventType,
        estimated_hidden_hours: Number(hours),
        context_channel: context.trim() || undefined,
      });

      setSuccessMsg(`Logged ${hours}h of ${eventType.replace('_', ' ')}!`);
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
        if (onSuccess) onSuccess();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to log work event.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Work Event (Hidden / Actual Work)">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Capture code reviews, customer support escalation, meetings, or interruptions that consume your daily capacity beyond assigned tasks.
        </p>

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Work Category *
          </label>
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
          >
            <option value="PR_REVIEW">PR / Code Review (Collaboration)</option>
            <option value="SUPPORT">Customer / Tier-3 Support Escalation</option>
            <option value="MEETINGS">Team / Architecture Meeting</option>
            <option value="REWORK">Unplanned Bug Fix / Rework</option>
            <option value="ARCHITECTURE">System Architecture / Design</option>
            <option value="INTERRUPTIONS">Ad-hoc Production Interruption</option>
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Time Spent (Hours) *
            </label>
            <input
              type="number"
              step="0.25"
              min="0.25"
              max="16"
              required
              value={hours}
              onChange={(e) => setHours(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Context / Channel (Optional)
            </label>
            <input
              type="text"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="e.g. repo:auth-service or slack:#prod"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
          >
            {submitting ? 'Logging...' : 'Save Work Event'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
