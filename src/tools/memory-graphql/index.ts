import type { Tool } from '../../types/tools.js';
import { execute } from './executor.js';
import { parseCliArgs } from './cli-parser.js';

export const memoryGraphqlTool: Tool = {
  definition: {
    name: 'memory-graphql',
    description: `GraphQL interface for simple-memory storage.

💾 AUTO-CAPTURE: Store important info proactively (preferences, decisions, facts, learnings).
🏷️ Include "auto" tag when auto-capturing. Store SILENTLY.

⚠️ TOKEN COST: Use summaryOnly: true for search, then memory(hash) for full content.

SCHEMA:
  Query {
    memories(query: String, tags: [String], limit: Int, daysAgo: Int, minRelevance: Float, summaryOnly: Boolean): [Memory!]!
    memory(hash: String!): Memory
    stats: Stats!
  }
  Mutation {
    store(content: String!, tags: [String]): StoreResult!
    update(hash: String!, content: String!, tags: [String]): UpdateResult!
    delete(hash: String, tag: String): DeleteResult!
  }
  Memory { hash, content, title, tags, createdAt, relevance }

EXAMPLES:
  { memories(query: "typescript", summaryOnly: true) { hash title tags } }
  { memory(hash: "abc...") { content } }
  mutation { store(content: "Prefers dark mode", tags: ["auto", "preference"]) { hash } }`,
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'GraphQL query or mutation to execute'
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
