# Configuration Unification Plan

## Status: ✅ IMPLEMENTED (2025-11-30)

Simplified to "sensible defaults" approach instead of full config file system.

### What Was Implemented

**Default Database Path:**
```
~/.simple-memory/memory.db

# Windows: C:\Users\{username}\.simple-memory\memory.db
# Linux/Mac: /home/{username}/.simple-memory/memory.db
```

**Resolution Order:**
1. `MEMORY_DB` environment variable (power users)
2. `~/.simple-memory/memory.db` (default - auto-created)

**Key Benefits:**
- ✅ Zero config for new users - just works
- ✅ Predictable location - always the same path
- ✅ No more "empty DB in random CWD" problem
- ✅ Power users can still override with `MEMORY_DB`
- ✅ Discoverable: `~/.simple-memory/` is easy to find

---

## Original Problem Statement (for reference)

Currently, simple-memory has a fragmented configuration story:

```
┌─────────────────────────────────────────────────────────────┐
│                    Where's My Database?                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  MCP Server (stdio)                                          │
│    └─→ Reads MEMORY_DB from mcp.json env                    │
│    └─→ ✅ Works (if configured)                              │
│                                                              │
│  CLI (terminal)                                              │
│    └─→ Reads MEMORY_DB from shell environment               │
│    └─→ Not set → defaults to ./memory.db                    │
│    └─→ ❌ Creates empty DB in current directory             │
│                                                              │
│  HTTP Server (web)                                           │
│    └─→ Reads MEMORY_DB from process env                     │
│    └─→ Different config path possible                       │
│                                                              │
│  LLM runs CLI via terminal                                   │
│    └─→ Shell doesn't have MEMORY_DB set                     │
│    └─→ ❌ Wrong/empty database silently created             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Symptoms

1. **Multiple DB sources** - MCP, CLI, HTTP can each point to different files
2. **Silent empty DB creation** - No warning when creating new DB
3. **Per-machine setup** - Each PC needs manual environment configuration
4. **LLM confusion** - Thinks it's querying real memories, gets empty results

---

## Solution: Unified Config File

### Config File Location

```
~/.simple-memory/config.json

# Windows: C:\Users\{username}\.simple-memory\config.json
# Linux/Mac: /home/{username}/.simple-memory/config.json
```

### Config Schema

```json
{
  "database": "C:/cribe/MCP-Memories/memory.db",
  "backup": {
    "enabled": true,
    "maxBackups": 5
  },
  "web": {
    "port": 3333,
    "enabled": false
  }
}
```

### Resolution Order

All modes (MCP, CLI, HTTP) use the same resolution:

```typescript
function getDatabasePath(): string {
  // 1. Explicit env var (highest priority - allows override)
  if (process.env.MEMORY_DB) {
    return process.env.MEMORY_DB;
  }
  
  // 2. Config file (~/.simple-memory/config.json)
  const config = loadConfig();
  if (config?.database) {
    return config.database;
  }
  
  // 3. Fail loudly - don't silently create empty DB
  throw new Error(
    'No database configured.\n' +
    'Run: npx simple-memory init\n' +
    'Or set MEMORY_DB environment variable'
  );
}
```

---

## Implementation Plan

### Phase 1: Config Infrastructure

**Effort:** 2-3 hours

1. Create `src/utils/config.ts`:
   ```typescript
   interface SimpleMemoryConfig {
     database: string;
     backup?: {
       enabled: boolean;
       maxBackups?: number;
     };
     web?: {
       port: number;
       enabled: boolean;
     };
   }
   
   function getConfigPath(): string;
   function loadConfig(): SimpleMemoryConfig | null;
   function saveConfig(config: SimpleMemoryConfig): void;
   function getDatabasePath(): string; // Uses resolution order
   ```

2. Update `src/services/memory-service.ts`:
   - Use `getDatabasePath()` instead of direct env access
   - Remove silent DB creation

3. Update CLI entry point:
   - Use same `getDatabasePath()`

4. Update web server:
   - Use same `getDatabasePath()`

### Phase 2: Init Command

**Effort:** 1-2 hours

Add `simple-memory init` command:

```bash
$ npx simple-memory init

Welcome to simple-memory setup!

? Where should the database be stored?
  > C:/Users/cribe/.simple-memory/memory.db (default)
    Custom path...
    Use existing: C:/cribe/MCP-Memories/memory.db

? Enable automatic backups? (Y/n)

? Enable web server on startup? (y/N)
  Port: 3333

✅ Config saved to: C:/Users/cribe/.simple-memory/config.json

Next steps:
  - MCP: Config will be auto-detected
  - CLI: Run 'npx simple-memory stats' to verify
  - Web: Run 'npx simple-memory web' to start browser
```

### Phase 3: Fail Loudly

**Effort:** 30 minutes

Update error messages:

```typescript
// Instead of silently creating empty DB:
if (!existsSync(dbPath)) {
  if (isExplicitlyConfigured(dbPath)) {
    // User specified path, create it
    console.log(`Creating new database at: ${dbPath}`);
  } else {
    // No config, fail with helpful message
    throw new Error(
      `Database not found and no config set.\n\n` +
      `To get started:\n` +
      `  npx simple-memory init\n\n` +
      `Or set MEMORY_DB environment variable.`
    );
  }
}
```

### Phase 4: MCP Config Detection (Optional)

**Effort:** 1 hour

For CLI to find DB even when only MCP is configured:

```typescript
function findMcpConfig(): McpConfig | null {
  // Check common locations
  const locations = [
    path.join(os.homedir(), '.vscode', 'mcp.json'),
    path.join(os.homedir(), 'AppData/Roaming/Code/User/mcp.json'),
    // ... other known locations
  ];
  
  for (const loc of locations) {
    const config = tryLoadMcpConfig(loc);
    if (config?.servers?.['simple-memory']?.env?.MEMORY_DB) {
      return config;
    }
  }
  return null;
}
```

---

## File Changes

| File | Change |
|------|--------|
| `src/utils/config.ts` | NEW - Config loading/saving |
| `src/services/memory-service.ts` | Use `getDatabasePath()` |
| `src/index.ts` | Use unified config |
| `src/web-server.ts` | Use unified config |
| `src/tools/*/executor.ts` | No change (uses service) |
| `package.json` | Add `init` command to bin |

---

## Migration Path

### For Existing Users

1. **No action required** - MEMORY_DB env var still works (highest priority)
2. **Optional** - Run `init` to create config file
3. **Recommended** - Remove env var from mcp.json, use config file instead

### For New Users

1. Run `npx simple-memory init`
2. Follow prompts
3. Done - all modes work

---

## Benefits

| Before | After |
|--------|-------|
| 3 different config sources | 1 config file + env override |
| Silent empty DB creation | Fail with helpful message |
| Per-machine env setup | Config file syncs (if in OneDrive) |
| LLM CLI uses wrong DB | All modes use same DB |
| Manual setup per PC | `npx simple-memory init` |

---

## Future Considerations

### Config in OneDrive

```json
{
  "database": "~/OneDrive/AI-Tools/simple-memory/memory.db"
}
```

Config itself could live in `~/.simple-memory/config.json` but point to OneDrive DB for cross-machine sync.

### Multiple Profiles

```bash
$ simple-memory --profile work stats
$ simple-memory --profile personal search "vacation"
```

Config could support named profiles for work/personal separation.

---

*Created: 2025-11-28*
