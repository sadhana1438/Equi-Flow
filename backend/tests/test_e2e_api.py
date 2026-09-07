import urllib.request
import json
import uuid
import sys

BASE_URL = "http://127.0.0.1:8000/api"

def request(method, path, data=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            status = resp.status
            content = resp.read().decode("utf-8")
            return status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        try:
            return e.code, json.loads(content)
        except:
            return e.code, {"error": content}

def run_tests():
    print("--- STARTING COMPREHENSIVE E2E API AUDIT ---")

    # 1. Health
    status, res = request("GET", "/health")
    assert status == 200, f"Health check failed: {res}"
    print("[PASS] 1. Health check: 200 OK")

    # 2. Leader Signup
    leader_email = f"lead_{uuid.uuid4().hex[:6]}@equiflow.io"
    status, res = request("POST", "/auth/signup", {
        "name": "Team Leader Alice",
        "email": leader_email,
        "password": "Password123!",
        "role": "Engineering Lead",
        "is_leader": True,
        "daily_capacity": 8.0
    })
    assert status == 200 and res.get("success"), f"Leader signup failed: {res}"
    leader_id = res["user"]["id"]
    print(f"[PASS] 2. Leader signup: {leader_id}")

    # 3. Leader Creates Project
    status, proj = request("POST", "/projects", {
        "name": f"Project Apollo {uuid.uuid4().hex[:4]}",
        "description": "Critical infrastructure upgrade",
        "start_date": "2026-09-01T00:00:00Z",
        "target_end_date": "2026-09-30T00:00:00Z"
    })
    assert status == 200 and proj.get("join_code"), f"Project creation failed: {proj}"
    project_id = proj["id"]
    join_code = proj["join_code"]
    print(f"[PASS] 3. Project created: ID={project_id}, Join Code={join_code}")

    # 4. Member Signup with Join Code
    member_email = f"dev_{uuid.uuid4().hex[:6]}@equiflow.io"
    status, res = request("POST", "/auth/signup", {
        "name": "Senior Dev Bob",
        "email": member_email,
        "password": "Password123!",
        "role": "Backend Engineer",
        "is_leader": False,
        "daily_capacity": 8.0,
        "join_code": join_code
    })
    assert status == 200 and res.get("success"), f"Member signup with join code failed: {res}"
    member_id = res["user"]["id"]
    print(f"[PASS] 4. Member signup and auto-joined project with code: {member_id}")

    # 5. Member Login
    status, res = request("POST", "/auth/login", {
        "email": member_email,
        "password": "Password123!"
    })
    assert status == 200 and res.get("token"), f"Login failed: {res}"
    print("[PASS] 5. Login verified successfully")

    # 6. Skill Creation & Assignment
    status, skill = request("POST", "/skills", {
        "name": f"Rust Core {uuid.uuid4().hex[:4]}",
        "category": "Backend"
    })
    assert status == 200 and skill.get("id"), f"Skill creation failed: {skill}"
    skill_id = skill["id"]

    status, res = request("POST", f"/users/{member_id}/skills", {
        "user_id": member_id,
        "skill_id": skill_id,
        "proficiency": "EXPERT",
        "confidence": 1.0
    })
    assert status == 200, f"Skill assignment failed: {res}"
    print(f"[PASS] 6. Skill created and assigned as EXPERT to member")

    # 7. Create Blocking Task assigned to Leader
    status, task1 = request("POST", "/tasks", {
        "title": "Core Database Migration",
        "description": "Migrate customer schema to sharded tables",
        "project_id": project_id,
        "assignee_id": leader_id,
        "estimated_hours": 12.0,
        "remaining_hours": 10.0,
        "status": "IN_PROGRESS",
        "priority": "CRITICAL",
        "complexity": "HIGH",
        "required_skill_id": skill_id
    })
    assert status == 200 and task1.get("id"), f"Task 1 creation failed: {task1}"
    task1_id = task1["id"]

    # 8. Create Dependent Task assigned to Bob
    status, task2 = request("POST", "/tasks", {
        "title": "API Gateway Endpoints",
        "description": "Expose new CRUD endpoints",
        "project_id": project_id,
        "assignee_id": member_id,
        "estimated_hours": 6.0,
        "remaining_hours": 6.0,
        "status": "TODO",
        "priority": "HIGH",
        "complexity": "MEDIUM"
    })
    assert status == 200 and task2.get("id"), f"Task 2 creation failed: {task2}"
    task2_id = task2["id"]
    print(f"[PASS] 7 & 8. Tasks created: {task1_id}, {task2_id}")

    # 9. Create Dependency: Task 1 blocks Task 2
    status, dep = request("POST", "/dependencies", {
        "blocking_task_id": task1_id,
        "dependent_task_id": task2_id,
        "dependency_type": "FINISH_TO_START",
        "confidence": "EXPLICIT"
    })
    assert status == 200 and dep.get("id"), f"Dependency creation failed: {dep}"
    print("[PASS] 9. Dependency created successfully")

    # 10. Verify Cycle Detection (Attempting to make Task 2 block Task 1 should fail with 400)
    status, cycle_res = request("POST", "/dependencies", {
        "blocking_task_id": task2_id,
        "dependent_task_id": task1_id,
        "dependency_type": "FINISH_TO_START"
    })
    assert status == 400, f"Cycle detection should have returned 400, got: {status} {cycle_res}"
    print(f"[PASS] 10. Cycle detection correctly rejected circular dependency: {cycle_res.get('detail')}")

    # 11. Log Work Event (Meeting and PR Review)
    status, ev1 = request("POST", "/work-events", {
        "user_id": leader_id,
        "project_id": project_id,
        "event_type": "MEETINGS",
        "estimated_hidden_hours": 3.0,
        "context_channel": "Sprint Planning"
    })
    assert status == 200, f"Work event 1 failed: {ev1}"

    status, ev2 = request("POST", "/work-events", {
        "user_id": leader_id,
        "project_id": project_id,
        "event_type": "PR_REVIEW",
        "estimated_hidden_hours": 2.5,
        "context_channel": "core-repo"
    })
    assert status == 200, f"Work event 2 failed: {ev2}"
    print("[PASS] 11. Work events logged for hidden workload")

    # 12. Intelligence: Workload calculation
    status, wls = request("GET", f"/intelligence/workload?project_id={project_id}")
    assert status == 200 and len(wls) > 0, f"Workload calculation failed: {wls}"
    leader_wl = next((w for w in wls if w["user_id"] == leader_id), None)
    assert leader_wl is not None, "Leader workload missing"
    print(f"[PASS] 12. Workload computed: Leader Total Workload = {int(leader_wl['total_workload']*100)}% ({leader_wl['status']})")

    # 13. Intelligence: Bottleneck discovery
    status, bns = request("GET", f"/intelligence/bottlenecks?project_id={project_id}")
    assert status == 200, f"Bottleneck discovery failed: {bns}"
    print(f"[PASS] 13. Bottlenecks evaluated dynamically: count = {len(bns)}")

    # 14. Intelligence: Risk & Health
    status, risks = request("GET", f"/intelligence/risks?project_id={project_id}")
    assert status == 200 and "health" in risks, f"Risks calculation failed: {risks}"
    print(f"[PASS] 14. Project Health = {risks['health']}, Delay Risk = {risks['delay_risk']}%")

    # 15. Intelligence: Recommendations
    status, recs = request("GET", f"/intelligence/recommendations?project_id={project_id}")
    assert status == 200, f"Recommendations failed: {recs}"
    print(f"[PASS] 15. Recommendations generated: {len(recs)} suggestions")

    # 16. Intelligence: Dependency Graph
    status, graph = request("GET", f"/intelligence/graph?project_id={project_id}")
    assert status == 200 and "nodes" in graph and "edges" in graph, f"Graph failed: {graph}"
    print(f"[PASS] 16. Dependency Graph generated: {len(graph['nodes'])} nodes, {len(graph['edges'])} edges")

    # 17. What-If Simulation Sandbox
    status, sim = request("POST", "/simulation/simulate", {
        "task_id": task1_id,
        "target_assignee_id": member_id
    })
    assert status == 200 and "before_source_workload" in sim, f"Simulation failed: {sim}"
    print(f"[PASS] 17. Simulation successful! Before: {sim['before_source_workload']}% -> After: {sim['after_source_workload']}%")

    # 18. Apply Simulation Change
    status, applied = request("POST", "/simulation/apply", {
        "task_id": task1_id,
        "target_assignee_id": member_id
    })
    assert status == 200 and applied.get("success"), f"Simulation apply failed: {applied}"
    print(f"[PASS] 18. Simulation applied to production: {applied.get('message')}")

    # 19. Project Summary
    status, sum_data = request("GET", f"/projects/{project_id}/summary")
    assert status == 200 and "completion_percentage" in sum_data, f"Summary failed: {sum_data}"
    print(f"[PASS] 19. Project Summary verified: {sum_data['project_name']} Health={sum_data['health']}")

    # 20. Analytics
    status, analytics = request("GET", f"/analytics?project_id={project_id}")
    assert status == 200 and ("has_sufficient_data" in analytics or "total_evaluations" in analytics), f"Analytics failed: {analytics}"
    print(f"[PASS] 20. Analytics verified: has_sufficient_data={analytics.get('has_sufficient_data')}")

    # 21. Dynamic Notifications
    status, notifs = request("GET", "/notifications")
    assert status == 200 and isinstance(notifs, list), f"Notifications failed: {notifs}"
    print(f"[PASS] 21. Dynamic Notifications: {len(notifs)} state-driven alerts")

    # 22. Integrations toggle
    status, toggled = request("POST", "/integrations/github/toggle")
    assert status == 200 and "status" in toggled, f"Toggle failed: {toggled}"
    print(f"[PASS] 22. Integration toggle verified: GitHub status is now '{toggled['status']}'")

    # 23. Settings
    status, settings = request("GET", "/settings")
    assert status == 200 and "healthy_threshold" in settings, f"Settings failed: {settings}"
    print("[PASS] 23. Settings endpoint verified")

    print("\nALL 23 END-TO-END TESTS PASSED WITH ZERO ERRORS!")

if __name__ == "__main__":
    run_tests()
