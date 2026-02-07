# Simple Memory - Python Examples

This directory contains Python examples for using Simple Memory.

Since Simple Memory is a Node.js/TypeScript project, there are two main ways to use it from Python:

1. **CLI Wrapper** - Spawn the CLI as a subprocess
2. **HTTP Client** - Use the HTTP transport with MCP protocol

## Prerequisites

### Install Simple Memory

```bash
npm install -g simple-memory-mcp
```

Or use without global installation:
```bash
npx simple-memory-mcp --version
```

### Python Requirements

For HTTP client:
```bash
pip install requests
```

## Examples

### 1. Basic CLI Wrapper (`basic_usage.py`)

Uses subprocess to call the Simple Memory CLI. Works offline and is simple to set up.

**Features:**
- Store and search memories
- Tag-based filtering
- Update and delete operations
- Get statistics

**Run:**
```bash
python basic_usage.py
```

### 2. Advanced HTTP Client (`advanced_http_client.py`)

Uses HTTP transport to communicate with the Simple Memory server via GraphQL.

**Features:**
- Full GraphQL query support
- Token-efficient summary mode
- Relationship queries
- Real-time communication

**Setup:**
1. Start the server:
   ```bash
   simple-memory --http --port 3000
   ```

2. Run the client:
   ```bash
   python advanced_http_client.py
   ```

## CLI Wrapper API

### Creating a Client

```python
from basic_usage import SimpleMemoryClient

client = SimpleMemoryClient("./my-database.db")
```

### Methods

#### `store(content, tags=None)`
```python
hash = client.store(
    "My important note",
    tags=["work", "todo"]
)
```

#### `search(query=None, tags=None, limit=10)`
```python
# Text search
results = client.search(query="important")

# Tag search
results = client.search(tags=["work"])

# Combined
results = client.search(query="meeting", tags=["work"], limit=5)
```

#### `get(hash)`
```python
memory = client.get(hash)
if memory:
    print(memory["content"])
```

#### `update(hash, content, tags=None)`
```python
new_hash = client.update(hash, "Updated content", tags=["new", "tags"])
```

#### `delete(hash)`
```python
deleted = client.delete(hash)
```

#### `delete_by_tag(tag)`
```python
count = client.delete_by_tag("old")
```

#### `stats()`
```python
stats = client.stats()
print(f"Total: {stats['totalMemories']}")
```

#### `related(hash, limit=10)`
```python
related_memories = client.related(hash, limit=5)
```

## HTTP Client API

### Creating a Client

```python
from advanced_http_client import SimpleMemoryHTTPClient

client = SimpleMemoryHTTPClient("http://localhost:3000")
```

### Methods

#### `store(content, tags=None)`
```python
hash = client.store("Content", tags=["tag1", "tag2"])
```

#### `search(query=None, tags=None, limit=10, summary_only=False)`
```python
# Full content search
results = client.search(query="python", limit=10)

# Summary mode (token-efficient)
summaries = client.search(tags=["work"], summary_only=True)
```

#### `get(hash)`
```python
memory = client.get(hash)
```

#### `update(hash, content, tags=None)`
```python
new_hash = client.update(hash, "New content", tags=["updated"])
```

#### `delete(hash=None, tag=None)`
```python
# Delete by hash
result = client.delete(hash=hash)

# Delete by tag
result = client.delete(tag="temp")
print(f"Deleted: {result['deletedCount']}")
```

#### `related(hash, limit=10)`
```python
related = client.related(hash, limit=5)
```

#### `stats()`
```python
stats = client.stats()
```

## Comparison: CLI vs HTTP

| Feature | CLI Wrapper | HTTP Client |
|---------|-------------|-------------|
| Setup | Easy | Requires server |
| Performance | Slower (subprocess) | Faster (HTTP) |
| Offline | Yes | No |
| GraphQL | No | Yes |
| Summary Mode | No | Yes |
| Best For | Simple scripts | Production apps |

## Using with MCP Clients

For production Python applications, consider using official MCP client libraries:

```python
# Using MCP Python client (example)
from mcp import MCPClient

client = MCPClient("http://localhost:3000")
response = client.call_tool("memory-graphql", {
    "query": """
        query {
            memories(limit: 10) {
                hash
                content
                tags
            }
        }
    """
})
```

## Environment Variables

Both approaches support environment variables:

```bash
# Set database path
export MEMORY_DB=/path/to/memory.db

# Enable debug mode
export MEMORY_DEBUG=true

# Run your script
python basic_usage.py
```

## Error Handling

### CLI Wrapper
```python
try:
    client = SimpleMemoryClient("./my-db.db")
    hash = client.store("Content", tags=["tag"])
except RuntimeError as e:
    print(f"Error: {e}")
```

### HTTP Client
```python
try:
    client = SimpleMemoryHTTPClient("http://localhost:3000")
    results = client.search(query="test")
except RuntimeError as e:
    print(f"Error: {e}")
    print("Make sure server is running: simple-memory --http")
```

## Production Deployment

For production use with Python:

1. **Start server as a service:**
   ```bash
   # Using systemd, docker, or process manager
   simple-memory --http --port 3000
   ```

2. **Use connection pooling:**
   ```python
   import requests
   session = requests.Session()
   # Pass session to HTTP client
   ```

3. **Add retry logic:**
   ```python
   from requests.adapters import HTTPAdapter
   from requests.packages.urllib3.util.retry import Retry
   
   retry_strategy = Retry(total=3, backoff_factor=1)
   adapter = HTTPAdapter(max_retries=retry_strategy)
   session.mount("http://", adapter)
   ```

## Additional Resources

- [Node.js Examples](../nodejs/)
- [Main README](../../README.md)
- [GraphQL Schema Documentation](../../docs/graphql.md)
- [GitHub Repository](https://github.com/chrisribe/simple-memory-mcp)
