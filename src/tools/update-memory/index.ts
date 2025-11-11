import type { Tool } from '../../types/tools.js';
import { execute } from './executor.js';
import { parseCliArgs } from './cli-parser.js';

export const updateMemoryTool: Tool = {
  definition: {
    name: 'update-memory',
    description: 'Update an existing memory with new content and/or tags. The hash will change if content changes. If tags are provided, they replace all existing tags; if omitted, existing tags are preserved. If content is omitted, only tags are updated.',
    inputSchema: {
      type: 'object',
      properties: {
        hash: {
          type: 'string',
          description: 'The hash of the memory to update'
        },
        content: {
          type: 'string',
          description: 'The new content for the memory (optional - if omitted, content remains unchanged)'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'New tags to replace existing tags (optional - if omitted, existing tags are preserved)'
        }
      },
      required: ['hash']
    }
  },
  handler: execute,
  cliParser: parseCliArgs
};
