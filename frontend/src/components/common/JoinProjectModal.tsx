'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useProject } from '@/context/ProjectContext';
import Modal from '@/components/common/Modal';
import { FolderPlus, CheckCircle2, AlertCircle } from 'lucide-react';

interface JoinProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function JoinProjectModal({ isOpen, onClose, onSuccess }: JoinProjectModalProps) {
  const { user, joinProjectByCode } = useAuth();
  const { refreshProjects, setSelectedProjectId } = useProject();

  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    try {
      setSubmitting(true);
      setErrorMsg('');
      const proj = await joinProjectByCode(code.trim());
      await refreshProjects();
      setSelectedProjectId(proj.id);
      setSuccessMsg(`Joined project "${proj.name}"!`);
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
        if (onSuccess) onSuccess();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to join project with this code.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Join Project with Team Code">
      <form onSubmit={handleJoin} className="space-y-4">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Enter the Project Join Code provided by your Team Leader to sync your assigned tasks and log your work.
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
            Project Join Code *
          </label>
          <input
            type="text"
            required
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. EQ-9482"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-base font-mono font-bold tracking-widest text-slate-900 dark:text-white uppercase placeholder-slate-400 focus:ring-2 focus:ring-indigo-500"
          />
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
            {submitting ? 'Joining...' : 'Join Project'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
