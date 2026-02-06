import type { Tool } from '../../types/tools.js';
import { execute } from './executor.js';
import { parseCliArgs } from './cli-parser.js';

export const memoryGraphqlTool: Tool = {
  definition: {
    name: 'memory-graphql',
    description: `Execute GraphQL queries against the memory database. This single tool replaces multiple memory tools with a unified, flexible interface.

🧠 PROACTIVE USAGE: Search memories at the START of conversations or when relevant topics arise to provide personalized, context-aware responses.

💾 AUTO-CAPTURE: Use store mutation proactively to capture important information WITHOUT waiting for explicit requests.
✓ Preferences, decisions, facts about people/projects, learnings, action items
✗ Skip: greetings, temporary info, transactional exchanges
🏷️ Include "auto" tag when auto-capturing. Store SILENTLY - don't announce saves.

⚠️ TOKEN COST: Full content = 500-2000 tokens/memory, summaries = ~20 tokens
• Use summaryOnly: true for search, then memory(hash) for full content
• Request only fields you need (e.g., { hash title } not { hash content title tags createdAt })
• Batch related queries to reduce round-trips`,
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: `GraphQL query or mutation to execute.

SCHEMA:
  Query {
    memories(query: String, tags: [String], limit: Int, daysAgo: Int, startDate: String, endDate: String, minRelevance: Float, summaryOnly: Boolean, previewLength: Int): [Memory!]!
    memory(hash: String!): Memory
    related(hash: String!, limit: Int): [Memory!]!
    stats: Stats!
  }

  Mutation {
    store(content: String!, tags: [String]): StoreResult!
    update(hash: String!, content: String!, tags: [String]): UpdateResult!
    delete(hash: String, tag: String): DeleteResult!
  }

  Memory { hash, content, title, preview, tags, createdAt, relevance }
  Stats { version, totalMemories, totalRelationships, dbSize, schemaVersion }

EXAMPLES:
  { memories(query: "typescript", summaryOnly: true) { hash title tags } }
  { memories(daysAgo: 7) { hash title createdAt } }
  { memories(startDate: "2025-01-01", endDate: "2025-01-31") { hash title } }
  { memories(query: "bug", tags: ["urgent"], daysAgo: 3) { hash title } }
  { memory(hash: "abc123...") { content tags } }
  mutation { store(content: "Remember this", tags: ["note"]) { success hash } }
  { search: memories(query: "mcp", limit: 3) { hash title }, recent: memories(limit: 5) { hash createdAt }, stats { totalMemories } }`
        },
        variables: {
          type: 'object',
          description: 'Optional variables for the query',
          additionalProperties: true
        }
      },
      required: ['query']
    }
  },
  handler: execute,
  cliParser: parseCliArgs
};
