import type { Tool } from '../../types/tools.js';
import { execute } from './executor.js';
import { parseCliArgs } from './cli-parser.js';

export const memoryGraphqlTool: Tool = {
  definition: {
    name: 'memory-graphql',
    description: `GraphQL endpoint for simple-memory.

TOKEN COST: Full content = 500-2000 tokens/memory, summaries = ~20 tokens. ALWAYS use summaryOnly:true on first search, then fetch full content by hash only when needed.

QUERIES:
{ memories(query: "search term", summaryOnly: true) { hash title tags } }
{ memory(hash: "abc123") { hash title content tags createdAt } }

MUTATIONS - all return { hash }:
mutation { store(content: "...", tags: ["a"]) { hash } }
mutation { update(hash: "abc", content: "...") { hash } }
mutation { delete(hash: "abc") { hash } }

Workflow: Search with summaryOnly:true, then fetch full content by hash.`,
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: `GraphQL query/mutation.

Query: memories(query tags limit daysAgo summaryOnly) memory(hash) related(hash) stats
Mutation: store(content tags) update(hash content tags) delete(hash|tag)
Fields: hash content title preview tags createdAt relevance

Examples:
{ memories(query:"project", summaryOnly:true) { hash title } }
{ memory(hash:"abc") { content } }
mutation { store(content:"Note", tags:["auto"]) { hash } }`
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
