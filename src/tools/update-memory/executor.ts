import type { ToolContext } from '../../types/tools.js';
import { debugLog, formatHash } from '../../utils/debug.js';

interface UpdateMemoryArgs {
  hash: string;
  content?: string;
  tags?: string[];
}

interface UpdateMemoryResult {
  success: boolean;
  oldHash?: string;
  newHash?: string;
  message: string;
  tagsUpdated?: boolean;
}

export async function execute(args: UpdateMemoryArgs, context: ToolContext): Promise<UpdateMemoryResult> {
  try {
    // Validate inputs
    if (!args.hash || args.hash.trim().length === 0) {
      throw new Error('Hash cannot be empty');
    }

    // Check if memory exists before updating
    const existing = context.memoryService.getByHash(args.hash);
    if (!existing) {
      return {
        success: false,
        message: `Memory not found with hash: ${formatHash(args.hash)}...`
      };
    }

    // Use existing content if not provided (tags-only update)
    const newContent = args.content !== undefined ? args.content : existing.content;

    // Validate content is not empty
    if (!newContent || newContent.trim().length === 0) {
      throw new Error('Content cannot be empty');
    }

    // Log content size for large memories
    const contentSize = newContent.length;
    if (contentSize > 100000) {
      debugLog(`Updating with large content: ${contentSize} characters`);
    }

    // Perform the update
    const newHash = context.memoryService.update(args.hash, newContent, args.tags);
    
    if (!newHash) {
      return {
        success: false,
        message: `Failed to update memory with hash: ${formatHash(args.hash)}...`
      };
    }

    const hashChanged = newHash !== args.hash;
    const tagsUpdated = args.tags !== undefined;
    const contentUpdated = args.content !== undefined;
    
    let message = `Memory updated successfully.`;
    if (hashChanged) {
      message += ` New hash: ${formatHash(newHash)}...`;
    } else {
      message += ` Hash unchanged: ${formatHash(newHash)}...`;
    }
    if (tagsUpdated && !contentUpdated) {
      message += ` (tags updated only)`;
    } else if (tagsUpdated) {
      message += ` (content and tags updated)`;
    }
    
    return {
      success: true,
      oldHash: args.hash,
      newHash,
      message,
      tagsUpdated
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to update memory: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
