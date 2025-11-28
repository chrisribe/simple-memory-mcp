import { parseCommandLineArgs } from '../../utils/cli-parser.js';

export function parseCliArgs(args: string[]) {
  // PHASE 1: Convert string array to object (shared utility)
  const rawArgs = parseCommandLineArgs(args);

  // PHASE 2: Validate and transform (command-specific logic)
  const result: any = {
    includeRelated: false,
    relationshipDepth: 1,
    summaryOnly: false,
    contentPreview: 100
  };
  
  if (rawArgs.query) {
    result.query = rawArgs.query;
  }
  if (rawArgs.tags) {
    result.tags = (rawArgs.tags as string).split(',').map((tag: string) => tag.trim());
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
  if (rawArgs.summary !== undefined || rawArgs.summaryOnly !== undefined) {
    result.summaryOnly = rawArgs.summary || rawArgs.summaryOnly; // Already a boolean
  }
  if (rawArgs.previewLength !== undefined || rawArgs.contentPreview !== undefined) {
    const length = (rawArgs.previewLength || rawArgs.contentPreview) as number;
    // Clamp between 0-500
    result.contentPreview = Math.min(Math.max(length, 0), 500);
  }
  
  return result;
}
