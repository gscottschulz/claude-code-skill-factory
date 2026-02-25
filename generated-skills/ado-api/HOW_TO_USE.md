# How to Use: Azure DevOps API Skill

## Setup

1. Set environment variables:

```bash
export ADO_ORGANIZATION="your-org-name"
export ADO_PAT="your-personal-access-token"
```

2. Install dependencies (if not already installed):

```bash
npm install --prefix /path/to/ado-api
```

> **IMPORTANT: Do NOT use the Azure CLI (`az`).** This skill does not depend on or use `az devops`, `az repos`, `az pipelines`, `az boards`, `az artifacts`, or any `az` subcommand. All operations go through the skill's own `ado.ts` CLI wrapper or `ado_client.ts` TypeScript client using direct REST API calls.

---

## Path Resolution

All CLI examples below use bare `ado.ts` for brevity. Always use the full path to the installed skill location:

- **User-level**: `~/.claude/skills/ado-api/ado.ts`
- **Project-level**: `.claude/skills/ado-api/ado.ts`

Example: `npx tsx ~/.claude/skills/ado-api/ado.ts get-work-item 42731`

> **ADO Linking Syntax**: In all text posted to ADO, use `#` for work items (`#1234`) and `!` for PRs (`!3445`). Never use `#` to reference a PR. See SKILL.md for full details.

---

## CLI Usage

All CLI commands follow the pattern:

```bash
npx tsx ado.ts <command> [args...]
```

### Work Item Operations

```bash
# Get a work item with all fields
npx tsx ado.ts get-work-item "My Project" 42731

# Create a bug
npx tsx ado.ts create-work-item "My Project" "Bug" '{"System.Title":"Login fails on Safari","Microsoft.VSTS.Common.Priority":1}'

# Create a user story
npx tsx ado.ts create-work-item "My Project" "User Story" '{"System.Title":"Add dark mode","System.Description":"<div>As a user I want dark mode</div>","Microsoft.VSTS.Scheduling.StoryPoints":5}'

# Update work item state
npx tsx ado.ts update-work-item "My Project" 42731 '{"System.State":"Resolved","System.History":"Fixed in PR !123"}'

# Delete a work item (moves to recycle bin)
npx tsx ado.ts delete-work-item "My Project" 42731

# Query active bugs assigned to me
npx tsx ado.ts query "My Project" "SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.WorkItemType] = 'Bug' AND [System.State] = 'Active' AND [System.AssignedTo] = @me"

# Get comments on a work item
npx tsx ado.ts get-comments "My Project" 42731

# Add a comment
# First write comment to /tmp/ado-comment-wi-42731.md, then:
COMMENT=$(cat /tmp/ado-comment-wi-42731.md) && npx tsx ado.ts add-comment "My Project" 42731 "$COMMENT"
```

### Pull Request Operations

```bash
# List all active PRs in a repo
npx tsx ado.ts list-prs "My Project" "my-repo-id"

# Get PR details
npx tsx ado.ts get-pr "My Project" "my-repo-id" 456

# Read all comment threads on a PR
npx tsx ado.ts get-pr-threads "My Project" "my-repo-id" 456

# Post a general comment on a PR
# First write comment to /tmp/ado-comment-pr-456.md, then:
COMMENT=$(cat /tmp/ado-comment-pr-456.md) && npx tsx ado.ts add-pr-comment "My Project" "my-repo-id" 456 "$COMMENT"
```

### Repository Operations

```bash
# List all repos in a project
npx tsx ado.ts list-repos "My Project"

# List branches
npx tsx ado.ts list-branches "My Project" "my-repo-id"

# List recent commits
npx tsx ado.ts list-commits "My Project" "my-repo-id"

# List tags
npx tsx ado.ts list-tags "My Project" "my-repo-id"
```

### Pipeline Operations

```bash
# List all pipelines
npx tsx ado.ts list-pipelines "My Project"

# Trigger a pipeline run
npx tsx ado.ts run-pipeline "My Project" 42

# Check run status
npx tsx ado.ts get-pipeline-run "My Project" 42 100

# List recent builds
npx tsx ado.ts list-builds "My Project"
```

### Project Operations

```bash
# List all projects in the organization
npx tsx ado.ts list-projects

# Get project details
npx tsx ado.ts get-project "My Project"

# List teams in a project
npx tsx ado.ts list-teams "My Project"
```

### Identity Operations

```bash
# Look up a user by email address
# Returns the identity GUID (storage key) for PR reviewer assignment and comment mentions
npx tsx ado.ts get-user-by-email "jane.smith@company.com"

# Search users by display name (returns array of matches)
npx tsx ado.ts search-users-by-name "Jane"

# Search with max results limit
npx tsx ado.ts search-users-by-name "Jane" 50
```

---

## TypeScript Client Usage

For complex workflows, import the client directly:

### Basic Usage

```typescript
import { AzureDevOpsClient } from "./ado_client.js";

// Uses ADO_ORGANIZATION and ADO_PAT from environment
const client = new AzureDevOpsClient();

// Or pass credentials directly
const client2 = new AzureDevOpsClient({
  organization: "my-org",
  pat: "my-pat-token",
});
```

### Create Bug with Comment

```typescript
import * as fs from 'fs';
import { AzureDevOpsClient } from "./ado_client.js";

const client = new AzureDevOpsClient();

// Create the bug
const bug = await client.createWorkItem("My Project", "Bug", {
  "System.Title": "Login page crashes on Safari 17",
  "Microsoft.VSTS.TCM.ReproSteps": "<div>1. Open Safari 17<br>2. Navigate to /login<br>3. Click Sign In</div>",
  "Microsoft.VSTS.Common.Priority": 1,
});

if (bug.success) {
  const bugId = bug.data.id;
  console.log(`Created bug #${bugId}`);

  // Add a comment
  const comment = fs.readFileSync(`/tmp/ado-comment-wi-${bugId}.md`, 'utf-8');
  await client.addWorkItemComment("My Project", bugId, comment);
}
```

### Review a Pull Request

```typescript
import * as fs from 'fs';
import { AzureDevOpsClient } from "./ado_client.js";

const client = new AzureDevOpsClient();
const project = "My Project";
const repoId = "my-repo-id";
const prId = 456;

// Get PR details
const pr = await client.getPullRequest(project, repoId, prId);
console.log(`PR: ${pr.data.title} (${pr.data.status})`);

// Read existing comments
const threads = await client.getPullRequestThreads(project, repoId, prId);
console.log(`${threads.data.value.length} comment threads`);

// Add a general comment
const generalComment = fs.readFileSync(`/tmp/ado-comment-pr-${prId}.md`, 'utf-8');
await client.addPullRequestThread(project, repoId, prId, generalComment);

// Add an inline comment on a specific file and line
const inlineComment = fs.readFileSync(`/tmp/ado-comment-pr-${prId}.md`, 'utf-8');
await client.addPullRequestThread(
  project, repoId, prId,
  inlineComment,
  "active",
  "/src/utils/helper.ts",
  42
);
```

### Query and Update Work Items

```typescript
import { AzureDevOpsClient } from "./ado_client.js";

const client = new AzureDevOpsClient();

// Find active bugs
const result = await client.queryWorkItems("My Project", `
  SELECT [System.Id], [System.Title]
  FROM WorkItems
  WHERE [System.TeamProject] = @project
    AND [System.WorkItemType] = 'Bug'
    AND [System.State] = 'Active'
  ORDER BY [Microsoft.VSTS.Common.Priority] ASC
`, 50);

if (result.success) {
  const ids = result.data.workItems.map((wi: any) => wi.id);

  // Fetch full details for all found work items
  if (ids.length > 0) {
    const items = await client.getWorkItems("My Project", ids);
    for (const item of items.data.value) {
      console.log(`#${item.id}: ${item.fields["System.Title"]}`);
    }
  }
}
```

### Look Up User and Add as PR Reviewer

```typescript
import { AzureDevOpsClient } from "./ado_client.js";

const client = new AzureDevOpsClient();

// Look up a user by email
const user = await client.getUserByEmail("jane.smith@company.com");
if (user.success) {
  console.log(`Found: ${user.data.displayName} (${user.data.id})`);

  // Use the ID to create a PR with that user as reviewer
  await client.createPullRequest(
    "My Project", "my-repo-id",
    "feature/new-login", "main",
    "Add new login flow",
    "Redesigned login page with SSO support",
    [user.data.id]  // reviewer ID from getUserByEmail
  );
}
```

### Monitor a Pipeline Run

```typescript
import { AzureDevOpsClient } from "./ado_client.js";

const client = new AzureDevOpsClient();

// Start a pipeline
const run = await client.runPipeline("My Project", 42, "refs/heads/main");
const runId = run.data.id;
console.log(`Started pipeline run #${runId}`);

// Poll until complete
let status = run.data;
while (status.state !== "completed") {
  await new Promise((resolve) => setTimeout(resolve, 10000));
  const updated = await client.getPipelineRun("My Project", 42, runId);
  status = updated.data;
  console.log(`Status: ${status.state}`);
}

console.log(`Result: ${status.result}`);

// If failed, get logs
if (status.result === "failed") {
  const logs = await client.getPipelineRunLogs("My Project", 42, runId);
  console.log("Log entries:", logs.data.logs.length);
}
```

---

## Response Format

Every method returns a consistent format:

```typescript
// Success
{
  success: true,
  data: { /* API response */ }
}

// Error
{
  success: false,
  error: {
    status_code: 404,
    message: "TF401019: The specified work item does not exist."
  }
}
```

Check `result.success` before accessing `result.data`.

---

## Common WIQL Queries

```sql
-- Active bugs assigned to me
SELECT [System.Id], [System.Title], [System.State]
FROM WorkItems
WHERE [System.TeamProject] = @project
  AND [System.WorkItemType] = 'Bug'
  AND [System.State] = 'Active'
  AND [System.AssignedTo] = @me

-- Work items modified in last 7 days
SELECT [System.Id], [System.Title], [System.ChangedDate]
FROM WorkItems
WHERE [System.TeamProject] = @project
  AND [System.ChangedDate] >= @today - 7
ORDER BY [System.ChangedDate] DESC

-- Current sprint items
SELECT [System.Id], [System.Title], [System.State]
FROM WorkItems
WHERE [System.TeamProject] = @project
  AND [System.IterationPath] = @currentIteration
  AND [System.WorkItemType] IN ('User Story', 'Bug', 'Task')
```
