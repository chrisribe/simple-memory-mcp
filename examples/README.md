# Simple Memory SDK - Usage Examples

This directory contains examples demonstrating how to integrate Simple Memory into your applications.

## 📁 Directory Structure

```
examples/
├── nodejs/              # Node.js & TypeScript examples
│   ├── basic-usage.js   # Core functionality demo
│   ├── advanced-usage.js # Advanced features demo
│   └── README.md        # Node.js documentation
└── python/              # Python examples
    ├── basic_usage.py   # CLI wrapper example
    ├── advanced_http_client.py # HTTP client example
    └── README.md        # Python documentation
```

## 🚀 Quick Start

### Node.js

```bash
# Install
npm install simple-memory-mcp

# Run example
cd examples/nodejs
node basic-usage.js
```

### Python

```bash
# Install Simple Memory
npm install -g simple-memory-mcp

# Run CLI wrapper example
cd examples/python
python basic_usage.py

# Or run HTTP client (requires server)
simple-memory --http --port 3000  # Terminal 1
python advanced_http_client.py     # Terminal 2
```

## 📚 What's Included

### Node.js Examples

1. **Basic Usage** - Core SDK functionality
   - Storing and retrieving memories
   - Search with tags and text
   - Updating and deleting
   - Creating relationships
   - Statistics

2. **Advanced Usage** - Advanced features
   - Date-based filtering
   - Relevance scoring
   - Export/Import
   - Manual backups
   - Knowledge graphs

### Python Examples

1. **CLI Wrapper** - Simple subprocess integration
   - Easy to set up
   - Works offline
   - No server required

2. **HTTP Client** - Production-ready integration
   - GraphQL queries
   - Real-time communication
   - Token-efficient summary mode

## 🔧 Installation

### For Node.js Development

```bash
npm install simple-memory-mcp
```

### For Python Development

```bash
# Install globally
npm install -g simple-memory-mcp

# Or use npx (no installation)
npx simple-memory-mcp --version
```

For HTTP client:
```bash
pip install requests
```

## 💡 Use Cases

### Personal Knowledge Base

```javascript
// Node.js
import { createMemoryClient } from 'simple-memory-mcp/sdk';

const kb = createMemoryClient('./knowledge.db');

// Store articles
kb.store('AI transformers explained...', ['ai', 'ml', 'article']);
kb.store('React hooks best practices...', ['react', 'web', 'article']);

// Search when needed
const aiNotes = kb.search('transformers', ['ai']);
```

### Task Management

```python
# Python
from basic_usage import SimpleMemoryClient

tasks = SimpleMemoryClient('./tasks.db')

# Add tasks
tasks.store('Review PR #123', tags=['work', 'code-review'])
tasks.store('Buy groceries', tags=['personal', 'shopping'])

# Search tasks
work_tasks = tasks.search(tags=['work'])
```

### Chat History

```javascript
// Node.js - Store conversation context
const chat = createMemoryClient('./chat-history.db');

function storeMessage(user, message) {
  const hash = chat.store(message, [`user:${user}`, 'chat']);
  return hash;
}

function getContext(query, limit = 5) {
  return chat.search(query, ['chat'], limit);
}
```

### Research Notes

```python
# Python - Academic research notes
research = SimpleMemoryClient('./research.db')

# Store paper summaries
research.store(
    'Paper: Attention is All You Need - Introduces transformer architecture',
    tags=['ml', 'nlp', 'transformer', 'paper']
)

# Find related work
papers = research.search(query='transformer', tags=['paper'])
```

## 🎯 Best Practices

### 1. Database Organization

```javascript
// Separate databases for different contexts
const work = createMemoryClient('./work-memory.db');
const personal = createMemoryClient('./personal-memory.db');
const research = createMemoryClient('./research-memory.db');
```

### 2. Consistent Tagging

```javascript
// Use a consistent tagging scheme
const tags = {
  category: ['work', 'personal', 'research'],
  type: ['task', 'note', 'idea', 'article'],
  priority: ['urgent', 'high', 'medium', 'low']
};

client.store('Important meeting', ['work', 'meeting', 'urgent']);
```

### 3. Clean Up

```javascript
// Always close connections
function useMemory() {
  const client = createMemoryClient('./db.db');
  try {
    // ... use client
  } finally {
    client.close();
  }
}
```

### 4. Error Handling

```javascript
try {
  const client = createMemoryClient('./db.db');
  const results = client.search('query');
  client.close();
} catch (error) {
  console.error('Memory operation failed:', error);
}
```

## 🔍 More Examples

### Building a Knowledge Graph

```javascript
// Create connected concepts
const concept1 = client.store('Machine Learning', ['ai', 'concept']);
const concept2 = client.store('Deep Learning', ['ai', 'concept']);
const concept3 = client.store('Neural Networks', ['ai', 'concept']);

// Create relationships
client.linkMemories(concept2, concept1, 'is-subset-of');
client.linkMemories(concept3, concept2, 'used-in');

// Traverse the graph
const related = client.getRelated(concept1);
```

### Time-based Queries

```javascript
// Get recent notes (last 7 days)
const recent = client.search(undefined, ['notes'], 50, 7);

// Get notes from a date range
const startDate = new Date('2024-01-01');
const endDate = new Date('2024-01-31');
const january = client.search(undefined, undefined, 100, undefined, startDate, endDate);
```

### Export/Import Workflow

```javascript
// Export for backup
const data = client.exportMemories({ tags: ['important'] });
fs.writeFileSync('backup.json', JSON.stringify(data, null, 2));

// Import to another database
const client2 = createMemoryClient('./backup.db');
const result = client2.importMemories(
  fs.readFileSync('backup.json', 'utf-8'),
  { skipDuplicates: true }
);
console.log(`Imported ${result.imported} memories`);
```

## 🌐 Language Support

| Language | Method | Examples | Status |
|----------|--------|----------|--------|
| JavaScript/TypeScript | Direct SDK | ✅ | Full support |
| Python | CLI/HTTP | ✅ | Full support |
| Other languages | HTTP API | - | Use HTTP transport |

For languages not listed, use the HTTP transport mode and make standard HTTP requests to the GraphQL endpoint.

## 📖 Additional Documentation

- **[Node.js README](nodejs/README.md)** - Detailed Node.js API reference
- **[Python README](python/README.md)** - Python integration guide
- **[Main README](../README.md)** - Project overview and setup
- **[GitHub Repository](https://github.com/chrisribe/simple-memory-mcp)** - Source code and issues

## 🤝 Contributing

Found a useful pattern? Submit a PR with your example!

## 📄 License

MIT - See [LICENSE](../LICENSE) for details.
