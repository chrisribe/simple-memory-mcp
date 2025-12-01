// Tool registry for Simple Memory MCP Server

import type { Tool, ToolDefinition, ToolContext } from '../types/tools.js';

// Import memory tools
// GraphQL unified interface - replaces store/search/update/delete/stats
import { memoryGraphqlTool } from './memory-graphql/index.js';
// File I/O tools - kept separate (not suitable for GraphQL)
import { exportMemoryTool } from './export-memory/index.js';
import { importMemoryTool } from './import-memory/index.js';

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  constructor() {
    // GraphQL: unified interface for all CRUD + stats operations
    this.registerTool(memoryGraphqlTool);
    // File I/O: export/import are separate (backup/restore, not queries)
    this.registerTool(exportMemoryTool);
    this.registerTool(importMemoryTool);
  }

  private registerTool(tool: Tool): void {
    this.tools.set(tool.definition.name, tool);
  }

  getDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map(tool => tool.definition);
  }

  // Handle tool execution
  async handle(toolName: string, args: any, context: ToolContext): Promise<any> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    return await tool.handler(args, context);
  }

  getCliParser(toolName: string) {
    const tool = this.tools.get(toolName);
    return tool?.cliParser;
  }

  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  hasTool(toolName: string): boolean {
    return this.tools.has(toolName);
  }

  getCliMetadata(toolName: string) {
    const tool = this.tools.get(toolName);
    return tool?.cliMetadata;
  }
}

// Export singleton instance
export const toolRegistry = new ToolRegistry();
