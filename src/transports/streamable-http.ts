/**
 * StreamableHTTPServerTransport - MCP transport over HTTP
 * 
 * Implements the MCP Server transport interface using HTTP instead of stdio.
 * Properly handles the async nature of MCP over synchronous HTTP.
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { debugLog } from '../utils/debug.js';

interface HTTPTransportOptions {
  port?: number;
  host?: string;
  timeout?: number; // Request timeout in ms
}

export class StreamableHTTPServerTransport {
  private port: number;
  private host: string;
  private timeout: number;
  private httpServer: any = null;
  
  // Map request IDs to their response handlers
  private pendingResponses = new Map<string | number, {
    resolve: (message: JSONRPCMessage) => void;
    timer: NodeJS.Timeout;
  }>();

  // Transport interface properties
  onmessage?: (message: JSONRPCMessage) => void;
  onclose?: () => void;
  onerror?: (error: Error) => void;

  constructor(options: HTTPTransportOptions = {}) {
    this.port = options.port || 3000;
    this.host = options.host || 'localhost';
    this.timeout = options.timeout || 30000; // 30 second default
  }

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

  async close(): Promise<void> {
    // Clear all pending responses
    for (const [id, pending] of this.pendingResponses) {
      clearTimeout(pending.timer);
      pending.resolve({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Server shutting down' },
        id
      });
    }
    this.pendingResponses.clear();

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
   * Send a message (response) back to the waiting HTTP request
   */
  async send(message: JSONRPCMessage): Promise<void> {
    debugLog('[HTTP Transport] Sending message:', message);
    
    // Check if this is a response to a pending request
    if ('id' in message && message.id !== null && message.id !== undefined) {
      const pending = this.pendingResponses.get(message.id);
      if (pending) {
        clearTimeout(pending.timer);
        this.pendingResponses.delete(message.id);
        pending.resolve(message);
      } else {
        debugLog('[HTTP Transport] No pending request for response:', message.id);
      }
    }
    // Notifications don't need handling in HTTP context
  }

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
      this.sendJSON(res, 200, { status: 'ok', transport: 'http' });
      return;
    }

    // MCP protocol endpoint
    if (req.url === '/mcp' && req.method === 'POST') {
      await this.handleMCPRequest(req, res);
      return;
    }

    // Unknown endpoint
    this.sendJSON(res, 404, { error: 'Not found' });
  }

  private async handleMCPRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const body = await this.readBody(req);
      const request = this.parseRequest(body);
      
      if (!request) {
        this.sendError(res, 400, -32700, 'Parse error');
        return;
      }

      debugLog('[HTTP Transport] Received request:', request);

      // Handle based on whether it's a request or notification
      if ('id' in request && request.id !== null) {
        // Request - expects a response
        const response = await this.waitForResponse(request);
        this.sendJSON(res, 200, response);
      } else {
        // Notification - no response expected
        if (this.onmessage) {
          this.onmessage(request);
        }
        res.writeHead(202);
        res.end();
      }
    } catch (error: any) {
      debugLog('[HTTP Transport] Request error:', error);
      if (!res.headersSent) {
        this.sendError(res, 500, -32603, error.message || 'Internal server error');
      }
    }
  }

  private async waitForResponse(request: JSONRPCMessage): Promise<JSONRPCMessage> {
    return new Promise((resolve) => {
      // Type narrowing - we know this request has an id because we checked before calling this method
      if (!('id' in request) || request.id === null || request.id === undefined) {
        resolve({
          jsonrpc: '2.0',
          error: { code: -32600, message: 'Invalid request - missing id' }
        } as JSONRPCMessage);
        return;
      }
      
      const id = request.id;
      
      // Set up timeout
      const timer = setTimeout(() => {
        this.pendingResponses.delete(id);
        resolve({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Request timeout' },
          id
        } as JSONRPCMessage);
      }, this.timeout);

      // Store the response handler
      this.pendingResponses.set(id, { resolve, timer });

      // Process the request
      if (this.onmessage) {
        this.onmessage(request);
      }
    });
  }

  private async readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = '';
      
      req.on('data', (chunk: Buffer) => {
        body += chunk.toString('utf-8');
        
        // Prevent body from growing too large (1MB limit)
        if (body.length > 1024 * 1024) {
          req.removeAllListeners();
          reject(new Error('Payload too large'));
        }
      });

      req.on('end', () => resolve(body));
      req.on('error', reject);
    });
  }

  private parseRequest(body: string): JSONRPCMessage | null {
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  }

  // Helper methods
  private sendJSON(res: ServerResponse, statusCode: number, data: any): void {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  private sendError(res: ServerResponse, statusCode: number, code: number, message: string, id: any = null): void {
    this.sendJSON(res, statusCode, {
      jsonrpc: '2.0',
      error: { code, message },
      id
    });
  }
}

export default StreamableHTTPServerTransport;
