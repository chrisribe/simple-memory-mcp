# 📝 Usage Examples

Simple Memory gives AI assistants persistent context across conversations. No more repeating yourself.

---

## The Core Benefit

**Resume work instantly:**
```
Friday: "Project WIP: Added payment integration, mobile layout done, 
        next step is share feature" → Tagged: wip, my-project

Monday: "Where did I leave off?" → AI recalls exact next steps
```

**Capture decisions with reasoning:**
```
"Product strategy: Research invalidated generic approach, 
pivoting to focused vertical solution based on user interviews"
→ Tagged: strategy, pivot

"Why did we pivot?" → AI recalls the research and reasoning
```

**Build cumulative knowledge:**
```
Week 1: "Using PostgreSQL for ACID guarantees"
Week 2: "Added Redis for session caching"  
Week 4: "What's my full stack?" → AI summarizes all tech decisions
```

---

## 🎯 Work-in-Progress Tracking

**Track implementation progress:**
```
"Auth system: OAuth2 working, need to add refresh tokens next. 
Using Passport.js middleware pattern."
→ Tagged: wip, auth, oauth
```

**Query status anytime:**
- "What's left for auth?" → "Add refresh token handling"
- "Which OAuth library?" → "Passport.js"

**✅ Benefit:** Pick up exactly where you stopped, even weeks later.

---

## 🔄 Managing Context Limits

**The problem:** Long sessions fill context. `/compact` helps but eventually you hit limits.

**The workflow:**
1. **Context getting full?** Just say:
   ```
   "Save current session to wip"
   ```
   AI automatically summarizes: what's done, what's next, key decisions.

2. **Start fresh session:**
   ```
   "Load my wip" or "Where did I leave off?"
   ```

3. **Continue** - full context budget, exact state restored.

**vs `/compact`:**
| | `/compact` | Memory + New Session |
|---|---|---|
| Buys time | Yes, in same session | Yes, fresh session |
| You control what's kept | No, auto-summarized | AI curates, you can refine |
| Persists after session | No | Forever |

**✅ Benefit:** Unlimited session length. Natural commands, AI handles the rest.

---

## 💡 Research & Learnings

**Document technical findings:**
```
"SVG optimization: SVGO removes too much. Better approach: 
manual path simplification with 2-decimal precision keeps quality."
→ Tagged: research, svg, optimization
```

**Capture best practices:**
```
"React performance: useMemo for expensive calculations only. 
Premature optimization causes more bugs than it prevents."
→ Tagged: learning, react, performance
```

**✅ Benefit:** Build your own knowledge base from real experience.

---

## 🔐 Critical Warnings & Anti-Patterns

**Save yourself from mistakes:**
```
"NEVER use rm -rf without ls first - deleted entire uploads/ folder"
→ Tagged: critical, linux, lesson-learned
```

```
"array.map() inside render causes infinite re-renders. 
Move to useMemo or declare outside component."
→ Tagged: bug-pattern, react, warning
```

**✅ Benefit:** AI proactively warns you before repeating costly mistakes.

---

## 🐛 Bug Solutions

**Document what worked:**
```
"CORS error SOLVED: NextAuth requires NEXTAUTH_URL in production. 
Set to actual domain, not localhost."
→ Tagged: bug, solved, nextauth, cors
```

```
"Postgres slow query: Added index on user_id + created_at. 
Query time: 2s → 40ms"
→ Tagged: bug, solved, postgres, performance
```

**✅ Benefit:** Search "solved cors" or "solved postgres" for instant answers.

---

## 📋 Project Planning & Ideas

**Capture feature ideas:**
```
"Feature idea: Batch export - let users download all photos as zip. 
Technical: Stream zip creation, don't load all in memory."
→ Tagged: idea, feature, export
```

**Park projects for later:**
```
"Photo Gallery App - Paused for now. PHP + Reddit API. 
Good side project when time allows."
→ Tagged: parked, side-project
```

**✅ Benefit:** Ideas persist, query "show parked" or "show ideas" anytime.

---

## 📅 Time-Range Searches

**Filter by time:**
```graphql
# Last week's work
{ memories(daysAgo: 7) { title } }

# January learnings
{ memories(startDate: "2025-01-01", endDate: "2025-01-31") { title } }

# Recent bugs
{ memories(tags: ["bug"], daysAgo: 3) { title } }
```

**✅ Benefit:** Review recent work or specific time periods.

---

## 🏗️ Large Codebase Scanning

**Strategy:** Breadth-first scan (~20 high-level memories), then depth-on-demand for specific questions.

**Example workflow:**
1. Initial scan: Store service purposes, tech stack, config patterns
2. Question: "How does auth work?"
3. Deep dive: Explore auth code, store 7 detailed memories
4. Next auth question: Instant (already documented)

**Tag structure:**
```
project:app-name
├── layer:api
├── layer:processing
├── layer:infrastructure
└── service:auth
```

**✅ Benefit:** Build codebase knowledge progressively, not upfront.

---

## 🏷️ Namespace & Multi-Project Patterns

Simple Memory uses tags for namespacing. No schema changes needed.

### Pattern 1: Single User, Multiple Projects

Use `project:<name>` tag prefix:
```graphql
# Store project-specific memory
mutation { store(content: "Uses React 18", tags: ["project:webapp", "tech"]) }

# Query only that project
{ memories(tags: ["project:webapp"]) { title } }
```

### Pattern 2: Work vs Personal Separation

Use context prefixes:
```graphql
# Work memories
tags: ["ctx:work", "team:engineering", "project:api"]

# Personal memories  
tags: ["ctx:personal", "learning", "side-project"]

# Query only work context
{ memories(tags: ["ctx:work"]) { title } }
```

### Pattern 3: Multiple Users (Same Machine)

Option A: **Separate databases** (recommended for privacy)
```json
// User Alice's config
{ "env": { "MEMORY_DB": "/home/alice/.memory/memory.db" } }

// User Bob's config  
{ "env": { "MEMORY_DB": "/home/bob/.memory/memory.db" } }
```

Option B: **User tag prefix** (shared database)
```graphql
# Store with user namespace
mutation { store(content: "My preference", tags: ["user:alice", "pref"]) }

# Query only your memories
{ memories(tags: ["user:alice"]) { title } }
```

### Pattern 4: Time-Based Organization

Combine with temporal queries:
```graphql
# This week's work on webapp
{ memories(tags: ["project:webapp"], daysAgo: 7) { title createdAt } }

# Q1 decisions
{ memories(tags: ["decision"], startDate: "2025-01-01", endDate: "2025-03-31") { title } }
```

### Recommended Tag Taxonomy

```
# Namespaces (choose one pattern)
project:<name>    # Per-project isolation
ctx:<work|personal>  # Context separation
user:<name>       # Multi-user (if shared DB)

# Types (use consistently)
decision          # Architectural/product decisions
preference        # User preferences
learning          # Technical learnings
bug               # Bug encountered (add 'solved' when fixed)
wip               # Work in progress
idea              # Future ideas
warning           # Anti-patterns, gotchas

# Status
active | parked | deprecated | solved

# Priority
critical | normal | fyi
```

**✅ Benefit:** Flexible organization without schema changes. Search by any combination.

---

## 🔧 CLI Reference

**For scripting/debugging:**
```bash
# Store
simple-memory memory-graphql --query 'mutation { 
  store(content: "Note", tags: ["tag"]) { hash } 
}'

# Search
simple-memory memory-graphql --query '{ 
  memories(query: "keyword", limit: 10) { title } 
}'

# Stats
simple-memory memory-graphql --query '{ stats { totalMemories } }'
```

**Primary use:** Let the AI assistant handle everything in conversation.
