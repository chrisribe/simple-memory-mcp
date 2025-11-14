#!/bin/bash
# WSL Environment Check Script
# Run this to diagnose Node.js/npm setup issues in WSL

echo "=== WSL Environment Check ==="
echo ""

echo "1. Checking Node.js installation..."
if command -v node &> /dev/null; then
    NODE_PATH=$(which node)
    NODE_VERSION=$(node --version)
    echo "✓ Node.js found: $NODE_PATH"
    echo "  Version: $NODE_VERSION"
    
    if [[ $NODE_PATH == /mnt/c/* ]]; then
        echo "  ⚠️  WARNING: Using Windows Node.js! This will cause build errors."
        echo "  Install Node.js inside WSL instead."
    else
        echo "  ✓ Using WSL Node.js"
    fi
else
    echo "✗ Node.js not found"
    echo "  Install with: curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash"
fi

echo ""
echo "2. Checking npm installation..."
if command -v npm &> /dev/null; then
    NPM_PATH=$(which npm)
    NPM_VERSION=$(npm --version)
    echo "✓ npm found: $NPM_PATH"
    echo "  Version: $NPM_VERSION"
    
    if [[ $NPM_PATH == /mnt/c/* ]]; then
        echo "  ⚠️  WARNING: Using Windows npm! This will cause build errors."
        echo "  Install Node.js inside WSL instead."
    else
        echo "  ✓ Using WSL npm"
    fi
else
    echo "✗ npm not found"
fi

echo ""
echo "3. Checking build tools..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo "✓ Python 3 found: $PYTHON_VERSION"
else
    echo "✗ Python 3 not found"
    echo "  Install with: sudo apt-get install -y python3"
fi

if command -v make &> /dev/null; then
    echo "✓ make found"
else
    echo "✗ make not found"
    echo "  Install with: sudo apt-get install -y build-essential"
fi

if command -v gcc &> /dev/null; then
    GCC_VERSION=$(gcc --version | head -n1)
    echo "✓ gcc found: $GCC_VERSION"
else
    echo "✗ gcc not found"
    echo "  Install with: sudo apt-get install -y build-essential"
fi

echo ""
echo "4. Checking PATH..."
if [[ $PATH == */mnt/c/* ]]; then
    echo "⚠️  PATH contains Windows directories"
    echo "  This may cause issues if WSL Node.js is not first"
    echo ""
    echo "  Windows paths in PATH:"
    echo "$PATH" | tr ':' '\n' | grep "/mnt/c/"
else
    echo "✓ PATH looks clean"
fi

echo ""
echo "5. Checking WSL filesystem..."
CURRENT_DIR=$(pwd)
if [[ $CURRENT_DIR == /mnt/* ]]; then
    echo "⚠️  Current directory is on Windows filesystem: $CURRENT_DIR"
    echo "  Consider moving project to WSL filesystem for better performance"
    echo "  Example: /home/$USER/projects/"
else
    echo "✓ Current directory is on WSL filesystem: $CURRENT_DIR"
fi

echo ""
echo "=== Recommendations ==="
echo ""

HAS_ISSUES=0

# Check for Windows Node.js
if command -v node &> /dev/null && [[ $(which node) == /mnt/c/* ]]; then
    echo "🔧 Install Node.js in WSL:"
    echo "   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash"
    echo "   source ~/.bashrc"
    echo "   nvm install --lts"
    echo ""
    HAS_ISSUES=1
fi

# Check for missing build tools
if ! command -v python3 &> /dev/null || ! command -v make &> /dev/null; then
    echo "🔧 Install build tools:"
    echo "   sudo apt-get update"
    echo "   sudo apt-get install -y build-essential python3"
    echo ""
    HAS_ISSUES=1
fi

# Check filesystem
if [[ $CURRENT_DIR == /mnt/* ]]; then
    echo "🔧 For better performance, move project to WSL filesystem:"
    echo "   mkdir -p ~/projects"
    echo "   cp -r $CURRENT_DIR ~/projects/"
    echo "   cd ~/projects/$(basename $CURRENT_DIR)"
    echo ""
    HAS_ISSUES=1
fi

if [ $HAS_ISSUES -eq 0 ]; then
    echo "✓ Everything looks good! You should be able to run:"
    echo "  npm install"
    echo "  npm run build"
    echo "  npm test"
else
    echo "After fixing the issues above, try:"
    echo "  npm install"
    echo "  npm run build"
fi

echo ""
