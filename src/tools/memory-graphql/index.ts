import type { Tool } from '../../types/tools.js';
import { execute } from './executor.js';
import { parseCliArgs } from './cli-parser.js';

export const memoryGraphqlTool: Tool = {
  definition: {
    name: 'memory-graphql',
    description: `GraphQL memory store. WORKFLOW: 1) Search: { memories(query:"term", summaryOnly:true) { hash title tags } } 2) Get full: { memory(hash:"abc") { content } }. MUTATIONS: mutation { store(content:"text", tags:["t1"]) { hash } }. Filter by tags/daysAgo. Auto-capture: tag "auto". Summaries ~20 tokens, full ~500-2000.`,
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
