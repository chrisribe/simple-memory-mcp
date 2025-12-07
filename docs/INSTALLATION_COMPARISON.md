# Installation Methods Comparison

This document compares different installation methods for simple-memory-mcp and provides recommendations for different use cases.

## TL;DR - Which Method Should I Use?

- **📦 End Users (Recommended)**: Use `npx` auto-install when package is published
- **🔧 Contributors/Developers**: Use `npm run setup` from source
- **💻 Advanced Users**: Use `npm install -g` for offline capability

---

## Comparison Table

| Aspect | npx Auto-Install | npm install -g | npm run setup (Source) |
|--------|-----------------|----------------|------------------------|
| **Setup Complexity** | ⭐⭐⭐⭐⭐ Zero setup | ⭐⭐⭐⭐ One command | ⭐⭐⭐ Multiple steps |
| **First Run Time** | Slower (downloads) | Fast (pre-installed) | Fast (pre-built) |
| **Subsequent Runs** | Fast (cached) | Fast | Fast |
| **Updates** | Automatic/Manual | Manual (`npm update`) | Manual (`git pull`) |
| **Offline Support** | ❌ Needs npm registry | ✅ After install | ✅ After setup |
| **Version Control** | ✅ Pin to specific version | ✅ Pin to version | ✅ Git commit/branch |
| **Disk Space** | ~5-10 MB (cache) | ~5 MB (global) | ~50 MB (with deps) |
| **Requires npm Package** | ✅ Must be published | ✅ Must be published | ❌ Works from git |
| **Good for Development** | ❌ Not ideal | ⭐⭐ Okay | ⭐⭐⭐⭐⭐ Best |
| **Good for End Users** | ⭐⭐⭐⭐⭐ Best | ⭐⭐⭐⭐ Good | ⭐⭐ Not ideal |

---

## Detailed Comparison

### 1. npx Auto-Install (Recommended for End Users)

**Configuration Example:**
```json
{
  "mcpServers": {
    "simple-memory-mcp": {
      "command": "npx",
      "args": ["-y", "simple-memory-mcp"]
    }
  }
}
```

**How it works:**
1. User adds config to MCP client
2. On first run, npx:
   - Downloads package from npm registry
   - Caches it in `~/.npm/_npx/`
   - Executes the command
3. Subsequent runs use cached version

**Advantages:**
- ✅ **Zero-friction setup**: Just add config, no manual installation
- ✅ **Always up-to-date**: Can use `npx -y simple-memory-mcp@latest`
- ✅ **No global pollution**: Doesn't install globally unless specified
- ✅ **Version pinning**: Easy to lock to specific version
- ✅ **Cross-platform**: Works same on Windows, macOS, Linux
- ✅ **Standard in MCP ecosystem**: Many MCP servers use this pattern

**Disadvantages:**
- ❌ **Requires npm package**: Must be published to npm
- ❌ **First run slower**: Initial download takes time
- ❌ **Requires internet**: Needs npm registry access on first run
- ❌ **Cache management**: Multiple cached versions over time

**Best for:**
- End users who want simple setup
- Users who want automatic updates
- Production use in MCP clients
- Users without development experience

**Windows Note:**
Windows users must use `npx.cmd` instead of `npx`:
```json
{
  "command": "npx.cmd",
  "args": ["-y", "simple-memory-mcp"]
}
```

---

### 2. Global Install from npm

**Installation:**
```bash
npm install -g simple-memory-mcp
```

**Configuration Example:**
```json
{
  "mcpServers": {
    "simple-memory-mcp": {
      "command": "simple-memory"
    }
  }
}
```

**How it works:**
1. User manually installs package globally
2. Package is symlinked to system PATH
3. Command available everywhere

**Advantages:**
- ✅ **Faster startup**: No download on each run
- ✅ **Works offline**: After initial install
- ✅ **Predictable location**: `node_modules/` in global path
- ✅ **Manual control**: User decides when to update
- ✅ **Standard npm**: Familiar to Node.js developers

**Disadvantages:**
- ❌ **Manual installation**: User must run install command
- ❌ **Manual updates**: Must remember to update
- ❌ **Global pollution**: Adds to global node_modules
- ❌ **Permission issues**: May need sudo/admin on some systems

**Best for:**
- Users who prefer traditional npm workflow
- Users who need offline capability
- Users who want manual update control
- Advanced users comfortable with npm

**Updates:**
```bash
npm update -g simple-memory-mcp
# Or for latest
npm install -g simple-memory-mcp@latest
```

---

### 3. From Source (For Contributors)

**Installation:**
```bash
git clone https://github.com/chrisribe/simple-memory-mcp.git
cd simple-memory-mcp
npm run setup
```

**Configuration Example:**
```json
{
  "mcpServers": {
    "simple-memory-mcp": {
      "command": "simple-memory"
    }
  }
}
```

**How it works:**
1. User clones repository
2. `npm run setup` script:
   - Installs dependencies
   - Builds TypeScript → JavaScript
   - Runs `npm link` (creates global symlink)
   - Configures VS Code automatically

**Advantages:**
- ✅ **Full source access**: Can modify and contribute
- ✅ **Latest changes**: Get unreleased features
- ✅ **Easy development**: Hot reload with `npm run dev`
- ✅ **No npm package needed**: Works from git
- ✅ **Auto VS Code config**: Convenience for developers

**Disadvantages:**
- ❌ **Complex setup**: Multiple steps
- ❌ **Large footprint**: ~50 MB with node_modules
- ❌ **Manual updates**: Must git pull and rebuild
- ❌ **Build step required**: TypeScript compilation needed
- ❌ **Not for end users**: Too technical for non-developers

**Best for:**
- Contributors who want to modify code
- Developers testing unreleased features
- Users who need bleeding-edge updates
- Learning how the tool works internally

**Updates:**
```bash
git pull
npm install  # If package.json changed
npm run build
```

---

## Version Pinning Strategies

### npx with Specific Version
```json
{
  "args": ["-y", "simple-memory-mcp@1.1.0"]
}
```

### npx with Latest
```json
{
  "args": ["-y", "simple-memory-mcp@latest"]
}
```

### npx with Version Range
```json
{
  "args": ["-y", "simple-memory-mcp@^1.1.0"]
}
```

### Global Install with Specific Version
```bash
npm install -g simple-memory-mcp@1.1.0
```

### From Source with Git Tag
```bash
git checkout v1.1.0
npm run setup
```

---

## Environment Variables with Different Methods

All methods support environment variables the same way:

### npx
```json
{
  "command": "npx",
  "args": ["-y", "simple-memory-mcp"],
  "env": {
    "MEMORY_DB": "/custom/path/memory.db"
  }
}
```

### Global Install
```json
{
  "command": "simple-memory",
  "env": {
    "MEMORY_DB": "/custom/path/memory.db"
  }
}
```

### From Source
```json
{
  "command": "simple-memory",
  "env": {
    "MEMORY_DB": "/custom/path/memory.db"
  }
}
```

---

## Publishing Requirements for npx

For npx auto-install to work, the package must:

1. ✅ **Be published to npm**: `npm publish`
2. ✅ **Have proper bin config**: Already configured in package.json
   ```json
   {
     "bin": {
       "simple-memory": "./dist/index.js"
     }
   }
   ```
3. ✅ **Include only necessary files**: Already configured
   ```json
   {
     "files": [
       "dist/**/*",
       "README.md",
       "LICENSE"
     ]
   }
   ```
4. ✅ **Have executable entry point**: Already has `#!/usr/bin/env node`

**Current Status**: Package was unpublished on 2025-06-21. Needs to be republished.

---

## Migration Path

### From Source → npx (When published)
1. User updates MCP config to use npx
2. Restarts MCP client
3. npx downloads and caches package
4. Optionally: Unlink source version with `npm unlink`

### From Global Install → npx
1. User updates MCP config to use npx
2. Restarts MCP client
3. Optionally: Uninstall global version with `npm uninstall -g simple-memory-mcp`

### From npx → Source (For development)
1. Clone repository
2. Run `npm run setup`
3. Update MCP config to use `simple-memory` command
4. Restart MCP client

---

## Recommendations

### For End Users (Non-Technical)
**Use npx auto-install** when package is published:
- Simplest setup
- Automatic updates
- No technical knowledge required

### For Power Users
**Use global install** if you:
- Want offline capability
- Prefer manual update control
- Are comfortable with npm CLI

### For Contributors
**Use from source** if you:
- Want to contribute code
- Need bleeding-edge features
- Want to understand internals
- Are developing/debugging

### For CI/CD Pipelines
**Use npx with version pinning**:
```json
{
  "args": ["-y", "simple-memory-mcp@1.1.0"]
}
```
- Reproducible builds
- No installation step needed
- Explicit version control

---

## Troubleshooting

### npx Issues

**Problem**: "npx: command not found"
- **Solution**: Install Node.js (includes npm and npx)

**Problem**: Slow first run
- **Solution**: Normal - package is downloading. Subsequent runs will be fast.

**Problem**: Different versions on different machines
- **Solution**: Use version pinning: `npx -y simple-memory-mcp@1.1.0`

### Global Install Issues

**Problem**: Permission denied
- **Solution**: Use `sudo npm install -g` (Linux/macOS) or run as Administrator (Windows)
- **Better solution**: Configure npm to use user directory instead of system

**Problem**: Command not found after install
- **Solution**: Check PATH includes npm global bin directory

### From Source Issues

**Problem**: Build fails
- **Solution**: Check Node.js version (need 18+), run `npm install` again

**Problem**: VS Code config not working
- **Solution**: Run `npm run configure` manually, or check VS Code paths

---

## References

- [npm documentation on npx](https://docs.npmjs.com/cli/v10/commands/npx)
- [MCP Server Best Practices](https://modelcontextprotocol.io)
- [Simple Memory Repository](https://github.com/chrisribe/simple-memory-mcp)
