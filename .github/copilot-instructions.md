# Simple Memory MCP Server

TypeScript MCP server for persistent memory storage with SQLite FTS5. Works as both MCP server and CLI tool.

## Quick Reference

### Build & Test (All operations < 10 seconds)
```bash
npm install          # Install dependencies
npm run build        # Build TypeScript → JavaScript
npm test             # Run all tests
```

### CLI Commands
```bash
# Store
node dist/index.js store --content "text" --tags "tag1,tag2"

# Search
node dist/index.js search --query "text"          # By content
node dist/index.js search --tags "tag1"           # By tags

# Update
node dist/index.js update --hash "abc..." --content "new text" --tags "new,tags"

# Delete
node dist/index.js delete --tag "tagname"         # By tag
node dist/index.js delete --hash "abc..."         # By hash

# Stats
node dist/index.js stats
```

### Database
- Default: `./memory.db`
- Custom: Set `MEMORY_DB=/path/to/db` environment variable
- Format: SQLite with FTS5 full-text search, WAL mode

### Project Structure
```
src/
├── services/memory-service.ts  # Core SQLite + FTS5 operations
├── tools/                      # MCP tools: store, search, update, delete, stats
├── tests/                      # Comprehensive test suite
└── utils/                      # JSON/CLI parsing, debug
```

## Architecture
- **ES Modules**: Use `.js` extensions in imports
- **TypeScript**: Target ES2022, outputs to `dist/`
- **Database**: better-sqlite3 with FTS5, prepared statements
- **MCP**: @modelcontextprotocol/sdk
- **Performance**: Sub-millisecond operations, 2,000-10,000 ops/sec

## Troubleshooting
- **Module errors**: Run `npm install`
- **Build errors**: Run `npm run build`
- **Database errors**: Check `MEMORY_DB` path is writable