## Honest Review: simple-memory-mcp

### What you've built well

**The architecture is clean and the instincts are right.** Layered design (Transport → Tools → GraphQL → Service → SQLite), normalized tags, external-content FTS5, WAL mode, prepared statements — these are all correct choices for a single-user local memory store. The migration system with backup-before-migrate and fresh-db detection is genuinely thoughtful.

**The GraphQL consolidation was a sharp move.** Going from 8 MCP tools to 3 with a GraphQL interface is the right call — 76% token reduction in tool definitions matters because every tool definition eats into the LLM's working context before it even starts thinking. The "1 MCP = 1 Skill" pattern in your design philosophy identifies the real problem: tool sprawl makes LLMs dumber.

**The `summaryOnly` + `preview` progressive disclosure pattern is underappreciated.** Letting the LLM fetch titles first, then drill into full content, is exactly how you'd want to manage context budgets.

---

### Code-level issues worth fixing

These are real bugs/inefficiencies, not nitpicks:

1. **N+1 tag hydration** — Every search result fires an individual `getTagsForMemory` query. 100 results = 100 extra queries. A single `WHERE memory_id IN (...)` would collapse this.

2. **Date filtering happens in JavaScript, not SQL** — `daysAgo`, `startDate`, `endDate` are applied *after* fetching results. This means you over-fetch (your `limit * 2` / `limit * 5` multiplier) and still might miss valid results. Push these into the SQL `WHERE` clause.

3. **Multi-tag search only uses `tags[0]`** — If I search `tags: ["typescript", "patterns"]`, only "typescript" is used. No intersection or union support.

4. **Duplicate `getMemoryByHash` methods** — One uses a prepared statement, the other (used in import/restore) creates a new statement each call.

5. **Server version hardcoded to `'1.0.0'`** in index.ts while package.json is at `2.0.6`. You already have `getPackageVersion()` in memory-service.

6. **Dead code** — `searchTagsLegacy` is a prepared statement that returns `WHERE 1=0` (no results). It's never called.

---

### Now, the real question: What would truly unlock LLM context capacity?

You're right to call MCP a "compromise." Here's why, and what's beyond it:

#### The fundamental bottleneck isn't storage — it's retrieval relevance

Your system stores memories fine. The problem is: **when an LLM has a 128K-200K token window, the most expensive thing isn't storing knowledge — it's deciding which 2,000 tokens of knowledge to inject into that window right now.** Every irrelevant memory injected displaces reasoning capacity.

Your BM25 keyword search is honest and debuggable, but it requires the LLM (or user) to know the exact terminology. You acknowledge this in your design doc. The thing is — *you* don't always remember what words you used 6 months ago. Your future self is a different person with different vocabulary.

#### What would actually move the needle:

**1. Hybrid retrieval: BM25 + lightweight embeddings**

You dismissed vector search for good reasons (500MB model downloads, complexity). But the landscape has changed:
- **Quantized models under 30MB** (e.g., `gte-small` at 23MB via ONNX) can run locally with minimal latency
- You don't need to replace FTS5 — you'd **combine** BM25 + cosine similarity with reciprocal rank fusion. This gives you keyword precision AND semantic recall
- Store a 384-dim float32 vector alongside each memory (~1.5KB per entry). At 10,000 memories, that's 15MB — trivial
- The win: searching "database migration strategy" finds your memory tagged "postgresql schema versioning" even though zero keywords match

**2. Contextual retrieval at conversation start — not on-demand**

Your proactive memory plan is the right direction, but the phases are backwards. The highest-leverage thing isn't a VS Code extension or FSWatcher — it's **a system prompt resource that automatically surfaces the top-N most relevant memories based on the conversation's first message.** MCP already supports `resources` — you expose a `memory://context` resource that the client reads at conversation start. No tool call needed, no token cost for tool definition, just pre-loaded context.

**3. Memory compression and hierarchical summarization**

Right now every memory is flat text. Over time, you'll have 500 memories about TypeScript patterns, each 200-2000 tokens. No LLM can use all of them at once. What you actually want:
- **Automatic summarization**: When you have >N memories with overlapping tags, generate a compressed "synthesis" memory that captures the pattern across all of them
- **Hierarchical retrieval**: Return the synthesis first, drill into specifics only if needed
- This is what your `summaryOnly` pattern is reaching toward, but it needs to be automated and recursive

**4. Temporal decay and relevance weighting**

You have `created_at` and `updated_at` but don't use them in ranking. A memory from 2 years ago that you've never revisited should rank lower than one from last week that you've updated 3 times. Add:
- Access count / last-accessed timestamp
- Exponential time decay in the scoring function
- "Pinned" or "evergreen" flag to exempt foundational knowledge from decay

**5. The real unlock: structured knowledge, not flat text**

The ceiling on flat-text memory is that the LLM has to re-parse and re-understand it every conversation. What actually compounds:
- **Entity extraction**: Automatically identify projects, tools, patterns, people, decisions from stored memories
- **Knowledge graph edges**: Not just `related` but typed relationships — `"X depends-on Y"`, `"A supersedes B"`, `"C is-example-of D"`
- **Query the graph**: "What decisions did I make about deployment in the last quarter?" becomes a graph traversal, not a keyword search

You already have the `relationships` table and `relationship_type` field. But it's unused in practice — `getRelated()` only fetches direct links. This is the foundation for something much more powerful.

---

### The honest strategic take

Your project sits at an interesting intersection:

| Layer | Your current solution | What unlocks the next level |
|-------|----------------------|----------------------------|
| **Storage** | SQLite + FTS5 (solid) | Add a vector column, keep SQLite |
| **Retrieval** | BM25 keyword match | Hybrid BM25 + embedding reranking |
| **Context injection** | Tool call (LLM decides when) | Auto-resource at conversation start |
| **Knowledge structure** | Flat text + tags | Entity extraction + typed graph |
| **Temporal reasoning** | Timestamp exists, unused in ranking | Decay + access tracking |
| **Scale management** | `limit` parameter | Hierarchical summarization |

The MCP layer isn't the bottleneck — it's actually the right abstraction. The bottleneck is that **retrieval quality determines context quality, and context quality determines LLM output quality.** Your system currently asks the LLM to do the hard work (formulating the right keyword query). The unlock is making the *retrieval system* smart enough that it doesn't need perfect queries to return the right memories.

The "remembering stuff between projects and life" use case is genuinely valuable. The gap is between "I stored it" and "it surfaced when I needed it without me asking." Your proactive memory plan aims at this gap — I'd prioritize the hybrid retrieval and auto-surfacing resource over the VS Code extension chrome.