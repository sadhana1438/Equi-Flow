import {
  Project,
  User,
  Skill,
  Task,
  TaskDependency,
  WorkEvent,
  MemberWorkload,
  BottleneckItem,
  ProjectIntelligenceSummary,
  RecommendationItem,
  SimulationResult,
  DependencyGraphData,
  SystemSettings,
  IntegrationItem,
  NotificationItem,
  AnalyticsData,
} from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    let errorDetail = res.statusText;
    try {
      const err = await res.json();
      errorDetail = err.detail || err.message || JSON.stringify(err);
    } catch (_) {}
    throw new Error(errorDetail);
  }

  return res.json();
}

// --- Projects ---
export const api = {
  getProjects: (userId?: string) => {
    const qs = userId ? `?user_id=${userId}` : '';
    return fetchJson<Project[]>(`/projects${qs}`);
  },
  createProject: (data: Partial<Project>) =>
    fetchJson<Project>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id: string, data: Partial<Project>) =>
    fetchJson<Project>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProject: (id: string) =>
    fetchJson<{ message: string }>(`/projects/${id}`, { method: 'DELETE' }),
  getProjectSummary: (id: string) =>
    fetchJson<ProjectIntelligenceSummary>(`/projects/${id}/summary`),

  // --- Users / Team ---
  getUsers: (projectId?: string) => {
    const qs = projectId ? `?project_id=${projectId}` : '';
    return fetchJson<User[]>(`/users${qs}`);
  },
  createUser: (data: { name: string; role: string; daily_capacity: number; email?: string; project_id?: string }) =>
    fetchJson<User>('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: { name?: string; role?: string; daily_capacity?: number }) =>
    fetchJson<User>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: string) =>
    fetchJson<{ message: string }>(`/users/${id}`, { method: 'DELETE' }),
  addUserSkill: (userId: string, data: { skill_id: string; proficiency: string; source?: string; confidence?: number }) =>
    fetchJson(`/users/${userId}/skills`, { method: 'POST', body: JSON.stringify(data) }),
  removeUserSkill: (userId: string, skillId: string) =>
    fetchJson<{ message: string }>(`/users/${userId}/skills/${skillId}`, { method: 'DELETE' }),

  // --- Skills ---
  getSkills: () => fetchJson<Skill[]>('/skills'),
  createSkill: (data: { name: string; category?: string }) =>
    fetchJson<Skill>('/skills', { method: 'POST', body: JSON.stringify(data) }),
  deleteSkill: (id: string) =>
    fetchJson<{ message: string }>(`/skills/${id}`, { method: 'DELETE' }),

  // --- Tasks ---
  getTasks: (params?: { project_id?: string; assignee_id?: string; status?: string; priority?: string }) => {
    const qs = new URLSearchParams();
    if (params?.project_id) qs.append('project_id', params.project_id);
    if (params?.assignee_id) qs.append('assignee_id', params.assignee_id);
    if (params?.status) qs.append('status', params.status);
    if (params?.priority) qs.append('priority', params.priority);
    return fetchJson<Task[]>(`/tasks${qs.toString() ? `?${qs.toString()}` : ''}`);
  },
  createTask: (data: Partial<Task>) =>
    fetchJson<Task>('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id: string, data: Partial<Task>) =>
    fetchJson<Task>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTask: (id: string) =>
    fetchJson<{ message: string }>(`/tasks/${id}`, { method: 'DELETE' }),

  // --- Dependencies ---
  getDependencies: (taskId?: string) => {
    const qs = taskId ? `?task_id=${taskId}` : '';
    return fetchJson<TaskDependency[]>(`/dependencies${qs}`);
  },
  createDependency: (data: { blocking_task_id: string; dependent_task_id: string; dependency_type?: string; confidence?: string }) =>
    fetchJson<TaskDependency>('/dependencies', { method: 'POST', body: JSON.stringify(data) }),
  deleteDependency: (id: string) =>
    fetchJson<{ message: string }>(`/dependencies/${id}`, { method: 'DELETE' }),

  // --- Work Events ---
  getWorkEvents: (params?: { user_id?: string; project_id?: string }) => {
    const qs = new URLSearchParams();
    if (params?.user_id) qs.append('user_id', params.user_id);
    if (params?.project_id) qs.append('project_id', params.project_id);
    return fetchJson<WorkEvent[]>(`/work-events${qs.toString() ? `?${qs.toString()}` : ''}`);
  },
  createWorkEvent: (data: Partial<WorkEvent>) =>
    fetchJson<WorkEvent>('/work-events', { method: 'POST', body: JSON.stringify(data) }),
  deleteWorkEvent: (id: string) =>
    fetchJson<{ message: string }>(`/work-events/${id}`, { method: 'DELETE' }),

  // --- Intelligence Engine Endpoints ---
  getWorkload: (projectId?: string) => {
    const qs = projectId ? `?project_id=${projectId}` : '';
    return fetchJson<MemberWorkload[]>(`/intelligence/workload${qs}`);
  },
  getBottlenecks: (projectId?: string) => {
    const qs = projectId ? `?project_id=${projectId}` : '';
    return fetchJson<BottleneckItem[]>(`/intelligence/bottlenecks${qs}`);
  },
  getRisks: (projectId?: string) => {
    const qs = projectId ? `?project_id=${projectId}` : '';
    return fetchJson<{
      health: 'HEALTHY' | 'ON_TRACK' | 'WARNING' | 'AT_RISK' | 'CRITICAL';
      overall_workload: number;
      workload_risk: number;
      bottleneck_risk: number;
      dependency_risk: number;
      deadline_risk: number;
      delay_risk: number;
      completion_percentage: number;
      open_tasks_count: number;
      completed_tasks_count: number;
      total_tasks_count: number;
    }>(`/intelligence/risks${qs}`);
  },
  getRecommendations: (projectId?: string) => {
    const qs = projectId ? `?project_id=${projectId}` : '';
    return fetchJson<RecommendationItem[]>(`/intelligence/recommendations${qs}`);
  },
  getGraph: (projectId?: string) => {
    const qs = projectId ? `?project_id=${projectId}` : '';
    return fetchJson<DependencyGraphData>(`/intelligence/graph${qs}`);
  },

  // --- What-If Simulation Sandbox ---
  simulate: (data: { task_id: string; target_assignee_id: string }) =>
    fetchJson<SimulationResult>('/simulation/simulate', { method: 'POST', body: JSON.stringify(data) }),
  applySimulation: (data: { task_id: string; target_assignee_id: string }) =>
    fetchJson<{ success: boolean; message: string; task_id: string; new_assignee_id: string; new_assignee_name: string; new_remaining_hours: number }>(
      '/simulation/apply',
      { method: 'POST', body: JSON.stringify(data) }
    ),

  // --- Analytics ---
  getAnalytics: (projectId?: string) => {
    const qs = projectId ? `?project_id=${projectId}` : '';
    return fetchJson<AnalyticsData>(`/analytics${qs}`);
  },

  // --- Integrations ---
  getIntegrations: () => fetchJson<IntegrationItem[]>('/integrations'),
  toggleIntegration: (id: string) =>
    fetchJson<{ id: string; name: string; status: string }>(`/integrations/${id}/toggle`, { method: 'POST' }),

  // --- Notifications ---
  getNotifications: () => fetchJson<NotificationItem[]>('/notifications'),

  // --- Settings ---
  getSettings: () => fetchJson<SystemSettings>('/settings'),
  updateSettings: (data: Partial<SystemSettings>) =>
    fetchJson<SystemSettings>('/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // --- Authentication & Project Join ---
  signup: (data: {
    name: string;
    email: string;
    password: string;
    role?: string;
    is_leader?: boolean;
    daily_capacity?: number;
    join_code?: string;
  }) =>
    fetchJson<{ success: boolean; token: string; user: User; active_project?: Project | null }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    fetchJson<{ success: boolean; token: string; user: User; active_project?: Project | null }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  joinProject: (data: { join_code: string; user_id: string }) =>
    fetchJson<{ success: boolean; message: string; project: Project }>('/auth/join-project', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMe: (userId: string) =>
    fetchJson<{ user: User; projects: Project[] }>(`/auth/me/${userId}`),
};
