import { parseCommandLineArgs } from '../../utils/cli-parser.js';

export function parseCliArgs(args: string[]) {
  // PHASE 1: Convert string array to object (shared utility)
  const rawArgs = parseCommandLineArgs(args);

  // PHASE 2: Validate and transform (command-specific logic)
  const result: any = {};
  
  if (rawArgs.hash) {
    result.hash = rawArgs.hash;
  }
  
  if (rawArgs.content) {
    result.content = rawArgs.content;
  }
  
  if (rawArgs.tags) {
    result.tags = (rawArgs.tags as string).split(',').map((tag: string) => tag.trim());
  }
  
  // Validation
  if (!result.hash) {
    throw new Error('--hash is required');
  }
  
  if (!result.content && !result.tags) {
    throw new Error('Must provide either --content or --tags to update');
  }
  
  return result;
}
