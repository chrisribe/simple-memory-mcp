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
  hash: string;
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
  backupEnabled?: boolean;
  backupPath?: string;
  backupCount?: number;
  lastBackupAge?: number; // minutes since last backup
  nextBackupIn?: number; // minutes until next backup (-1 if will backup on next write)
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
    
    // Auto-configure backup if env vars are set
    const backupPath = process.env.MEMORY_BACKUP_PATH;
    if (backupPath) {
      this.backup = new BackupService(dbPath, {
        backupPath,
        autoBackupInterval: parseInt(process.env.MEMORY_BACKUP_INTERVAL || '0', 10),
        maxBackups: parseInt(process.env.MEMORY_BACKUP_KEEP || '10', 10)
      });
    }
  }

  initialize(): void {
    try {
      this.db = new Database(this.dbPath);
      this.initDb();
      
      // Create initial backup if configured (MCP server only)
      if (this.backup) {
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
        tags TEXT,
        created_at TEXT,
        hash TEXT UNIQUE
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
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN
        UPDATE memories_fts SET content = new.content 
        WHERE rowid = new.id;
      END;
    `);

    // Create trigger to automatically delete from FTS when memories are deleted
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
        DELETE FROM memories_fts WHERE rowid = old.id;
      END;
    `);

    // Run migrations (creates tags table, indexes, etc.)
    // This is where all the magic happens - automatic, tracked, safe
    runMigrations(this.db, this.dbPath);
    
    // Optimize FTS after migrations
    DatabaseOptimizer.optimizeFTS(this.db);

    // Prepare statements for better performance
    this.prepareStatements();

    debugLog('MemoryService: Database initialized successfully');
  }

  private prepareStatements(): void {
    this.stmts = {
      // Memory operations
      insert: this.db!.prepare(`
        INSERT INTO memories (content, tags, created_at, hash) 
        VALUES (?, ?, ?, ?)
      `),
      getMemoryById: this.db!.prepare(`
        SELECT * FROM memories WHERE id = ?
      `),
      getMemoryByHash: this.db!.prepare(`
        SELECT * FROM memories WHERE hash = ?
      `),
      getRecent: this.db!.prepare(`
        SELECT * FROM memories 
        ORDER BY created_at DESC
        LIMIT ?
      `),
      deleteByHash: this.db!.prepare(`
        DELETE FROM memories WHERE hash = ?
      `),
      
      // Tag operations (NEW)
      insertTag: this.db!.prepare(`
        INSERT OR IGNORE INTO tags (memory_id, tag) VALUES (?, ?)
      `),
      getTagsForMemory: this.db!.prepare(`
        SELECT tag FROM tags WHERE memory_id = ? ORDER BY tag
      `),
      searchByTag: this.db!.prepare(`
        SELECT DISTINCT m.*
        FROM memories m
        INNER JOIN tags t ON m.id = t.memory_id
        WHERE t.tag = ?
        ORDER BY m.created_at DESC
        LIMIT ?
      `),
      deleteByTag: this.db!.prepare(`
        DELETE FROM memories 
        WHERE id IN (SELECT memory_id FROM tags WHERE tag = ?)
      `),
      
      // FTS search with BM25 ranking for relevance scoring
      searchText: this.db!.prepare(`
        SELECT m.*, bm25(memories_fts) as rank
        FROM memories m
        JOIN memories_fts fts ON m.id = fts.rowid
        WHERE memories_fts MATCH ?
        ORDER BY rank, m.created_at DESC
        LIMIT ?
      `),
      
      // Legacy tag search (fallback for old databases before migration)
      searchTagsLegacy: this.db!.prepare(`
        SELECT * FROM memories 
        WHERE tags LIKE ?
        ORDER BY created_at DESC
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
      
      // Stats
      getStats: this.db!.prepare(`
        SELECT COUNT(*) as count FROM memories
      `),
      getRelationshipStats: this.db!.prepare(`
        SELECT COUNT(*) as count FROM relationships
      `)
    };
  }

  /**
   * Store a memory with optional tags
   */
  store(content: string, tags: string[] = []): string {
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
        // Insert memory with tags=null (legacy column deprecated in v2.0)
        // Tags are now stored in normalized 'tags' table for performance
        // The 'tags' column is kept NULL for backward compatibility with schema
        const result = this.stmts.insert.run(content, /* tags */ null, createdAt, hash);
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
        return hash; // Already exists
      }
      debugLog('MemoryService: Error storing memory:', error);
      throw error;
    }
  }

  /**
   * Search memories by content or tags
   */
  search(
    query?: string, 
    tags?: string[], 
    limit: number = 10,
    daysAgo?: number,
    startDate?: string,
    endDate?: string
  ): MemoryEntry[] {
    let results: any[];

    // Calculate date boundaries for filtering
    let minDate: Date | undefined;
    let maxDate: Date | undefined;
    
    if (daysAgo !== undefined && daysAgo >= 0) {
      // Convert daysAgo to a start date (N days ago from now)
      minDate = new Date();
      minDate.setDate(minDate.getDate() - daysAgo);
      minDate.setHours(0, 0, 0, 0); // Start of day
    }
    
    if (startDate) {
      // Parse start date (supports both YYYY-MM-DD and full ISO strings)
      const parsed = new Date(startDate);
      if (!isNaN(parsed.getTime())) {
        minDate = parsed;
      }
    }
    
    if (endDate) {
      // Parse end date (supports both YYYY-MM-DD and full ISO strings)
      const parsed = new Date(endDate);
      if (!isNaN(parsed.getTime())) {
        maxDate = parsed;
        // Set to end of day if only date provided (no time component)
        if (endDate.length === 10) { // YYYY-MM-DD format
          maxDate.setHours(23, 59, 59, 999);
        }
      }
    }

    if (query) {
      // Use FTS for text search
      let ftsResults: any[];
      // Tokenize query into words and join with OR for flexible matching
      // This allows: "git reset" to match memories with either "git" OR "reset"
      const words = query
        .split(/\s+/)
        .map(word => word.trim())
        .filter(word => word.length > 0)
        .map(word => `"${word.replace(/"/g, '""')}"`); // Quote each word for exact word matching
      
      const escapedQuery = words.length > 0 ? words.join(' OR ') : query.replace(/"/g, '""');
      ftsResults = this.stmts.searchText.all(escapedQuery, limit * 2); // Fetch more to allow for filtering
      
      // Hydrate with tags from tags table
      results = ftsResults.map((row: any) => {
        const tagRows = this.stmts.getTagsForMemory.all(row.id) as Array<{ tag: string }>;
        return {
          ...row,
          tags: tagRows.map(t => t.tag)
        };
      });
    } else if (tags && tags.length > 0) {
      // Fast indexed tag search using normalized tags table
      const normalizedTag = tags[0].trim().toLowerCase();
      const tagResults = this.stmts.searchByTag.all(normalizedTag, limit * 2); // Fetch more to allow for filtering
      
      // Hydrate with all tags for each memory
      results = tagResults.map((row: any) => {
        const tagRows = this.stmts.getTagsForMemory.all(row.id) as Array<{ tag: string }>;
        return {
          ...row,
          tags: tagRows.map(t => t.tag)
        };
      });
    } else {
      // Get recent memories
      const recentResults = this.stmts.getRecent.all(limit * 2); // Fetch more to allow for filtering
      
      // Hydrate with tags
      results = recentResults.map((row: any) => {
        const tagRows = this.stmts.getTagsForMemory.all(row.id) as Array<{ tag: string }>;
        return {
          ...row,
          tags: tagRows.map(t => t.tag)
        };
      });
    }

    // Apply date filtering if needed
    if (minDate || maxDate) {
      results = results.filter((row: any) => {
        const createdAt = new Date(row.created_at);
        if (minDate && createdAt < minDate) return false;
        if (maxDate && createdAt > maxDate) return false;
        return true;
      });
    }

    // Apply limit after filtering
    results = results.slice(0, limit);

    // Convert to MemoryEntry format
    const memories = results.map(row => ({
      id: row.id,
      content: row.content,
      tags: row.tags || [],
      createdAt: row.created_at,
      hash: row.hash
    }));

    debugLog('MemoryService: Search returned', memories.length, 'results');
    return memories;
  }

  /**
   * Delete a memory by hash
   */
  delete(hash: string): boolean {
    const result = this.stmts.deleteByHash.run(hash);
    const deleted = result.changes > 0;
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
   * Update a memory's content and/or tags by hash
   */
  update(hash: string, content?: string, tags?: string[]): boolean {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Validate that at least one field is being updated
    if (content === undefined && tags === undefined) {
      throw new Error('Must provide either content or tags to update');
    }

    // Validate content size if provided
    if (content !== undefined && content.length > this.maxContentSize) {
      throw new Error(`Content exceeds maximum size of ${this.maxContentSize} characters`);
    }

    // Check if memory exists
    const existing = this.stmts.getMemoryByHash.get(hash) as any;
    if (!existing) {
      return false;
    }

    try {
      // Prepare statements outside transaction
      const updateContentStmt = content !== undefined ? 
        this.db!.prepare(`UPDATE memories SET content = ? WHERE hash = ?`) : null;
      
      const deleteTagsStmt = tags !== undefined ?
        this.db!.prepare(`DELETE FROM tags WHERE memory_id = ?`) : null;

      const updateMemory = this.db.transaction(() => {
        // Update content if provided
        if (content !== undefined && updateContentStmt) {
          updateContentStmt.run(content, hash);
        }

        // Update tags if provided
        if (tags !== undefined && deleteTagsStmt) {
          // Delete existing tags for this memory
          deleteTagsStmt.run(existing.id);

          // Insert new tags
          for (const tag of tags) {
            const normalizedTag = tag.trim().toLowerCase();
            if (normalizedTag) {
              this.stmts.insertTag.run(existing.id, normalizedTag);
            }
          }
        }

        return true;
      });

      const updated = updateMemory();
      debugLogHash('MemoryService: Updated memory with hash:', hash);
      
      // Backup if needed (lazy, throttled)
      this.backup?.backupIfNeeded();
      
      return updated;
    } catch (error: any) {
      debugLog('MemoryService: Error updating memory:', error);
      throw error;
    }
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
    
    const related = results.map((row: any) => ({
      id: row.id,
      content: row.content,
      tags: row.tags ? row.tags.split(',') : [],
      createdAt: row.created_at,
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
    const versionResult = this.db.prepare(
      'SELECT MAX(version) as version FROM schema_migrations'
    ).get() as any;
    const schemaVersion = versionResult?.version || 0;
    
    const stats: MemoryStats = {
      version: getPackageVersion(),
      totalMemories: memoryCount.count,
      totalRelationships: relationshipCount.count,
      dbSize: (this.db.pragma('page_size', { simple: true }) as number) * 
              (this.db.pragma('page_count', { simple: true }) as number),
      dbPath: this.dbPath,
      resolvedPath: this.resolvedDbPath, // Use cached value
      schemaVersion
    };
    
    // Add backup information if backup service is configured
    if (this.backup) {
      const backups = this.backup.listBackups();
      const lastBackupAge = this.backup.getTimeSinceLastBackup();
      const backupInterval = parseInt(process.env.MEMORY_BACKUP_INTERVAL || '0', 10);
      
      stats.backupEnabled = true;
      stats.backupPath = process.env.MEMORY_BACKUP_PATH;
      stats.backupCount = backups.length;
      stats.lastBackupAge = lastBackupAge >= 0 ? lastBackupAge : undefined;
      
      // Calculate next backup time
      if (backupInterval > 0 && lastBackupAge >= 0) {
        const nextBackup = backupInterval - lastBackupAge;
        stats.nextBackupIn = nextBackup > 0 ? nextBackup : -1; // -1 means will backup on next write
      } else if (backupInterval === 0) {
        stats.nextBackupIn = -1; // Will backup on every write
      }
    }

    debugLog('MemoryService: Stats:', stats);
    return stats;
  }

  /**
   * Get memory by hash
   */
  getByHash(hash: string): MemoryEntry | null {
    const result = this.stmts.getMemoryByHash.get(hash) as any;
    if (!result) {
      return null;
    }

    return {
      id: result.id,
      content: result.content,
      tags: result.tags ? result.tags.split(',') : [],
      createdAt: result.created_at,
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
   * List all available backups
   */
  listBackups(): Array<{ name: string; path: string; size: number; created: Date }> {
    return this.backup?.listBackups() || [];
  }

  /**
   * Restore from a backup (requires restart after restore)
   */
  restoreFromBackup(backupPath: string): boolean {
    if (!this.backup) return false;

    // Close current connection
    if (this.db) {
      this.db.close();
      this.db = null;
    }

    const success = this.backup.restore(backupPath);
    
    if (success) {
      // Reinitialize with restored database
      this.initialize();
    }

    return success;
  }

  /**
   * Export memories to JSON format with optional filtering
   */
  exportMemories(filters?: ExportFilters): ExportFormat {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Use existing search method to get memories
    // Pass undefined for query to use tag search (if tags provided) or recent search (if no filters)
    const memories = this.search(
      undefined, // query - let search decide based on tags
      filters?.tags,
      filters?.limit || 1000, // default high limit for export
      undefined, // daysAgo
      filters?.startDate?.toISOString(),
      filters?.endDate?.toISOString()
    );
    
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

    const stmt = this.db.prepare(`
      SELECT 
        r.to_memory_id as relatedMemoryId,
        r.relationship_type as relationshipType,
        m.hash as relatedMemoryHash
      FROM relationships r
      JOIN memories m ON m.id = r.to_memory_id
      WHERE r.from_memory_id = ?
    `);

    const relationships = stmt.all(memoryId) as any[];
    
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
          // Create relationship
          const stmt = this.db.prepare(`
            INSERT OR IGNORE INTO relationships (from_memory_id, to_memory_id, relationship_type, created_at)
            VALUES (?, ?, ?, ?)
          `);
          
          const info = stmt.run(fromMemory.id, toMemory.id, rel.relationshipType, new Date().toISOString());
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
   * Get a memory by its hash
   */
  private getMemoryByHash(hash: string): MemoryEntry | null {
    if (!this.db) return null;

    const stmt = this.db.prepare(`
      SELECT id, content, tags, created_at, hash
      FROM memories
      WHERE hash = ?
    `);

    const result = stmt.get(hash) as any;
    
    if (!result) return null;

    return {
      id: result.id,
      content: result.content,
      tags: result.tags ? result.tags.split(',') : [],
      createdAt: result.created_at,
      hash: result.hash
    };
  }
}