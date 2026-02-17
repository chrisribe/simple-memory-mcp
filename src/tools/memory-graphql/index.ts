import type { Tool } from '../../types/tools.js';
import { execute } from './executor.js';
import { parseCliArgs } from './cli-parser.js';

export const memoryGraphqlTool: Tool = {
  definition: {
    name: 'memory-graphql',
    description: `GraphQL endpoint for simple-memory.

Common operations
Query memories:
{ memories(tags: ["tag"]) { hash title content tags createdAt } }
{ memory(hash: "abc123") { hash title content tags createdAt } }

Store (create) memory:
mutation { store(content: "...", tags: ["tag1", "tag2"]) { hash } }
Note: Only returns { hash } - title/tags are NOT returned

Update memory:
mutation { update(hash: "abc123", content: "...", tags: ["..."]) { newHash } }

Delete memory:
mutation { delete(hash: "abc123") { deletedCount } }
mutation { delete(tag: "tagname") { deletedCount } }

Key constraints:
- store/update mutations only return result fields (hash/newHash/success/error), not Memory fields
- First line of content becomes the title (auto-generated)
- Use "auto" tag for auto-generated memories

Workflow: 1) Search: { memories(query:"term", summaryOnly:true) { hash title tags } } 2) Get full: { memory(hash:"abc") { content } }. Filter by tags/daysAgo. Summaries ~20 tokens, full ~500-2000.`,
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
