# NPM Publishing Guide

## Status: ✅ Ready to Publish

- Package name `simple-memory-mcp` is available (was unpublished 2025-06-21)
- All tests pass, build works, 0 security vulnerabilities
- LICENSE file included, documentation complete

---

## Quick Publish

```bash
# 1. Login
npm login

# 2. Verify
npm audit && npm test && npm run build

# 3. Publish
npm publish --otp=123456  # add OTP if 2FA enabled

# 4. Tag release
git tag -a v1.1.1 -m "Release v1.1.1"
git push origin v1.1.1
```

---

## Prerequisites

**One-time setup:**

1. **NPM Account**: Sign up at https://npmjs.com or run `npm adduser`
2. **Enable 2FA**: Recommended for security (https://npmjs.com/settings/[username]/tfa)
3. **Verify login**: `npm whoami`

---

## Pre-Publish Checklist

Run these before every publish:

```bash
# Security & Quality
npm audit                    # Must show 0 vulnerabilities
npm test                     # Must pass all tests
npm run build                # Must succeed

# Package verification
npm pack --dry-run           # Review what gets published

# Version check
cat package.json | grep version
```

**Critical checks:**
- [ ] LICENSE file exists
- [ ] Version follows semver (MAJOR.MINOR.PATCH)
- [ ] CHANGELOG.md updated
- [ ] No secrets in code
- [ ] Tests pass

---

## Version Management

```bash
# Automated (GitHub Actions does this on main branch commits)
# Commits to main auto-bump patch version

# Manual version bumps
npm run version:patch        # 1.1.1 → 1.1.2 (bug fixes)
npm run version:minor        # 1.1.1 → 1.2.0 (new features)
npm run version:major        # 1.1.1 → 2.0.0 (breaking changes)
```

**Semantic versioning:**
- **PATCH**: Bug fixes only
- **MINOR**: New features, backward compatible
- **MAJOR**: Breaking changes

---

## Publishing Options

### Option 1: Manual Publishing (Recommended)

**When to use:** Full control, first-time publish, major releases

```bash
npm publish --otp=123456
```

### Option 2: Automated Publishing (Advanced)

**When to use:** Mature packages with CI/CD

Add to `.github/workflows/publish.yml`:

```yaml
name: Publish to NPM

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm test
      - run: npm run build
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**Setup required:**
1. Generate NPM token: https://npmjs.com/settings/[username]/tokens
2. Add as GitHub secret: Settings → Secrets → `NPM_TOKEN`
3. Create GitHub release to trigger publish

**⚠️ Caution with automation:**
- Only recommended after several successful manual publishes
- Requires NPM token (security consideration)
- Can't use 2FA with automated publishing
- Consider "automation" token type with IP restrictions
- Test thoroughly in dry-run mode first

**Most packages use manual publishing** - automation adds complexity and security risks for minimal benefit unless you publish frequently.

---

## Post-Publish

```bash
# 1. Verify on NPM
npm view simple-memory-mcp

# 2. Test installation
npm install -g simple-memory-mcp
simple-memory --version
npm uninstall -g simple-memory-mcp

# 3. Create GitHub Release
# Go to: https://github.com/chrisribe/simple-memory-mcp/releases/new
# - Tag: v1.1.1
# - Title: v1.1.1
# - Description: Copy from CHANGELOG.md
```

---

## Maintenance

### Weekly
- Monitor GitHub issues
- Check `npm audit` for new vulnerabilities

### Monthly
```bash
npm outdated              # Check for updates
npm update                # Update minor/patch versions
npm test                  # Verify still works
```

### Before Major Dependency Updates
```bash
# Update one at a time
npm install package@latest
npm test                  # Test thoroughly
npm run build
```

### Common Beginner Mistakes

1. **Publishing without testing install**
   - Always test: `npm pack && npm install -g ./simple-memory-mcp-*.tgz`

2. **Forgetting version bump**
   - Use: `npm run version:patch` before publish

3. **Not checking package contents**
   - Review: `npm pack --dry-run`

4. **Ignoring npm audit warnings**
   - Fix before publish: `npm audit fix`

5. **Publishing with dirty git state**
   - Check: `git status` should be clean

6. **Not creating git tags**
   - Always tag: `git tag -a v1.1.1 -m "Release"`

7. **Testing only in dev environment**
   - Test global install on clean machine

8. **Not updating CHANGELOG**
   - Document all changes before release

---

## Troubleshooting

**"Permission denied"**
```bash
npm login
```

**"Version already exists"**
```bash
npm run version:patch
npm publish
```

**"Vulnerabilities found"**
```bash
npm audit fix
npm test  # Verify still works
```

**"Package too large"**
```bash
npm pack --dry-run
# Check "files" array in package.json
```

**Rollback a bad publish**
```bash
# Option 1: Deprecate (preferred)
npm deprecate simple-memory-mcp@1.2.0 "Use 1.2.1 instead"

# Option 2: Unpublish (within 72 hours only)
npm unpublish simple-memory-mcp@1.2.0
```

---

## Resources

- **NPM Docs**: https://docs.npmjs.com/
- **Semantic Versioning**: https://semver.org/
- **Package.json Guide**: https://docs.npmjs.com/cli/configuring-npm/package-json

---

## TL;DR

```bash
npm login
npm audit && npm test && npm run build
npm run version:patch
npm publish --otp=123456
git tag -a v1.1.1 -m "Release v1.1.1" && git push --follow-tags
```
