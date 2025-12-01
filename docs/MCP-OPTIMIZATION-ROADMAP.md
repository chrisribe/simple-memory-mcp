# MCP Optimization Roadmap

## Status: ✅ COMPLETED (2025-11-30)

Reduced from 8 MCP tools to 3, with ~76% token reduction in tool definitions.

### References
- [Anthropic: Code execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp)
- [Theo's MCP Critique](https://www.youtube.com/watch?v=1piFEKA9XL0)

---

## The Problem

MCP has fundamental issues with context bloat:
1. **Tool definitions** - All schemas loaded into every message
2. **Round-trip compounding** - Each tool call carries ALL previous context

---

## What We Implemented

### Phase 1: Summary Mode ✅
Added `summaryOnly` parameter to reduce search result size by ~75%.

### Phase 2: Hash Lookup ✅
Added `hash` parameter for drill-down to full content.

### Phase 3: GraphQL Consolidation ✅
Replaced 5 separate tools with 1 unified GraphQL interface.

**Before:** 8 tools (store, search, update, delete, stats, export, import, graphql)
**After:** 3 tools (memory-graphql, export-memory, import-memory)

### Results

| Metric | Before | After |
|--------|--------|-------|
| MCP Tools | 8 | **3** |
| Tool definition tokens | ~1839 | **~448** |
| Token reduction | - | **~76%** |
| Tokens per search (10 results) | ~2000 | **~500** (summaryOnly) |

---

## Current Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    3 MCP Tools                           │
├─────────────────────────────────────────────────────────┤
│  memory-graphql   → All CRUD via GraphQL queries        │
│  export-memory    → JSON export with filters            │
│  import-memory    → JSON import with deduplication      │
└─────────────────────────────────────────────────────────┘
```

### GraphQL Schema

```graphql
type Query {
  memories(query: String, tags: [String], limit: Int, summaryOnly: Boolean): [Memory!]!
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

### Key Files

| File | Purpose |
|------|---------|
| `src/graphql/schema.ts` | GraphQL type definitions |
| `src/graphql/resolvers.ts` | Map to memory-service |
| `src/tools/memory-graphql/` | MCP tool + executor |
| `src/tools/export-memory/` | Export functionality |
| `src/tools/import-memory/` | Import functionality |

---

## Vision: "1 MCP = 1 Skill" Pattern

The GraphQL approach enables a scalable pattern for MCP tooling:

```
Current MCP (Broken at Scale):
  Server: "Here are ALL 47 tools"
  LLM: Gets dumber picking from 47 options

Skill Model:
  Server: "I am the Memory skill. Here's 1 tool with introspection."
  LLM: Queries schema → learns capabilities on-demand
  LLM: Executes batched queries → gets only what it asked for
```

### Why This Works

| Problem | Solution |
|---------|----------|
| 150K tokens of tool defs | ~300 tokens per skill |
| Models get dumber with more tools | Fewer tools = sharper decisions |
| Round-trip compounding | Batched GraphQL queries |
| No progressive disclosure | Field selection = request only what you need |

---

## Future Considerations (Not Planned)

- **Phase 4: Code Execution** - Only if GraphQL proves insufficient
- **Phase 5: SDK Mode** - Direct library import, bypassing MCP

These were deemed YAGNI for current needs.

---

*Created: 2025-11-27*
*Completed: 2025-11-30*
