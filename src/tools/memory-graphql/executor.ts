/**
 * GraphQL executor for memory-graphql MCP tool
 */

import { graphql, buildSchema } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import type { ToolContext } from '../../types/tools.js';
import { typeDefs } from '../../graphql/schema.js';
import { createResolvers } from '../../graphql/resolvers.js';

interface MemoryGraphqlArgs {
  query: string;
  variables?: Record<string, any>;
}

interface MemoryGraphqlResult {
  data?: any;
  errors?: Array<{ message: string; path?: string[] }>;
}

// Cache the schema (created once per process)
let cachedSchema: ReturnType<typeof makeExecutableSchema> | null = null;

export async function execute(args: MemoryGraphqlArgs, context: ToolContext): Promise<MemoryGraphqlResult> {
  if (!args.query || typeof args.query !== 'string') {
    return {
      errors: [{ message: 'Query is required and must be a string' }]
    };
  }

  try {
    // Create schema with resolvers bound to this context's memoryService
    // We recreate resolvers each time to ensure they use the current context
    const resolvers = createResolvers(context.memoryService);
    
    // Build executable schema (could cache if performance becomes an issue)
    const schema = makeExecutableSchema({
      typeDefs,
      resolvers
    });

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
