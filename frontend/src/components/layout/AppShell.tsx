'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { ThemeProvider } from '@/context/ThemeContext';
import { ProjectProvider } from '@/context/ProjectContext';
import { AuthProvider } from '@/context/AuthContext';
import { SidebarProvider, useSidebar } from '@/context/SidebarContext';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

function WorkspaceLayout({
  children,
  onOpenMobileMenu,
}: {
  children: React.ReactNode;
  onOpenMobileMenu: () => void;
}) {
  const { collapsed } = useSidebar();

  return (
    <div className="min-h-screen flex bg-zinc-100/60 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 transition-colors">
      {/* Sidebar */}
      <Sidebar isOpen={false} />

      {/* Main Layout Area - Smoothly shifts padding based on collapsed state */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-[padding] duration-300 ease-in-out ${
          collapsed ? 'md:pl-20' : 'md:pl-64'
        }`}
      >
        {/* Header */}
        <Header onOpenMobileMenu={onOpenMobileMenu} />

        {/* Main Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-in fade-in duration-200">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const isLandingPage = pathname === '/';

  return (
    <ThemeProvider>
      <AuthProvider>
        <ProjectProvider>
          <SidebarProvider>
            {isLandingPage ? (
              // Full-width Landing Page Canvas
              <div className="min-h-screen bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 transition-colors">
                {children}
              </div>
            ) : (
              <>
                <WorkspaceLayout onOpenMobileMenu={() => setMobileMenuOpen(true)}>
                  {children}
                </WorkspaceLayout>

                {/* Mobile Drawer */}
                <Sidebar
                  isOpen={mobileMenuOpen}
                  onClose={() => setMobileMenuOpen(false)}
                />
              </>
            )}
          </SidebarProvider>
        </ProjectProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
