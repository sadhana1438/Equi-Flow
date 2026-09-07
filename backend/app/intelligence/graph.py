from typing import List, Dict, Set, Optional, Tuple
import networkx as nx
from app.models.entities import Task, TaskDependency

def build_dependency_digraph(tasks: List[Task], dependencies: List[TaskDependency]) -> nx.DiGraph:
    """
    Builds a NetworkX DiGraph where:
    Edge (u, v) means u blocks v (v depends on u).
    """
    G = nx.DiGraph()

    for task in tasks:
        rem_hours = task.remaining_hours if task.remaining_hours is not None else (task.estimated_hours or 4.0)
        G.add_node(
            task.id,
            title=task.title,
            status=task.status,
            priority=task.priority,
            assignee_id=task.assignee_id,
            remaining_hours=rem_hours,
            due_date=task.due_date
        )

    task_id_set = {t.id for t in tasks}

    for dep in dependencies:
        if dep.blocking_task_id in task_id_set and dep.dependent_task_id in task_id_set:
            G.add_edge(
                dep.blocking_task_id,
                dep.dependent_task_id,
                confidence=dep.confidence,
                dependency_type=dep.dependency_type
            )

    return G

def get_downstream_impact(G: nx.DiGraph, task_id: str) -> Tuple[int, List[str]]:
    """
    Returns total count and list of all downstream tasks reachable from task_id.
    """
    if not G.has_node(task_id):
        return 0, []

    descendants = nx.descendants(G, task_id)
    return len(descendants), list(descendants)

def get_critical_path_tasks(G: nx.DiGraph) -> Set[str]:
    """
    Finds nodes lying on the longest weighted path (by remaining_hours) if G is a DAG.
    """
    if not nx.is_directed_acyclic_graph(G):
        return set()

    # Assign weight to nodes for path calculation
    weighted_G = nx.DiGraph()
    for u, v, data in G.edges(data=True):
        weight = G.nodes[v].get("remaining_hours", 4.0)
        weighted_G.add_edge(u, v, weight=weight)

    if weighted_G.number_of_edges() == 0:
        return set()

    try:
        critical_path = nx.dag_longest_path(weighted_G, weight="weight")
        return set(critical_path)
    except Exception:
        return set()
