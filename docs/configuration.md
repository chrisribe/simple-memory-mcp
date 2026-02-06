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

Simple Memory supports MCP's Streamable HTTP transport as an alternative to stdio. This is useful for Docker deployments, remote servers, or multi-client setups.

### Why HTTP Transport?

| Scenario | Why HTTP Helps |
|----------|----------------|
| **Docker/containers** | No stdio routing complexity |
| **Remote servers** | Access memory from anywhere on network |
| **Multiple MCP clients** | Share one database across editors |
| **Web UI integration** | Same server powers Memory Browser |
| **Future-proofing** | MCP ecosystem trending toward HTTP transports |

### Start the HTTP Server

```bash
# Default: localhost:3000
simple-memory --http

# Custom port
MCP_PORT=3001 simple-memory --http

# Custom database and port
MEMORY_DB=/path/to/memory.db MCP_PORT=3001 simple-memory --http
```

### Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/mcp` | POST | MCP JSON-RPC protocol |
| `/health` | GET | Health check (returns `{"status": "ok"}`) |

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

### Architecture

```
┌─────────────────┐     HTTP      ┌─────────────────────┐
│  MCP Client     │──────────────▶│  simple-memory      │
│  (Claude, VS)   │    :3000/mcp  │  --http             │
└─────────────────┘               │                     │
                                  │  ┌───────────────┐  │
┌─────────────────┐     HTTP      │  │  SQLite +     │  │
│  Memory Browser │──────────────▶│  │  FTS5         │  │
│  (web UI)       │    :3000/api  │  └───────────────┘  │
└─────────────────┘               └─────────────────────┘
```

### Security Considerations

⚠️ The HTTP transport has **no authentication** by default. For network-exposed deployments:

- Use a reverse proxy (nginx, Caddy) with auth
- Bind to localhost only for local use
- Add firewall rules for remote access
- Consider VPN/tunnel for remote scenarios

### When to Use stdio vs HTTP

| Use stdio (default) | Use HTTP |
|---------------------|----------|
| Single user, local machine | Docker/containerized |
| Simplest setup | Multiple clients sharing DB |
| Most MCP clients | Remote/network access |
| No manual server management | Web browser integration |

**Note:** stdio transport is simpler for most local setups—MCP clients manage the lifecycle automatically.

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
