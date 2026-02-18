/**
 * GraphQL resolvers for simple-memory
 * Maps GraphQL operations to MemoryService methods
 */

import type { MemoryService, MemoryEntry } from '../services/memory-service.js';

/**
 * Convert MemoryEntry to GraphQL Memory type with computed fields
 */
function toGraphQLMemory(entry: MemoryEntry, previewLength: number = 100) {
  const content = entry.content || '';
  const firstLine = content.split('\n')[0] || '';
  const title = firstLine.length > 80 ? firstLine.slice(0, 77) + '...' : firstLine;
  
  return {
    hash: entry.hash,
    content: entry.content,
    title,
    // preview is a function that takes length arg
    preview: (args?: { length?: number }) => {
      const len = args?.length ?? previewLength;
      return content.length > len ? content.slice(0, len) + '...' : content;
    },
    tags: entry.tags || [],
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt || null,
    relevance: entry.relevance
  };
}

/**
 * Create resolvers bound to a MemoryService instance
 */
export function createResolvers(memoryService: MemoryService) {
  return {
    Query: {
      memories: (_: any, args: {
        query?: string;
        tags?: string[];
        limit?: number;
        daysAgo?: number;
        startDate?: string;
        endDate?: string;
        minRelevance?: number;
        summaryOnly?: boolean;
        previewLength?: number;
      }) => {
        const limit = args.limit ?? 10;
        const previewLength = args.previewLength ?? 100;
        
        const results = memoryService.search(
          args.query,
          args.tags,
          limit,
          args.daysAgo,
          args.startDate,
          args.endDate,
          args.minRelevance
        );
        
        return results.map(entry => toGraphQLMemory(entry, previewLength));
      },

      memory: (_: any, args: { hash: string }) => {
        const entry = memoryService.getByHash(args.hash);
        return entry ? toGraphQLMemory(entry) : null;
      },

      related: (_: any, args: { hash: string; limit?: number }) => {
        const limit = args.limit ?? 10;
        const results = memoryService.getRelated(args.hash, limit);
        return results.map(entry => toGraphQLMemory(entry));
      },

      stats: () => {
        return memoryService.stats();
      }
    },

    Mutation: {
      store: (_: any, args: { content: string; tags?: string[] }) => {
        try {
          const hash = memoryService.store(args.content, args.tags || []);
          return { success: true, hash };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      },

      update: (_: any, args: { hash: string; content: string; tags?: string[] }) => {
        try {
          const hash = memoryService.update(args.hash, args.content, args.tags);
          if (hash) {
            return { success: true, hash };
          }
          return { success: false, error: `Memory not found: ${args.hash}` };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      },

      delete: (_: any, args: { hash?: string; tag?: string }) => {
        try {
          if (!args.hash && !args.tag) {
            return { success: false, hash: null, deletedCount: 0, error: 'Either hash or tag must be provided' };
          }
          
          if (args.hash && args.tag) {
            return { success: false, hash: null, deletedCount: 0, error: 'Provide either hash or tag, not both' };
          }
          
          if (args.hash) {
            const deleted = memoryService.delete(args.hash);
            return { success: true, hash: deleted ? args.hash : null, deletedCount: deleted ? 1 : 0 };
          }
          
          if (args.tag) {
            const count = memoryService.deleteByTag(args.tag);
            return { success: true, hash: null, deletedCount: count };
          }
          
          return { success: false, hash: null, deletedCount: 0 };
        } catch (error: any) {
          return { success: false, hash: null, deletedCount: 0, error: error.message };
        }
      }
    }
  };
}
