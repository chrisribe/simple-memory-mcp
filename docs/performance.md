# Performance

Simple Memory achieves sub-millisecond operations through careful optimization.

## Quick Stats

| Operation | Time | Throughput |
|-----------|------|------------|
| Store memory (1KB) | 0.09ms | ~11,000 ops/sec |
| Tag search | 0.23ms | ~4,300 ops/sec |
| Full-text search | 0.07ms | ~14,500 ops/sec |
| Delete by hash | 1.16ms | ~860 ops/sec |
| Stats query | 0.78ms | ~1,300 ops/sec |

**Hardware:** Typical laptop (16GB RAM, SSD)  
**Last updated:** February 2026

---

## Why It's Fast

### SQLite + FTS5

**SQLite with optimizations:**
- WAL mode for better write concurrency
- 64MB cache reduces disk I/O
- Memory-based temp storage
- Prepared statements prevent recompilation

**FTS5 full-text search:**
- 714-1000x faster than LIKE queries
- BM25 ranking for relevance
- Porter stemmer for English text
- Sub-millisecond even with 10,000+ memories

### Strategic Indexing

**7 indexes on hot paths:**
- Foreign keys (tags, relationships)
- Common filters (created_at, hash)
- Composite indexes for complex queries

**Result:** 10-50x faster complex queries vs unindexed.

### Transaction Batching

Bulk operations wrapped in transactions:
- Multiple inserts in single commit
- Atomic relationship creation
- 18-49x faster than individual operations

---

## MCP vs CLI Performance

**Critical difference:**

| Mode | Operation Time | Why |
|------|---------------|-----|
| **MCP Server** | <1ms | Persistent DB connection, warm cache |
| **CLI** | ~500ms | Node.js startup + DB init overhead |

**The CLI isn't slow—the operation is still <1ms.** The 500ms is Node.js process startup.

**Best practice:** Use MCP server (Claude Desktop, VS Code) for normal usage. CLI is fine for scripts but pays startup cost every time.

---

## Scaling Characteristics

### Memory Count

| Memories | DB Size | Store Time | Search Time |
|----------|---------|------------|-------------|
| 100 | ~320 KB | 0.12ms | 0.07ms |
| 1,000 | ~3.2 MB | 0.10ms | 0.08ms |
| 10,000 | ~32 MB | 0.12ms | 0.12ms |
| 100,000 | ~320 MB | 0.15ms | 0.20ms |

**FTS5 scales sub-linearly.** Doubling memories doesn't double search time.

### Content Size

Content size has minimal impact up to ~10KB:
- 100 bytes → 0.12ms
- 1 KB → 0.09ms
- 10 KB → 0.11ms
- 100 KB → 0.37ms

**Why:** SQLite pages are efficient, FTS5 tokenization is fast. Performance degradation only becomes noticeable at 100KB+.

---

## Optimization Decisions

### What We Did

**Normalized tag storage:**
- Before: Comma-separated TEXT column
- After: Separate tags table with indexes
- **Result:** 50-200x faster tag queries

**FTS5 configuration:**
- Porter stemmer for English
- BM25 ranking
- Prefix matching support
- **Result:** Near-instant full-text search

**WAL mode:**
- Better write concurrency
- Readers don't block writers
- **Result:** Better multi-user performance

### What We Didn't Do (And Why)

**Vector embeddings:**
- Would require 500+ MB model download
- Complex setup and maintenance
- Keyword search is sufficient for structured data

**Caching layer:**
- SQLite is already fast enough (<1ms)
- Would add complexity
- Unnecessary for target use case

**Sharding:**
- Single-file simplicity preferred
- Target use case: 1-10K memories per user
- SQLite handles 100K+ memories easily

---

## Best Practices

### For Users

**Use MCP server, not CLI:**
- MCP: <1ms operations
- CLI: ~500ms per command
- **60-100x faster** with persistent connection

**Batch operations when possible:**
- Use `export-memory` / `import-memory` for bulk changes
- Transactions amortize overhead

**Use specific tags:**
- `project:myapp` is faster to search than `project`
- Tag hierarchy enables efficient filtering

### For Developers

**Always use prepared statements:**
```typescript
// Good
this.stmts.insert.run(content, createdAt, hash);

// Bad - SQL injection risk + slower
this.db.exec(`INSERT INTO memories VALUES ('${content}', ...)`);
```

**Batch related operations:**
```typescript
// Good - single transaction
const insertMemory = this.db.transaction(() => {
  const result = this.stmts.insert.run(...);
  for (const tag of tags) {
    this.stmts.insertTag.run(memoryId, tag);
  }
});

// Bad - separate transactions
this.stmts.insert.run(...);
for (const tag of tags) {
  this.stmts.insertTag.run(...);
}
```

**Index common query paths:**
```sql
-- Foreign keys
CREATE INDEX idx_tags_memory_id ON tags(memory_id);

-- Filter columns
CREATE INDEX idx_memories_created_at ON memories(created_at);

-- Composite for common queries
CREATE INDEX idx_tags_tag_memory ON tags(tag, memory_id);
```

---

## Benchmarking

Run benchmarks yourself:
```bash
npm run benchmark      # Performance suite
npm run test:perf      # Performance tests
```

All benchmarks use isolated test databases to avoid affecting production data.

**Latest benchmark results:**
- 138 memories, 110 relationships
- All operations under 1.2ms
- Full-text search averaged 0.07ms
- All performance targets validated ✓

---

## Conclusion

**Performance is not a bottleneck.** Sub-millisecond operations, thousands of ops/second, scales to 100K+ memories.

**Key insight:** The system is I/O bound (disk), not CPU bound. SQLite with WAL mode + FTS5 + strategic indexes makes disk access efficient enough that performance is rarely an issue.

**If you need faster:** Vector embeddings can be faster for semantic search, but require complex setup. For keyword-based search with known terminology, SQLite FTS5 is optimal.
