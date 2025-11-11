# 🧠 Simple Memory MCP Server

[![npm version](https://img.shields.io/npm/v/simple-memory-mcp.svg)](https://www.npmjs.com/package/simple-memory-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)

A blazingly fast Model Context Protocol (MCP) server for persistent memory storage with intelligent tagging and full-text search.

Perfect for AI assistants that need to remember context across conversations, store project notes, or build a personal knowledge base.

> 📚 **New to Simple Memory?** Read the [Design Philosophy](docs/DESIGN_PHILOSOPHY.md) to understand why it's built this way, the trade-offs made, and when this approach makes sense for your needs.

---

## ✨ Features

- 🧠 **Auto-Capture** - LLM proactively stores important information during conversations
- 🚀 **Sub-millisecond Performance** - 2,000-10,000 operations/second
- 🔍 **Full-Text Search** - SQLite FTS5 with 0.14ms average query time
- 🏷️ **Smart Tagging** - Organize and filter memories with tags
- 🔗 **Auto-Relationships** - Automatically link related memories
- 💾 **Automatic Backups** - Optional lazy backups to cloud storage
- 🔄 **Safe Migrations** - Automatic schema upgrades without data loss
- 📦 **Zero Config** - Works out of the box with sensible defaults

---

## 📊 Performance Highlights

| Operation | Average Time | Throughput |
|-----------|--------------|------------|
| Store Memory (1KB) | 0.1ms | ~10,000 ops/sec |
| Tag Search | 0.18ms | ~5,500 ops/sec |
| Full-Text Search | 0.14ms | ~7,000 ops/sec |
| Bulk Relationships | 0.26ms | ~3,800 ops/sec |

**All operations complete in sub-millisecond timeframes** with optimized indexes and prepared statements.


---

## 🚀 Quick Start

> 💡 **Best Experience**: Simple Memory works best with **Claude Sonnet in Agent Mode**. The agent's autonomous decision-making and proactive behavior enables optimal memory capture and retrieval without explicit instructions.

### 1️⃣ One-Command Setup

**From Source:**
```bash
git clone https://github.com/chrisribe/simple-memory-mcp.git
cd simple-memory-mcp
npm run setup
```

**Or from npm (when published):**
```bash
npm install -g simple-memory-mcp
```

That's it! The `setup` command automatically:
- ✅ Installs dependencies
- ✅ Builds TypeScript → JavaScript
- ✅ Links globally (makes `simple-memory` command available)
- ✅ Configures VS Code (both stable and Insiders)

> 💡 VS Code users: The setup automatically adds the MCP server to your `mcp.json` file. Just restart VS Code after setup!
> 
> 💡 Need to customize? Run `npm run setup` again to see the config file path (Ctrl+click to open)

### 2️⃣ For Other MCP Clients (Optional)

If you're using Claude Desktop or other MCP clients, add this to their config:

**Claude Desktop** (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "simple-memory-mcp": {
      "command": "simple-memory"
    }
  }
}
```

> 💡 **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`  
> 💡 **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

### 3️⃣ Start Using

Restart your MCP client and the `simple-memory-mcp` server will be available. The AI assistant can now:
- 🧠 Remember information across conversations
- 🔍 Search your stored memories
- 🏷️ Organize with tags
- 🔗 Link related memories automatically

**All transparent - no UI, no manual steps. Just works!**

---

## 📖 Table of Contents

- [Usage](#-usage)
  - [MCP Server](#as-mcp-server)
  - [CLI Commands](#command-line-interface)
- [Available Tools](#-available-tools)
- [Configuration](#-configuration)
- [Database](#-database)
- [Development](#-development)
- [Examples](#-examples)

---

## 💻 Usage

### As MCP Server

The server exposes tools that your AI assistant can use directly. Once configured, your assistant will:

**🧠 Auto-Capture Mode** - Proactively store important information:
- Preferences you mention ("I prefer dark mode")
- Decisions you make ("Let's use PostgreSQL")
- Facts about people, projects, or tools
- Learnings and insights you discover

**📝 Manual Storage** - You can also explicitly ask:
- "Remember that I prefer dark mode"
- "Store this meeting summary with tags project and planning"
- "Search my memories for Python tips"
- "Show me all memories tagged with 'important'"

The assistant stores memories silently and retrieves them when relevant, creating a seamless conversation experience.

### Command Line Interface

You can also use the CLI directly:

```bash
# Store a memory
simple-memory store-memory --content "Your content here" --tags "tag1,tag2"

# Search by content
simple-memory search-memory --query "search term"

# Search by tags
simple-memory search-memory --tags "tag1,tag2"

# Search by specific IDs (useful for batch operations)
simple-memory search-memory --ids "1,5,10"

# Search with relevance filtering (0-1 scale)
simple-memory search-memory --query "architecture" --min-relevance 0.7

# Search memories from last week
simple-memory search-memory --query "project" --days-ago 7

# Search memories from specific date range
simple-memory search-memory --start-date "2025-01-01" --end-date "2025-01-31"

# View statistics
simple-memory memory-stats

# Update a memory
simple-memory update-memory --hash "abc123..." --content "Updated content" --tags "new,tags"

# Delete by tag
simple-memory delete-memory --tag "old-notes"
```

---

## 🛠️ Available Tools

### `store-memory`
Store content with optional tags.

**🧠 Auto-Capture:** This tool is enhanced with guidelines that encourage your AI assistant to proactively store important information during conversations without explicit requests. The assistant learns to:
- Capture preferences, decisions, and facts automatically
- Store silently without announcing
- Use descriptive tags for easy retrieval
- Link related memories intelligently

**Parameters:**
- `content` (string, required) - The text content to store
- `tags` (array, optional) - Tags to associate with the memory
- `autoLink` (boolean, optional) - Auto-link to similar memories (default: true)

**Example:**
```json
{
  "content": "Remember to use TypeScript for all new projects",
  "tags": ["coding", "best-practices"],
  "autoLink": true
}
```

### `search-memory`
Search stored memories by content or tags, with optional time range filtering.

**💡 Proactive Usage:** Enhanced with guidance for your AI assistant to search memories proactively at conversation start or when relevant topics arise, providing personalized context-aware responses.

**Parameters:**
- `query` (string, optional) - Text to search for in content
- `tags` (array, optional) - Filter by tags
- `limit` (number, optional) - Max results to return (default: 10)
- `includeRelated` (boolean, optional) - Include related memories (default: false)
- `minRelevance` (number, optional) - Minimum relevance score (0-1). Filters by BM25 ranking. Higher values (0.7-0.9) return only highly relevant matches. Useful for LLM context loading.
- `daysAgo` (number, optional) - Filter memories created within last N days (e.g., 7 for last week)
- `startDate` (string, optional) - Filter memories created on or after this date (ISO 8601: YYYY-MM-DD)
- `endDate` (string, optional) - Filter memories created on or before this date (ISO 8601: YYYY-MM-DD)

**Example:**
```json
{
  "query": "TypeScript",
  "tags": ["coding"],
  "limit": 5,
  "minRelevance": 0.7
}
```

**Relevance Filtering Examples:**
```json
// High precision - only highly relevant results (best for LLM context)
{ "query": "architecture decisions", "minRelevance": 0.8 }

// Medium precision - moderately relevant results
{ "query": "bug fixes", "minRelevance": 0.5 }

// No filter - all matches ranked by relevance (default)
{ "query": "typescript" }
```

**Time Range Examples:**
```json
// Find memories from last week
{ "query": "project update", "daysAgo": 7 }

// Find memories from specific date range
{ "startDate": "2025-01-01", "endDate": "2025-01-31" }

// Find recent memories with specific tags
{ "tags": ["bug"], "daysAgo": 3 }
```

### `update-memory`
Update an existing memory with new content and/or tags.

**Parameters:**
- `hash` (string, required) - Hash of the memory to update
- `content` (string, required) - New content for the memory
- `tags` (array, optional) - New tags to replace existing tags (if omitted, existing tags preserved)

**Behavior:**
- Hash changes when content changes
- Memory ID and creation date remain unchanged
- Relationships to other memories are preserved

**Example:**
```json
{
  "hash": "abc123...",
  "content": "Updated project status: phase 2 complete",
  "tags": ["project", "status", "complete"]
}
```

### `delete-memory`
Delete memories by hash or tag.

**Parameters:**
- `hash` (string, optional) - Hash of specific memory to delete
- `tag` (string, optional) - Delete all memories with this tag

**Example:**
```json
{
  "tag": "temporary"
}
```

### `memory-stats`
Get statistics about stored memories.

**Returns:**
- Total memories count
- Total relationships count
- Database size in bytes
- Schema version
- Backup status (if configured):
  - Backup path
  - Number of backup files
  - Minutes since last backup
  - Minutes until next backup

---

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `MEMORY_DB` | Database file path | `./memory.db` | `/home/user/memories.db` |
| `MEMORY_BACKUP_PATH` | Backup directory (optional) | None | `/home/user/backups` |
| `MEMORY_BACKUP_INTERVAL` | Minutes between backups | `0` (disabled) | `180` |
| `MEMORY_BACKUP_KEEP` | Number of backups to keep | `10` | `24` |
| `MEMORY_CLOUD_SAFE` | Cloud storage safe mode | `false` | `true` |
| `DEBUG` | Enable debug logging | `false` | `true` |

### Custom Database Location

> 💡 **Quick Access**: Run `npm run setup` to see your config file path, then Ctrl+click to open it

```json
{
  "mcpServers": {
    "simple-memory": {
      "command": "simple-memory",
      "env": {
        "MEMORY_DB": "/path/to/your/memory.db"
      }
    }
  }
}
```

### With Automatic Backups

```json
{
  "mcpServers": {
    "simple-memory": {
      "command": "simple-memory",
      "env": {
        "MEMORY_DB": "/home/user/memory.db",
        "MEMORY_BACKUP_PATH": "/home/user/OneDrive/MCP-Backups",
        "MEMORY_BACKUP_INTERVAL": "180",
        "MEMORY_BACKUP_KEEP": "24"
      }
    }
  }
}
```

**💡 Backup Strategy:**
- **Lazy backups** - Only backs up after write operations
- **Throttled** - Won't backup again until interval passes
- **Efficient** - No wasted backups when idle

**⚠️ Cloud Storage Best Practices:**
- ✅ **Recommended**: Store database locally, backup to cloud (as shown above)
- ⚠️ **Not Recommended**: Store database directly in OneDrive/Dropbox
  - WAL mode creates 3 files that sync at different times → corruption risk
  - File locking conflicts cause "database locked" errors
  - 2-10x slower performance

**If you must store directly in cloud storage**, enable safe mode:
```json
{
  "env": {
    "MEMORY_DB": "/path/to/OneDrive/memory.db",
    "MEMORY_CLOUD_SAFE": "true"
  }
}
```
This uses DELETE journal mode instead of WAL (30-50% slower but safer).

### Multiple Database Instances

Run multiple instances for different contexts:

```json
{
  "mcpServers": {
    "memory-work": {
      "command": "simple-memory",
      "env": {
        "MEMORY_DB": "/path/to/work-memory.db"
      }
    },
    "memory-personal": {
      "command": "simple-memory",
      "env": {
        "MEMORY_DB": "/path/to/personal-memory.db"
      }
    }
  }
}
```

---

## 🗄️ Database

### Technology

- **SQLite** with WAL mode for better concurrency
- **FTS5** for lightning-fast full-text search
- **Normalized tags** with proper indexing (50-200x faster than LIKE queries)
- **Automatic relationships** between related memories

### Schema Features

- ✅ Automatic migrations with data integrity guarantees
- ✅ Optimized indexes on all hot paths
- ✅ Prepared statements for all queries
- ✅ 64MB cache with memory-based temp storage
- ✅ Transaction-based bulk operations

### Size Limits

- Maximum content size: 5MB per memory
- No limit on number of memories
- No limit on number of tags

---

## 🔧 Development

### Setup

```bash
# Clone the repository
git clone https://github.com/chrisribe/simple-memory-mcp.git
cd simple-memory-mcp

# Install dependencies
npm install

# Build
npm run build
```

### Commands

```bash
# Development mode with hot reload
npm run dev

# Build TypeScript
npm run build

# Build with version bump (for releases)
npm run build:release

# Run all tests (28 tests)
npm run test:all

# Run specific test suites
npm test              # Core functionality (9 tests)
npm run test:perf     # Performance tests (6 tests)
npm run test:migration # Migration tests (13 tests)

# Performance benchmarks
npm run benchmark

# Link/unlink globally for testing
npm run link          # Build and link globally (makes 'simple-memory' command available)
npm run unlink        # Remove global link

# Or manually
npm link              # Link current directory globally
npm unlink -g         # Unlink from global
simple-memory memory-stats  # Test the global command
```

### Versioning

The project uses automated version bumping:

- **Development builds**: Use `npm run build` (no version change)
- **Release builds**: Use `npm run build:release` (bumps patch version)
- **Manual version bumps**: Use `npm run version:patch|minor|major`
- **Automatic**: All commits/merges to `main` automatically bump the patch version via GitHub Actions

The workflow skips version bumps for:
- Documentation-only changes (`.md` files)
- Changes to `docs/` directory
- Commits containing `[skip-version]` in the message

### Testing

The project has comprehensive test coverage:

- ✅ **Core Tests** (9) - CRUD operations, search, basic functionality
- ✅ **Performance Tests** (6) - Large content, size limits, throughput
- ✅ **Migration Tests** (13) - Schema upgrades, rollback safety, data integrity
- ✅ **Benchmarks** - Detailed performance metrics

All tests pass with 100% backward compatibility.

---

## 📝 Examples

### Real-World Usage with AI Assistants

Simple Memory shines when used with AI assistants through MCP. Here are real conversation flows:

#### 🎯 Example 1: Building Project Context Over Time

**Day 1:**
> **You:** "I'm starting a new project. It's a React app with TypeScript, using Vite for bundling. We'll deploy to Vercel."
> 
> **Assistant:** *Stores this with tags: `project`, `react`, `typescript`, `vite`, `vercel`*

**Day 3:**
> **You:** "What stack am I using for my project again?"
> 
> **Assistant:** *Searches memories and finds: "You're using React with TypeScript, Vite for bundling, and deploying to Vercel."*

**Week 2:**
> **You:** "We decided to add Prisma ORM with PostgreSQL for the database."
> 
> **Assistant:** *Stores this and auto-links to previous project memories*

**Week 4:**
> **You:** "Give me a summary of all my tech stack decisions."
> 
> **Assistant:** *Retrieves all related memories and provides complete context*

#### 💡 Example 2: Personal Knowledge Base

**Learning Session:**
> **You:** "Remember this: TypeScript generics allow type-safe reusable components. The syntax is `function name<T>(arg: T): T`"
> 
> **Assistant:** *Stores with tags: `typescript`, `generics`, `learning`*

> **You:** "Also note: Array.reduce() is perfect for transforming arrays into single values. Use it instead of forEach when accumulating."
> 
> **Assistant:** *Stores with tags: `javascript`, `arrays`, `patterns`*

**Later that week:**
> **You:** "What did I learn about TypeScript generics?"
> 
> **Assistant:** *Retrieves your note with the exact syntax example*

> **You:** "Show me all my JavaScript tips"
> 
> **Assistant:** *Searches tag `javascript` and finds all related notes*

#### 🔐 Example 3: Secure Information Storage

**Storing Credentials:**
> **You:** "Store this API key for the payment gateway: sk_live_abc123xyz"
> 
> **Assistant:** *Stores securely with tags: `api-key`, `payment`, `credentials`*

> **You:** "The database connection string is postgresql://user:pass@host:5432/db"
> 
> **Assistant:** *Stores with tags: `credentials`, `database`, `connection-string`*

**Retrieval:**
> **You:** "What's my payment gateway API key?"
> 
> **Assistant:** *Searches memories: "Your payment gateway API key is sk_live_abc123xyz"*

> **You:** "Show me all my stored credentials"
> 
> **Assistant:** *Lists all memories tagged with `credentials`*

#### 📋 Example 4: Meeting Notes & Decisions

**After Team Meeting:**
> **You:** "Meeting notes: Team agreed on 2-week sprints starting Monday. Sprint planning on Mondays at 10am. Retrospectives on Fridays."
> 
> **Assistant:** *Stores with tags: `meeting`, `agile`, `team`, `schedule`*

> **You:** "Important decision: We're going with PostgreSQL instead of MongoDB for better transaction support."
> 
> **Assistant:** *Stores with tags: `decision`, `database`, `architecture`*

**Later:**
> **You:** "When are our sprint meetings?"
> 
> **Assistant:** *Retrieves schedule from meeting notes*

> **You:** "Why did we choose PostgreSQL?"
> 
> **Assistant:** *Finds decision and reasoning: "For better transaction support"*

#### 🚀 Example 5: Continuous Context Building

The real power comes from **persistent memory across all conversations**:

```
Session 1: Store project setup info
  ↓
Session 2: Assistant remembers and builds on it
  ↓
Session 5: Store API decisions
  ↓
Session 10: Assistant recalls everything - full context maintained
  ↓
Session 20: Complete project knowledge base available instantly
```

**This is impossible with standard chat sessions that lose context!**

---

### 🔧 CLI Usage (For Testing & Direct Access)

You can also use the CLI directly for testing or scripting:

```bash
# Store a memory
simple-memory store-memory \
  --content "PostgreSQL connection: postgresql://localhost:5432/mydb" \
  --tags "database,credentials"

# Search by content
simple-memory search-memory --query "PostgreSQL"

# Search by tags
simple-memory search-memory --tags "credentials"

# View statistics
simple-memory memory-stats

# Delete memories by tag
simple-memory delete-memory --tag "temporary"
```

**When to use CLI:**
- ✅ Testing the MCP server works
- ✅ Bulk operations or scripting
- ✅ Debugging or inspecting the database
- ✅ Manual backup before major changes

**Primary use case:** Let your AI assistant handle everything through natural conversation!

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built with the [Model Context Protocol SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- Powered by [SQLite](https://www.sqlite.org/) and [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)

---

## 📚 Additional Resources

- 🏗️ [Design Philosophy](docs/DESIGN_PHILOSOPHY.md) - Why Simple Memory is built this way, trade-offs, and honest limitations
- 🚀 [Performance Benchmarks](docs/PERFORMANCE.md) - Detailed performance analysis and optimization insights
- 📝 [Changelog](CHANGELOG.md) - Version history and changes

---

## 🐛 Issues & Support

Found a bug or have a feature request?

- 🐛 [Report Issues](https://github.com/chrisribe/simple-memory-mcp/issues)
- 💬 [Start a Discussion](https://github.com/chrisribe/simple-memory-mcp/discussions)
- 📧 Check the [documentation](https://github.com/chrisribe/simple-memory-mcp)

---

<div align="center">

**[⬆ back to top](#-simple-memory-mcp-server)**

Made with ❤️ by [chrisribe](https://github.com/chrisribe)

</div>

