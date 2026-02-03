import type { Tool } from '../../types/tools.js';
import { parseCliArgs } from './cli-parser.js';
import { execute } from './executor.js';

export const exportMemoryTool: Tool = {
  definition: {
    name: 'export-memory',
    description: 'Export memories to JSON file with optional filtering by tags, dates, or limit. Useful for backup, cross-machine sync, or sharing.',
    inputSchema: {
      type: 'object',
      properties: {
        output: {
          type: 'string',
          description: 'Output JSON file path (required)'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by tags (optional)'
        },
        hashes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Export specific memories by hash (comma-separated)'
        },
        daysAgo: {
          type: 'number',
          description: 'Export memories from the last N days'
        },
        startDate: {
          type: 'string',
          description: 'Export memories created on or after this date (ISO format or YYYY-MM-DD)'
        },
        endDate: {
          type: 'string',
          description: 'Export memories created on or before this date (ISO format or YYYY-MM-DD)'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of memories to export'
        },
        source: {
          type: 'string',
          description: 'Source machine/context identifier (optional)'
        }
      },
      required: ['output']
    }
  },
  handler: execute,
  cliParser: parseCliArgs
};

export default exportMemoryTool;
