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
// CLI SHORTCUTS - Simple commands that generate GraphQL queries
// =============================================================================

// Helper to escape GraphQL strings
function escapeGraphQL(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

// Helper to process tags for GraphQL
function processTagsForGraphQL(tags: string): string {
  return tags.split(',').map((t: string) => `"${t.trim()}"`).join(', ');
}

// Simple shortcut definitions - maps commands to GraphQL query builders
const CLI_SHORTCUTS: Record<string, (args: any) => string> = {
  search: (args: any) => {
    const limit = args.limit || 10;
    const parts = [`limit: ${limit}`];
    if (args.query) parts.push(`query: "${escapeGraphQL(args.query)}"`);
    if (args.tags) {
      parts.push(`tags: [${processTagsForGraphQL(args.tags)}]`);
    }
    if (args.daysAgo) parts.push(`daysAgo: ${args.daysAgo}`);
    if (args.summary) parts.push(`summaryOnly: true`);
    
    const fields = args.summary 
      ? 'hash title preview tags createdAt'
      : 'hash title content tags createdAt';
    
    return `{ memories(${parts.join(', ')}) { ${fields} } }`;
  },

  store: (args: any) => {
    if (!args.content) throw new Error('--content is required');
    const tagsArg = args.tags ? `, tags: [${processTagsForGraphQL(args.tags)}]` : '';
    return `mutation { store(content: "${escapeGraphQL(args.content)}"${tagsArg}) { success hash } }`;
  },

  update: (args: any) => {
    if (!args.hash) throw new Error('--hash is required');
    if (!args.content) throw new Error('--content is required');
    const tagsArg = args.tags ? `, tags: [${processTagsForGraphQL(args.tags)}]` : '';
    return `mutation { update(hash: "${args.hash}", content: "${escapeGraphQL(args.content)}"${tagsArg}) { success newHash } }`;
  },

  get: (args: any) => {
    if (!args.hash) throw new Error('--hash is required');
    return `{ memory(hash: "${args.hash}") { hash content tags createdAt } }`;
  },

  related: (args: any) => {
    if (!args.hash) throw new Error('--hash is required');
    const limit = args.limit || 10;
    return `{ related(hash: "${args.hash}", limit: ${limit}) { hash title tags } }`;
  },

  delete: (args: any) => {
    if (args.hash) {
      return `mutation { delete(hash: "${args.hash}") { success deletedCount } }`;
    } else if (args.tag) {
      return `mutation { delete(tag: "${args.tag}") { success deletedCount } }`;
    }
    throw new Error('Either --hash or --tag is required');
  },

  stats: () => {
    return `{ stats { version totalMemories totalRelationships dbSize dbPath schemaVersion configPath mcpConfigPaths { name path exists } } }`;
  },
};

// Parse CLI args helper - simple argument parser
function parseCliArgs(args: string[]): Record<string, any> {
  const result: Record<string, any> = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      result.help = true;
      continue;
    }
    
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];
      
      // Check if next arg exists and is not another flag
      if (nextArg && !nextArg.startsWith('--')) {
        result[key] = nextArg;
        i++; // skip next arg
      } else {
        // Boolean flag (no value or next arg is another flag)
        result[key] = true;
      }
    }
  }
  
  return result;
}

// Show general help
function showHelp() {
  console.log(`
simple-memory - Persistent memory storage for LLMs

USAGE:
  simple-memory <command> [options]

QUICK COMMANDS:
  search        Search memories by content or tags
  store         Store a new memory
  update        Update an existing memory
  get           Get a memory by hash
  related       Find related memories
  delete        Delete a memory
  stats         Show database statistics

CONFIGURATION:
  config           Show or initialize config file

ADVANCED:
  graphql          Execute raw GraphQL query
  export-memory    Export memories to JSON
  import-memory    Import memories from JSON
  check-integrity  Check database integrity
  rebuild-index    Rebuild hash index

Run "simple-memory <command> --help" for command-specific options.

EXAMPLES:
  simple-memory search --query "typescript" --limit 5
  simple-memory store --content "Remember this" --tags "note,important"
  simple-memory stats
  simple-memory get --hash "abc123..."
  simple-memory delete --tag "temporary"
`);
}

// Show command-specific help
function showCommandHelp(command: string) {
  const help: Record<string, string> = {
    search: `
simple-memory search - Search memories

OPTIONS:
  --query <text>      Full-text search query
  --tags <tags>       Filter by tags (comma-separated)
  --limit <n>         Max results [default: 10]
  --daysAgo <n>       Filter to last N days
  --summary           Return summaries only (faster)
  --verbose           Show generated GraphQL query

EXAMPLES:
  simple-memory search --query "typescript"
  simple-memory search --tags "project,work" --limit 20
  simple-memory search --query "bug" --daysAgo 7
  simple-memory search --query "api" --verbose
`,
    store: `
simple-memory store - Store a new memory

OPTIONS:
  --content <text>    Content to store (required)
  --tags <tags>       Tags (comma-separated)
  --verbose           Show generated GraphQL query

EXAMPLES:
  simple-memory store --content "Remember this note"
  simple-memory store --content "API key: xyz" --tags "credentials,api"
`,
    update: `
simple-memory update - Update existing memory

OPTIONS:
  --hash <hash>       Memory hash (required)
  --content <text>    New content (required)
  --tags <tags>       New tags (replaces existing)

EXAMPLES:
  simple-memory update --hash "abc123" --content "Updated content"
`,
    get: `
simple-memory get - Get memory by hash

OPTIONS:
  --hash <hash>       Memory hash (required)

EXAMPLES:
  simple-memory get --hash "abc123..."
`,
    related: `
simple-memory related - Find related memories

OPTIONS:
  --hash <hash>       Memory hash (required)
  --limit <n>         Max results [default: 10]

EXAMPLES:
  simple-memory related --hash "abc123..."
`,
    delete: `
simple-memory delete - Delete memory

OPTIONS:
  --hash <hash>       Delete specific memory
  --tag <tag>         Delete all with this tag (use ONE only)

EXAMPLES:
  simple-memory delete --hash "abc123..."
  simple-memory delete --tag "temporary"
`,
    stats: `
simple-memory stats - Show database statistics

No options needed.

EXAMPLES:
  simple-memory stats
`,
    graphql: `
simple-memory graphql - Execute raw GraphQL query

OPTIONS:
  --query <graphql>   GraphQL query or mutation (required)

EXAMPLES:
  simple-memory graphql --query '{ stats { totalMemories } }'
  simple-memory graphql --query '{ memories(limit: 5) { hash title tags } }'
  simple-memory graphql --query 'mutation { store(content: "text") { hash } }'
`,
    config: `
simple-memory config - Show or initialize configuration

OPTIONS:
  --init              Create default config.json with examples
  --show              Show current config (default)
  --path              Show path to config file only

EXAMPLES:
  simple-memory config                # Show current configuration
  simple-memory config --init         # Create config.json with examples
  simple-memory config --path         # Print config file path

CONFIG FILE:
  Location: ~/.simple-memory/config.json

  Settings in config.json apply to ALL clients (CLI, MCP, etc.)
  Environment variables can override for specific contexts.
`,
  };

  console.log(help[command] || 'No help available for this command.');
}

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
      showHelp();
      process.exit(0);
    }
    
    const command = cliArgs[0];
    
    // Handle shortcuts
    if (command in CLI_SHORTCUTS) {
      const parsedArgs = parseCliArgs(cliArgs.slice(1));
      
      if (parsedArgs.help) {
        showCommandHelp(command);
        process.exit(0);
      }
      
      try {
        const query = CLI_SHORTCUTS[command](parsedArgs);
        
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

    // Handle raw GraphQL
    if (command === 'graphql') {
      const parsedArgs = parseCliArgs(cliArgs.slice(1));
      
      if (parsedArgs.help) {
        showCommandHelp('graphql');
        process.exit(0);
      }
      
      if (!parsedArgs.query) {
        console.error('Error: --query is required');
        console.log('\nRun "simple-memory graphql --help" for usage.');
        process.exit(1);
      }
      const result = await executeGraphQLQuery(parsedArgs.query);
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    }
    
    // Handle config command
    if (command === 'config') {
      const parsedArgs = parseCliArgs(cliArgs.slice(1));
      
      if (parsedArgs.help) {
        showCommandHelp('config');
        process.exit(0);
      }
      
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
    showHelp();
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
