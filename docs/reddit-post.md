# Reddit Post for r/mcp

## Title

Simple Memory MCP – give your AI persistent memory with zero setup

## Post

I built an MCP server that gives AI assistants persistent memory across sessions using local SQLite. No cloud, no vector DB, no API keys – just keyword search that works.

**The problem it solves:** Every new conversation starts from scratch. Your preferences, project decisions, context – gone.

**How it works:** The AI stores and retrieves memories automatically as you chat. Everything stays in a local SQLite database with FTS5 full-text search.

**Setup (one line):**
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

**What it's not:** It's not a RAG system. No embeddings, no semantic search. It's keyword-based search in SQLite – simple and fast. If you need vector similarity, this isn't for you.

It's MIT licensed, fully local, and I'd genuinely appreciate any feedback – what works, what doesn't, what's missing.

GitHub: https://github.com/chrisribe/simple-memory-mcp
npm: https://www.npmjs.com/package/simple-memory-mcp
