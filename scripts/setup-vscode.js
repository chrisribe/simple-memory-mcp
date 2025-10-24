#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Automatically configure VS Code MCP settings for simple-memory
 * Creates/updates mcp.json in VS Code user directory
 */

// Get command config with proper PATH for WSL
function getCommandConfig() {
  const platform = process.platform;
  
  // For WSL/Linux with nvm, add nvm bin to PATH
  if (platform !== 'win32') {
    try {
      // Get the node path (should be from nvm)
      const nodePath = execSync('which node', { encoding: 'utf8' }).trim();
      
      // If using nvm, extract the bin directory and prepend to a clean PATH
      if (nodePath.includes('.nvm')) {
        const nvmBinDir = dirname(nodePath);
        return {
          command: "simple-memory",
          env: {
            // Only add nvm bin directory, not the entire current PATH
            PATH: `${nvmBinDir}:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`
          }
        };
      }
    } catch (e) {
      // Fall through to simple command
    }
  }
  
  // Default: use simple-memory command (works on Windows and standard Linux installs)
  return { command: "simple-memory" };
}

const MCP_CONFIG = {
  "simple-memory-mcp": getCommandConfig()
};

function getMCPConfigWithComments() {
  const config = getCommandConfig();
  let commandLine = `      "command": "${config.command}"`;
  if (config.args) {
    commandLine += `,\n      "args": ${JSON.stringify(config.args)}`;
  }
  if (config.env) {
    commandLine += `,\n      "env": ${JSON.stringify(config.env, null, 2).replace(/\n/g, '\n      ')}`;
  }
  
  return `{
  "servers": {
    "simple-memory-mcp": {
${commandLine}
      // 💡 Uncomment and customize additional environment variables:
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
}

const MCP_CONFIG_WITH_COMMENTS = getMCPConfigWithComments();

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
    
    // WSL Remote: Check for vscode-server (when connecting from Windows VS Code)
    const vscodeServer = join(home, '.vscode-server', 'data', 'User');
    const vscodeServerInsiders = join(home, '.vscode-server-insiders', 'data', 'User');
    
    if (existsSync(vscodeServer)) {
      paths.push({ name: 'VS Code (WSL Remote)', path: vscodeServer });
    }
    if (existsSync(vscodeServerInsiders)) {
      paths.push({ name: 'VS Code Insiders (WSL Remote)', path: vscodeServerInsiders });
    }
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
  
  // Add or update simple-memory-mcp config
  const existingConfig = mcpConfig[serversProp]['simple-memory-mcp'];
  const newConfig = MCP_CONFIG['simple-memory-mcp'];
  
  if (existingConfig) {
    // Check if it needs updating (add PATH env for nvm)
    const needsUpdate = !existingConfig.env && newConfig.env;
    if (needsUpdate) {
      mcpConfig[serversProp]['simple-memory-mcp'] = newConfig;
      console.log(`✅ Updated ${name} with nvm PATH for WSL compatibility`);
    } else {
      console.log(`✅ Already configured in ${name}`);
      return { success: true, reason: 'already-configured', path: mcpJsonPath.replace(/\\/g, '/') };
    }
  } else {
    mcpConfig[serversProp]['simple-memory-mcp'] = newConfig;
  }
  
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
    console.log('   Run: node dist/index.js memory-stats');
    if (configuredCount > 0) {
      console.log('\n📖 Configuration docs: https://github.com/chrisribe/simple-memory-mcp#configuration');
    }
  } else {
    console.log(MCP_CONFIG_WITH_COMMENTS);
  }
}

main();
