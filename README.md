# 🧠 Simple Memory MCP Server

[![npm version](https://img.shields.io/npm/v/simple-memory-mcp.svg)](https://www.npmjs.com/package/simple-memory-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)

A blazingly fast Model Context Protocol (MCP) server for persistent memory storage with intelligent tagging and full-text search.

Perfect for AI assistants that need to remember context across conversations, store project notes, or build a personal knowledge base.

> **Simple by design:** Keyword search, not semantic. Local SQLite, not cloud. Zero setup, not configuration hell. If you need vector embeddings or team collaboration, see [alternatives](docs/design-philosophy.md#when-to-use-something-else).

---

## ✨ Features

- 🧠 **Auto-Capture** - LLM proactively stores important information during conversations
- 🚀 **Sub-millisecond Performance** - 2,000-10,000 operations/second
- 🔍 **Full-Text Search** - SQLite FTS5 with 0.14ms average query time
- 🏷️ **Smart Tagging** - Organize and filter memories with tags
- 🔗 **Auto-Relationships** - Automatically link related memories
- 💾 **Automatic Backups** - Optional lazy backups to cloud storage
- 📦 **Zero Config** - Works out of the box with sensible defaults

---

## 🚀 Quick Start

### Configure MCP Client

**Claude Desktop** (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "simple-memory": {
      "command": "npx",
      "args": ["-y", "simple-memory-mcp"]
    }
  }
}
```

**VS Code** (`.vscode/mcp.json`):
```json
{
  "mcpServers": {
    "simple-memory": {
      "command": "npx",
      "args": ["-y", "simple-memory-mcp"]
    }
  }
}
```

Restart your MCP client - that's it! No install needed.

> 💡 **Best Experience**: Works best with **Claude Sonnet in Agent Mode** for optimal auto-capture.

### Auto-Configure VS Code & Claude Desktop

```bash
npx -y simple-memory-mcp setup
```

This automatically configures all detected installations.

### Optional: Install CLI

For command-line usage (search, stats, export/import):

```bash
npm install -g simple-memory-mcp
simple-memory setup  # auto-configure VS Code & Claude
```

### For Contributors

```bash
git clone https://github.com/chrisribe/simple-memory-mcp.git
cd simple-memory-mcp
npm run setup  # installs, builds, links, and configures
```

That's it! The AI assistant can now remember information across conversations.

---

## 💻 CLI Commands

```bash
# Setup - auto-configure VS Code and Claude Desktop
simple-memory setup

# Search memories
simple-memory search --query "typescript" --limit 5
simple-memory search --tags "project,work"

# Store a memory
simple-memory store --content "Remember this" --tags "note"

# Other operations
simple-memory get --hash "abc123..."
simple-memory delete --hash "abc123..."
simple-memory stats

# Export/import
simple-memory export-memory --output backup.json
simple-memory import-memory --input backup.json
```

Run `simple-memory --help` for all options.

---

## 🛠️ Available Tools

Simple Memory exposes **3 MCP tools**:

### `memory-graphql`

The primary tool - handles all memory operations via GraphQL.

```graphql
# Query
{ memories(query: "typescript", limit: 5) { hash title tags } }
{ memory(hash: "abc...") { content tags } }
{ stats { totalMemories } }

# Mutations
mutation { store(content: "Note", tags: ["tag"]) { hash } }
mutation { update(hash: "abc...", content: "Updated") { newHash } }
mutation { delete(hash: "abc...") { success } }
```

**Schema:**
```graphql
type Memory { hash, content, title, preview, tags, createdAt, relevance }
type Query {
  memories(query: String, tags: [String], limit: Int): [Memory!]!
  memory(hash: String!): Memory
  related(hash: String!, limit: Int): [Memory!]!
  stats: Stats!
}
type Mutation {
  store(content: String!, tags: [String]): StoreResult!
  update(hash: String!, content: String!, tags: [String]): UpdateResult!
  delete(hash: String, tag: String): DeleteResult!
}
```

### `export-memory` / `import-memory`

Backup and restore memories as JSON files.

---

## ⚙️ Configuration

**Zero config default:** `~/.simple-memory/memory.db`

**Custom database location:**
```json
{
  "mcpServers": {
    "simple-memory": {
      "command": "npx",
      "args": ["-y", "simple-memory-mcp"],
      "env": {
        "MEMORY_DB": "/path/to/memory.db"
      }
    }
  }
}
```

**With automatic backups:**
```json
{
  "env": {
    "MEMORY_BACKUP_PATH": "/path/to/OneDrive/backups",
    "MEMORY_BACKUP_INTERVAL": "180"
  }
}
```

📖 **Full configuration guide:** [docs/configuration.md](docs/configuration.md)
- Environment variables reference
- Backup strategies
- Cloud storage best practices
- HTTP transport setup
- Multiple database instances

---

## 🔧 Development

```bash
npm install          # Install dependencies
npm run build        # Build TypeScript
npm test             # Run tests
npm run benchmark    # Performance benchmarks
```

**Testing:**
```bash
npm test              # GraphQL tests
npm run test:perf     # Performance tests  
npm run test:migration # Migration tests
```

---

## 📚 Documentation

| Guide | Description |
|-------|-------------|
| [Configuration](docs/configuration.md) | Full config reference, backups, cloud storage |
| [Examples](docs/examples.md) | Real-world usage scenarios with AI assistants |
| [Design Philosophy](docs/design-philosophy.md) | Trade-offs and architectural decisions |
| [Performance](docs/performance.md) | Benchmarks and optimization details |
| [Web Server](docs/features/WEB-SERVER.md) | Optional visual web interface |
| [Changelog](CHANGELOG.md) | Version history |

**Developer Docs:** [docs/dev/](docs/dev/) - Manual testing, publishing guide, optimization history

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- [Model Context Protocol SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [SQLite](https://www.sqlite.org/) & [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)

---

<div align="center">

**[⬆ back to top](#-simple-memory-mcp-server)**

Made with ❤️ by [chrisribe](https://github.com/chrisribe)

</div>
