# Azure DevOps REST API v7.1 Skill

Comprehensive skill for interacting with Azure DevOps REST API version 7.1. Covers Work Items, Git, Pipelines, and Projects APIs with Python client patterns, authentication, and error handling.

---

## Quick Start

### ⚠️ IMPORTANT: Use `uv` to Run This Skill

This skill requires the `requests` library. **Always use `uv` to run scripts** - it handles dependencies automatically and works on modern macOS/Linux systems.

```bash
# Navigate to the skill directory
cd path/to/ado-api/

# Run any script with uv (dependencies handled automatically)
uv run --with requests python3 your_script.py
```

### Environment Variables

Set your Azure DevOps credentials before running:

```bash
export ADO_ORGANIZATION="your-org-name"
export ADO_PAT="your-personal-access-token"

# Or use a custom PAT variable name by passing it directly to the client
```

### Example Usage

```python
from ado_client import AzureDevOpsClient
import os

# Option 1: Use default environment variables (ADO_ORGANIZATION and ADO_PAT)
client = AzureDevOpsClient()

# Option 2: Pass credentials directly (useful for custom env var names)
client = AzureDevOpsClient(
    organization=os.getenv("ADO_ORGANIZATION"),
    pat=os.getenv("MY_CUSTOM_PAT_VAR")  # Use any env var name you want
)

# All methods return {"success": True, "data": {...}} or {"success": False, "error": {...}}
result = client.get_work_item("MyProject", 12345)
if result["success"]:
    print(result["data"]["fields"]["System.Title"])
else:
    print(f"Error: {result['error']['message']}")
```

### One-Liner Example

```bash
# List first 10 work items from a project
ADO_ORGANIZATION=myorg ADO_PAT=$MY_PAT uv run --with requests python3 -c "
from ado_client import AzureDevOpsClient
client = AzureDevOpsClient()
result = client.query_work_items('MyProject', 'SELECT [System.Id], [System.Title] FROM WorkItems', top=10)
if result['success']:
    for wi in result['data']['workItems']:
        print(f\"Work Item #{wi['id']}\")
"
```

---

## Response Format

All client methods return a consistent dictionary format:

```python
# Success response
{"success": True, "data": {...}}

# Error response
{"success": False, "error": {"status_code": 404, "message": "..."}}
```

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Authentication](#authentication)
3. [Response Format](#response-format)
4. [Work Items API](#work-items-api)
5. [Git API](#git-api)
6. [Pipelines API](#pipelines-api)
7. [Projects API](#projects-api)
8. [WIQL Reference](#wiql-reference)
9. [Error Handling](#error-handling)
10. [Python Client](#python-client)

---

## Authentication

### Authentication Options

1. **Environment Variables** (Recommended for CI/CD)
   - Set `ADO_ORGANIZATION` and `ADO_PAT` environment variables
   - Client automatically uses these if no parameters provided

2. **Direct Parameters** (For multi-tenant scenarios)
   - Pass `organization` and `pat` to the constructor
   - Takes precedence over environment variables

### Configuration Priority

| Parameter | Direct Config | Environment Fallback | Required |
|-----------|---------------|---------------------|----------|
| `organization` | Constructor param | `ADO_ORGANIZATION` | Yes |
| `pat` | Constructor param | `ADO_PAT` | Yes |

### PAT Scopes Required

| Scope | Operations |
|-------|------------|
| `vso.work` | Read work items |
| `vso.work_write` | Create/update work items |
| `vso.code` | Read repositories, commits, branches |
| `vso.code_write` | Create branches, push commits |
| `vso.code_manage` | Manage pull requests |
| `vso.build` | Read pipelines and builds |
| `vso.build_execute` | Run pipelines, queue builds |
| `vso.project` | Read projects and teams |

---

## Work Items API

### Get Work Item

```
GET /{project}/_apis/wit/workitems/{id}?api-version=7.1
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `expand` | string | `None`, `Relations`, `Fields`, `Links`, `All` (default: `All`) |

**Python:**

```python
from ado_client import AzureDevOpsClient

client = AzureDevOpsClient()
result = client.get_work_item("MyProject", 12345)
# Result: {"success": True, "data": {"id": 12345, "fields": {...}}}

# With specific expansion
result = client.get_work_item("MyProject", 12345, expand="Relations")
```

**Response:**

```json
{
  "id": 12345,
  "rev": 5,
  "fields": {
    "System.Id": 12345,
    "System.Title": "Implement feature X",
    "System.State": "Active",
    "System.WorkItemType": "User Story",
    "System.AssignedTo": {
      "displayName": "John Doe",
      "uniqueName": "john.doe@company.com"
    }
  },
  "relations": [...],
  "url": "https://dev.azure.com/{org}/{project}/_apis/wit/workitems/12345"
}
```

---

### Get Multiple Work Items (Batch)

```
GET /{project}/_apis/wit/workitems?ids={ids}&api-version=7.1
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `ids` | List[int] | Work item IDs (max 200) |
| `fields` | List[str] | Optional field names to return |

**Python:**

```python
result = client.get_work_items("MyProject", [12345, 12346, 12347])
# Result: {"success": True, "data": {"value": [...]}}

# With specific fields
result = client.get_work_items(
    "MyProject",
    [12345, 12346],
    fields=["System.Title", "System.State"]
)
```

---

### Create Work Item

```
POST /{project}/_apis/wit/workitems/${type}?api-version=7.1
```

**Python:**

```python
result = client.create_work_item("MyProject", "User Story", {
    "System.Title": "Implement login feature",
    "System.Description": "<div>As a user, I want to log in</div>",
    "Microsoft.VSTS.Common.Priority": 1,
    "Microsoft.VSTS.Scheduling.StoryPoints": 8
})
# Result: {"success": True, "data": {"id": 12348, "fields": {...}}}

if result["success"]:
    new_id = result["data"]["id"]
    print(f"Created work item: {new_id}")
```

---

### Update Work Item

```
PATCH /{project}/_apis/wit/workitems/{id}?api-version=7.1
```

**Python:**

```python
result = client.update_work_item("MyProject", 12345, {
    "System.State": "Resolved",
    "System.History": "Fixed the bug by updating validation logic."
})
# Result: {"success": True, "data": {"id": 12345, "rev": 6, ...}}
```

---

### Delete Work Item

```
DELETE /{project}/_apis/wit/workitems/{id}?api-version=7.1
```

**Python:**

```python
# Move to recycle bin (default)
result = client.delete_work_item("MyProject", 12345)

# Permanently delete
result = client.delete_work_item("MyProject", 12345, permanent=True)
```

---

### Query Work Items (WIQL)

```
POST /{project}/_apis/wit/wiql?api-version=7.1
```

**Python:**

```python
wiql = """
SELECT [System.Id], [System.Title], [System.State]
FROM WorkItems
WHERE [System.TeamProject] = @project
  AND [System.WorkItemType] = 'Bug'
  AND [System.State] IN ('New', 'Active')
ORDER BY [Microsoft.VSTS.Common.Priority] ASC
"""

result = client.query_work_items("MyProject", wiql, top=100)
# Result: {"success": True, "data": {"workItems": [{"id": 123}, ...]}}

if result["success"]:
    work_item_ids = [wi["id"] for wi in result["data"]["workItems"]]
    # Fetch full details
    details = client.get_work_items("MyProject", work_item_ids)
```

---

### Get Work Item Comments

```
GET /{project}/_apis/wit/workitems/{id}/comments?api-version=7.1-preview.4
```

**Python:**

```python
result = client.get_work_item_comments("MyProject", 12345)
# Result: {"success": True, "data": {"comments": [...]}}

# Limit results
result = client.get_work_item_comments("MyProject", 12345, top=10)
```

---

### Add Work Item Comment

```
POST /{project}/_apis/wit/workitems/{id}/comments?api-version=7.1-preview.4
```

**Python:**

```python
result = client.add_work_item_comment(
    "MyProject",
    12345,
    "Investigation complete. Root cause identified."
)
```

---

### Link Work Items

**Link Types:**

| Link Type | Relation Name |
|-----------|---------------|
| Parent | `System.LinkTypes.Hierarchy-Reverse` |
| Child | `System.LinkTypes.Hierarchy-Forward` |
| Related | `System.LinkTypes.Related` |
| Duplicate | `System.LinkTypes.Duplicate-Forward` |
| Successor | `System.LinkTypes.Dependency-Forward` |
| Predecessor | `System.LinkTypes.Dependency-Reverse` |

**Python:**

```python
# Create parent-child relationship
result = client.link_work_items(
    "MyProject",
    source_id=12345,
    target_id=12346,
    link_type="System.LinkTypes.Hierarchy-Forward",
    comment="Adding task as child of user story"
)
```

---

### Get Work Item Revisions

```
GET /{project}/_apis/wit/workitems/{id}/revisions?api-version=7.1
```

**Python:**

```python
result = client.get_work_item_revisions("MyProject", 12345)
# Result: {"success": True, "data": {"value": [...]}}

# With pagination
result = client.get_work_item_revisions("MyProject", 12345, top=10, skip=0)
```

---

### Upload Attachment

```
POST /{project}/_apis/wit/attachments?api-version=7.1
```

**Python:**

```python
with open("screenshot.png", "rb") as f:
    content = f.read()

result = client.upload_attachment("MyProject", "screenshot.png", content)
# Result: {"success": True, "data": {"id": "...", "url": "..."}}

if result["success"]:
    attachment_url = result["data"]["url"]
    # Attach to work item
    client.attach_to_work_item("MyProject", 12345, attachment_url, "Bug screenshot")
```

---

## Git API

### List Repositories

```
GET /{project}/_apis/git/repositories?api-version=7.1
```

**Python:**

```python
result = client.list_repositories("MyProject")
# Result: {"success": True, "data": {"value": [{"id": "...", "name": "my-repo", ...}]}}

if result["success"]:
    for repo in result["data"]["value"]:
        print(f"{repo['name']}: {repo['id']}")
```

---

### Get Repository

```
GET /{project}/_apis/git/repositories/{repositoryId}?api-version=7.1
```

**Python:**

```python
result = client.get_repository("MyProject", "my-repo")
# or by ID
result = client.get_repository("MyProject", "abc123-def456")
```

---

### List Pull Requests

```
GET /{project}/_apis/git/repositories/{repositoryId}/pullrequests?api-version=7.1
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | `active`, `abandoned`, `completed`, `all` (default: `active`) |
| `top` | int | Max results |

**Python:**

```python
result = client.list_pull_requests("MyProject", "my-repo-id")
# Result: {"success": True, "data": {"value": [...]}}

# Filter by status
result = client.list_pull_requests("MyProject", "my-repo-id", status="completed", top=50)
```

---

### Get Pull Request

```
GET /{project}/_apis/git/repositories/{repositoryId}/pullrequests/{pullRequestId}?api-version=7.1
```

**Python:**

```python
result = client.get_pull_request("MyProject", "my-repo-id", 123)
# Result: {"success": True, "data": {"pullRequestId": 123, "title": "...", ...}}
```

---

### Create Pull Request

```
POST /{project}/_apis/git/repositories/{repositoryId}/pullrequests?api-version=7.1
```

**Python:**

```python
result = client.create_pull_request(
    project="MyProject",
    repository_id="my-repo-id",
    source_ref="feature/new-login",      # or "refs/heads/feature/new-login"
    target_ref="main",                    # or "refs/heads/main"
    title="Add new login feature",
    description="Implements SSO login with OAuth2",
    reviewers=["reviewer-guid-1", "reviewer-guid-2"],
    work_item_ids=[12345, 12346],
    is_draft=False
)
# Result: {"success": True, "data": {"pullRequestId": 124, ...}}
```

---

### Update Pull Request

```
PATCH /{project}/_apis/git/repositories/{repositoryId}/pullrequests/{pullRequestId}?api-version=7.1
```

**Python:**

```python
# Update title/description
result = client.update_pull_request("MyProject", "my-repo-id", 123, {
    "title": "Updated PR title",
    "description": "Updated description"
})

# Complete a pull request
result = client.update_pull_request("MyProject", "my-repo-id", 123, {
    "status": "completed",
    "completionOptions": {
        "deleteSourceBranch": True,
        "mergeStrategy": "squash",
        "mergeCommitMessage": "Merged PR 123: Add new login feature"
    }
})
```

---

### Get Pull Request Threads

```
GET /{project}/_apis/git/repositories/{repositoryId}/pullrequests/{pullRequestId}/threads?api-version=7.1
```

**Python:**

```python
result = client.get_pull_request_threads("MyProject", "my-repo-id", 123)
# Result: {"success": True, "data": {"value": [...]}}
```

---

### Add Pull Request Comment

```
POST /{project}/_apis/git/repositories/{repositoryId}/pullrequests/{pullRequestId}/threads?api-version=7.1
```

**Python:**

```python
# General comment
result = client.add_pull_request_thread(
    "MyProject", "my-repo-id", 123,
    content="Great work! LGTM.",
    status="closed"
)

# Inline comment on specific file/line
result = client.add_pull_request_thread(
    "MyProject", "my-repo-id", 123,
    content="Consider using const here instead of let.",
    status="active",
    file_path="/src/utils/helper.ts",
    line=42
)
```

---

### List Commits

```
GET /{project}/_apis/git/repositories/{repositoryId}/commits?api-version=7.1
```

**Python:**

```python
result = client.list_commits("MyProject", "my-repo-id")

# Filter by branch
result = client.list_commits("MyProject", "my-repo-id", branch="main", top=50)
```

---

### Get Commit

```
GET /{project}/_apis/git/repositories/{repositoryId}/commits/{commitId}?api-version=7.1
```

**Python:**

```python
result = client.get_commit("MyProject", "my-repo-id", "abc123def456")

# Include change details
result = client.get_commit("MyProject", "my-repo-id", "abc123def456", change_count=100)
```

---

### List Branches

```
GET /{project}/_apis/git/repositories/{repositoryId}/refs?filter=heads/&api-version=7.1
```

**Python:**

```python
result = client.list_branches("MyProject", "my-repo-id")
# Result: {"success": True, "data": {"value": [{"name": "refs/heads/main", ...}]}}

# Filter by name
result = client.list_branches("MyProject", "my-repo-id", filter_contains="feature")
```

---

### List Tags

```
GET /{project}/_apis/git/repositories/{repositoryId}/refs?filter=tags/&api-version=7.1
```

**Python:**

```python
result = client.list_tags("MyProject", "my-repo-id")
# Result: {"success": True, "data": {"value": [{"name": "refs/tags/v1.0.0", ...}]}}
```

---

### Create Branch

```
POST /{project}/_apis/git/repositories/{repositoryId}/refs?api-version=7.1
```

**Python:**

```python
# First get the source commit (e.g., from main branch)
branches = client.list_branches("MyProject", "my-repo-id", filter_contains="main")
main_commit = branches["data"]["value"][0]["objectId"]

# Create new branch
result = client.create_branch(
    "MyProject",
    "my-repo-id",
    "feature/new-feature",
    main_commit
)
```

---

### Delete Branch

```
POST /{project}/_apis/git/repositories/{repositoryId}/refs?api-version=7.1
```

**Python:**

```python
# Get current commit ID of the branch
branches = client.list_branches("MyProject", "my-repo-id", filter_contains="feature/old")
branch_commit = branches["data"]["value"][0]["objectId"]

# Delete the branch
result = client.delete_branch(
    "MyProject",
    "my-repo-id",
    "feature/old",
    branch_commit
)
```

---

## Pipelines API

### List Pipelines

```
GET /{project}/_apis/pipelines?api-version=7.1
```

**Python:**

```python
result = client.list_pipelines("MyProject")
# Result: {"success": True, "data": {"value": [{"id": 42, "name": "CI Pipeline", ...}]}}

result = client.list_pipelines("MyProject", top=20)
```

---

### Get Pipeline

```
GET /{project}/_apis/pipelines/{pipelineId}?api-version=7.1
```

**Python:**

```python
result = client.get_pipeline("MyProject", 42)
```

---

### Run Pipeline

```
POST /{project}/_apis/pipelines/{pipelineId}/runs?api-version=7.1
```

**Python:**

```python
# Run on default branch
result = client.run_pipeline("MyProject", 42)

# Run on specific branch with parameters
result = client.run_pipeline(
    "MyProject",
    42,
    ref_name="refs/heads/feature/new-feature",
    template_parameters={"environment": "staging"},
    variables={"customVar": "customValue"}
)
# Result: {"success": True, "data": {"id": 1234, "state": "inProgress", ...}}
```

---

### Get Pipeline Run

```
GET /{project}/_apis/pipelines/{pipelineId}/runs/{runId}?api-version=7.1
```

**Python:**

```python
result = client.get_pipeline_run("MyProject", 42, 1234)
# Result: {"success": True, "data": {"state": "completed", "result": "succeeded", ...}}

# Poll for completion
import time

def wait_for_pipeline(client, project, pipeline_id, run_id, timeout=600):
    start = time.time()
    while time.time() - start < timeout:
        result = client.get_pipeline_run(project, pipeline_id, run_id)
        if result["success"] and result["data"]["state"] == "completed":
            return result["data"]
        time.sleep(10)
    raise TimeoutError("Pipeline did not complete in time")
```

---

### List Pipeline Runs

```
GET /{project}/_apis/pipelines/{pipelineId}/runs?api-version=7.1
```

**Python:**

```python
result = client.list_pipeline_runs("MyProject", 42)
result = client.list_pipeline_runs("MyProject", 42, top=10)
```

---

### Get Pipeline Run Logs

```
GET /{project}/_apis/pipelines/{pipelineId}/runs/{runId}/logs?api-version=7.1
```

**Python:**

```python
result = client.get_pipeline_run_logs("MyProject", 42, 1234)
# Result: {"success": True, "data": {"logs": [{"id": 1, "lineCount": 50, ...}]}}

# Get specific log content
if result["success"]:
    for log in result["data"]["logs"]:
        content = client.get_pipeline_log_content("MyProject", 42, 1234, log["id"])
        print(content["data"])
```

---

### Cancel Pipeline Run

```
PATCH /{project}/_apis/build/builds/{buildId}?api-version=7.1
```

**Python:**

```python
result = client.cancel_pipeline_run("MyProject", 1234)
```

---

### List Builds

```
GET /{project}/_apis/build/builds?api-version=7.1
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `definitions` | List[int] | Filter by definition IDs |
| `status_filter` | string | `inProgress`, `completed`, `cancelling`, etc. |
| `result_filter` | string | `succeeded`, `failed`, `canceled` |
| `branch_name` | string | Filter by branch (e.g., `refs/heads/main`) |

**Python:**

```python
result = client.list_builds("MyProject")

# With filters
result = client.list_builds(
    "MyProject",
    definitions=[42, 43],
    status_filter="completed",
    result_filter="failed",
    branch_name="refs/heads/main",
    top=50
)
```

---

### Get Build Artifacts

```
GET /{project}/_apis/build/builds/{buildId}/artifacts?api-version=7.1
```

**Python:**

```python
result = client.get_build_artifacts("MyProject", 1234)
# Result: {"success": True, "data": {"value": [{"name": "drop", ...}]}}
```

---

### Download Artifact

**Python:**

```python
result = client.download_artifact("MyProject", 1234, "drop")
# Result: {"success": True, "data": {"content": b"..."}}

if result["success"]:
    with open("artifact.zip", "wb") as f:
        f.write(result["data"]["content"])
```

---

## Projects API

### List Projects

```
GET /_apis/projects?api-version=7.1
```

**Python:**

```python
result = client.list_projects()
# Result: {"success": True, "data": {"value": [{"id": "...", "name": "MyProject", ...}]}}

# With pagination
result = client.list_projects(top=50, skip=0)
```

---

### Get Project

```
GET /_apis/projects/{projectId}?api-version=7.1
```

**Python:**

```python
result = client.get_project("MyProject")
# or by ID
result = client.get_project("abc123-def456")

# Include capabilities
result = client.get_project("MyProject", include_capabilities=True)
```

---

### List Teams

```
GET /{project}/_apis/teams?api-version=7.1
```

**Python:**

```python
result = client.list_teams("MyProject")
# Result: {"success": True, "data": {"value": [{"id": "...", "name": "My Team", ...}]}}
```

---

### Get Team Members

```
GET /{project}/_apis/teams/{teamId}/members?api-version=7.1
```

**Python:**

```python
result = client.get_team_members("MyProject", "team-id")
# Result: {"success": True, "data": {"value": [{"identity": {...}, ...}]}}
```

---

### List Iterations

```
GET /{project}/{team}/_apis/work/teamsettings/iterations?api-version=7.1
```

**Python:**

```python
result = client.list_iterations("MyProject", "My Team")

# Get current iteration only
result = client.list_iterations("MyProject", "My Team", timeframe="current")
```

---

### List Areas

```
GET /{project}/_apis/wit/classificationnodes/Areas?api-version=7.1
```

**Python:**

```python
result = client.list_areas("MyProject")
# Result: {"success": True, "data": {"id": 1, "name": "MyProject", "children": [...]}}

# Control depth
result = client.list_areas("MyProject", depth=5)
```

---

## WIQL Reference

### Query Syntax

```sql
SELECT [field1], [field2], ...
FROM WorkItems | WorkItemLinks
WHERE [conditions]
ORDER BY [field] [ASC|DESC]
```

### Common Fields

| Field | Description |
|-------|-------------|
| `System.Id` | Work item ID |
| `System.Title` | Title |
| `System.State` | State (New, Active, Closed, etc.) |
| `System.WorkItemType` | Type (Bug, User Story, Task, etc.) |
| `System.AssignedTo` | Assigned user |
| `System.CreatedDate` | Creation date |
| `System.ChangedDate` | Last modified date |
| `System.TeamProject` | Project name |
| `System.AreaPath` | Area path |
| `System.IterationPath` | Iteration path |
| `System.Tags` | Tags (semicolon-separated) |
| `Microsoft.VSTS.Common.Priority` | Priority (1-4) |
| `Microsoft.VSTS.Scheduling.StoryPoints` | Story points |

### Operators

| Operator | Example |
|----------|---------|
| `=`, `<>` | `[System.State] = 'Active'` |
| `>`, `<`, `>=`, `<=` | `[Microsoft.VSTS.Common.Priority] <= 2` |
| `IN` | `[System.State] IN ('New', 'Active')` |
| `CONTAINS` | `[System.Title] CONTAINS 'login'` |
| `UNDER` | `[System.AreaPath] UNDER 'Project\Team'` |

### Macros

| Macro | Description |
|-------|-------------|
| `@project` | Current project |
| `@me` | Current user |
| `@today` | Today's date |
| `@today - 7` | 7 days ago |
| `@currentIteration` | Current iteration |

### Query Examples

```python
# Active bugs assigned to me
wiql = """
SELECT [System.Id], [System.Title], [System.State]
FROM WorkItems
WHERE [System.TeamProject] = @project
  AND [System.WorkItemType] = 'Bug'
  AND [System.State] = 'Active'
  AND [System.AssignedTo] = @me
ORDER BY [Microsoft.VSTS.Common.Priority] ASC
"""
result = client.query_work_items("MyProject", wiql)

# Work items modified in last 7 days
wiql = """
SELECT [System.Id], [System.Title], [System.ChangedDate]
FROM WorkItems
WHERE [System.TeamProject] = @project
  AND [System.ChangedDate] >= @today - 7
ORDER BY [System.ChangedDate] DESC
"""
result = client.query_work_items("MyProject", wiql)

# Current sprint items
wiql = """
SELECT [System.Id], [System.Title], [System.State]
FROM WorkItems
WHERE [System.TeamProject] = @project
  AND [System.IterationPath] = @currentIteration
ORDER BY [Microsoft.VSTS.Common.Priority] ASC
"""
result = client.query_work_items("MyProject", wiql)
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| `200` | Success | Process `data` field |
| `201` | Created | Resource created successfully |
| `204` | No Content | Success (data is `None`) |
| `400` | Bad Request | Check request parameters |
| `401` | Unauthorized | Check PAT validity and scopes |
| `403` | Forbidden | Check permissions |
| `404` | Not Found | Resource doesn't exist |
| `409` | Conflict | Version mismatch |
| `429` | Too Many Requests | Rate limited - retry later |

### Error Response Format

```python
{
    "success": False,
    "error": {
        "status_code": 404,
        "message": "TF401019: The specified work item does not exist."
    }
}
```

### Python Error Handling

```python
from ado_client import AzureDevOpsClient

client = AzureDevOpsClient()

def handle_result(result, operation_name):
    """Handle API result with proper error checking."""
    if result["success"]:
        return result["data"]

    error = result["error"]
    status = error.get("status_code")
    message = error.get("message", "Unknown error")

    if status == 401:
        raise PermissionError(f"Authentication failed: {message}")
    elif status == 403:
        raise PermissionError(f"Permission denied: {message}")
    elif status == 404:
        raise ValueError(f"Not found: {message}")
    elif status == 429:
        raise RuntimeError(f"Rate limited: {message}")
    else:
        raise RuntimeError(f"{operation_name} failed ({status}): {message}")

# Usage
result = client.get_work_item("MyProject", 12345)
work_item = handle_result(result, "Get work item")
```

---

## Python Client

The `ado_client.py` module provides a simple, consistent interface to Azure DevOps REST API v7.1.

### Features

- **No exceptions** - All methods return `{"success": True/False, "data/error": ...}`
- **Auto-authentication** - Uses environment variables or direct parameters
- **Consistent response format** - Easy to handle success and error cases
- **43 methods** covering Work Items, Git, Pipelines, and Projects APIs

### Method Summary

#### Work Items (12 methods)

| Method | Description |
|--------|-------------|
| `get_work_item(project, work_item_id, expand)` | Get single work item |
| `get_work_items(project, ids, fields)` | Get multiple work items |
| `create_work_item(project, work_item_type, fields)` | Create work item |
| `update_work_item(project, work_item_id, updates)` | Update work item |
| `delete_work_item(project, work_item_id, permanent)` | Delete work item |
| `query_work_items(project, wiql, top)` | Execute WIQL query |
| `get_work_item_comments(project, work_item_id, top)` | Get comments |
| `add_work_item_comment(project, work_item_id, text)` | Add comment |
| `link_work_items(project, source_id, target_id, link_type, comment)` | Link work items |
| `get_work_item_revisions(project, work_item_id, top, skip)` | Get revisions |
| `upload_attachment(project, file_name, content)` | Upload attachment |
| `attach_to_work_item(project, work_item_id, attachment_url, comment)` | Attach to work item |

#### Git (14 methods)

| Method | Description |
|--------|-------------|
| `list_repositories(project)` | List repositories |
| `get_repository(project, repository_id_or_name)` | Get repository |
| `list_pull_requests(project, repository_id, status, top)` | List PRs |
| `get_pull_request(project, repository_id, pull_request_id)` | Get PR |
| `create_pull_request(project, repository_id, source_ref, target_ref, title, ...)` | Create PR |
| `update_pull_request(project, repository_id, pull_request_id, updates)` | Update PR |
| `get_pull_request_threads(project, repository_id, pull_request_id)` | Get PR comments |
| `add_pull_request_thread(project, repository_id, pull_request_id, content, ...)` | Add PR comment |
| `list_commits(project, repository_id, branch, top)` | List commits |
| `get_commit(project, repository_id, commit_id, change_count)` | Get commit |
| `list_branches(project, repository_id, filter_contains)` | List branches |
| `list_tags(project, repository_id)` | List tags |
| `create_branch(project, repository_id, branch_name, source_commit_id)` | Create branch |
| `delete_branch(project, repository_id, branch_name, current_commit_id)` | Delete branch |

#### Pipelines (11 methods)

| Method | Description |
|--------|-------------|
| `list_pipelines(project, top)` | List pipelines |
| `get_pipeline(project, pipeline_id)` | Get pipeline |
| `run_pipeline(project, pipeline_id, ref_name, template_parameters, variables)` | Run pipeline |
| `get_pipeline_run(project, pipeline_id, run_id)` | Get run status |
| `list_pipeline_runs(project, pipeline_id, top)` | List runs |
| `get_pipeline_run_logs(project, pipeline_id, run_id)` | Get log metadata |
| `get_pipeline_log_content(project, pipeline_id, run_id, log_id)` | Get log content |
| `cancel_pipeline_run(project, build_id)` | Cancel run |
| `list_builds(project, definitions, status_filter, result_filter, branch_name, top)` | List builds |
| `get_build_artifacts(project, build_id)` | Get artifacts |
| `download_artifact(project, build_id, artifact_name)` | Download artifact |

#### Projects (6 methods)

| Method | Description |
|--------|-------------|
| `list_projects(top, skip)` | List projects |
| `get_project(project_id_or_name, include_capabilities)` | Get project |
| `list_teams(project, top)` | List teams |
| `get_team_members(project, team_id, top)` | Get team members |
| `list_iterations(project, team, timeframe)` | List iterations |
| `list_areas(project, depth)` | List area paths |

---

## Common Workflows

### Create Bug with Attachment

```python
from ado_client import AzureDevOpsClient

client = AzureDevOpsClient()

# Create the bug
bug = client.create_work_item("MyProject", "Bug", {
    "System.Title": "Login button not working",
    "Microsoft.VSTS.TCM.ReproSteps": "<div>1. Click login<br>2. Nothing happens</div>",
    "Microsoft.VSTS.Common.Priority": 1
})

if bug["success"]:
    bug_id = bug["data"]["id"]

    # Upload and attach screenshot
    with open("screenshot.png", "rb") as f:
        upload = client.upload_attachment("MyProject", "screenshot.png", f.read())

    if upload["success"]:
        client.attach_to_work_item("MyProject", bug_id, upload["data"]["url"], "Bug screenshot")

    print(f"Created bug #{bug_id}")
```

### Create PR and Link Work Items

```python
result = client.create_pull_request(
    project="MyProject",
    repository_id="my-repo-id",
    source_ref="feature/new-login",
    target_ref="main",
    title="Add new login feature",
    description="Implements SSO login with OAuth2",
    work_item_ids=[12345, 12346]
)

if result["success"]:
    pr_id = result["data"]["pullRequestId"]
    print(f"Created PR #{pr_id}")
```

### Monitor Pipeline and Get Logs on Failure

```python
import time

# Start pipeline
run = client.run_pipeline("MyProject", 42, ref_name="refs/heads/main")
if not run["success"]:
    print(f"Failed to start: {run['error']}")
    exit(1)

run_id = run["data"]["id"]
pipeline_id = 42

# Poll until complete
while True:
    status = client.get_pipeline_run("MyProject", pipeline_id, run_id)
    if status["success"] and status["data"]["state"] == "completed":
        break
    time.sleep(10)

# Check result and get logs if failed
if status["data"]["result"] == "failed":
    logs = client.get_pipeline_run_logs("MyProject", pipeline_id, run_id)
    if logs["success"]:
        for log in logs["data"]["logs"]:
            content = client.get_pipeline_log_content("MyProject", pipeline_id, run_id, log["id"])
            print(f"Log {log['id']}:", content["data"])
```

---

## Additional Resources

- [Azure DevOps REST API Reference](https://learn.microsoft.com/en-us/rest/api/azure/devops/)
- [Work Item Tracking API](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/)
- [Git API](https://learn.microsoft.com/en-us/rest/api/azure/devops/git/)
- [Pipelines API](https://learn.microsoft.com/en-us/rest/api/azure/devops/pipelines/)
- [WIQL Syntax](https://learn.microsoft.com/en-us/azure/devops/boards/queries/wiql-syntax)

---

**Skill Version**: 2.0.0
**API Version**: 7.1
**Last Updated**: 2025
