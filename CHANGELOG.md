# Changelog

All notable changes to the Simple Memory MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **ID-based Search and Export**: Quick batch operations using memory IDs
  - `search-memory --ids "1,5,10"` - Search for specific memories by ID
  - `export-memory --ids "1,2,3"` - Export specific memories by ID
  - Useful for LLM batch operations when query/tag filters don't match all desired memories
  - IDs can be obtained from previous search results

- **Automated Version Bumping**: GitHub Actions workflow automatically bumps patch version on every commit/merge to main branch
  - Uses existing `npm run build:release` command
  - Commits changes back to repository with `[skip-version]` tag
  - Skips documentation-only changes (markdown files and docs directory)
  - Prevents infinite loops with bot detection

- **Export/Import System**: Backup and restore memories across machines
  - `export-memory` command - Export memories to JSON with optional filtering
  - `import-memory` command - Import memories with duplicate detection
  - Supports tag filtering, date ranges, and limit parameters
  - Preserves timestamps and relationships
  - Dry-run mode for preview before import
  
- **Automated VS Code Setup**: One-command installation with automatic configuration
  - `npm run setup` command that handles install, build, link, and VS Code config
  - Automatic detection of VS Code stable and Insiders
  - Smart detection of `mcp.json` format (supports both `servers` and `mcpServers` properties)
  - Cross-platform support (Windows, macOS, Linux)
  - No manual configuration needed for VS Code users

- **Time Range Search**: Filter memories by creation date
  - `daysAgo` parameter - Search memories from last N days (e.g., 7 for last week)
  - `startDate` parameter - Search memories created on or after a specific date
  - `endDate` parameter - Search memories created on or before a specific date
  - Works with content search, tag search, and combined queries
  - Supports both relative (daysAgo) and absolute (startDate/endDate) time filtering

- **Auto-Capture Mode**: LLM proactively stores important information
  - Enhanced tool descriptions guide LLM to capture preferences, decisions, and facts automatically
  - Stores silently without announcing to user
  - Proactive search at conversation start for context-aware responses
  - Real-world usage examples in documentation

- **Backup System**: Lazy backup with cloud storage compatibility
  - Optional automatic backups with configurable interval
  - Lazy backup strategy (only after write operations)
  - Throttled backups (respects minimum interval)
  - Cloud-safe mode for OneDrive/Dropbox (disables WAL)
  - Backup statistics in `memory-stats`

- **Relevance Filtering**: Precision control for search results
  - `minRelevance` parameter (0-1 scale) for filtering by BM25 score
  - High precision mode (0.7-0.9) for LLM context loading
  - Ranked results by relevance score
  - Useful for reducing noise in large memory sets

### Changed
- **Improved Build System**: Separated dev and release builds
  - `npm run build` - Fast development build (no version bump)
  - `npm run build:release` - Release build with automatic version bump
  - Prevents version spam during development
  
- **Enhanced Documentation**: 
  - Design Philosophy document explaining trade-offs and limitations
  - Performance benchmarks document with detailed analysis
  - Stress test suite with comprehensive README
  - Real-world usage examples for AI assistants
  - Cloud storage best practices integrated into main README

### Fixed
- Full-text search now properly handles hyphenated terms
- Fresh database initialization no longer creates unnecessary backups
- Improved CLI argument parsing consistency across all commands
- Better debug logging with hash formatting utilities

---

## [1.0.0] - 2025-08-22

### Added
- Initial release
- Basic memory storage with SQLite
- Full-text search with FTS5
- Tag-based filtering
- Command-line interface
- MCP server implementation
- Relationship support between memories

### Features
- Store memories with content and tags
- Search by content or tags
- Delete by hash or tag
- Memory statistics
- Automatic relationship detection
