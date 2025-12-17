# Azure DevOps REST API Skill

A simple Python client for interacting with Azure DevOps REST API v7.1.

## Features

- 43 API methods covering Work Items, Git, Pipelines, and Projects
- Simple response format: `{"success": True/False, "data/error": {...}}`
- No exceptions thrown - check `result["success"]` instead
- Authentication via PAT (environment variables or direct parameters)

## Quick Start

### ⚠️ Prerequisites: Use `uv` to Run This Skill

This skill requires the `requests` library. **Use `uv`** to run scripts - it handles dependencies automatically.

```bash
# Install uv if you don't have it
curl -LsSf https://astral.sh/uv/install.sh | sh

# Or with Homebrew
brew install uv
```

### 1. Set Environment Variables

```bash
export ADO_ORGANIZATION="your-org-name"
export ADO_PAT="your-personal-access-token"
```

### 2. Run Scripts with `uv`

```bash
# Navigate to skill directory and run with uv
cd path/to/ado-api/
uv run --with requests python3 your_script.py
```

### 3. Example Script

```python
# example.py
from ado_client import AzureDevOpsClient

client = AzureDevOpsClient()

# Get a work item
result = client.get_work_item("MyProject", 12345)
if result["success"]:
    print(result["data"]["fields"]["System.Title"])
else:
    print(f"Error: {result['error']['message']}")

# Create a work item
result = client.create_work_item("MyProject", "Bug", {
    "System.Title": "Fix login issue",
    "System.Description": "Users cannot log in"
})

# List pull requests
result = client.list_pull_requests("MyProject", "repo-id", status="active")

# Run a pipeline
result = client.run_pipeline("MyProject", 42, ref_name="refs/heads/main")
```

Run it:

```bash
uv run --with requests python3 example.py
```

## API Coverage

| Category | Methods | Examples |
|----------|---------|----------|
| Work Items | 12 | get, create, update, delete, query, comments, links |
| Git | 14 | repos, pull requests, commits, branches, tags |
| Pipelines | 11 | list, run, status, logs, artifacts |
| Projects | 6 | projects, teams, iterations, areas |

## Response Format

All methods return a consistent response:

```python
# Success
{"success": True, "data": {...}}

# Error
{"success": False, "error": {"status_code": 404, "message": "..."}}
```

## Installation

See [INSTALL.md](INSTALL.md) for installation instructions.

## Usage Examples

See [HOW_TO_USE.md](HOW_TO_USE.md) for detailed usage examples.

## Requirements

- Python 3.7+
- requests library

## Files

- `SKILL.md` - Complete API reference
- `ado_client.py` - Python client implementation
- `HOW_TO_USE.md` - Usage examples
- `INSTALL.md` - Installation guide

## Version

- **Skill Version**: 2.0.0
- **API Version**: 7.1
