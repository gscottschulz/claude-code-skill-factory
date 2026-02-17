# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2026-02-17

### Added
- Auto-resolve project from PR IDs for `get-pr`, `get-pr-threads`, and `add-pr-comment` commands when project argument is omitted
- Auto-resolve project from work item IDs for `get-work-item`, `update-work-item`, `delete-work-item`, `get-comments`, and `add-comment` commands when project argument is omitted
- `resolveProjectFromPullRequest(prId)` method on `AdoClient` that queries the org-level `/_apis/git/pullrequests` endpoint and returns project name, repo ID, and repo name with duplicate PR ID detection across repos
- `resolveProjectFromWorkItem(workItemId)` method on `AdoClient` that queries the org-level `/_apis/wit/workitems/{id}` endpoint and extracts `System.TeamProject`
- `FULL_ARG_COUNTS` map in CLI for smart argument detection that prevents false triggers on numeric project names
- "Auto-Resolution" section in SKILL.md with usage examples

### Changed
- CLI help text now shows `[project]` as optional for all commands that support auto-resolution
- Status messages for auto-resolution go to stderr to keep JSON output clean on stdout

## [1.0.0] - 2026-02-17

### Added
- Functional TypeScript client class (`ado_client.ts`) with 43 API methods using Node.js native fetch (zero external HTTP dependencies)
- CLI wrapper (`ado.ts`) with 22 commands for common Azure DevOps operations
- Work Items API coverage: 12 methods (get, create, update, delete, query, comments, links, revisions, attachments)
- Git API coverage: 14 methods (repos, pull requests, PR comments/threads, commits, branches, tags)
- Pipelines API coverage: 11 methods (list, run, status, logs, cancel, builds, artifacts)
- Projects API coverage: 6 methods (list, get, teams, members, iterations, areas)
- Full PR comment support including general, file-level, and line-level comments
- Consistent response format across all methods: `{ success: true, data: {...} }` / `{ success: false, error: {...} }`
- TypeScript strict mode with full type safety (ES2022/NodeNext)
- Package configuration (`package.json`) with tsx, typescript, and @types/node dependencies
- Strict TypeScript configuration (`tsconfig.json`)
- Installation guide and quick start (`README.md`)
- Detailed usage examples and common workflows (`HOW_TO_USE.md`)
- Rewritten `SKILL.md` from documentation-only reference to functional skill usage guide
- Feature parity with the Python ado-api skill's 43-method API surface

[Unreleased]: https://github.com/gscottschulz/claude-code-skill-factory/compare/ado-api-ts-v1.1.0...HEAD
[1.1.0]: https://github.com/gscottschulz/claude-code-skill-factory/compare/ado-api-ts-v1.0.0...ado-api-ts-v1.1.0
[1.0.0]: https://github.com/gscottschulz/claude-code-skill-factory/releases/tag/ado-api-ts-v1.0.0
