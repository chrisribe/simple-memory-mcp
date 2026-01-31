#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

/**
 * Automatically configure VS Code MCP settings for simple-memory
 * Creates/updates mcp.json in VS Code user directory
 */

const MCP_CONFIG = {
  "simple-memory-mcp": {
    "command": "simple-memory"
  }
};

const MCP_CONFIG_WITH_COMMENTS = `{
  "servers": {
    "simple-memory-mcp": {
      "command": "simple-memory"
      // 💡 Uncomment and customize environment variables as needed:
      // "env": {
      //   "MEMORY_DB": "./memory.db",              // Custom database location
      //   "MEMORY_BACKUP_PATH": "./backups",       // Enable automatic backups
      //   "MEMORY_BACKUP_INTERVAL": "1440",        // Backup interval in minutes
      //   "MEMORY_BACKUP_RETENTION": "30",         // Keep backups for N days
      //   "DEBUG": "false"                         // Enable debug logging
      // }
    }
  }
}`;

function getVSCodeConfigPaths() {
  const platform = process.platform;
  const home = homedir();
  const paths = [];
  
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

function configureVSCode(name, vscodeUserPath) {
  const mcpJsonPath = join(vscodeUserPath, 'mcp.json');
  
  if (!existsSync(vscodeUserPath)) {
    return { success: false, reason: 'not-found' };
  }
  
  console.log(`\n✅ ${name} detected!`);
  
  let mcpConfig = {};
  let serversProp = 'servers'; // Both stable and Insiders use "servers"
  
  // Read existing mcp.json if it exists
  if (existsSync(mcpJsonPath)) {
    try {
      mcpConfig = JSON.parse(readFileSync(mcpJsonPath, 'utf8'));
      
      // Detect which property is used (both versions use "servers")
      if (mcpConfig.servers) {
        serversProp = 'servers';
      } else if (mcpConfig.mcpServers) {
        serversProp = 'mcpServers';
      }
      
      // Ensure the property exists
      if (!mcpConfig[serversProp]) {
        mcpConfig[serversProp] = {};
      }
    } catch (error) {
      console.log(`⚠️  Could not parse mcp.json for ${name}`);
      return { success: false, reason: 'parse-error' };
    }
  } else {
    // New file - use "servers" (standard format for both stable and Insiders)
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
  } catch (error) {
    console.error(`❌ Failed to update ${name} mcp.json:`, error.message);
    return { success: false, reason: 'write-error' };
  }
}

function main() {
  const vscodeInstalls = getVSCodeConfigPaths();
  let configuredCount = 0;
  let foundCount = 0;
  let mcpJsonPaths = [];
  
  console.log('\n🔧 Checking for VS Code installations...');
  
  for (const install of vscodeInstalls) {
    const result = configureVSCode(install.name, install.path);
    if (result.success) {
      foundCount++;
      if (result.path) {
        mcpJsonPaths.push(result.path);
      }
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
  
  // Show example config and instructions (for all cases)
  if (foundCount > 0) {
    console.log('\n💡 Example configuration with all options:');
    console.log(MCP_CONFIG_WITH_COMMENTS);
    console.log('\n💡 To find and edit your config file:');
    console.log('   Run: node dist/index.js stats');
    if (configuredCount > 0) {
      console.log('\n📖 Configuration docs: https://github.com/chrisribe/simple-memory-mcp#configuration');
    }
  } else {
    console.log(MCP_CONFIG_WITH_COMMENTS);
  }
}

main();
