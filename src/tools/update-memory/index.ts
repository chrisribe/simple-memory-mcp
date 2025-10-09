import type { Tool } from '../../types/tools.js';
import { execute } from './executor.js';
import { parseCliArgs } from './cli-parser.js';

export const updateMemoryTool: Tool = {
  definition: {
    name: 'update-memory',
    description: 'Update an existing memory\'s content and/or tags. Use this to refine, correct, or enhance stored information instead of creating duplicates.',
    inputSchema: {
      type: 'object',
      properties: {
        hash: {
          type: 'string',
          description: 'The hash of the memory to update (required)'
        },
        content: {
          type: 'string',
          description: 'New content to replace existing content (optional if tags provided)'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'New tags to replace existing tags (optional if content provided)'
        }
      },
      required: ['hash']
    }
  },
  handler: execute,
  cliParser: parseCliArgs,
  cliMetadata: {
    options: [
      {
        name: '--hash',
        description: 'Hash of the memory to update',
        hasValue: true,
        example: '--hash abc123...'
      },
      {
        name: '--content',
        description: 'New content for the memory',
        hasValue: true,
        example: '--content "Updated information"'
      },
      {
        name: '--tags',
        description: 'New comma-separated tags',
        hasValue: true,
        example: '--tags "tag1,tag2,tag3"'
      }
    ],
    examples: [
      'update-memory --hash abc123... --content "Corrected information"',
      'update-memory --hash abc123... --tags "new,tags"',
      'update-memory --hash abc123... --content "Updated" --tags "updated,info"'
    ]
  }
};
