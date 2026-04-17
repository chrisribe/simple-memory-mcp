# 🧠 Simple Memory MCP Server

[![npm version](https://img.shields.io/npm/v/simple-memory-mcp.svg)](https://www.npmjs.com/package/simple-memory-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)

Give your AI assistant persistent memory across sessions.

> ### 🚀 Looking for the next evolution?
> **[git-memory](https://github.com/chrisribe/git-memory)** is now my daily driver — it builds on the ideas from simple-memory and takes them further. If you're starting fresh, check it out! Simple-memory is still functional but is no longer my main focus.

**The problem:** AI assistants forget everything when you start a new conversation. Your preferences, project context, decisions - all gone.

**The solution:** Simple Memory lets AI store and retrieve information that persists forever. Local SQLite database, zero cloud, sub-millisecond fast.

**Why not RAG?** RAG systems need vector databases, embeddings, chunking strategies, and ongoing maintenance. Simple Memory is just keyword search in SQLite - no ML infrastructure, no API costs, works offline. Perfect for personal knowledge that doesn't need semantic similarity.

---

## How It Works

**You:** "Remember that I prefer TypeScript over JavaScript and use 4-space indentation"

**AI:** *stores this automatically*

*...days later, new session...*

**You:** "Help me set up a new project"

**AI:** *searches memory, finds your preferences* → Sets up TypeScript with 4-space indentation

The AI handles storage and retrieval automatically. You just chat naturally.

> **Simple by design:** Keyword search, not semantic. Local SQLite, not cloud. Zero setup, not configuration hell. If you need vector embeddings or team collaboration, see [alternatives](docs/design-philosophy.md#when-to-use-something-else).

<details>
<summary><strong>📖 End-to-End Example</strong></summary>

**Session 1 (January):**
```
You: "I'm using PostgreSQL with TypeScript. Decided on Prisma ORM after 
      evaluating TypeORM - better type inference and migrations."

AI: → stores automatically with tags [tech-stack, database, decision]
```

**Session 2 (3 weeks later):**
```
You: "Setting up a new microservice, what database setup should I use?"

AI: → searches memories, finds your PostgreSQL + Prisma decision
   "Based on your previous work, you standardized on PostgreSQL with Prisma 
    ORM. You chose it over TypeORM for the better type inference..."
```

**What got stored:**
```json
{
  "content": "Tech stack decision: PostgreSQL + Prisma ORM. Chose over TypeORM for better type inference and cleaner migrations.",
  "tags": ["tech-stack", "database", "decision"],
  "relevance": 0.92  // BM25 score when searching "database setup"
}
```

</details>

---

## 🤔 Why I built this

I got tired of every new conversation starting from zero. I use this daily - saving project status, gotchas, ideas that pop up while I’m deep in work. Instead of breaking flow to write things down somewhere, I just tell the assistant to save it and keep going.
Having it all central means I can reference old solutions, things that failed, things that worked - across projects, across time. It’s basically an external memory for my dev brain.

---

## ✨ Features

- 🧠 **Persistent Memory** - Survives across sessions, restarts, forever
- 🔍 **Full-Text Search** - Find memories by keyword, tags, or content
- 🏷️ **Smart Tagging** - Organize memories with tags
- 💾 **Automatic Backups** - Optional sync to OneDrive/Dropbox
- 📦 **Zero Config** - Works out of the box
- 🚀 **Fast** - Sub-millisecond queries, 2,000-10,000 ops/sec

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

## 🛠️ MCP Tools

The AI uses these tools automatically - you don't need to call them directly.

| Tool | Purpose |
|------|---------|
| `memory-graphql` | Store, search, update, delete memories |
| `export-memory` | Backup memories to JSON file |
| `import-memory` | Restore memories from JSON file |

<details>
<summary>GraphQL Schema (for developers)</summary>

```graphql
type Memory { hash, content, title, preview, tags, createdAt, relevance }
type StoreResult { success, hash, error }
type UpdateResult { success, hash, error }
type DeleteResult { success, hash, deletedCount, error }

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

**Note**: Mutation results return minimal data (hash/success). To get full memory fields (title, tags, createdAt), query: `{ memory(hash: "...") { ... } }`

</details>

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
| [Configuration](docs/configuration.md) | Full config reference, backups, cloud storage, HTTP transport |
| [Examples](docs/examples.md) | Real-world scenarios, namespace patterns |
| [Design Philosophy](docs/design-philosophy.md) | Trade-offs, BM25 relevance scoring |
| [Performance](docs/performance.md) | Benchmarks and optimization details |
| [Web Server](docs/features/web-server.md) | Visual memory browser interface |
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
