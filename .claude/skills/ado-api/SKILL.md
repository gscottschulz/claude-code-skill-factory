---
name: ado-api
description: Azure DevOps REST API client - USE ado.py CLI or ado_client.py
---

# Azure DevOps API Skill

## CRITICAL: How to Use This Skill

**ALWAYS use the CLI (`ado.py`) or Python client (`ado_client.py`) - NEVER compose raw curl/HTTP requests.**

### Option 1: CLI (Simplest)

```bash
cd ~/.claude/skills/ado-api
uv run --with requests python3 ado.py <command> [args...]
```

### Option 2: Python Client (For Complex Scripts)

```bash
cd ~/.claude/skills/ado-api
uv run --with requests python3 -c "
from ado_client import AzureDevOpsClient
import json
client = AzureDevOpsClient()
result = client.get_work_item('PROJECT', ID)
print(json.dumps(result, indent=2))
"
```

**Environment variables required:**
- `ADO_ORGANIZATION` - Your Azure DevOps organization name
- `ADO_PAT` - Personal Access Token

---

## CLI Commands (Recommended)

```bash
# Get work item
uv run --with requests python3 ado.py get-work-item "Best Upon Request" 42731

# Get project details
uv run --with requests python3 ado.py get-project "Best Upon Request"

# List all projects
uv run --with requests python3 ado.py list-projects

# List repositories
uv run --with requests python3 ado.py list-repos "MyProject"

# List pull requests
uv run --with requests python3 ado.py list-prs "MyProject" "repo-id"

# List pipelines
uv run --with requests python3 ado.py list-pipelines "MyProject"

# Run WIQL query
uv run --with requests python3 ado.py query "MyProject" "SELECT [System.Id] FROM WorkItems WHERE [System.State] = 'Active'"

# Add comment to work item
uv run --with requests python3 ado.py add-comment "MyProject" 12345 "My comment here"
```

---

## Python Client Examples

### Get Work Item
```bash
uv run --with requests python3 -c "
from ado_client import AzureDevOpsClient
import json
client = AzureDevOpsClient()
result = client.get_work_item('Best Upon Request', 42731)
print(json.dumps(result, indent=2))
"
```

### Get Project ID
```bash
uv run --with requests python3 -c "
from ado_client import AzureDevOpsClient
import json
client = AzureDevOpsClient()
result = client.get_project('Best Upon Request')
print(json.dumps(result, indent=2))
"
```

### Query Work Items (WIQL)
```bash
uv run --with requests python3 -c "
from ado_client import AzureDevOpsClient
import json
client = AzureDevOpsClient()
wiql = '''
SELECT [System.Id], [System.Title], [System.State]
FROM WorkItems
WHERE [System.TeamProject] = @project
  AND [System.WorkItemType] = \"Bug\"
  AND [System.State] = \"Active\"
ORDER BY [System.Id] DESC
'''
result = client.query_work_items('MyProject', wiql, top=10)
print(json.dumps(result, indent=2))
"
```

### Create Work Item
```bash
uv run --with requests python3 -c "
from ado_client import AzureDevOpsClient
import json
client = AzureDevOpsClient()
result = client.create_work_item('MyProject', 'Bug', {
    'System.Title': 'Bug title here',
    'System.Description': 'Description here',
    'Microsoft.VSTS.Common.Priority': 2
})
print(json.dumps(result, indent=2))
"
```

### List Pull Requests
```bash
uv run --with requests python3 -c "
from ado_client import AzureDevOpsClient
import json
client = AzureDevOpsClient()
result = client.list_pull_requests('MyProject', 'repo-id', status='active')
print(json.dumps(result, indent=2))
"
```

---

## Response Format

All methods return:
```python
# Success
{"success": True, "data": {...}}

# Error
{"success": False, "error": {"status_code": 404, "message": "..."}}
```

---

## Available Methods (43 total)

### Work Items (12 methods)
| Method | Description |
|--------|-------------|
| `get_work_item(project, id)` | Get single work item |
| `get_work_items(project, ids)` | Get multiple work items |
| `create_work_item(project, type, fields)` | Create work item |
| `update_work_item(project, id, updates)` | Update work item |
| `delete_work_item(project, id)` | Delete work item |
| `query_work_items(project, wiql)` | WIQL query |
| `get_work_item_comments(project, id)` | Get comments |
| `add_work_item_comment(project, id, text)` | Add comment |
| `link_work_items(project, source, target, type)` | Link items |
| `get_work_item_revisions(project, id)` | Get revisions |
| `upload_attachment(project, name, content)` | Upload file |
| `attach_to_work_item(project, id, url)` | Attach file |

### Git (14 methods)
| Method | Description |
|--------|-------------|
| `list_repositories(project)` | List repos |
| `get_repository(project, id)` | Get repo |
| `list_pull_requests(project, repo, status)` | List PRs |
| `get_pull_request(project, repo, id)` | Get PR |
| `create_pull_request(project, repo, ...)` | Create PR |
| `update_pull_request(project, repo, id, updates)` | Update PR |
| `get_pull_request_threads(project, repo, id)` | Get PR comments |
| `add_pull_request_thread(project, repo, id, ...)` | Add PR comment |
| `list_commits(project, repo)` | List commits |
| `get_commit(project, repo, id)` | Get commit |
| `list_branches(project, repo)` | List branches |
| `list_tags(project, repo)` | List tags |
| `create_branch(project, repo, name, commit)` | Create branch |
| `delete_branch(project, repo, name, commit)` | Delete branch |

### Pipelines (11 methods)
| Method | Description |
|--------|-------------|
| `list_pipelines(project)` | List pipelines |
| `get_pipeline(project, id)` | Get pipeline |
| `run_pipeline(project, id, ref, params)` | Run pipeline |
| `get_pipeline_run(project, pipe_id, run_id)` | Get run status |
| `list_pipeline_runs(project, id)` | List runs |
| `get_pipeline_run_logs(project, pipe, run)` | Get log list |
| `get_pipeline_log_content(project, pipe, run, log)` | Get log content |
| `cancel_pipeline_run(project, build_id)` | Cancel run |
| `list_builds(project)` | List builds |
| `get_build_artifacts(project, build_id)` | Get artifacts |
| `download_artifact(project, build_id, name)` | Download artifact |

### Projects (6 methods)
| Method | Description |
|--------|-------------|
| `list_projects()` | List all projects |
| `get_project(name_or_id)` | Get project details |
| `list_teams(project)` | List teams |
| `get_team_members(project, team_id)` | Get team members |
| `list_iterations(project, team)` | List iterations |
| `list_areas(project)` | List area paths |

---

## Files in This Skill

| File | Purpose |
|------|---------|
| `SKILL.md` | This file - quick reference |
| `ado.py` | **CLI WRAPPER - SIMPLEST TO USE** |
| `ado_client.py` | Python client for complex scripts |
| `HOW_TO_USE.md` | Detailed usage examples |
| `ado-api-reference.md` | Full API endpoint reference |

---

## Troubleshooting

**"Module not found" error:**
```bash
# Always use uv run --with requests
uv run --with requests python3 your_script.py
```

**Authentication failed:**
```bash
# Check environment variables
echo $ADO_ORGANIZATION
echo $ADO_PAT
```

**Wrong directory:**
```bash
# Must be in skill directory for imports
cd ~/.claude/skills/ado-api
```

---

**Version**: 3.0.0 | **API**: 7.1 | **Last Updated**: 2025
