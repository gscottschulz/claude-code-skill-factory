# Changelog

All notable changes to the Azure DevOps REST API Skill.

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
