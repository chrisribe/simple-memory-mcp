/**
 * StreamableHTTPServerTransport - MCP transport over HTTP
 * 
 * Implements the MCP Server transport interface using HTTP instead of stdio.
 * Supports multiple clients connecting via HTTP POST requests.
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { debugLog } from '../utils/debug.js';

interface HTTPTransportOptions {
  port?: number;
  host?: string;
}

/**
 * Simple request-scoped response buffer for storing responses
 * Each HTTP request gets its own buffer to collect responses
 */
class ResponseBuffer {
  private responses: JSONRPCMessage[] = [];

  add(message: JSONRPCMessage): void {
    this.responses.push(message);
  }

  getAll(): JSONRPCMessage[] {
    return this.responses;
  }
}

// Thread-local style buffer (request-scoped)
let currentBuffer: ResponseBuffer | null = null;

/**
 * Helper functions for HTTP responses
 */
function sendJSON(res: ServerResponse, statusCode: number, data: any): void {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function sendError(res: ServerResponse, statusCode: number, code: number, message: string, id: any = null): void {
  sendJSON(res, statusCode, {
    jsonrpc: '2.0',
    error: { code, message },
    id
  });
}

function sendSuccess(res: ServerResponse, data: any): void {
  sendJSON(res, 200, data);
}

function sendNotFound(res: ServerResponse): void {
  sendJSON(res, 404, { error: 'Not found' });
}

function sendPayloadTooLarge(res: ServerResponse): void {
  sendJSON(res, 413, {
    error: 'Payload too large',
    code: -32600
  });
}

function sendAccepted(res: ServerResponse): void {
  res.writeHead(202);
  res.end();
}

export class StreamableHTTPServerTransport {
  private port: number;
  private host: string;
  private httpServer: any = null;

  // Transport interface properties (standard MCP interface)
  onmessage?: (message: JSONRPCMessage) => void;
  onclose?: () => void;
  onerror?: (error: Error) => void;

  constructor(options: HTTPTransportOptions = {}) {
    this.port = options.port || 3000;
    this.host = options.host || 'localhost';
  }

  /**
   * Start the HTTP server
   */
  async start(): Promise<void> {
    if (this.httpServer) {
      throw new Error('Server already started');
    }

    return new Promise((resolve, reject) => {
      this.httpServer = createServer(this.handleRequest.bind(this));
      
      this.httpServer.once('error', (error: any) => {
        this.httpServer = null;
        if (error.code === 'EADDRINUSE') {
          reject(new Error(`Port ${this.port} is already in use`));
        } else {
          reject(error);
        }
      });

      this.httpServer.once('listening', () => {
        console.log(`✅ HTTP MCP Transport listening on http://${this.host}:${this.port}/mcp`);
        resolve();
      });

      this.httpServer.listen(this.port, this.host);
    });
  }

  /**
   * Close the HTTP server
   */
  async close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.httpServer) {
        this.httpServer.close(() => {
          console.log('✓ HTTP MCP Transport closed');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Send a message to the client
   * In HTTP mode, responses are buffered and sent in the response body
   */
  async send(message: JSONRPCMessage): Promise<void> {
    debugLog('[HTTP Transport] Sending message:', message);
    
    // If we're in a request context, buffer the response
    if (currentBuffer) {
      currentBuffer.add(message);
    } else {
      debugLog('[HTTP Transport] Warning: send() called outside of request context');
    }
  }

  /**
   * Handle incoming HTTP requests
   */
  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle OPTIONS requests
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Health check endpoint
    if (req.url === '/health' && req.method === 'GET') {
      sendSuccess(res, { status: 'ok', transport: 'http' });
      return;
    }

    // MCP protocol endpoint
    if (req.url === '/mcp' && req.method === 'POST') {
      await this.handleMCPRequest(req, res);
      return;
    }

    // Unknown endpoint
    sendNotFound(res);
  }

  /**
   * Handle MCP protocol POST requests
   */
  private async handleMCPRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    let body = '';

    // Read request body
    req.on('data', (chunk: Buffer) => {
        body += chunk.toString('utf-8');

        // Prevent body from growing too large
        if (body.length > 1024 * 1024) {
          req.removeAllListeners('data');
          sendPayloadTooLarge(res);
        }
      });

      req.on('end', async () => {
        try {
          // Parse JSON-RPC request
          let request: JSONRPCMessage;

          try {
            request = JSON.parse(body);
            debugLog('[HTTP Transport] Received request:', request);
          } catch (parseError) {
            debugLog('[HTTP Transport] Parse error:', parseError);
            sendError(res, 400, -32700, 'Parse error');
            return;
          }

          // Create response buffer for this request
          const buffer = new ResponseBuffer();
          currentBuffer = buffer;

          try {
            // Call the message handler (set by MCP Server)
            if (this.onmessage) {
              this.onmessage(request);
              
              // Wait for handler to process and buffer responses
              // TODO: Replace with proper async handling
              await new Promise(resolve => setTimeout(resolve, 100));
            }

            // Send buffered responses
            const responses = buffer.getAll();

            if (responses.length > 0) {
              sendJSON(res, 200, responses.length === 1 ? responses[0] : responses);
            } else {
              // No response (notification or async processing)
              sendAccepted(res);
            }
          } finally {
            currentBuffer = null;
          }
        } catch (error: any) {
          debugLog('[HTTP Transport] Request error:', error);

          if (!res.headersSent) {
            sendError(res, 500, -32603, error.message || 'Internal server error');
          }
        }
      });

    req.on('error', (error: Error) => {
      debugLog('[HTTP Transport] Request error:', error);
      if (!res.headersSent) {
        sendError(res, 400, -32600, 'Invalid request');
      }
    });
  }
}

export default StreamableHTTPServerTransport;
