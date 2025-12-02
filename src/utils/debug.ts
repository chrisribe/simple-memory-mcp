// Debug logging utilities

/**
 * Check if debug logging is enabled
 * Respects MEMORY_DEBUG=false to suppress output in CLI mode
 */
function isDebugEnabled(): boolean {
  // Explicitly disabled (CLI mode sets this)
  if (process.env.MEMORY_DEBUG === 'false') {
    return false;
  }
  return process.env.DEBUG === 'true' || process.argv.length > 2;
}

/**
 * Main debug logging function
 */
export function debugLog(message: string, ...args: any[]) {
  // Always use stderr for debug output
  // Check for DEBUG env var or CLI mode
  if (isDebugEnabled()) {
    console.error(`[DEBUG] ${message}`, ...args);
  }
}

/**
 * Format hash for display (first 8 chars + ellipsis)
 */
export function formatHash(hash: string): string {
  return hash.length > 8 ? hash.substring(0, 8) + '...' : hash;
}

/**
 * Debug log with hash formatting
 */
export function debugLogHash(message: string, hash: string, ...args: any[]) {
  if (isDebugEnabled()) {
    debugLog(message, formatHash(hash), ...args);
  }
}

/**
 * Debug log with multiple hash formatting
 */
export function debugLogHashes(message: string, ...hashes: string[]) {
  if (isDebugEnabled()) {
    const formatted = hashes.map(formatHash).join(', ');
    debugLog(message, formatted);
  }
}

export function debugToolCall(name: string, args: any) {
  // Only log in CLI mode, not MCP mode
  if (process.argv.length > 2) {
    debugLog(`MCP Tool called: ${name}`);
    debugLog(`Arguments:`, JSON.stringify(args, null, 2));
    debugLog(`Timestamp:`, new Date().toISOString());
  }
}

/**
 * Format timestamp for filenames
 * Converts ISO timestamp to filesystem-safe format: YYYY-MM-DD_HH-MM-SS
 * Example: 2025-01-15T14:30:45.123Z -> 2025-01-15_14-30-45
 */
export function formatTimestampForFilename(date: Date = new Date()): string {
  return date.toISOString()
    .replace(/[:.]/g, '-')  // Replace colons and dots with dashes
    .replace('T', '_')       // Replace T with underscore for readability
    .slice(0, -5);          // Remove milliseconds and Z suffix
}

// Alias for compatibility
export const debugMCP = debugLog;
