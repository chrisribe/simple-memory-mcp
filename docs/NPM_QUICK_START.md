# NPM Publishing Quick Start

**TL;DR version of the publishing guide for experienced developers.**

## Prerequisites ✓

```bash
npm login
npm whoami  # Verify
```

## Pre-Publish Checklist ✓

```bash
# 1. Clean & Install
rm -rf node_modules package-lock.json && npm install

# 2. Security
npm audit  # Must show 0 vulnerabilities

# 3. Build
rm -rf dist && npm run build

# 4. Test
npm test && npm run test:perf && npm run test:migration

# 5. Verify package
npm pack --dry-run

# 6. Version check
cat package.json | grep version
```

## Publish 🚀

```bash
# Standard
npm publish

# With 2FA
npm publish --otp=123456
```

## Post-Publish ✓

```bash
# 1. Git tag
git tag -a v1.1.1 -m "Release v1.1.1"
git push origin v1.1.1

# 2. Verify
npm view simple-memory-mcp
npm install -g simple-memory-mcp
simple-memory --version

# 3. GitHub Release
# https://github.com/chrisribe/simple-memory-mcp/releases/new
```

## Update Package 🔄

```bash
# 1. Make changes & test
npm test

# 2. Bump version
npm run version:patch  # or minor, major

# 3. Publish
npm publish --otp=123456

# 4. Tag & push
git push --follow-tags
```

---

## Common Issues 🔧

**"Permission denied"**
```bash
npm login
```

**"Version already exists"**
```bash
npm run version:patch
```

**"Vulnerabilities found"**
```bash
npm audit fix
npm test  # Verify still works
```

**"Package too large"**
```bash
npm pack --dry-run  # Check what's included
# Verify "files" array in package.json
```

---

## Full Documentation

- 📘 [Complete Publishing Guide](./NPM_PUBLISHING_GUIDE.md)
- ✅ [Detailed Checklist](./PUBLISHING_CHECKLIST.md)
- 🛠️ [Maintenance Guide](./MAINTENANCE_GUIDE.md)

---

## One-Liner Publish (For Advanced Users)

```bash
git status && npm audit && npm run build && npm test && npm pack --dry-run && npm publish --otp=$(read -p "OTP: " otp && echo $otp) && git push --follow-tags
```

**Use with caution!** This skips verification steps.
