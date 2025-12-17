# How to Use the Azure DevOps Client

## Setup

### ⚠️ IMPORTANT: Always Run with `uv`

This skill requires the `requests` library. **Use `uv` to run all scripts** - it handles dependencies automatically and works on modern macOS/Linux systems.

```bash
# All examples in this guide should be run with:
cd path/to/ado-api/
uv run --with requests python3 your_script.py
```

### Step 1: Set Environment Variables

```bash
export ADO_ORGANIZATION="your-org-name"
export ADO_PAT="your-personal-access-token"
```

### Step 2: Initialize the Client

```python
from ado_client import AzureDevOpsClient

# Uses ADO_ORGANIZATION and ADO_PAT environment variables
client = AzureDevOpsClient()
```

### Alternative: Custom Environment Variable Names

If your PAT is stored in a different env var (e.g., `MY_CUSTOM_PAT`):

```python
import os
from ado_client import AzureDevOpsClient

client = AzureDevOpsClient(
    organization=os.getenv("ADO_ORGANIZATION"),
    pat=os.getenv("MY_CUSTOM_PAT")
)
```

### Alternative: Direct Parameters (Not Recommended)

```python
from ado_client import AzureDevOpsClient

# Avoid hardcoding credentials - use env vars instead
client = AzureDevOpsClient(
    organization="your-org-name",
    pat="your-personal-access-token"
)
```

## Response Handling

All methods return a dictionary with consistent structure:

```python
result = client.get_work_item("MyProject", 12345)

if result["success"]:
    # Success - data is in result["data"]
    work_item = result["data"]
    print(work_item["fields"]["System.Title"])
else:
    # Error - details in result["error"]
    error = result["error"]
    print(f"Status: {error.get('status_code')}")
    print(f"Message: {error['message']}")
```

## Work Items Examples

### Get a Work Item

```python
result = client.get_work_item("MyProject", 12345)
if result["success"]:
    wi = result["data"]
    print(f"Title: {wi['fields']['System.Title']}")
    print(f"State: {wi['fields']['System.State']}")
```

### Create a Bug

```python
result = client.create_work_item("MyProject", "Bug", {
    "System.Title": "Login button not working",
    "System.Description": "<div>Users report the login button is unresponsive</div>",
    "Microsoft.VSTS.Common.Priority": 1
})
if result["success"]:
    print(f"Created bug #{result['data']['id']}")
```

### Query Work Items (WIQL)

```python
wiql = """
SELECT [System.Id], [System.Title], [System.State]
FROM WorkItems
WHERE [System.TeamProject] = @project
  AND [System.WorkItemType] = 'Bug'
  AND [System.State] = 'Active'
ORDER BY [Microsoft.VSTS.Common.Priority] ASC
"""
result = client.query_work_items("MyProject", wiql, top=50)
if result["success"]:
    for wi in result["data"]["workItems"]:
        print(f"Bug #{wi['id']}")
```

### Link Work Items

```python
# Create parent-child relationship
result = client.link_work_items(
    "MyProject",
    source_id=100,  # Parent
    target_id=101,  # Child
    link_type="System.LinkTypes.Hierarchy-Forward",
    comment="Adding task as child"
)
```

## Git Examples

### List Repositories

```python
result = client.list_repositories("MyProject")
if result["success"]:
    for repo in result["data"]["value"]:
        print(f"{repo['name']}: {repo['webUrl']}")
```

### Create a Pull Request

```python
result = client.create_pull_request(
    "MyProject",
    "repo-id",
    source_ref="feature/new-login",
    target_ref="main",
    title="Add new login feature",
    description="Implements SSO with OAuth2",
    reviewers=["reviewer-guid"],
    work_item_ids=[12345]
)
if result["success"]:
    pr = result["data"]
    print(f"Created PR #{pr['pullRequestId']}")
```

### Add PR Comment

```python
# General comment
result = client.add_pull_request_thread(
    "MyProject", "repo-id", 123,
    content="LGTM!",
    status="closed"
)

# Inline comment on file
result = client.add_pull_request_thread(
    "MyProject", "repo-id", 123,
    content="Consider using const here",
    file_path="/src/utils/helper.py",
    line=42
)
```

## Pipeline Examples

### Run a Pipeline

```python
result = client.run_pipeline(
    "MyProject",
    pipeline_id=42,
    ref_name="refs/heads/main",
    template_parameters={"environment": "staging"},
    variables={"debug": "true"}
)
if result["success"]:
    run = result["data"]
    print(f"Started run #{run['id']}")
```

### Check Pipeline Status

```python
result = client.get_pipeline_run("MyProject", 42, run_id=100)
if result["success"]:
    run = result["data"]
    print(f"State: {run['state']}, Result: {run.get('result', 'N/A')}")
```

## Common Patterns

### Batch Processing

```python
# Get multiple work items
result = client.get_work_items("MyProject", [1, 2, 3, 4, 5])

# Process with error handling
for wi in result.get("data", {}).get("value", []):
    print(wi["id"])
```

### Pagination (where supported)

```python
# Use top parameter for pagination
result = client.list_commits("MyProject", "repo-id", top=100)
```
