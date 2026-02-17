# Azure DevOps API Skill (TypeScript)

Functional TypeScript client for the Azure DevOps REST API v7.1. Provides both a CLI wrapper and a programmatic client with 43 methods covering Work Items, Git, Pipelines, and Projects.

## Prerequisites

- **Node.js 18+** (for native fetch support)
- **Azure DevOps PAT** with appropriate scopes

## Installation

### Claude Code Skill (Personal)

```bash
cp -r generated-skills/ado-api-ts ~/.claude/skills/
npm install --prefix ~/.claude/skills/ado-api-ts
```

### Claude Code Skill (Project)

```bash
cp -r generated-skills/ado-api-ts .claude/skills/
npm install --prefix .claude/skills/ado-api-ts
```

### Environment Setup

```bash
export ADO_ORGANIZATION="your-org-name"
export ADO_PAT="your-personal-access-token"
```

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

## Quick Start

### CLI

```bash
# List all projects
npx tsx ado.ts list-projects

# Get a work item
npx tsx ado.ts get-work-item "My Project" 42731

# Add a PR comment
npx tsx ado.ts add-pr-comment "My Project" "repo-id" 123 "LGTM!"
```

### TypeScript Client

```typescript
import { AzureDevOpsClient } from "./ado_client.js";

const client = new AzureDevOpsClient();
const result = await client.getWorkItem("My Project", 42731);
console.log(result);
// { success: true, data: { id: 42731, fields: { ... } } }
```

## Features

- **43 API methods** across 4 domains (Work Items, Git, Pipelines, Projects)
- **Zero external HTTP dependencies** - uses Node.js native fetch
- **Consistent response format** - all methods return `{ success, data/error }`
- **CLI + programmatic** - use from command line or import in scripts
- **Full PR comment support** - general, file-level, and line-level comments
- **TypeScript types** - full type safety with exported interfaces

## Files

| File | Purpose |
|------|---------|
| `ado.ts` | CLI wrapper (simplest to use) |
| `ado_client.ts` | TypeScript client class |
| `ado-api-reference.md` | Detailed API reference with types |
| `SKILL.md` | Skill definition and quick reference |
| `HOW_TO_USE.md` | Detailed usage examples |

## See Also

- [SKILL.md](SKILL.md) - Complete method reference
- [HOW_TO_USE.md](HOW_TO_USE.md) - Detailed usage examples
- [ado-api-reference.md](ado-api-reference.md) - Full API endpoint reference
