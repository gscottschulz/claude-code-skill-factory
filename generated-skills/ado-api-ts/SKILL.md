---
name: ado-api-ts
description: Azure DevOps REST API client (TypeScript) - USE ado.ts CLI or ado_client.ts
---

# Azure DevOps API Skill (TypeScript)

## CRITICAL: How to Use This Skill

**ALWAYS use the CLI (`ado.ts`) or TypeScript client (`ado_client.ts`) - NEVER compose raw curl/HTTP requests.**

### Option 1: CLI (Simplest)

```bash
npx tsx generated-skills/ado-api-ts/ado.ts <command> [args...]
```

### Option 2: TypeScript Client (For Complex Scripts)

```bash
npx tsx -e "
import { AzureDevOpsClient } from './generated-skills/ado-api-ts/ado_client.js';
const client = new AzureDevOpsClient();
const result = await client.getWorkItem('PROJECT', 12345);
console.log(JSON.stringify(result, null, 2));
"
```

**Environment variables required:**
- `ADO_ORGANIZATION` - Your Azure DevOps organization name
- `ADO_PAT` - Personal Access Token

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

# Instead of: npx tsx ado.ts add-pr-comment "UMC Food Ministry" "dcab2b26-..." 3395 "LGTM!"
npx tsx ado.ts add-pr-comment 3395 "LGTM!"
```

**Supported commands:**
- **PR commands** (auto-resolves project + repo): `get-pr`, `get-pr-threads`, `add-pr-comment`
- **Work item commands** (auto-resolves project): `get-work-item`, `update-work-item`, `delete-work-item`, `get-comments`, `add-comment`

You can still pass the project explicitly if preferred.

---

## CLI Commands (Recommended)

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
npx tsx ado.ts add-comment 42731 "My comment here"
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
npx tsx ado.ts add-pr-comment 3395 "LGTM!"

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

---

## TypeScript Client Examples

### Get Work Item

```bash
npx tsx -e "
import { AzureDevOpsClient } from './generated-skills/ado-api-ts/ado_client.js';
const client = new AzureDevOpsClient();
const result = await client.getWorkItem('My Project', 42731);
console.log(JSON.stringify(result, null, 2));
"
```

### Query Work Items (WIQL)

```bash
npx tsx -e "
import { AzureDevOpsClient } from './generated-skills/ado-api-ts/ado_client.js';
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
import { AzureDevOpsClient } from './generated-skills/ado-api-ts/ado_client.js';
const client = new AzureDevOpsClient();
const result = await client.addPullRequestThread('My Project', 'repo-id', 123, 'Great work!');
console.log(JSON.stringify(result, null, 2));
"
```

### Add Inline PR Comment (File + Line)

```bash
npx tsx -e "
import { AzureDevOpsClient } from './generated-skills/ado-api-ts/ado_client.js';
const client = new AzureDevOpsClient();
const result = await client.addPullRequestThread(
  'My Project', 'repo-id', 123,
  'Consider using const here.',
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
import { AzureDevOpsClient } from './generated-skills/ado-api-ts/ado_client.js';
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

## Available Methods (43 total)

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
