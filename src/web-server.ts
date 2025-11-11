#!/usr/bin/env node

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { MemoryService } from './services/memory-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = parseInt(process.env.WEB_PORT || '3000', 10);
const dbPath = process.env.MEMORY_DB || './memory.db';

// Validate database exists
if (!existsSync(dbPath)) {
  console.error(`❌ Error: Database not found at: ${dbPath}`);
  console.error(`\nPlease set MEMORY_DB environment variable or create the database first.`);
  process.exit(1);
}

// Initialize memory service with error handling
let memoryService: MemoryService;
try {
  memoryService = new MemoryService(dbPath);
  memoryService.initialize();
  console.log(`✓ Database connected: ${dbPath}`);
} catch (error: any) {
  console.error(`❌ Failed to initialize database: ${error.message}`);
  process.exit(1);
}

console.log(`\n🧠 Memory Browser Server`);
console.log(`📊 Database: ${dbPath}`);
console.log(`🌐 Server: http://localhost:${PORT}`);
console.log(`\n💡 Press Ctrl+C to stop\n`);


// Helper to send JSON response
function sendJSON(res: ServerResponse, data: any, status = 200) {
  res.writeHead(status, { 
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(data));
}

// Helper to send error response
function sendError(res: ServerResponse, message: string, status = 500) {
  console.error(`[${new Date().toISOString()}] Error: ${message}`);
  sendJSON(res, { error: message }, status);
}

// Helper to parse URL query parameters
function parseQuery(url: string): URLSearchParams {
  const queryStart = url.indexOf('?');
  if (queryStart === -1) return new URLSearchParams();
  return new URLSearchParams(url.substring(queryStart));
}

// Request logger middleware
function logRequest(req: IncomingMessage) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
}

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  logRequest(req);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  try {
    if (!req.url) {
      sendError(res, 'Invalid request', 400);
      return;
    }

    // Serve HTML file
    if (req.url === '/' || req.url === '/index.html') {
      try {
        const htmlPath = join(__dirname, '..', 'web', 'memory-browser.html');
        
        if (!existsSync(htmlPath)) {
          sendError(res, 'HTML file not found', 404);
          return;
        }

        const html = readFileSync(htmlPath, 'utf-8');
        
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
      } catch (error: any) {
        sendError(res, `Failed to load HTML: ${error.message}`, 500);
        return;
      }
    }

    // Serve CSS file
    if (req.url === '/styles.css') {
      try {
        const cssPath = join(__dirname, '..', 'web', 'styles.css');
        
        if (!existsSync(cssPath)) {
          sendError(res, 'CSS file not found', 404);
          return;
        }

        const css = readFileSync(cssPath, 'utf-8');
        
        res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' });
        res.end(css);
        return;
      } catch (error: any) {
        sendError(res, `Failed to load CSS: ${error.message}`, 500);
        return;
      }
    }

    // Serve JavaScript file
    if (req.url === '/app.js') {
      try {
        const jsPath = join(__dirname, '..', 'web', 'app.js');
        
        if (!existsSync(jsPath)) {
          sendError(res, 'JavaScript file not found', 404);
          return;
        }

        const js = readFileSync(jsPath, 'utf-8');
        
        res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
        res.end(js);
        return;
      } catch (error: any) {
        sendError(res, `Failed to load JavaScript: ${error.message}`, 500);
        return;
      }
    }

    // API endpoints
    if (req.url.startsWith('/api/')) {
      const path = req.url.replace('/api', '');
      const pathWithoutQuery = path.split('?')[0];

      // GET /api/memories - Get all memories with optional filters
      if (pathWithoutQuery === '/memories') {
        try {
          const params = parseQuery(req.url);
          const limit = Math.min(parseInt(params.get('limit') || '100', 10), 10000);
          const query = params.get('query') || undefined;
          const tag = params.get('tag') || undefined;

          const memories = memoryService.search(
            query,
            tag ? [tag] : undefined,
            undefined,
            limit
          );

          sendJSON(res, { 
            memories,
            count: memories.length,
            limit 
          });
        } catch (error: any) {
          sendError(res, `Search failed: ${error.message}`, 500);
        }
        return;
      }

      // GET /api/stats - Get database statistics
      if (pathWithoutQuery === '/stats') {
        try {
          const stats = memoryService.stats();
          
          // Format database size for display
          const formatBytes = (bytes: number): string => {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
          };
          
          sendJSON(res, {
            ...stats,
            dbSize: formatBytes(stats.dbSize)
          });
        } catch (error: any) {
          sendError(res, `Stats failed: ${error.message}`, 500);
        }
        return;
      }

      // GET /api/memory/:hash - Get memory by hash
      if (pathWithoutQuery.startsWith('/memory/')) {
        try {
          const hash = pathWithoutQuery.replace('/memory/', '');
          
          if (!hash || hash.length < 8) {
            sendError(res, 'Invalid memory hash', 400);
            return;
          }

          const memory = memoryService.getByHash(hash);
          
          if (!memory) {
            sendError(res, 'Memory not found', 404);
            return;
          }

          sendJSON(res, memory);
        } catch (error: any) {
          sendError(res, `Failed to fetch memory: ${error.message}`, 500);
        }
        return;
      }

      // Unknown API endpoint
      sendError(res, `API endpoint not found: ${pathWithoutQuery}`, 404);
      return;
    }

    // 404 for all other paths
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');

  } catch (error: any) {
    console.error('[FATAL] Unhandled error:', error);
    if (!res.headersSent) {
      sendError(res, 'Internal server error', 500);
    }
  }
});


// Error handling for server
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n❌ Error: Port ${PORT} is already in use`);
    console.error(`   Try a different port: WEB_PORT=3001 node dist/web-server.js\n`);
  } else {
    console.error(`\n❌ Server error: ${error.message}\n`);
  }
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`✓ Server started successfully`);
  console.log(`\n📖 Open in browser: http://localhost:${PORT}`);
  console.log(`\n🔧 Environment:`);
  console.log(`   MEMORY_DB=${dbPath}`);
  console.log(`   WEB_PORT=${PORT}`);
  console.log('');
});

// Graceful shutdown
let isShuttingDown = false;

function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log('\n\n🛑 Shutting down gracefully...');
  
  server.close(() => {
    console.log('✓ HTTP server closed');
    
    try {
      memoryService.close();
      console.log('✓ Database connection closed');
    } catch (error: any) {
      console.error(`⚠️  Error closing database: ${error.message}`);
    }
    
    console.log('\n👋 Goodbye!\n');
    process.exit(0);
  });
  
  // Force shutdown after 5 seconds
  setTimeout(() => {
    console.error('\n⚠️  Forced shutdown after timeout\n');
    process.exit(1);
  }, 5000);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('\n❌ Uncaught Exception:', error);
  shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n❌ Unhandled Rejection at:', promise, 'reason:', reason);
  shutdown();
});
