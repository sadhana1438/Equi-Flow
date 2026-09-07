from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

# --- Projects ---
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    target_end_date: Optional[datetime] = None

class ProjectCreate(ProjectBase):
    creator_id: Optional[str] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    target_end_date: Optional[datetime] = None

class ProjectResponse(ProjectBase):
    id: str
    join_code: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Auth & Join DTOs ---
class SignUpRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str = "Engineer"
    is_leader: bool = False
    daily_capacity: float = 8.0
    join_code: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class JoinProjectRequest(BaseModel):
    join_code: str
    user_id: str

# --- Users ---
class UserBase(BaseModel):
    name: str
    role: str = "Engineer"
    daily_capacity: float = Field(default=8.0, ge=0.5, le=24.0)

class UserCreate(UserBase):
    email: Optional[str] = None
    project_id: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    daily_capacity: Optional[float] = None

class UserSkillInline(BaseModel):
    skill_id: str
    skill_name: str
    proficiency: str  # EXPERT, STANDARD, NOVICE
    source: str       # MANUAL, INFERRED
    confidence: float

class UserResponse(UserBase):
    id: str
    email: Optional[str] = None
    is_leader: bool = False
    created_at: datetime
    updated_at: datetime
    skills: List[UserSkillInline] = []

    class Config:
        from_attributes = True

# --- Skills ---
class SkillBase(BaseModel):
    name: str
    category: Optional[str] = "Engineering"

class SkillCreate(SkillBase):
    pass

class SkillResponse(SkillBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

class UserSkillCreate(BaseModel):
    user_id: str
    skill_id: str
    proficiency: str = "STANDARD"  # EXPERT, STANDARD, NOVICE
    source: str = "MANUAL"         # MANUAL, INFERRED
    confidence: float = 1.0

class UserSkillResponse(BaseModel):
    id: str
    user_id: str
    skill_id: str
    skill_name: str
    proficiency: str
    source: str
    confidence: float
    created_at: datetime

# --- Tasks ---
class TaskBase(BaseModel):
    id: Optional[str] = None
    title: str
    description: Optional[str] = None
    project_id: str
    assignee_id: Optional[str] = None
    estimated_hours: Optional[float] = 4.0
    remaining_hours: Optional[float] = 4.0
    status: str = "TODO"          # TODO, IN_PROGRESS, IN_REVIEW, DONE
    priority: str = "MEDIUM"      # LOW, MEDIUM, HIGH, CRITICAL
    complexity: str = "MEDIUM"    # LOW, MEDIUM, HIGH
    due_date: Optional[datetime] = None
    required_skill_id: Optional[str] = None

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    project_id: Optional[str] = None
    assignee_id: Optional[str] = None
    estimated_hours: Optional[float] = None
    remaining_hours: Optional[float] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    complexity: Optional[str] = None
    due_date: Optional[datetime] = None
    required_skill_id: Optional[str] = None

class TaskResponse(TaskBase):
    id: str
    assignee_name: Optional[str] = None
    project_name: Optional[str] = None
    required_skill_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Dependencies ---
class DependencyCreate(BaseModel):
    blocking_task_id: str
    dependent_task_id: str
    dependency_type: str = "FINISH_TO_START"
    confidence: str = "EXPLICIT"  # EXPLICIT, INFERRED

class DependencyResponse(BaseModel):
    id: str
    blocking_task_id: str
    dependent_task_id: str
    dependency_type: str
    confidence: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- Work Events ---
class WorkEventCreate(BaseModel):
    user_id: str
    project_id: Optional[str] = None
    event_type: str  # PR_REVIEW, SUPPORT, COMMENTS, MEETINGS, ARCHITECTURE, REWORK, INTERRUPTIONS
    estimated_hidden_hours: float = 0.0
    context_channel: Optional[str] = None
    event_timestamp: Optional[datetime] = None
    metadata_json: Optional[str] = None

class WorkEventResponse(BaseModel):
    id: str
    user_id: str
    user_name: Optional[str] = None
    project_id: Optional[str] = None
    event_type: str
    estimated_hidden_hours: float
    context_channel: Optional[str] = None
    event_timestamp: datetime
    metadata_json: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Workload Intelligence DTOs ---
class MemberWorkload(BaseModel):
    user_id: str
    user_name: str
    role: str
    daily_capacity: float
    assigned_work: float         # T_assigned
    hidden_work: float           # H_tracked
    meetings: float              # M_meetings
    available_capacity: float    # max(C - M, 0.5)
    no_task_capacity: bool       # True if C - M < 0.5
    fragmentation_factor: float  # F_fragmentation
    total_workload: float        # W_total
    status: str                  # HEALTHY, NEAR_CAPACITY, OVERLOADED
    active_tasks_count: int
    pr_review_hours: float
    support_hours: float
    rework_hours: float
    collaboration_hours: float
    context_switches_count: int

class ProjectIntelligenceSummary(BaseModel):
    project_id: str
    project_name: str
    health: str                  # HEALTHY, ON_TRACK, WARNING, AT_RISK, CRITICAL
    overall_workload: float      # average W_total across project assignees
    total_hidden_work: float     # sum of hidden hours
    bottleneck_count: int
    delay_risk: float            # 0 to 100 percentage
    completion_percentage: float
    active_members_count: int
    open_tasks_count: int
    completed_tasks_count: int

# --- Bottlenecks ---
class BottleneckItem(BaseModel):
    task_id: str
    task_title: str
    assignee_id: Optional[str] = None
    assignee_name: Optional[str] = None
    severity_score: float
    workload_percentage: float
    delay_risk_percentage: float
    blocking_tasks_count: int
    downstream_task_ids: List[str]
    reasons: List[str]
    recommended_action: Optional[str] = None

# --- Dependency Graph ---
class GraphNode(BaseModel):
    id: str
    title: str
    status: str
    priority: str
    assignee_name: Optional[str] = None
    remaining_hours: float
    is_bottleneck: bool = False
    downstream_count: int = 0

class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    confidence: str  # EXPLICIT, INFERRED
    dependency_type: str

class DependencyGraphData(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]

# --- Recommendations ---
class RecommendationItem(BaseModel):
    id: str
    type: str  # REASSIGN, SPLIT, RESCHEDULE
    task_id: str
    task_title: str
    current_assignee_id: str
    current_assignee_name: str
    target_assignee_id: str
    target_assignee_name: str
    target_skill_match: str  # EXPERT, STANDARD, NOVICE, MISMATCH
    skill_multiplier: float
    estimated_workload_reduction: float
    reason: str
    confidence: str = "HIGH"

# --- Simulation ---
class SimulationRequest(BaseModel):
    task_id: str
    target_assignee_id: str

class SimulationStateSnapshot(BaseModel):
    workload: float
    capacity: float
    is_bottleneck: bool
    delay_risk: float
    project_health: str

class SimulationResult(BaseModel):
    task_id: str
    task_title: str
    current_assignee_id: str
    current_assignee_name: str
    target_assignee_id: str
    target_assignee_name: str
    skill_level: str
    skill_multiplier: float
    handoff_penalty_hours: float
    original_remaining_hours: float
    simulated_remaining_hours: float
    
    # Before vs Proposed vs After
    before_source_workload: float
    after_source_workload: float
    before_target_workload: float
    after_target_workload: float
    before_project_health: str
    after_project_health: str
    before_delay_risk: float
    after_delay_risk: float
    before_bottleneck_count: int
    after_bottleneck_count: int
    downstream_impact_resolved: int
    explanation: str

# --- Settings ---
class SettingsUpdate(BaseModel):
    healthy_threshold: Optional[float] = None
    near_capacity_threshold: Optional[float] = None
    default_capacity: Optional[float] = None
    raw_retention_days: Optional[int] = None
    theme: Optional[str] = None

class SettingsResponse(BaseModel):
    healthy_threshold: float
    near_capacity_threshold: float
    default_capacity: float
    raw_retention_days: int
    theme: str
