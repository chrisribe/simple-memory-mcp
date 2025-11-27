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

## Phase 3: Code Execution Mode (Optional)

**Effort:** 2-3 days  
**Goal:** Single tool call that runs code locally, returns only summary

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

Complexity and security surface. Only implement if Phase 1-2 prove insufficient.

---

## Phase 4: Library Mode (Future)

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

| Metric | Current | Phase 1 | Phase 2 |
|--------|---------|---------|---------|
| Tokens per search (10 results) | ~2000 | ~400 | ~400 + 200/drill-down |
| Tool calls for typical flow | 1 | 1 | 2 (smaller each) |
| Backwards compatible | - | ✅ | ✅ |

---

## Implementation Order

```
┌─────────────────────────────────────────────────────────┐
│ 1. Phase 1: summaryOnly flag                            │
│    └─→ Measure: Is context still a problem?             │
│                                                         │
│ 2. Phase 2: get-memory tool                             │
│    └─→ Only if search-then-read pattern is common       │
│                                                         │
│ 3. Phase 3: memory-query                                │
│    └─→ Only if compounding is measurable issue          │
│                                                         │
│ 4. Phase 4: SDK mode                                    │
│    └─→ Only if MCP overhead itself is the bottleneck    │
└─────────────────────────────────────────────────────────┘
```

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
