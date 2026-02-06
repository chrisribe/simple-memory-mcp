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

  if (rawArgs.hashes) {
    result.hashes = (rawArgs.hashes as string).split(',').map((hash: string) => hash.trim());
  }
  
  if (rawArgs.daysAgo !== undefined) {
    result.daysAgo = parseInt(rawArgs.daysAgo as string, 10);
  }
  
  if (rawArgs.startDate) {
    result.startDate = rawArgs.startDate;
  }
  
  if (rawArgs.endDate) {
    result.endDate = rawArgs.endDate;
  }
  
  if (rawArgs.limit !== undefined) {
    result.limit = parseInt(rawArgs.limit as string, 10);
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
