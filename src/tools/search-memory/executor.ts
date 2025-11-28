import type { ToolContext } from '../../types/tools.js';
import type { MemoryEntry } from '../../services/memory-service.js';

interface SearchMemoryArgs {
  query?: string;
  tags?: string[];
  limit?: number;
  includeRelated?: boolean;
  relationshipDepth?: number;
  daysAgo?: number;
  startDate?: string;
  endDate?: string;
  minRelevance?: number;
  summaryOnly?: boolean;
  contentPreview?: number;
}

interface MemorySummary {
  hash: string;
  title: string;  // First line of content, max 80 chars
  tags: string[];
  createdAt: string;
  relevance?: number;  // BM25 relevance score (0-1)
  preview: string;  // First N chars of content
}

interface SearchMemoryResult {
  memories: MemoryEntry[] | MemorySummary[];
  relatedMemories?: MemoryEntry[] | MemorySummary[];
  total: number;
  searchTerm?: string;
  searchTags?: string[];
  relationshipDepth?: number;
  summaryOnly?: boolean;
}

/**
 * Convert a full memory entry to a compact summary
 */
function toSummary(memory: MemoryEntry, previewLength: number): MemorySummary {
  const content = memory.content || '';
  
  // Title: first line, max 80 chars
  const firstLine = content.split('\n')[0] || '';
  const title = firstLine.length > 80 ? firstLine.slice(0, 77) + '...' : firstLine;
  
  // Preview: first N chars
  const preview = content.length > previewLength 
    ? content.slice(0, previewLength) + '...' 
    : content;
  
  return {
    hash: memory.hash,
    title,
    tags: memory.tags || [],
    createdAt: memory.createdAt,
    relevance: memory.relevance,
    preview
  };
}

export async function execute(args: SearchMemoryArgs, context: ToolContext): Promise<SearchMemoryResult> {
  // Use provided limit or default to 10, ensure it's at least 1
  const limit = Math.max(1, args.limit || 10);
  const summaryOnly = args.summaryOnly || false;
  const previewLength = args.contentPreview || 100;

  const memories = context.memoryService.search(
    args.query, 
    args.tags, 
    limit,
    args.daysAgo,
    args.startDate,
    args.endDate,
    args.minRelevance
  );
  
  // Transform to summaries if requested
  const resultMemories = summaryOnly 
    ? memories.map(m => toSummary(m, previewLength))
    : memories;
  
  const result: SearchMemoryResult = {
    memories: resultMemories,
    total: memories.length,
    searchTerm: args.query,
    searchTags: args.tags,
    summaryOnly
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
    
    // Transform to summaries if requested
    result.relatedMemories = summaryOnly 
      ? uniqueRelated.map(m => toSummary(m, previewLength))
      : uniqueRelated;
    result.relationshipDepth = depth;
  }
  
  return result;
}
