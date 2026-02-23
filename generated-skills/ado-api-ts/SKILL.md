---
name: ado-api-ts
description: Azure DevOps REST API client (TypeScript) - USE ado.ts CLI or ado_client.ts
---

# Azure DevOps API Skill (TypeScript)

## CRITICAL: How to Use This Skill

**ALWAYS use the CLI (`ado.ts`) or TypeScript client (`ado_client.ts`) - NEVER compose raw curl/HTTP requests.**

### Path Resolution (IMPORTANT)

Before running any command, determine the full path to this skill's directory (where this SKILL.md file is located). **NEVER use bare `ado.ts` or relative paths like `generated-skills/ado-api-ts/ado.ts`** - they will fail if the current working directory is not the source repo.

Common install locations:
- **User-level**: `~/.claude/skills/ado-api-ts/`
- **Project-level**: `.claude/skills/ado-api-ts/`
- **Source repo**: `generated-skills/ado-api-ts/`

### Option 1: CLI (Simplest)

```bash
npx tsx ~/.claude/skills/ado-api-ts/ado.ts <command> [args...]
```

Substitute the path above with your actual install location.

### Option 2: TypeScript Client (For Complex Scripts)

```bash
npx tsx -e "
import { AzureDevOpsClient } from './ado_client.js';
const client = new AzureDevOpsClient();
const result = await client.getWorkItem('PROJECT', 12345);
console.log(JSON.stringify(result, null, 2));
"
```

Note: The `./ado_client.js` import is relative to the script location. When using `npx tsx -e`, run from the skill directory or use `npx tsx` with the full script path.

**Environment variables required:**
- `ADO_ORGANIZATION` - Your Azure DevOps organization name
- `ADO_PAT` - Personal Access Token

---

## ADO Linking Syntax (CRITICAL)

When composing text content that will be posted to Azure DevOps (comments, descriptions, `System.History` fields), use the correct prefix syntax so ADO creates clickable links:

| Reference Type | Prefix | Example | Result |
|---------------|--------|---------|--------|
| Work Item | `#` | `#3445` | Clickable link to work item 3445 |
| Pull Request | `!` | `!3445` | Clickable link to PR 3445 |

**Do / Don't:**

| Correct | Incorrect | Why |
|---------|-----------|-----|
| `Fixed in !123` | `Fixed in PR #123` | `#123` links to **work item** 123, not PR 123 |
| `See #42731 for details` | `See WI 42731` | `#42731` creates a clickable link; plain text does not |
| `Linked to !456 and #789` | `Linked to PR 456 and WI 789` | Always use prefix syntax for clickable references |

> **NEVER** use `#` to reference pull requests. `#` is for work items ONLY. Use `!` for PRs.

This syntax applies to all text posted to ADO: work item comments, PR thread comments, PR descriptions, `System.History` fields, and link comments. It does NOT apply to CLI arguments, filenames, or terminal output.

---

## Auto-Resolution

When a command requires a `<project>` argument and you pass a **numeric ID** as the first argument instead, the CLI automatically resolves the project (and repo for PR commands) by querying the ADO API.

```bash
# Instead of: npx tsx ado.ts get-pr "UMC Food Ministry" "dcab2b26-..." 3395
npx tsx ado.ts get-pr 3395

# Instead of: npx tsx ado.ts get-work-item "UMC Food Ministry" 45234
npx tsx ado.ts get-work-item 45234

# Instead of: npx tsx ado.ts get-pr-threads "UMC Food Ministry" "dcab2b26-..." 3395
npx tsx ado.ts get-pr-threads 3395

# Instead of: npx tsx ado.ts add-pr-comment "UMC Food Ministry" "dcab2b26-..." 3395 "$COMMENT"
COMMENT=$(cat /tmp/ado-comment-pr-3395.md) && npx tsx ado.ts add-pr-comment 3395 "$COMMENT"
```

**Supported commands:**
- **PR commands** (auto-resolves project + repo): `get-pr`, `get-pr-threads`, `add-pr-comment`
- **Work item commands** (auto-resolves project): `get-work-item`, `update-work-item`, `delete-work-item`, `get-comments`, `add-comment`

You can still pass the project explicitly if preferred.

---

## Posting Comments (Required Workflow)

**ALWAYS write comments to a `/tmp` file first, then read via `cat` when posting.** This ensures proper handling of multiline markdown, special characters, and ADO linking syntax. Never pass comment text as an inline CLI argument.

### File Naming Convention

| Type | Filename Pattern | Example |
|------|-----------------|---------|
| PR comment | `/tmp/ado-comment-pr-{id}.md` | `/tmp/ado-comment-pr-3445.md` |
| Work item comment | `/tmp/ado-comment-wi-{id}.md` | `/tmp/ado-comment-wi-42731.md` |

### Workflow

**PR Comment:**

```bash
# Step 1: Write comment content to /tmp/ado-comment-pr-3445.md using the Write tool

# Step 2: Post the comment
COMMENT=$(cat /tmp/ado-comment-pr-3445.md) && npx tsx ado.ts add-pr-comment 3445 "$COMMENT"
```

**Work Item Comment:**

```bash
# Step 1: Write comment content to /tmp/ado-comment-wi-42731.md using the Write tool

# Step 2: Post the comment
COMMENT=$(cat /tmp/ado-comment-wi-42731.md) && npx tsx ado.ts add-comment 42731 "$COMMENT"
```

### Markdown Rules for Comment Files

When writing the markdown file to `/tmp`:

- Use `#` to reference work items (e.g., `#1234`) - creates proper ADO links
- Use `!` to reference PRs (e.g., `!3445`) - creates proper ADO links
- **NEVER** use `#` to reference pull requests - `#` is for work items only (see [ADO Linking Syntax](#ado-linking-syntax-critical) above)
- **NEVER** use the em-dash character. Always use regular hyphen/dash (`-`)

### Cleanup

After a successful post, remove the `/tmp` file to avoid stale content:

```bash
rm /tmp/ado-comment-pr-3445.md
# or
rm /tmp/ado-comment-wi-42731.md
```

---

## @Mentions in Comments

When a comment needs to mention (tag) an ADO user, resolve the mention BEFORE writing the `/tmp` comment file.

### Mention Format

Use markdown mention syntax in the comment body:

```
@<userID>
```

Where `userID` is the identity GUID returned by `get-user-by-email` or `search-users-by-name`.

### Email-Based Mentions

When you see `@email@domain.com` in text you intend to write as a comment:

1. Look up the user:
   ```bash
   npx tsx ado.ts get-user-by-email "scott@redhawk-tech.com"
   ```
2. Present the result to the user for confirmation.
3. After confirmation, use `@<id>` in the comment where `id` is from the response.

### Name-Based Mentions

When the user says "tag Scott Schulz" or "mention Scott":

1. Search for users:
   ```bash
   npx tsx ado.ts search-users-by-name "Scott"
   ```
2. The command returns an array of matching users. **ALWAYS present ALL matches to the user and ask them to pick** - never auto-select, even for a single match.
3. After the user picks, use `@<id>` in the comment.

### Example Workflow

```
User: "Comment on PR !3445 saying great work, tag Scott Schulz"

Step 1 - Search for user:
  npx tsx ado.ts search-users-by-name "Scott Schulz"
  -> Returns: [{ id: "62a9f1bd-...", displayName: "Scott Schulz", email: "scott@company.com" }]

Step 2 - Present match(es) to user, ask them to confirm.

Step 3 - Write /tmp/ado-comment-pr-3445.md with resolved mention:
  Great work @<62a9f1bd-...>!

Step 4 - Post:
  COMMENT=$(cat /tmp/ado-comment-pr-3445.md) && npx tsx ado.ts add-pr-comment 3445 "$COMMENT"
```

### Multiple Mentions

When a comment has multiple @mentions, resolve each one before writing the `/tmp` file. Run all lookups first, present results to user, then write the file with all resolved mentions.

### Fallback

If a user lookup fails (no matches found), write the mention as plain text (e.g., `@Scott Schulz`) and inform the user that the mention could not be resolved.

---

## ADO User Search Rules

- When searching for users by name, ALWAYS use the user's exact input text. Never autocorrect, fix spelling, or assume typos in names. "Scot" and "Scott" are different searches that return different results. If ambiguous, search with the exact text first, then ask the user if they want a broader search.

---

## CLI Commands (Recommended)

> **Note:** Examples below use bare `ado.ts` for brevity. Always use the full
> path to your skill installation (e.g., `~/.claude/skills/ado-api-ts/ado.ts`).

### Work Items

```bash
# Get work item (auto-resolves project)
npx tsx ado.ts get-work-item 42731
# Or with explicit project:
npx tsx ado.ts get-work-item "My Project" 42731

# Create work item (project required - no ID to resolve from)
npx tsx ado.ts create-work-item "My Project" "Bug" '{"System.Title":"Bug title","Microsoft.VSTS.Common.Priority":2}'

# Update work item (auto-resolves project)
npx tsx ado.ts update-work-item 42731 '{"System.State":"Resolved"}'

# Delete work item (auto-resolves project)
npx tsx ado.ts delete-work-item 42731

# Run WIQL query (project required)
npx tsx ado.ts query "My Project" "SELECT [System.Id] FROM WorkItems WHERE [System.State] = 'Active'"

# Get work item comments (auto-resolves project)
npx tsx ado.ts get-comments 42731

# Add work item comment (auto-resolves project)
# First write comment to /tmp/ado-comment-wi-42731.md, then:
COMMENT=$(cat /tmp/ado-comment-wi-42731.md) && npx tsx ado.ts add-comment 42731 "$COMMENT"
```

### Git / Pull Requests

```bash
# List repositories (project required)
npx tsx ado.ts list-repos "My Project"

# List pull requests (project + repo required)
npx tsx ado.ts list-prs "My Project" "repo-id"

# Get a pull request (auto-resolves project + repo)
npx tsx ado.ts get-pr 3395

# Get PR comment threads (auto-resolves project + repo)
npx tsx ado.ts get-pr-threads 3395

# Add PR comment (auto-resolves project + repo)
# First write comment to /tmp/ado-comment-pr-3395.md, then:
COMMENT=$(cat /tmp/ado-comment-pr-3395.md) && npx tsx ado.ts add-pr-comment 3395 "$COMMENT"

# List branches (project + repo required)
npx tsx ado.ts list-branches "My Project" "repo-id"

# List commits (project + repo required)
npx tsx ado.ts list-commits "My Project" "repo-id"

# List tags (project + repo required)
npx tsx ado.ts list-tags "My Project" "repo-id"
```

### Pipelines

```bash
# List pipelines
npx tsx ado.ts list-pipelines "My Project"

# Run a pipeline
npx tsx ado.ts run-pipeline "My Project" 42

# Get pipeline run status
npx tsx ado.ts get-pipeline-run "My Project" 42 100

# List builds
npx tsx ado.ts list-builds "My Project"
```

### Projects

```bash
# List all projects
npx tsx ado.ts list-projects

# Get project details
npx tsx ado.ts get-project "My Project"

# List teams
npx tsx ado.ts list-teams "My Project"
```

### Identity

```bash
# Look up user by email (returns ID for PR reviewers and comment mentions)
npx tsx ado.ts get-user-by-email "user@example.com"

# Search users by display name (returns array of matches for disambiguation)
npx tsx ado.ts search-users-by-name "Scott"

# With max results limit
npx tsx ado.ts search-users-by-name "Scott" 50
```

---

## TypeScript Client Examples

> **Note:** Examples below assume you are running from the skill directory or
> using `npx tsx` with the full path to the script. Imports use `./ado_client.js`
> (relative to the script location).

### Get Work Item

```bash
npx tsx -e "
import { AzureDevOpsClient } from './ado_client.js';
const client = new AzureDevOpsClient();
const result = await client.getWorkItem('My Project', 42731);
console.log(JSON.stringify(result, null, 2));
"
```

### Query Work Items (WIQL)

```bash
npx tsx -e "
import { AzureDevOpsClient } from './ado_client.js';
const client = new AzureDevOpsClient();
const result = await client.queryWorkItems('My Project', \`
  SELECT [System.Id], [System.Title], [System.State]
  FROM WorkItems
  WHERE [System.TeamProject] = @project
    AND [System.WorkItemType] = 'Bug'
    AND [System.State] = 'Active'
  ORDER BY [System.Id] DESC
\`, 10);
console.log(JSON.stringify(result, null, 2));
"
```

### Add PR Comment

```bash
npx tsx -e "
import * as fs from 'fs';
import { AzureDevOpsClient } from './ado_client.js';
const client = new AzureDevOpsClient();
const comment = fs.readFileSync('/tmp/ado-comment-pr-123.md', 'utf-8');
const result = await client.addPullRequestThread('My Project', 'repo-id', 123, comment);
console.log(JSON.stringify(result, null, 2));
"
```

### Add Inline PR Comment (File + Line)

```bash
npx tsx -e "
import * as fs from 'fs';
import { AzureDevOpsClient } from './ado_client.js';
const client = new AzureDevOpsClient();
const comment = fs.readFileSync('/tmp/ado-comment-pr-123.md', 'utf-8');
const result = await client.addPullRequestThread(
  'My Project', 'repo-id', 123,
  comment,
  'active',
  '/src/utils/helper.ts',
  42
);
console.log(JSON.stringify(result, null, 2));
"
```

### List Pull Requests

```bash
npx tsx -e "
import { AzureDevOpsClient } from './ado_client.js';
const client = new AzureDevOpsClient();
const result = await client.listPullRequests('My Project', 'repo-id', 'active');
console.log(JSON.stringify(result, null, 2));
"
```

---

## Response Format

All methods return:

```typescript
// Success
{ success: true, data: { ... } }

// Error
{ success: false, error: { status_code: 404, message: "..." } }
```

---

## Available Methods (47 total)

### Work Items (12 methods)

| Method | Description |
|--------|-------------|
| `getWorkItem(project, id)` | Get single work item |
| `getWorkItems(project, ids)` | Get multiple work items |
| `createWorkItem(project, type, fields)` | Create work item |
| `updateWorkItem(project, id, updates)` | Update work item |
| `deleteWorkItem(project, id)` | Delete work item |
| `queryWorkItems(project, wiql)` | WIQL query |
| `getWorkItemComments(project, id)` | Get comments |
| `addWorkItemComment(project, id, text)` | Add comment |
| `linkWorkItems(project, source, target, type)` | Link items |
| `getWorkItemRevisions(project, id)` | Get revisions |
| `uploadAttachment(project, name, content)` | Upload file |
| `attachToWorkItem(project, id, url)` | Attach file |

### Git (14 methods)

| Method | Description |
|--------|-------------|
| `listRepositories(project)` | List repos |
| `getRepository(project, id)` | Get repo |
| `listPullRequests(project, repo, status)` | List PRs |
| `getPullRequest(project, repo, id)` | Get PR |
| `createPullRequest(project, repo, ...)` | Create PR |
| `updatePullRequest(project, repo, id, updates)` | Update PR |
| `getPullRequestThreads(project, repo, id)` | Get PR comments |
| `addPullRequestThread(project, repo, id, ...)` | Add PR comment |
| `listCommits(project, repo)` | List commits |
| `getCommit(project, repo, id)` | Get commit |
| `listBranches(project, repo)` | List branches |
| `listTags(project, repo)` | List tags |
| `createBranch(project, repo, name, commit)` | Create branch |
| `deleteBranch(project, repo, name, commit)` | Delete branch |

### Pipelines (11 methods)

| Method | Description |
|--------|-------------|
| `listPipelines(project)` | List pipelines |
| `getPipeline(project, id)` | Get pipeline |
| `runPipeline(project, id, ref, params)` | Run pipeline |
| `getPipelineRun(project, pipe_id, run_id)` | Get run status |
| `listPipelineRuns(project, id)` | List runs |
| `getPipelineRunLogs(project, pipe, run)` | Get log list |
| `getPipelineLogContent(project, pipe, run, log)` | Get log content |
| `cancelPipelineRun(project, build_id)` | Cancel run |
| `listBuilds(project)` | List builds |
| `getBuildArtifacts(project, build_id)` | Get artifacts |
| `downloadArtifact(project, build_id, name)` | Download artifact |

### Projects (6 methods)

| Method | Description |
|--------|-------------|
| `listProjects()` | List all projects |
| `getProject(name_or_id)` | Get project details |
| `listTeams(project)` | List teams |
| `getTeamMembers(project, team_id)` | Get team members |
| `listIterations(project, team)` | List iterations |
| `listAreas(project)` | List area paths |

### Graph / Identity (4 methods)

| Method | Description |
|--------|-------------|
| `listGraphUsers(subjectTypes?, continuationToken?)` | List graph users (paginated) |
| `getGraphStorageKey(descriptor)` | Resolve descriptor to identity GUID |
| `getUserByEmail(email)` | Look up user by email (returns ID for PR reviewers/mentions) |
| `searchUsersByDisplayName(query, maxResults?)` | Search users by name (returns array for disambiguation) |

---

## Files in This Skill

| File | Purpose |
|------|---------|
| `SKILL.md` | This file - quick reference |
| `ado.ts` | **CLI WRAPPER - SIMPLEST TO USE** |
| `ado_client.ts` | TypeScript client for complex scripts |
| `ado-api-reference.md` | Full API endpoint reference with types |
| `HOW_TO_USE.md` | Detailed usage examples |
| `README.md` | Installation guide |
| `package.json` | Dependencies (tsx, typescript) |
| `tsconfig.json` | TypeScript configuration |

---

## Troubleshooting

**"ERR_MODULE_NOT_FOUND" or "Cannot find module" error:**
```bash
# You're using a relative path from the wrong directory.
# Always use the full path to this skill's install location:
npx tsx ~/.claude/skills/ado-api-ts/ado.ts list-projects
# NOT: npx tsx ado.ts list-projects
# NOT: npx tsx generated-skills/ado-api-ts/ado.ts list-projects
```

**"tsx not found" error:**
```bash
# tsx is auto-downloaded by npx on first run
# Or install globally: npm install -g tsx
npx tsx ado.ts list-projects
```

**Authentication failed:**
```bash
# Check environment variables
echo $ADO_ORGANIZATION
echo $ADO_PAT
```

**Node.js version:**
```bash
# Requires Node.js 18+ for native fetch
node --version
```

---

**Version**: 1.0.0 | **API**: 7.1 | **Runtime**: Node.js 18+ | **Last Updated**: 2026
