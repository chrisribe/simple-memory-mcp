/**
 * Configuration utilities for simple-memory-mcp
 * Provides sensible defaults with config file and environment variable overrides
 * 
 * Resolution order (highest priority first):
 * 1. Environment variables (per-client overrides)
 * 2. ~/.simple-memory/config.json (user config file)
 * 3. Sensible defaults
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { debugLog } from './debug.js';

/**
 * Configuration schema for simple-memory
 */
export interface SimpleMemoryConfig {
  /** Path to the database file */
  database?: string;
  
  /** Backup settings */
  backup?: {
    /** Path to backup directory */
    path?: string;
    /** Minutes between backups (0 = every write) */
    interval?: number;
    /** Number of backups to keep */
    keep?: number;
    /** Source identifier (e.g., "work", "personal") */
    source?: string;
  };
  
  /** Cloud storage safe mode (uses DELETE journal instead of WAL) */
  cloudSafe?: boolean;
  
  /** Enable debug logging */
  debug?: boolean;
}

// Cached config to avoid repeated file reads
let cachedConfig: SimpleMemoryConfig | null = null;

/**
 * Default directory for simple-memory data
 * ~/.simple-memory/ on all platforms
 */
export function getDefaultDir(): string {
  return join(homedir(), '.simple-memory');
}

/**
 * Get the path to the config file
 */
export function getConfigPath(): string {
  return join(getDefaultDir(), 'config.json');
}

/**
 * Load configuration from ~/.simple-memory/config.json
 * Returns empty object if file doesn't exist
 */
export function loadConfigFile(): SimpleMemoryConfig {
  if (cachedConfig !== null) {
    return cachedConfig;
  }
  
  const configPath = getConfigPath();
  
  if (!existsSync(configPath)) {
    cachedConfig = {};
    return cachedConfig;
  }
  
  try {
    const content = readFileSync(configPath, 'utf-8');
    cachedConfig = JSON.parse(content) as SimpleMemoryConfig;
    debugLog(`Loaded config from: ${configPath}`);
    return cachedConfig;
  } catch (error) {
    debugLog(`Warning: Could not read config file: ${error}`);
    cachedConfig = {};
    return cachedConfig;
  }
}

/**
 * Clear the config cache (useful for testing or after config changes)
 */
export function clearConfigCache(): void {
  cachedConfig = null;
}

/**
 * Get the full resolved configuration
 * Merges: defaults < config.json < environment variables
 */
export function getConfig(): Required<SimpleMemoryConfig> {
  const fileConfig = loadConfigFile();
  const defaultDir = getDefaultDir();
  
  return {
    database: process.env.MEMORY_DB || fileConfig.database || join(defaultDir, 'memory.db'),
    backup: {
      path: process.env.MEMORY_BACKUP_PATH || fileConfig.backup?.path || undefined,
      interval: parseInt(process.env.MEMORY_BACKUP_INTERVAL || '', 10) || fileConfig.backup?.interval || 0,
      keep: parseInt(process.env.MEMORY_BACKUP_KEEP || '', 10) || fileConfig.backup?.keep || 10,
    } as Required<SimpleMemoryConfig>['backup'],
    cloudSafe: process.env.MEMORY_CLOUD_SAFE === 'true' || fileConfig.cloudSafe || false,
    debug: process.env.MEMORY_DEBUG === 'true' || process.env.DEBUG === 'true' || fileConfig.debug || false,
  };
}

/**
 * Get the database path with sensible defaults.
 * 
 * Resolution order:
 * 1. MEMORY_DB environment variable (per-client override)
 * 2. config.json database setting
 * 3. ~/.simple-memory/memory.db (default)
 * 
 * @returns Object with path and whether it's the default location
 */
export function getDatabasePath(): { path: string; isDefault: boolean } {
  // 1. Explicit env var (per-client override)
  if (process.env.MEMORY_DB) {
    return { path: process.env.MEMORY_DB, isDefault: false };
  }
  
  // 2. Config file
  const fileConfig = loadConfigFile();
  if (fileConfig.database) {
    return { path: fileConfig.database, isDefault: false };
  }
  
  // 3. Sensible default - always the same predictable path
  const defaultDir = getDefaultDir();
  const defaultPath = join(defaultDir, 'memory.db');
  
  return { path: defaultPath, isDefault: true };
}

/**
 * Get backup configuration
 * 
 * Resolution order:
 * 1. Environment variables (per-client override)
 * 2. config.json backup settings
 * 3. Defaults (backups disabled)
 */
export function getBackupConfig(): { path?: string; interval: number; keep: number; source?: string } {
  const fileConfig = loadConfigFile();
  
  return {
    path: process.env.MEMORY_BACKUP_PATH || fileConfig.backup?.path,
    interval: parseInt(process.env.MEMORY_BACKUP_INTERVAL || '', 10) || fileConfig.backup?.interval || 0,
    keep: parseInt(process.env.MEMORY_BACKUP_KEEP || '', 10) || fileConfig.backup?.keep || 10,
    source: process.env.MEMORY_BACKUP_SOURCE || fileConfig.backup?.source,
  };
}

/**
 * Ensure the default config directory exists
 */
export function ensureConfigDir(): string {
  const dir = getDefaultDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Create a default config file with comments
 * Only creates if it doesn't exist
 */
export function initConfigFile(): { path: string; created: boolean } {
  ensureConfigDir();
  const configPath = getConfigPath();
  
  if (existsSync(configPath)) {
    return { path: configPath, created: false };
  }
  
  const defaultConfig: SimpleMemoryConfig = {
    // Commented examples in the actual file
  };
  
  // Write a nicely formatted config with descriptive fields
  const configContent = `{
  "_comment": "Simple Memory MCP Configuration - settings apply to CLI, MCP clients, and all consumers",
  "_docs": "https://github.com/chrisribe/simple-memory-mcp#configuration",
  
  "_database_comment": "Database path (default: ~/.simple-memory/memory.db)",
  "database": null,
  
  "_backup_comment": "Backup settings: path=directory, interval=minutes between backups (0=every write), keep=number to retain, source=identifier",
  "backup": {
    "path": null,
    "interval": 0,
    "keep": 10,
    "source": null
  },
  
  "_cloudSafe_comment": "Use DELETE journal instead of WAL for cloud storage (OneDrive/Dropbox) - slower but safer",
  "cloudSafe": false,
  
  "_debug_comment": "Enable debug logging",
  "debug": false
}
`;
  
  try {
    writeFileSync(configPath, configContent, 'utf-8');
    debugLog(`Created default config file: ${configPath}`);
    return { path: configPath, created: true };
  } catch (error) {
    debugLog(`Warning: Could not create config file: ${error}`);
    return { path: configPath, created: false };
  }
}

