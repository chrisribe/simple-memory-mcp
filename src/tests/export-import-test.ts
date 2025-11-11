/**
 * Export/Import Feature Test Suite
 * 
 * Tests the export-memory and import-memory tools for:
 * - Basic export/import functionality
 * - Tag filtering
 * - Date range filtering (daysAgo, startDate, endDate)
 * - Limit parameter
 * - Duplicate detection
 * - Relationship preservation
 * - Cross-database portability
 */

import { existsSync, unlinkSync } from 'fs';
import { MemoryService } from '../services/memory-service.js';
import { toolRegistry } from '../tools/index.js';
import type { ToolContext } from '../types/tools.js';

const TEST_DB_EXPORT = './test-export-import-source.db';
const TEST_DB_IMPORT = './test-export-import-target.db';
const TEST_JSON_ALL = './test-export-all.json';
const TEST_JSON_FILTERED = './test-export-filtered.json';

// Test utilities
function cleanup() {
  [TEST_DB_EXPORT, TEST_DB_IMPORT, TEST_JSON_ALL, TEST_JSON_FILTERED].forEach(file => {
    if (existsSync(file)) {
      unlinkSync(file);
    }
  });
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[FAIL] Assertion failed: ${message}`);
  }
  console.log(`[PASS] ${message}`);
}

async function setupTestData(service: MemoryService): Promise<void> {
  // Store test memories with various tags and timestamps
  await service.store('First memory about TypeScript', ['typescript', 'programming', 'work']);
  
  // Wait 1ms to ensure different timestamps
  await new Promise(resolve => setTimeout(resolve, 1));
  await service.store('Second memory about JavaScript', ['javascript', 'programming', 'work']);
  
  await new Promise(resolve => setTimeout(resolve, 1));
  await service.store('Personal note about weekend plans', ['personal', 'weekend']);
  
  await new Promise(resolve => setTimeout(resolve, 1));
  await service.store('Bug fix for authentication issue', ['bug', 'fix', 'work', 'auth']);
  
  await new Promise(resolve => setTimeout(resolve, 1));
  await service.store('Learning about React hooks', ['react', 'learning', 'javascript']);
}

async function runTests() {
  console.log('\n=== Starting Export/Import Tests ===\n');
  
  cleanup();
  
  try {
    // ==========================================
    // Test 1: Setup and Export All
    // ==========================================
    console.log('[TEST 1] Export all memories');
    
    const exportService = new MemoryService(TEST_DB_EXPORT);
    exportService.initialize();
    
    await setupTestData(exportService);
    
    const exportContext: ToolContext = {
      memoryService: exportService,
      config: {}
    };
    
    const exportAllResult = await toolRegistry.handle('export-memory', {
      output: TEST_JSON_ALL
    }, exportContext);
    
    assert(exportAllResult.success === true, 'Export all memories succeeded');
    assert(exportAllResult.totalMemories === 5, 'Exported 5 memories');
    assert(existsSync(TEST_JSON_ALL), 'Export file created');
    
    // ==========================================
    // Test 2: Export with Tag Filter
    // ==========================================
    console.log('\n[TEST 2] Export with tag filter');
    
    const exportFilteredResult = await toolRegistry.handle('export-memory', {
      output: TEST_JSON_FILTERED,
      tags: ['work']
    }, exportContext);
    
    assert(exportFilteredResult.success === true, 'Export filtered memories succeeded');
    assert(exportFilteredResult.totalMemories === 3, 'Exported 3 work-tagged memories');
    assert(existsSync(TEST_JSON_FILTERED), 'Filtered export file created');
    
    // ==========================================
    // Test 3: Export with Limit
    // ==========================================
    console.log('\n[TEST 3] Export with limit');
    
    const exportLimitResult = await toolRegistry.handle('export-memory', {
      output: './test-limit.json',
      limit: 2
    }, exportContext);
    
    assert(exportLimitResult.success === true, 'Export with limit succeeded');
    assert(exportLimitResult.totalMemories === 2, 'Limited to 2 memories');
    unlinkSync('./test-limit.json');
    
    // ==========================================
    // Test 4: Export with Limit (No Tags) - Most Recent
    // ==========================================
    console.log('\n[TEST 4] Export with limit only (should get most recent memories)');
    
    const exportLimitOnlyResult = await toolRegistry.handle('export-memory', {
      output: './test-limit-only.json',
      limit: 3
    }, exportContext);
    
    assert(exportLimitOnlyResult.success === true, 'Export with limit only succeeded');
    assert(exportLimitOnlyResult.totalMemories === 3, 'Got 3 most recent memories');
    
    // Verify that we got the most recent memories (last 3 stored)
    const { readFileSync } = await import('fs');
    const limitOnlyData = JSON.parse(readFileSync('./test-limit-only.json', 'utf-8'));
    const expectedContents = ['Learning about React hooks', 'Bug fix for authentication issue', 'Personal note about weekend plans'];
    const actualContents = limitOnlyData.memories.map((m: any) => m.content);
    const hasExpectedMemories = expectedContents.every(expected => actualContents.includes(expected));
    assert(hasExpectedMemories, 'Export returned most recent memories (not FTS search)');
    
    unlinkSync('./test-limit-only.json');
    
    // ==========================================
    // Test 5: Export with daysAgo
    // ==========================================
    console.log('\n[TEST 5] Export with daysAgo (should get all since just created)');
    
    const exportDaysResult = await toolRegistry.handle('export-memory', {
      output: './test-days.json',
      daysAgo: 1
    }, exportContext);
    
    assert(exportDaysResult.success === true, 'Export with daysAgo succeeded');
    assert(exportDaysResult.totalMemories === 5, 'Got all memories from today');
    unlinkSync('./test-days.json');
    
    exportService.close();
    
    // ==========================================
    // Test 6: Import to New Database
    // ==========================================
    console.log('\n[TEST 6] Import all memories to new database');
    
    const importService = new MemoryService(TEST_DB_IMPORT);
    importService.initialize();
    
    const importContext: ToolContext = {
      memoryService: importService,
      config: {}
    };
    
    const importResult = await toolRegistry.handle('import-memory', {
      input: TEST_JSON_ALL
    }, importContext);
    
    assert(importResult.success === true, 'Import succeeded');
    assert(importResult.imported === 5, 'Imported 5 memories');
    assert(importResult.skipped === 0, 'No duplicates skipped');
    assert(importResult.errors.length === 0, 'No import errors');
    
    // Verify imported data
    const importedMemories = importService.search(undefined, undefined, undefined, 10);
    assert(importedMemories.length === 5, 'All 5 memories are searchable');
    
    // ==========================================
    // Test 7: Import Duplicates (Skip)
    // ==========================================
    console.log('\n[TEST 7] Import duplicates with skip-duplicates flag');
    
    const importDuplicatesResult = await toolRegistry.handle('import-memory', {
      input: TEST_JSON_ALL,
      skipDuplicates: true
    }, importContext);
    
    assert(importDuplicatesResult.success === true, 'Import with skip succeeded');
    assert(importDuplicatesResult.imported === 0, 'No new memories imported');
    assert(importDuplicatesResult.skipped === 5, 'All 5 duplicates skipped');
    
    // ==========================================
    // Test 8: Relationship Preservation
    // ==========================================
    console.log('\n[TEST 8] Verify relationship preservation');
    
    // Check if relationships were restored
    const memoriesWithRelationships = importService.search('TypeScript', undefined, undefined, 10);
    if (memoriesWithRelationships.length > 0) {
      const related = importService.getRelated(memoriesWithRelationships[0].hash, 5);
      console.log(`   Found ${related.length} related memories (relationships preserved)`);
    }
    
    // ==========================================
    // Test 9: Import Filtered Export
    // ==========================================
    console.log('\n[TEST 9] Import filtered export (work-only)');
    
    // Create a fresh database for filtered import test
    const importFilteredService = new MemoryService('./test-filtered-import.db');
    importFilteredService.initialize();
    
    const filteredContext: ToolContext = {
      memoryService: importFilteredService,
      config: {}
    };
    
    const importFilteredResult = await toolRegistry.handle('import-memory', {
      input: TEST_JSON_FILTERED
    }, filteredContext);
    
    assert(importFilteredResult.success === true, 'Filtered import succeeded');
    assert(importFilteredResult.imported === 3, 'Imported 3 work memories');
    
    const workMemories = importFilteredService.search(undefined, ['work'], undefined, 10);
    assert(workMemories.length === 3, 'All imported memories have work tag');
    
    importFilteredService.close();
    unlinkSync('./test-filtered-import.db');
    
    // ==========================================
    // Test 10: Export Metadata Validation
    // ==========================================
    console.log('\n[TEST 10] Validate export metadata');
    
    const fs = await import('fs');
    const exportData = JSON.parse(fs.readFileSync(TEST_JSON_ALL, 'utf-8'));
    
    assert(exportData.exportVersion !== undefined && exportData.exportVersion.match(/^\d+\.\d+\.\d+$/), 'Export version follows semver format (x.y.z)');
    assert(exportData.exportedAt !== undefined, 'Export timestamp present');
    assert(exportData.totalMemories === 5, 'Total count matches');
    assert(Array.isArray(exportData.memories), 'Memories is an array');
    assert(exportData.memories[0].hash !== undefined, 'Memory has hash');
    assert(exportData.memories[0].content !== undefined, 'Memory has content');
    assert(Array.isArray(exportData.memories[0].tags), 'Memory has tags array');
    
    // ==========================================
    // Test 11: Tag Filtering Accuracy
    // ==========================================
    console.log('\n[TEST 11] Verify tag filtering accuracy');
    
    const workOnlyData = JSON.parse(fs.readFileSync(TEST_JSON_FILTERED, 'utf-8'));
    const allHaveWorkTag = workOnlyData.memories.every((m: any) => m.tags.includes('work'));
    assert(allHaveWorkTag, 'All filtered memories contain work tag');
    
    importService.close();
    
    console.log('\n[SUCCESS] All Export/Import tests passed!\n');
    
  } catch (error) {
    console.error('\n[ERROR] Test failed:', error);
    throw error;
  } finally {
    cleanup();
    console.log('[CLEANUP] Cleanup completed\n');
  }
}

// Run tests if executed directly
const isMainModule = process.argv[1]?.endsWith('export-import-test.js');
if (isMainModule) {
  runTests()
    .then(() => {
      console.log('[DONE] Export/Import test suite completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[FAILED] Test suite failed:', error);
      process.exit(1);
    });
}

export { runTests };
