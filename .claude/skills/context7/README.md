# Context7 Documentation Retrieval Skill

A Claude Code skill for retrieving up-to-date library documentation from the Context7 API.

## Overview

This skill provides direct access to Context7's documentation API, allowing you to:

- Search for libraries by name
- Retrieve code examples and API references
- Fetch conceptual guides and documentation
- Access version-specific documentation
- Navigate paginated results

## Installation

### Prerequisites

1. **Context7 API Key**: Get your key at [context7.com/dashboard](https://context7.com/dashboard)

2. **Set Environment Variable**:
   ```bash
   # Add to your shell profile (~/.bashrc, ~/.zshrc, etc.)
   export CONTEXT7_API_KEY="your-api-key-here"
   ```

### Install the Skill

**Option 1: User-level (all projects)**
```bash
cp -r context7 ~/.claude/skills/
```

**Option 2: Project-level (single project)**
```bash
cp -r context7 .claude/skills/
```

### Verify Installation

```bash
# Check the skill is in place
ls ~/.claude/skills/context7/
# Should show: SKILL.md, context7_client.py, etc.

# Verify API key is set
echo $CONTEXT7_API_KEY
```

## File Structure

```
context7/
├── SKILL.md              # Skill definition with capabilities
├── context7_client.py    # Python API client module
├── sample_input.json     # Example inputs
├── expected_output.json  # Example outputs
├── HOW_TO_USE.md         # Usage examples
└── README.md             # This file
```

## Usage

### In Claude Code

```
Hey Claude--I just added the "context7" skill. Can you look up Next.js routing documentation?
```

### Direct Python Usage

```python
from context7_client import Context7Client

# Initialize client (uses CONTEXT7_API_KEY env var)
client = Context7Client()

# Search for a library
results = client.search_library("next.js")
library_id = results["libraries"][0]["id"]  # "/vercel/next.js"

# Get code examples
docs = client.get_code_snippets(library_id, topic="routing")

# Get conceptual documentation
info = client.get_info_docs(library_id, topic="app-router")

# Get all pages for a topic
all_snippets = client.get_all_pages(library_id, topic="hooks", max_pages=5)
```

### Command Line

```bash
# Search and get docs
python context7_client.py next.js routing
```

## API Reference

### Context7Client

```python
class Context7Client:
    def search_library(library_name: str) -> Dict
    def get_library_docs(library_id: str, topic: str = None, mode: str = "code", page: int = 1, version: str = None) -> Dict
    def get_code_snippets(library_id: str, topic: str = None, page: int = 1, version: str = None) -> Dict
    def get_info_docs(library_id: str, topic: str = None, page: int = 1, version: str = None) -> Dict
    def get_all_pages(library_id: str, topic: str = None, mode: str = "code", max_pages: int = 10, version: str = None) -> List
```

### Standalone Functions

```python
search_library(library_name: str) -> Dict
get_docs(library_id: str, topic: str = None, mode: str = "code", page: int = 1) -> Dict
```

## Parameters

| Parameter      | Type | Description                              |
| -------------- | ---- | ---------------------------------------- |
| `library_name` | str  | Library name to search (e.g., "next.js") |
| `library_id`   | str  | Context7 ID (e.g., "/vercel/next.js")    |
| `topic`        | str  | Focus area (e.g., "routing", "hooks")    |
| `mode`         | str  | "code" for API refs, "info" for guides   |
| `page`         | int  | Page number (1-10)                       |
| `version`      | str  | Specific version tag (e.g., "v15.1.8")   |

## Error Handling

The client handles common errors:

- **401 Unauthorized**: Invalid API key
- **404 Not Found**: Library doesn't exist
- **429 Rate Limited**: Automatic retry with exponential backoff
- **Network errors**: Descriptive error messages

## Migration from MCP Server

If you were using the Context7 MCP server, this skill provides equivalent functionality:

| MCP Tool             | Skill Method         |
| -------------------- | -------------------- |
| `resolve-library-id` | `search_library()`   |
| `get-library-docs`   | `get_library_docs()` |

The skill uses the same API key (`CONTEXT7_API_KEY`) as the MCP server.

## Rate Limits

- Rate limits depend on your Context7 plan
- The client automatically retries on 429 responses
- Check your usage at [context7.com/dashboard](https://context7.com/dashboard)

## Support

- Context7 Documentation: [context7.com/docs](https://context7.com/docs)
- API Guide: [context7.com/docs/api-guide](https://context7.com/docs/api-guide.md)
- Dashboard: [context7.com/dashboard](https://context7.com/dashboard)

## Version

- Skill Version: 1.0.0
- API Version: v2
