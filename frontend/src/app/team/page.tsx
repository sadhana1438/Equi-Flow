'use client';

import React, { useEffect, useState } from 'react';
import { useProject } from '@/context/ProjectContext';
import { api } from '@/lib/api';
import { User, Skill, MemberWorkload } from '@/types';
import WorkloadBadge from '@/components/common/WorkloadBadge';
import EmptyState from '@/components/common/EmptyState';
import Modal from '@/components/common/Modal';
import {
  Users,
  UserPlus,
  Clock,
  Award,
  Plus,
  Trash2,
  Copy,
  Check,
  Share2,
  ShieldCheck,
  Mail,
  Loader2,
} from 'lucide-react';

export default function TeamPage() {
  const { selectedProjectId, selectedProject } = useProject();

  const [users, setUsers] = useState<User[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [workloads, setWorkloads] = useState<Record<string, MemberWorkload>>({});
  const [loading, setLoading] = useState(true);
  const [filterByProject, setFilterByProject] = useState(true);

  // Modals
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [skillModalOpen, setSkillModalOpen] = useState(false);
  const [selectedUserForSkill, setSelectedUserForSkill] = useState<User | null>(null);

  // Forms
  const [memberForm, setMemberForm] = useState({
    name: '',
    role: '',
    email: '',
    daily_capacity: 8.0,
  });

  const [skillForm, setSkillForm] = useState({
    skill_id: '',
    proficiency: 'STANDARD',
  });
  const [newSkillName, setNewSkillName] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      const projectIdToQuery = filterByProject ? (selectedProjectId || undefined) : undefined;
      const [uData, sData, wData] = await Promise.all([
        api.getUsers(projectIdToQuery),
        api.getSkills(),
        api.getWorkload(selectedProjectId || undefined),
      ]);

      setUsers(uData);
      setSkills(sData);

      const wMap: Record<string, MemberWorkload> = {};
      wData.forEach((w) => {
        wMap[w.user_id] = w;
      });
      setWorkloads(wMap);
    } catch (err) {
      console.error('Failed to load team data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeamData();
  }, [selectedProjectId, filterByProject]);

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createUser({
        name: memberForm.name,
        role: memberForm.role,
        email: memberForm.email.trim() || undefined,
        daily_capacity: memberForm.daily_capacity,
        project_id: selectedProjectId || undefined,
      });
      setMemberModalOpen(false);
      setMemberForm({ name: '', role: '', email: '', daily_capacity: 8.0 });
      await loadTeamData();
    } catch (err: any) {
      alert(`Failed to create team member: ${err.message}`);
    }
  };

  const handleUpdateCapacity = async (userId: string, newCapacity: number) => {
    try {
      await api.updateUser(userId, { daily_capacity: newCapacity });
      await loadTeamData();
    } catch (err: any) {
      alert(`Failed to update capacity: ${err.message}`);
    }
  };

  const handleDeleteMember = async (userId: string, userName: string) => {
    if (!window.confirm(`Are you sure you want to remove "${userName}" from the team?`)) {
      return;
    }
    try {
      await api.deleteUser(userId);
      await loadTeamData();
    } catch (err: any) {
      alert(`Failed to delete user: ${err.message}`);
    }
  };

  const handleAddSkillToMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForSkill) return;

    try {
      let finalSkillId = skillForm.skill_id;

      if (!finalSkillId && newSkillName.trim()) {
        const createdSkill = await api.createSkill({
          name: newSkillName.trim(),
          category: 'Engineering',
        });
        finalSkillId = createdSkill.id;
      }

      if (!finalSkillId) {
        alert('Please select or create a skill.');
        return;
      }

      await api.addUserSkill(selectedUserForSkill.id, {
        skill_id: finalSkillId,
        proficiency: skillForm.proficiency,
      });

      setSkillModalOpen(false);
      setNewSkillName('');
      setSkillForm({ skill_id: '', proficiency: 'STANDARD' });
      await loadTeamData();
    } catch (err: any) {
      alert(`Failed to assign skill: ${err.message}`);
    }
  };

  const handleRemoveSkill = async (userId: string, skillId: string) => {
    try {
      await api.removeUserSkill(userId, skillId);
      await loadTeamData();
    } catch (err: any) {
      alert(`Failed to remove skill: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Users className="w-5 h-5 text-zinc-500" />
            <span>Team & Capacity Directory</span>
          </h1>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Workload balancing directory. EquiFlow measures capacity and project risk, not employee rankings.
          </p>
        </div>

        <button
          onClick={() => setMemberModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 font-medium text-xs transition-all shadow-xs self-start sm:self-auto"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Add Team Member</span>
        </button>
      </div>

      {/* Invite Team Members Join Code Banner */}
      {selectedProject?.join_code && (
        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-xs flex-shrink-0">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                Project Join Code for {selectedProject.name}
              </h4>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Share this join code with team members so they can connect their account and log work directly into this project.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
            <div className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 tracking-wider">
              {selectedProject.join_code}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(selectedProject.join_code);
                setCopiedCode(true);
                setTimeout(() => setCopiedCode(false), 1500);
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 text-xs font-medium shadow-xs transition-all"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Directory Filter Toggle if a project is active */}
      {selectedProjectId && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterByProject(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-xs ${
              filterByProject
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950'
                : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
            }`}
          >
            {selectedProject?.name || 'Current Project'} Members ({users.length})
          </button>
          <button
            onClick={() => setFilterByProject(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-xs ${
              !filterByProject
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950'
                : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
            }`}
          >
            All Organization Members
          </button>
        </div>
      )}

      {/* Team Cards Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh]">
          <Loader2 className="w-6 h-6 text-zinc-400 animate-spin mb-2" />
          <p className="text-xs text-zinc-400 font-mono">Loading team directory...</p>
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Add team members to calculate workload capacity"
          description="Add your engineers, designers, and leads with configurable daily hours to enable dynamic workload analytics."
          actionText="Add Team Member"
          onAction={() => setMemberModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((member) => {
            const wl = workloads[member.id];
            return (
              <div
                key={member.id}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] p-5 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          {member.name}
                        </h3>
                        {member.is_leader && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-[10px] font-bold border border-zinc-300 dark:border-zinc-700 font-mono">
                            <ShieldCheck className="w-3 h-3" /> LEADER
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 block mt-0.5">
                        {member.role}
                      </span>
                      {member.email && (
                        <div className="text-[11px] text-zinc-400 flex items-center gap-1 mt-1">
                          <Mail className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{member.email}</span>
                        </div>
                      )}
                    </div>
                    {wl && (
                      <WorkloadBadge
                        status={wl.status}
                        percentage={Math.round(wl.total_workload * 100)}
                      />
                    )}
                  </div>

                  {/* Configurable Capacity */}
                  <div className="mt-3.5 p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
                    <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" />
                      Daily Capacity:
                    </span>
                    <div className="flex items-center gap-1.5 font-mono">
                      <input
                        type="number"
                        step="0.5"
                        min="2"
                        max="16"
                        defaultValue={member.daily_capacity}
                        onBlur={(e) => handleUpdateCapacity(member.id, parseFloat(e.target.value) || 8)}
                        className="w-14 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-right text-xs font-bold text-zinc-800 dark:text-zinc-200 focus:ring-1 focus:ring-zinc-500"
                      />
                      <span className="text-zinc-400 text-[11px]">hours/day</span>
                    </div>
                  </div>

                  {/* Assigned vs Hidden Work */}
                  {wl && (
                    <div className="mt-2.5 grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800">
                        <span className="text-zinc-400">Assigned Work:</span>
                        <div className="font-mono font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">
                          {wl.assigned_work}h / day
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800">
                        <span className="text-zinc-400">Hidden Tracked:</span>
                        <div className="font-mono font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                          +{wl.hidden_work}h
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Skills Section */}
                  <div className="mt-3.5 pt-2.5 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1 font-mono">
                        <Award className="w-3 h-3 text-zinc-400" />
                        Skills &amp; Proficiency
                      </span>
                      <button
                        onClick={() => {
                          setSelectedUserForSkill(member);
                          setSkillModalOpen(true);
                        }}
                        className="text-[11px] font-medium text-zinc-900 dark:text-zinc-100 hover:underline flex items-center gap-0.5"
                      >
                        <Plus className="w-3 h-3" /> Add Skill
                      </button>
                    </div>

                    {member.skills.length === 0 ? (
                      <p className="text-[11px] text-zinc-400 italic">No skills assigned yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {member.skills.map((s) => {
                          const profColor = {
                            EXPERT: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
                            STANDARD: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
                            NOVICE: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
                          }[s.proficiency] || '';

                          return (
                            <span
                              key={s.skill_id}
                              className={`group inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${profColor}`}
                            >
                              <span>{s.skill_name}</span>
                              <span className="text-[9px] opacity-70 font-semibold">({s.proficiency[0]})</span>
                              <button
                                onClick={() => handleRemoveSkill(member.id, s.skill_id)}
                                className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-rose-500 ml-0.5 transition-opacity"
                                title="Remove skill"
                              >
                                &times;
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="mt-4 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
                  <button
                    onClick={() => handleDeleteMember(member.id, member.name)}
                    className="p-1 rounded-md text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Remove member"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Member Modal */}
      <Modal
        isOpen={memberModalOpen}
        onClose={() => setMemberModalOpen(false)}
        title="Add New Team Member"
      >
        <form onSubmit={handleCreateMember} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={memberForm.name}
              onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
              placeholder="e.g. Maya Lin"
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Role in Team *
            </label>
            <input
              type="text"
              required
              value={memberForm.role}
              onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
              placeholder="e.g. Senior Backend Engineer"
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Email Address (Optional)
            </label>
            <input
              type="email"
              value={memberForm.email}
              onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
              placeholder="e.g. member@company.com"
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-500"
            />
          </div>

          {selectedProject && (
            <div className="p-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-700 text-[11px] text-zinc-800 dark:text-zinc-200">
              <span>Adding to active project: <strong>{selectedProject.name}</strong></span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Daily Capacity (Hours) *
            </label>
            <input
              type="number"
              step="0.5"
              min="2"
              max="16"
              required
              value={memberForm.daily_capacity}
              onChange={(e) => setMemberForm({ ...memberForm, daily_capacity: parseFloat(e.target.value) || 8 })}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-500"
            />
          </div>

          <div className="mt-5 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setMemberModalOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 text-xs font-medium shadow-xs transition-all"
            >
              Add Member
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Skill to Member Modal */}
      <Modal
        isOpen={skillModalOpen}
        onClose={() => setSkillModalOpen(false)}
        title={`Assign Skill to ${selectedUserForSkill?.name}`}
      >
        <form onSubmit={handleAddSkillToMember} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Select Existing Skill
            </label>
            <select
              value={skillForm.skill_id}
              onChange={(e) => setSkillForm({ ...skillForm, skill_id: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-500"
            >
              <option value="">Or enter new skill below...</option>
              {skills.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.category})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Or Create New Skill
            </label>
            <input
              type="text"
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              placeholder="e.g. Distributed Consensus"
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Proficiency Level
            </label>
            <select
              value={skillForm.proficiency}
              onChange={(e) => setSkillForm({ ...skillForm, proficiency: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-500"
            >
              <option value="EXPERT">Expert (0.8x task effort multiplier)</option>
              <option value="STANDARD">Standard (1.0x task effort multiplier)</option>
              <option value="NOVICE">Novice (1.5x task effort multiplier)</option>
            </select>
          </div>

          <div className="mt-5 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setSkillModalOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 text-xs font-medium shadow-xs transition-all"
            >
              Assign Skill
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
