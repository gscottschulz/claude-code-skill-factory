# Azure DevOps REST API v7.1 - Quick Reference

## Authentication

```typescript
const authToken = Buffer.from(`:${process.env.ADO_PAT}`).toString('base64');
const headers = { Authorization: `Basic ${authToken}` };
const baseUrl = `https://dev.azure.com/${process.env.ADO_ORGANIZATION}`;
```

---

## Work Items API

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Get Work Item | GET | `/{project}/_apis/wit/workitems/{id}?api-version=7.1&$expand=All` |
| Get Multiple | GET | `/{project}/_apis/wit/workitems?ids={ids}&api-version=7.1` |
| Create | POST | `/{project}/_apis/wit/workitems/${type}?api-version=7.1` |
| Update | PATCH | `/{project}/_apis/wit/workitems/{id}?api-version=7.1` |
| Delete | DELETE | `/{project}/_apis/wit/workitems/{id}?api-version=7.1` |
| Query (WIQL) | POST | `/{project}/_apis/wit/wiql?api-version=7.1` |
| Get Comments | GET | `/{project}/_apis/wit/workitems/{id}/comments?api-version=7.1-preview.4` |
| Add Comment | POST | `/{project}/_apis/wit/workitems/{id}/comments?api-version=7.1-preview.4` |
| Get Revisions | GET | `/{project}/_apis/wit/workitems/{id}/revisions?api-version=7.1` |
| Upload Attachment | POST | `/{project}/_apis/wit/attachments?fileName={name}&api-version=7.1` |

**Create/Update Content-Type**: `application/json-patch+json`

**JSON Patch Format**:
```json
[{ "op": "add|replace|remove", "path": "/fields/{FieldName}", "value": "..." }]
```

---

## Git API

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List Repos | GET | `/{project}/_apis/git/repositories?api-version=7.1` |
| Get Repo | GET | `/{project}/_apis/git/repositories/{repoId}?api-version=7.1` |
| List PRs | GET | `/{project}/_apis/git/repositories/{repoId}/pullrequests?api-version=7.1` |
| Get PR | GET | `/{project}/_apis/git/repositories/{repoId}/pullrequests/{prId}?api-version=7.1` |
| Create PR | POST | `/{project}/_apis/git/repositories/{repoId}/pullrequests?api-version=7.1` |
| Update PR | PATCH | `/{project}/_apis/git/repositories/{repoId}/pullrequests/{prId}?api-version=7.1` |
| PR Threads | GET | `/{project}/_apis/git/repositories/{repoId}/pullrequests/{prId}/threads?api-version=7.1` |
| Add Thread | POST | `/{project}/_apis/git/repositories/{repoId}/pullrequests/{prId}/threads?api-version=7.1` |
| List Commits | GET | `/{project}/_apis/git/repositories/{repoId}/commits?api-version=7.1` |
| Get Commit | GET | `/{project}/_apis/git/repositories/{repoId}/commits/{commitId}?api-version=7.1` |
| List Branches | GET | `/{project}/_apis/git/repositories/{repoId}/refs?filter=heads/&api-version=7.1` |
| Create/Delete Branch | POST | `/{project}/_apis/git/repositories/{repoId}/refs?api-version=7.1` |

---

## Pipelines API

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List Pipelines | GET | `/{project}/_apis/pipelines?api-version=7.1` |
| Get Pipeline | GET | `/{project}/_apis/pipelines/{pipelineId}?api-version=7.1` |
| Run Pipeline | POST | `/{project}/_apis/pipelines/{pipelineId}/runs?api-version=7.1` |
| Get Run | GET | `/{project}/_apis/pipelines/{pipelineId}/runs/{runId}?api-version=7.1` |
| List Runs | GET | `/{project}/_apis/pipelines/{pipelineId}/runs?api-version=7.1` |
| Get Logs | GET | `/{project}/_apis/pipelines/{pipelineId}/runs/{runId}/logs?api-version=7.1` |
| Get Log Content | GET | `/{project}/_apis/pipelines/{pipelineId}/runs/{runId}/logs/{logId}?api-version=7.1` |

### Build API (Extended)

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List Builds | GET | `/{project}/_apis/build/builds?api-version=7.1` |
| Get Build | GET | `/{project}/_apis/build/builds/{buildId}?api-version=7.1` |
| Cancel Build | PATCH | `/{project}/_apis/build/builds/{buildId}?api-version=7.1` |
| Get Artifacts | GET | `/{project}/_apis/build/builds/{buildId}/artifacts?api-version=7.1` |

---

## Projects API

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List Projects | GET | `/_apis/projects?api-version=7.1` |
| Get Project | GET | `/_apis/projects/{projectId}?api-version=7.1` |
| List Teams | GET | `/_apis/projects/{projectId}/teams?api-version=7.1` |
| Get Team Members | GET | `/_apis/projects/{projectId}/teams/{teamId}/members?api-version=7.1` |
| List Iterations | GET | `/{project}/{team}/_apis/work/teamsettings/iterations?api-version=7.1` |
| List Areas | GET | `/{project}/_apis/wit/classificationnodes/Areas?$depth=10&api-version=7.1` |

---

## Common Query Parameters

| Parameter | Description |
|-----------|-------------|
| `api-version` | Always `7.1` |
| `$top` | Max results to return |
| `$skip` | Results to skip (pagination) |
| `$expand` | Expand related data (`All`, `Relations`, `Fields`, `Links`) |
| `fields` | Comma-separated field names to return |

---

## Work Item Link Types

| Link Type | Relation Name |
|-----------|---------------|
| Parent | `System.LinkTypes.Hierarchy-Reverse` |
| Child | `System.LinkTypes.Hierarchy-Forward` |
| Related | `System.LinkTypes.Related` |
| Duplicate | `System.LinkTypes.Duplicate-Forward` |
| Predecessor | `System.LinkTypes.Dependency-Reverse` |
| Successor | `System.LinkTypes.Dependency-Forward` |

---

## Common Work Item Fields

| Field | Description |
|-------|-------------|
| `System.Id` | Work item ID |
| `System.Title` | Title |
| `System.State` | State (New, Active, Closed) |
| `System.WorkItemType` | Type (Bug, User Story, Task) |
| `System.AssignedTo` | Assigned user |
| `System.IterationPath` | Iteration path |
| `System.AreaPath` | Area path |
| `System.Tags` | Tags (semicolon-separated) |
| `Microsoft.VSTS.Common.Priority` | Priority (1-4) |
| `Microsoft.VSTS.Scheduling.StoryPoints` | Story points |

---

## WIQL Quick Reference

```sql
-- Active bugs assigned to me
SELECT [System.Id], [System.Title]
FROM WorkItems
WHERE [System.TeamProject] = @project
  AND [System.WorkItemType] = 'Bug'
  AND [System.State] = 'Active'
  AND [System.AssignedTo] = @me

-- Current sprint items
SELECT [System.Id], [System.Title]
FROM WorkItems
WHERE [System.IterationPath] = @currentIteration

-- Modified in last 7 days
WHERE [System.ChangedDate] >= @today - 7
```

**Operators**: `=`, `<>`, `>`, `<`, `IN`, `NOT IN`, `CONTAINS`, `UNDER`
**Macros**: `@project`, `@me`, `@today`, `@currentIteration`

---

## HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Process response |
| 201 | Created | Resource created |
| 401 | Unauthorized | Check PAT |
| 403 | Forbidden | Check permissions |
| 404 | Not Found | Resource missing |
| 429 | Rate Limited | Retry with backoff |

---

## Environment Variables

```bash
export ADO_ORGANIZATION="your-org-name"
export ADO_PAT="your-personal-access-token"
```

---

**API Version**: 7.1 | **Skill Version**: 1.0.0
