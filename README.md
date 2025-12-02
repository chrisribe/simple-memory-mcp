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
| Store Memory (1KB) | 0.05ms | ~20,000 ops/sec |
| Full-Text Search | 0.08ms | ~13,000 ops/sec |
| Tag Search | 0.22ms | ~4,500 ops/sec |
| Bulk Relationships (10) | 0.29ms | ~3,500 ops/sec |

**All operations complete in sub-millisecond timeframes** with optimized indexes and prepared statements.

> 📏 **Reproduce these numbers:** Run `npm run benchmark` after setup. Results vary by hardware - tested on NVMe SSD with Node.js 20+.


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

#### Quick Commands

For common operations, use simple shortcuts:

```bash
# Search memories
simple-memory search --query "typescript" --limit 5
simple-memory search --tags "project,work" --limit 20
simple-memory search --query "bug" --daysAgo 7
simple-memory search --query "api" --verbose  # Shows generated GraphQL

# Store a memory
simple-memory store --content "Remember this note"
simple-memory store --content "API key: xyz" --tags "credentials,api"

# Update a memory
simple-memory update --hash "abc123..." --content "Updated content"

# Get specific memory
simple-memory get --hash "abc123..."

# Find related memories
simple-memory related --hash "abc123..." --limit 10

# Delete memories
simple-memory delete --hash "abc123..."
simple-memory delete --tag "temporary"

# Get database stats
simple-memory stats

# Export/import
simple-memory export-memory --output backup.json
simple-memory import-memory --input backup.json
```

Run `simple-memory <command> --help` for command-specific options.

> 💡 **Learning GraphQL?** Use `--verbose` with any shortcut command to see the generated GraphQL query. Great for learning the syntax!

#### Advanced: Raw GraphQL

Power users can execute raw GraphQL queries:

```bash
# Raw GraphQL query
simple-memory graphql --query '{ memories(query: "search term") { hash title tags } }'

# GraphQL mutation
simple-memory graphql --query 'mutation { store(content: "Your content") { hash } }'

# Batch multiple operations in one call
simple-memory graphql --query '{
  recent: memories(limit: 5) { hash title }
  tagged: memories(tags: ["important"]) { hash title }
  stats { totalMemories }
}'
```

---

## 🛠️ Available Tools

Simple Memory exposes **3 MCP tools** - a unified GraphQL interface plus import/export:

### `memory-graphql`
**The primary tool** - handles all memory operations via GraphQL queries and mutations.

**🧠 Auto-Capture:** This tool includes behavioral guidance that encourages your AI assistant to:
- Proactively search memories at conversation start
- Store important information silently (preferences, decisions, facts)
- Use descriptive tags for easy retrieval
- Return only needed fields for efficiency

**Parameters:**
- `query` (string, required) - GraphQL query or mutation
- `variables` (object, optional) - Variables for parameterized queries

**Schema Overview:**
```graphql
type Query {
  memories(query: String, tags: [String], limit: Int, summaryOnly: Boolean): [Memory!]!
  memory(hash: String!): Memory           # Get full content by hash
  related(hash: String!, limit: Int): [Memory!]!
  stats: Stats!
}

type Mutation {
  store(content: String!, tags: [String]): StoreResult!
  update(hash: String!, content: String!, tags: [String]): UpdateResult!
  delete(hash: String, tag: String): DeleteResult!
}

type Memory {
  hash: String!
  content: String!
  title: String           # First 100 chars
  preview: String         # First 200 chars  
  tags: [String!]!
  createdAt: String!
  relevance: Float        # BM25 score (search only)
}
```

**Example Queries:**
```graphql
# Efficient search (summaries only)
{ memories(query: "typescript", summaryOnly: true) { hash title tags } }

# Then get full content for specific memory
{ memory(hash: "abc123...") { content tags createdAt } }

# Store with auto-generated hash
mutation { store(content: "Remember this", tags: ["note"]) { success hash } }

# Batch multiple operations
{
  search: memories(query: "mcp", limit: 3) { hash title }
  recent: memories(limit: 5) { hash createdAt }
  stats { totalMemories }
}
```

### `export-memory`
Export memories to JSON file for backup or sharing.

**Parameters:**
- `output` (string, required) - Output file path
- `tags` (array, optional) - Filter by tags
- `daysAgo` (number, optional) - Export memories from last N days
- `startDate` / `endDate` (string, optional) - Date range filter
- `limit` (number, optional) - Maximum memories to export

### `import-memory`
Import memories from JSON file.

**Parameters:**
- `input` (string, required) - Input file path
- `skipDuplicates` (boolean, optional) - Skip existing memories
- `preserveTimestamps` (boolean, optional) - Keep original dates
- `dryRun` (boolean, optional) - Preview without importing

---

## ⚙️ Configuration

### Zero Config Default

Simple Memory works **out of the box** with no configuration needed:

```
~/.simple-memory/memory.db
```

- **Windows**: `C:\Users\{username}\.simple-memory\memory.db`
- **macOS/Linux**: `/home/{username}/.simple-memory/memory.db`

Just add to your MCP config and start using it:

```json
{
  "mcpServers": {
    "simple-memory": {
      "command": "simple-memory"
    }
  }
}
```

### Environment Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `MEMORY_DB` | Database file path | `~/.simple-memory/memory.db` | `/home/user/memories.db` |
| `MEMORY_BACKUP_PATH` | Backup directory (optional) | None | `/home/user/backups` |
| `MEMORY_BACKUP_INTERVAL` | Minutes between backups | `0` (disabled) | `180` |
| `MEMORY_BACKUP_KEEP` | Number of backups to keep | `10` | `24` |
| `MEMORY_CLOUD_SAFE` | Cloud storage safe mode | `false` | `true` |
| `MEMORY_DEBUG` | Enable debug logging in CLI mode | `false` | `true` |
| `DEBUG` | Enable debug logging (MCP server) | `false` | `true` |

### Custom Database Location

For power users who want to control where the database is stored:

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

### HTTP Transport (Advanced)

For Docker deployments, remote servers, or avoiding local Node.js path issues, you can run Simple Memory as an HTTP server:

**1. Start the HTTP server:**
```bash
# With default database (~/.simple-memory/memory.db)
simple-memory --http

# With custom database and port
MEMORY_DB=/path/to/memory.db MCP_PORT=3001 simple-memory --http
```

**2. Configure your MCP client to use HTTP:**
```json
{
  "mcpServers": {
    "simple-memory": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

**When to use HTTP transport:**
- 🐳 Running in Docker or remote server
- 🖥️ Multiple MCP clients sharing one database
- 🔧 Avoiding Node.js path configuration issues
- 🌐 Exposing memory server to network (use with caution!)

**Note:** HTTP transport requires manually starting the server before using MCP clients. For most local setups, the default stdio transport is simpler.

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

# Run tests
npm test              # GraphQL tests (11 tests)
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
simple-memory memory-graphql --query '{ stats { totalMemories } }'  # Test the global command
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

- ✅ **GraphQL Tests** (11) - Full CRUD, batching, error handling via GraphQL API
- ✅ **Performance Tests** (6) - Large content, size limits, throughput
- ✅ **Migration Tests** (13) - Schema upgrades, rollback safety, data integrity
- ✅ **Benchmarks** - Detailed performance metrics with reproduction steps

```bash
npm test              # GraphQL comprehensive tests
npm run test:perf     # Performance tests
npm run test:migration # Migration tests
npm run benchmark     # Full benchmark suite (reproduce README numbers)
```

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
simple-memory memory-graphql --query 'mutation { 
  store(content: "PostgreSQL connection: postgresql://localhost:5432/mydb", tags: ["database", "credentials"]) 
  { hash } 
}'

# Search by content
simple-memory memory-graphql --query '{ memories(query: "PostgreSQL") { hash title tags } }'

# Search by tags
simple-memory memory-graphql --query '{ memories(tags: ["credentials"]) { hash content } }'

# View statistics
simple-memory memory-graphql --query '{ stats { totalMemories totalRelationships dbSize } }'

# Delete memories by tag
simple-memory memory-graphql --query 'mutation { delete(tag: "temporary") { deletedCount } }'
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

