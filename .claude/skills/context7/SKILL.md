---
name: context7
description: Retrieves up-to-date library documentation from Context7 API for code examples, API references, and conceptual guides
---

# Context7 Documentation Retrieval

This skill provides direct access to the Context7 API for retrieving up-to-date documentation, code examples, and API references for software libraries. It replaces the need for the Context7 MCP server by wrapping the REST API directly.

## Capabilities

- **Library Search**: Find libraries by name and get Context7-compatible library IDs
- **Code Snippets**: Retrieve API references, code examples, and function signatures
- **Documentation Content**: Fetch conceptual guides, tutorials, and narrative information
- **Version-Specific Docs**: Pin documentation to specific library versions
- **Topic Filtering**: Focus on specific topics (routing, hooks, authentication, etc.)
- **Pagination**: Navigate through large documentation sets

## Input Requirements

**For Library Search**:
- Library name to search for (e.g., "next.js", "react", "fastapi")

**For Documentation Retrieval**:
- Library ID in format `/org/project` (e.g., `/vercel/next.js`, `/facebook/react`)
- Optional: `topic` - Focus on specific topic (e.g., "routing", "hooks")
- Optional: `mode` - "code" for API references, "info" for conceptual guides
- Optional: `page` - Page number for pagination (1-10)
- Optional: `version` - Specific version tag (e.g., "v15.1.8")

## Output Formats

**Search Results**:
```json
{
  "libraries": [
    {
      "id": "/vercel/next.js",
      "name": "Next.js",
      "description": "The React Framework for the Web",
      "code_snippets": 1250,
      "trust_score": "High"
    }
  ]
}
```

**Documentation Snippets**:
```json
{
  "snippets": [...],
  "pagination": {
    "page": 1,
    "totalPages": 5,
    "hasNext": true
  }
}
```

## How to Use

**Search for a library:**
"Find the Context7 library ID for Next.js"

**Get code examples:**
"Get code examples for Next.js routing from Context7"

**Get conceptual documentation:**
"Fetch the Next.js App Router architecture documentation"

**Get version-specific docs:**
"Get React 18 hooks documentation from Context7"

## Scripts

- `context7_client.py`: Main API client for all Context7 operations

## Environment Variables

**Required**:
- `CONTEXT7_API_KEY`: Your Context7 API key (get it from context7.com/dashboard)

## Best Practices

1. **Always search first**: Use `search_library()` to get the correct library ID before fetching docs
2. **Use topics**: Specify topics to get more relevant, focused results
3. **Choose the right mode**: Use "code" for API references, "info" for conceptual understanding
4. **Handle pagination**: Check `hasNext` and fetch additional pages when needed
5. **Pin versions**: Use specific versions for consistent results in production

## Rate Limits

- Rate limits depend on your Context7 plan
- Implement exponential backoff for 429 responses
- Cache responses locally when appropriate (docs don't change frequently)

## Limitations

- Requires valid Context7 API key
- Some libraries may have limited documentation coverage
- Rate limits apply based on your plan
- Not all libraries have version-specific documentation
