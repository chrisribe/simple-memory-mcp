/**
 * GraphQL executor for memory-graphql MCP tool
 */

import { graphql } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import type { ToolContext } from '../../types/tools.js';
import { typeDefs } from '../../graphql/schema.js';
import { createResolvers } from '../../graphql/resolvers.js';
import type { MemoryService } from '../../services/memory-service.js';

interface MemoryGraphqlArgs {
  query: string;
  variables?: Record<string, any>;
}

interface MemoryGraphqlResult {
  data?: any;
  errors?: Array<{ message: string; path?: string[] }>;
}

// Cache schema per memoryService instance to avoid rebuilding on every call
const schemaCache = new WeakMap<MemoryService, ReturnType<typeof makeExecutableSchema>>();

function getOrCreateSchema(memoryService: MemoryService) {
  let schema = schemaCache.get(memoryService);
  if (!schema) {
    const resolvers = createResolvers(memoryService);
    schema = makeExecutableSchema({ typeDefs, resolvers });
    schemaCache.set(memoryService, schema);
  }
  return schema;
}

export async function execute(args: MemoryGraphqlArgs, context: ToolContext): Promise<MemoryGraphqlResult> {
  if (!args.query || typeof args.query !== 'string') {
    return {
      errors: [{ message: 'Query is required and must be a string' }]
    };
  }

  try {
    // Get cached schema or create new one for this memoryService
    const schema = getOrCreateSchema(context.memoryService);

    // Execute the GraphQL query
    const result = await graphql({
      schema,
      source: args.query,
      variableValues: args.variables || {}
    });

    // Format response
    const response: MemoryGraphqlResult = {};
    
    if (result.data) {
      response.data = result.data;
    }
    
    if (result.errors && result.errors.length > 0) {
      response.errors = result.errors.map(err => ({
        message: err.message,
        path: err.path?.map(String)
      }));
    }

    return response;
  } catch (error: any) {
    return {
      errors: [{ message: `GraphQL execution error: ${error.message}` }]
    };
  }
}
