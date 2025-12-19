# Changelog

All notable changes to the Azure DevOps REST API Skill.

## [3.0.0] - 2025-12-19

### Changed
- **Completely restructured SKILL.md** - reduced from 1300+ lines to ~230 lines
- SKILL.md is now action-oriented with clear "CRITICAL" instruction at the top
- Moved comprehensive API reference to separate `ado-api-reference.md`

### Added
- **CLI wrapper (`ado.py`)** - Simple command-line interface for common operations
  - `get-work-item`, `get-project`, `list-projects`, `query`, `list-repos`, etc.
  - Usage: `uv run --with requests python3 ado.py <command> [args...]`
- Clear "Option 1: CLI" vs "Option 2: Python Client" guidance
- Copy-paste ready examples for all common operations

### Fixed
- **Skill usage clarity** - Claude will now use Python client instead of composing curl requests
- Instructions are impossible to miss - critical guidance is the first thing loaded

---

## [2.0.0] - 2025

### Changed
- **Complete rewrite from TypeScript to Python**
- Simplified client architecture to single file (`ado_client.py`)
- Unified response format: `{"success": True/False, "data/error": {...}}`
- No exceptions thrown - errors returned in response dict

### Added
- Python client with 43 API methods
- Consistent error handling across all methods
- Support for both environment variables and direct PAT parameters
- Comprehensive documentation (README, HOW_TO_USE, INSTALL)

### Removed
- TypeScript implementation
- Complex type definitions and interfaces
- External dependencies (axios)

### API Coverage
- Work Items: 12 methods
- Git: 14 methods
- Pipelines: 11 methods
- Projects: 6 methods

## [1.0.0] - 2025

### Added
- Initial TypeScript implementation
- Azure DevOps REST API v7.1 coverage
- Comprehensive TypeScript patterns and interfaces
