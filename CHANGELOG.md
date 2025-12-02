# Changelog

All notable changes to the Simple Memory MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-12-02

### Added
- **CLI Shortcuts**: Simple intuitive commands that replace verbose GraphQL syntax
  - `simple-memory search` - Search memories by content or tags
  - `simple-memory store` - Store a new memory
  - `simple-memory update` - Update an existing memory
  - `simple-memory get` - Get a memory by hash
  - `simple-memory related` - Find related memories
  - `simple-memory delete` - Delete a memory by hash or tag
  - `simple-memory stats` - Show database statistics with config paths
  - `simple-memory graphql` - Raw GraphQL for power users
  - `simple-memory config` - View or initialize configuration

- **Central Configuration File**: `~/.simple-memory/config.json`
  - One config file for all clients (CLI, VS Code, Claude Desktop, etc.)
  - Settings: database path, backup path/interval/keep, cloudSafe, debug
  - Environment variables still work as per-client overrides
  - `simple-memory config --init` creates config with examples

- **`--verbose` Flag**: Learn GraphQL by seeing generated queries
  - Works with all shortcut commands
  - Shows the GraphQL query before executing
  - Great for users transitioning to raw GraphQL

- **Cleaner CLI Output**: Debug logs suppressed by default in CLI mode
  - Set `MEMORY_DEBUG=true` to enable debug output
  - MCP server mode still shows debug for troubleshooting

- **Stats Enhancements**: More useful information
  - Shows `configPath` - path to config.json
  - Shows `dbPath` - resolved database path
  - Shows all MCP client config locations

### Changed
- **CLI Commands Renamed** (Breaking Change):
  - `memory-graphql` → `graphql`
  - Old verbose commands replaced with simple shortcuts
  - `simple-memory <command> --help` for command-specific help

### Migration Guide
If upgrading from 1.0.x:
1. Update CLI scripts: `memory-graphql --query '...'` → `graphql --query '...'`
2. Or use new shortcuts: `simple-memory search --query "text"`
3. Optionally create central config: `simple-memory config --init`

## [Unreleased]

### Added
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
