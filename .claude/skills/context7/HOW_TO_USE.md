# How to Use This Skill

Hey Claude--I just added the "context7" skill. Can you look up documentation for a library?

## Example Invocations

### Search for a Library

**Example 1:**
Hey Claude--I just added the "context7" skill. Can you find the Context7 library ID for FastAPI?

**Example 2:**
Hey Claude--I just added the "context7" skill. Search for the React library on Context7.

### Get Code Examples

**Example 3:**
Hey Claude--I just added the "context7" skill. Get code examples for Next.js routing.

**Example 4:**
Hey Claude--I just added the "context7" skill. Show me authentication examples from the Supabase documentation.

### Get Conceptual Documentation

**Example 5:**
Hey Claude--I just added the "context7" skill. Fetch the conceptual guide for React Server Components.

**Example 6:**
Hey Claude--I just added the "context7" skill. Get the architecture overview for the Prisma ORM.

### Version-Specific Documentation

**Example 7:**
Hey Claude--I just added the "context7" skill. Get Next.js v14 App Router documentation.

**Example 8:**
Hey Claude--I just added the "context7" skill. Show me React 18 hooks documentation.

## What to Provide

- **Library name** (for search): "next.js", "react", "fastapi", "prisma"
- **Library ID** (for docs): "/vercel/next.js", "/facebook/react"
- **Topic** (optional): "routing", "hooks", "authentication", "forms"
- **Mode** (optional): "code" for API references, "info" for conceptual guides
- **Version** (optional): "v15.1.8", "v18.2.0"

## What You'll Get

- **Search Results**: List of matching libraries with IDs, descriptions, and coverage stats
- **Code Snippets**: Function signatures, usage examples, API references
- **Documentation**: Conceptual explanations, architecture guides, best practices
- **Pagination Info**: Navigate through large documentation sets

## Typical Workflow

1. **Search first**: Find the correct library ID
   ```
   "Search for Next.js on Context7"
   ```

2. **Get relevant docs**: Use the library ID with a topic
   ```
   "Get Next.js routing examples using library ID /vercel/next.js"
   ```

3. **Paginate if needed**: Request more pages for comprehensive coverage
   ```
   "Get page 2 of the Next.js routing documentation"
   ```

## Environment Setup

Ensure your `CONTEXT7_API_KEY` environment variable is set:

```bash
export CONTEXT7_API_KEY="your-api-key-here"
```

Get your API key at: https://context7.com/dashboard
