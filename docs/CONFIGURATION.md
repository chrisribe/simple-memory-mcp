# ⚙️ Configuration Guide

Complete configuration reference for Simple Memory MCP.

---

## Zero Config Default

Simple Memory works **out of the box** with no configuration needed:

```
~/.simple-memory/memory.db
```

- **Windows**: `C:\Users\{username}\.simple-memory\memory.db`
- **macOS/Linux**: `/home/{username}/.simple-memory/memory.db`

Just add to your MCP config and start using it:

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

---

## Environment Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `MEMORY_DB` | Database file path | `~/.simple-memory/memory.db` | `/home/user/memories.db` |
| `MEMORY_BACKUP_PATH` | Backup directory (creates JSON exports) | None (disabled) | `/home/user/backups` |
| `MEMORY_BACKUP_INTERVAL` | Minutes between backups (0=every write) | `0` | `180` |
| `MEMORY_BACKUP_KEEP` | Number of JSON backups to keep | `10` | `24` |
| `MEMORY_BACKUP_SOURCE` | Source identifier in backups (optional) | hostname | `work` or `personal` |
| `MEMORY_CLOUD_SAFE` | Cloud storage safe mode | `false` | `true` |
| `MEMORY_DEBUG` | Enable debug logging in CLI mode | `false` | `true` |
| `DEBUG` | Enable debug logging (MCP server) | `false` | `true` |

---

## Custom Database Location

For power users who want to control where the database is stored:

```json
{
  "mcpServers": {
    "simple-memory": {
      "command": "npx",
      "args": ["-y", "simple-memory-mcp"],
      "env": {
        "MEMORY_DB": "/path/to/your/memory.db"
      }
    }
  }
}
```

---

## Automatic Backups

Configure automatic JSON backups to cloud storage or local directory:

```json
{
  "mcpServers": {
    "simple-memory": {
      "command": "npx",
      "args": ["-y", "simple-memory-mcp"],
      "env": {
        "MEMORY_DB": "/home/user/memory.db",
        "MEMORY_BACKUP_PATH": "/home/user/OneDrive/MCP-Backups",
        "MEMORY_BACKUP_INTERVAL": "180",
        "MEMORY_BACKUP_KEEP": "24",
        "MEMORY_BACKUP_SOURCE": "work"
      }
    }
  }
}
```

### Backup Strategy

- **JSON export format** - Human-readable, portable backups
- **Lazy backups** - Only backs up after write operations
- **Throttled** - Won't backup again until interval passes
- **Automatic cleanup** - Keeps last N backups, deletes old ones
- **Efficient** - No wasted backups when idle

### Backup Files

Format: `smem_auto_2026-01-31_20-13-19.json`

Each backup includes:
- All memories with full content
- Tags and relationships
- Timestamps and metadata
- Export version for compatibility

### Restore from Backup

```bash
simple-memory import-memory --input backup.json
```

---

## Cloud Storage Best Practices

### ✅ Recommended: Local DB + Cloud Backup

Store database locally, backup to cloud:

```json
{
  "env": {
    "MEMORY_DB": "/home/user/.simple-memory/memory.db",
    "MEMORY_BACKUP_PATH": "/home/user/OneDrive/MCP-Backups"
  }
}
```

### ⚠️ Not Recommended: Direct Cloud Storage

Storing the database directly in OneDrive/Dropbox/Google Drive causes issues:
- WAL mode creates 3 files that sync at different times → corruption risk
- File locking conflicts cause "database locked" errors
- 2-10x slower performance

### If You Must Use Direct Cloud Storage

Enable safe mode:

```json
{
  "env": {
    "MEMORY_DB": "/path/to/OneDrive/memory.db",
    "MEMORY_CLOUD_SAFE": "true"
  }
}
```

This uses DELETE journal mode instead of WAL (30-50% slower but safer for cloud sync).

---

## Multiple Database Instances

Run multiple instances for different contexts:

```json
{
  "mcpServers": {
    "memory-work": {
      "command": "npx",
      "args": ["-y", "simple-memory-mcp"],
      "env": {
        "MEMORY_DB": "/path/to/work-memory.db"
      }
    },
    "memory-personal": {
      "command": "npx",
      "args": ["-y", "simple-memory-mcp"],
      "env": {
        "MEMORY_DB": "/path/to/personal-memory.db"
      }
    }
  }
}
```

---

## HTTP Transport (Advanced)

For Docker deployments, remote servers, or avoiding local Node.js path issues.

### Start the HTTP Server

```bash
# With default database
simple-memory --http

# With custom database and port
MEMORY_DB=/path/to/memory.db MCP_PORT=3001 simple-memory --http
```

### Configure MCP Client

```json
{
  "mcpServers": {
    "simple-memory": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

### When to Use HTTP Transport

- 🐳 Running in Docker or remote server
- 🖥️ Multiple MCP clients sharing one database
- 🔧 Avoiding Node.js path configuration issues
- 🌐 Exposing memory server to network (use with caution!)

**Note:** HTTP transport requires manually starting the server before using MCP clients. For most local setups, the default stdio transport is simpler.

---

## Config File (Alternative)

Instead of environment variables, you can use a config file:

```bash
simple-memory config --init
```

Creates `~/.simple-memory/config.json`:

```json
{
  "database": {
    "path": "~/.simple-memory/memory.db"
  },
  "backup": {
    "enabled": true,
    "path": "/path/to/backups",
    "interval": 180,
    "keep": 24,
    "source": "my-machine"
  }
}
```

Environment variables take precedence over config file settings.

---

## Database Details

### Technology

- **SQLite** with WAL mode for better concurrency
- **FTS5** for lightning-fast full-text search
- **Normalized tags** with proper indexing (50-200x faster than LIKE queries)
- **Automatic relationships** between related memories

### Schema Features

- ✅ Automatic migrations with data integrity guarantees
- ✅ Optimized indexes on all hot paths
- ✅ Prepared statements for all queries
- ✅ 64MB cache with memory-based temp storage
- ✅ Transaction-based bulk operations

### Size Limits

- Maximum content size: 5MB per memory
- No limit on number of memories
- No limit on number of tags

---

## Troubleshooting

### "Database locked" errors

Usually caused by:
1. Multiple processes accessing the same database
2. Database on cloud storage (OneDrive/Dropbox)

**Fix:** Use local database path or enable `MEMORY_CLOUD_SAFE=true`

### "Cannot find module" errors

```bash
npm run build
npm link
```

### Debug logging

Enable to see what's happening:

```bash
MEMORY_DEBUG=true simple-memory stats
```

Or in MCP config:
```json
{
  "env": {
    "DEBUG": "true"
  }
}
```
