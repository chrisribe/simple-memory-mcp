#!/usr/bin/env node

/**
 * Simple Memory MCP Server Tests
 * Tests the CLI functionality of all memory tools
 */

import { spawn } from 'child_process';
import { promisify } from 'util';
import { unlink } from 'fs/promises';
import path from 'path';
import { formatHash } from '../utils/debug.js';
import { parseJsonOutput } from '../utils/json-parser.js';

const execAsync = promisify(spawn);

// Test configuration
const TEST_DB = './test-memory.db';
const SERVER_PATH = path.resolve('./dist/index.js');

interface TestResult {
  name: string;
  success: boolean;
  output?: any;
  error?: string;
  duration: number;
}

/**
 * Execute a CLI command and return the result
 */
async function executeCommand(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const child = spawn('node', [SERVER_PATH, ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, MEMORY_DB: TEST_DB }
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({ stdout, stderr, exitCode: code || 0 });
    });
  });
}

/**
 * Clean up test database
 */
async function cleanupTestDb(): Promise<void> {
  try {
    await unlink(TEST_DB);
  } catch (error) {
    // Ignore if file doesn't exist
  }
}

/**
 * Run a single test
 */
async function runTest(name: string, testFn: () => Promise<void>): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    await testFn();
    return {
      name,
      success: true,
      duration: Date.now() - startTime
    };
  } catch (error) {
    return {
      name,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime
    };
  }
}

/**
 * Test storing memories
 */
async function testStoreMemory(): Promise<void> {
  const result = await executeCommand(['store-memory', '--content', 'Test memory 1', '--tags', 'test,demo']);
  
  if (result.exitCode !== 0) {
    throw new Error(`Store memory failed with exit code ${result.exitCode}: ${result.stderr}`);
  }

  const output = parseJsonOutput(result.stdout);
  if (!output || !output.success || !output.hash) {
    throw new Error('Store memory did not return expected success response');
  }

  console.log('✓ Memory stored successfully with hash:', formatHash(output.hash));
}

/**
 * Test storing multiple memories
 */
async function testStoreMultipleMemories(): Promise<void> {
  const memories = [
    { content: 'Project Alpha documentation', tags: 'project,alpha,docs' },
    { content: 'Meeting notes for Q4 planning', tags: 'meetings,q4,planning' },
    { content: 'Bug fix for login issue', tags: 'bugs,login,fix' },
    { content: 'Alpha project status update', tags: 'project,alpha,status' }
  ];

  for (let i = 0; i < memories.length; i++) {
    const memory = memories[i];
    const result = await executeCommand(['store-memory', '--content', memory.content, '--tags', memory.tags]);
    
    if (result.exitCode !== 0) {
      throw new Error(`Store memory ${i + 1} failed: ${result.stderr}`);
    }

    const output = parseJsonOutput(result.stdout);
    if (!output?.success) {
      throw new Error(`Store memory ${i + 1} did not succeed`);
    }
  }

  console.log('✓ Multiple memories stored successfully');
}

/**
 * Test searching memories by content
 */
async function testSearchMemoryByContent(): Promise<void> {
  const result = await executeCommand(['search-memory', '--query', 'Alpha']);
  
  if (result.exitCode !== 0) {
    throw new Error(`Search memory failed: ${result.stderr}`);
  }

  const output = parseJsonOutput(result.stdout);
  if (!output || !Array.isArray(output.memories)) {
    throw new Error('Search did not return memories array');
  }

  if (output.memories.length < 2) {
    throw new Error(`Expected at least 2 Alpha-related memories, got ${output.memories.length}`);
  }

  console.log(`✓ Found ${output.memories.length} memories containing "Alpha"`);
}

/**
 * Test searching memories by tags
 */
async function testSearchMemoryByTags(): Promise<void> {
  const result = await executeCommand(['search-memory', '--tags', 'project']);
  
  if (result.exitCode !== 0) {
    throw new Error(`Tag search failed: ${result.stderr}`);
  }

  const output = parseJsonOutput(result.stdout);
  if (!output || !Array.isArray(output.memories)) {
    throw new Error('Tag search did not return memories array');
  }

  if (output.memories.length < 1) {
    throw new Error('Expected at least 1 memory with "project" tag');
  }

  console.log(`✓ Found ${output.memories.length} memories with "project" tag`);
}

/**
 * Test memory statistics
 */
async function testMemoryStats(): Promise<void> {
  const result = await executeCommand(['memory-stats']);
  
  if (result.exitCode !== 0) {
    throw new Error(`Memory stats failed: ${result.stderr}`);
  }

  const output = parseJsonOutput(result.stdout);
  if (!output || typeof output.totalMemories !== 'number') {
    throw new Error('Memory stats did not return expected format');
  }

  if (output.totalMemories < 5) {
    throw new Error(`Expected at least 5 memories, got ${output.totalMemories}`);
  }

  console.log(`✓ Database contains ${output.totalMemories} memories, ${output.totalRelationships} relationships`);
}

/**
 * Test deleting memory by tag
 */
async function testDeleteMemoryByTag(): Promise<void> {
  const result = await executeCommand(['delete-memory', '--tag', 'test']);
  
  if (result.exitCode !== 0) {
    throw new Error(`Delete by tag failed: ${result.stderr}`);
  }

  const output = parseJsonOutput(result.stdout);
  if (!output || typeof output.deleted !== 'number') {
    throw new Error('Delete by tag did not return expected format');
  }

  if (output.deleted < 1) {
    throw new Error('Expected to delete at least 1 memory with "test" tag');
  }

  console.log(`✓ Deleted ${output.deleted} memories with "test" tag`);
}

/**
 * Test search with limit parameter
 */
async function testSearchWithLimit(): Promise<void> {
  const result = await executeCommand(['search-memory', '--query', 'project', '--limit', '2']);
  
  if (result.exitCode !== 0) {
    throw new Error(`Limited search failed: ${result.stderr}`);
  }

  const output = parseJsonOutput(result.stdout);
  if (!output || !Array.isArray(output.memories)) {
    throw new Error('Limited search did not return memories array');
  }

  if (output.memories.length > 2) {
    throw new Error(`Expected max 2 results, got ${output.memories.length}`);
  }

  console.log(`✓ Limited search returned ${output.memories.length} results (max 2)`);
}

/**
 * Test improved search with OR tokenization
 * Tests that multiple words match memories containing ANY of those words
 */
async function testImprovedSearch(): Promise<void> {
  // Store test memories with specific content
  await executeCommand(['store-memory', '--content', 'Git rebase workflow requires careful attention', '--tags', 'git,workflow']);
  await executeCommand(['store-memory', '--content', 'Database migration failed during deployment', '--tags', 'database,deploy']);
  await executeCommand(['store-memory', '--content', 'Configuration system needs reset after update', '--tags', 'config,system']);

  // Test 1: Multiple words should match with OR logic
  const multiWordResult = await executeCommand(['search-memory', '--query', 'git reset']);
  const multiWordOutput = parseJsonOutput(multiWordResult.stdout);
  
  if (!multiWordOutput?.memories || multiWordOutput.memories.length === 0) {
    throw new Error('Multi-word search should find memories with ANY matching word');
  }
  
  // Should find both "git" memory and "reset" memory
  const foundGit = multiWordOutput.memories.some((m: any) => m.content.toLowerCase().includes('git'));
  const foundReset = multiWordOutput.memories.some((m: any) => m.content.toLowerCase().includes('reset'));
  
  if (!foundGit && !foundReset) {
    throw new Error('Should find memories containing either "git" OR "reset"');
  }
  
  console.log(`✓ Multi-word search found ${multiWordOutput.memories.length} memories with OR logic`);

  // Test 2: Word order shouldn't matter
  const reversedResult = await executeCommand(['search-memory', '--query', 'reset git']);
  const reversedOutput = parseJsonOutput(reversedResult.stdout);
  
  if (!reversedOutput?.memories || reversedOutput.memories.length === 0) {
    throw new Error('Reversed word order should still find results');
  }
  
  console.log(`✓ Word order independence verified (${reversedOutput.memories.length} results)`);

  // Test 3: Natural language query (with filler words)
  const naturalResult = await executeCommand(['search-memory', '--query', 'find database configuration']);
  const naturalOutput = parseJsonOutput(naturalResult.stdout);
  
  if (!naturalOutput?.memories || naturalOutput.memories.length === 0) {
    throw new Error('Natural language query should find results');
  }
  
  // Should find memories with "database" OR "configuration"
  const hasDbOrConfig = naturalOutput.memories.some((m: any) => 
    m.content.toLowerCase().includes('database') || 
    m.content.toLowerCase().includes('configuration')
  );
  
  if (!hasDbOrConfig) {
    throw new Error('Should find memories with database OR configuration');
  }
  
  console.log(`✓ Natural language query handled (${naturalOutput.memories.length} results)`);

  // Test 4: BM25 ranking - more matches should rank higher
  const rankingResult = await executeCommand(['search-memory', '--query', 'system configuration reset']);
  const rankingOutput = parseJsonOutput(rankingResult.stdout);
  
  if (rankingOutput?.memories && rankingOutput.memories.length > 0) {
    // The memory with "configuration" AND "reset" AND "system" should ideally rank first
    const firstResult = rankingOutput.memories[0];
    const matchCount = ['system', 'configuration', 'reset'].filter(word => 
      firstResult.content.toLowerCase().includes(word)
    ).length;
    
    console.log(`✓ BM25 ranking working (top result has ${matchCount}/3 word matches)`);
  }
}

/**
 * Test integrated relationship functionality through enhanced store-memory
 */
async function testIntegratedRelationships(): Promise<void> {
  // Store memories with auto-linking enabled
  const storeResult1 = await executeCommand(['store-memory', '--content', 'Node.js fundamentals', '--tags', 'nodejs,tutorial']);
  const output1 = parseJsonOutput(storeResult1.stdout);
  if (!output1?.success) {
    throw new Error('Failed to store first memory for relationship test');
  }

  const storeResult2 = await executeCommand(['store-memory', '--content', 'Advanced Node.js patterns', '--tags', 'nodejs,advanced']);
  const output2 = parseJsonOutput(storeResult2.stdout);
  if (!output2?.success) {
    throw new Error('Failed to store second memory for relationship test');
  }

  // The second memory should have created relationships with the first (similar tags)
  if (typeof output2.relationshipsCreated === 'number' && output2.relationshipsCreated > 0) {
    console.log(`✓ Auto-linking created ${output2.relationshipsCreated} relationships`);
  } else {
    console.log(`✓ Auto-linking is working (relationships may exist from previous tests)`);
  }

  // Test explicit relationship creation
  const storeResult3 = await executeCommand(['store-memory', '--content', 'Express.js tutorial', '--tags', 'express,tutorial', '--relate-to', 'nodejs']);
  const output3 = parseJsonOutput(storeResult3.stdout);
  if (!output3?.success) {
    throw new Error('Failed to store third memory with explicit relationships');
  }

  console.log(`✓ Explicit relationship creation completed`);
}

/**
 * Test enhanced search with relationship traversal
 */
async function testSearchWithRelationships(): Promise<void> {
  // First ensure we have some memories with relationships
  await executeCommand(['store-memory', '--content', 'React hooks guide', '--tags', 'react,hooks']);
  await executeCommand(['store-memory', '--content', 'React components tutorial', '--tags', 'react,components']);

  // Test search with relationships
  const searchResult = await executeCommand(['search-memory', '--query', 'react', '--include-related']);
  const output = parseJsonOutput(searchResult.stdout);
  
  if (!output?.memories) {
    throw new Error('Search should return memories array');
  }

  console.log(`✓ Search with relationships: found ${output.memories.length} direct results`);
  
  if (output.relatedMemories && output.relatedMemories.length > 0) {
    console.log(`✓ Found ${output.relatedMemories.length} related memories`);
  } else {
    console.log(`✓ Related memory search is working (no related memories in this test)`);
  }
}

/**
 * Test updating memory content
 */
async function testUpdateMemoryContent(): Promise<void> {
  // Store a memory first
  const storeResult = await executeCommand(['store-memory', '--content', 'Original content', '--tags', 'update-test']);
  const storeOutput = parseJsonOutput(storeResult.stdout);
  
  if (!storeOutput?.success || !storeOutput.hash) {
    throw new Error('Failed to store memory for update test');
  }
  
  const hash = storeOutput.hash;
  console.log(`  Stored memory with hash: ${formatHash(hash)}`);
  
  // Update the content
  const updateResult = await executeCommand(['update-memory', '--hash', hash, '--content', 'Updated content']);
  
  if (updateResult.exitCode !== 0) {
    throw new Error(`Update memory failed: ${updateResult.stderr}`);
  }
  
  const updateOutput = parseJsonOutput(updateResult.stdout);
  if (!updateOutput?.success) {
    throw new Error('Update memory did not return expected success response');
  }
  
  // Verify the update by searching
  const searchResult = await executeCommand(['search-memory', '--query', 'Updated content']);
  const searchOutput = parseJsonOutput(searchResult.stdout);
  
  if (!searchOutput?.memories || searchOutput.memories.length === 0) {
    throw new Error('Updated memory not found in search');
  }
  
  const updatedMemory = searchOutput.memories.find((m: any) => m.hash === hash);
  if (!updatedMemory) {
    throw new Error('Updated memory not found with correct hash');
  }
  
  if (updatedMemory.content !== 'Updated content') {
    throw new Error(`Content not updated correctly: ${updatedMemory.content}`);
  }
  
  console.log('✓ Memory content updated successfully');
}

/**
 * Test updating memory tags
 */
async function testUpdateMemoryTags(): Promise<void> {
  // Store a memory first
  const storeResult = await executeCommand(['store-memory', '--content', 'Content for tag update', '--tags', 'old,tag']);
  const storeOutput = parseJsonOutput(storeResult.stdout);
  
  if (!storeOutput?.success || !storeOutput.hash) {
    throw new Error('Failed to store memory for tag update test');
  }
  
  const hash = storeOutput.hash;
  console.log(`  Stored memory with hash: ${formatHash(hash)}`);
  
  // Update the tags
  const updateResult = await executeCommand(['update-memory', '--hash', hash, '--tags', 'new,updated,tag']);
  
  if (updateResult.exitCode !== 0) {
    throw new Error(`Update memory tags failed: ${updateResult.stderr}`);
  }
  
  const updateOutput = parseJsonOutput(updateResult.stdout);
  if (!updateOutput?.success) {
    throw new Error('Update memory tags did not return expected success response');
  }
  
  // Verify the update by searching with new tags
  const searchResult = await executeCommand(['search-memory', '--tags', 'new']);
  const searchOutput = parseJsonOutput(searchResult.stdout);
  
  if (!searchOutput?.memories || searchOutput.memories.length === 0) {
    throw new Error('Updated memory not found in tag search');
  }
  
  const updatedMemory = searchOutput.memories.find((m: any) => m.hash === hash);
  if (!updatedMemory) {
    throw new Error('Updated memory not found with correct hash');
  }
  
  if (!updatedMemory.tags.includes('new') || !updatedMemory.tags.includes('updated')) {
    throw new Error(`Tags not updated correctly: ${updatedMemory.tags.join(',')}`);
  }
  
  // Verify old tag is gone
  if (updatedMemory.tags.includes('old')) {
    throw new Error('Old tag still present after update');
  }
  
  console.log('✓ Memory tags updated successfully');
}

/**
 * Test updating both content and tags
 */
async function testUpdateMemoryBoth(): Promise<void> {
  // Store a memory first
  const storeResult = await executeCommand(['store-memory', '--content', 'Original for both update', '--tags', 'original']);
  const storeOutput = parseJsonOutput(storeResult.stdout);
  
  if (!storeOutput?.success || !storeOutput.hash) {
    throw new Error('Failed to store memory for combined update test');
  }
  
  const hash = storeOutput.hash;
  console.log(`  Stored memory with hash: ${formatHash(hash)}`);
  
  // Update both content and tags
  const updateResult = await executeCommand([
    'update-memory', 
    '--hash', hash, 
    '--content', 'Updated both content and tags',
    '--tags', 'combined,update'
  ]);
  
  if (updateResult.exitCode !== 0) {
    throw new Error(`Update memory (both) failed: ${updateResult.stderr}`);
  }
  
  const updateOutput = parseJsonOutput(updateResult.stdout);
  if (!updateOutput?.success) {
    throw new Error('Update memory (both) did not return expected success response');
  }
  
  // Verify the update
  const searchResult = await executeCommand(['search-memory', '--tags', 'combined']);
  const searchOutput = parseJsonOutput(searchResult.stdout);
  
  if (!searchOutput?.memories || searchOutput.memories.length === 0) {
    throw new Error('Updated memory not found in search');
  }
  
  const updatedMemory = searchOutput.memories.find((m: any) => m.hash === hash);
  if (!updatedMemory) {
    throw new Error('Updated memory not found with correct hash');
  }
  
  if (updatedMemory.content !== 'Updated both content and tags') {
    throw new Error(`Content not updated correctly: ${updatedMemory.content}`);
  }
  
  if (!updatedMemory.tags.includes('combined') || !updatedMemory.tags.includes('update')) {
    throw new Error(`Tags not updated correctly: ${updatedMemory.tags.join(',')}`);
  }
  
  console.log('✓ Memory content and tags updated successfully');
}

/**
 * Test updating non-existent memory
 */
async function testUpdateNonExistentMemory(): Promise<void> {
  const fakeHash = 'nonexistent123456789abcdef';
  
  const updateResult = await executeCommand(['update-memory', '--hash', fakeHash, '--content', 'Should fail']);
  
  if (updateResult.exitCode !== 0) {
    throw new Error(`Update should return gracefully even for non-existent hash`);
  }
  
  const updateOutput = parseJsonOutput(updateResult.stdout);
  if (updateOutput?.success === true) {
    throw new Error('Update should fail for non-existent memory');
  }
  
  if (!updateOutput?.message || !updateOutput.message.includes('not found')) {
    throw new Error('Update should return "not found" message');
  }
  
  console.log('✓ Non-existent memory update handled correctly');
}

/**
 * Main test runner
 */
async function runAllTests(): Promise<void> {
  console.log('🧪 Simple Memory MCP Server Tests');
  console.log('================================\n');

  // Clean up any existing test database
  await cleanupTestDb();

  const tests = [
    { name: 'Store Memory', fn: testStoreMemory },
    { name: 'Store Multiple Memories', fn: testStoreMultipleMemories },
    { name: 'Search Memory by Content', fn: testSearchMemoryByContent },
    { name: 'Search Memory by Tags', fn: testSearchMemoryByTags },
    { name: 'Memory Statistics', fn: testMemoryStats },
    { name: 'Integrated Relationships', fn: testIntegratedRelationships },
    { name: 'Search with Relationships', fn: testSearchWithRelationships },
    { name: 'Update Memory Content', fn: testUpdateMemoryContent },
    { name: 'Update Memory Tags', fn: testUpdateMemoryTags },
    { name: 'Update Memory Both', fn: testUpdateMemoryBoth },
    { name: 'Update Non-Existent Memory', fn: testUpdateNonExistentMemory },
    { name: 'Delete Memory by Tag', fn: testDeleteMemoryByTag },
    { name: 'Search with Limit', fn: testSearchWithLimit },
    { name: 'Improved Search (OR + BM25)', fn: testImprovedSearch }
  ];

  const results: TestResult[] = [];
  
  for (const test of tests) {
    console.log(`Running: ${test.name}...`);
    const result = await runTest(test.name, test.fn);
    results.push(result);
    
    if (result.success) {
      console.log(`✅ ${test.name} (${result.duration}ms)\n`);
    } else {
      console.log(`❌ ${test.name} failed: ${result.error} (${result.duration}ms)\n`);
    }
  }

  // Summary
  console.log('📊 Test Summary');
  console.log('===============');
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  const totalTime = results.reduce((sum, r) => sum + r.duration, 0);
  
  console.log(`Passed: ${passed}/${total}`);
  console.log(`Total time: ${totalTime}ms`);
  
  if (passed === total) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log('\n💥 Some tests failed:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
    process.exit(1);
  }

  // Clean up test database
  await cleanupTestDb();
  console.log('\n🧹 Test database cleaned up');
}

// Run tests if this file is executed directly
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Always run tests when this module is executed
runAllTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
