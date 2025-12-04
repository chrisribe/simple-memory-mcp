# NPM Publishing Checklist

Use this checklist before publishing to NPM to ensure quality and avoid common mistakes.

## 🎯 Pre-Flight Checks (Critical)

### Package Identity
- [ ] Package name is correct and available: `simple-memory-mcp`
- [ ] Version follows semver (MAJOR.MINOR.PATCH format)
- [ ] Version is higher than the last published version
- [ ] Description is clear, concise, and accurate (< 150 chars ideal)

### Legal & Licensing
- [ ] LICENSE file exists and is correct (MIT)
- [ ] LICENSE is referenced in package.json
- [ ] No copyright violations in code or documentation
- [ ] Third-party licenses are properly attributed (if applicable)

### Code Quality
- [ ] All TypeScript compiles without errors: `npm run build`
- [ ] All tests pass: `npm test`
- [ ] Performance tests pass: `npm run test:perf`
- [ ] Migration tests pass: `npm run test:migration`
- [ ] No ESLint/TSLint errors (if applicable)
- [ ] Code is properly formatted

### Security
- [ ] No security vulnerabilities: `npm audit` shows 0 vulnerabilities
- [ ] Dependencies are up to date
- [ ] No secrets/credentials in code or config files
- [ ] No .env files included in package
- [ ] Sensitive data properly excluded via "files" array

### Package Contents
- [ ] Verified package contents: `npm pack --dry-run`
- [ ] Only necessary files included (dist/, README.md, LICENSE)
- [ ] Source files (src/) excluded
- [ ] Test files excluded
- [ ] Database files (*.db*) excluded
- [ ] node_modules excluded
- [ ] Development config files excluded
- [ ] Total package size is reasonable (< 5MB unpacked ideal)

### Documentation
- [ ] README.md is comprehensive and up to date
- [ ] Installation instructions are clear
- [ ] Usage examples work as documented
- [ ] API documentation is accurate
- [ ] CHANGELOG.md updated with latest changes
- [ ] All code examples have been tested
- [ ] Links in README work (no 404s)

### package.json Metadata
- [ ] `"name"` is correct
- [ ] `"version"` is correct
- [ ] `"description"` is accurate and helpful
- [ ] `"keywords"` are relevant for discoverability (check we have: mcp, model-context-protocol, memory, storage, sqlite, tags, ai, llm)
- [ ] `"author"` is set correctly
- [ ] `"license"` is "MIT"
- [ ] `"main"` points to `dist/index.js`
- [ ] `"type": "module"` is set (for ES modules)
- [ ] `"bin"` is configured for CLI: `simple-memory`
- [ ] `"files"` array correctly lists what to include
- [ ] `"repository"` URL is correct
- [ ] `"bugs"` URL is correct
- [ ] `"homepage"` URL is correct

### Scripts
- [ ] `"prepublishOnly"` runs build: `npm run build`
- [ ] `"postbuild"` makes CLI executable (Unix)
- [ ] All npm scripts work as expected
- [ ] No broken script references

### Dependencies
- [ ] All dependencies are necessary (no unused packages)
- [ ] Versions are pinned or use reasonable ranges
- [ ] Dev dependencies are in `devDependencies`, not `dependencies`
- [ ] Peer dependencies documented (if applicable)
- [ ] Native dependencies work on target platforms

---

## 🚀 Functional Testing

### Installation Tests
- [ ] Global install works: `npm install -g ./` (from package directory)
- [ ] CLI command available: `simple-memory --version`
- [ ] CLI command works: `simple-memory stats`
- [ ] Uninstall works: `npm uninstall -g simple-memory-mcp`

### Feature Tests
- [ ] MCP server starts without errors
- [ ] Store memory works: `simple-memory store --content "test"`
- [ ] Search works: `simple-memory search --query "test"`
- [ ] GraphQL queries work: `simple-memory graphql --query "{ stats { totalMemories } }"`
- [ ] Export/import works
- [ ] All shortcut commands work
- [ ] Help displays correctly: `simple-memory --help`
- [ ] Version displays correctly: `simple-memory --version`

### Cross-Platform Tests
- [ ] Tested on Linux (if applicable)
- [ ] Tested on macOS (if applicable)
- [ ] Tested on Windows (if applicable)
- [ ] Shebang in dist/index.js is correct: `#!/usr/bin/env node`
- [ ] File permissions are correct (executable flag on Unix)

### Integration Tests
- [ ] Works with VS Code MCP client
- [ ] Works with Claude Desktop (if applicable)
- [ ] Works as MCP server (stdio transport)
- [ ] Works as HTTP server (if applicable)
- [ ] Database migrations work correctly

---

## 📊 Publishing Environment

### NPM Account
- [ ] Logged in to NPM: `npm whoami`
- [ ] Account has publish permissions
- [ ] 2FA is enabled on NPM account (recommended)
- [ ] Have access to 2FA codes/app if required

### Git Repository
- [ ] All changes committed
- [ ] Working directory is clean: `git status`
- [ ] On correct branch (main)
- [ ] Branch is up to date: `git pull origin main`
- [ ] No merge conflicts

### Version Control
- [ ] Git tag will be created for this version
- [ ] GitHub release notes prepared
- [ ] CHANGELOG.md reflects this version

---

## 🎨 Optional Quality Checks

### Documentation Polish
- [ ] Badges in README are up to date
- [ ] Screenshots/GIFs are current (if applicable)
- [ ] Contributing guidelines exist (optional)
- [ ] Code of conduct exists (optional for larger projects)
- [ ] Acknowledgments/credits are complete

### SEO & Discoverability
- [ ] Package name is searchable and memorable
- [ ] Keywords cover main use cases
- [ ] Description contains main keywords
- [ ] README has clear value proposition in first paragraph
- [ ] Examples are practical and relatable

### Community
- [ ] GitHub issues template (optional)
- [ ] Pull request template (optional)
- [ ] Discussion board enabled (optional)

---

## ⚡ Pre-Publish Commands

Run these in sequence before `npm publish`:

```bash
# 1. Clean state
git status                          # Should be clean
npm whoami                          # Should show your username

# 2. Clean install
rm -rf node_modules package-lock.json
npm install

# 3. Security check
npm audit                           # Should show 0 vulnerabilities

# 4. Build
rm -rf dist
npm run build                       # Should succeed

# 5. Test everything
npm test                            # All tests pass
npm run test:perf                   # Performance tests pass
npm run test:migration              # Migration tests pass

# 6. Verify package contents
npm pack --dry-run                  # Review file list

# 7. Version check
npm version                         # Verify version number

# 8. Test install locally
npm install -g ./
simple-memory --version
simple-memory stats
npm uninstall -g simple-memory-mcp
```

---

## 📦 Publishing Commands

```bash
# Standard publish
npm publish

# With 2FA
npm publish --otp=123456

# First-time publish of scoped package
npm publish --access=public

# Dry run (test without publishing)
npm publish --dry-run
```

---

## ✅ Post-Publish Verification

### Immediate Checks
- [ ] Package appears on NPM: https://www.npmjs.com/package/simple-memory-mcp
- [ ] Correct version is shown
- [ ] README renders correctly on NPM
- [ ] Install works: `npm install -g simple-memory-mcp`
- [ ] Downloaded package works as expected

### Git Tasks
- [ ] Create and push git tag: `git tag -a v1.1.1 -m "Release v1.1.1"`
- [ ] Push tag: `git push origin v1.1.1`
- [ ] Create GitHub Release with changelog

### Monitoring
- [ ] Watch for issues in first 24 hours
- [ ] Monitor download stats
- [ ] Check for community feedback

---

## 🚨 Red Flags - Stop Publishing If:

- ❌ Any tests fail
- ❌ npm audit shows vulnerabilities
- ❌ Build fails or has errors
- ❌ Package size > 10MB (investigate why)
- ❌ Wrong version number
- ❌ Missing LICENSE file
- ❌ Secrets/credentials in code
- ❌ Not logged in to npm
- ❌ Git working directory is dirty
- ❌ README has broken links or examples
- ❌ CLI doesn't work when installed globally

---

## 📝 Checklist Summary

**Before you run `npm publish`, you should have checked off:**

**Critical (Must Have):**
- All code quality checks pass ✓
- All security checks pass ✓
- Package contents verified ✓
- Documentation complete ✓
- Functional tests pass ✓

**Recommended (Should Have):**
- Cross-platform testing ✓
- Git repository clean ✓
- Version control ready ✓

**Optional (Nice to Have):**
- Community documentation ✓
- SEO optimization ✓

---

## 🎯 Quick Pre-Publish Script

Save this as a script to run before publishing:

```bash
#!/bin/bash
# pre-publish-check.sh

echo "🔍 Running pre-publish checks..."

# Clean state
if [[ -n $(git status -s) ]]; then
  echo "❌ Git working directory is not clean"
  exit 1
fi

# Dependencies
echo "📦 Installing dependencies..."
rm -rf node_modules package-lock.json
npm install

# Security
echo "🔒 Checking security..."
if npm audit | grep -q "vulnerabilities"; then
  echo "❌ Security vulnerabilities found"
  npm audit
  exit 1
fi

# Build
echo "🔨 Building..."
rm -rf dist
npm run build || exit 1

# Tests
echo "🧪 Running tests..."
npm test || exit 1
npm run test:perf || exit 1
npm run test:migration || exit 1

# Package contents
echo "📋 Checking package contents..."
npm pack --dry-run

echo ""
echo "✅ All pre-publish checks passed!"
echo "📦 Ready to publish with: npm publish"
echo ""
echo "Version: $(node -p "require('./package.json').version")"
echo "Files: $(npm pack --dry-run 2>&1 | grep 'total files' | awk '{print $3}')"
```

Make it executable:
```bash
chmod +x pre-publish-check.sh
```

Run before publishing:
```bash
./pre-publish-check.sh && npm publish
```

---

**🎉 Ready to Publish?**

If all checks pass, proceed with confidence:
```bash
npm publish --otp=123456  # if using 2FA
```

Good luck! 🚀
