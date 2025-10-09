import type { ToolContext } from '../../types/tools.js';
import { debugLog, formatHash } from '../../utils/debug.js';

interface UpdateMemoryArgs {
  hash: string;
  content?: string;
  tags?: string[];
}

interface UpdateMemoryResult {
  success: boolean;
  hash: string;
  message: string;
}

export async function execute(args: UpdateMemoryArgs, context: ToolContext): Promise<UpdateMemoryResult> {
  try {
    // Validate hash
    if (!args.hash || args.hash.trim().length === 0) {
      throw new Error('Hash cannot be empty');
    }

    // Validate that at least one field is being updated
    if (!args.content && !args.tags) {
      throw new Error('Must provide either content or tags to update');
    }

    // Log content size for large memories
    if (args.content) {
      const contentSize = args.content.length;
      if (contentSize > 100000) {
        debugLog(`Updating with large content: ${contentSize} characters`);
      }
    }

    const updated = context.memoryService.update(args.hash, args.content, args.tags);
    
    if (!updated) {
      return {
        success: false,
        hash: args.hash,
        message: `Memory with hash ${formatHash(args.hash)} not found`
      };
    }
    
    return {
      success: true,
      hash: args.hash,
      message: `Memory updated successfully with hash: ${formatHash(args.hash)}`
    };
  } catch (error) {
    return {
      success: false,
      hash: args.hash || '',
      message: `Failed to update memory: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
