# 📝 Real-World Usage Examples

Simple Memory shines when used with AI assistants through MCP. Here are real conversation flows showing how persistent memory transforms your workflow.

---

## 🎯 Example 1: Building Project Context Over Time

**Day 1:**
> **You:** "I'm starting a new project. It's a React app with TypeScript, using Vite for bundling. We'll deploy to Vercel."
> 
> **Assistant:** *Stores this with tags: `project`, `react`, `typescript`, `vite`, `vercel`*

**Day 3:**
> **You:** "What stack am I using for my project again?"
> 
> **Assistant:** *Searches memories and finds: "You're using React with TypeScript, Vite for bundling, and deploying to Vercel."*

**Week 2:**
> **You:** "We decided to add Prisma ORM with PostgreSQL for the database."
> 
> **Assistant:** *Stores this and auto-links to previous project memories*

**Week 4:**
> **You:** "Give me a summary of all my tech stack decisions."
> 
> **Assistant:** *Retrieves all related memories and provides complete context*

---

## 💡 Example 2: Personal Knowledge Base

**Learning Session:**
> **You:** "Remember this: TypeScript generics allow type-safe reusable components. The syntax is `function name<T>(arg: T): T`"
> 
> **Assistant:** *Stores with tags: `typescript`, `generics`, `learning`*

> **You:** "Also note: Array.reduce() is perfect for transforming arrays into single values. Use it instead of forEach when accumulating."
> 
> **Assistant:** *Stores with tags: `javascript`, `arrays`, `patterns`*

**Later that week:**
> **You:** "What did I learn about TypeScript generics?"
> 
> **Assistant:** *Retrieves your note with the exact syntax example*

> **You:** "Show me all my JavaScript tips"
> 
> **Assistant:** *Searches tag `javascript` and finds all related notes*

---

## 🔐 Example 3: Secure Information Storage

**Storing Credentials:**
> **You:** "Store this API key for the payment gateway: sk_live_abc123xyz"
> 
> **Assistant:** *Stores securely with tags: `api-key`, `payment`, `credentials`*

> **You:** "The database connection string is postgresql://user:pass@host:5432/db"
> 
> **Assistant:** *Stores with tags: `credentials`, `database`, `connection-string`*

**Retrieval:**
> **You:** "What's my payment gateway API key?"
> 
> **Assistant:** *Searches memories: "Your payment gateway API key is sk_live_abc123xyz"*

> **You:** "Show me all my stored credentials"
> 
> **Assistant:** *Lists all memories tagged with `credentials`*

---

## 📋 Example 4: Meeting Notes & Decisions

**After Team Meeting:**
> **You:** "Meeting notes: Team agreed on 2-week sprints starting Monday. Sprint planning on Mondays at 10am. Retrospectives on Fridays."
> 
> **Assistant:** *Stores with tags: `meeting`, `agile`, `team`, `schedule`*

> **You:** "Important decision: We're going with PostgreSQL instead of MongoDB for better transaction support."
> 
> **Assistant:** *Stores with tags: `decision`, `database`, `architecture`*

**Later:**
> **You:** "When are our sprint meetings?"
> 
> **Assistant:** *Retrieves schedule from meeting notes*

> **You:** "Why did we choose PostgreSQL?"
> 
> **Assistant:** *Finds decision and reasoning: "For better transaction support"*

---

## 🚀 Example 5: Continuous Context Building

The real power comes from **persistent memory across all conversations**:

```
Session 1: Store project setup info
  ↓
Session 2: Assistant remembers and builds on it
  ↓
Session 5: Store API decisions
  ↓
Session 10: Assistant recalls everything - full context maintained
  ↓
Session 20: Complete project knowledge base available instantly
```

**This is impossible with standard chat sessions that lose context!**

---

## 🔧 CLI Usage (For Testing & Direct Access)

You can also use the CLI directly for testing or scripting:

```bash
# Store a memory
simple-memory memory-graphql --query 'mutation { 
  store(content: "PostgreSQL connection: postgresql://localhost:5432/mydb", tags: ["database", "credentials"]) 
  { hash } 
}'

# Search by content
simple-memory memory-graphql --query '{ memories(query: "PostgreSQL") { hash title tags } }'

# Search by tags
simple-memory memory-graphql --query '{ memories(tags: ["credentials"]) { hash content } }'

# View statistics
simple-memory memory-graphql --query '{ stats { totalMemories totalRelationships dbSize } }'

# Delete memories by tag
simple-memory memory-graphql --query 'mutation { delete(tag: "temporary") { deletedCount } }'
```

**When to use CLI:**
- ✅ Testing the MCP server works
- ✅ Bulk operations or scripting
- ✅ Debugging or inspecting the database
- ✅ Manual backup before major changes

**Primary use case:** Let your AI assistant handle everything through natural conversation!
