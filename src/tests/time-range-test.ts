#!/usr/bin/env node

/**
 * Time Range Search Test
 * Tests the time range filtering functionality
 */

import { MemoryService } from '../services/memory-service.js';
import { unlink } from 'fs/promises';

const TEST_DB = './test-timerange.db';

async function runTests() {
  console.log('🧪 Time Range Search Tests');
  console.log('================================\n');

  try {
    // Clean up any existing test database
    try {
      await unlink(TEST_DB);
    } catch (e) {
      // Ignore if doesn't exist
    }

    // Initialize service
    const service = new MemoryService(TEST_DB);
    service.initialize();

    // Create test memories with different dates
    console.log('Setting up test data...');
    
    // Store memories and manually update their created_at timestamps
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastMonth = new Date(today);
    lastMonth.setDate(lastMonth.getDate() - 30);
    const twoMonthsAgo = new Date(today);
    twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 60);

    // Store memories
    service.store('Memory from today', ['recent']);
    service.store('Memory from yesterday', ['recent']);
    service.store('Memory from last week', ['old']);
    service.store('Memory from last month', ['old']);
    service.store('Memory from two months ago', ['very-old']);

    // Manually update the created_at dates in the database
    // This is a test-only operation to simulate memories from different times
    const db = (service as any).db;
    const updateStmt = db.prepare('UPDATE memories SET created_at = ? WHERE content = ?');
    updateStmt.run(yesterday.toISOString(), 'Memory from yesterday');
    updateStmt.run(lastWeek.toISOString(), 'Memory from last week');
    updateStmt.run(lastMonth.toISOString(), 'Memory from last month');
    updateStmt.run(twoMonthsAgo.toISOString(), 'Memory from two months ago');

    console.log('✓ Test data created\n');

    let passed = 0;
    let failed = 0;

    // Test 1: Search memories from TODAY ONLY (daysAgo=0) - Critical UTC edge case
    console.log('Running: Search today only (daysAgo=0)...');
    const todayOnly = service.search(undefined, undefined, undefined, 10, 0);
    if (todayOnly.length === 1 && todayOnly[0].content === 'Memory from today') {
      console.log(`✓ Found ${todayOnly.length} memory from today (UTC boundary test passed)`);
      console.log(`  - ${todayOnly[0].content}`);
      console.log(`  - Created at: ${todayOnly[0].createdAt}`);
      passed++;
    } else {
      console.log(`✗ Expected 1 memory from today, got ${todayOnly.length}`);
      console.log('  This indicates UTC timezone bug!');
      failed++;
    }
    console.log();

    // Test 2: Search memories from last 2 days
    console.log('Running: Search last 2 days...');
    const last2Days = service.search(undefined, undefined, undefined, 10, 2);
    if (last2Days.length === 2) {
      console.log(`✓ Found ${last2Days.length} memories from last 2 days`);
      console.log(`  - ${last2Days.map(m => m.content).join('\n  - ')}`);
      passed++;
    } else {
      console.log(`✗ Expected 2 memories, got ${last2Days.length}`);
      failed++;
    }
    console.log();

    // Test 3: Search memories from last 10 days
    console.log('Running: Search last 10 days...');
    const last10Days = service.search(undefined, undefined, undefined, 10, 10);
    if (last10Days.length === 3) {
      console.log(`✓ Found ${last10Days.length} memories from last 10 days`);
      console.log(`  - ${last10Days.map(m => m.content).join('\n  - ')}`);
      passed++;
    } else {
      console.log(`✗ Expected 3 memories, got ${last10Days.length}`);
      failed++;
    }
    console.log();

    // Test 4: Search memories from last 40 days
    console.log('Running: Search last 40 days...');
    const last40Days = service.search(undefined, undefined, undefined, 10, 40);
    if (last40Days.length === 4) {
      console.log(`✓ Found ${last40Days.length} memories from last 40 days`);
      passed++;
    } else {
      console.log(`✗ Expected 4 memories, got ${last40Days.length}`);
      failed++;
    }
    console.log();

    // Test 5: Search with specific date range (last month only)
    console.log('Running: Search specific date range...');
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 35);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() - 25);
    const dateRange = service.search(
      undefined, 
      undefined,
      undefined,
      10, 
      undefined,
      startDate.toISOString().split('T')[0], // Use YYYY-MM-DD format
      endDate.toISOString().split('T')[0]
    );
    if (dateRange.length === 1 && dateRange[0].content.includes('last month')) {
      console.log(`✓ Found ${dateRange.length} memory in date range`);
      console.log(`  - ${dateRange[0].content}`);
      passed++;
    } else {
      console.log(`✗ Expected 1 memory with "last month", got ${dateRange.length}`);
      failed++;
    }
    console.log();

    // Test 6: Search with content query + time range
    console.log('Running: Search with query and time range...');
    const queryAndTime = service.search('Memory', undefined, undefined, 10, 10);
    if (queryAndTime.length === 3) {
      console.log(`✓ Found ${queryAndTime.length} memories matching query within time range`);
      passed++;
    } else {
      console.log(`✗ Expected 3 memories, got ${queryAndTime.length}`);
      failed++;
    }
    console.log();

    // Test 7: Search with tags + time range
    console.log('Running: Search with tags and time range...');
    const tagsAndTime = service.search(undefined, ['old'], undefined, 10, 40);
    if (tagsAndTime.length === 2) {
      console.log(`✓ Found ${tagsAndTime.length} memories with tag within time range`);
      passed++;
    } else {
      console.log(`✗ Expected 2 memories, got ${tagsAndTime.length}`);
      failed++;
    }
    console.log();

    // Summary
    console.log('📊 Test Summary');
    console.log('===============');
    console.log(`Passed: ${passed}/${passed + failed}`);
    
    if (failed === 0) {
      console.log('\n🎉 All time range tests passed!');
    } else {
      console.log(`\n❌ ${failed} test(s) failed`);
      process.exit(1);
    }

    // Clean up
    service.close();
    await unlink(TEST_DB);
    console.log('\n🧹 Test database cleaned up');

  } catch (error) {
    console.error('\n❌ Test error:', error);
    process.exit(1);
  }
}

runTests();
