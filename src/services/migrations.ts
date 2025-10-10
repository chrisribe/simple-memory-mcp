import Database from 'better-sqlite3';
import { debugLog } from '../utils/debug.js';
import { existsSync, copyFileSync } from 'fs';

export interface Migration {
  version: number;
  description: string;
  up: (db: Database.Database) => void;
}

/**
 * All migrations in order
 * Add new migrations to the end, never modify existing ones
 */
export const migrations: Migration[] = [
  {
    version: 1,
    description: 'Initial schema with migration tracking',
    up: (db: Database.Database) => {
      // Schema already exists, just mark as version 1
      debugLog('Migration 1: Baseline schema marked');
    }
  },
  {
    version: 2,
    description: 'Normalize tags + add performance indexes',
    up: (db: Database.Database) => {
      debugLog('Migration 2: Starting tag normalization and index creation');
      
      // Create tags table
      db.exec(`
        CREATE TABLE IF NOT EXISTS tags (
          memory_id INTEGER NOT NULL,
          tag TEXT NOT NULL,
          FOREIGN KEY (memory_id) REFERENCES memories (id) ON DELETE CASCADE,
          PRIMARY KEY (memory_id, tag)
        );
      `);
      
      // Create indexes for tags table
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_tags_tag ON tags(tag);
        CREATE INDEX IF NOT EXISTS idx_tags_memory_id ON tags(memory_id);
      `);
      
      // Add performance indexes to existing tables
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_memories_hash ON memories(hash);
        CREATE INDEX IF NOT EXISTS idx_relationships_from ON relationships(from_memory_id);
        CREATE INDEX IF NOT EXISTS idx_relationships_to ON relationships(to_memory_id);
        CREATE INDEX IF NOT EXISTS idx_relationships_composite ON relationships(from_memory_id, to_memory_id);
      `);
      
      // Migrate existing tags from memories.tags column to tags table
      const memories = db.prepare(`SELECT id, tags FROM memories WHERE tags IS NOT NULL AND tags != ''`).all() as Array<{ id: number; tags: string }>;
      
      if (memories.length > 0) {
        debugLog(`Migrating tags for ${memories.length} memories`);
        const insertTag = db.prepare('INSERT OR IGNORE INTO tags (memory_id, tag) VALUES (?, ?)');
        
        const migrateData = db.transaction(() => {
          for (const memory of memories) {
            const tagList = memory.tags.split(',').map(t => t.trim().toLowerCase()).filter(t => t);
            for (const tag of tagList) {
              insertTag.run(memory.id, tag);
            }
          }
        });
        
        migrateData();
        debugLog(`Successfully migrated ${memories.length} memories to new tag format`);
      }
      
      // Run ANALYZE to update query planner statistics
      db.exec('ANALYZE');
      
      debugLog('Migration 2: Completed successfully');
    }
  },
  {
    version: 3,
    description: 'Update FTS table to remove tags column',
    up: (db: Database.Database) => {
      debugLog('Migration 3: Updating FTS table schema');
      
      // Always recreate FTS table to ensure consistency
      debugLog('Recreating FTS table with updated schema');
      
      // Drop old FTS table and triggers
      db.exec(`DROP TRIGGER IF EXISTS memories_ai`);
      db.exec(`DROP TRIGGER IF EXISTS memories_au`);
      db.exec(`DROP TRIGGER IF EXISTS memories_ad`);
      db.exec(`DROP TABLE IF EXISTS memories_fts`);
      
      // Create new FTS table without tags column
      db.exec(`
        CREATE VIRTUAL TABLE memories_fts 
        USING fts5(content, content='memories', content_rowid='id')
      `);
      
      // Recreate triggers
      db.exec(`
        CREATE TRIGGER memories_ai AFTER INSERT ON memories BEGIN
          INSERT INTO memories_fts (rowid, content) 
          VALUES (new.id, new.content);
        END;
      `);
      
      db.exec(`
        CREATE TRIGGER memories_au AFTER UPDATE ON memories BEGIN
          UPDATE memories_fts SET content = new.content 
          WHERE rowid = new.id;
        END;
      `);
      
      db.exec(`
        CREATE TRIGGER memories_ad AFTER DELETE ON memories BEGIN
          DELETE FROM memories_fts WHERE rowid = old.id;
        END;
      `);
      
      // Repopulate FTS table with existing memories
      const memories = db.prepare(`SELECT id, content FROM memories`).all() as Array<{ id: number; content: string }>;
      if (memories.length > 0) {
        debugLog(`Repopulating FTS table with ${memories.length} memories`);
        const insertFts = db.prepare(`INSERT INTO memories_fts (rowid, content) VALUES (?, ?)`);
        const populateFts = db.transaction(() => {
          for (const memory of memories) {
            insertFts.run(memory.id, memory.content);
          }
        });
        populateFts();
      }
      
      debugLog('Migration 3: FTS table updated successfully');
    }
  }
  // Future migrations go here - just add to the array!
];

/**
 * Create backup before running migrations
 */
function createBackup(dbPath: string): void {
  if (!existsSync(dbPath)) return;
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${dbPath}.backup-${timestamp}`;
  
  try {
    copyFileSync(dbPath, backupPath);
    debugLog(`Backup created: ${backupPath}`);
  } catch (error: any) {
    debugLog(`Warning: Could not create backup: ${error.message}`);
  }
}

/**
 * Run all pending migrations
 * This is the only function you need to call - it handles everything
 */
export function runMigrations(db: Database.Database, dbPath: string): void {
  // Ensure migration tracking table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )
  `);
  
  // Get current version
  const result = db.prepare('SELECT MAX(version) as version FROM schema_migrations').get() as any;
  const currentVersion = result?.version || 0;
  
  // Check if this is a fresh database (no migrations recorded)
  const isFreshDatabase = currentVersion === 0;
  
  // Find pending migrations
  const pendingMigrations = migrations.filter(m => m.version > currentVersion);
  
  if (pendingMigrations.length === 0) {
    debugLog('Database schema is up to date');
    return;
  }
  
  // For fresh databases, mark as current version without running migrations
  // since initDb() already creates the latest schema
  if (isFreshDatabase) {
    const latestVersion = Math.max(...migrations.map(m => m.version));
    debugLog(`Fresh database detected - marking as schema version ${latestVersion}`);
    
    const recordMigration = db.prepare(
      'INSERT INTO schema_migrations (version, description, applied_at) VALUES (?, ?, ?)'
    );
    
    const markAsCurrent = db.transaction(() => {
      for (const migration of migrations) {
        recordMigration.run(
          migration.version, 
          migration.description + ' (baseline)', 
          new Date().toISOString()
        );
      }
    });
    
    markAsCurrent();
    debugLog('Database schema initialized at latest version');
    return;
  }
  
  // For existing databases, run actual migrations
  debugLog(`Found ${pendingMigrations.length} pending migration(s) for existing database`);
  
  // Create backup before any changes (only for existing databases)
  createBackup(dbPath);
  
  // Record migration in tracking table
  const recordMigration = db.prepare(
    'INSERT INTO schema_migrations (version, description, applied_at) VALUES (?, ?, ?)'
  );
  
  // Run each pending migration in a transaction
  for (const migration of pendingMigrations) {
    debugLog(`Applying migration ${migration.version}: ${migration.description}`);
    
    try {
      const runMigration = db.transaction(() => {
        migration.up(db);
        recordMigration.run(migration.version, migration.description, new Date().toISOString());
      });
      
      runMigration();
      debugLog(`✅ Migration ${migration.version} completed successfully`);
    } catch (error: any) {
      debugLog(`❌ Migration ${migration.version} failed: ${error.message}`);
      throw error; // Let it fail - backup exists for recovery
    }
  }
  
  debugLog('All migrations completed successfully');
}
