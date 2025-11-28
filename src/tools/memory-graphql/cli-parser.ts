/**
 * CLI argument parser for memory-graphql tool
 * Usage: node dist/index.js memory-graphql --query "{ stats { totalMemories } }"
 */

import { parseCommandLineArgs } from '../../utils/cli-parser.js';

export function parseCliArgs(args: string[]) {
  const rawArgs = parseCommandLineArgs(args);

  if (!rawArgs.query) {
    throw new Error('Missing required argument: --query "<graphql query>"');
  }

  const result: any = {
    query: rawArgs.query
  };

  if (rawArgs.variables) {
    try {
      result.variables = JSON.parse(rawArgs.variables as string);
    } catch {
      throw new Error('--variables must be valid JSON');
    }
  }

  return result;
}
