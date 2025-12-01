# Configuration: Sensible Defaults

**Status:** ✅ Implemented (2025-11-30)

## Default Database Path

```
~/.simple-memory/memory.db

# Windows: C:\Users\{username}\.simple-memory\memory.db
# Linux/Mac: /home/{username}/.simple-memory/memory.db
```

## Resolution Order

1. `MEMORY_DB` environment variable (power users)
2. `~/.simple-memory/memory.db` (default - auto-created)

## Key Files

- `src/utils/config.ts` - `getDatabasePath()`, `ensureConfigDir()`
- `src/index.ts` - Uses config for MCP server + CLI
- `src/web-server.ts` - Uses same config

## Benefits

- ✅ Zero config for new users - just works
- ✅ Predictable location - always the same path
- ✅ No more "empty DB in random CWD" problem
- ✅ Power users can still override with `MEMORY_DB`
