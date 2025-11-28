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
  
  // Hash lookup (direct retrieval by hash)
  if (rawArgs.hash) {
    result.hash = rawArgs.hash as string;
  }
  
  if (rawArgs.query) {
    result.query = rawArgs.query;
  }
  if (rawArgs.tags) {
    result.tags = (rawArgs.tags as string).split(',').map((tag: string) => tag.trim());
  }
  if (rawArgs.limit) {
    result.limit = parseInt(rawArgs.limit as string, 10);
  }
  if (rawArgs.includeRelated !== undefined) {
    result.includeRelated = rawArgs.includeRelated; // Already a boolean
  }
  if (rawArgs.relationshipDepth !== undefined) {
    const depth = parseInt(rawArgs.relationshipDepth as string, 10);
    result.relationshipDepth = Math.min(Math.max(depth, 1), 3); // Clamp between 1-3
  }
  if (rawArgs.daysAgo !== undefined) {
    result.daysAgo = parseInt(rawArgs.daysAgo as string, 10);
  }
  if (rawArgs.startDate) {
    result.startDate = rawArgs.startDate as string;
  }
  if (rawArgs.endDate) {
    result.endDate = rawArgs.endDate as string;
  }
  if (rawArgs.minRelevance !== undefined) {
    const relevance = parseFloat(rawArgs.minRelevance as string);
    // Clamp between 0-1
    result.minRelevance = Math.min(Math.max(relevance, 0), 1);
  }
  if (rawArgs.summary !== undefined || rawArgs.summaryOnly !== undefined) {
    result.summaryOnly = rawArgs.summary || rawArgs.summaryOnly; // Already a boolean
  }
  if (rawArgs.previewLength !== undefined || rawArgs.contentPreview !== undefined) {
    const length = parseInt((rawArgs.previewLength || rawArgs.contentPreview) as string, 10);
    // Clamp between 0-500
    result.contentPreview = Math.min(Math.max(length, 0), 500);
  }
  
  return result;
}
