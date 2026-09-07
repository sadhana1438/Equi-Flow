'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Project } from '@/types';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface ProjectContextType {
  projects: Project[];
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  selectedProject: Project | null;
  refreshProjects: () => Promise<void>;
  loading: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshProjects = useCallback(async () => {
    try {
      setLoading(true);
      if (!user) {
        // If not authenticated, do not expose any user's private projects
        setProjects([]);
        setSelectedProjectId(null);
        return;
      }

      // Query only projects where this authenticated user is an enrolled member or creator
      const data = await api.getProjects(user.id);
      setProjects(data);

      if (data.length > 0) {
        setSelectedProjectId((prev) => {
          if (prev && data.some((p) => p.id === prev)) return prev;
          return data[0].id;
        });
      } else {
        setSelectedProjectId(null);
      }
    } catch (err: any) {
      setProjects([]);
      setSelectedProjectId(null);
      if (err?.message?.includes('credentials') || err?.message?.includes('401') || err?.message?.includes('Unauthorized')) {
        console.warn('Session expired or credentials invalid, project context cleared.');
      } else {
        console.warn('Failed to load user-scoped projects:', err?.message || err);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || null;

  return (
    <ProjectContext.Provider
      value={{
        projects,
        selectedProjectId,
        setSelectedProjectId,
        selectedProject,
        refreshProjects,
        loading,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
