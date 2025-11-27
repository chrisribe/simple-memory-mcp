# MCP Optimization Roadmap

## Context

The MCP protocol has fundamental issues with context bloat:
1. **Tool definitions** - All schemas loaded into every message
2. **Round-trip compounding** - Each tool call carries ALL previous context as input tokens

This plan adds progressive disclosure to reduce token usage while maintaining backwards compatibility.

### References
- [Anthropic: Code execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp)
- [Theo's MCP Critique](https://www.youtube.com/watch?v=1piFEKA9XL0)

---

## Phase 1: Summary Mode

**Effort:** 1-2 hours  
**Goal:** Reduce search result size by 80%+

### Changes to search-memory tool

Add new parameters:
- `summaryOnly: boolean` (default: false for backwards compat)
- `contentPreview: number` (chars to include, default: 100)

When `summaryOnly=true`, return:
```json
{
  "hash": "abc123...",
  "title": "First line of content (max 80 chars)",
  "tags": ["tag1", "tag2"],
  "createdAt": "2025-11-27T...",
  "relevanceScore": 0.85,
  "preview": "First 100 chars of content..."
}
```

**NOT** full content.

### Files to modify

| File | Change |
|------|--------|
| `src/tools/search-memory/executor.ts` | Add summary transformation logic |
| `src/tools/search-memory/index.ts` | Add parameters to tool schema |
| `src/tools/search-memory/cli-parser.ts` | Add `--summary`, `--preview-length` flags |
| `src/services/memory-service.ts` | Optional: add summary query variant |

### Test

Compare token count:
- Full search (10 results): ~2000 tokens
- Summary search (10 results): ~400 tokens

---

## Phase 2: getMemory Tool

**Effort:** Half day  
**Goal:** Enable drill-down to full content without loading all results

### New tool: get-memory

```typescript
interface GetMemoryInput {
  hash: string;
}

interface GetMemoryOutput {
  memory: MemoryRecord;
}
```

Single memory retrieval by hash.

### Files to create

```
src/tools/get-memory/
├── index.ts
├── executor.ts
└── cli-parser.ts
```

### Files to update

| File | Change |
|------|--------|
| `src/tools/index.ts` | Register new tool |
| search-memory description | "Returns summaries. Use get-memory for full content." |

### Usage Pattern

```
1. search-memory --query "typescript" --summary
   → Returns 10 summaries (~400 tokens)

2. LLM picks relevant ones

3. get-memory --hash abc123
   → Returns full content of ONE memory (~200 tokens)
```

---

## Phase 3: GraphQL Single-Tool Interface (Recommended)

**Effort:** Half day  
**Goal:** Replace 6 MCP tools with 1 GraphQL endpoint - reduces tool definition bloat + enables batched queries

### Concept

One MCP tool that accepts GraphQL queries. Schema embedded in tool description = LLM knows full API from single tool definition.

### New tool: memory-graphql

```typescript
{
  name: "memory-graphql",
  description: `Execute GraphQL queries against the memory database.
    
Schema:
  type Query {
    memories(search: String, tags: [String], limit: Int, summaryOnly: Boolean): [Memory!]!
    memory(hash: String!): Memory
    stats: Stats!
  }
  
  type Mutation {
    store(content: String!, tags: [String]): Memory!
    update(hash: String!, content: String, tags: [String]): Memory!
    delete(hash: String, tag: String): DeleteResult!
  }
  
  type Memory { hash, content, preview, tags, createdAt, relevanceScore }
  type Stats { totalMemories, totalTags, databaseSize }

Example queries:
  { memories(search: "typescript", limit: 5) { hash preview tags } }
  { memory(hash: "abc123") { content tags } }
  mutation { store(content: "...", tags: ["tag1"]) { hash } }`,
  
  inputSchema: {
    query: { type: "string", description: "GraphQL query or mutation" },
    variables: { type: "object", description: "Optional variables" }
  }
}
```

### Why GraphQL Over Code Execution

| Aspect | GraphQL | Code Execution |
|--------|---------|----------------|
| Security | Safe (structured queries) | Risky (arbitrary code) |
| LLM familiarity | High (lots of training data) | Medium |
| Batching | Native (`{ a: memories(...) b: stats }`) | Manual |
| Field selection | Built-in (request only what you need) | Manual |
| Implementation | Standard libraries | Custom sandbox |

### Implementation

1. Add packages: `graphql`, `@graphql-tools/schema`
2. Define schema (maps to existing `memory-service.ts`)
3. Create resolvers (thin wrappers around service methods)
4. Single MCP tool calls GraphQL executor

### Files to create/modify

| File | Change |
|------|--------|
| `src/graphql/schema.ts` | GraphQL type definitions |
| `src/graphql/resolvers.ts` | Map to memory-service methods |
| `src/tools/memory-graphql/` | New MCP tool |
| `package.json` | Add graphql dependencies |

### Benefits

- **1 tool vs 6** - Reduces tool definition tokens by ~80%
- **Batched queries** - Multiple operations in single call
- **Field selection** - LLM requests only fields it needs
- **No security concerns** - Unlike code execution, GraphQL is sandboxed by design
- **HTTP-ready** - Same schema works for web server branch

### Example Usage

```graphql
# Discovery + drill-down in ONE call
{
  search: memories(search: "typescript", summaryOnly: true) { 
    hash 
    preview 
    tags 
  }
  recent: memories(limit: 3) { 
    hash 
    createdAt 
  }
  stats { 
    totalMemories 
  }
}
```

---

## Phase 4: Code Execution Mode (Optional)

**Effort:** 2-3 days  
**Goal:** Single tool call that runs arbitrary code locally, returns only summary

> **Note:** Consider Phase 3 (GraphQL) first - it solves most problems without the security complexity.

### New tool: memory-query

```typescript
interface MemoryQueryInput {
  code: string;  // JS code with access to memory API
}

interface MemoryQueryOutput {
  result: any;
}
```

### Example

```javascript
memoryQuery({
  code: `
    const results = search("typescript");
    const recent = results.filter(m => daysAgo(m.createdAt) < 30);
    return { 
      count: recent.length, 
      tags: unique(recent.flatMap(m => m.tags)) 
    };
  `
})
// → { count: 5, tags: ["decision", "architecture"] }
```

### Implementation Notes

- Sandboxed execution (vm2 or isolated-vm)
- Limited API surface: `search`, `getMemory`, `filter`, `map`, `slice`
- No filesystem/network access
- Timeout: 5 seconds

### Risk

Complexity and security surface. Only implement if Phase 3 (GraphQL) proves insufficient.

---

## Phase 5: Library Mode (Future)

**Effort:** 1 day  
**Goal:** Bypass MCP entirely, expose as importable SDK

```typescript
// memory-sdk.ts
export { searchMemories, getMemory, storeMemory } from './services/memory-service';
```

LLM writes code that imports the SDK directly, runs via terminal, no MCP protocol overhead.

**Note:** CLI already provides this partially. Formalize if usage pattern emerges.

---

## Success Metrics

| Metric | Current | Phase 1 | Phase 2 | Phase 3 (GraphQL) |
|--------|---------|---------|---------|-------------------|
| Tool definitions | 6 tools (~1200 tokens) | 6 tools | 7 tools | **1 tool (~400 tokens)** |
| Tokens per search (10 results) | ~2000 | ~400 | ~400 + 200/drill-down | ~400 (field selection) |
| Tool calls for typical flow | 1 | 1 | 2 (smaller each) | **1 (batched)** |
| Backwards compatible | - | ✅ | ✅ | ❌ (new interface) |

---

## Implementation Order

```
┌─────────────────────────────────────────────────────────┐
│ 1. Phase 1: summaryOnly flag                            │
│    └─→ Quick win, backwards compatible                  │
│                                                         │
│ 2. Phase 2: get-memory tool                             │
│    └─→ Only if search-then-read pattern is common       │
│                                                         │
│ 3. Phase 3: GraphQL single-tool (RECOMMENDED)           │
│    └─→ Best balance of power vs complexity              │
│    └─→ Works with existing web-server branch            │
│                                                         │
│ 4. Phase 4: Code execution                              │
│    └─→ Only if GraphQL proves insufficient              │
│                                                         │
│ 5. Phase 5: SDK mode                                    │
│    └─→ Only if MCP overhead itself is the bottleneck    │
└─────────────────────────────────────────────────────────┘
```

**Recommended path:** Phase 1 → Phase 3 (skip Phase 2 if going GraphQL)

---

## Vision: "1 MCP = 1 Skill" Pattern

The GraphQL approach points to a broader architectural shift for MCP tooling.

### Current MCP Model (Broken at Scale)

```
MCP Server: "Here are ALL 47 tools I have"
  ↓ 
LLM Context: [tool1, tool2, ... tool47] (~15K tokens)
  ↓
LLM: Gets dumber trying to pick from 47 options
```

### Proposed Skill Model

```
MCP Server: "I am the Memory skill. Here's 1 tool with introspection."
  ↓
LLM: Queries schema when needed → learns capabilities on-demand
  ↓
LLM: Executes precise query → gets only what it asked for
```

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    MCP Registry                          │
├─────────────────────────────────────────────────────────┤
│  memory-skill     → 1 GraphQL tool → N operations       │
│  gdrive-skill     → 1 GraphQL tool → N operations       │
│  salesforce-skill → 1 GraphQL tool → N operations       │
│  slack-skill      → 1 GraphQL tool → N operations       │
└─────────────────────────────────────────────────────────┘

LLM sees: 4 tool definitions (not 47)
LLM explores: Introspection on skills it needs
LLM executes: Batched, field-selected queries
```

### Why This Works

| Current Problem | Skill Model Solution |
|-----------------|---------------------|
| 150K tokens of tool defs | ~300 tokens per skill |
| Models get dumber with more tools | Fewer tools = sharper decisions |
| No progressive disclosure | Introspection = on-demand discovery |
| Round-trip compounding | Batched GraphQL queries |
| Each tool = separate schema | One schema per skill domain |

### simple-memory as Reference Implementation

```
simple-memory-mcp (current): 6 tools, ~1200 tokens
simple-memory-skill (goal):  1 tool,  ~400 tokens + introspection
```

This pattern could be proposed to the MCP community as a design guideline for building scalable, context-efficient tool servers.

### Not Groundbreaking, Just... Obvious?

This is essentially:
- GraphQL's original pitch (2015): "Ask for what you need"
- Package managers: "Install what you need, when you need it"  
- REST → GraphQL evolution: Already happened for APIs

MCP just needs to learn the same lesson. The "innovation" is applying existing patterns to a protocol that ignored them.

---

## Background: Why MCP Has This Problem

From Theo's analysis:

> "Every additional tool call is carrying all of the previous context. So every time a tool is being called the entire history is being re-hit as input tokens."

```
Call 1: 20 tokens
Call 2: 40 tokens (includes call 1)
Call 3: 60 tokens (includes calls 1+2)
Call 4: 80 tokens...
```

Anthropic's own solution: have models write code instead of making tool calls. The code runs in a sandbox, processes data locally, returns only what's needed.

This roadmap applies that principle incrementally to simple-memory.

---

*Created: 2025-11-27*
