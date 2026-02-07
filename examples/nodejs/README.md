# Simple Memory SDK - Node.js Examples

This directory contains Node.js examples demonstrating how to use the Simple Memory SDK.

## Prerequisites

```bash
npm install simple-memory-mcp
```

## Examples

### 1. Basic Usage (`basic-usage.js`)

Demonstrates core functionality:
- Storing memories with tags
- Searching by text and tags
- Retrieving memories by hash
- Updating memories
- Creating relationships between memories
- Getting related memories
- Database statistics
- Deleting memories

**Run:**
```bash
node basic-usage.js
```

### 2. Advanced Usage (`advanced-usage.js`)

Demonstrates advanced features:
- Date-based filtering (last N days, date ranges)
- Relevance-based search with BM25 scoring
- Export/import functionality
- Manual backups
- Complex multi-criteria queries
- Building knowledge graphs with relationships
- Database health monitoring

**Run:**
```bash
node advanced-usage.js
```

## SDK API Reference

### Creating a Client

```javascript
import { createMemoryClient } from 'simple-memory-mcp/sdk';

const client = createMemoryClient('./my-database.db');
```

### Core Methods

#### `store(content, tags?)`
Store a new memory with optional tags.

```javascript
const hash = client.store('My important note', ['tag1', 'tag2']);
```

#### `search(query?, tags?, limit?, daysAgo?, startDate?, endDate?, minRelevance?)`
Search for memories using various criteria.

```javascript
// Text search
const results = client.search('important');

// Tag search
const results = client.search(undefined, ['tag1']);

// Combined search
const results = client.search('important', ['tag1'], 10);

// Recent memories
const results = client.search(undefined, undefined, 10, 7); // Last 7 days
```

#### `getByHash(hash)`
Retrieve a specific memory by its hash.

```javascript
const memory = client.getByHash(hash);
if (memory) {
  console.log(memory.content);
}
```

#### `update(hash, newContent, newTags?)`
Update a memory's content and/or tags.

```javascript
const newHash = client.update(hash, 'Updated content', ['new', 'tags']);
```

#### `delete(hash)`
Delete a memory by hash.

```javascript
const deleted = client.delete(hash); // Returns true if deleted
```

#### `deleteByTag(tag)`
Delete all memories with a specific tag.

```javascript
const count = client.deleteByTag('old'); // Returns number deleted
```

#### `linkMemories(fromHash, toHash, relationshipType?)`
Create a relationship between two memories.

```javascript
client.linkMemories(hash1, hash2, 'related');
client.linkMemories(hash1, hash2, 'implements');
```

#### `getRelated(hash, limit?)`
Get memories related to a specific memory.

```javascript
const related = client.getRelated(hash, 10);
```

#### `stats()`
Get database statistics.

```javascript
const stats = client.stats();
console.log(`Total memories: ${stats.totalMemories}`);
```

#### `exportMemories(filters?)`
Export memories to JSON format.

```javascript
const exportData = client.exportMemories({
  tags: ['important'],
  limit: 100
});
```

#### `importMemories(jsonData, options?)`
Import memories from JSON data.

```javascript
const result = client.importMemories(jsonString, {
  skipDuplicates: true,
  preserveTimestamps: true
});
```

#### `close()`
Close the database connection. Always call when done.

```javascript
client.close();
```

## TypeScript Support

The SDK is written in TypeScript and includes full type definitions:

```typescript
import { createMemoryClient, MemoryEntry, MemoryStats } from 'simple-memory-mcp/sdk';

const client = createMemoryClient('./my-db.db');

// Full type safety
const hash: string = client.store('Note', ['tag']);
const memories: MemoryEntry[] = client.search('query');
const stats: MemoryStats = client.stats();

client.close();
```

## Advanced Usage

### Direct Service Access

For advanced use cases, you can use the `MemoryService` class directly:

```javascript
import { MemoryService } from 'simple-memory-mcp/sdk';

const service = new MemoryService('./my-db.db', 2 * 1024 * 1024); // 2MB max content
service.initialize();

// Use service methods directly
const hash = service.store('Content', ['tags']);

service.close();
```

## Error Handling

```javascript
try {
  const client = createMemoryClient('./my-db.db');
  const hash = client.store('Content', ['tags']);
  client.close();
} catch (error) {
  console.error('Failed to use memory client:', error);
}
```

## Performance Tips

1. **Reuse the client**: Create one client instance and reuse it
2. **Use batch operations**: `linkMemoriesBulk()` is faster than multiple `linkMemories()` calls
3. **Filter early**: Use tags and date filters to reduce result sets
4. **Summary mode**: When using GraphQL, use `summaryOnly` for token-efficient searches
5. **Close connections**: Always call `client.close()` when done

## Additional Resources

- [Main README](../../README.md)
- [Python Examples](../python/)
- [GitHub Repository](https://github.com/chrisribe/simple-memory-mcp)
