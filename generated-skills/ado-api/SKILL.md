# Azure DevOps REST API v7.1 Skill

Comprehensive skill for interacting with Azure DevOps REST API version 7.1. Covers Work Items, Git, Pipelines, and Projects APIs with TypeScript patterns, authentication, error handling, and rate limiting.

---

## Quick Start

```typescript
// Environment variables required
const organization = process.env.ADO_ORGANIZATION;
const pat = process.env.ADO_PAT;

// Base URL pattern
const baseUrl = `https://dev.azure.com/${organization}`;

// Authentication header
const authToken = Buffer.from(`:${pat}`).toString('base64');
const headers = {
  Authorization: `Basic ${authToken}`,
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

// API version query parameter
const apiVersion = '7.1';
```

---

## Table of Contents

1. [Authentication](#authentication)
2. [Configuration](#configuration)
3. [Work Items API](#work-items-api)
4. [Git API](#git-api)
5. [Pipelines API](#pipelines-api)
6. [Projects API](#projects-api)
7. [WIQL Reference](#wiql-reference)
8. [Error Handling](#error-handling)
9. [Rate Limiting](#rate-limiting)
10. [TypeScript Client Pattern](#typescript-client-pattern)

---

## Authentication

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ADO_ORGANIZATION` | Azure DevOps organization name | Yes |
| `ADO_PAT` | Personal Access Token | Yes |

### PAT Scopes Required

| Scope | Operations |
|-------|------------|
| `vso.work` | Read work items |
| `vso.work_write` | Create/update work items |
| `vso.code` | Read repositories, commits, branches |
| `vso.code_write` | Create branches, push commits |
| `vso.code_manage` | Manage pull requests |
| `vso.build` | Read pipelines and builds |
| `vso.build_execute` | Run pipelines, queue builds |
| `vso.project` | Read projects and teams |

### Authentication Header

```typescript
function createAuthHeader(pat: string): string {
  const authToken = Buffer.from(`:${pat}`).toString('base64');
  return `Basic ${authToken}`;
}
```

---

## Configuration

### Recommended Defaults

```typescript
interface AzureDevOpsClientConfig {
  organization: string;       // From ADO_ORGANIZATION
  pat: string;               // From ADO_PAT
  apiVersion: string;        // '7.1'
  timeout: number;           // 30000 (30 seconds)
  retryConfig: {
    maxRetries: number;      // 3
    baseDelay: number;       // 1000 (1 second)
  };
}
```

### Base URLs

| Service | URL Pattern |
|---------|-------------|
| Core APIs | `https://dev.azure.com/{organization}` |
| VS RM (Release) | `https://vsrm.dev.azure.com/{organization}` |
| Feeds (Artifacts) | `https://feeds.dev.azure.com/{organization}` |
| VS Aex (Extensions) | `https://extmgmt.dev.azure.com/{organization}` |

---

## Work Items API

### Get Work Item

```
GET /{project}/_apis/wit/workitems/{id}?api-version=7.1
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `$expand` | string | `None`, `Relations`, `Fields`, `Links`, `All` |
| `fields` | string | Comma-separated field names |
| `asOf` | datetime | Get work item as of specific date |

**TypeScript:**

```typescript
async function getWorkItem(
  project: string,
  workItemId: number,
  expand: 'None' | 'Relations' | 'Fields' | 'Links' | 'All' = 'All'
): Promise<WorkItem> {
  const response = await httpClient.get(
    `/${project}/_apis/wit/workitems/${workItemId}`,
    {
      params: {
        'api-version': '7.1',
        '$expand': expand,
      },
    }
  );
  return response.data;
}
```

**Response:**

```json
{
  "id": 12345,
  "rev": 5,
  "fields": {
    "System.Id": 12345,
    "System.Title": "Implement feature X",
    "System.State": "Active",
    "System.WorkItemType": "User Story",
    "System.AssignedTo": {
      "displayName": "John Doe",
      "uniqueName": "john.doe@company.com"
    },
    "System.CreatedDate": "2024-01-15T10:30:00Z",
    "System.ChangedDate": "2024-01-20T14:45:00Z",
    "System.Description": "<div>Description HTML</div>",
    "Microsoft.VSTS.Common.Priority": 2,
    "Microsoft.VSTS.Scheduling.StoryPoints": 5
  },
  "relations": [...],
  "_links": {...},
  "url": "https://dev.azure.com/{org}/{project}/_apis/wit/workitems/12345"
}
```

---

### Get Multiple Work Items (Batch)

```
GET /{project}/_apis/wit/workitems?ids={ids}&api-version=7.1
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `ids` | string | Comma-separated work item IDs (max 200) |
| `$expand` | string | Expansion options |
| `fields` | string | Comma-separated field names |
| `errorPolicy` | string | `Fail` or `Omit` |

**TypeScript:**

```typescript
async function getWorkItems(
  project: string,
  ids: number[],
  fields?: string[]
): Promise<WorkItem[]> {
  const response = await httpClient.get(
    `/${project}/_apis/wit/workitems`,
    {
      params: {
        'api-version': '7.1',
        'ids': ids.join(','),
        'fields': fields?.join(','),
        'errorPolicy': 'Omit',
      },
    }
  );
  return response.data.value;
}
```

---

### Create Work Item

```
POST /{project}/_apis/wit/workitems/${type}?api-version=7.1
Content-Type: application/json-patch+json
```

**Request Body (JSON Patch):**

```json
[
  {
    "op": "add",
    "path": "/fields/System.Title",
    "value": "New work item title"
  },
  {
    "op": "add",
    "path": "/fields/System.Description",
    "value": "<div>Description</div>"
  },
  {
    "op": "add",
    "path": "/fields/System.AssignedTo",
    "value": "user@company.com"
  },
  {
    "op": "add",
    "path": "/fields/Microsoft.VSTS.Common.Priority",
    "value": 2
  }
]
```

**TypeScript:**

```typescript
interface JsonPatchOperation {
  op: 'add' | 'remove' | 'replace' | 'test';
  path: string;
  value?: unknown;
}

async function createWorkItem(
  project: string,
  workItemType: string,
  fields: Record<string, unknown>
): Promise<WorkItem> {
  const operations: JsonPatchOperation[] = Object.entries(fields).map(
    ([field, value]) => ({
      op: 'add',
      path: `/fields/${field}`,
      value,
    })
  );

  const response = await httpClient.post(
    `/${project}/_apis/wit/workitems/$${workItemType}`,
    operations,
    {
      params: { 'api-version': '7.1' },
      headers: { 'Content-Type': 'application/json-patch+json' },
    }
  );
  return response.data;
}

// Usage
const workItem = await createWorkItem('MyProject', 'User Story', {
  'System.Title': 'Implement login feature',
  'System.Description': '<div>As a user, I want to log in</div>',
  'Microsoft.VSTS.Common.Priority': 1,
  'Microsoft.VSTS.Scheduling.StoryPoints': 8,
});
```

---

### Update Work Item

```
PATCH /{project}/_apis/wit/workitems/{id}?api-version=7.1
Content-Type: application/json-patch+json
```

**TypeScript:**

```typescript
async function updateWorkItem(
  project: string,
  workItemId: number,
  updates: Record<string, unknown>
): Promise<WorkItem> {
  const operations: JsonPatchOperation[] = Object.entries(updates).map(
    ([field, value]) => ({
      op: 'replace',
      path: `/fields/${field}`,
      value,
    })
  );

  const response = await httpClient.patch(
    `/${project}/_apis/wit/workitems/${workItemId}`,
    operations,
    {
      params: { 'api-version': '7.1' },
      headers: { 'Content-Type': 'application/json-patch+json' },
    }
  );
  return response.data;
}

// Usage - Update state and add comment
await updateWorkItem('MyProject', 12345, {
  'System.State': 'Resolved',
  'System.History': 'Fixed the bug by updating the validation logic.',
});
```

---

### Delete Work Item

```
DELETE /{project}/_apis/wit/workitems/{id}?api-version=7.1
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `destroy` | boolean | `true` to permanently delete, `false` to recycle |

**TypeScript:**

```typescript
async function deleteWorkItem(
  project: string,
  workItemId: number,
  permanent: boolean = false
): Promise<void> {
  await httpClient.delete(
    `/${project}/_apis/wit/workitems/${workItemId}`,
    {
      params: {
        'api-version': '7.1',
        'destroy': permanent,
      },
    }
  );
}
```

---

### Query Work Items (WIQL)

```
POST /{project}/_apis/wit/wiql?api-version=7.1
```

**Request Body:**

```json
{
  "query": "SELECT [System.Id], [System.Title], [System.State] FROM WorkItems WHERE [System.TeamProject] = @project AND [System.WorkItemType] = 'Bug' AND [System.State] <> 'Closed' ORDER BY [Microsoft.VSTS.Common.Priority] ASC, [System.CreatedDate] DESC"
}
```

**TypeScript:**

```typescript
interface WiqlResult {
  queryType: 'flat' | 'oneHop' | 'tree';
  queryResultType: 'workItem' | 'workItemLink';
  asOf: string;
  columns: Array<{ referenceName: string; name: string; url: string }>;
  workItems: Array<{ id: number; url: string }>;
}

async function queryWorkItems(
  project: string,
  wiql: string,
  top?: number
): Promise<WiqlResult> {
  const response = await httpClient.post(
    `/${project}/_apis/wit/wiql`,
    { query: wiql },
    {
      params: {
        'api-version': '7.1',
        '$top': top,
      },
    }
  );
  return response.data;
}

// Usage - Get all active bugs
const result = await queryWorkItems(
  'MyProject',
  `SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo]
   FROM WorkItems
   WHERE [System.TeamProject] = @project
     AND [System.WorkItemType] = 'Bug'
     AND [System.State] IN ('New', 'Active')
   ORDER BY [Microsoft.VSTS.Common.Priority] ASC`,
  100
);

// Fetch full work items from IDs
const workItemIds = result.workItems.map(wi => wi.id);
const workItems = await getWorkItems('MyProject', workItemIds);
```

---

### Get Work Item Comments

```
GET /{project}/_apis/wit/workitems/{id}/comments?api-version=7.1-preview.4
```

**TypeScript:**

```typescript
interface WorkItemComment {
  id: number;
  workItemId: number;
  text: string;
  version: number;
  createdBy: IdentityRef;
  createdDate: string;
  modifiedBy: IdentityRef;
  modifiedDate: string;
}

async function getWorkItemComments(
  project: string,
  workItemId: number,
  top?: number
): Promise<WorkItemComment[]> {
  const response = await httpClient.get(
    `/${project}/_apis/wit/workitems/${workItemId}/comments`,
    {
      params: {
        'api-version': '7.1-preview.4',
        '$top': top,
      },
    }
  );
  return response.data.comments;
}
```

---

### Add Work Item Comment

```
POST /{project}/_apis/wit/workitems/{id}/comments?api-version=7.1-preview.4
```

**TypeScript:**

```typescript
async function addWorkItemComment(
  project: string,
  workItemId: number,
  text: string
): Promise<WorkItemComment> {
  const response = await httpClient.post(
    `/${project}/_apis/wit/workitems/${workItemId}/comments`,
    { text },
    {
      params: { 'api-version': '7.1-preview.4' },
    }
  );
  return response.data;
}
```

---

### Link Work Items

```
PATCH /{project}/_apis/wit/workitems/{id}?api-version=7.1
Content-Type: application/json-patch+json
```

**Link Types:**

| Link Type | Relation Name | Description |
|-----------|---------------|-------------|
| Parent | `System.LinkTypes.Hierarchy-Reverse` | Parent work item |
| Child | `System.LinkTypes.Hierarchy-Forward` | Child work item |
| Related | `System.LinkTypes.Related` | Related work item |
| Duplicate | `System.LinkTypes.Duplicate-Forward` | Duplicate of |
| Duplicate Of | `System.LinkTypes.Duplicate-Reverse` | Is duplicated by |
| Successor | `System.LinkTypes.Dependency-Forward` | Successor |
| Predecessor | `System.LinkTypes.Dependency-Reverse` | Predecessor |
| Tested By | `Microsoft.VSTS.Common.TestedBy-Forward` | Tested by test case |
| Tests | `Microsoft.VSTS.Common.TestedBy-Reverse` | Tests work item |

**TypeScript:**

```typescript
async function linkWorkItems(
  project: string,
  sourceId: number,
  targetId: number,
  linkType: string,
  comment?: string
): Promise<WorkItem> {
  const targetUrl = `https://dev.azure.com/${process.env.ADO_ORGANIZATION}/${project}/_apis/wit/workitems/${targetId}`;

  const operations: JsonPatchOperation[] = [
    {
      op: 'add',
      path: '/relations/-',
      value: {
        rel: linkType,
        url: targetUrl,
        attributes: {
          comment: comment || '',
        },
      },
    },
  ];

  const response = await httpClient.patch(
    `/${project}/_apis/wit/workitems/${sourceId}`,
    operations,
    {
      params: { 'api-version': '7.1' },
      headers: { 'Content-Type': 'application/json-patch+json' },
    }
  );
  return response.data;
}

// Usage - Create parent-child relationship
await linkWorkItems(
  'MyProject',
  12345,                                    // Parent ID
  12346,                                    // Child ID
  'System.LinkTypes.Hierarchy-Forward',    // Child link type
  'Adding task as child of user story'
);
```

---

### Get Work Item Revisions

```
GET /{project}/_apis/wit/workitems/{id}/revisions?api-version=7.1
```

**TypeScript:**

```typescript
async function getWorkItemRevisions(
  project: string,
  workItemId: number,
  top?: number,
  skip?: number
): Promise<WorkItem[]> {
  const response = await httpClient.get(
    `/${project}/_apis/wit/workitems/${workItemId}/revisions`,
    {
      params: {
        'api-version': '7.1',
        '$top': top,
        '$skip': skip,
      },
    }
  );
  return response.data.value;
}
```

---

### Upload Attachment

```
POST /{project}/_apis/wit/attachments?api-version=7.1
Content-Type: application/octet-stream
```

**TypeScript:**

```typescript
interface AttachmentReference {
  id: string;
  url: string;
}

async function uploadAttachment(
  project: string,
  fileName: string,
  content: Buffer
): Promise<AttachmentReference> {
  const response = await httpClient.post(
    `/${project}/_apis/wit/attachments`,
    content,
    {
      params: {
        'api-version': '7.1',
        'fileName': fileName,
      },
      headers: {
        'Content-Type': 'application/octet-stream',
      },
    }
  );
  return response.data;
}

// Then link attachment to work item
async function attachToWorkItem(
  project: string,
  workItemId: number,
  attachmentUrl: string,
  comment?: string
): Promise<WorkItem> {
  const operations: JsonPatchOperation[] = [
    {
      op: 'add',
      path: '/relations/-',
      value: {
        rel: 'AttachedFile',
        url: attachmentUrl,
        attributes: {
          comment: comment || '',
        },
      },
    },
  ];

  const response = await httpClient.patch(
    `/${project}/_apis/wit/workitems/${workItemId}`,
    operations,
    {
      params: { 'api-version': '7.1' },
      headers: { 'Content-Type': 'application/json-patch+json' },
    }
  );
  return response.data;
}
```

---

## Git API

### List Repositories

```
GET /{project}/_apis/git/repositories?api-version=7.1
```

**TypeScript:**

```typescript
interface GitRepository {
  id: string;
  name: string;
  url: string;
  project: TeamProjectReference;
  defaultBranch: string;
  size: number;
  remoteUrl: string;
  sshUrl: string;
  webUrl: string;
  isDisabled: boolean;
}

async function listRepositories(project: string): Promise<GitRepository[]> {
  const response = await httpClient.get(
    `/${project}/_apis/git/repositories`,
    {
      params: { 'api-version': '7.1' },
    }
  );
  return response.data.value;
}
```

---

### Get Repository

```
GET /{project}/_apis/git/repositories/{repositoryId}?api-version=7.1
```

**TypeScript:**

```typescript
async function getRepository(
  project: string,
  repositoryIdOrName: string
): Promise<GitRepository> {
  const response = await httpClient.get(
    `/${project}/_apis/git/repositories/${repositoryIdOrName}`,
    {
      params: { 'api-version': '7.1' },
    }
  );
  return response.data;
}
```

---

### List Pull Requests

```
GET /{project}/_apis/git/repositories/{repositoryId}/pullrequests?api-version=7.1
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `searchCriteria.status` | string | `active`, `abandoned`, `completed`, `all` |
| `searchCriteria.creatorId` | string | Filter by creator |
| `searchCriteria.reviewerId` | string | Filter by reviewer |
| `searchCriteria.sourceRefName` | string | Source branch (e.g., `refs/heads/feature`) |
| `searchCriteria.targetRefName` | string | Target branch (e.g., `refs/heads/main`) |
| `$top` | number | Max results |
| `$skip` | number | Skip results |

**TypeScript:**

```typescript
interface GitPullRequest {
  pullRequestId: number;
  codeReviewId: number;
  status: 'active' | 'abandoned' | 'completed';
  createdBy: IdentityRef;
  creationDate: string;
  title: string;
  description: string;
  sourceRefName: string;
  targetRefName: string;
  mergeStatus: string;
  isDraft: boolean;
  mergeId: string;
  lastMergeSourceCommit: GitCommitRef;
  lastMergeTargetCommit: GitCommitRef;
  lastMergeCommit: GitCommitRef;
  reviewers: IdentityRefWithVote[];
  url: string;
  repository: GitRepository;
}

async function listPullRequests(
  project: string,
  repositoryId: string,
  status: 'active' | 'abandoned' | 'completed' | 'all' = 'active',
  top?: number
): Promise<GitPullRequest[]> {
  const response = await httpClient.get(
    `/${project}/_apis/git/repositories/${repositoryId}/pullrequests`,
    {
      params: {
        'api-version': '7.1',
        'searchCriteria.status': status,
        '$top': top,
      },
    }
  );
  return response.data.value;
}
```

---

### Get Pull Request

```
GET /{project}/_apis/git/repositories/{repositoryId}/pullrequests/{pullRequestId}?api-version=7.1
```

**TypeScript:**

```typescript
async function getPullRequest(
  project: string,
  repositoryId: string,
  pullRequestId: number
): Promise<GitPullRequest> {
  const response = await httpClient.get(
    `/${project}/_apis/git/repositories/${repositoryId}/pullrequests/${pullRequestId}`,
    {
      params: { 'api-version': '7.1' },
    }
  );
  return response.data;
}
```

---

### Create Pull Request

```
POST /{project}/_apis/git/repositories/{repositoryId}/pullrequests?api-version=7.1
```

**Request Body:**

```json
{
  "sourceRefName": "refs/heads/feature-branch",
  "targetRefName": "refs/heads/main",
  "title": "Add new feature",
  "description": "This PR adds the new feature X",
  "isDraft": false,
  "reviewers": [
    { "id": "reviewer-guid-here" }
  ],
  "workItemRefs": [
    { "id": "12345" }
  ]
}
```

**TypeScript:**

```typescript
interface CreatePullRequestInput {
  sourceRefName: string;
  targetRefName: string;
  title: string;
  description?: string;
  isDraft?: boolean;
  reviewers?: Array<{ id: string }>;
  workItemRefs?: Array<{ id: string }>;
}

async function createPullRequest(
  project: string,
  repositoryId: string,
  input: CreatePullRequestInput
): Promise<GitPullRequest> {
  const response = await httpClient.post(
    `/${project}/_apis/git/repositories/${repositoryId}/pullrequests`,
    input,
    {
      params: { 'api-version': '7.1' },
    }
  );
  return response.data;
}

// Usage
const pr = await createPullRequest('MyProject', 'my-repo-id', {
  sourceRefName: 'refs/heads/feature/new-login',
  targetRefName: 'refs/heads/main',
  title: 'Add new login feature',
  description: 'Implements SSO login with OAuth2',
  reviewers: [{ id: 'reviewer-guid' }],
  workItemRefs: [{ id: '12345' }],
});
```

---

### Update Pull Request

```
PATCH /{project}/_apis/git/repositories/{repositoryId}/pullrequests/{pullRequestId}?api-version=7.1
```

**TypeScript:**

```typescript
interface UpdatePullRequestInput {
  title?: string;
  description?: string;
  status?: 'active' | 'abandoned' | 'completed';
  targetRefName?: string;
  isDraft?: boolean;
  autoCompleteSetBy?: { id: string };
  completionOptions?: {
    deleteSourceBranch?: boolean;
    mergeStrategy?: 'noFastForward' | 'squash' | 'rebase' | 'rebaseMerge';
    mergeCommitMessage?: string;
    transitionWorkItems?: boolean;
  };
}

async function updatePullRequest(
  project: string,
  repositoryId: string,
  pullRequestId: number,
  updates: UpdatePullRequestInput
): Promise<GitPullRequest> {
  const response = await httpClient.patch(
    `/${project}/_apis/git/repositories/${repositoryId}/pullrequests/${pullRequestId}`,
    updates,
    {
      params: { 'api-version': '7.1' },
    }
  );
  return response.data;
}

// Complete a pull request
await updatePullRequest('MyProject', 'repo-id', 123, {
  status: 'completed',
  completionOptions: {
    deleteSourceBranch: true,
    mergeStrategy: 'squash',
    mergeCommitMessage: 'Merged PR 123: Add new login feature',
    transitionWorkItems: true,
  },
});
```

---

### Get Pull Request Threads (Comments)

```
GET /{project}/_apis/git/repositories/{repositoryId}/pullrequests/{pullRequestId}/threads?api-version=7.1
```

**TypeScript:**

```typescript
interface CommentThread {
  id: number;
  publishedDate: string;
  lastUpdatedDate: string;
  comments: Comment[];
  status: 'unknown' | 'active' | 'fixed' | 'wontFix' | 'closed' | 'byDesign' | 'pending';
  threadContext: {
    filePath: string;
    rightFileStart: { line: number; offset: number };
    rightFileEnd: { line: number; offset: number };
  };
  pullRequestThreadContext: {
    changeTrackingId: number;
    iterationContext: { firstComparingIteration: number; secondComparingIteration: number };
  };
}

async function getPullRequestThreads(
  project: string,
  repositoryId: string,
  pullRequestId: number
): Promise<CommentThread[]> {
  const response = await httpClient.get(
    `/${project}/_apis/git/repositories/${repositoryId}/pullrequests/${pullRequestId}/threads`,
    {
      params: { 'api-version': '7.1' },
    }
  );
  return response.data.value;
}
```

---

### Add Pull Request Comment

```
POST /{project}/_apis/git/repositories/{repositoryId}/pullrequests/{pullRequestId}/threads?api-version=7.1
```

**TypeScript:**

```typescript
interface CreateThreadInput {
  comments: Array<{
    parentCommentId: number;
    content: string;
    commentType: 'text' | 'codeChange' | 'system';
  }>;
  status?: 'active' | 'fixed' | 'wontFix' | 'closed' | 'byDesign' | 'pending';
  threadContext?: {
    filePath: string;
    rightFileStart?: { line: number; offset: number };
    rightFileEnd?: { line: number; offset: number };
  };
}

async function addPullRequestThread(
  project: string,
  repositoryId: string,
  pullRequestId: number,
  input: CreateThreadInput
): Promise<CommentThread> {
  const response = await httpClient.post(
    `/${project}/_apis/git/repositories/${repositoryId}/pullrequests/${pullRequestId}/threads`,
    input,
    {
      params: { 'api-version': '7.1' },
    }
  );
  return response.data;
}

// Add general comment
await addPullRequestThread('MyProject', 'repo-id', 123, {
  comments: [
    {
      parentCommentId: 0,
      content: 'Great work! LGTM.',
      commentType: 'text',
    },
  ],
  status: 'closed',
});

// Add inline comment on specific file/line
await addPullRequestThread('MyProject', 'repo-id', 123, {
  comments: [
    {
      parentCommentId: 0,
      content: 'Consider using const here instead of let.',
      commentType: 'text',
    },
  ],
  status: 'active',
  threadContext: {
    filePath: '/src/utils/helper.ts',
    rightFileStart: { line: 42, offset: 1 },
    rightFileEnd: { line: 42, offset: 20 },
  },
});
```

---

### List Commits

```
GET /{project}/_apis/git/repositories/{repositoryId}/commits?api-version=7.1
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `searchCriteria.itemVersion.version` | string | Branch name |
| `searchCriteria.fromDate` | string | From date |
| `searchCriteria.toDate` | string | To date |
| `searchCriteria.author` | string | Author email |
| `searchCriteria.$top` | number | Max results |
| `searchCriteria.$skip` | number | Skip results |

**TypeScript:**

```typescript
interface GitCommit {
  commitId: string;
  author: GitUserDate;
  committer: GitUserDate;
  comment: string;
  commentTruncated: boolean;
  changeCounts: { Add: number; Edit: number; Delete: number };
  url: string;
  remoteUrl: string;
}

async function listCommits(
  project: string,
  repositoryId: string,
  branch?: string,
  top?: number
): Promise<GitCommit[]> {
  const params: Record<string, unknown> = {
    'api-version': '7.1',
  };

  if (branch) {
    params['searchCriteria.itemVersion.version'] = branch;
    params['searchCriteria.itemVersion.versionType'] = 'branch';
  }
  if (top) {
    params['searchCriteria.$top'] = top;
  }

  const response = await httpClient.get(
    `/${project}/_apis/git/repositories/${repositoryId}/commits`,
    { params }
  );
  return response.data.value;
}
```

---

### Get Commit

```
GET /{project}/_apis/git/repositories/{repositoryId}/commits/{commitId}?api-version=7.1
```

**TypeScript:**

```typescript
async function getCommit(
  project: string,
  repositoryId: string,
  commitId: string,
  changeCount?: number
): Promise<GitCommit> {
  const response = await httpClient.get(
    `/${project}/_apis/git/repositories/${repositoryId}/commits/${commitId}`,
    {
      params: {
        'api-version': '7.1',
        'changeCount': changeCount,
      },
    }
  );
  return response.data;
}
```

---

### List Branches (Refs)

```
GET /{project}/_apis/git/repositories/{repositoryId}/refs?api-version=7.1
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `filter` | string | Filter prefix (e.g., `heads/` for branches, `tags/` for tags) |
| `filterContains` | string | Filter by name containing |
| `$top` | number | Max results |

**TypeScript:**

```typescript
interface GitRef {
  name: string;           // e.g., "refs/heads/main"
  objectId: string;       // Commit SHA
  creator: IdentityRef;
  url: string;
}

async function listBranches(
  project: string,
  repositoryId: string,
  filterContains?: string
): Promise<GitRef[]> {
  const response = await httpClient.get(
    `/${project}/_apis/git/repositories/${repositoryId}/refs`,
    {
      params: {
        'api-version': '7.1',
        'filter': 'heads/',
        'filterContains': filterContains,
      },
    }
  );
  return response.data.value;
}

async function listTags(
  project: string,
  repositoryId: string
): Promise<GitRef[]> {
  const response = await httpClient.get(
    `/${project}/_apis/git/repositories/${repositoryId}/refs`,
    {
      params: {
        'api-version': '7.1',
        'filter': 'tags/',
      },
    }
  );
  return response.data.value;
}
```

---

### Create Branch

```
POST /{project}/_apis/git/repositories/{repositoryId}/refs?api-version=7.1
```

**TypeScript:**

```typescript
interface RefUpdate {
  name: string;
  oldObjectId: string;
  newObjectId: string;
}

async function createBranch(
  project: string,
  repositoryId: string,
  branchName: string,
  sourceCommitId: string
): Promise<GitRef> {
  const refUpdates: RefUpdate[] = [
    {
      name: `refs/heads/${branchName}`,
      oldObjectId: '0000000000000000000000000000000000000000',
      newObjectId: sourceCommitId,
    },
  ];

  const response = await httpClient.post(
    `/${project}/_apis/git/repositories/${repositoryId}/refs`,
    refUpdates,
    {
      params: { 'api-version': '7.1' },
    }
  );
  return response.data.value[0];
}

// Usage - Create branch from main's HEAD
const mainBranch = await getBranch('MyProject', 'repo-id', 'main');
await createBranch('MyProject', 'repo-id', 'feature/new-feature', mainBranch.objectId);
```

---

### Delete Branch

```
POST /{project}/_apis/git/repositories/{repositoryId}/refs?api-version=7.1
```

**TypeScript:**

```typescript
async function deleteBranch(
  project: string,
  repositoryId: string,
  branchName: string,
  currentCommitId: string
): Promise<void> {
  const refUpdates: RefUpdate[] = [
    {
      name: `refs/heads/${branchName}`,
      oldObjectId: currentCommitId,
      newObjectId: '0000000000000000000000000000000000000000',
    },
  ];

  await httpClient.post(
    `/${project}/_apis/git/repositories/${repositoryId}/refs`,
    refUpdates,
    {
      params: { 'api-version': '7.1' },
    }
  );
}
```

---

## Pipelines API

### List Pipelines

```
GET /{project}/_apis/pipelines?api-version=7.1
```

**TypeScript:**

```typescript
interface Pipeline {
  id: number;
  revision: number;
  name: string;
  folder: string;
  url: string;
  _links: Record<string, { href: string }>;
}

async function listPipelines(
  project: string,
  top?: number
): Promise<Pipeline[]> {
  const response = await httpClient.get(
    `/${project}/_apis/pipelines`,
    {
      params: {
        'api-version': '7.1',
        '$top': top,
      },
    }
  );
  return response.data.value;
}
```

---

### Get Pipeline

```
GET /{project}/_apis/pipelines/{pipelineId}?api-version=7.1
```

**TypeScript:**

```typescript
async function getPipeline(
  project: string,
  pipelineId: number
): Promise<Pipeline> {
  const response = await httpClient.get(
    `/${project}/_apis/pipelines/${pipelineId}`,
    {
      params: { 'api-version': '7.1' },
    }
  );
  return response.data;
}
```

---

### Run Pipeline

```
POST /{project}/_apis/pipelines/{pipelineId}/runs?api-version=7.1
```

**Request Body:**

```json
{
  "resources": {
    "repositories": {
      "self": {
        "refName": "refs/heads/main"
      }
    }
  },
  "templateParameters": {
    "environment": "staging",
    "deployRegion": "eastus"
  },
  "variables": {
    "customVar": {
      "value": "customValue",
      "isSecret": false
    }
  }
}
```

**TypeScript:**

```typescript
interface PipelineRun {
  id: number;
  name: string;
  state: 'unknown' | 'inProgress' | 'canceling' | 'completed';
  result: 'unknown' | 'succeeded' | 'failed' | 'canceled';
  createdDate: string;
  finishedDate: string;
  url: string;
  pipeline: Pipeline;
  resources: Record<string, unknown>;
  variables: Record<string, { value: string; isSecret?: boolean }>;
}

interface RunPipelineInput {
  resources?: {
    repositories?: {
      self: {
        refName: string;  // e.g., "refs/heads/main"
      };
    };
  };
  templateParameters?: Record<string, string>;
  variables?: Record<string, { value: string; isSecret?: boolean }>;
  stagesToSkip?: string[];
}

async function runPipeline(
  project: string,
  pipelineId: number,
  input?: RunPipelineInput
): Promise<PipelineRun> {
  const response = await httpClient.post(
    `/${project}/_apis/pipelines/${pipelineId}/runs`,
    input || {},
    {
      params: { 'api-version': '7.1' },
    }
  );
  return response.data;
}

// Usage - Run pipeline on specific branch
const run = await runPipeline('MyProject', 42, {
  resources: {
    repositories: {
      self: { refName: 'refs/heads/feature/new-feature' },
    },
  },
  templateParameters: {
    environment: 'dev',
  },
});
```

---

### Get Pipeline Run

```
GET /{project}/_apis/pipelines/{pipelineId}/runs/{runId}?api-version=7.1
```

**TypeScript:**

```typescript
async function getPipelineRun(
  project: string,
  pipelineId: number,
  runId: number
): Promise<PipelineRun> {
  const response = await httpClient.get(
    `/${project}/_apis/pipelines/${pipelineId}/runs/${runId}`,
    {
      params: { 'api-version': '7.1' },
    }
  );
  return response.data;
}

// Poll for completion
async function waitForPipelineCompletion(
  project: string,
  pipelineId: number,
  runId: number,
  pollIntervalMs: number = 10000,
  timeoutMs: number = 600000
): Promise<PipelineRun> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const run = await getPipelineRun(project, pipelineId, runId);

    if (run.state === 'completed') {
      return run;
    }

    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Pipeline run ${runId} did not complete within ${timeoutMs}ms`);
}
```

---

### List Pipeline Runs

```
GET /{project}/_apis/pipelines/{pipelineId}/runs?api-version=7.1
```

**TypeScript:**

```typescript
async function listPipelineRuns(
  project: string,
  pipelineId: number,
  top?: number
): Promise<PipelineRun[]> {
  const response = await httpClient.get(
    `/${project}/_apis/pipelines/${pipelineId}/runs`,
    {
      params: {
        'api-version': '7.1',
        '$top': top,
      },
    }
  );
  return response.data.value;
}
```

---

### Get Pipeline Run Logs

```
GET /{project}/_apis/pipelines/{pipelineId}/runs/{runId}/logs?api-version=7.1
```

**TypeScript:**

```typescript
interface PipelineLog {
  id: number;
  createdOn: string;
  lastChangedOn: string;
  lineCount: number;
  url: string;
}

interface PipelineLogs {
  logs: PipelineLog[];
  signedContent: { url: string };
}

async function getPipelineRunLogs(
  project: string,
  pipelineId: number,
  runId: number
): Promise<PipelineLogs> {
  const response = await httpClient.get(
    `/${project}/_apis/pipelines/${pipelineId}/runs/${runId}/logs`,
    {
      params: { 'api-version': '7.1' },
    }
  );
  return response.data;
}

// Get specific log content
async function getPipelineLogContent(
  project: string,
  pipelineId: number,
  runId: number,
  logId: number
): Promise<string> {
  const response = await httpClient.get(
    `/${project}/_apis/pipelines/${pipelineId}/runs/${runId}/logs/${logId}`,
    {
      params: { 'api-version': '7.1' },
    }
  );
  return response.data;
}
```

---

### Cancel Pipeline Run

Pipeline runs can be canceled using the Build API:

```
PATCH /{project}/_apis/build/builds/{buildId}?api-version=7.1
```

**TypeScript:**

```typescript
async function cancelPipelineRun(
  project: string,
  buildId: number
): Promise<void> {
  await httpClient.patch(
    `/${project}/_apis/build/builds/${buildId}`,
    { status: 'cancelling' },
    {
      params: { 'api-version': '7.1' },
    }
  );
}
```

---

### List Builds

```
GET /{project}/_apis/build/builds?api-version=7.1
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `definitions` | string | Comma-separated definition IDs |
| `statusFilter` | string | `all`, `cancelling`, `completed`, `inProgress`, `none`, `notStarted`, `postponed` |
| `resultFilter` | string | `canceled`, `failed`, `none`, `partiallySucceeded`, `succeeded` |
| `requestedFor` | string | User ID or email |
| `branchName` | string | Branch name (e.g., `refs/heads/main`) |
| `$top` | number | Max results |

**TypeScript:**

```typescript
interface Build {
  id: number;
  buildNumber: string;
  status: string;
  result: string;
  queueTime: string;
  startTime: string;
  finishTime: string;
  definition: { id: number; name: string };
  requestedBy: IdentityRef;
  requestedFor: IdentityRef;
  sourceBranch: string;
  sourceVersion: string;
  url: string;
  _links: Record<string, { href: string }>;
}

async function listBuilds(
  project: string,
  options?: {
    definitions?: number[];
    statusFilter?: string;
    resultFilter?: string;
    branchName?: string;
    top?: number;
  }
): Promise<Build[]> {
  const params: Record<string, unknown> = {
    'api-version': '7.1',
  };

  if (options?.definitions) {
    params['definitions'] = options.definitions.join(',');
  }
  if (options?.statusFilter) params['statusFilter'] = options.statusFilter;
  if (options?.resultFilter) params['resultFilter'] = options.resultFilter;
  if (options?.branchName) params['branchName'] = options.branchName;
  if (options?.top) params['$top'] = options.top;

  const response = await httpClient.get(
    `/${project}/_apis/build/builds`,
    { params }
  );
  return response.data.value;
}
```

---

### Get Build Artifacts

```
GET /{project}/_apis/build/builds/{buildId}/artifacts?api-version=7.1
```

**TypeScript:**

```typescript
interface BuildArtifact {
  id: number;
  name: string;
  resource: {
    type: string;
    data: string;
    downloadUrl: string;
    url: string;
  };
}

async function getBuildArtifacts(
  project: string,
  buildId: number
): Promise<BuildArtifact[]> {
  const response = await httpClient.get(
    `/${project}/_apis/build/builds/${buildId}/artifacts`,
    {
      params: { 'api-version': '7.1' },
    }
  );
  return response.data.value;
}

// Download artifact
async function downloadArtifact(
  project: string,
  buildId: number,
  artifactName: string
): Promise<Buffer> {
  const response = await httpClient.get(
    `/${project}/_apis/build/builds/${buildId}/artifacts`,
    {
      params: {
        'api-version': '7.1',
        'artifactName': artifactName,
        '$format': 'zip',
      },
      responseType: 'arraybuffer',
    }
  );
  return Buffer.from(response.data);
}
```

---

## Projects API

### List Projects

```
GET /_apis/projects?api-version=7.1
```

**TypeScript:**

```typescript
interface TeamProject {
  id: string;
  name: string;
  description: string;
  url: string;
  state: 'deleting' | 'new' | 'wellFormed' | 'createPending' | 'all' | 'unchanged' | 'deleted';
  revision: number;
  visibility: 'private' | 'public';
  lastUpdateTime: string;
}

async function listProjects(
  top?: number,
  skip?: number
): Promise<TeamProject[]> {
  const response = await httpClient.get(
    '/_apis/projects',
    {
      params: {
        'api-version': '7.1',
        '$top': top,
        '$skip': skip,
      },
    }
  );
  return response.data.value;
}
```

---

### Get Project

```
GET /_apis/projects/{projectId}?api-version=7.1
```

**TypeScript:**

```typescript
async function getProject(
  projectIdOrName: string,
  includeCapabilities?: boolean
): Promise<TeamProject> {
  const response = await httpClient.get(
    `/_apis/projects/${projectIdOrName}`,
    {
      params: {
        'api-version': '7.1',
        'includeCapabilities': includeCapabilities,
      },
    }
  );
  return response.data;
}
```

---

### List Teams

```
GET /_apis/projects/{projectId}/teams?api-version=7.1
```

**TypeScript:**

```typescript
interface WebApiTeam {
  id: string;
  name: string;
  url: string;
  description: string;
  identityUrl: string;
  projectName: string;
  projectId: string;
}

async function listTeams(
  project: string,
  top?: number
): Promise<WebApiTeam[]> {
  const response = await httpClient.get(
    `/_apis/projects/${project}/teams`,
    {
      params: {
        'api-version': '7.1',
        '$top': top,
      },
    }
  );
  return response.data.value;
}
```

---

### Get Team Members

```
GET /_apis/projects/{projectId}/teams/{teamId}/members?api-version=7.1
```

**TypeScript:**

```typescript
interface TeamMember {
  identity: IdentityRef;
  isTeamAdmin: boolean;
}

async function getTeamMembers(
  project: string,
  teamId: string,
  top?: number
): Promise<TeamMember[]> {
  const response = await httpClient.get(
    `/_apis/projects/${project}/teams/${teamId}/members`,
    {
      params: {
        'api-version': '7.1',
        '$top': top,
      },
    }
  );
  return response.data.value;
}
```

---

### List Iterations

```
GET /{project}/{team}/_apis/work/teamsettings/iterations?api-version=7.1
```

**TypeScript:**

```typescript
interface TeamSettingsIteration {
  id: string;
  name: string;
  path: string;
  attributes: {
    startDate: string;
    finishDate: string;
    timeFrame: 'past' | 'current' | 'future';
  };
  url: string;
}

async function listIterations(
  project: string,
  team: string,
  timeframe?: 'past' | 'current' | 'future'
): Promise<TeamSettingsIteration[]> {
  const response = await httpClient.get(
    `/${project}/${team}/_apis/work/teamsettings/iterations`,
    {
      params: {
        'api-version': '7.1',
        '$timeframe': timeframe,
      },
    }
  );
  return response.data.value;
}
```

---

### Get Current Iteration

```
GET /{project}/{team}/_apis/work/teamsettings/iterations?$timeframe=current&api-version=7.1
```

**TypeScript:**

```typescript
async function getCurrentIteration(
  project: string,
  team: string
): Promise<TeamSettingsIteration | null> {
  const iterations = await listIterations(project, team, 'current');
  return iterations[0] || null;
}
```

---

### List Areas

```
GET /{project}/_apis/wit/classificationnodes/Areas?api-version=7.1&$depth=10
```

**TypeScript:**

```typescript
interface WorkItemClassificationNode {
  id: number;
  identifier: string;
  name: string;
  structureType: 'area' | 'iteration';
  hasChildren: boolean;
  children?: WorkItemClassificationNode[];
  path: string;
  url: string;
}

async function listAreas(
  project: string,
  depth: number = 10
): Promise<WorkItemClassificationNode> {
  const response = await httpClient.get(
    `/${project}/_apis/wit/classificationnodes/Areas`,
    {
      params: {
        'api-version': '7.1',
        '$depth': depth,
      },
    }
  );
  return response.data;
}
```

---

## WIQL Reference

### Query Syntax

```sql
SELECT [field1], [field2], ...
FROM WorkItems | WorkItemLinks
WHERE [conditions]
ORDER BY [field] [ASC|DESC]
ASOF 'datetime'
```

### Common Fields

| Field | Description |
|-------|-------------|
| `System.Id` | Work item ID |
| `System.Title` | Title |
| `System.State` | State (New, Active, Closed, etc.) |
| `System.WorkItemType` | Type (Bug, User Story, Task, etc.) |
| `System.AssignedTo` | Assigned user |
| `System.CreatedDate` | Creation date |
| `System.ChangedDate` | Last modified date |
| `System.CreatedBy` | Creator |
| `System.ChangedBy` | Last modifier |
| `System.TeamProject` | Project name |
| `System.AreaPath` | Area path |
| `System.IterationPath` | Iteration path |
| `System.Tags` | Tags (semicolon-separated) |
| `System.Description` | Description (HTML) |
| `Microsoft.VSTS.Common.Priority` | Priority (1-4) |
| `Microsoft.VSTS.Common.Severity` | Severity |
| `Microsoft.VSTS.Scheduling.StoryPoints` | Story points |
| `Microsoft.VSTS.Scheduling.OriginalEstimate` | Original estimate |
| `Microsoft.VSTS.Scheduling.RemainingWork` | Remaining work |
| `Microsoft.VSTS.Scheduling.CompletedWork` | Completed work |

### Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `=` | Equals | `[System.State] = 'Active'` |
| `<>` | Not equals | `[System.State] <> 'Closed'` |
| `>`, `<`, `>=`, `<=` | Comparison | `[Microsoft.VSTS.Common.Priority] <= 2` |
| `IN` | In list | `[System.State] IN ('New', 'Active')` |
| `NOT IN` | Not in list | `[System.State] NOT IN ('Closed', 'Removed')` |
| `CONTAINS` | Contains text | `[System.Title] CONTAINS 'login'` |
| `NOT CONTAINS` | Not contains | `[System.Title] NOT CONTAINS 'test'` |
| `UNDER` | Under path | `[System.AreaPath] UNDER 'Project\Team'` |
| `NOT UNDER` | Not under path | `[System.IterationPath] NOT UNDER 'Project\Backlog'` |
| `WAS EVER` | Historical | `[System.AssignedTo] WAS EVER 'user@company.com'` |
| `CONTAINS WORDS` | Full-text search | `[System.Description] CONTAINS WORDS 'authentication oauth'` |

### Macros

| Macro | Description |
|-------|-------------|
| `@project` | Current project |
| `@me` | Current user |
| `@today` | Today's date |
| `@today - 7` | 7 days ago |
| `@currentIteration` | Current iteration |
| `@currentIteration + 1` | Next iteration |

### Query Examples

**Active bugs assigned to me:**
```sql
SELECT [System.Id], [System.Title], [System.State], [Microsoft.VSTS.Common.Priority]
FROM WorkItems
WHERE [System.TeamProject] = @project
  AND [System.WorkItemType] = 'Bug'
  AND [System.State] = 'Active'
  AND [System.AssignedTo] = @me
ORDER BY [Microsoft.VSTS.Common.Priority] ASC
```

**Work items modified in last 7 days:**
```sql
SELECT [System.Id], [System.Title], [System.ChangedDate], [System.ChangedBy]
FROM WorkItems
WHERE [System.TeamProject] = @project
  AND [System.ChangedDate] >= @today - 7
ORDER BY [System.ChangedDate] DESC
```

**Current sprint work items:**
```sql
SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo]
FROM WorkItems
WHERE [System.TeamProject] = @project
  AND [System.IterationPath] = @currentIteration
  AND [System.WorkItemType] IN ('User Story', 'Bug', 'Task')
ORDER BY [Microsoft.VSTS.Common.Priority] ASC
```

**Parent-child relationships:**
```sql
SELECT [System.Id], [System.Title], [System.WorkItemType]
FROM WorkItemLinks
WHERE ([Source].[System.TeamProject] = @project
  AND [Source].[System.WorkItemType] = 'User Story')
  AND ([System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward')
  AND ([Target].[System.WorkItemType] = 'Task')
MODE (Recursive)
```

**Work items with specific tag:**
```sql
SELECT [System.Id], [System.Title], [System.Tags]
FROM WorkItems
WHERE [System.TeamProject] = @project
  AND [System.Tags] CONTAINS 'critical'
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| `200` | Success | Process response |
| `201` | Created | Resource created successfully |
| `204` | No Content | Success (no response body) |
| `400` | Bad Request | Check request parameters |
| `401` | Unauthorized | Check PAT validity and scopes |
| `403` | Forbidden | Check permissions |
| `404` | Not Found | Resource doesn't exist |
| `409` | Conflict | Resource conflict (e.g., version mismatch) |
| `429` | Too Many Requests | Rate limited - retry with backoff |
| `500` | Server Error | Azure DevOps issue - retry |
| `503` | Service Unavailable | Azure DevOps unavailable - retry |

### Error Response Format

```json
{
  "$id": "1",
  "innerException": null,
  "message": "TF401019: The specified work item does not exist.",
  "typeName": "Microsoft.TeamFoundation.WorkItemTracking.Server.WorkItemNotFoundException",
  "typeKey": "WorkItemNotFoundException",
  "errorCode": 0,
  "eventId": 3000
}
```

### TypeScript Error Handler

```typescript
interface AzureDevOpsError {
  $id: string;
  message: string;
  typeName: string;
  typeKey: string;
  errorCode: number;
  eventId: number;
}

function handleApiError(error: AxiosError): never {
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data as AzureDevOpsError;

    switch (status) {
      case 401:
        throw new Error(
          'Authentication failed. Check ADO_PAT environment variable and ensure it has not expired.'
        );
      case 403:
        throw new Error(
          `Permission denied: ${data.message}. Check PAT scopes and project permissions.`
        );
      case 404:
        throw new Error(`Resource not found: ${data.message}`);
      case 409:
        throw new Error(`Conflict: ${data.message}. Resource may have been modified.`);
      case 429:
        throw new Error('Rate limit exceeded. Retry after backoff period.');
      default:
        throw new Error(`Azure DevOps API error (${status}): ${data.message}`);
    }
  }

  if (error.code === 'ETIMEDOUT') {
    throw new Error('Request timed out. Check network connection and try again.');
  }

  throw new Error(`Network error: ${error.message}`);
}
```

---

## Rate Limiting

### Limits

Azure DevOps has rate limits that vary by operation:
- **Read operations**: Generally more permissive
- **Write operations**: More restrictive
- **Search/Query**: May have additional limits

### Retry Strategy

```typescript
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
};

async function executeWithRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = defaultRetryConfig
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      const axiosError = error as AxiosError;

      // Don't retry client errors (except 429)
      if (axiosError.response) {
        const status = axiosError.response.status;
        if (status >= 400 && status < 500 && status !== 429) {
          throw error;
        }

        // Handle 429 with Retry-After header
        if (status === 429) {
          const retryAfter = axiosError.response.headers['retry-after'];
          if (retryAfter) {
            const delayMs = parseInt(retryAfter, 10) * 1000;
            await sleep(Math.min(delayMs, config.maxDelay));
            continue;
          }
        }
      }

      // Don't retry on last attempt
      if (attempt === config.maxRetries) {
        break;
      }

      // Exponential backoff with jitter
      const delay = Math.min(
        config.baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
        config.maxDelay
      );
      await sleep(delay);
    }
  }

  throw new Error(`Max retries exceeded. Last error: ${lastError?.message}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### Batch Operations

For bulk operations, use batch endpoints when available and implement throttling:

```typescript
async function batchProcess<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options: {
    batchSize?: number;
    delayBetweenBatches?: number;
  } = {}
): Promise<R[]> {
  const { batchSize = 10, delayBetweenBatches = 1000 } = options;
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);

    // Delay between batches to avoid rate limiting
    if (i + batchSize < items.length) {
      await sleep(delayBetweenBatches);
    }
  }

  return results;
}
```

---

## TypeScript Client Pattern

### Complete Client Implementation

```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';

export interface AzureDevOpsClientConfig {
  organization?: string;
  pat?: string;
  apiVersion?: string;
  timeout?: number;
  retryConfig?: {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
  };
}

export class AzureDevOpsClient {
  private readonly httpClient: AxiosInstance;
  private readonly apiVersion: string;
  private readonly retryConfig: { maxRetries: number; baseDelay: number; maxDelay: number };

  constructor(config: AzureDevOpsClientConfig = {}) {
    const organization = config.organization || process.env.ADO_ORGANIZATION;
    const pat = config.pat || process.env.ADO_PAT;

    if (!organization) {
      throw new Error('ADO_ORGANIZATION environment variable or organization config required');
    }
    if (!pat) {
      throw new Error('ADO_PAT environment variable or pat config required');
    }

    this.apiVersion = config.apiVersion || '7.1';
    this.retryConfig = config.retryConfig || {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
    };

    const authToken = Buffer.from(`:${pat}`).toString('base64');

    this.httpClient = axios.create({
      baseURL: `https://dev.azure.com/${organization}`,
      timeout: config.timeout || 30000,
      headers: {
        Authorization: `Basic ${authToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  }

  // ========== Work Items ==========

  async getWorkItem(project: string, workItemId: number, expand: string = 'All') {
    return this.executeWithRetry(() =>
      this.httpClient.get(`/${project}/_apis/wit/workitems/${workItemId}`, {
        params: { 'api-version': this.apiVersion, '$expand': expand },
      })
    );
  }

  async getWorkItems(project: string, ids: number[], fields?: string[]) {
    return this.executeWithRetry(() =>
      this.httpClient.get(`/${project}/_apis/wit/workitems`, {
        params: {
          'api-version': this.apiVersion,
          ids: ids.join(','),
          fields: fields?.join(','),
          errorPolicy: 'Omit',
        },
      })
    );
  }

  async createWorkItem(project: string, workItemType: string, fields: Record<string, unknown>) {
    const operations = Object.entries(fields).map(([field, value]) => ({
      op: 'add',
      path: `/fields/${field}`,
      value,
    }));

    return this.executeWithRetry(() =>
      this.httpClient.post(`/${project}/_apis/wit/workitems/$${workItemType}`, operations, {
        params: { 'api-version': this.apiVersion },
        headers: { 'Content-Type': 'application/json-patch+json' },
      })
    );
  }

  async updateWorkItem(project: string, workItemId: number, updates: Record<string, unknown>) {
    const operations = Object.entries(updates).map(([field, value]) => ({
      op: 'replace',
      path: `/fields/${field}`,
      value,
    }));

    return this.executeWithRetry(() =>
      this.httpClient.patch(`/${project}/_apis/wit/workitems/${workItemId}`, operations, {
        params: { 'api-version': this.apiVersion },
        headers: { 'Content-Type': 'application/json-patch+json' },
      })
    );
  }

  async queryWorkItems(project: string, wiql: string, top?: number) {
    return this.executeWithRetry(() =>
      this.httpClient.post(`/${project}/_apis/wit/wiql`, { query: wiql }, {
        params: { 'api-version': this.apiVersion, '$top': top },
      })
    );
  }

  // ========== Git ==========

  async listRepositories(project: string) {
    return this.executeWithRetry(() =>
      this.httpClient.get(`/${project}/_apis/git/repositories`, {
        params: { 'api-version': this.apiVersion },
      })
    );
  }

  async listPullRequests(project: string, repositoryId: string, status: string = 'active') {
    return this.executeWithRetry(() =>
      this.httpClient.get(`/${project}/_apis/git/repositories/${repositoryId}/pullrequests`, {
        params: { 'api-version': this.apiVersion, 'searchCriteria.status': status },
      })
    );
  }

  async createPullRequest(project: string, repositoryId: string, input: {
    sourceRefName: string;
    targetRefName: string;
    title: string;
    description?: string;
  }) {
    return this.executeWithRetry(() =>
      this.httpClient.post(`/${project}/_apis/git/repositories/${repositoryId}/pullrequests`, input, {
        params: { 'api-version': this.apiVersion },
      })
    );
  }

  // ========== Pipelines ==========

  async listPipelines(project: string) {
    return this.executeWithRetry(() =>
      this.httpClient.get(`/${project}/_apis/pipelines`, {
        params: { 'api-version': this.apiVersion },
      })
    );
  }

  async runPipeline(project: string, pipelineId: number, input?: {
    resources?: { repositories?: { self: { refName: string } } };
    templateParameters?: Record<string, string>;
  }) {
    return this.executeWithRetry(() =>
      this.httpClient.post(`/${project}/_apis/pipelines/${pipelineId}/runs`, input || {}, {
        params: { 'api-version': this.apiVersion },
      })
    );
  }

  async getPipelineRun(project: string, pipelineId: number, runId: number) {
    return this.executeWithRetry(() =>
      this.httpClient.get(`/${project}/_apis/pipelines/${pipelineId}/runs/${runId}`, {
        params: { 'api-version': this.apiVersion },
      })
    );
  }

  // ========== Projects ==========

  async listProjects() {
    return this.executeWithRetry(() =>
      this.httpClient.get('/_apis/projects', {
        params: { 'api-version': this.apiVersion },
      })
    );
  }

  async getProject(projectIdOrName: string) {
    return this.executeWithRetry(() =>
      this.httpClient.get(`/_apis/projects/${projectIdOrName}`, {
        params: { 'api-version': this.apiVersion },
      })
    );
  }

  // ========== Private Helpers ==========

  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        const axiosError = error as AxiosError;

        if (axiosError.response) {
          const status = axiosError.response.status;
          if (status >= 400 && status < 500 && status !== 429) {
            throw error;
          }
        }

        if (attempt === this.retryConfig.maxRetries) {
          break;
        }

        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(2, attempt),
          this.retryConfig.maxDelay
        );
        await this.sleep(delay);
      }
    }

    throw new Error(`Max retries exceeded: ${lastError?.message}`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Usage
const client = new AzureDevOpsClient();
const workItem = await client.getWorkItem('MyProject', 12345);
```

---

## Common Workflows

### 1. Create Bug with Attachments and Links

```typescript
async function createBugWithDetails(
  client: AzureDevOpsClient,
  project: string,
  bug: {
    title: string;
    reproSteps: string;
    priority: number;
    parentId?: number;
    attachments?: Array<{ name: string; content: Buffer }>;
  }
) {
  // Create the bug
  const workItem = await client.createWorkItem(project, 'Bug', {
    'System.Title': bug.title,
    'Microsoft.VSTS.TCM.ReproSteps': bug.reproSteps,
    'Microsoft.VSTS.Common.Priority': bug.priority,
  });

  const workItemId = workItem.data.id;

  // Upload and link attachments
  if (bug.attachments) {
    for (const attachment of bug.attachments) {
      const uploaded = await uploadAttachment(project, attachment.name, attachment.content);
      await attachToWorkItem(project, workItemId, uploaded.url);
    }
  }

  // Link to parent
  if (bug.parentId) {
    await linkWorkItems(
      project,
      workItemId,
      bug.parentId,
      'System.LinkTypes.Hierarchy-Reverse'
    );
  }

  return workItem.data;
}
```

### 2. Create PR and Link Work Items

```typescript
async function createPRWithWorkItems(
  client: AzureDevOpsClient,
  project: string,
  repositoryId: string,
  pr: {
    sourceBranch: string;
    targetBranch: string;
    title: string;
    description: string;
    workItemIds: number[];
  }
) {
  const pullRequest = await client.createPullRequest(project, repositoryId, {
    sourceRefName: `refs/heads/${pr.sourceBranch}`,
    targetRefName: `refs/heads/${pr.targetBranch}`,
    title: pr.title,
    description: pr.description,
    workItemRefs: pr.workItemIds.map(id => ({ id: id.toString() })),
  });

  return pullRequest.data;
}
```

### 3. Monitor Pipeline and Get Logs on Failure

```typescript
async function runAndMonitorPipeline(
  client: AzureDevOpsClient,
  project: string,
  pipelineId: number,
  branch: string
) {
  // Start pipeline
  const run = await client.runPipeline(project, pipelineId, {
    resources: {
      repositories: {
        self: { refName: `refs/heads/${branch}` },
      },
    },
  });

  const runId = run.data.id;

  // Poll until complete
  let status = run.data;
  while (status.state !== 'completed') {
    await new Promise(resolve => setTimeout(resolve, 10000));
    const updated = await client.getPipelineRun(project, pipelineId, runId);
    status = updated.data;
  }

  // If failed, get logs
  if (status.result === 'failed') {
    const logs = await getPipelineRunLogs(project, pipelineId, runId);
    console.log('Pipeline failed. Logs:', logs);
  }

  return status;
}
```

---

## Additional Resources

- [Azure DevOps REST API Reference](https://learn.microsoft.com/en-us/rest/api/azure/devops/)
- [Work Item Tracking API](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/)
- [Git API](https://learn.microsoft.com/en-us/rest/api/azure/devops/git/)
- [Pipelines API](https://learn.microsoft.com/en-us/rest/api/azure/devops/pipelines/)
- [Core API](https://learn.microsoft.com/en-us/rest/api/azure/devops/core/)
- [WIQL Syntax](https://learn.microsoft.com/en-us/azure/devops/boards/queries/wiql-syntax)

---

**Skill Version**: 1.0.0
**API Version**: 7.1
**Last Updated**: 2024
