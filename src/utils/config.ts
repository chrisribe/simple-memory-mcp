/**
 * Configuration utilities for simple-memory-mcp
 * Provides sensible defaults with environment variable overrides
 */

import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

/**
 * Default directory for simple-memory data
 * ~/.simple-memory/ on all platforms
 */
export function getDefaultDir(): string {
  return join(homedir(), '.simple-memory');
}

/**
 * Get the database path with sensible defaults.
 * 
 * Resolution order:
 * 1. MEMORY_DB environment variable (power users)
 * 2. ~/.simple-memory/memory.db (default)
 * 
 * @returns Object with path and whether it's the default location
 */
export function getDatabasePath(): { path: string; isDefault: boolean } {
  // 1. Explicit env var (power users)
  if (process.env.MEMORY_DB) {
    return { path: process.env.MEMORY_DB, isDefault: false };
  }
  
  // 2. Sensible default - always the same predictable path
  const defaultDir = getDefaultDir();
  const defaultPath = join(defaultDir, 'memory.db');
  
  return { path: defaultPath, isDefault: true };
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
