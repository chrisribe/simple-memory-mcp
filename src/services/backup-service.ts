import { existsSync, mkdirSync, readdirSync, unlinkSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { debugLog, formatTimestampForFilename } from '../utils/debug.js';
import type { ExportFormat } from '../types/tools.js';

export interface BackupConfig {
  backupPath: string;
  autoBackupInterval?: number; // minutes - minimum time between backups (0 = backup on every write)
  maxBackups?: number; // keep last N backups (0 = unlimited)
  source?: string; // optional source identifier (e.g., "work", "personal")
  getBackupData: () => ExportFormat; // function to get data for backup
}

export class BackupService {
  private config: BackupConfig;
  private lastBackupTime: number = 0;

  constructor(config: BackupConfig) {
    this.config = {
      ...config,
      autoBackupInterval: config.autoBackupInterval || 0,
      maxBackups: config.maxBackups || 10
    };

    // Ensure backup directory exists
    try {
      mkdirSync(this.config.backupPath, { recursive: true });
      debugLog(`Backup directory ready: ${this.config.backupPath}`);
      
      // Load lastBackupTime from metadata file (for CLI persistence)
      this.lastBackupTime = this.getLastBackupTime();
    } catch (error: any) {
      debugLog(`Warning: Could not create backup directory: ${error.message}`);
    }
  }

  /**
   * Get path to backup metadata file
   */
  private getMetadataPath(): string {
    return join(this.config.backupPath, '.backup-metadata.json');
  }

  /**
   * Save backup metadata
   * @returns true if saved successfully, false on error
   */
  private saveMetadata(): boolean {
    try {
      const metadata = {
        lastBackupTime: this.lastBackupTime,
        lastBackupDate: new Date(this.lastBackupTime).toISOString()
      };
      writeFileSync(this.getMetadataPath(), JSON.stringify(metadata, null, 2));
      return true;
    } catch (error: any) {
      debugLog(`Warning: Could not save backup metadata: ${error.message}`);
      return false;
    }
  }

  /**
   * Get last backup time from metadata file
   * @returns timestamp in milliseconds, or 0 if no metadata exists
   */
  private getLastBackupTime(): number {
    try {
      if (!existsSync(this.config.backupPath)) {
        debugLog(`Backup path does not exist yet: ${this.config.backupPath}`);
        return 0;
      }

      const metadataPath = this.getMetadataPath();
      if (existsSync(metadataPath)) {
        const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
        debugLog(`📋 Loaded backup metadata: last backup at ${metadata.lastBackupDate}`);
        return metadata.lastBackupTime;
      } else {
        debugLog(`📋 No backup metadata found (will create on first backup)`);
        return 0;
      }
    } catch (error: any) {
      debugLog(`Warning: Could not read last backup time: ${error.message}`);
      return 0;
    }
  }

  /**
   * Create a JSON export backup of all memories
   */
  backup(label: string = 'manual'): string | null {
    try {
      const timestamp = formatTimestampForFilename();
      const backupFileName = `smem_${label}_${timestamp}.json`;
      const backupPath = join(this.config.backupPath, backupFileName);

      // Get export data
      const exportData = this.config.getBackupData();
      
      // Override source if configured
      if (this.config.source) {
        exportData.source = this.config.source;
      }

      // Write JSON backup
      writeFileSync(backupPath, JSON.stringify(exportData, null, 2), 'utf-8');
      
      this.lastBackupTime = Date.now();
      this.saveMetadata(); // Persist backup time
      debugLog(`✅ Backup created: ${backupPath} (${exportData.totalMemories} memories)`);

      // Clean up old backups
      this.cleanupOldBackups();

      return backupPath;
    } catch (error: any) {
      debugLog(`❌ Backup failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Check if backup should be created based on throttle interval
   */
  shouldBackup(): boolean {
    // If interval is 0, backup on every write
    if (!this.config.autoBackupInterval || this.config.autoBackupInterval <= 0) {
      return true;
    }

    const intervalMs = this.config.autoBackupInterval * 60 * 1000;
    return (Date.now() - this.lastBackupTime) >= intervalMs;
  }

  /**
   * Backup if enough time has passed since last backup (lazy backup on write)
   */
  backupIfNeeded(): string | null {
    if (this.shouldBackup()) {
      return this.backup('auto');
    }
    return null;
  }

  /**
   * Initialize lazy backup mode (creates initial backup if needed)
   * Backups will be created on write operations when interval has passed
   */
  initialize(): void {
    const intervalMinutes = this.config.autoBackupInterval || 0;
    debugLog(`Lazy backup enabled (interval: ${intervalMinutes} minutes)`);
    this.backupIfNeeded();
  }

  /**
   * Clean up old backups, keeping only the most recent N
   */
  private cleanupOldBackups(): void {
    if (this.config.maxBackups! <= 0) {
      return; // Keep all backups
    }

    try {
      const files = readdirSync(this.config.backupPath)
        .filter(f => f.endsWith('.json') && f.startsWith('smem_'))
        .map(f => ({
          name: f,
          path: join(this.config.backupPath, f)
        }))
        // Sort by filename (which contains timestamp) - newest first
        .sort((a, b) => b.name.localeCompare(a.name));

      // Delete backups beyond the max count
      const toDelete = files.slice(this.config.maxBackups);
      
      for (const file of toDelete) {
        try {
          unlinkSync(file.path);
          debugLog(`Deleted old backup: ${file.name}`);
        } catch (error: any) {
          debugLog(`Warning: Could not delete old backup: ${error.message}`);
        }
      }

      if (toDelete.length > 0) {
        debugLog(`Cleaned up ${toDelete.length} old backup(s), kept ${this.config.maxBackups} most recent`);
      }
    } catch (error: any) {
      debugLog(`Warning: Backup cleanup failed: ${error.message}`);
    }
  }

  /**
   * Get count of available backups
   */
  getBackupCount(): number {
    if (!existsSync(this.config.backupPath)) {
      return 0;
    }

    try {
      return readdirSync(this.config.backupPath)
        .filter(f => f.endsWith('.json') && f.startsWith('smem_'))
        .length;
    } catch {
      return 0;
    }
  }

  /**
   * Get time since last backup in minutes
   */
  getTimeSinceLastBackup(): number {
    if (this.lastBackupTime === 0) return -1;
    return Math.floor((Date.now() - this.lastBackupTime) / 60000);
  }
}
