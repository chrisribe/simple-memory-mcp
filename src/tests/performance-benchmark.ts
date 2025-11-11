#!/usr/bin/env node

/**
 * Performance Benchmark Suite
 * Comprehensive benchmarks to measure and validate optimization gains
 */

import { MemoryService } from '../services/memory-service.js';
import { performance } from 'perf_hooks';
import { existsSync, unlinkSync } from 'fs';

interface BenchmarkResult {
  operation: string;
  iterations: number;
  totalMs: number;
  avgMs: number;
  opsPerSecond: number;
}

function benchmark(name: string, iterations: number, fn: () => void): BenchmarkResult {
  // Warm up
  for (let i = 0; i < Math.min(10, iterations); i++) {
    fn();
  }
  
  // Actual benchmark
  const start = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  
  const end = performance.now();
  const totalMs = end - start;
  const avgMs = totalMs / iterations;
  const opsPerSecond = 1000 / avgMs;
  
  return {
    operation: name,
    iterations,
    totalMs: Math.round(totalMs * 100) / 100,
    avgMs: Math.round(avgMs * 1000) / 1000,
    opsPerSecond: Math.round(opsPerSecond)
  };
}

async function runBenchmarks() {
  const testDb = './benchmark-test.db';
  
  // Clean up any existing test database
  if (existsSync(testDb)) {
    unlinkSync(testDb);
  }
  if (existsSync(testDb + '-shm')) {
    unlinkSync(testDb + '-shm');
  }
  if (existsSync(testDb + '-wal')) {
    unlinkSync(testDb + '-wal');
  }
  
  const service = new MemoryService(testDb);
  service.initialize();
  
  console.log('🚀 Performance Benchmark Suite');
  console.log('================================\n');
  
  const results: BenchmarkResult[] = [];
  
  // Benchmark 1: Store operations with various sizes
  console.log('📝 Storage Operations');
  console.log('--------------------');
  
  const storeBenchmarks = [
    { size: '100B', content: 'x'.repeat(100), iterations: 1000 },
    { size: '1KB', content: 'x'.repeat(1024), iterations: 1000 },
    { size: '10KB', content: 'x'.repeat(10240), iterations: 500 },
    { size: '100KB', content: 'x'.repeat(102400), iterations: 100 }
  ];
  
  for (const { size, content, iterations } of storeBenchmarks) {
    const result = benchmark(`Store memory (${size})`, iterations, () => {
      service.store(content, ['test', 'benchmark']);
    });
    results.push(result);
    console.log(`  ${size}: ${result.avgMs.toFixed(2)}ms avg (${result.opsPerSecond} ops/sec)`);
  }
  
  console.log();
  
  // Benchmark 2: Tag search operations
  console.log('🔍 Tag Search Operations');
  console.log('------------------------');
  
  // Populate some test data for searching
  for (let i = 0; i < 100; i++) {
    service.store(`Test memory ${i}`, ['search', 'test', `tag${i % 10}`]);
  }
  
  const tagSearchResult = benchmark('Search by tag (indexed)', 1000, () => {
    service.search(undefined, ['search'], undefined, 10);
  });
  results.push(tagSearchResult);
  console.log(`  Indexed tag query: ${tagSearchResult.avgMs.toFixed(2)}ms avg (${tagSearchResult.opsPerSecond} ops/sec)`);
  
  const multiTagResult = benchmark('Search by multiple tags', 1000, () => {
    service.search(undefined, ['test'], undefined, 10);
  });
  results.push(multiTagResult);
  console.log(`  Multiple results: ${multiTagResult.avgMs.toFixed(2)}ms avg (${multiTagResult.opsPerSecond} ops/sec)`);
  
  console.log();
  
  // Benchmark 3: FTS search operations
  console.log('📖 Full-Text Search Operations');
  console.log('-------------------------------');
  
  // Add some varied content for FTS
  const phrases = [
    'The quick brown fox jumps over the lazy dog',
    'Machine learning and artificial intelligence are transforming technology',
    'Database optimization requires careful analysis and testing',
    'Performance benchmarks help validate improvements'
  ];
  
  for (let i = 0; i < 50; i++) {
    service.store(phrases[i % phrases.length].repeat(5), ['fts', 'content']);
  }
  
  const ftsResults = [
    benchmark('FTS: simple query', 1000, () => {
      service.search('quick brown', undefined, undefined, 10);
    }),
    benchmark('FTS: complex query', 1000, () => {
      service.search('machine learning intelligence', undefined, undefined, 10);
    }),
    benchmark('FTS: common word', 1000, () => {
      service.search('performance', undefined, undefined, 10);
    })
  ];
  
  for (const result of ftsResults) {
    results.push(result);
    console.log(`  ${result.operation.replace('FTS: ', '')}: ${result.avgMs.toFixed(2)}ms avg (${result.opsPerSecond} ops/sec)`);
  }
  
  console.log();
  
  // Benchmark 4: Relationship operations
  console.log('🔗 Relationship Operations');
  console.log('--------------------------');
  
  // Create some memories for relationship testing
  const memHashes = Array.from({ length: 20 }, (_, i) => 
    service.store(`Memory for relationships ${i}`, ['rel', 'test'])
  );
  
  // Single relationship creation
  const singleRelResult = benchmark('Create single relationship', 500, () => {
    const from = memHashes[Math.floor(Math.random() * 10)];
    const to = memHashes[10 + Math.floor(Math.random() * 10)];
    try {
      service.linkMemories(from, to, 'test');
    } catch {
      // Ignore duplicates
    }
  });
  results.push(singleRelResult);
  console.log(`  Single link: ${singleRelResult.avgMs.toFixed(2)}ms avg (${singleRelResult.opsPerSecond} ops/sec)`);
  
  // Bulk relationship creation
  const bulkRelationships = Array.from({ length: 10 }, (_, i) => ({
    fromHash: memHashes[i],
    toHash: memHashes[i + 10],
    relationshipType: 'bulk-test'
  }));
  
  const bulkRelResult = benchmark('Bulk create relationships (10)', 200, () => {
    service.linkMemoriesBulk(bulkRelationships);
  });
  results.push(bulkRelResult);
  console.log(`  Bulk link (10): ${bulkRelResult.avgMs.toFixed(2)}ms avg (${bulkRelResult.opsPerSecond} ops/sec)`);
  console.log(`  Speedup vs sequential: ${(singleRelResult.avgMs * 10 / bulkRelResult.avgMs).toFixed(1)}x faster`);
  
  console.log();
  
  // Benchmark 5: Delete operations
  console.log('🗑️  Delete Operations');
  console.log('--------------------');
  
  // Create disposable memories
  for (let i = 0; i < 100; i++) {
    service.store(`Disposable memory ${i}`, ['delete', `batch${i % 10}`]);
  }
  
  const deleteByHashResult = benchmark('Delete by hash', 100, () => {
    const hash = service.store(`Temp memory ${Math.random()}`, ['temp']);
    service.delete(hash);
  });
  results.push(deleteByHashResult);
  console.log(`  By hash: ${deleteByHashResult.avgMs.toFixed(2)}ms avg (${deleteByHashResult.opsPerSecond} ops/sec)`);
  
  const deleteByTagResult = benchmark('Delete by tag', 10, () => {
    const tag = `batch${Math.floor(Math.random() * 10)}`;
    service.deleteByTag(tag);
  });
  results.push(deleteByTagResult);
  console.log(`  By tag: ${deleteByTagResult.avgMs.toFixed(2)}ms avg (${deleteByTagResult.opsPerSecond} ops/sec)`);
  
  console.log();
  
  // Benchmark 6: Statistics operations
  console.log('📊 Statistics Operations');
  console.log('------------------------');
  
  const statsResult = benchmark('Get database stats', 1000, () => {
    service.stats();
  });
  results.push(statsResult);
  console.log(`  Stats query: ${statsResult.avgMs.toFixed(2)}ms avg (${statsResult.opsPerSecond} ops/sec)`);
  
  console.log();
  
  // Summary table
  console.log('📈 Benchmark Summary');
  console.log('====================\n');
  
  console.table(results.map(r => ({
    'Operation': r.operation,
    'Iterations': r.iterations,
    'Total (ms)': r.totalMs,
    'Avg (ms)': r.avgMs.toFixed(3),
    'Ops/sec': r.opsPerSecond
  })));
  
  // Database size info
  const finalStats = service.stats();
  console.log('\n📦 Final Database Statistics');
  console.log('============================');
  console.log(`Total memories: ${finalStats.totalMemories}`);
  console.log(`Total relationships: ${finalStats.totalRelationships}`);
  console.log(`Database size: ${(finalStats.dbSize / 1024).toFixed(1)}KB`);
  console.log(`Database path: ${finalStats.dbPath}`);
  
  // Performance targets validation
  console.log('\n✅ Performance Targets Validation');
  console.log('==================================');
  
  const storeTarget = results.find(r => r.operation.includes('1KB'));
  if (storeTarget && storeTarget.avgMs < 5) {
    console.log(`✓ Store 1KB: ${storeTarget.avgMs.toFixed(2)}ms < 5ms target`);
  } else if (storeTarget) {
    console.log(`⚠ Store 1KB: ${storeTarget.avgMs.toFixed(2)}ms >= 5ms target`);
  }
  
  const tagTarget = results.find(r => r.operation.includes('indexed'));
  if (tagTarget && tagTarget.avgMs < 10) {
    console.log(`✓ Tag search: ${tagTarget.avgMs.toFixed(2)}ms < 10ms target`);
  } else if (tagTarget) {
    console.log(`⚠ Tag search: ${tagTarget.avgMs.toFixed(2)}ms >= 10ms target`);
  }
  
  const ftsTarget = results.find(r => r.operation.includes('simple query'));
  if (ftsTarget && ftsTarget.avgMs < 100) {
    console.log(`✓ FTS search: ${ftsTarget.avgMs.toFixed(2)}ms < 100ms target`);
  } else if (ftsTarget) {
    console.log(`⚠ FTS search: ${ftsTarget.avgMs.toFixed(2)}ms >= 100ms target`);
  }
  
  const bulkTarget = results.find(r => r.operation.includes('Bulk'));
  if (bulkTarget && bulkTarget.avgMs < 50) {
    console.log(`✓ Bulk ops: ${bulkTarget.avgMs.toFixed(2)}ms < 50ms target`);
  } else if (bulkTarget) {
    console.log(`⚠ Bulk ops: ${bulkTarget.avgMs.toFixed(2)}ms >= 50ms target`);
  }
  
  service.close();
  
  // Clean up
  try {
    unlinkSync(testDb);
    unlinkSync(testDb + '-shm');
    unlinkSync(testDb + '-wal');
  } catch {
    // Ignore cleanup errors
  }
  
  console.log('\n🎉 Benchmarks completed successfully!\n');
}

runBenchmarks().catch(console.error);
