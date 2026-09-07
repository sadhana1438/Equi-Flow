'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useProject } from '@/context/ProjectContext';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import LogWorkModal from '@/components/common/LogWorkModal';
import JoinProjectModal from '@/components/common/JoinProjectModal';
import AuthModal from '@/components/common/AuthModal';
import {
  Menu,
  Sun,
  Moon,
  FolderKanban,
  Check,
  ChevronDown,
  Copy,
  Plus,
  LogIn,
  LogOut,
  KeyRound,
  Compass,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useSidebar } from '@/context/SidebarContext';

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

export default function Header({ onOpenMobileMenu }: HeaderProps) {
  const { projects, selectedProjectId, setSelectedProjectId } = useProject();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { collapsed, toggleSidebar } = useSidebar();

  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [logWorkOpen, setLogWorkOpen] = useState(false);
  const [joinProjectOpen, setJoinProjectOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const activeProject = projects.find(p => p.id === selectedProjectId);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <>
      <header className="sticky top-0 z-20 h-14 border-b border-zinc-200 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between transition-colors">
        {/* Left: Mobile hamburger + Desktop Sidebar Toggle + Project Selector + Project Join Code */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile hamburger menu */}
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden p-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* Desktop Sidebar Toggle Button */}
          <button
            onClick={toggleSidebar}
            className="hidden md:flex p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors"
            title={collapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
            aria-label="Toggle sidebar collapse"
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>

          {/* Project Selector Dropdown */}
          <div className="relative">

            <button
              onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-xs"
            >
              <FolderKanban className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
              <span className="max-w-[130px] sm:max-w-[180px] truncate">
                {activeProject ? activeProject.name : 'All Projects'}
              </span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>

            {projectDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setProjectDropdownOpen(false)}
                />
                <div className="absolute left-0 mt-2 w-64 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl z-40 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 border-b border-zinc-100 dark:border-zinc-800 tracking-wider font-mono">
                    PROJECT CONTEXT
                  </div>
                  <button
                    onClick={() => {
                      setSelectedProjectId(null);
                      setProjectDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${
                      selectedProjectId === null
                        ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                    }`}
                  >
                    <span>All Projects (Overview)</span>
                    {selectedProjectId === null && <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />}
                  </button>
                  {projects.map((proj) => (
                    <button
                      key={proj.id}
                      onClick={() => {
                        setSelectedProjectId(proj.id);
                        setProjectDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors truncate ${
                        selectedProjectId === proj.id
                          ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold'
                          : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                      }`}
                    >
                      <span className="truncate">{proj.name}</span>
                      {selectedProjectId === proj.id && <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Shareable Project Join Code Badge */}
          {activeProject?.join_code && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs">
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium uppercase font-mono">Join Code:</span>
              <span className="font-mono font-bold tracking-wider">{activeProject.join_code}</span>
              <button
                onClick={() => handleCopyCode(activeProject.join_code)}
                className="p-0.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                title="Copy join code for team members"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          )}
        </div>

        {/* Right: Team Actions, Log Work, Auth & Theme */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Quick "Log Work" Button */}
          <button
            onClick={() => {
              if (!user) setAuthOpen(true);
              else setLogWorkOpen(true);
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 text-xs font-medium shadow-xs transition-all"
            title="Log work events: PR reviews, support, meetings"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Work</span>
          </button>

          {/* "Join Project" Button */}
          <button
            onClick={() => {
              if (!user) setAuthOpen(true);
              else setJoinProjectOpen(true);
            }}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition-all shadow-xs"
            title="Enter a project code to join a team"
          >
            <KeyRound className="w-3 h-3 text-zinc-500" />
            <span>Join Project</span>
          </button>

          {/* User Profile / Auth State */}
          {user ? (
            <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-zinc-200 dark:border-zinc-800">
              <div className="flex flex-col text-right hidden sm:flex">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
                  {user.name}
                </span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-tight">
                  {user.role}
                </span>
              </div>
              <button
                onClick={logout}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAuthOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium transition-all shadow-xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all shadow-xs"
            aria-label="Toggle theme"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          >
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 text-zinc-200" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-zinc-700" />
            )}
          </button>
        </div>
      </header>

      {/* Modals */}
      <LogWorkModal
        isOpen={logWorkOpen}
        onClose={() => setLogWorkOpen(false)}
      />

      <JoinProjectModal
        isOpen={joinProjectOpen}
        onClose={() => setJoinProjectOpen(false)}
      />

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
      />
    </>
  );
}
