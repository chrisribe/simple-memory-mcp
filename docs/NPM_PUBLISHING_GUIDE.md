# NPM Publishing Guide for Simple Memory MCP

Complete step-by-step guide to publish `simple-memory-mcp` to NPM.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Pre-Publication Checklist](#pre-publication-checklist)
- [Publishing Steps](#publishing-steps)
- [Post-Publication Tasks](#post-publication-tasks)
- [Updating Published Package](#updating-published-package)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### 1. NPM Account Setup

**First-time publishers:**
```bash
# Create account at https://www.npmjs.com/signup
# Or via CLI:
npm adduser
```

**Existing account:**
```bash
# Login to npm
npm login

# Verify you're logged in
npm whoami
```

### 2. Two-Factor Authentication (2FA)

**Highly recommended for package security:**

1. Go to https://www.npmjs.com/settings/[your-username]/tfa
2. Enable 2FA (choose "Authorization and Publishing" for maximum security)
3. Save backup codes in a secure location

**Note:** With 2FA enabled, you'll need to append a one-time password when publishing:
```bash
npm publish --otp=123456
```

### 3. Package Name Verification

```bash
# Check if name is available
npm view simple-memory-mcp

# If you see "404 Not Found" or "Unpublished", the name is available
# If you see package details, the name is taken (unlikely for this package)
```

**Our status:** `simple-memory-mcp` was previously published but unpublished on 2025-06-21. The name is now available for re-publishing.

---

## Pre-Publication Checklist

Use the [PUBLISHING_CHECKLIST.md](./PUBLISHING_CHECKLIST.md) for a detailed verification list. Key items:

### Critical Checks

- [ ] **All tests pass:** `npm test`
- [ ] **Build succeeds:** `npm run build`
- [ ] **No security vulnerabilities:** `npm audit` (should show 0 vulnerabilities)
- [ ] **LICENSE file exists** (MIT license)
- [ ] **README.md is complete** with installation instructions
- [ ] **package.json metadata is correct:**
  - [ ] Name: `simple-memory-mcp`
  - [ ] Version follows semver (e.g., `1.1.1`)
  - [ ] Description is clear and concise
  - [ ] Keywords are relevant for discoverability
  - [ ] Repository URL is correct
  - [ ] License is "MIT"
  - [ ] Author is set
  - [ ] Main entry point: `dist/index.js`
  - [ ] Binary command: `simple-memory`

### Files Configuration

Verify what will be published:
```bash
# Dry run to see included files
npm pack --dry-run

# Should include only:
# - dist/** (compiled JavaScript)
# - README.md
# - LICENSE
# - package.json
```

**What NOT to publish:**
- Source TypeScript files (src/)
- Test files
- Development configuration files
- node_modules/
- Database files (*.db*)
- Environment files (.env)

Our configuration uses the `"files"` array in package.json to control this.

### Version Check

```bash
# Current version
npm version

# Ensure version follows semantic versioning:
# MAJOR.MINOR.PATCH (e.g., 1.1.1)
```

**Version number guidelines:**
- **MAJOR:** Breaking changes (e.g., 1.x.x → 2.0.0)
- **MINOR:** New features, backward compatible (e.g., 1.1.x → 1.2.0)
- **PATCH:** Bug fixes, backward compatible (e.g., 1.1.1 → 1.1.2)

---

## Publishing Steps

### Step 1: Final Preparation

```bash
# 1. Ensure you're on the main branch and it's up to date
git checkout main
git pull origin main

# 2. Clean install dependencies
rm -rf node_modules package-lock.json
npm install

# 3. Run full test suite
npm test
npm run test:perf
npm run test:migration

# 4. Clean build
rm -rf dist
npm run build

# 5. Verify package contents
npm pack --dry-run
```

### Step 2: Version Bump (if needed)

If you need to bump the version before publishing:

```bash
# For patch release (bug fixes): 1.1.1 → 1.1.2
npm run version:patch

# For minor release (new features): 1.1.1 → 1.2.0
npm run version:minor

# For major release (breaking changes): 1.1.1 → 2.0.0
npm run version:major

# This automatically updates:
# - package.json version
# - Creates git tag
# - Updates CHANGELOG.md (if applicable)
```

**Note:** Our automated version bump workflow handles this on commits to main, so manual version bumps are typically only needed for manual releases.

### Step 3: Publish to NPM

```bash
# Standard publish (public package)
npm publish

# With 2FA (append one-time password)
npm publish --otp=123456

# First-time publish should succeed if name is available
```

**Expected output:**
```
+ simple-memory-mcp@1.1.1
```

### Step 4: Verify Publication

```bash
# Check package page
npm view simple-memory-mcp

# Should show:
# - Version number
# - Description
# - Dependencies
# - Dist-tags
# - etc.

# Visit package page
# https://www.npmjs.com/package/simple-memory-mcp
```

### Step 5: Test Installation

**Test in a fresh environment:**

```bash
# Create test directory
mkdir /tmp/test-npm-install
cd /tmp/test-npm-install

# Global installation test
npm install -g simple-memory-mcp

# Verify command is available
simple-memory --version
simple-memory stats

# Test basic functionality
simple-memory store --content "Test memory" --tags "test"
simple-memory search --query "Test"

# Cleanup
npm uninstall -g simple-memory-mcp
cd -
rm -rf /tmp/test-npm-install
```

---

## Post-Publication Tasks

### 1. Create Git Tag and Release

```bash
# Tag the release (if not already done by version bump)
git tag -a v1.1.1 -m "Release version 1.1.1"
git push origin v1.1.1

# Create GitHub Release
# Go to: https://github.com/chrisribe/simple-memory-mcp/releases/new
# - Select tag: v1.1.1
# - Title: "v1.1.1 - [Brief description]"
# - Description: Copy from CHANGELOG.md
# - Attach binaries if applicable
# - Click "Publish release"
```

### 2. Update Documentation

- [ ] Update README.md installation instructions (if changed)
- [ ] Add release notes to CHANGELOG.md
- [ ] Update any version references in documentation
- [ ] Verify npm badges show correct version

### 3. Announce the Release

Consider announcing on:
- [ ] GitHub Discussions
- [ ] Project Discord/Slack (if applicable)
- [ ] Twitter/Social media
- [ ] Dev.to or Medium (if you blog)

**Sample announcement:**
```
🎉 simple-memory-mcp v1.1.1 is now available on NPM!

A blazingly fast MCP server for persistent memory storage with intelligent 
tagging and full-text search.

Install: npm install -g simple-memory-mcp

Features:
- Sub-millisecond performance
- Full-text search with SQLite FTS5
- Smart tagging and auto-relationships
- Zero-config setup

https://www.npmjs.com/package/simple-memory-mcp
https://github.com/chrisribe/simple-memory-mcp
```

### 4. Monitor Initial Usage

**First 24-48 hours:**
- [ ] Check npm download stats: https://npm-stat.com/charts.html?package=simple-memory-mcp
- [ ] Monitor GitHub issues for installation problems
- [ ] Watch for community feedback

---

## Updating Published Package

### For Patch/Minor Updates

```bash
# 1. Make your changes
# 2. Test thoroughly
npm test

# 3. Build
npm run build

# 4. Bump version
npm run version:patch  # or version:minor

# 5. Publish
npm publish --otp=123456  # if using 2FA
```

### For Major Updates (Breaking Changes)

**Extra care required:**

1. **Update CHANGELOG.md** with clear migration guide
2. **Document breaking changes** in README.md
3. **Consider deprecation warnings** before removing features
4. **Test extensively** with real-world use cases
5. **Bump to next major version:** `npm run version:major`
6. **Publish with release notes**

### Deprecating Old Versions

If you need to deprecate an old version:

```bash
# Deprecate a specific version
npm deprecate simple-memory-mcp@1.0.0 "Please upgrade to v1.1.0 or higher"

# Deprecate all versions below a certain version
npm deprecate simple-memory-mcp@"<1.1.0" "Version 1.1.0+ required for security fixes"
```

---

## Troubleshooting

### Common Issues

#### 1. "You do not have permission to publish"

**Solution:**
```bash
# Verify you're logged in
npm whoami

# If not logged in:
npm login

# Check package.json name doesn't conflict
npm view simple-memory-mcp
```

#### 2. "Package name too similar to existing package"

**Solution:**
- If legitimate conflict, consider scoped package: `@chrisribe/simple-memory-mcp`
- Update package.json: `"name": "@chrisribe/simple-memory-mcp"`
- Publish scoped package: `npm publish --access=public`

#### 3. "Version already exists"

**Solution:**
```bash
# Check current published version
npm view simple-memory-mcp version

# Bump to next version
npm run version:patch
npm publish
```

#### 4. "npm ERR! 403 Forbidden"

**Possible causes:**
- 2FA required but not provided: Use `--otp=123456`
- Not logged in: Run `npm login`
- No permission for scoped package: Use `--access=public`
- Package name taken: Change package name

#### 5. "prepublishOnly script failed"

**Solution:**
```bash
# Our prepublishOnly runs build
# If it fails, check build errors:
npm run build

# Fix TypeScript errors, then retry
npm publish
```

### Testing Package Locally Before Publishing

**Use `npm link` for local testing:**

```bash
# In package directory
npm link

# In another project
npm link simple-memory-mcp

# Test functionality
# ...

# Unlink when done
npm unlink simple-memory-mcp  # in test project
npm unlink -g                 # in package directory
```

**Or use tarball:**

```bash
# Create tarball
npm pack

# Install in test project
cd /path/to/test/project
npm install /path/to/simple-memory-mcp-1.1.1.tgz

# Test, then cleanup
npm uninstall simple-memory-mcp
```

---

## Security Best Practices

### 1. Enable 2FA

**Mandatory for popular packages:**
- Go to npm settings
- Enable 2FA for "Authorization and Publishing"
- Keep backup codes safe

### 2. Audit Dependencies Regularly

```bash
# Check for vulnerabilities
npm audit

# Fix automatically
npm audit fix

# Check before every publish
```

### 3. Review Package Contents

**Before publishing, always check:**
```bash
npm pack --dry-run

# Ensure no sensitive data:
# - No .env files
# - No private keys
# - No database files
# - No credentials
```

### 4. Use .npmignore or "files" in package.json

We use the `"files"` array in package.json for explicit control:
```json
{
  "files": [
    "dist/**/*",
    "README.md",
    "LICENSE"
  ]
}
```

This is safer than `.npmignore` (whitelist vs blacklist).

### 5. Avoid Typosquatting

- Use exact package name in documentation
- Monitor for similar package names
- Report suspicious packages to npm

---

## Additional Resources

- **NPM Documentation:** https://docs.npmjs.com/
- **Semantic Versioning:** https://semver.org/
- **Package.json Guide:** https://docs.npmjs.com/cli/v10/configuring-npm/package-json
- **Publishing Packages:** https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry
- **Package Security:** https://docs.npmjs.com/packages-and-modules/securing-your-code

---

## Quick Reference

```bash
# Login
npm login

# Verify login
npm whoami

# Check package availability
npm view simple-memory-mcp

# Dry run package contents
npm pack --dry-run

# Bump version
npm run version:patch

# Publish
npm publish

# Publish with 2FA
npm publish --otp=123456

# Check published package
npm view simple-memory-mcp

# Test install
npm install -g simple-memory-mcp
```

---

**Ready to publish? 🚀**

Follow the [PUBLISHING_CHECKLIST.md](./PUBLISHING_CHECKLIST.md) to ensure you haven't missed anything!
