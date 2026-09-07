'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { ThemeProvider } from '@/context/ThemeContext';
import { ProjectProvider } from '@/context/ProjectContext';
import { AuthProvider } from '@/context/AuthContext';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const isLandingPage = pathname === '/';

  return (
    <ThemeProvider>
      <AuthProvider>
        <ProjectProvider>
          {isLandingPage ? (
            // Full-width Landing Page Canvas
            <div className="min-h-screen bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 transition-colors">
              {children}
            </div>
          ) : (
            // Internal Workspace Canvas with Sidebar + Header
            <div className="min-h-screen flex bg-zinc-100/60 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 transition-colors">
              {/* Sidebar */}
              <Sidebar
                isOpen={mobileMenuOpen}
                onClose={() => setMobileMenuOpen(false)}
              />

              {/* Main Layout Area */}
              <div className="flex-1 flex flex-col md:pl-64 min-w-0 transition-all">
                {/* Header */}
                <Header onOpenMobileMenu={() => setMobileMenuOpen(true)} />

                {/* Main Page Content */}
                <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
                  {children}
                </main>
              </div>
            </div>
          )}
        </ProjectProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
