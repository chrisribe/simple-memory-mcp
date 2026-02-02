# NPM Publishing Guide

## Quick Publish (Manual)

```bash
npm login
npm audit && npm test && npm run build
npm publish --provenance --otp=123456
```

> Tags are created automatically by `auto-version-bump.yml` on commits to main.

---

## GitHub Actions (Recommended)

1. Go to: https://github.com/chrisribe/simple-memory-mcp/actions/workflows/publish.yml
2. Click "Run workflow" → optionally enable dry-run
3. Creates GitHub Release + publishes to npm with provenance

**Required secret:** `NPM_TOKEN` (Automation type, 90-day max expiry)
- Generate: https://npmjs.com/settings/cribe/tokens
- Add: Settings → Secrets → `NPM_TOKEN`

---

## Version Management

Versions auto-bump (patch) on commits to main via `auto-version-bump.yml`.

Manual bumps:
```bash
npm run version:patch   # 1.1.1 → 1.1.2
npm run version:minor   # 1.1.1 → 1.2.0  
npm run version:major   # 1.1.1 → 2.0.0
```

---

## Post-Publish Verification

```bash
npm view simple-memory-mcp

# Test without affecting global/dev install:
npx simple-memory-mcp --version

# Or in temp dir:
cd $(mktemp -d) && npm init -y && npm install simple-memory-mcp
```

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| Permission denied | `npm login` |
| Version exists | `npm run version:patch` then publish |
| Vulnerabilities | `npm audit fix` |
| Package too large | Check `files` in package.json |

**Rollback:**
```bash
npm deprecate simple-memory-mcp@1.2.0 "Use 1.2.1"  # preferred
npm unpublish simple-memory-mcp@1.2.0              # within 72h only
```

---

## Maintenance

- **Quarterly:** Rotate `NPM_TOKEN` (90-day expiry)
- **Monthly:** `npm outdated && npm update`
- **Weekly:** Check `npm audit`
