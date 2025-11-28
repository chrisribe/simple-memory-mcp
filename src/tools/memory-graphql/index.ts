import type { Tool } from '../../types/tools.js';
import { execute } from './executor.js';
import { parseCliArgs } from './cli-parser.js';

export const memoryGraphqlTool: Tool = {
  definition: {
    name: 'memory-graphql',
    description: `Execute GraphQL queries against the memory database. This single tool replaces multiple memory tools with a unified, flexible interface.

SCHEMA:
  Query {
    memories(query: String, tags: [String], limit: Int, summaryOnly: Boolean, previewLength: Int): [Memory!]!
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
  # Search with summaries (efficient)
  { memories(query: "typescript", summaryOnly: true) { hash title tags } }
  
  # Get full content by hash
  { memory(hash: "abc123...") { content tags } }
  
  # Store new memory
  mutation { store(content: "Remember this", tags: ["note"]) { success hash } }
  
  # Batch operations in ONE call
  {
    search: memories(query: "mcp", limit: 3) { hash title }
    recent: memories(limit: 5) { hash createdAt }
    stats { totalMemories }
  }

TIPS:
  • Use summaryOnly: true for search, then memory(hash) for full content
  • Request only fields you need (e.g., { hash title } not { hash content title tags createdAt })
  • Batch related queries to reduce round-trips`,
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
