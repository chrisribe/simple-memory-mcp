/**
 * Simple Memory SDK
 * 
 * A simple interface for using Simple Memory core functions in your projects.
 * This SDK provides a clean API for memory storage, search, and management.
 * 
 * @example
 * ```typescript
 * import { createMemoryClient } from 'simple-memory-mcp/sdk';
 * 
 * const client = createMemoryClient('./my-memories.db');
 * const hash = client.store('Hello world', ['greeting']);
 * const results = client.search('hello');
 * ```
 */

import { MemoryService } from './services/memory-service.js';
import type {
  MemoryEntry,
  MemoryStats,
  MemoryRelationship
} from './services/memory-service.js';
import type {
  ExportFilters,
  ImportOptions,
  ImportResult,
  ExportFormat
} from './types/tools.js';

// Re-export types for SDK consumers
export type {
  MemoryEntry,
  MemoryStats,
  MemoryRelationship,
  ExportFilters,
  ImportOptions,
  ImportResult,
  ExportFormat
};

/**
 * Simple Memory Client Interface
 * 
 * Provides a simplified interface to the MemoryService for easy integration
 * into Node.js applications.
 */
export interface SimpleMemoryClient {
  /**
   * Store a memory with optional tags
   * @param content The content to store
   * @param tags Optional array of tags
   * @returns MD5 hash of the stored memory
   */
  store(content: string, tags?: string[]): string;

  /**
   * Search for memories using text query and/or tags
   * @param query Optional text query for full-text search
   * @param tags Optional tags to filter by
   * @param limit Maximum number of results (default: 10)
   * @param daysAgo Optional: only show memories from last N days
   * @param startDate Optional: filter by start date (ISO string or Date object)
   * @param endDate Optional: filter by end date (ISO string or Date object)
   * @param minRelevance Optional: minimum BM25 relevance score (0-1)
   * @returns Array of matching memory entries
   */
  search(
    query?: string,
    tags?: string[],
    limit?: number,
    daysAgo?: number,
    startDate?: string | Date,
    endDate?: string | Date,
    minRelevance?: number
  ): MemoryEntry[];

  /**
   * Get a memory by its hash
   * @param hash The MD5 hash of the memory
   * @returns The memory entry or null if not found
   */
  getByHash(hash: string): MemoryEntry | null;

  /**
   * Update a memory's content and/or tags
   * @param hash The hash of the memory to update
   * @param newContent The new content
   * @param newTags Optional new tags (replaces existing tags)
   * @returns New hash of the updated memory, or null if not found
   */
  update(hash: string, newContent: string, newTags?: string[]): string | null;

  /**
   * Delete a memory by hash
   * @param hash The hash of the memory to delete
   * @returns true if deleted, false if not found
   */
  delete(hash: string): boolean;

  /**
   * Delete all memories with a specific tag
   * @param tag The tag to delete by
   * @returns Number of memories deleted
   */
  deleteByTag(tag: string): number;

  /**
   * Link two memories with a relationship
   * @param fromHash Hash of the source memory
   * @param toHash Hash of the target memory
   * @param relationshipType Type of relationship (default: 'related')
   * @returns true if successful, false if either memory not found
   */
  linkMemories(fromHash: string, toHash: string, relationshipType?: string): boolean;

  /**
   * Create multiple memory relationships in a single operation
   * @param relationships Array of relationship definitions
   * @returns Number of relationships created
   */
  linkMemoriesBulk(relationships: Array<{
    fromHash: string;
    toHash: string;
    relationshipType?: string;
  }>): number;

  /**
   * Get memories related to a specific memory
   * @param hash Hash of the memory
   * @param limit Maximum number of results (default: 10)
   * @returns Array of related memories
   */
  getRelated(hash: string, limit?: number): MemoryEntry[];

  /**
   * Get statistics about the memory database
   * @returns Database statistics
   */
  stats(): MemoryStats;

  /**
   * Export memories to JSON format
   * @param filters Optional filters for export
   * @returns Export data in JSON format
   */
  exportMemories(filters?: ExportFilters): ExportFormat;

  /**
   * Import memories from JSON data
   * @param jsonData JSON string containing exported memories
   * @param options Import options
   * @returns Import result with counts and errors
   */
  importMemories(jsonData: string, options?: ImportOptions): ImportResult;

  /**
   * Create a manual backup of the database
   * @param label Optional label for the backup
   * @returns Path to the backup file, or null if backup is disabled
   */
  createBackup(label?: string): string | null;

  /**
   * Close the database connection
   * Should be called when done using the client
   */
  close(): void;
}

/**
 * Create a Simple Memory client instance
 * 
 * @param dbPath Path to the SQLite database file (default: './memory.db')
 * @param maxContentSize Maximum size of memory content in bytes (default: 1MB)
 * @returns A SimpleMemoryClient instance
 * 
 * @example
 * ```typescript
 * // Use default database path
 * const client = createMemoryClient();
 * 
 * // Use custom database path
 * const client = createMemoryClient('./my-app/memories.db');
 * 
 * // Store a memory
 * const hash = client.store('Important note', ['work', 'todo']);
 * 
 * // Search for memories
 * const results = client.search('important', ['work']);
 * 
 * // Always close when done
 * client.close();
 * ```
 */
export function createMemoryClient(
  dbPath: string = './memory.db',
  maxContentSize?: number
): SimpleMemoryClient {
  const service = new MemoryService(dbPath, maxContentSize);
  service.initialize();

  return {
    store: (content: string, tags?: string[]) => service.store(content, tags),
    
    search: (
      query?: string,
      tags?: string[],
      limit?: number,
      daysAgo?: number,
      startDate?: string | Date,
      endDate?: string | Date,
      minRelevance?: number
    ) => service.search(
      query,
      tags,
      limit,
      daysAgo,
      typeof startDate === 'string' ? startDate : startDate?.toISOString(),
      typeof endDate === 'string' ? endDate : endDate?.toISOString(),
      minRelevance
    ),
    
    getByHash: (hash: string) => service.getByHash(hash),
    
    update: (hash: string, newContent: string, newTags?: string[]) =>
      service.update(hash, newContent, newTags),
    
    delete: (hash: string) => service.delete(hash),
    
    deleteByTag: (tag: string) => service.deleteByTag(tag),
    
    linkMemories: (fromHash: string, toHash: string, relationshipType?: string) =>
      service.linkMemories(fromHash, toHash, relationshipType),
    
    linkMemoriesBulk: (relationships) => service.linkMemoriesBulk(relationships),
    
    getRelated: (hash: string, limit?: number) => service.getRelated(hash, limit),
    
    stats: () => service.stats(),
    
    exportMemories: (filters?: ExportFilters) => service.exportMemories(filters),
    
    importMemories: (jsonData: string, options?: ImportOptions) =>
      service.importMemories(jsonData, options),
    
    createBackup: (label?: string) => service.createBackup(label),
    
    close: () => service.close()
  };
}

/**
 * Direct access to the MemoryService class for advanced usage
 * 
 * @example
 * ```typescript
 * import { MemoryService } from 'simple-memory-mcp/sdk';
 * 
 * const service = new MemoryService('./my-db.db');
 * service.initialize();
 * // ... use service methods directly
 * service.close();
 * ```
 */
export { MemoryService };
