# Troubleshooting Guide

Common issues and solutions for Simple Memory MCP.

## Quick Diagnostic

Run this command to check your environment:

```bash
npm run check-wsl
```

This will identify issues with Node.js, build tools, and WSL configuration.

---

## WSL (Windows Subsystem for Linux) Issues

### Problem: `npm install` fails with UNC path errors

**Symptoms:**
```
npm error UNC paths are not supported
npm error Cannot find module 'C:\Windows\package.json'
npm error gyp ERR! find Python
```

**Cause:** You're using Windows Node.js/npm instead of WSL Node.js.

**Solution:** Install Node.js **inside WSL**. See [WSL Setup Guide](docs/WSL-SETUP.md).

**Quick Fix:**
```bash
# Install nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc

# Install Node.js LTS
nvm install --lts
nvm use --lts

# Install build tools
sudo apt-get update
sudo apt-get install -y build-essential python3

# Try again
npm install
```

### Problem: `better-sqlite3` fails to build

**Symptoms:**
```
npm error gyp ERR! build error
npm error command failed: prebuild-install || node-gyp rebuild
```

**Cause:** Missing build tools or using Windows Node.js.

**Solution:**
```bash
# Install build essentials
sudo apt-get update
sudo apt-get install -y build-essential python3

# Make sure you're using WSL Node.js
which node  # Should show /home/... or /usr/bin/node, NOT /mnt/c/...

# Clean and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Problem: Command `node` not found but npm works

**Cause:** Windows npm is in PATH but WSL Node.js is not installed.

**Solution:** Install Node.js in WSL (see Quick Fix above).

---

## Build Issues

### Problem: TypeScript compilation errors

**Symptoms:**
```
error TS2307: Cannot find module '...'
error TS2345: Argument of type '...' is not assignable to parameter
```

**Solution:**
```bash
# Clean build
rm -rf dist/
npm run build

# If still failing, reinstall dependencies
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Problem: Permission denied on `dist/index.js`

**Solution:**
```bash
chmod +x dist/index.js
```

The `postbuild` script should do this automatically on Linux/macOS.

---

## Runtime Issues

### Problem: Database locked or busy

**Symptoms:**
```
Error: SQLITE_BUSY: database is locked
```

**Cause:** Another process is using the database file.

**Solution:**
```bash
# Find processes using the database
lsof memory.db

# Kill the process if safe
kill <PID>

# Or use a different database
MEMORY_DB=./test-memory.db node dist/index.js
```

### Problem: Module not found errors at runtime

**Symptoms:**
```
Error: Cannot find module '@modelcontextprotocol/sdk'
```

**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## MCP Client Issues

### Problem: MCP server not showing up in VS Code

**Solution:**
```bash
# Reconfigure VS Code
npm run configure

# Check the config file location (Ctrl+click the path)
# It should show your mcp.json location

# Manually verify config
cat ~/.vscode-server/data/User/globalStorage/rooveterinaryinc.roo-cline/mcp.json

# Restart VS Code
```

### Problem: Claude Desktop can't find `simple-memory` command

**Solution:**

Make sure the package is globally linked:
```bash
npm run link
```

Or use the full path in `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "simple-memory-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/simple-memory-mcp/dist/index.js"]
    }
  }
}
```

---

## Performance Issues

### Problem: Slow queries

**Solution:**
```bash
# Check database integrity and rebuild indexes
MEMORY_DB=./memory.db node -e "
const Database = require('better-sqlite3');
const db = new Database('./memory.db');
db.exec('PRAGMA integrity_check');
db.exec('REINDEX');
db.close();
"
```

### Problem: Large database file

**Solution:**
```bash
# Vacuum the database to reclaim space
sqlite3 memory.db 'VACUUM;'

# Or export and reimport
node dist/index.js export-memory --file backup.json
rm memory.db
node dist/index.js import-memory --file backup.json
```

---

## Testing Issues

### Problem: Tests fail on first run

**Cause:** Database might be in use or corrupted.

**Solution:**
```bash
# Clean test databases
rm -f test-*.db

# Rebuild and test
npm run build
npm test
```

### Problem: Permission errors running tests

**Solution:**
```bash
# Make sure build succeeded
npm run build

# Check permissions
ls -la dist/tests/

# Run tests with explicit path
node dist/tests/memory-server-tests.js
```

---

## Need More Help?

1. **Run diagnostics**: `npm run check-wsl`
2. **Check documentation**: [WSL Setup Guide](docs/WSL-SETUP.md)
3. **Open an issue**: [GitHub Issues](https://github.com/chrisribe/simple-memory-mcp/issues)

Include the output of `npm run check-wsl` in your issue report.
