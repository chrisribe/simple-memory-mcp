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

import { MemoryService } from './services/memory-service.js';
import { toolRegistry } from './tools/index.js';
import type { ToolContext } from './types/tools.js';
import { debugLog } from './utils/debug.js';
import { checkDatabaseIntegrity, rebuildHashIndex } from './utils/db-integrity-check.js';
import { StreamableHTTPServerTransport } from './transports/streamable-http.js';

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
    const dbPath = process.env.MEMORY_DB || './memory.db';
    const memoryService = new MemoryService(dbPath);
    memoryService.initialize();
    
    debugLog('Memory service initialized');
    return memoryService;
  } catch (error) {
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

// Start server or run CLI
async function main() {
  const args = process.argv.slice(2);
  
  // Check for --http or --both flags
  const useHttp = args.includes('--http') || args.includes('--both');
  const useBoth = args.includes('--both');
  const useStdio = !args.includes('--http') || useBoth;
  
  // Remove transport flags from args
  const cliArgs = args.filter(arg => arg !== '--http' && arg !== '--both');
  
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
      const toolNames = toolRegistry.getToolNames();
      console.log('simple-memory - Persistent memory storage for LLMs\n');
      console.log('Usage: simple-memory <command> [options]\n');
      console.log('Commands:');
      toolNames.forEach(name => console.log(`  ${name}`));
      console.log('  check-integrity    Check database integrity');
      console.log('  rebuild-index      Rebuild hash index');
      console.log('\nRun "simple-memory <command> --help" for command-specific options.');
      process.exit(0);
    }
    
    // CLI mode - check for integrity commands
    if (cliArgs[0] === 'check-integrity') {
      const dbPath = process.env.MEMORY_DB || './memory.db';
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
        console.log('\nRun "node dist/index.js rebuild-index" to rebuild the hash index');
      } else {
        console.log('\n✓ No integrity issues detected');
      }
      
      process.exit(result.orphanedMemories.length > 0 ? 1 : 0);
    } else if (cliArgs[0] === 'rebuild-index') {
      const dbPath = process.env.MEMORY_DB || './memory.db';
      rebuildHashIndex(dbPath);
      process.exit(0);
    }
    
    const [commandName, ...commandArgs] = cliArgs;
    
    // Tool execution
    if (!toolRegistry.hasTool(commandName)) {
      console.error(`Unknown command: ${commandName}`);
      console.log('\nAvailable commands: ' + toolRegistry.getToolNames().join(', '));
      process.exit(1);
    }
    
    try {
      const parser = toolRegistry.getCliParser(commandName);
      const parsedArgs = parser ? parser(commandArgs) : {};
      const result = await toolRegistry.handle(commandName, parsedArgs, toolContext);
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
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
