import Database from 'better-sqlite3';
import { createHash } from 'crypto';
import { hostname } from 'os';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { debugLog, debugLogHash } from '../utils/debug.js';
import { runMigrations } from './migrations.js';
import { DatabaseOptimizer } from './database-optimizer.js';
import { BackupService, BackupConfig } from './backup-service.js';
import { getMCPConfigPaths, type MCPConfigPath } from '../utils/mcp-config.js';
import { getBackupConfig, getConfigPath } from '../utils/config.js';
import type { ExportFilters, ImportOptions, ImportResult, ExportFormat, ExportedMemory } from '../types/tools.js';

// Get package version for export metadata
function getPackageVersion(): string {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const packagePath = join(__dirname, '..', '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
    return packageJson.version || '1.0.0';
  } catch {
    return '1.0.0'; // Fallback version
  }
}

export interface MemoryEntry {
  id: number;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt?: string; // ISO timestamp of last update
  hash: string;
  relevance?: number; // BM25 relevance score (0-1), only present when using text search with minRelevance
}

export interface MemoryRelationship {
  fromMemoryId: number;
  toMemoryId: number;
  relationshipType: string;
  createdAt: string;
}

export interface MemoryStats {
  version: string; // simple-memory-mcp version
  totalMemories: number;
  totalRelationships: number;
  dbSize: number;
  dbPath: string;
  resolvedPath: string;
  schemaVersion: number;
  configPath?: string; // Path to config.json
  backupEnabled?: boolean;
  backupPath?: string;
  backupCount?: number;
  lastBackupAge?: number; // minutes since last backup
  nextBackupIn?: number; // minutes until next backup (-1 if will backup on next write)
  mcpConfigPaths?: MCPConfigPath[]; // MCP configuration file paths with matching server entries
}

/**
 * Memory Service for persistent storage and retrieval of memories with tagging and relationships.
 * Based on SQLite with FTS (Full Text Search) for efficient querying.
 */
export class MemoryService {
  private db: Database.Database | null = null;
  private dbPath: string;
  private resolvedDbPath: string;
  private stmts!: Record<string, Database.Statement>;
  private maxContentSize: number = 1024 * 1024; // 1MB default
  private backup?: BackupService;

  constructor(dbPath: string = 'memory.db', maxContentSize?: number) {
    this.dbPath = dbPath;
    if (maxContentSize) this.maxContentSize = maxContentSize;
    
    // Cache resolved path once
    this.resolvedDbPath = resolve(dbPath);
  }

  initialize(): void {
    try {
      this.db = new Database(this.dbPath);
      this.initDb();
      
      // Configure backup service after db is ready
      const backupConfig = getBackupConfig();
      if (backupConfig.path) {
        this.backup = new BackupService({
          backupPath: backupConfig.path,
          autoBackupInterval: backupConfig.interval,
          maxBackups: backupConfig.keep,
          source: backupConfig.source,
          getBackupData: () => this.exportMemories()
        });
        this.backup.initialize();
      }
      
      debugLog('MemoryService initialized with database:', this.dbPath);
    } catch (error: any) {
      throw new Error(`Failed to initialize database: ${error.message}`);
    }
  }

  private initDb(): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    // Apply SQLite optimizations first
    DatabaseOptimizer.applyOptimizations(this.db);
    
    // Create base tables (if they don't exist)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        created_at TEXT,
        hash TEXT UNIQUE,
        updated_at TEXT,
        access_count INTEGER DEFAULT 0,
        last_accessed TEXT
      )
    `);

    // Create relationships table for linking memories
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS relationships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_memory_id INTEGER,
        to_memory_id INTEGER,
        relationship_type TEXT DEFAULT 'related',
        created_at TEXT,
        FOREIGN KEY (from_memory_id) REFERENCES memories (id) ON DELETE CASCADE,
        FOREIGN KEY (to_memory_id) REFERENCES memories (id) ON DELETE CASCADE,
        UNIQUE(from_memory_id, to_memory_id, relationship_type)
      )
    `);

    // Create normalized tags table for efficient tag queries
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tags (
        memory_id INTEGER NOT NULL,
        tag TEXT NOT NULL,
        FOREIGN KEY (memory_id) REFERENCES memories (id) ON DELETE CASCADE,
        PRIMARY KEY (memory_id, tag)
      )
    `);

    // Create indexes for performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_tags_tag ON tags(tag);
      CREATE INDEX IF NOT EXISTS idx_tags_memory_id ON tags(memory_id);
      CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_memories_hash ON memories(hash);
      CREATE INDEX IF NOT EXISTS idx_relationships_from ON relationships(from_memory_id);
      CREATE INDEX IF NOT EXISTS idx_relationships_to ON relationships(to_memory_id);
      CREATE INDEX IF NOT EXISTS idx_relationships_composite ON relationships(from_memory_id, to_memory_id);
    `);

    // Create FTS table for fast text search (content only, tags in separate table)
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts 
      USING fts5(content, content='memories', content_rowid='id')
    `);

    // Create trigger to automatically update FTS when memories are inserted
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
        INSERT INTO memories_fts (rowid, content) 
        VALUES (new.id, new.content);
      END;
    `);

    // Create trigger to automatically update FTS when memories are updated
    // External content FTS5 tables require the special 'delete' command, not regular DELETE
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN
        INSERT INTO memories_fts(memories_fts, rowid, content) VALUES('delete', old.id, old.content);
        INSERT INTO memories_fts(rowid, content) VALUES(new.id, new.content);
      END;
    `);

    // Create trigger to automatically delete from FTS when memories are deleted
    // External content FTS5 tables require the special 'delete' command, not regular DELETE
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
        INSERT INTO memories_fts(memories_fts, rowid, content) VALUES('delete', old.id, old.content);
      END;
    `);

    // Run migrations (creates tags table, indexes, etc.)
    // This is where all the magic happens - automatic, tracked, safe
    runMigrations(this.db, this.dbPath);
    
    // Prepare statements for better performance (before any usage below)
    this.prepareStatements();

    // Optimize FTS after migrations (only if there are indexed rows)
    // Running optimize on an empty external content FTS5 table can corrupt the index
    const memCount = (this.stmts.getStats.get() as any).count;
    if (memCount > 0) {
      DatabaseOptimizer.optimizeFTS(this.db);
    }

    debugLog('MemoryService: Database initialized successfully');
  }

  private prepareStatements(): void {
    this.stmts = {
      // Memory operations
      insert: this.db!.prepare(`
        INSERT INTO memories (content, created_at, hash) 
        VALUES (?, ?, ?)
      `),
      getMemoryById: this.db!.prepare(`
        SELECT * FROM memories WHERE id = ?
      `),
      getMemoryByHash: this.db!.prepare(`
        SELECT * FROM memories WHERE hash = ?
      `),
      getRecent: this.db!.prepare(`
        SELECT * FROM memories 
        WHERE created_at >= COALESCE(?, created_at)
          AND created_at <= COALESCE(?, created_at)
        ORDER BY created_at DESC
        LIMIT ?
      `),
      deleteByHash: this.db!.prepare(`
        DELETE FROM memories WHERE hash = ?
      `),
      updateMemory: this.db!.prepare(`
        UPDATE memories 
        SET content = ?, hash = ?, updated_at = ?
        WHERE id = ?
      `),
      
      // Tag operations (NEW)
      insertTag: this.db!.prepare(`
        INSERT OR IGNORE INTO tags (memory_id, tag) VALUES (?, ?)
      `),
      getTagsForMemory: this.db!.prepare(`
        SELECT tag FROM tags WHERE memory_id = ? ORDER BY tag
      `),
      deleteTagsForMemory: this.db!.prepare(`
        DELETE FROM tags WHERE memory_id = ?
      `),
      searchByTag: this.db!.prepare(`
        SELECT DISTINCT m.*
        FROM memories m
        INNER JOIN tags t ON m.id = t.memory_id
        WHERE t.tag = ?
          AND m.created_at >= COALESCE(?, m.created_at)
          AND m.created_at <= COALESCE(?, m.created_at)
        ORDER BY m.created_at DESC
        LIMIT ?
      `),
      // Multi-tag intersection search (finds memories matching ALL tags)
      searchByTags: this.db!.prepare(`
        SELECT m.*
        FROM memories m
        INNER JOIN tags t ON m.id = t.memory_id
        WHERE t.tag IN (SELECT value FROM json_each(?))
          AND m.created_at >= COALESCE(?, m.created_at)
          AND m.created_at <= COALESCE(?, m.created_at)
        GROUP BY m.id
        HAVING COUNT(DISTINCT t.tag) = ?
        ORDER BY m.created_at DESC
        LIMIT ?
      `),
      deleteByTag: this.db!.prepare(`
        DELETE FROM memories 
        WHERE id IN (SELECT memory_id FROM tags WHERE tag = ?)
      `),
      
      // FTS search with BM25 ranking and optional date bounds
      searchText: this.db!.prepare(`
        SELECT m.*, bm25(memories_fts) as rank
        FROM memories m
        JOIN memories_fts fts ON m.id = fts.rowid
        WHERE memories_fts MATCH ?
          AND m.created_at >= COALESCE(?, m.created_at)
          AND m.created_at <= COALESCE(?, m.created_at)
        ORDER BY rank, m.created_at DESC
        LIMIT ?
      `),
      
      // Relationship operations
      insertRelationship: this.db!.prepare(`
        INSERT INTO relationships (from_memory_id, to_memory_id, relationship_type, created_at)
        VALUES (?, ?, ?, ?)
      `),
      getRelated: this.db!.prepare(`
        SELECT m.*, r.relationship_type 
        FROM memories m
        JOIN relationships r ON (m.id = r.to_memory_id OR m.id = r.from_memory_id)
        WHERE (r.from_memory_id = ? OR r.to_memory_id = ?) AND m.id != ?
        ORDER BY r.created_at DESC
        LIMIT ?
      `),
      
      // Batch tag hydration (single query for N memory IDs via json_each)
      getTagsForMemoryIds: this.db!.prepare(`
        SELECT memory_id, tag FROM tags
        WHERE memory_id IN (SELECT value FROM json_each(?))
        ORDER BY tag
      `),
      
      // Hash corruption fallback queries (intentionally bypass index with +hash)
      getMemoryByHashFullScan: this.db!.prepare(`
        SELECT * FROM memories WHERE +hash = ?
      `),
      deleteById: this.db!.prepare(`
        DELETE FROM memories WHERE id = ?
      `),
      
      // Export/import relationship queries
      getRelationshipsForExport: this.db!.prepare(`
        SELECT 
          r.to_memory_id as relatedMemoryId,
          r.relationship_type as relationshipType,
          m.hash as relatedMemoryHash
        FROM relationships r
        JOIN memories m ON m.id = r.to_memory_id
        WHERE r.from_memory_id = ?
      `),
      insertRelationshipIgnore: this.db!.prepare(`
        INSERT OR IGNORE INTO relationships (from_memory_id, to_memory_id, relationship_type, created_at)
        VALUES (?, ?, ?, ?)
      `),
      
      // Stats
      getStats: this.db!.prepare(`
        SELECT COUNT(*) as count FROM memories
      `),
      getRelationshipStats: this.db!.prepare(`
        SELECT COUNT(*) as count FROM relationships
      `),
      getSchemaVersion: this.db!.prepare(`
        SELECT MAX(version) as version FROM schema_migrations
      `),
      
      // Access tracking
      incrementAccess: this.db!.prepare(`
        UPDATE memories SET access_count = COALESCE(access_count, 0) + 1, last_accessed = ? WHERE id = ?
      `)
    };
  }

  /**
   * Store a memory with optional tags
   */
  store(content: string, tags: string[] = []): string {
    // Validate content
    if (!content || content.trim().length === 0) {
      throw new Error('Content cannot be empty');
    }
    
    // Validate content size
    if (content.length > this.maxContentSize) {
      throw new Error(`Content exceeds maximum size of ${this.maxContentSize} characters`);
    }

    const hash = createHash('md5').update(content).digest('hex');
    const createdAt = new Date().toISOString();

    try {
      if (!this.db) {
        throw new Error('Database not initialized');
      }
      
      // Use transaction for atomicity and performance
      const insertMemory = this.db.transaction(() => {
        // Insert memory (tags stored in normalized 'tags' table since v2.0)
        const result = this.stmts.insert.run(content, createdAt, hash);
        const memoryId = result.lastInsertRowid as number;
        
        // Insert tags into normalized tags table
        for (const tag of tags) {
          const normalizedTag = tag.trim().toLowerCase();
          if (normalizedTag) {
            this.stmts.insertTag.run(memoryId, normalizedTag);
          }
        }
        
        return hash;
      });
      
      const resultHash = insertMemory();
      debugLogHash('MemoryService: Stored memory with hash:', hash);
      
      // Backup if needed (lazy, throttled)
      this.backup?.backupIfNeeded();
      
      return resultHash;
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        debugLogHash('MemoryService: Memory already exists with hash:', hash);
        
        // Merge new tags into existing memory
        if (tags.length > 0) {
          const existing = this.stmts.getMemoryByHash.get(hash) as any;
          if (existing) {
            for (const tag of tags) {
              const normalizedTag = tag.trim().toLowerCase();
              if (normalizedTag) {
                this.stmts.insertTag.run(existing.id, normalizedTag); // INSERT OR IGNORE
              }
            }
            debugLog('MemoryService: Merged tags into existing memory');
          }
        }
        
        return hash;
      }
      debugLog('MemoryService: Error storing memory:', error);
      throw error;
    }
  }

  /**
   * Batch-fetch tags for multiple memory IDs in a single query (fixes N+1)
   * Uses the prepared getTagsForMemoryIds statement with json_each
   */
  private getTagsForMemories(ids: number[]): Map<number, string[]> {
    if (ids.length === 0) return new Map();

    const tagMap = new Map<number, string[]>();
    for (const id of ids) {
      tagMap.set(id, []);
    }

    const rows = this.stmts.getTagsForMemoryIds.all(
      JSON.stringify(ids)
    ) as Array<{ memory_id: number; tag: string }>;

    for (const row of rows) {
      tagMap.get(row.memory_id)!.push(row.tag);
    }

    return tagMap;
  }

  /**
   * Search memories by content or tags
   * - Date filtering pushed into SQL (not post-fetch JavaScript)
   * - Multi-tag search uses intersection (AND) logic
   * - Batch tag hydration eliminates N+1 queries
   */
  search(
    query?: string, 
    tags?: string[], 
    limit: number = 10,
    daysAgo?: number,
    startDate?: string,
    endDate?: string,
    minRelevance?: number
  ): MemoryEntry[] {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Calculate date boundaries as ISO strings for SQL filtering
    let minDateStr: string | undefined;
    let maxDateStr: string | undefined;
    
    if (daysAgo !== undefined && daysAgo >= 0) {
      const now = new Date();
      const minDate = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - daysAgo,
        0, 0, 0, 0
      ));
      minDateStr = minDate.toISOString();
    }
    
    if (startDate) {
      const parsed = new Date(startDate);
      if (!isNaN(parsed.getTime())) {
        minDateStr = parsed.toISOString();
      }
    }
    
    if (endDate) {
      const parsed = new Date(endDate);
      if (!isNaN(parsed.getTime())) {
        if (endDate.length === 10) { // YYYY-MM-DD format
          parsed.setHours(23, 59, 59, 999);
        }
        maxDateStr = parsed.toISOString();
      }
    }

    let results: any[];

    if (query) {
      // Tokenize query into words and join with OR for flexible matching
      const words = query
        .split(/\s+/)
        .map(word => word.trim())
        .filter(word => word.length > 0)
        .map(word => `"${word.replace(/"/g, '""')}"`);
      
      const escapedQuery = words.length > 0 ? words.join(' OR ') : query.replace(/"/g, '""');
      
      // Fetch more if we need to post-filter by tags or relevance
      const fetchLimit = (tags && tags.length > 0) || minRelevance !== undefined ? limit * 5 : limit;
      
      let ftsResults = this.stmts.searchText.all(
        escapedQuery, minDateStr ?? null, maxDateStr ?? null, fetchLimit
      ) as any[];
      
      // Normalize BM25 scores to 0-1 range, then apply temporal decay + access boost
      if (ftsResults.length > 0) {
        const scores = ftsResults.map(r => Math.abs(r.rank));
        const maxScore = Math.max(...scores);
        const minScore = Math.min(...scores);
        const range = maxScore - minScore || 1;
        
        const now = Date.now();
        // Half-life of 90 days: memories lose 50% recency boost after 90 days
        const DECAY_LAMBDA = Math.LN2 / 90;
        const DECAY_WEIGHT = 0.2;   // recency is 20% of final score
        const ACCESS_WEIGHT = 0.1;  // access frequency is 10% of final score
        
        ftsResults = ftsResults.map((row: any) => {
          // BM25 normalized (0-1)
          const bm25 = 1 - ((Math.abs(row.rank) - minScore) / range);
          
          // Temporal decay: exponential decay based on age
          const timestamp = row.updated_at || row.created_at;
          const ageDays = Math.max(0, (now - new Date(timestamp).getTime()) / 86_400_000);
          const recency = Math.exp(-DECAY_LAMBDA * ageDays);
          
          // Access boost: diminishing returns via log
          const accessBoost = Math.log1p(row.access_count || 0) / Math.log1p(100); // normalized ~0-1
          
          // Weighted combination: BM25 dominates, recency and access are tiebreakers
          row.relevance = (1 - DECAY_WEIGHT - ACCESS_WEIGHT) * bm25
                        + DECAY_WEIGHT * recency
                        + ACCESS_WEIGHT * Math.min(1, accessBoost);
          return row;
        });
        
        // Re-sort by combined relevance score (descending)
        ftsResults.sort((a: any, b: any) => b.relevance - a.relevance);
        
        if (minRelevance !== undefined) {
          ftsResults = ftsResults.filter((row: any) => row.relevance >= minRelevance);
        }
      }
      
      results = ftsResults;
    } else if (tags && tags.length > 0) {
      // Multi-tag intersection search — finds memories matching ALL tags
      const normalizedTags = tags.map(t => t.trim().toLowerCase()).filter(t => t);
      
      if (normalizedTags.length === 1) {
        // Optimized single-tag path
        results = this.stmts.searchByTag.all(
          normalizedTags[0], minDateStr ?? null, maxDateStr ?? null, limit
        ) as any[];
      } else {
        // Multi-tag intersection via json_each
        results = this.stmts.searchByTags.all(
          JSON.stringify(normalizedTags), minDateStr ?? null, maxDateStr ?? null,
          normalizedTags.length, limit
        ) as any[];
      }
    } else {
      // Get recent memories (date bounds handled by COALESCE in prepared stmt)
      results = this.stmts.getRecent.all(
        minDateStr ?? null, maxDateStr ?? null, limit
      ) as any[];
    }

    // Batch tag hydration — single query instead of N+1
    const ids = results.map(r => r.id);
    const tagMap = this.getTagsForMemories(ids);

    // If FTS search + tag filter, apply tag intersection post-hydration
    if (query && tags && tags.length > 0) {
      const normalizedFilterTags = tags.map(t => t.trim().toLowerCase());
      results = results.filter(row => {
        const memTags = tagMap.get(row.id) || [];
        return normalizedFilterTags.every(ft => memTags.includes(ft));
      });
      results = results.slice(0, limit);
    }

    // Convert to MemoryEntry format
    const memories = results.map(row => ({
      id: row.id,
      content: row.content,
      tags: tagMap.get(row.id) || [],
      createdAt: row.created_at,
      ...(row.updated_at && { updatedAt: row.updated_at }),
      hash: row.hash,
      ...(row.relevance !== undefined && { relevance: row.relevance })
    }));

    debugLog('MemoryService: Search returned', memories.length, 'results');
    return memories;
  }

  /**
   * Delete a memory by hash
   */
  delete(hash: string): boolean {
    const result = this.stmts.deleteByHash.run(hash);
    let deleted = result.changes > 0;
    
    // Fallback: If hash lookup failed, force full table scan (bypasses corrupted index)
    // The +hash prefix tells SQLite to not use the index on hash column
    if (!deleted && this.db) {
      debugLogHash('MemoryService: Hash lookup failed, trying fallback full table scan for:', hash);
      const orphaned = this.stmts.getMemoryByHashFullScan.get(hash) as any;
      
      if (orphaned) {
        // DIAGNOSTIC: This indicates hash index corruption - log details for investigation
        console.error('⚠️  HASH INDEX CORRUPTION DETECTED ⚠️');
        console.error('Hash:', hash);
        console.error('Memory ID:', orphaned.id);
        console.error('This suggests index corruption occurred during a previous operation.');
        console.error('Please report this with the hash and operation that preceded it.');
        
        debugLog('MemoryService: Found orphaned memory with corrupted hash index, deleting by ID:', orphaned.id);
        const fallbackResult = this.stmts.deleteById.run(orphaned.id);
        deleted = fallbackResult.changes > 0;
      }
    }
    
    debugLogHash('MemoryService: Delete by hash', hash, deleted ? 'success' : 'not found');
    
    // Backup if needed (lazy, throttled)
    if (deleted) this.backup?.backupIfNeeded();
    
    return deleted;
  }

  /**
   * Delete memories by tag
   */
  deleteByTag(tag: string): number {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    const normalizedTag = tag.trim().toLowerCase();
    const result = this.stmts.deleteByTag.run(normalizedTag);
    
    debugLog('MemoryService: Deleted', result.changes, 'memories with tag:', normalizedTag);
    
    // Backup if needed (lazy, throttled)
    if (result.changes > 0) this.backup?.backupIfNeeded();
    
    return result.changes;
  }

  /**
   * Bulk link memories in a single transaction for performance
   * Returns the number of relationships successfully created
   */
  linkMemoriesBulk(relationships: Array<{ fromHash: string; toHash: string; relationshipType?: string }>): number {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    if (relationships.length === 0) {
      return 0;
    }

    const insertBulk = this.db.transaction(() => {
      let count = 0;
      const createdAt = new Date().toISOString();
      
      for (const rel of relationships) {
        const fromMemory = this.stmts.getMemoryByHash.get(rel.fromHash) as any;
        const toMemory = this.stmts.getMemoryByHash.get(rel.toHash) as any;
        
        if (!fromMemory || !toMemory) continue;
        
        try {
          this.stmts.insertRelationship.run(
            fromMemory.id,
            toMemory.id,
            rel.relationshipType || 'related',
            createdAt
          );
          count++;
        } catch (error: any) {
          if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            // Skip duplicates silently
            continue;
          }
          throw error;
        }
      }
      
      return count;
    });

    const created = insertBulk();
    debugLog('MemoryService: Bulk linked', created, 'relationships');
    return created;
  }

  /**
   * Link two memories with a relationship
   */
  linkMemories(fromHash: string, toHash: string, relationshipType: string = 'related'): boolean {
    const fromMemory = this.stmts.getMemoryByHash.get(fromHash) as any;
    const toMemory = this.stmts.getMemoryByHash.get(toHash) as any;
    
    if (!fromMemory || !toMemory) {
      throw new Error('One or both memories not found');
    }
    
    const createdAt = new Date().toISOString();
    
    try {
      this.stmts.insertRelationship.run(
        fromMemory.id, 
        toMemory.id, 
        relationshipType, 
        createdAt
      );
      debugLogHash('MemoryService: Linked memories:', fromHash, 'to', toHash);
      return true;
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        debugLog('MemoryService: Relationship already exists');
        return false; // Relationship already exists
      }
      throw error;
    }
  }

  /**
   * Get memories related to a specific memory
   */
  getRelated(hash: string, limit: number = 10): MemoryEntry[] {
    const memory = this.stmts.getMemoryByHash.get(hash) as any;
    if (!memory) {
      debugLogHash('MemoryService: Memory not found for getRelated:', hash);
      return [];
    }

    const results = this.stmts.getRelated.all(memory.id, memory.id, memory.id, limit) as any[];
    
    // Batch tag hydration instead of N+1
    const ids = results.map(r => r.id);
    const tagMap = this.getTagsForMemories(ids);
    
    const related = results.map((row: any) => ({
      id: row.id,
      content: row.content,
      tags: tagMap.get(row.id) || [],
      createdAt: row.created_at,
      ...(row.updated_at && { updatedAt: row.updated_at }),
      hash: row.hash,
      relationshipType: row.relationship_type
    }));

    debugLog('MemoryService: Found', related.length, 'related memories');
    return related;
  }

  /**
   * Get statistics about the memory database
   */
  stats(): MemoryStats {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    const memoryCount = this.stmts.getStats.get() as any;
    const relationshipCount = this.stmts.getRelationshipStats.get() as any;
    
    // Get current schema version from migrations table
    const versionResult = this.stmts.getSchemaVersion.get() as any;
    const schemaVersion = versionResult?.version || 0;
    
    // Get backup config from unified config system
    const backupConfig = getBackupConfig();
    
    const stats: MemoryStats = {
      version: getPackageVersion(),
      totalMemories: memoryCount.count,
      totalRelationships: relationshipCount.count,
      dbSize: (this.db.pragma('page_size', { simple: true }) as number) * 
              (this.db.pragma('page_count', { simple: true }) as number),
      dbPath: this.dbPath,
      resolvedPath: this.resolvedDbPath.replace(/\\/g, '/'), // Normalize to forward slashes
      schemaVersion,
      configPath: getConfigPath().replace(/\\/g, '/'), // Path to config.json
    };
    
    // Add backup information if backup service is configured
    if (this.backup) {
      const lastBackupAge = this.backup.getTimeSinceLastBackup();
      const backupInterval = backupConfig.interval;
      
      stats.backupEnabled = true;
      stats.backupPath = backupConfig.path;
      stats.backupCount = this.backup.getBackupCount();
      stats.lastBackupAge = lastBackupAge >= 0 ? lastBackupAge : undefined;
      
      // Calculate next backup time
      if (backupInterval > 0 && lastBackupAge >= 0) {
        const nextBackup = backupInterval - lastBackupAge;
        stats.nextBackupIn = nextBackup > 0 ? nextBackup : -1; // -1 means will backup on next write
      } else if (backupInterval === 0) {
        stats.nextBackupIn = -1; // Will backup on every write
      }
    }

    // Add MCP configuration file paths (only existing ones)
    stats.mcpConfigPaths = getMCPConfigPaths().filter(p => p.exists);

    debugLog('MemoryService: Stats:', stats);
    return stats;
  }

  /**
   * Update an existing memory by hash
   * @param hash The hash of the memory to update
   * @param newContent The new content for the memory
   * @param newTags Optional new tags (if provided, replaces all existing tags)
   * @returns The new hash if successful, null if memory not found
   */
  update(hash: string, newContent: string, newTags?: string[]): string | null {
    // Validate content size
    if (newContent.length > this.maxContentSize) {
      throw new Error(`Content exceeds maximum size of ${this.maxContentSize} characters`);
    }

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Find the existing memory
    let existing = this.stmts.getMemoryByHash.get(hash) as any;
    
    // Fallback: If hash lookup failed, force full table scan (bypasses corrupted index)
    // The +hash prefix tells SQLite to not use the index on hash column
    if (!existing) {
      debugLogHash('MemoryService: Hash lookup failed, trying fallback full table scan for:', hash);
      existing = this.stmts.getMemoryByHashFullScan.get(hash) as any;
      
      if (existing) {
        // DIAGNOSTIC: This indicates hash index corruption - log details for investigation
        console.error('⚠️  HASH INDEX CORRUPTION DETECTED ⚠️');
        console.error('Hash:', hash);
        console.error('Memory ID:', existing.id);
        console.error('Operation: UPDATE');
        console.error('This suggests index corruption occurred during a previous operation.');
        console.error('Please report this with the hash and operation that preceded it.');
        
        debugLog('MemoryService: Found orphaned memory with corrupted hash index, ID:', existing.id);
      }
    }
    
    if (!existing) {
      debugLogHash('MemoryService: Memory not found for update:', hash);
      return null;
    }

    // Calculate new hash
    const newHash = createHash('md5').update(newContent).digest('hex');

    try {
      // Use transaction for atomicity
      const updateMemory = this.db.transaction(() => {
        // Update memory content and timestamp (FTS will be updated automatically by trigger)
        const updatedAt = new Date().toISOString();
        this.stmts.updateMemory.run(newContent, newHash, updatedAt, existing.id);

        // Update tags if provided
        if (newTags !== undefined) {
          // Delete old tags
          this.stmts.deleteTagsForMemory.run(existing.id);

          // Insert new tags
          for (const tag of newTags) {
            const normalizedTag = tag.trim().toLowerCase();
            if (normalizedTag) {
              this.stmts.insertTag.run(existing.id, normalizedTag);
            }
          }
        }

        return newHash;
      });

      const resultHash = updateMemory();
      debugLogHash('MemoryService: Updated memory from hash:', hash, 'to new hash:', resultHash);

      // Backup if needed (lazy, throttled)
      this.backup?.backupIfNeeded();

      return resultHash;
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error(`Cannot update: a memory with the new content already exists (hash: ${newHash})`);
      }
      debugLog('MemoryService: Error updating memory:', error);
      throw error;
    }
  }

  /**
   * Get memory by hash (and track access)
   */
  getByHash(hash: string): MemoryEntry | null {
    const result = this.stmts.getMemoryByHash.get(hash) as any;
    if (!result) {
      return null;
    }

    // Track access
    this.stmts.incrementAccess.run(new Date().toISOString(), result.id);

    // Hydrate with tags from tags table
    const tagRows = this.stmts.getTagsForMemory.all(result.id) as Array<{ tag: string }>;

    return {
      id: result.id,
      content: result.content,
      tags: tagRows.map(t => t.tag),
      createdAt: result.created_at,
      ...(result.updated_at && { updatedAt: result.updated_at }),
      hash: result.hash
    };
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      debugLog('MemoryService: Database connection closed');
    }
  }

  /**
   * Create a manual backup
   */
  createBackup(label: string = 'manual'): string | null {
    return this.backup?.backup(label) || null;
  }

  /**
   * Export memories to JSON format with optional filtering
   */
  exportMemories(filters?: ExportFilters): ExportFormat {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    let memories: MemoryEntry[];

    // If hashes are provided, fetch those specific memories
    if (filters?.hashes && filters.hashes.length > 0) {
      memories = [];
      for (const hash of filters.hashes) {
        const memory = this.getByHash(hash);
        if (memory) {
          memories.push(memory);
        }
      }
    } else {
      // Use existing search method to get memories
      // Pass undefined for query to use tag search (if tags provided) or recent search (if no filters)
      memories = this.search(
        undefined, // query - let search decide based on tags
        filters?.tags,
        filters?.limit || 1000, // default high limit for export
        undefined, // daysAgo
        filters?.startDate?.toISOString(),
        filters?.endDate?.toISOString()
      );
    }
    
    // Get relationships for each memory
    const exportedMemories: ExportedMemory[] = memories.map((memory: MemoryEntry) => {
      const relationships = this.getMemoryRelationships(memory.id);
      
      return {
        id: memory.id,
        content: memory.content,
        tags: memory.tags,
        createdAt: memory.createdAt,
        hash: memory.hash,
        relationships: relationships.length > 0 ? relationships.map(rel => ({
          relatedMemoryHash: rel.relatedMemoryHash,
          relatedMemoryId: rel.relatedMemoryId,
          relationshipType: rel.relationshipType
        })) : undefined
      };
    });

    return {
      exportedAt: new Date().toISOString(),
      exportVersion: getPackageVersion(),
      source: hostname(),
      totalMemories: exportedMemories.length,
      memories: exportedMemories
    };
  }

  /**
   * Import memories from JSON format
   */
  importMemories(jsonData: string, options?: ImportOptions): ImportResult {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const result: ImportResult = {
      imported: 0,
      skipped: 0,
      errors: []
    };

    let exportData: ExportFormat;
    try {
      exportData = JSON.parse(jsonData);
    } catch (error: any) {
      throw new Error(`Invalid JSON format: ${error.message}`);
    }

    // Validate export format
    if (!exportData.memories || !Array.isArray(exportData.memories)) {
      throw new Error('Invalid export format: missing memories array');
    }

    debugLog(`Importing ${exportData.totalMemories} memories from export version ${exportData.exportVersion}`);

    for (const memory of exportData.memories) {
      try {
        // Check for duplicates by hash
        if (options?.skipDuplicates) {
          const existing = this.getMemoryByHash(memory.hash);
          if (existing) {
            result.skipped++;
            debugLog(`Skipped duplicate memory: ${memory.hash}`);
            continue;
          }
        }

        // Store memory (without relationships for now)
        const stored = this.store(
          memory.content,
          memory.tags
        );

        if (stored) {
          result.imported++;
          debugLog(`Imported memory: ${stored}`);
        }
      } catch (error: any) {
        result.errors.push({
          memory: memory,
          error: error.message
        });
        debugLog(`Error importing memory ${memory.hash}: ${error.message}`);
      }
    }

    // Second pass: restore relationships
    if (result.imported > 0) {
      this.restoreRelationships(exportData.memories);
    }

    debugLog(`Import complete: ${result.imported} imported, ${result.skipped} skipped, ${result.errors.length} errors`);
    
    // Trigger backup after import if enabled
    if (this.backup && result.imported > 0) {
      this.backup.backupIfNeeded();
    }

    return result;
  }

  /**
   * Get relationships for a memory
   */
  private getMemoryRelationships(memoryId: number): Array<{
    relatedMemoryHash: string;
    relatedMemoryId: number;
    relationshipType: string;
  }> {
    if (!this.db) return [];

    const relationships = this.stmts.getRelationshipsForExport.all(memoryId) as any[];
    
    return relationships.map(rel => ({
      relatedMemoryHash: rel.relatedMemoryHash,
      relatedMemoryId: rel.relatedMemoryId,
      relationshipType: rel.relationshipType
    }));
  }

  /**
   * Restore relationships after importing memories
   */
  private restoreRelationships(memories: ExportedMemory[]): void {
    if (!this.db) return;

    let restoredCount = 0;

    for (const memory of memories) {
      if (!memory.relationships || memory.relationships.length === 0) continue;

      // Find the imported memory by hash
      const fromMemory = this.getMemoryByHash(memory.hash);
      if (!fromMemory) continue;

      for (const rel of memory.relationships) {
        // Find the related memory by hash
        const toMemory = this.getMemoryByHash(rel.relatedMemoryHash);
        if (!toMemory) continue;

        try {
          const info = this.stmts.insertRelationshipIgnore.run(
            fromMemory.id, toMemory.id, rel.relationshipType, new Date().toISOString()
          );
          if (info.changes > 0) {
            restoredCount++;
          }
        } catch (error: any) {
          debugLog(`Warning: Could not restore relationship: ${error.message}`);
        }
      }
    }

    if (restoredCount > 0) {
      debugLog(`Restored ${restoredCount} relationships`);
    }
  }

  /**
   * Get a memory by its hash (uses prepared statement, not a new one each call)
   */
  private getMemoryByHash(hash: string): MemoryEntry | null {
    if (!this.db) return null;

    const result = this.stmts.getMemoryByHash.get(hash) as any;
    if (!result) return null;

    const tagRows = this.stmts.getTagsForMemory.all(result.id) as Array<{ tag: string }>;

    return {
      id: result.id,
      content: result.content,
      tags: tagRows.map(t => t.tag),
      createdAt: result.created_at,
      ...(result.updated_at && { updatedAt: result.updated_at }),
      hash: result.hash
    };
  }
}