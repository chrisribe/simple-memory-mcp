import type { Tool } from '../../types/tools.js';
import { execute } from './executor.js';
import { parseCliArgs } from './cli-parser.js';

export const searchMemoryTool: Tool = {
  definition: {
    name: 'search-memory',
    description: `Search stored memories by content or tags, with optional relationship traversal.

💡 PROACTIVE USAGE: Search memories at the START of conversations or when relevant topics arise to provide personalized, context-aware responses.

When to search:
• Beginning of new conversation - check for relevant context
• User asks about their preferences or past decisions
• Discussing topics that might have stored information
• Before making recommendations - check what user likes/dislikes
• When user mentions a person, project, or tool previously discussed

Search silently and incorporate findings naturally into responses.`,
    inputSchema: {
      type: 'object',
      properties: {
        hash: {
          type: 'string',
          description: 'Retrieve a specific memory by its MD5 hash (32 char hex). When provided, ignores all other search parameters.'
        },
        query: {
          type: 'string',
          description: 'Text to search for in memory content using full-text search.'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of tags to filter results by. Matches memories that have these exact tags.'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return',
          default: 10,
          minimum: 1
        },
        includeRelated: {
          type: 'boolean',
          description: 'Include related memories in results (default: false)',
          default: false
        },
        relationshipDepth: {
          type: 'number',
          description: 'Depth of relationship traversal when includeRelated is true (default: 1)',
          default: 1,
          minimum: 1,
          maximum: 3
        },
        daysAgo: {
          type: 'number',
          description: 'Filter memories created within the last N days. Example: 7 for last week, 30 for last month.',
          minimum: 0
        },
        startDate: {
          type: 'string',
          description: 'Filter memories created on or after this date (ISO 8601 format: YYYY-MM-DD or full ISO string).'
        },
        endDate: {
          type: 'string',
          description: 'Filter memories created on or before this date (ISO 8601 format: YYYY-MM-DD or full ISO string).'
        },
        minRelevance: {
          type: 'number',
          description: 'Minimum relevance score (0-1). Filters results by BM25 ranking. Higher values (e.g., 0.7-0.9) return only highly relevant matches.',
          minimum: 0,
          maximum: 1
        },
        summaryOnly: {
          type: 'boolean',
          description: 'Return compact summaries instead of full content. Reduces token usage by ~75%. Use hash parameter to retrieve full content.',
          default: false
        },
        contentPreview: {
          type: 'number',
          description: 'Number of characters to include in preview when summaryOnly=true (default: 100)',
          default: 100,
          minimum: 0,
          maximum: 500
        }
      }
    }
  },
  handler: execute,
  cliParser: parseCliArgs
};
