# Installation Guide

## Prerequisites

- Python 3.7 or higher
- `uv` package manager (recommended) or virtual environment

## Step 1: Install `uv` (Required)

This skill requires the `requests` library. **Use `uv` to run scripts** - it handles dependencies automatically and works on modern macOS/Linux systems that use PEP 668 (externally managed environments).

```bash
# Option A: Install with the official installer
curl -LsSf https://astral.sh/uv/install.sh | sh

# Option B: Install with Homebrew (macOS/Linux)
brew install uv
```

### Why `uv`?

Modern macOS and Linux systems prevent `pip install` from installing packages globally (PEP 668). Instead of creating virtual environments manually, `uv` handles this automatically:

```bash
# ❌ This will FAIL on modern systems:
pip install requests

# ✅ This works everywhere:
uv run --with requests python3 script.py
```

## Step 2: Install the Skill

### Option 1: Claude Code Project Level

Copy to your project's Claude skills folder:

```bash
cp -r ado-api .claude/skills/
```

### Option 2: Claude Code User Level

Copy to your personal Claude skills folder:

```bash
cp -r ado-api ~/.claude/skills/
```

## Step 3: Configure Authentication

### Required Environment Variables

```bash
export ADO_ORGANIZATION="your-org-name"
export ADO_PAT="your-personal-access-token"
```

### Using Custom Environment Variable Names

If your PAT is stored in a different environment variable, pass it directly:

```python
import os
from ado_client import AzureDevOpsClient

client = AzureDevOpsClient(
    organization=os.getenv("ADO_ORGANIZATION"),
    pat=os.getenv("FIX_IT_FELIX_ADO_PAT")  # Your custom env var
)
```

### PAT Scopes Required

Create a PAT at `https://dev.azure.com/{org}/_usersSettings/tokens` with these scopes:

| Scope | Operations |
|-------|------------|
| `vso.work` | Read work items |
| `vso.work_write` | Create/update work items |
| `vso.code` | Read repositories, commits |
| `vso.code_write` | Create branches, push commits |
| `vso.code_manage` | Manage pull requests |
| `vso.build` | Read pipelines and builds |
| `vso.build_execute` | Run pipelines |
| `vso.project` | Read projects and teams |

## Step 4: Verify Installation

Navigate to the skill directory and run:

```bash
cd path/to/ado-api/
uv run --with requests python3 -c "
from ado_client import AzureDevOpsClient

client = AzureDevOpsClient()
result = client.list_projects(top=5)

if result['success']:
    print('✓ Connected successfully!')
    for project in result['data']['value']:
        print(f'  - {project[\"name\"]}')
else:
    print(f'✗ Connection failed: {result[\"error\"][\"message\"]}')
"
```

## Alternative: Virtual Environment (Advanced)

If you prefer not to use `uv`, create a virtual environment:

```bash
# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install requests

# Now you can run scripts normally
python3 your_script.py
```

## Files Included

- `SKILL.md` - Complete API reference documentation
- `ado_client.py` - Python client (464 lines, 43 methods)
- `README.md` - Overview and quick start
- `HOW_TO_USE.md` - Usage examples
- `INSTALL.md` - This file
