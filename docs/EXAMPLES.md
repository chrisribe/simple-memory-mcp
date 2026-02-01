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
