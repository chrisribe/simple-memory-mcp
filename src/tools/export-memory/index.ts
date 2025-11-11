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
        ids: {
          type: 'array',
          items: { type: 'number' },
          description: 'Filter by specific memory IDs (optional)'
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
  cliParser: parseCliArgs,
  cliMetadata: {
    options: [
      {
        name: '--output, -o',
        description: 'Output JSON file path',
        hasValue: true,
        example: '--output memories.json'
      },
      {
        name: '--tags, -t',
        description: 'Filter by comma-separated tags',
        hasValue: true,
        example: '--tags "work,project"'
      },
      {
        name: '--ids',
        description: 'Filter by comma-separated memory IDs',
        hasValue: true,
        example: '--ids "1,2,3"'
      },
      {
        name: '--days-ago',
        description: 'Export memories from last N days',
        hasValue: true,
        example: '--days-ago 7'
      },
      {
        name: '--start-date',
        description: 'Export memories on or after this date',
        hasValue: true,
        example: '--start-date 2025-10-01'
      },
      {
        name: '--end-date',
        description: 'Export memories on or before this date',
        hasValue: true,
        example: '--end-date 2025-10-08'
      },
      {
        name: '--limit, -l',
        description: 'Maximum memories to export',
        hasValue: true,
        example: '--limit 50'
      },
      {
        name: '--source',
        description: 'Source machine identifier',
        hasValue: true,
        example: '--source work-laptop'
      }
    ],
    examples: [
      'export-memory --output all.json',
      'export-memory --output work.json --tags "work,project"',
      'export-memory --output batch.json --ids "1,5,10"',
      'export-memory --output recent.json --start-date 2025-10-01 --limit 20',
      'export-memory --output lastweek.json --days-ago 7'
    ]
  }
};

export default exportMemoryTool;
