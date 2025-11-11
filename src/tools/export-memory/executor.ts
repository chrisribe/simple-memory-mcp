import { writeFileSync } from 'fs';
import type { ToolContext, ExportFilters } from '../../types/tools.js';

export interface ExportMemoryResult {
  success: boolean;
  outputPath: string;
  totalMemories: number;
  exportedAt: string;
  source?: string;
}

export async function execute(args: any, context: ToolContext): Promise<ExportMemoryResult> {
  const { memoryService } = context;

  // Build filters
  const filters: ExportFilters = {};
  
  if (args.tags && args.tags.length > 0) {
    filters.tags = args.tags;
  }

  if (args.ids && args.ids.length > 0) {
    filters.ids = args.ids;
  }
  
  if (args.daysAgo !== undefined) {
    const date = new Date();
    date.setDate(date.getDate() - args.daysAgo);
    date.setHours(0, 0, 0, 0);
    filters.startDate = date;
  }
  
  if (args.startDate) {
    filters.startDate = new Date(args.startDate);
  }
  
  if (args.endDate) {
    filters.endDate = new Date(args.endDate);
  }
  
  if (args.limit) {
    filters.limit = args.limit;
  }

  // Export memories
  const exportData = memoryService.exportMemories(filters);
  
  // Override source if provided
  if (args.source) {
    exportData.source = args.source;
  }

  // Write to file
  const jsonString = JSON.stringify(exportData, null, 2);
  writeFileSync(args.output, jsonString, 'utf-8');

  return {
    success: true,
    outputPath: args.output,
    totalMemories: exportData.totalMemories,
    exportedAt: exportData.exportedAt,
    source: exportData.source
  };
}
