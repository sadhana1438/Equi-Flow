'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@/context/SidebarContext';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Activity,
  AlertTriangle,
  GitFork,
  Sparkles,
  BarChart3,
  Users,
  Radio,
  Bell,
  Settings,
  X,
  Layers,
  Home,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'WORKSPACE',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Projects', href: '/projects', icon: FolderKanban },
      { name: 'Tasks & Sprints', href: '/tasks', icon: CheckSquare },
    ],
  },
  {
    title: 'INTELLIGENCE',
    items: [
      { name: 'Workload & Capacity', href: '/workload', icon: Activity },
      { name: 'Bottlenecks', href: '/bottlenecks', icon: AlertTriangle },
      { name: 'Dependency Graph', href: '/graph', icon: GitFork },
      { name: 'What-If Simulation', href: '/simulation', icon: Sparkles },
      { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'ORGANIZATION',
    items: [
      { name: 'Team Members', href: '/team', icon: Users },
    ],
  },
  {
    title: 'CONFIGURATION',
    items: [
      { name: 'Integrations', href: '/integrations', icon: Radio },
      { name: 'Notifications', href: '/notifications', icon: Bell },
      { name: 'Settings', href: '/settings', icon: Settings },
    ],
  },
];

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { collapsed, toggleSidebar } = useSidebar();

  // Desktop sidebar content
  const renderSidebarContent = (isMobileDrawer = false) => {
    const isCollapsed = !isMobileDrawer && collapsed;

    return (
      <div
        className={`flex flex-col h-full bg-zinc-50 dark:bg-[#0c0c0e] border-r border-zinc-200 dark:border-zinc-800/90 text-zinc-600 dark:text-zinc-400 select-none transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Brand Header */}
        <div
          className={`flex items-center border-b border-zinc-200 dark:border-zinc-800/80 transition-all duration-300 ${
            isCollapsed ? 'justify-center px-2 py-4' : 'justify-between px-4 py-3.5'
          }`}
        >
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 group min-w-0"
            title="EquiFlow Dashboard"
          >
            <div className="w-8 h-8 rounded-xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-950 font-bold shadow-xs transition-transform group-hover:scale-105 shrink-0">
              <Layers className="w-4 h-4" />
            </div>

            {!isCollapsed && (
              <div className="flex flex-col truncate animate-in fade-in duration-200">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-zinc-900 dark:text-zinc-50 tracking-tight leading-none">
                    EquiFlow
                  </span>
                  <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-200/60 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 font-semibold">
                    CORE
                  </span>
                </div>
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 font-medium truncate">
                  Workload Intelligence
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Toggle Button */}
          {!isMobileDrawer && (
            <button
              onClick={toggleSidebar}
              className={`hidden md:flex p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/70 dark:hover:bg-zinc-800/70 transition-colors ${
                isCollapsed ? 'mt-2' : ''
              }`}
              title={isCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Mobile Close Button */}
          {isMobileDrawer && onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-2.5 py-3.5 space-y-4 custom-scrollbar">
          {navSections.map((sec, idx) => (
            <div key={sec.title} className="space-y-1">
              {!isCollapsed ? (
                <p className="px-2.5 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 tracking-wider font-mono">
                  {sec.title}
                </p>
              ) : idx > 0 ? (
                <div className="h-px bg-zinc-200/80 dark:bg-zinc-800/80 my-2 mx-1" />
              ) : null}

              <div className="space-y-0.5">
                {sec.items.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <div key={item.href} className="relative group">
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={`flex items-center rounded-xl text-xs font-medium transition-all ${
                          isCollapsed
                            ? 'justify-center p-2.5'
                            : 'justify-between px-3 py-2'
                        } ${
                          isActive
                            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-semibold shadow-xs'
                            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60'
                        }`}
                        title={isCollapsed ? item.name : undefined}
                      >
                        <div
                          className={`flex items-center ${
                            isCollapsed ? 'justify-center' : 'gap-2.5'
                          }`}
                        >
                          <Icon
                            className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${
                              isActive
                                ? 'text-white dark:text-zinc-950'
                                : 'text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300'
                            }`}
                          />
                          {!isCollapsed && <span className="truncate">{item.name}</span>}
                        </div>
                      </Link>

                      {/* Floating Tooltip in Collapsed Mode */}
                      {isCollapsed && (
                        <div className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 hidden md:group-hover:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950 text-xs font-semibold shadow-xl whitespace-nowrap animate-in fade-in zoom-in-95 duration-150">
                          <span>{item.name}</span>
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-normal">
                            ({sec.title.toLowerCase()})
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Back to Public Landing Page Link */}
          <div className="pt-2 border-t border-zinc-200/80 dark:border-zinc-800/80">
            <div className="relative group">
              <Link
                href="/"
                onClick={onClose}
                className={`flex items-center rounded-xl text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 transition-colors ${
                  isCollapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2'
                }`}
              >
                <Home className="w-4 h-4 text-zinc-400 shrink-0" />
                {!isCollapsed && <span className="truncate">Public Landing Page</span>}
              </Link>

              {isCollapsed && (
                <div className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 hidden md:group-hover:flex items-center px-2.5 py-1.5 rounded-lg bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950 text-xs font-semibold shadow-xl whitespace-nowrap animate-in fade-in zoom-in-95 duration-150">
                  <span>Public Landing Page</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Status Box */}
        <div
          className={`border-t border-zinc-200 dark:border-zinc-800/80 transition-all duration-300 ${
            isCollapsed ? 'p-2 flex justify-center' : 'p-3'
          }`}
        >
          {isCollapsed ? (
            <div className="relative group">
              <div className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center cursor-default shadow-xs">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
              </div>

              <div className="pointer-events-none absolute left-full ml-3 bottom-0 z-50 hidden md:group-hover:flex flex-col px-2.5 py-1.5 rounded-lg bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950 text-xs font-semibold shadow-xl whitespace-nowrap animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Engine Live</span>
                </div>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono font-normal">
                  SQLite / PostgreSQL
                </span>
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                  Engine Live
                </span>
              </div>
              <span className="text-[10px] font-mono text-zinc-400 font-medium">PostgreSQL</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:block fixed inset-y-0 left-0 z-30 transition-all duration-300">
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-zinc-50 dark:bg-[#0c0c0e] shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {renderSidebarContent(true)}
          </div>
        </div>
      )}
    </>
  );
}
