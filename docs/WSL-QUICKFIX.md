# WSL Quick Fix

If you're getting `npm install` errors on WSL, you have two options:

## Option 1: Automated Setup (Easiest)

Run the automated setup script:

```bash
bash scripts/setup-wsl.sh
```

This will install everything automatically and fix all issues.

## Option 2: Manual Setup

Follow these steps:

## 1. Install Node.js in WSL

```bash
# Install nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Restart terminal or run:
source ~/.bashrc

# Install Node.js LTS
nvm install --lts
nvm use --lts
```

## 2. Install Build Tools

```bash
sudo apt-get update
sudo apt-get install -y build-essential python3
```

## 3. Verify Setup

```bash
which node   # Should NOT show /mnt/c/...
which npm    # Should NOT show /mnt/c/...
```

## 4. Install Project

```bash
cd /home/cribe/simple-memory-mcp
npm install
npm run build
npm test
```

## Need More Help?

- See [WSL-SETUP.md](WSL-SETUP.md) for detailed instructions
- Run `npm run check-wsl` to diagnose issues
- See [../TROUBLESHOOTING.md](../TROUBLESHOOTING.md) for more solutions
