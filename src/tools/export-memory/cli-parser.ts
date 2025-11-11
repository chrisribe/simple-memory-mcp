import { parseCommandLineArgs } from '../../utils/cli-parser.js';

export function parseCliArgs(args: string[]) {
  // PHASE 1: Convert string array to object (shared utility)
  const rawArgs = parseCommandLineArgs(args);

  // PHASE 2: Validate and transform (command-specific logic)
  const result: any = {};
  
  if (rawArgs.output) {
    result.output = rawArgs.output;
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
  
  if (rawArgs.daysAgo !== undefined) {
    result.daysAgo = rawArgs.daysAgo; // Already a number
  }
  
  if (rawArgs.startDate) {
    result.startDate = rawArgs.startDate;
  }
  
  if (rawArgs.endDate) {
    result.endDate = rawArgs.endDate;
  }
  
  if (rawArgs.limit !== undefined) {
    result.limit = rawArgs.limit; // Already a number
  }
  
  if (rawArgs.source) {
    result.source = rawArgs.source;
  }
  
  // Validation
  if (!result.output) {
    throw new Error('--output is required');
  }
  
  return result;
}
