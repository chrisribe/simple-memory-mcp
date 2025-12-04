# Package Maintenance Guide

Complete guide for maintaining `simple-memory-mcp` on NPM over time.

## 📋 Table of Contents

- [Regular Maintenance Tasks](#regular-maintenance-tasks)
- [Dependency Management](#dependency-management)
- [Version Management](#version-management)
- [Security Maintenance](#security-maintenance)
- [Community Management](#community-management)
- [Performance Monitoring](#performance-monitoring)
- [Things Beginners Often Miss](#things-beginners-often-miss)
- [Long-Term Considerations](#long-term-considerations)

---

## Regular Maintenance Tasks

### Weekly Tasks (When Active)

**Monitor Issues & Pull Requests:**
```bash
# Check GitHub notifications
# Respond to issues within 48 hours
# Review pull requests within 1 week
# Label and prioritize appropriately
```

**Track Downloads & Usage:**
- Visit: https://npm-stat.com/charts.html?package=simple-memory-mcp
- Monitor trends and spikes
- Investigate sudden drops (could indicate breaking changes)

**Security Scan:**
```bash
# Check for new vulnerabilities
npm audit

# If vulnerabilities found, assess and fix
npm audit fix

# Test after fixes
npm test
```

### Monthly Tasks

**Dependency Updates:**
```bash
# Check for outdated dependencies
npm outdated

# Update minor/patch versions
npm update

# Test thoroughly after updates
npm test
npm run test:perf
npm run test:migration

# Commit if all tests pass
git add package.json package-lock.json
git commit -m "chore: update dependencies"
```

**Documentation Review:**
- [ ] Check for broken links in README.md
- [ ] Update screenshots if UI changed
- [ ] Review and update examples if API changed
- [ ] Check if documentation matches current version

**Performance Check:**
```bash
# Run benchmarks and compare to previous
npm run benchmark

# Document any significant changes
# Investigate performance regressions
```

### Quarterly Tasks

**Major Dependency Updates:**
```bash
# Review major version updates
npm outdated

# Update one major dependency at a time
npm install @modelcontextprotocol/sdk@latest

# Test extensively
npm test
npm run test:perf

# Check for breaking changes in dependency changelog
# Update code if needed
```

**Compatibility Testing:**
- [ ] Test with latest Node.js LTS version
- [ ] Test with latest MCP SDK version
- [ ] Test on different platforms (Windows/Mac/Linux)
- [ ] Test with different MCP clients (VS Code, Claude Desktop)

**SEO & Discoverability:**
- [ ] Review keywords in package.json
- [ ] Update README for better search ranking
- [ ] Check NPM package page rendering
- [ ] Update badges (build status, version, downloads)

### Yearly Tasks

**License & Legal:**
- [ ] Update copyright year in LICENSE (if applicable)
- [ ] Review third-party licenses
- [ ] Check for license compliance

**Archive & Deprecation:**
- [ ] Decide if package should continue
- [ ] Consider archiving if no longer maintained
- [ ] Deprecate old versions if needed

---

## Dependency Management

### Philosophy

**Keep dependencies minimal:**
- Only add dependencies when necessary
- Prefer standard library when possible
- Audit new dependencies before adding

**Current core dependencies:**
```json
{
  "@modelcontextprotocol/sdk": "MCP protocol implementation",
  "better-sqlite3": "SQLite database with performance",
  "graphql": "GraphQL query language",
  "@graphql-tools/schema": "GraphQL schema building",
  "dotenv": "Environment variable management"
}
```

### Updating Dependencies

**Strategy:**
1. Update patch versions freely (1.2.3 → 1.2.4)
2. Test minor versions carefully (1.2.3 → 1.3.0)
3. Plan major versions strategically (1.2.3 → 2.0.0)

**Process:**
```bash
# 1. Check what's outdated
npm outdated

# 2. Read changelogs
# Visit each package's GitHub and read CHANGELOG

# 3. Update incrementally
npm install package-name@latest

# 4. Test thoroughly
npm test
npm run test:perf

# 5. Update lockfile
npm install

# 6. Commit with clear message
git add package.json package-lock.json
git commit -m "chore: update package-name to v2.0.0"
```

### Handling Breaking Changes

**When a dependency introduces breaking changes:**

1. **Read migration guide** in dependency's changelog
2. **Create a feature branch** for the update
3. **Update code** to work with new version
4. **Update tests** if API changed
5. **Test extensively** on all platforms
6. **Document changes** in your CHANGELOG.md
7. **Consider if it's a breaking change** for your users
8. **Bump version appropriately** (may require major version bump)

**Example:**
```bash
# Dependency update requires code changes
git checkout -b update-mcp-sdk-v2

# Make necessary code changes
# ...

# Test
npm test

# Document
echo "- Updated @modelcontextprotocol/sdk to v2.0.0" >> CHANGELOG.md
echo "- BREAKING: Minimum Node.js version now 18+" >> CHANGELOG.md

# Commit
git add .
git commit -m "feat!: update MCP SDK to v2.0.0"

# Bump major version (due to breaking change)
npm run version:major

# Merge and publish
git checkout main
git merge update-mcp-sdk-v2
npm publish
```

### Dependency Security

**Always check for vulnerabilities:**
```bash
# After any dependency change
npm audit

# Fix automatically if possible
npm audit fix

# Manual fix if auto-fix unavailable
npm install vulnerable-package@safe-version
```

**Subscribe to security advisories:**
- Enable GitHub Dependabot alerts
- Watch dependency repositories for security issues
- Join security mailing lists for critical dependencies

---

## Version Management

### Semantic Versioning (SemVer)

**Format:** MAJOR.MINOR.PATCH (e.g., 1.2.3)

**When to bump:**
- **PATCH (1.2.3 → 1.2.4):** Bug fixes, no API changes
- **MINOR (1.2.3 → 1.3.0):** New features, backward compatible
- **MAJOR (1.2.3 → 2.0.0):** Breaking changes, API changes

### Our Versioning Scripts

```bash
# Automated (our workflow handles this)
# Every commit to main auto-bumps patch version

# Manual (for releases)
npm run version:patch  # Bug fixes
npm run version:minor  # New features
npm run version:major  # Breaking changes
```

### Changelog Maintenance

**Keep CHANGELOG.md up to date:**

```markdown
## [Unreleased]

### Added
- New feature X
- New command Y

### Changed
- Improved performance of Z

### Fixed
- Fixed bug in feature A

## [1.2.0] - 2025-01-15

### Added
- Feature that was released
```

**When releasing:**
1. Move items from "Unreleased" to new version section
2. Add release date
3. Commit changelog with version bump
4. Create git tag

### Deprecation Strategy

**When deprecating features:**

1. **Announce deprecation** (at least one minor version before removal):
   ```typescript
   console.warn('DEPRECATED: This feature will be removed in v2.0.0. Use newFeature() instead.');
   ```

2. **Document in CHANGELOG:**
   ```markdown
   ### Deprecated
   - `oldFunction()` - Use `newFunction()` instead. Will be removed in v2.0.0.
   ```

3. **Provide migration path** in documentation

4. **Remove in next major version**

**When deprecating entire package:**
```bash
# Mark as deprecated on NPM
npm deprecate simple-memory-mcp "This package is no longer maintained. Use alternative-package instead."

# Or deprecate specific version range
npm deprecate simple-memory-mcp@"<2.0.0" "Please upgrade to v2.0.0+"
```

---

## Security Maintenance

### Regular Security Audits

**Weekly/Monthly:**
```bash
# Check for vulnerabilities
npm audit

# Review results
npm audit --json > audit-report.json

# Fix automatically if safe
npm audit fix

# For breaking changes, fix manually
npm audit fix --force  # ⚠️ Be careful, can break things
```

### Handling Security Issues

**If security vulnerability reported:**

1. **Acknowledge quickly** (within 24 hours)
2. **Assess severity** (use CVSS scores)
3. **Create private fix** (don't announce until fixed)
4. **Test thoroughly**
5. **Publish patch version**
6. **Announce fix** with CVE if applicable
7. **Deprecate vulnerable versions**

**Template response:**
```
Thank you for reporting this security issue.

We take security seriously and will:
1. Investigate the issue immediately
2. Provide a patch within 48-72 hours
3. Notify users via GitHub Security Advisory

Please do not disclose publicly until we've released a fix.
```

### Security Best Practices

**Never commit secrets:**
```bash
# Use git-secrets or similar tools
# Add pre-commit hooks

# .gitignore should include:
.env
*.key
*.pem
secrets/
```

**Review pull requests for security:**
- Check for hardcoded credentials
- Look for unsafe dependencies
- Verify input validation
- Check for SQL injection (we use prepared statements ✓)
- Review file path traversal risks

**Maintain 2FA on NPM:**
- Keep 2FA enabled on your npm account
- Store backup codes securely
- Use auth-only or auth-and-publish mode

---

## Community Management

### Responding to Issues

**Issue triage:**
- Label appropriately: `bug`, `enhancement`, `question`, `good first issue`
- Set priority: `P0` (critical), `P1` (high), `P2` (medium), `P3` (low)
- Assign milestones if applicable
- Close duplicates with link to original

**Response templates:**

**Bug report:**
```markdown
Thanks for reporting this issue!

To help us fix it, please provide:
- [ ] Version of simple-memory-mcp
- [ ] Node.js version
- [ ] Operating system
- [ ] Steps to reproduce
- [ ] Expected vs actual behavior

We'll investigate and update you soon.
```

**Feature request:**
```markdown
Thanks for the suggestion!

This could be a useful feature. We'll consider it for a future release.

In the meantime, you might be able to achieve similar results by [workaround].

We'll update this issue once we have a decision.
```

**Question:**
```markdown
Great question!

[Answer their question]

For more information, check out:
- [Link to relevant documentation]
- [Link to similar issue/discussion]

Does this answer your question?
```

### Managing Pull Requests

**PR review checklist:**
- [ ] Does it solve the stated problem?
- [ ] Are tests included/passing?
- [ ] Is documentation updated?
- [ ] Does it follow code style?
- [ ] Are there breaking changes?
- [ ] Is CHANGELOG.md updated?

**PR templates:**
```markdown
## Description
[What does this PR do?]

## Motivation
[Why is this change needed?]

## Testing
[How was this tested?]

## Checklist
- [ ] Tests pass
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] No breaking changes (or documented if yes)
```

### Building Community

**Encourage contributions:**
- Add CONTRIBUTING.md (optional but helpful)
- Label "good first issue" for beginners
- Thank contributors publicly
- Add contributors to README (optional)

**Maintain healthy communication:**
- Be respectful and professional
- Respond within reasonable timeframes
- Be open to feedback
- Admit mistakes and learn from them

---

## Performance Monitoring

### Benchmarking

**Regular benchmarks:**
```bash
# Run benchmark suite
npm run benchmark

# Save results for comparison
npm run benchmark > benchmarks/$(date +%Y-%m-%d).txt

# Compare over time to detect regressions
```

**Track key metrics:**
- Store operation time (target: < 0.1ms)
- Search operation time (target: < 0.2ms)
- Memory usage
- Database size growth
- Package size

### Performance Regressions

**If performance degrades:**

1. **Identify the change** that caused it (git bisect)
2. **Profile the code** to find bottleneck
3. **Optimize or revert**
4. **Add performance test** to prevent regression
5. **Document in CHANGELOG**

**Tools:**
```bash
# Profile Node.js app
node --prof dist/index.js
node --prof-process isolate-*.log

# Memory profiling
node --inspect dist/index.js
# Use Chrome DevTools

# Benchmark specific operations
console.time('operation');
// ... code ...
console.timeEnd('operation');
```

---

## Things Beginners Often Miss

### 1. **Package Size Matters**

**Don't include unnecessary files:**
```bash
# Check what you're publishing
npm pack --dry-run

# Common mistakes:
# ❌ Including node_modules (should be in .gitignore)
# ❌ Including test files (large test fixtures)
# ❌ Including source TypeScript (include only dist/)
# ❌ Including .git directory
# ❌ Including database files
```

**Our solution:**
```json
{
  "files": [
    "dist/**/*",
    "README.md",
    "LICENSE"
  ]
}
```

### 2. **Versioning Discipline**

**Mistakes beginners make:**
- ❌ Publishing 1.0.0 too early (use 0.x.x for experimental)
- ❌ Breaking changes in patch/minor versions
- ❌ Not following semver consistently
- ❌ Forgetting to bump version before publish
- ❌ Not tagging releases in git

**Best practice:**
```bash
# Always bump version before publish
npm run version:patch

# Always create git tag
git tag -a v1.2.3 -m "Release v1.2.3"
git push origin v1.2.3

# Never edit published versions (publish new version instead)
```

### 3. **Testing Installed Package**

**Don't just test in development:**
```bash
# Test as if you're a user
npm pack
npm install -g ./simple-memory-mcp-1.1.1.tgz

# Verify CLI works
simple-memory --version
simple-memory stats

# Test in a real project
mkdir test-project
cd test-project
npm install -g simple-memory-mcp
# ... test usage ...

# Clean up
npm uninstall -g simple-memory-mcp
```

### 4. **Documentation Drift**

**Keep docs in sync:**
- ❌ README examples don't work
- ❌ API documentation outdated
- ❌ Screenshots from old version
- ❌ Installation instructions incorrect

**Solution:**
- Test all README examples
- Update screenshots when UI changes
- Review docs with each release
- Use automated doc generation when possible

### 5. **Not Reading NPM Output**

**Pay attention to publish output:**
```bash
npm publish

# Read warnings:
# ⚠️ "package.json: No repository field"
# ⚠️ "package.json: No license field"
# ⚠️ "This looks like a HUGE package"
```

Fix warnings before publishing.

### 6. **Forgetting Platform Differences**

**Test on multiple platforms:**
- Line endings (CRLF vs LF)
- Path separators (/ vs \)
- File permissions (chmod +x)
- Case sensitivity
- Native dependencies

**Our solution:**
```json
{
  "postbuild": "node -e \"if (process.platform !== 'win32') { require('child_process').execSync('chmod +x dist/index.js'); }\""
}
```

### 7. **Not Planning for Scale**

**What works for 10 users may not work for 10,000:**
- Database migrations (we handle this ✓)
- Breaking changes (deprecation strategy needed)
- Support load (documentation reduces support burden)
- Download bandwidth (keep package size reasonable)

### 8. **Ignoring Deprecation Warnings**

**During development:**
```bash
# You see:
(node:12345) DeprecationWarning: ...

# Don't ignore! Fix it now while it's easy.
# In 6 months, that deprecated feature might be removed.
```

### 9. **Not Having a Rollback Plan**

**If you publish a broken version:**
```bash
# Option 1: Deprecate bad version
npm deprecate simple-memory-mcp@1.2.0 "This version has critical bugs. Use 1.2.1 instead."

# Option 2: Unpublish (only within 72 hours)
npm unpublish simple-memory-mcp@1.2.0

# Option 3: Publish fix quickly
npm run version:patch
npm publish
```

**Prevention:**
- Test thoroughly before publish
- Use `npm publish --dry-run` first
- Have CI/CD run tests before publish

### 10. **Poor Git Hygiene**

**Mistakes:**
- ❌ Committing directly to main
- ❌ Not using feature branches
- ❌ No clear commit messages
- ❌ Not using git tags for releases

**Better approach:**
```bash
# Feature development
git checkout -b feature/new-feature
# ... work ...
git commit -m "feat: add new feature"

# PR and review
git push origin feature/new-feature
# Create PR on GitHub
# Review and merge

# Release
git checkout main
git pull
npm run version:minor
git push --follow-tags
npm publish
```

---

## Long-Term Considerations

### When to Sunset a Package

**Signs it might be time to stop:**
- No longer maintained
- Better alternatives exist
- No longer needed (problem solved differently)
- Too much maintenance burden
- Security issues can't be fixed

**Graceful shutdown process:**

1. **Announce deprecation:**
   ```bash
   npm deprecate simple-memory-mcp "This package is no longer maintained. Use [alternative] instead."
   ```

2. **Update README:**
   ```markdown
   # ⚠️ DEPRECATED

   This package is no longer maintained. 

   Please migrate to [alternative-package].

   ## Migration Guide
   [Provide migration instructions]
   ```

3. **Archive GitHub repository**
   - Mark as archived on GitHub
   - Disable issues and PRs
   - Add prominent notice

4. **Final security patches only**
   - Fix critical security issues
   - No new features

### Transferring Ownership

**If you want to hand off to someone else:**

```bash
# NPM ownership
npm owner add new-maintainer simple-memory-mcp
npm owner rm your-username simple-memory-mcp

# GitHub repository
# Transfer via Settings → Transfer ownership
```

### Keeping Motivation

**Package maintenance is a marathon, not a sprint:**

- Set realistic expectations
- It's okay to take breaks
- Ask for help (co-maintainers)
- Celebrate milestones
- Don't feel guilty about saying no to features
- Remember why you created it

**Automate what you can:**
- Use GitHub Actions for CI/CD
- Automated version bumping (we have this ✓)
- Automated dependency updates (Dependabot)
- Automated testing
- Automated publishing (optional)

---

## Useful Commands Reference

```bash
# Version management
npm run version:patch
npm run version:minor
npm run version:major

# Publishing
npm publish
npm publish --otp=123456
npm publish --dry-run

# Package inspection
npm view simple-memory-mcp
npm pack --dry-run
npm outdated

# Security
npm audit
npm audit fix

# Testing
npm test
npm run test:perf
npm run test:migration
npm run benchmark

# Installation testing
npm install -g ./
npm install -g simple-memory-mcp

# Deprecation
npm deprecate simple-memory-mcp@1.0.0 "Message"
npm deprecate simple-memory-mcp@"<1.1.0" "Message"

# Ownership
npm owner ls simple-memory-mcp
npm owner add username simple-memory-mcp
npm owner rm username simple-memory-mcp

# Stats
npm view simple-memory-mcp versions
npm view simple-memory-mcp time
```

---

## Resources

- **NPM Documentation:** https://docs.npmjs.com/
- **Semantic Versioning:** https://semver.org/
- **Keep a Changelog:** https://keepachangelog.com/
- **GitHub Actions:** https://docs.github.com/en/actions
- **Node.js Security:** https://nodejs.org/en/security/
- **Package Maintenance:** https://github.com/npm/npm/wiki/npm-tricks

---

**Remember:** Good maintenance is about consistency, not perfection. Do what you can, automate what makes sense, and ask for help when needed. 🚀
