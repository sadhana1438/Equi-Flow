'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useProject } from '@/context/ProjectContext';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import {
  MemberWorkload,
  BottleneckItem,
  RecommendationItem,
  ProjectIntelligenceSummary,
  Task,
} from '@/types';
import KPICard from '@/components/common/KPICard';
import HealthBadge from '@/components/common/HealthBadge';
import WorkloadBadge from '@/components/common/WorkloadBadge';
import EmptyState from '@/components/common/EmptyState';
import AuthModal from '@/components/common/AuthModal';
import JoinProjectModal from '@/components/common/JoinProjectModal';
import LogWorkModal from '@/components/common/LogWorkModal';
import {
  Activity,
  AlertTriangle,
  Clock,
  Zap,
  TrendingUp,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Layers,
  Users,
  FolderPlus,
  Loader2,
  LogIn,
  KeyRound,
  CheckCircle2,
  PlusCircle,
  Calendar,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, isLeader } = useAuth();
  const { selectedProjectId, selectedProject, projects, refreshProjects } = useProject();

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ProjectIntelligenceSummary | null>(null);
  const [workloads, setWorkloads] = useState<MemberWorkload[]>([]);
  const [bottlenecks, setBottlenecks] = useState<BottleneckItem[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [myTasks, setMyTasks] = useState<Task[]>([]);

  // Modals
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [logWorkOpen, setLogWorkOpen] = useState(false);

  const loadDashboardData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      if (!isLeader) {
        // Team Member view: fetch personal tasks and project workload
        const [tasksData, wlData] = await Promise.all([
          api.getTasks({ assignee_id: user.id, project_id: selectedProjectId || undefined }),
          api.getWorkload(selectedProjectId || undefined),
        ]);
        setMyTasks(tasksData);
        setWorkloads(wlData);
      } else {
        // Team Leader view: full intelligence engine
        const [wlData, bnData, recData] = await Promise.all([
          api.getWorkload(selectedProjectId || undefined),
          api.getBottlenecks(selectedProjectId || undefined),
          api.getRecommendations(selectedProjectId || undefined),
        ]);
        setWorkloads(wlData);
        setBottlenecks(bnData);
        setRecommendations(recData);

        if (selectedProjectId) {
          const sumData = await api.getProjectSummary(selectedProjectId);
          setSummary(sumData);
        } else {
          const risks = await api.getRisks();
          setSummary({
            project_id: 'all',
            project_name: 'All Projects',
            health: risks.health,
            overall_workload: risks.overall_workload,
            total_hidden_work: wlData.reduce((acc, w) => acc + w.hidden_work, 0),
            bottleneck_count: bnData.length,
            delay_risk: risks.delay_risk,
            completion_percentage: risks.completion_percentage,
            active_members_count: wlData.length,
            open_tasks_count: risks.open_tasks_count,
            completed_tasks_count: risks.completed_tasks_count,
          });
        }
      }
    } catch (err: any) {
      if (err?.message?.includes('credentials') || err?.message?.includes('401')) {
        console.warn('Dashboard notice: user session expired or credentials invalid.');
      } else {
        console.error('Failed to load dashboard intelligence:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user, selectedProjectId, isLeader]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 text-zinc-400 animate-spin mb-3" />
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 font-mono">
          Computing real-time workload telemetry...
        </p>
      </div>
    );
  }

  // 1. UNLOADED / UNAUTHENTICATED STATE
  // Shown when opening in another browser where user hasn't logged in
  if (!user) {
    return (
      <div className="max-w-4xl mx-auto py-8 sm:py-16 space-y-8 animate-in fade-in duration-200">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 font-bold flex items-center justify-center mx-auto shadow-xs">
            <Layers className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Sign In to EquiFlow Workspace
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-md mx-auto">
            You are browsing from a new session. Sign in with your credentials or join an existing project using a 6-digit Join Code.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Team Leader */}
          <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-850 flex items-center justify-center text-zinc-800 dark:text-zinc-200">
                <LogIn className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Team Leader / Manager</h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Sign in to create projects, configure team capacities, monitor DAG bottlenecks, and run What-If simulations.
              </p>
            </div>
            <button
              onClick={() => setAuthModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 font-medium text-xs shadow-xs transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In as Leader</span>
            </button>
          </div>

          {/* Card 2: Team Member with Join Code */}
          <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-850 flex items-center justify-center text-zinc-800 dark:text-zinc-200">
                <KeyRound className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Team Member</h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Enter the 6-digit Join Code provided by your Team Leader (e.g. <code>EQ-8492</code>) to access your tasks and log work.
              </p>
            </div>
            <button
              onClick={() => setJoinModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium text-xs shadow-xs transition-all"
            >
              <KeyRound className="w-3.5 h-3.5 text-zinc-500" />
              <span>Join with Project Code</span>
            </button>
          </div>
        </div>

        {/* Auth Modals */}
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => {
            setAuthModalOpen(false);
            refreshProjects();
          }}
        />
        <JoinProjectModal
          isOpen={joinModalOpen}
          onClose={() => {
            setJoinModalOpen(false);
            refreshProjects();
          }}
        />
      </div>
    );
  }

  // 2. TEAM MEMBER VIEW (Personal Work Hub)
  if (!isLeader) {
    const myWorkload = workloads.find(w => w.user_id === user.id);

    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* Personal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-zinc-200 dark:border-zinc-800/80">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {user.name}&rsquo;s Personal Work Hub
              </h1>
              {myWorkload && (
                <WorkloadBadge
                  status={myWorkload.status}
                  percentage={Math.round(myWorkload.total_workload * 100)}
                />
              )}
            </div>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Role: <strong className="text-zinc-700 dark:text-zinc-300">{user.role}</strong> &bull; Active Project: <strong className="text-zinc-700 dark:text-zinc-300">{selectedProject ? selectedProject.name : 'No project joined'}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setLogWorkOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 font-medium text-xs transition-all shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Log Work Event</span>
            </button>
            <button
              onClick={() => setJoinModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium transition-all shadow-xs"
            >
              <KeyRound className="w-3.5 h-3.5 text-zinc-500" />
              <span>Join Another Project</span>
            </button>
          </div>
        </div>

        {/* Member Capacity & Workload Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <KPICard
            title="My Workload Score"
            value={myWorkload ? `${Math.round(myWorkload.total_workload * 100)}%` : '0%'}
            subtext="Calculated utilization (W_total)"
            icon={Activity}
            variant={myWorkload && myWorkload.total_workload > 1.0 ? 'danger' : myWorkload && myWorkload.total_workload > 0.8 ? 'warning' : 'success'}
          />
          <KPICard
            title="Assigned Tasks"
            value={myTasks.length}
            subtext={`${myWorkload ? myWorkload.assigned_work : 0}h daily demand`}
            icon={Zap}
          />
          <KPICard
            title="Hidden Tracked Work"
            value={myWorkload ? `${myWorkload.hidden_work.toFixed(1)}h` : '0.0h'}
            subtext="PR reviews, rework, support"
            icon={Clock}
            variant={myWorkload && myWorkload.hidden_work > 3 ? 'warning' : 'default'}
          />
          <KPICard
            title="Usable Daily Capacity"
            value={myWorkload ? `${myWorkload.available_capacity}h` : `${user.daily_capacity || 8}h`}
            subtext={`Daily limit minus ${myWorkload ? myWorkload.meetings : 0}h meetings`}
            icon={Clock}
          />
        </div>

        {/* My Assigned Tasks List */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                My Assigned Tasks ({myTasks.length})
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Tasks allocated to you in active sprints
              </p>
            </div>
            <Link
              href="/tasks"
              className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:underline flex items-center gap-1"
            >
              <span>View All Project Tasks</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {myTasks.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-400">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500/60" />
              <p>You have no open tasks assigned right now.</p>
              <p className="text-[11px] mt-1 text-zinc-400">Click &ldquo;Log Work Event&rdquo; to track PR reviews or meeting blocks.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {myTasks.map((t) => (
                <div key={t.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">{t.id}</span>
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{t.title}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-zinc-400 font-mono">
                      <span>Status: <strong className="text-zinc-600 dark:text-zinc-300">{t.status}</strong></span>
                      <span>Est: <strong className="text-zinc-600 dark:text-zinc-300">{t.remaining_hours}h left</strong></span>
                      {t.due_date && <span>Due: {new Date(t.due_date).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                    t.priority === 'CRITICAL' || t.priority === 'HIGH'
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                  }`}>
                    {t.priority}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <LogWorkModal
          isOpen={logWorkOpen}
          onClose={() => {
            setLogWorkOpen(false);
            loadDashboardData();
          }}
        />
        <JoinProjectModal
          isOpen={joinModalOpen}
          onClose={() => {
            setJoinModalOpen(false);
            refreshProjects();
          }}
        />
      </div>
    );
  }

  // 3. TEAM LEADER VIEW (Executive Command Center)
  // If no projects exist for this leader yet
  if (projects.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 font-mono">
            Leader Command Center
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Logged in as Team Leader: <strong className="text-zinc-800 dark:text-zinc-200">{user.name}</strong>
          </p>
        </div>
        <EmptyState
          icon={FolderPlus}
          title="Create your first project to begin workload analysis"
          description="EquiFlow discovers hidden workload, predicts bottlenecks, and simulates team reassignments dynamically from your data."
          actionText="Create Project"
          onAction={() => { window.location.href = '/projects'; }}
        />
      </div>
    );
  }

  const topBottleneck = bottlenecks.length > 0 ? bottlenecks[0] : null;
  const topRecommendation = recommendations.length > 0 ? recommendations[0] : null;

  const bottleneckAssigneeWl = topBottleneck?.assignee_id
    ? workloads.find(w => w.user_id === topBottleneck.assignee_id)
    : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800/80">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {selectedProject ? selectedProject.name : 'All Projects Overview'}
            </h1>
            {summary && <HealthBadge health={summary.health} />}
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Real-time workload intelligence computed from active tasks, DAG dependencies, and tracked work events.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href="/simulation"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 font-medium text-xs transition-all shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Simulation Sandbox</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <KPICard
          title="Project Health"
          value={summary?.health.replace('_', ' ') || 'Healthy'}
          subtext="Composite delay risk"
          icon={Activity}
          variant={summary?.health === 'CRITICAL' || summary?.health === 'AT_RISK' ? 'danger' : summary?.health === 'WARNING' ? 'warning' : 'success'}
        />
        <KPICard
          title="Team Workload"
          value={`${summary ? Math.round(summary.overall_workload * 100) : 0}%`}
          subtext="Average capacity utilization"
          icon={Zap}
          variant={summary && summary.overall_workload > 1.0 ? 'danger' : summary && summary.overall_workload > 0.8 ? 'warning' : 'default'}
        />
        <KPICard
          title="Hidden Work"
          value={`${summary ? summary.total_hidden_work.toFixed(1) : 0}h`}
          subtext="PR reviews, rework & support"
          icon={Clock}
          variant={summary && summary.total_hidden_work > 10 ? 'warning' : 'default'}
        />
        <KPICard
          title="Bottlenecks"
          value={bottlenecks.length}
          subtext={bottlenecks.length === 0 ? 'No blockers detected' : 'Downstream paths affected'}
          icon={AlertTriangle}
          variant={bottlenecks.length > 0 ? 'danger' : 'success'}
        />
        <KPICard
          title="Delay Risk"
          value={`${summary ? summary.delay_risk : 0}%`}
          subtext={`${summary?.open_tasks_count || 0} active task(s)`}
          icon={TrendingUp}
          variant={summary && summary.delay_risk >= 65 ? 'danger' : summary && summary.delay_risk >= 40 ? 'warning' : 'default'}
        />
      </div>

      {/* Intelligence Spotlight: Bottleneck & Why It's Happening */}
      {topBottleneck ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Critical Bottleneck Alert Card */}
          <div className="lg:col-span-7 rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/15 p-5 shadow-xs">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 text-xs font-semibold tracking-wider uppercase font-mono">
                <ShieldAlert className="w-4 h-4" />
                <span>Critical / Highest-Risk Bottleneck</span>
              </div>
              <span className="px-2 py-0.5 rounded border border-rose-300 dark:border-rose-800 bg-rose-100/60 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 text-xs font-mono font-bold">
                Severity: {topBottleneck.severity_score}
              </span>
            </div>

            <div className="mt-3.5">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {topBottleneck.task_title}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 font-mono">
                Task ID: {topBottleneck.task_id} &bull; Assignee: <strong className="text-zinc-800 dark:text-zinc-200">{topBottleneck.assignee_name || 'Unassigned'}</strong>
              </p>
            </div>

            {/* Reasons generated from data */}
            <div className="mt-4 space-y-1.5">
              <p className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider font-mono">
                Data-Driven Findings:
              </p>
              <ul className="space-y-1">
                {topBottleneck.reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Bottom Actions */}
            <div className="mt-5 pt-3.5 border-t border-rose-200/80 dark:border-rose-900/40 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                <Layers className="w-4 h-4 text-zinc-500" />
                <span>Blocks <strong>{topBottleneck.blocking_tasks_count}</strong> downstream task(s)</span>
              </div>

              {topRecommendation && (
                <Link
                  href={`/simulation?task_id=${topBottleneck.task_id}&target_id=${topRecommendation.target_assignee_id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 text-xs font-medium shadow-xs transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Simulate Solution</span>
                </Link>
              )}
            </div>
          </div>

          {/* "Why is this happening?" Workload Breakdown */}
          <div className="lg:col-span-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-mono">
                  Why is this happening?
                </span>
                {bottleneckAssigneeWl && (
                  <WorkloadBadge
                    status={bottleneckAssigneeWl.status}
                    percentage={Math.round(bottleneckAssigneeWl.total_workload * 100)}
                  />
                )}
              </div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-2">
                Workload Breakdown for {topBottleneck.assignee_name}
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Assigned work vs actual tracked events & context switches.
              </p>

              {bottleneckAssigneeWl ? (
                <div className="mt-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs py-1 border-b border-zinc-100 dark:border-zinc-800/80">
                    <span className="text-zinc-600 dark:text-zinc-400">Assigned Task Work (T_assigned)</span>
                    <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">{bottleneckAssigneeWl.assigned_work}h / day</span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1 border-b border-zinc-100 dark:border-zinc-800/80">
                    <span className="text-zinc-600 dark:text-zinc-400">Hidden Tracked Work (H_tracked)</span>
                    <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">+{bottleneckAssigneeWl.hidden_work}h</span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1 border-b border-zinc-100 dark:border-zinc-800/80">
                    <span className="text-zinc-600 dark:text-zinc-400">Meeting Load (M_meetings)</span>
                    <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-300">-{bottleneckAssigneeWl.meetings}h</span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1 border-b border-zinc-100 dark:border-zinc-800/80">
                    <span className="text-zinc-600 dark:text-zinc-400">Usable Daily Capacity</span>
                    <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">{bottleneckAssigneeWl.available_capacity}h</span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1">
                    <span className="text-zinc-600 dark:text-zinc-400">Fragmentation Multiplier</span>
                    <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">{bottleneckAssigneeWl.fragmentation_factor}x ({bottleneckAssigneeWl.context_switches_count} switches)</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-zinc-400 mt-4">No workload telemetry logged for this assignee.</p>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex justify-between items-center text-xs">
              <span className="text-zinc-500 font-mono">Calculated Score (W_total):</span>
              <span className="font-mono text-base font-bold text-rose-600 dark:text-rose-400">
                {bottleneckAssigneeWl ? `${Math.round(bottleneckAssigneeWl.total_workload * 100)}%` : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Clean state when no bottlenecks exist */
        <div className="p-5 rounded-xl border border-emerald-300/80 dark:border-emerald-900/40 bg-emerald-50/20 dark:bg-emerald-950/10 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                No Critical Bottlenecks Detected
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Workload is distributed evenly and no blocking dependencies are currently strained.
              </p>
            </div>
          </div>
          <HealthBadge health="HEALTHY" />
        </div>
      )}

      {/* Recommended Action Card */}
      {topRecommendation && (
        <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1 max-w-3xl">
            <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider font-mono">
              <Sparkles className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />
              <span>Recommended Action (Generated Dynamically)</span>
            </div>
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Move &ldquo;{topRecommendation.task_title}&rdquo; from {topRecommendation.current_assignee_name} to {topRecommendation.target_assignee_name}
            </h4>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {topRecommendation.reason}
            </p>
          </div>

          <Link
            href={`/simulation?task_id=${topRecommendation.task_id}&target_id=${topRecommendation.target_assignee_id}`}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 text-xs font-medium shadow-xs transition-all flex-shrink-0"
          >
            <span>Simulate Solution</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Team Workload Breakdown List */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-zinc-400" />
              <span>Team Workload Distribution</span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Assigned work vs hidden work across team members
            </p>
          </div>
          <Link
            href="/workload"
            className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:underline flex items-center gap-1"
          >
            <span>View Full Breakdown</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {workloads.length === 0 ? (
          <p className="text-xs text-zinc-400 py-6 text-center">No team members assigned to this project.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {workloads.map((m) => (
              <div
                key={m.user_id}
                className="p-3.5 rounded-lg border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      {m.user_name}
                    </h4>
                    <span className="text-[11px] text-zinc-400">
                      {m.role}
                    </span>
                  </div>
                  <WorkloadBadge status={m.status} percentage={Math.round(m.total_workload * 100)} />
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden flex">
                    <div
                      className="bg-zinc-800 dark:bg-zinc-200 h-full"
                      style={{ width: `${Math.min((m.assigned_work / (m.daily_capacity || 8)) * 100, 100)}%` }}
                      title={`Assigned: ${m.assigned_work}h`}
                    />
                    <div
                      className="bg-amber-500 h-full"
                      style={{ width: `${Math.min((m.hidden_work / (m.daily_capacity || 8)) * 100, 100)}%` }}
                      title={`Hidden: ${m.hidden_work}h`}
                    />
                  </div>
                </div>

                {/* Stat row */}
                <div className="mt-2.5 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                  <span>Assigned: <strong className="text-zinc-800 dark:text-zinc-200 font-mono">{m.assigned_work}h</strong></span>
                  <span>Hidden: <strong className="text-amber-600 dark:text-amber-400 font-mono">+{m.hidden_work}h</strong></span>
                  <span>Cap: <strong className="text-zinc-800 dark:text-zinc-200 font-mono">{m.available_capacity}h</strong></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
