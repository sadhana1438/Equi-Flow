'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';
import {
  Layers,
  ArrowRight,
  Activity,
  AlertTriangle,
  Sparkles,
  GitFork,
  Clock,
  Zap,
  ShieldCheck,
  Users,
  CheckCircle2,
  ChevronRight,
  Sliders,
  Sun,
  Moon,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();

  // Interactive Live Workload Calculator State
  const [assignedHours, setAssignedHours] = useState(4.5);
  const [hiddenHours, setHiddenHours] = useState(2.0);
  const [meetingHours, setMeetingHours] = useState(2.5);
  const [contextSwitches, setContextSwitches] = useState(4);
  const [dailyCapacity, setDailyCapacity] = useState(8.0);

  // Live calculation using EquiFlow's exact formulation
  const calculation = useMemo(() => {
    const usableCapacity = Math.max(dailyCapacity - meetingHours, 0.5);
    const excessSwitches = Math.max(contextSwitches - 2, 0);
    const fragmentationFactor = Math.min(1.0 + excessSwitches * 0.05, 1.5);
    const totalNumerator = assignedHours + hiddenHours;
    const baseRatio = totalNumerator / usableCapacity;
    const totalWorkload = baseRatio * fragmentationFactor;
    const percentage = Math.round(totalWorkload * 100);

    let status = 'HEALTHY';
    let statusColor = 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800';
    if (totalWorkload > 1.0) {
      status = 'OVERLOADED';
      statusColor = 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800';
    } else if (totalWorkload > 0.8) {
      status = 'NEAR CAPACITY';
      statusColor = 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800';
    }

    return {
      usableCapacity: usableCapacity.toFixed(1),
      fragmentationFactor: fragmentationFactor.toFixed(2),
      percentage,
      status,
      statusColor,
      totalWorkload,
    };
  }, [assignedHours, hiddenHours, meetingHours, contextSwitches, dailyCapacity]);

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 transition-colors">
      {/* Top Public Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-[#09090b]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-950 font-bold shadow-xs">
              <Layers className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-50">
                EquiFlow
              </span>
              <span className="hidden sm:inline text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400">
                v1.0
              </span>
            </div>
          </Link>

          {/* Center Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            <a href="#simulator" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              Live Simulator
            </a>
            <a href="#features" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              Platform Features
            </a>
            <a href="#workflow" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              Leader & Member Flow
            </a>
            <a href="#formulation" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              Mathematical Model
            </a>
          </nav>

          {/* Right Action & Theme Switcher */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-xs"
              aria-label="Toggle theme"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-zinc-200" />
              ) : (
                <Moon className="w-4 h-4 text-zinc-700" />
              )}
            </button>

            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 text-xs font-medium shadow-xs transition-all"
            >
              <span>Launch Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs font-mono font-medium mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Dynamic Engineering Workload Intelligence</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 max-w-4xl mx-auto leading-[1.12]">
          The workload platform that uncovers what Jira and Linear cannot see.
        </h1>

        <p className="mt-6 text-sm sm:text-base lg:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          Assigned tickets only tell half the story. EquiFlow mathematically models hidden code reviews, meeting load, context switching, and dependency bottlenecks to simulate balance before delivery slips.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-5 py-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 font-semibold text-sm shadow-xs transition-all"
          >
            <span>Open Command Center</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#simulator"
            className="flex items-center gap-2 px-5 py-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-850 font-semibold text-sm transition-all"
          >
            <Sliders className="w-4 h-4 text-zinc-500" />
            <span>Try Interactive Calculator</span>
          </a>
        </div>

        {/* Feature Pill Row */}
        <div className="mt-14 pt-8 border-t border-zinc-200/60 dark:border-zinc-800/60 grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
            <Clock className="w-4 h-4 text-zinc-500 mb-2" />
            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Hidden Work Tracking</h4>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">Logs PR reviews, meetings, and rework that drain real capacity.</p>
          </div>
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
            <GitFork className="w-4 h-4 text-zinc-500 mb-2" />
            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">DAG Dependency Trees</h4>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">NetworkX graph identifies single points of failure in delivery paths.</p>
          </div>
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
            <Sparkles className="w-4 h-4 text-zinc-500 mb-2" />
            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">What-If Simulation</h4>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">Simulate task reallocations in memory with skill and handoff penalties.</p>
          </div>
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
            <Users className="w-4 h-4 text-zinc-500 mb-2" />
            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Project Join Codes</h4>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">Leaders share 6-digit codes; members onboard in seconds.</p>
          </div>
        </div>
      </section>

      {/* Live Interactive Workload Calculator Widget */}
      <section id="simulator" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-[#121215] p-6 sm:p-10 shadow-xs">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              <Sliders className="w-4 h-4" />
              <span>Interactive Workload Simulator</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mt-2">
              Calculate developer strain in real time.
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1.5">
              Drag the parameters below to see how hidden tasks and context switching compound workload beyond nominal ticket estimates.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Interactive Controls */}
            <div className="lg:col-span-7 space-y-6">
              {/* Slider 1: Assigned Hours */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-zinc-700 dark:text-zinc-300">Assigned Task Work (T_assigned)</span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{assignedHours.toFixed(1)} hrs/day</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={assignedHours}
                  onChange={(e) => setAssignedHours(parseFloat(e.target.value))}
                  aria-label="Assigned Task Work in hours per day"
                  className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-zinc-100"
                />
                <p className="text-[11px] text-zinc-400">Hours needed daily across active sprint backlog items.</p>
              </div>

              {/* Slider 2: Hidden Hours */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-zinc-700 dark:text-zinc-300">Tracked Hidden Work (H_tracked)</span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">+{hiddenHours.toFixed(1)} hrs/day</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="6"
                  step="0.5"
                  value={hiddenHours}
                  onChange={(e) => setHiddenHours(parseFloat(e.target.value))}
                  aria-label="Tracked Hidden Work in hours per day"
                  className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <p className="text-[11px] text-zinc-400">Unscheduled PR reviews, urgent customer support, and rework.</p>
              </div>

              {/* Slider 3: Meeting Hours */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-zinc-700 dark:text-zinc-300">Meeting Overhead (M_meetings)</span>
                  <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">-{meetingHours.toFixed(1)} hrs/day</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="6"
                  step="0.5"
                  value={meetingHours}
                  onChange={(e) => setMeetingHours(parseFloat(e.target.value))}
                  aria-label="Meeting Overhead in hours per day"
                  className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-zinc-100"
                />
                <p className="text-[11px] text-zinc-400">Daily standups, syncs, and planning calls deducted from capacity.</p>
              </div>

              {/* Slider 4: Context Switches */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-zinc-700 dark:text-zinc-300">Context Switches / 4h Window</span>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{contextSwitches} switches ({calculation.fragmentationFactor}x)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={contextSwitches}
                  onChange={(e) => setContextSwitches(parseInt(e.target.value))}
                  aria-label="Context Switches per 4 hour window"
                  className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
                <p className="text-[11px] text-zinc-400">Switches across different repositories, slack threads, and domains.</p>
              </div>
            </div>

            {/* Right: Real-time Output Card */}
            <div className="lg:col-span-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-zinc-500 uppercase">Telemetry Output</span>
                <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold border ${calculation.statusColor}`}>
                  {calculation.status}
                </span>
              </div>

              <div>
                <span className="text-xs text-zinc-500">Calculated Workload Score (W_total)</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-4xl font-extrabold font-mono text-zinc-900 dark:text-zinc-50">
                    {calculation.percentage}%
                  </span>
                  <span className="text-xs text-zinc-400">of realistic daily limit</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    calculation.percentage > 100
                      ? 'bg-rose-500'
                      : calculation.percentage > 80
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(calculation.percentage, 100)}%` }}
                />
              </div>

              {/* Mathematical Metrics Grid */}
              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 space-y-2 text-xs">
                <div className="flex justify-between py-1">
                  <span className="text-zinc-500">Total Work Volume</span>
                  <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">{(assignedHours + hiddenHours).toFixed(1)}h</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-zinc-500">Usable Focus Window</span>
                  <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">{calculation.usableCapacity}h</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-zinc-500">Fragmentation Multiplier</span>
                  <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">{calculation.fragmentationFactor}x</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400">
                {calculation.percentage > 100 ? (
                  <p className="flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
                    <span><strong>High Overload Warning:</strong> Tasks assigned to this engineer are at high risk of delivery delays. EquiFlow recommends reallocating {((assignedHours + hiddenHours) - parseFloat(calculation.usableCapacity)).toFixed(1)}h of work.</span>
                  </p>
                ) : calculation.percentage > 80 ? (
                  <p className="flex items-start gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span><strong>Near Capacity:</strong> Member has minimal buffer for emergent interruptions or support escalations.</span>
                  </p>
                ) : (
                  <p className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span><strong>Balanced:</strong> Member has healthy focus capacity to absorb unforeseen blockers without risking sprint goals.</span>
                  </p>
                )}
              </div>

              <Link
                href="/dashboard"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 font-medium text-xs shadow-xs transition-all"
              >
                <span>Simulate in EquiFlow Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Features Section */}
      <section id="features" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-400">Core Engine Capabilities</h2>
          <p className="text-2xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mt-2">
            Engineered for real engineering teams.
          </p>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-2">
            No canned demos, no fake hardcoded rules. Everything runs on pure relational graph algorithms.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-850 flex items-center justify-center text-zinc-800 dark:text-zinc-200">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Invisible Workload Telemetry</h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Engineers log PR reviews, customer support, meetings, and rework in seconds. EquiFlow incorporates this telemetry into daily capacity curves automatically.
            </p>
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-850 text-[11px] font-mono text-zinc-400">
              $H_&#123;\text&#123;tracked&#125;&#125;$ integration
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-850 flex items-center justify-center text-zinc-800 dark:text-zinc-200">
              <GitFork className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">DAG Dependency Bottlenecks</h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Analyzes in-degree, out-degree, and reachable descendants across tasks. Identifies tasks that block critical paths before they stall entire project milestones.
            </p>
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-850 text-[11px] font-mono text-zinc-400">
              NetworkX Directed Graph
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-850 flex items-center justify-center text-zinc-800 dark:text-zinc-200">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">What-If Rebalancing Sandbox</h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Test moving tasks to alternate team members. EquiFlow dynamically models skill level multipliers (0.8x to 2.0x) and handoff ramp-up penalties before committing to production.
            </p>
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-850 text-[11px] font-mono text-zinc-400">
              Zero-DB Mutation Sandbox
            </div>
          </div>
        </div>
      </section>

      {/* Team Leader & Member Flow */}
      <section id="workflow" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full bg-zinc-50/60 dark:bg-[#0c0c0e] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 my-8">
        <div className="max-w-3xl mb-10">
          <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-400">Organizational Workflow</h2>
          <p className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mt-1">
            How leaders and team members collaborate.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Leader Side */}
          <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold flex items-center justify-center">1</span>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">For Team Leaders</h3>
            </div>
            <ul className="space-y-2.5 text-xs text-zinc-600 dark:text-zinc-400">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>Create projects and receive an instant 6-digit **Join Code** (e.g. <code>EQ-8492</code>).</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>Assign tasks with deadlines and manage DAG dependencies with cycle protection.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>Receive dynamic, severity-ranked bottleneck alerts with mathematically recommended fixes.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>Run What-If simulations to rebalance tickets before deadlines are compromised.</span>
              </li>
            </ul>
          </div>

          {/* Member Side */}
          <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold flex items-center justify-center">2</span>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">For Team Members</h3>
            </div>
            <ul className="space-y-2.5 text-xs text-zinc-600 dark:text-zinc-400">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>Enter the project Join Code during sign-up to be enrolled automatically.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>View personal assigned tasks, remaining hours, and skill proficiencies.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>Log unassigned work in 5 seconds (PR reviews, meeting blocks, rework).</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>Privacy preserved: Only aggregate workload metrics are computed.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Mathematical Transparency */}
      <section id="formulation" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#121215] p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-zinc-500 uppercase">Core Algorithmic Formulation</span>
            <span className="text-[11px] font-mono text-zinc-400">100% Deterministic</span>
          </div>
          <div className="p-4 rounded-lg bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 font-mono text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 overflow-x-auto">
            W_total = [ (T_assigned + H_tracked) / max(C_capacity - M_meetings, 0.5) ] * F_fragmentation
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            EquiFlow strictly computes scores from active database tables. There are no hard-coded thresholds, static mock percentages, or fake AI rules.
          </p>
        </div>
      </section>

      {/* Bottom Call to Action */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full text-center">
        <div className="p-8 sm:p-14 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-[#121215] space-y-6">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Ready to bring clarity to engineering delivery?
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto">
            Get started in seconds. Create your project, invite your team with a join code, and view live workload intelligence immediately.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-5 py-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 font-semibold text-xs shadow-xs transition-all"
            >
              <span>Enter EquiFlow Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 dark:text-zinc-400">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-950 font-bold text-[10px]">
            <Layers className="w-3 h-3" />
          </div>
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">EquiFlow</span>
          <span>&mdash; Engineering Workload & Decision Intelligence</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
            Dashboard
          </Link>
          <Link href="/projects" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
            Projects
          </Link>
          <Link href="/tasks" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
            Tasks
          </Link>
          <Link href="/simulation" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
            Simulation
          </Link>
        </div>
      </footer>
    </div>
  );
}
