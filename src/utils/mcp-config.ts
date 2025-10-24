import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface MCPConfigPath {
  name: string;
  path: string;
  exists: boolean;
  matchingServers?: string[]; // Server names that match current MEMORY_DB
}

/**
 * Normalize path to use forward slashes for better cross-platform copy/paste
 */
function normalizePath(p: string): string {
  return p.replace(/\\/g, '/');
}

/**
 * Get potential MCP configuration file paths across multiple clients
 * Returns an array of config paths with their existence status and matching server entries
 */
export function getMCPConfigPaths(): MCPConfigPath[] {
  const platform = process.platform;
  const home = homedir();
  const paths: MCPConfigPath[] = [];
  
  if (platform === 'win32') {
    const appData = process.env.APPDATA || join(home, 'AppData', 'Roaming');
    paths.push(
      { name: 'VS Code', path: normalizePath(join(appData, 'Code', 'User', 'mcp.json')), exists: false },
      { name: 'VS Code Insiders', path: normalizePath(join(appData, 'Code - Insiders', 'User', 'mcp.json')), exists: false },
      { name: 'Cursor', path: normalizePath(join(appData, 'Cursor', 'User', 'mcp.json')), exists: false },
      { name: 'Claude Desktop', path: normalizePath(join(appData, 'Claude', 'claude_desktop_config.json')), exists: false }
    );
  } else if (platform === 'darwin') {
    const appSupport = join(home, 'Library', 'Application Support');
    paths.push(
      { name: 'VS Code', path: normalizePath(join(appSupport, 'Code', 'User', 'mcp.json')), exists: false },
      { name: 'VS Code Insiders', path: normalizePath(join(appSupport, 'Code - Insiders', 'User', 'mcp.json')), exists: false },
      { name: 'Cursor', path: normalizePath(join(appSupport, 'Cursor', 'User', 'mcp.json')), exists: false },
      { name: 'Claude Desktop', path: normalizePath(join(appSupport, 'Claude', 'claude_desktop_config.json')), exists: false }
    );
  } else {
    const config = join(home, '.config');
    paths.push(
      { name: 'VS Code', path: normalizePath(join(config, 'Code', 'User', 'mcp.json')), exists: false },
      { name: 'VS Code Insiders', path: normalizePath(join(config, 'Code - Insiders', 'User', 'mcp.json')), exists: false },
      { name: 'Cursor', path: normalizePath(join(config, 'Cursor', 'User', 'mcp.json')), exists: false },
      { name: 'Claude Desktop', path: normalizePath(join(config, 'Claude', 'claude_desktop_config.json')), exists: false }
    );
    
    // WSL Remote: Check for vscode-server (when connecting from Windows VS Code)
    const vscodeServer = join(home, '.vscode-server', 'data', 'User', 'mcp.json');
    const vscodeServerInsiders = join(home, '.vscode-server-insiders', 'data', 'User', 'mcp.json');
    paths.push(
      { name: 'VS Code (WSL Remote)', path: normalizePath(vscodeServer), exists: false },
      { name: 'VS Code Insiders (WSL Remote)', path: normalizePath(vscodeServerInsiders), exists: false }
    );
  }
  
  const currentDb = process.env.MEMORY_DB || 'memory.db';
  
  // Check which paths exist and find matching server entries
  for (const pathInfo of paths) {
    pathInfo.exists = existsSync(pathInfo.path);
    
    if (pathInfo.exists) {
      try {
        const content = readFileSync(pathInfo.path, 'utf-8');
        const config = JSON.parse(content);
        const servers = pathInfo.name === 'Claude Desktop' ? config.mcpServers : config.servers;
        
        if (servers) {
          const matching: string[] = [];
          for (const [name, serverConfig] of Object.entries(servers)) {
            if (typeof serverConfig === 'object' && serverConfig !== null) {
              const cmd = (serverConfig as any).command || '';
              if (cmd.includes('simple-memory')) {
                const configDb = (serverConfig as any).env?.MEMORY_DB || 'memory.db';
                if (configDb === currentDb) {
                  matching.push(name);
                }
              }
            }
          }
          if (matching.length > 0) {
            pathInfo.matchingServers = matching;
          }
        }
      } catch {
        // Ignore parse errors
      }
    }
  }
  
  return paths;
}
