# WSL Setup Guide

This project requires Node.js to be installed **inside WSL** (not Windows Node.js) to properly build native dependencies like `better-sqlite3`.

## Automated Setup (Recommended)

Run this one command to set everything up automatically:

```bash
bash scripts/setup-wsl.sh
```

This script will:
- ✅ Install Node.js via nvm (if not already installed)
- ✅ Install build tools (gcc, make, python3)
- ✅ Clean up any broken installations
- ✅ Install project dependencies
- ✅ Build the project
- ✅ Run tests
- ✅ Optionally install globally

**That's it!** The script handles everything automatically.

---

## Manual Setup

If you prefer to install manually or need more control:

### 1. Install Node.js in WSL

Using Node Version Manager (nvm) - **Recommended**:

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Restart your terminal or run:
source ~/.bashrc

# Install Node.js LTS
nvm install --lts
nvm use --lts
```

Or using apt (Ubuntu/Debian):

```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### 2. Install Build Dependencies

```bash
# Required for building native modules
sudo apt-get update
sudo apt-get install -y build-essential python3
```

### 3. Install Project Dependencies

```bash
cd /home/cribe/simple-memory-mcp
npm install
npm run build
npm test
```

## Troubleshooting

### Issue: `npm` still uses Windows version

If `which npm` shows `/mnt/c/Program Files/nodejs/npm`, your PATH is using Windows Node.js.

**Solution**: Close and reopen your terminal after installing Node.js in WSL, or run:
```bash
source ~/.bashrc
hash -r  # Clear bash command cache
```

### Issue: UNC path errors

This means Windows npm is being used. Make sure WSL Node.js is installed and comes first in PATH.

### Issue: Python errors during build

Install Python 3:
```bash
sudo apt-get install -y python3
```

### Issue: Permission errors

If you get EACCES errors:
```bash
# Fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

## Verifying Correct Setup

Run these commands to verify you're using WSL versions:

```bash
which node    # Should be: /home/.../.nvm/versions/node/... or /usr/bin/node
which npm     # Should be: /home/.../.nvm/versions/node/... or /usr/bin/npm
node --version
npm --version
```

Both should point to paths in `/home/` or `/usr/`, **not** `/mnt/c/`.

## Why WSL-native Node.js?

- **Native modules**: `better-sqlite3` needs to be compiled for Linux, not Windows
- **Performance**: WSL Node.js is faster for file operations in WSL filesystem
- **Compatibility**: Avoids UNC path issues and cross-platform conflicts
