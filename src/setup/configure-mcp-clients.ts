/**
 * Configure MCP clients (VS Code, Claude Desktop) for simple-memory
 * 
 * Detects installed clients and adds simple-memory-mcp configuration
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';
import { initConfigFile } from '../utils/config.js';

// Detect if running from git source (developers) or npm install (users)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const isFromSource = existsSync(join(__dirname, '..', '..', '.git')) || existsSync(join(__dirname, '..', '..', 'src'));

// For source/dev: use linked local command
// For npm users: use npx (always gets latest from registry)
const MCP_CONFIG = isFromSource
  ? { "simple-memory-mcp": { "command": "simple-memory" } }
  : { "simple-memory-mcp": { "command": "npx", "args": ["-y", "simple-memory-mcp"] } };

const MCP_CONFIG_WITH_COMMENTS = isFromSource
  ? `{
  "servers": {
    "simple-memory-mcp": {
      "command": "simple-memory"
      // 💡 Using locally-linked build (from npm run setup)
      // 💡 For production, use npx:
      //    "command": "npx",
      //    "args": ["-y", "simple-memory-mcp"]
      //
      // 💡 Environment variables:
      // "env": {
      //   "MEMORY_DB": "./memory.db",
      //   "MEMORY_BACKUP_PATH": "./backups",
      //   "DEBUG": "false"
      // }
    }
  }
}`
  : `{
  "servers": {
    "simple-memory-mcp": {
      "command": "npx",
      "args": ["-y", "simple-memory-mcp"]
      // 💡 Environment variables:
      // "env": {
      //   "MEMORY_DB": "./memory.db",
      //   "MEMORY_BACKUP_PATH": "./backups",
      //   "DEBUG": "false"
      // }
    }
  }
}`;

interface ConfigPath {
  name: string;
  path: string;
}

interface ConfigResult {
  success: boolean;
  reason: string;
  path?: string;
}

function getVSCodeConfigPaths(): ConfigPath[] {
  const platform = process.platform;
  const home = homedir();
  const paths: ConfigPath[] = [];
  
  if (platform === 'win32') {
    const appData = process.env.APPDATA || join(home, 'AppData', 'Roaming');
    paths.push(
      { name: 'VS Code', path: join(appData, 'Code', 'User').replace(/\\/g, '/') },
      { name: 'VS Code Insiders', path: join(appData, 'Code - Insiders', 'User').replace(/\\/g, '/') }
    );
  } else if (platform === 'darwin') {
    const appSupport = join(home, 'Library', 'Application Support');
    paths.push(
      { name: 'VS Code', path: join(appSupport, 'Code', 'User') },
      { name: 'VS Code Insiders', path: join(appSupport, 'Code - Insiders', 'User') }
    );
  } else {
    const config = join(home, '.config');
    paths.push(
      { name: 'VS Code', path: join(config, 'Code', 'User') },
      { name: 'VS Code Insiders', path: join(config, 'Code - Insiders', 'User') }
    );
  }
  
  return paths;
}

function configureVSCode(name: string, vscodeUserPath: string): ConfigResult {
  const mcpJsonPath = join(vscodeUserPath, 'mcp.json');
  
  if (!existsSync(vscodeUserPath)) {
    return { success: false, reason: 'not-found' };
  }
  
  console.log(`\n✅ ${name} detected!`);
  
  let mcpConfig: Record<string, any> = {};
  let serversProp = 'servers';
  
  // Read existing mcp.json if it exists
  if (existsSync(mcpJsonPath)) {
    try {
      mcpConfig = JSON.parse(readFileSync(mcpJsonPath, 'utf8'));
      
      // Detect which property is used
      if (mcpConfig.servers) {
        serversProp = 'servers';
      } else if (mcpConfig.mcpServers) {
        serversProp = 'mcpServers';
      }
      
      if (!mcpConfig[serversProp]) {
        mcpConfig[serversProp] = {};
      }
    } catch {
      console.log(`⚠️  Could not parse mcp.json for ${name}`);
      return { success: false, reason: 'parse-error' };
    }
  } else {
    mcpConfig[serversProp] = {};
  }
  
  // Check if already configured
  if (mcpConfig[serversProp]['simple-memory-mcp']) {
    console.log(`✅ Already configured in ${name}`);
    return { success: true, reason: 'already-configured', path: mcpJsonPath.replace(/\\/g, '/') };
  }
  
  // Add simple-memory-mcp config
  mcpConfig[serversProp]['simple-memory-mcp'] = MCP_CONFIG['simple-memory-mcp'];
  
  try {
    mkdirSync(vscodeUserPath, { recursive: true });
    writeFileSync(mcpJsonPath, JSON.stringify(mcpConfig, null, 2), 'utf8');
    console.log(`✅ Added to ${name} mcp.json`);
    return { success: true, reason: 'configured', path: mcpJsonPath.replace(/\\/g, '/') };
  } catch (error: any) {
    console.error(`❌ Failed to update ${name} mcp.json:`, error.message);
    return { success: false, reason: 'write-error' };
  }
}

export function runSetup(): void {
  const vscodeInstalls = getVSCodeConfigPaths();
  let configuredCount = 0;
  let foundCount = 0;
  
  console.log('\n🔧 Checking for VS Code installations...');
  
  for (const install of vscodeInstalls) {
    const result = configureVSCode(install.name, install.path);
    if (result.success) {
      foundCount++;
      if (result.reason === 'configured') {
        configuredCount++;
      }
    }
  }
  
  if (foundCount === 0) {
    console.log('\nℹ️  No VS Code installations detected');
    console.log('   Add this to your VS Code User/mcp.json manually:');
  } else if (configuredCount > 0) {
    console.log('\n🎉 Configuration complete!');
    console.log('   Restart VS Code and simple-memory-mcp will be available');
  } else {
    console.log('\n✅ All installations already configured');
  }
  
  // Initialize config file (creates ~/.simple-memory/config.json if not exists)
  console.log('\n🔧 Checking config file...');
  const { path: configPath, created } = initConfigFile();
  if (created) {
    console.log(`✅ Created config file: ${configPath}`);
  } else {
    console.log(`✅ Config file exists: ${configPath}`);
  }
  
  console.log('\n💡 Example MCP configuration with all options:');
  console.log(MCP_CONFIG_WITH_COMMENTS);
  console.log('\n📖 Configuration docs: https://github.com/chrisribe/simple-memory-mcp#configuration');
}
