import Database from 'better-sqlite3';
import { debugLog } from '../utils/debug.js';

export class DatabaseOptimizer {
  /**
   * Apply SQLite performance optimizations
   * Safe to run multiple times (idempotent)
   * 
   * Set MEMORY_CLOUD_SAFE=true for OneDrive/Dropbox/cloud storage locations
   */
  static applyOptimizations(db: Database.Database): void {
    const isCloudSafe = process.env.MEMORY_CLOUD_SAFE === 'true';
    
    if (isCloudSafe) {
      // Cloud-safe mode: Use DELETE journal (single file, no WAL shm/wal files)
      db.pragma('journal_mode = DELETE');
      debugLog('Database optimizations applied (CLOUD-SAFE MODE)');
      debugLog('⚠️  Performance reduced for cloud storage compatibility');
    } else {
      // Performance mode: WAL allows readers and writers to work simultaneously
      db.pragma('journal_mode = WAL');
      debugLog('Database optimizations applied (PERFORMANCE MODE)');
    }
    
    // Larger cache = fewer disk reads = faster queries (64MB)
    db.pragma('cache_size = -64000');
    
    // Store temp tables in memory (faster)
    db.pragma('temp_store = MEMORY');
    
    // Cloud-safe: Use FULL sync for maximum safety, else NORMAL for speed
    db.pragma(isCloudSafe ? 'synchronous = FULL' : 'synchronous = NORMAL');
    
    // Enforce foreign key constraints
    db.pragma('foreign_keys = ON');
  }
  
  /**
   * Optimize FTS5 index (run periodically or after bulk inserts)
   */
  static optimizeFTS(db: Database.Database): void {
    try {
      // Check if FTS table exists and has data before optimizing
      const tableExists = db.prepare(`
        SELECT COUNT(*) as count FROM sqlite_master 
        WHERE type='table' AND name='memories_fts'
      `).get() as any;
      
      if (tableExists && tableExists.count > 0) {
        db.exec(`INSERT INTO memories_fts(memories_fts) VALUES('optimize')`);
        debugLog('FTS index optimized');
      }
    } catch (error: any) {
      // FTS optimization is optional - don't fail if it doesn't work
      debugLog('FTS optimization skipped:', error.message);
    }
  }
}
