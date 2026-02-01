# Simple Memory Design Philosophy

Core design decisions behind simple-memory-mcp.

## Design Decisions

### SQLite + FTS5 over Vector Embeddings

**What we use:** SQLite with FTS5 full-text search, tags, and auto-linking.

**Why not vector embeddings:**
- Model downloads (500MB+) and runtime overhead
- Embedding generation adds latency to every store/search
- Complex setup vs zero-config SQLite
- We're storing structured knowledge with known terminology

**Trade-off:** Keyword-based, not semantic. Need specific terminology.

**What we gain:** Zero setup, fully local, sub-millisecond search, transparent.

### GraphQL-Based MCP Tool Consolidation

Consolidated 8 MCP tools → 3 using GraphQL:
- **Before:** store, search, update, delete, stats, export, import, graphql
- **After:** memory-graphql, export-memory, import-memory

**The "1 MCP = 1 Skill" Pattern:**
```
Traditional MCP (Broken at Scale):
  Server: "Here are ALL 47 tools"
  LLM: Gets dumber picking from 47 options

Skill Model:
  Server: "I am the Memory skill. Here's 1 tool with introspection."
  LLM: Queries schema → learns capabilities on-demand
  LLM: Executes batched queries → gets only what it asked for
```

**Why GraphQL:**
- 76% token reduction in tool definitions
- Progressive disclosure (request only needed fields)
- Batched operations in one round-trip
- Fewer tools = sharper LLM decisions

**Trade-off:** Requires LLM to understand GraphQL syntax.

---

## When to Use Something Else

| Need | Use Instead |
|------|-------------|
| Semantic similarity search | ChromaDB, Pinecone |
| Team collaboration / shared knowledge | Confluence, Notion |
| Production RAG system | Vector DB + embeddings |
| Framework integration | LangChain Memory |

---

## Core Principles

| Principle | Choice | Why |
|-----------|--------|-----|
| **Simple** | SQLite over complex DBs | Complexity is maintenance burden |
| **Local** | No cloud dependencies | Privacy, no latency |
| **Transparent** | Inspect with any SQLite tool | Trust requires understanding |
| **Pragmatic** | Keyword search over semantic | Good enough for known terminology |

---

## Conclusion

Simple memory is **pragmatic, not sophisticated**. SQLite + FTS5 + GraphQL consolidation.

If you need semantic search, team sync, or massive scale—use something else. For local, fast, private memory that just works: this is it.
