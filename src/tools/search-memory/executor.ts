import type { ToolContext } from '../../types/tools.js';
import type { MemoryEntry } from '../../services/memory-service.js';

interface SearchMemoryArgs {
  query?: string;
  tags?: string[];
  ids?: number[];
  limit?: number;
  includeRelated?: boolean;
  relationshipDepth?: number;
  daysAgo?: number;
  startDate?: string;
  endDate?: string;
  minRelevance?: number;
}

interface SearchMemoryResult {
  memories: MemoryEntry[];
  relatedMemories?: MemoryEntry[];
  total: number;
  searchTerm?: string;
  searchTags?: string[];
  relationshipDepth?: number;
}

export async function execute(args: SearchMemoryArgs, context: ToolContext): Promise<SearchMemoryResult> {
  // Use provided limit or default to 10, ensure it's at least 1
  const limit = Math.max(1, args.limit || 10);

  const memories = context.memoryService.search(
    args.query, 
    args.tags,
    args.ids,
    limit,
    args.daysAgo,
    args.startDate,
    args.endDate,
    args.minRelevance
  );
  const result: SearchMemoryResult = {
    memories,
    total: memories.length,
    searchTerm: args.query,
    searchTags: args.tags
  };
  
  // Include related memories if requested
  if (args.includeRelated) {
    const relatedMemories: MemoryEntry[] = [];
    const depth = args.relationshipDepth || 1;
    
    for (const memory of memories) {
      const related = context.memoryService.getRelated(memory.hash, Math.ceil(limit / memories.length));
      relatedMemories.push(...related);
    }
    
    // Remove duplicates and original memories
    const originalHashes = new Set(memories.map(m => m.hash));
    const uniqueRelated = relatedMemories.filter((memory, index, arr) => 
      !originalHashes.has(memory.hash) && 
      arr.findIndex(m => m.hash === memory.hash) === index
    );
    
    result.relatedMemories = uniqueRelated;
    result.relationshipDepth = depth;
  }
  
  return result;
}
