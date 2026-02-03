#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { config } from 'dotenv';
config();

import { existsSync } from 'fs';
import { resolve } from 'path';
import { MemoryService } from './services/memory-service.js';
import { toolRegistry } from './tools/index.js';
import type { ToolContext } from './types/tools.js';
import { debugLog } from './utils/debug.js';
import { checkDatabaseIntegrity, rebuildHashIndex } from './utils/db-integrity-check.js';
import { getDatabasePath, ensureConfigDir } from './utils/config.js';
import { StreamableHTTPServerTransport } from './transports/streamable-http.js';
import { execute as executeGraphQL } from './tools/memory-graphql/executor.js';
import { parseCommandLineArgs } from './utils/cli-parser.js';
import { 
  generateMainHelp, 
  generateCommandHelp, 
  isGraphQLShortcut, 
  buildGraphQLQuery 
} from './cli/commands.js';

// Initialize server
const server = new Server(
  {
    name: 'simple-memory-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      prompts: {},
    },
  }
);

// Initialize services
function initializeServices(): MemoryService {
  try {
    const { path: dbPath, isDefault } = getDatabasePath();
    const resolvedPath = resolve(dbPath);
    const dbExists = existsSync(resolvedPath);
    
    // Ensure config directory exists for default path
    if (isDefault) {
      ensureConfigDir();
    }
    
    // Log where the database is (helpful for debugging)
    if (!dbExists) {
      if (isDefault) {
        debugLog(`Creating database at default location: ${resolvedPath}`);
        debugLog(`To use a custom location, set MEMORY_DB in your MCP config.`);
      } else {
        debugLog(`Creating NEW database at: ${resolvedPath}`);
      }
    }
    
    const memoryService = new MemoryService(dbPath);
    memoryService.initialize();
    
    debugLog('Memory service initialized at:', resolvedPath);
    return memoryService;
  } catch (error) {
    // Fatal error - this should always show
    console.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

// Global references (initialized in main())
let memoryService: MemoryService;
let toolContext: ToolContext;

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: toolRegistry.getDefinitions(),
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  debugLog('Tool call:', name, 'with args:', args);
  
  try {
    const result = await toolRegistry.handle(name, args || {}, toolContext);
    return {
      content: [
        {
          type: 'text',
          text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    debugLog('Tool error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// List available prompts
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [],
  };
});

// Handle prompt requests
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  return {
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Simple Memory MCP Server does not provide prompts. Use tools: ${toolRegistry.getToolNames().join(', ')}`,
        },
      },
    ],
  };
});

// =============================================================================
// CLI HELPERS
// =============================================================================

// Execute GraphQL query helper
async function executeGraphQLQuery(query: string): Promise<any> {
  const result = await executeGraphQL({ query }, toolContext);
  return result;
}

// Start server or run CLI
async function main() {
  const args = process.argv.slice(2);
  
  // Check for --http or --both flags
  const useHttp = args.includes('--http') || args.includes('--both');
  const useBoth = args.includes('--both');
  const useStdio = !args.includes('--http') || useBoth;
  
  // Remove transport flags from args
  const cliArgs = args.filter(arg => arg !== '--http' && arg !== '--both');
  
  // Suppress debug output in CLI mode for cleaner output (must be set before service init)
  // But respect explicit MEMORY_DEBUG=true if user wants debug in CLI
  const isCliMode = cliArgs.length > 0;
  if (isCliMode && process.env.MEMORY_DEBUG !== 'true') {
    process.env.MEMORY_DEBUG = 'false';
  }
  
  // Initialize services (backup auto-configures from env vars)
  memoryService = initializeServices();
  
  // Create tool context
  toolContext = {
    memoryService,
    config: {}
  };
  
  if (cliArgs.length > 0) {
    // CLI mode - check for help first
    if (cliArgs[0] === '--help' || cliArgs[0] === '-h') {
      console.log(generateMainHelp());
      process.exit(0);
    }
    
    const command = cliArgs[0];
    const parsedArgs = parseCommandLineArgs(cliArgs.slice(1));
    
    // Check for command-specific help
    if (parsedArgs.help || parsedArgs.h) {
      console.log(generateCommandHelp(command));
      process.exit(0);
    }
    
    // Handle GraphQL shortcuts (search, store, update, get, related, delete, stats)
    if (isGraphQLShortcut(command)) {
      try {
        const query = buildGraphQLQuery(command, parsedArgs);
        
        // Show generated GraphQL if --verbose flag is set (helps users learn GraphQL)
        if (parsedArgs.verbose) {
          console.log('Generated GraphQL:', query);
          console.log('---');
        }
        
        const result = await executeGraphQLQuery(query);
        console.log(JSON.stringify(result, null, 2));
        process.exit(0);
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : error}`);
        console.log(`\nRun "simple-memory ${command} --help" for usage.`);
        process.exit(1);
      }
    }

    // Handle raw GraphQL (not a shortcut - uses its own query arg)
    if (command === 'graphql') {
      if (!parsedArgs.query) {
        console.error('Error: --query is required');
        console.log('\nRun "simple-memory graphql --help" for usage.');
        process.exit(1);
      }
      const result = await executeGraphQLQuery(parsedArgs.query as string);
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    }
    
    // Handle config command
    if (command === 'config') {
      const { getConfigPath, loadConfigFile, initConfigFile, getConfig } = await import('./utils/config.js');
      const configPath = getConfigPath();
      
      if (parsedArgs.path) {
        console.log(configPath);
        process.exit(0);
      }
      
      if (parsedArgs.init) {
        const { path, created } = initConfigFile();
        if (created) {
          console.log(`✅ Created config file: ${path}`);
          console.log('\nEdit this file to configure database, backups, and other settings.');
          console.log('Settings apply to all clients (CLI, MCP, etc.)');
        } else {
          console.log(`Config file already exists: ${path}`);
        }
        process.exit(0);
      }
      
      // Default: show current config
      console.log(`Config file: ${configPath}\n`);
      const config = getConfig();
      console.log('Current configuration:');
      console.log(JSON.stringify(config, null, 2));
      process.exit(0);
    }
    
    // CLI mode - check for integrity commands
    if (command === 'check-integrity') {
      const { path: dbPath } = getDatabasePath();
      console.log(`Database: ${dbPath}\n`);
      console.log('Running database integrity check...\n');
      const result = checkDatabaseIntegrity(dbPath);
      
      console.log('=== Integrity Check Results ===');
      console.log(`Total memories: ${result.totalMemories}`);
      console.log(`Corrupted hashes: ${result.corruptedHashes}`);
      console.log(`Orphaned hash indexes: ${result.orphanedHashIndexes}`);
      console.log(`Missing hash indexes: ${result.missingHashIndexes}`);
      
      if (result.orphanedMemories.length > 0) {
        console.log('\n⚠️  Issues found:');
        result.orphanedMemories.forEach(mem => {
          console.log(`  ID ${mem.id}: ${mem.hash}`);
          console.log(`    Content: ${mem.content}`);
        });
        console.log('\nRun "simple-memory rebuild-index" to rebuild the hash index');
      } else {
        console.log('\n✓ No integrity issues detected');
      }
      
      process.exit(result.orphanedMemories.length > 0 ? 1 : 0);
    }
    
    if (command === 'rebuild-index') {
      const { path: dbPath } = getDatabasePath();
      console.log(`Database: ${dbPath}\n`);
      rebuildHashIndex(dbPath);
      process.exit(0);
    }

    // Handle setup command - configures VS Code and Claude Desktop
    if (command === 'setup') {
      const { runSetup } = await import('./setup/configure-mcp-clients.js');
      runSetup();
      process.exit(0);
    }

    // Handle export/import (keep these as-is from tool registry)
    if (command === 'export-memory' || command === 'import-memory') {
      try {
        const parser = toolRegistry.getCliParser(command);
        const parsedArgs = parser ? parser(cliArgs.slice(1)) : {};
        const result = await toolRegistry.handle(command, parsedArgs, toolContext);
        console.log(JSON.stringify(result, null, 2));
        process.exit(0);
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    }

    // Unknown command
    console.error(`Unknown command: ${command}`);
    console.log(generateMainHelp());
    process.exit(1);
  } else {
    // MCP mode - connect transport(s)
    if (useHttp) {
      // HTTP transport mode
      const httpPort = parseInt(process.env.MCP_PORT || '3000', 10);
      const httpHost = process.env.MCP_HOST || 'localhost';
      
      const httpTransport = new StreamableHTTPServerTransport({
        port: httpPort,
        host: httpHost
      });
      
      try {
        await server.connect(httpTransport);
        console.log(`✅ Simple Memory MCP server running on HTTP: http://${httpHost}:${httpPort}/mcp`);
      } catch (error) {
        console.error('Failed to start HTTP transport:', error instanceof Error ? error.message : error);
        if (error instanceof Error && error.stack) {
          debugLog('Stack trace:', error.stack);
        }
        process.exit(1);
      }
    }
    
    if (useStdio) {
      // Stdio transport mode (default or hybrid)
      if (useBoth) {
        debugLog('🔌 Hybrid mode: stdio + HTTP');
        // Servers are already connected above in HTTP block
      } else {
        const transport = new StdioServerTransport();
        await server.connect(transport);
        debugLog('🔌 Simple Memory MCP server running on stdio');
      }
    }
  }
}

// Handle cleanup
const cleanup = () => {
  if (memoryService) {
    memoryService.close();
  }
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  cleanup();
});

main().catch((error) => {
  console.error('Fatal error:', error);
  cleanup();
});
