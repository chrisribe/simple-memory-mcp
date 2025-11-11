import { parseCommandLineArgs } from '../../utils/cli-parser.js';

export function parseCliArgs(args: string[]) {
  // PHASE 1: Convert string array to object (shared utility)
  const rawArgs = parseCommandLineArgs(args);

  // PHASE 2: Validate and transform (command-specific logic)
  const result: any = {
    includeRelated: false,
    relationshipDepth: 1
  };
  
  if (rawArgs.query) {
    result.query = rawArgs.query;
  }
  if (rawArgs.tags) {
    result.tags = (rawArgs.tags as string).split(',').map((tag: string) => tag.trim());
  }
  if (rawArgs.ids) {
    // Handle both string (comma-separated) and number (single value)
    if (typeof rawArgs.ids === 'string') {
      result.ids = rawArgs.ids.split(',').map((id: string) => parseInt(id.trim(), 10));
    } else if (typeof rawArgs.ids === 'number') {
      result.ids = [rawArgs.ids];
    } else if (Array.isArray(rawArgs.ids)) {
      result.ids = rawArgs.ids.map((id: any) => typeof id === 'number' ? id : parseInt(id, 10));
    }
  }
  if (rawArgs.limit) {
    result.limit = rawArgs.limit; // Already a number
  }
  if (rawArgs.includeRelated !== undefined) {
    result.includeRelated = rawArgs.includeRelated; // Already a boolean
  }
  if (rawArgs.relationshipDepth !== undefined) {
    const depth = rawArgs.relationshipDepth as number;
    result.relationshipDepth = Math.min(Math.max(depth, 1), 3); // Clamp between 1-3
  }
  if (rawArgs.daysAgo !== undefined) {
    result.daysAgo = rawArgs.daysAgo; // Already a number
  }
  if (rawArgs.startDate) {
    result.startDate = rawArgs.startDate as string;
  }
  if (rawArgs.endDate) {
    result.endDate = rawArgs.endDate as string;
  }
  if (rawArgs.minRelevance !== undefined) {
    const relevance = rawArgs.minRelevance as number;
    // Clamp between 0-1
    result.minRelevance = Math.min(Math.max(relevance, 0), 1);
  }
  
  return result;
}
