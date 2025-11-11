import type { ToolContext } from '../../types/tools.js';
import { debugLog, formatHash } from '../../utils/debug.js';

interface StoreMemoryArgs {
  content: string;
  tags?: string[];
  autoLink?: boolean;
  relateTo?: string[];
}

interface StoreMemoryResult {
  success: boolean;
  hash: string;
  message: string;
  relationshipsCreated?: number;
}

export async function execute(args: StoreMemoryArgs, context: ToolContext): Promise<StoreMemoryResult> {
  try {
    // Validate content
    if (!args.content || args.content.trim().length === 0) {
      throw new Error('Content cannot be empty');
    }

    // Log content size for large memories
    const contentSize = args.content.length;
    if (contentSize > 100000) {
      debugLog(`Storing large memory: ${contentSize} characters`);
    }

    const hash = context.memoryService.store(args.content, args.tags || []);
    let relationshipsCreated = 0;
    
    // Handle automatic relationship creation
    if (args.autoLink !== false) { // Default to true
      relationshipsCreated += await createAutoRelationships(hash, args, context);
    }
    
    // Handle explicit relationships
    if (args.relateTo && args.relateTo.length > 0) {
      relationshipsCreated += await createExplicitRelationships(hash, args.relateTo, context);
    }
    
    const message = relationshipsCreated > 0 
      ? `Memory stored successfully with hash: ${formatHash(hash)} (${relationshipsCreated} relationships created)`
      : `Memory stored successfully with hash: ${formatHash(hash)}...`;
    
    return {
      success: true,
      hash,
      message,
      relationshipsCreated
    };
  } catch (error) {
    return {
      success: false,
      hash: '',
      message: `Failed to store memory: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Create automatic relationships based on similar tags and content
 */
async function createAutoRelationships(hash: string, args: StoreMemoryArgs, context: ToolContext): Promise<number> {
  if (!args.tags || args.tags.length === 0) {
    return 0;
  }
  
  try {
    // Find memories with similar tags
    const similarMemories = context.memoryService.search(undefined, args.tags, undefined, 5);
    
    // Build array of relationships to create
    const relationships = similarMemories
      .filter(memory => memory.hash !== hash) // Don't link to self
      .filter(memory => {
        const commonTags = args.tags!.filter(tag => memory.tags.includes(tag));
        return commonTags.length > 0;
      })
      .map(memory => ({ 
        fromHash: hash, 
        toHash: memory.hash, 
        relationshipType: 'similar' as const 
      }));
    
    // Use bulk insert for better performance
    if (relationships.length > 0) {
      return context.memoryService.linkMemoriesBulk(relationships);
    }
    
    return 0;
  } catch (error) {
    console.error('Auto-relationship creation failed:', error);
    return 0;
  }
}

/**
 * Create explicit relationships based on relateTo tags
 */
async function createExplicitRelationships(hash: string, relateTo: string[], context: ToolContext): Promise<number> {
  try {
    // Find memories with the specified tags
    const relatedMemories = context.memoryService.search(undefined, relateTo, undefined, 10);
    
    // Build array of relationships to create
    const relationships = relatedMemories
      .filter(memory => memory.hash !== hash) // Don't link to self
      .map(memory => ({ 
        fromHash: hash, 
        toHash: memory.hash, 
        relationshipType: 'related' as const 
      }));
    
    // Use bulk insert for better performance
    if (relationships.length > 0) {
      return context.memoryService.linkMemoriesBulk(relationships);
    }
    
    return 0;
  } catch (error) {
    console.error('Explicit relationship creation failed:', error);
    return 0;
  }
}
