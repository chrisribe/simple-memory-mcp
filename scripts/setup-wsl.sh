#!/bin/bash
# Automated WSL/Linux Setup Script for Simple Memory MCP
# This script installs all dependencies and sets up the project

set -e  # Exit on any error

echo "=========================================="
echo "Simple Memory MCP - WSL/Linux Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

print_step() {
    echo ""
    echo "=========================================="
    echo "$1"
    echo "=========================================="
    echo ""
}

# Check if running in WSL or Linux
if grep -qi microsoft /proc/version; then
    print_info "Detected WSL environment"
    IS_WSL=true
else
    print_info "Detected native Linux environment"
    IS_WSL=false
fi

# Step 1: Check for Node.js
print_step "Step 1: Checking Node.js Installation"

if command -v node &> /dev/null; then
    NODE_PATH=$(which node)
    NODE_VERSION=$(node --version)
    
    if [[ $NODE_PATH == /mnt/c/* ]]; then
        print_error "Found Windows Node.js at $NODE_PATH"
        print_info "Will install WSL Node.js instead"
        NEED_NODE=true
    else
        print_success "Found WSL/Linux Node.js: $NODE_VERSION at $NODE_PATH"
        NEED_NODE=false
    fi
else
    print_error "Node.js not found"
    NEED_NODE=true
fi

# Step 2: Install Node.js using nvm if needed
if [ "$NEED_NODE" = true ]; then
    print_step "Step 2: Installing Node.js via nvm"
    
    # Check if nvm already exists
    if [ -d "$HOME/.nvm" ]; then
        print_info "nvm directory already exists, loading it..."
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    else
        print_info "Downloading and installing nvm..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
        
        # Load nvm
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
    fi
    
    # Install Node.js LTS
    print_info "Installing Node.js LTS..."
    nvm install --lts
    nvm use --lts
    
    # Verify installation
    NODE_VERSION=$(node --version)
    print_success "Node.js $NODE_VERSION installed successfully"
else
    print_step "Step 2: Node.js already installed - Skipping"
    # Make sure nvm is loaded if it exists
    if [ -d "$HOME/.nvm" ]; then
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    fi
fi

# Step 3: Check for build tools
print_step "Step 3: Checking Build Tools"

NEED_BUILD_TOOLS=false

if ! command -v gcc &> /dev/null; then
    print_error "gcc not found"
    NEED_BUILD_TOOLS=true
fi

if ! command -v make &> /dev/null; then
    print_error "make not found"
    NEED_BUILD_TOOLS=true
fi

if ! command -v python3 &> /dev/null; then
    print_error "python3 not found"
    NEED_BUILD_TOOLS=true
fi

if [ "$NEED_BUILD_TOOLS" = false ]; then
    print_success "All build tools already installed"
fi

# Step 4: Install build tools if needed
if [ "$NEED_BUILD_TOOLS" = true ]; then
    print_step "Step 4: Installing Build Tools"
    
    print_info "This step requires sudo access..."
    
    # Update package list
    sudo apt-get update
    
    # Install build-essential and python3
    sudo apt-get install -y build-essential python3
    
    print_success "Build tools installed successfully"
else
    print_step "Step 4: Build tools already installed - Skipping"
fi

# Step 5: Clean up any Windows-installed node_modules
print_step "Step 5: Cleaning Previous Installation"

if [ -d "node_modules" ]; then
    print_info "Removing existing node_modules..."
    rm -rf node_modules
    print_success "node_modules removed"
fi

if [ -f "package-lock.json" ]; then
    print_info "Removing package-lock.json..."
    rm -f package-lock.json
    print_success "package-lock.json removed"
fi

# Step 6: Run npm setup (installs, builds, links, and configures VS Code)
print_step "Step 6: Running npm run setup"

print_info "Running npm run setup (install + build + link + configure)..."
if npm run setup; then
    print_success "Setup completed successfully!"
else
    print_error "Setup encountered errors. Check output above."
fi

# Step 7: Run tests
print_step "Step 7: Running Tests"

print_info "Running npm test..."
if npm test; then
    print_success "All tests passed!"
else
    print_error "Some tests failed. Check output above."
fi

# Final summary
print_step "Setup Complete! 🎉"

echo "Summary:"
echo "  • Node.js: $(node --version)"
echo "  • npm: $(npm --version)"
echo "  • Location: $(which node)"
echo ""
echo "You can now:"
echo "  • Use as MCP server: Restart VS Code to activate"
echo "  • Use CLI: node dist/index.js --help"
echo "  • Use global command: simple-memory --help"
echo ""
echo "Important: Add this to your ~/.bashrc to use Node.js in new terminals:"
echo ""
echo "  export NVM_DIR=\"\$HOME/.nvm\""
echo "  [ -s \"\$NVM_DIR/nvm.sh\" ] && \\. \"\$NVM_DIR/nvm.sh\""
echo ""
print_success "Setup completed successfully!"
echo ""
