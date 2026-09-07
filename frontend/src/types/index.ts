export interface Project {
  id: string;
  name: string;
  description?: string | null;
  join_code: string;
  start_date?: string | null;
  target_end_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthSession {
  token: string;
  user: User;
  active_project?: Project | null;
}

export interface UserSkillInline {
  skill_id: string;
  skill_name: string;
  proficiency: 'EXPERT' | 'STANDARD' | 'NOVICE';
  source: 'MANUAL' | 'INFERRED';
  confidence: number;
}

export interface User {
  id: string;
  name: string;
  email?: string | null;
  is_leader?: boolean;
  role: string;
  daily_capacity: number;
  created_at: string;
  updated_at: string;
  skills: UserSkillInline[];
}

export interface Skill {
  id: string;
  name: string;
  category?: string;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  project_id: string;
  assignee_id?: string | null;
  estimated_hours?: number;
  remaining_hours: number;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  complexity: 'LOW' | 'MEDIUM' | 'HIGH';
  due_date?: string | null;
  required_skill_id?: string | null;
  assignee_name?: string | null;
  project_name?: string | null;
  required_skill_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskDependency {
  id: string;
  blocking_task_id: string;
  dependent_task_id: string;
  dependency_type: string;
  confidence: 'EXPLICIT' | 'INFERRED';
  created_at: string;
}

export interface WorkEvent {
  id: string;
  user_id: string;
  user_name?: string | null;
  project_id?: string | null;
  event_type: string;
  estimated_hidden_hours: number;
  context_channel?: string | null;
  event_timestamp: string;
  metadata_json?: string | null;
  created_at: string;
}

export interface MemberWorkload {
  user_id: string;
  user_name: string;
  role: string;
  daily_capacity: number;
  assigned_work: number;
  hidden_work: number;
  meetings: number;
  available_capacity: number;
  no_task_capacity: boolean;
  fragmentation_factor: number;
  total_workload: number;
  status: 'HEALTHY' | 'NEAR_CAPACITY' | 'OVERLOADED';
  active_tasks_count: number;
  pr_review_hours: number;
  support_hours: number;
  rework_hours: number;
  collaboration_hours: number;
  context_switches_count: number;
}

export interface BottleneckItem {
  task_id: string;
  task_title: string;
  assignee_id?: string | null;
  assignee_name?: string | null;
  severity_score: number;
  workload_percentage: number;
  delay_risk_percentage: number;
  blocking_tasks_count: number;
  downstream_task_ids: string[];
  reasons: string[];
  recommended_action?: string | null;
}

export interface ProjectIntelligenceSummary {
  project_id: string;
  project_name: string;
  health: 'HEALTHY' | 'ON_TRACK' | 'WARNING' | 'AT_RISK' | 'CRITICAL';
  overall_workload: number;
  total_hidden_work: number;
  bottleneck_count: number;
  delay_risk: number;
  completion_percentage: number;
  active_members_count: number;
  open_tasks_count: number;
  completed_tasks_count: number;
}

export interface RecommendationItem {
  id: string;
  type: string;
  task_id: string;
  task_title: string;
  current_assignee_id: string;
  current_assignee_name: string;
  target_assignee_id: string;
  target_assignee_name: string;
  target_skill_match: string;
  skill_multiplier: number;
  estimated_workload_reduction: number;
  reason: string;
  confidence: string;
}

export interface SimulationResult {
  task_id: string;
  task_title: string;
  current_assignee_id: string;
  current_assignee_name: string;
  target_assignee_id: string;
  target_assignee_name: string;
  skill_level: string;
  skill_multiplier: number;
  handoff_penalty_hours: number;
  original_remaining_hours: number;
  simulated_remaining_hours: number;
  before_source_workload: number;
  after_source_workload: number;
  before_target_workload: number;
  after_target_workload: number;
  before_project_health: string;
  after_project_health: string;
  before_delay_risk: number;
  after_delay_risk: number;
  before_bottleneck_count: number;
  after_bottleneck_count: number;
  downstream_impact_resolved: number;
  explanation: string;
}

export interface GraphNode {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignee_name?: string | null;
  remaining_hours: number;
  is_bottleneck: boolean;
  downstream_count: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  confidence: 'EXPLICIT' | 'INFERRED';
  dependency_type: string;
}

export interface DependencyGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface SystemSettings {
  healthy_threshold: number;
  near_capacity_threshold: number;
  default_capacity: number;
  raw_retention_days: number;
  theme: string;
}

export interface IntegrationItem {
  id: string;
  name: string;
  category: string;
  status: 'Connected' | 'Not Connected' | 'Coming Soon';
  description: string;
  icon: string;
}

export interface NotificationItem {
  id: string;
  type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  timestamp: string;
  action_link?: string;
}

export interface AnalyticsData {
  has_sufficient_data: boolean;
  message: string;
  daily_trends: {
    date: string;
    hidden_hours: number;
    meeting_hours: number;
    pr_review_hours: number;
    support_hours: number;
    rework_hours: number;
  }[];
  category_distribution: {
    category: string;
    hours: number;
  }[];
}
