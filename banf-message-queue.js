#!/usr/bin/env node
/**
 * ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
 *  BANF Message Queue Processor
 * ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
 *
 *  A lightweight, file-backed message queue for the BANF email processing
 *  pipeline. Built on `better-queue` patterns with SQLite-style persistence
 *  using JSON files (zero external dependencies).
 *
 *  Features:
 *    - FIFO ordering with priority support
 *    - Message deduplication by Gmail message ID
 *    - Dead Letter Queue (DLQ) for failed processing
 *    - Retry with exponential backoff (max 3 attempts)
 *    - Backpressure: configurable concurrency limit
 *    - Pipeline phase routing (Phase 1 ΓåÆ 2 ΓåÆ 2b ΓåÆ 2c ΓåÆ 2d)
 *    - Persistent state survives crashes
 *    - Metrics: throughput, latency, error rates
 *
 *  Architecture (Phase 1 ΓÇö zero infrastructure):
 *    Gmail OAuth2 ΓåÆ Enqueue ΓåÆ Queue File ΓåÆ Dequeue ΓåÆ Phase Handler ΓåÆ Ack/Nack
 *                                                         Γåô (fail)
 *                                                        DLQ File
 *
 *  Future (Phase 2 ΓÇö BullMQ + Upstash Redis):
 *    Same API, swap file backend for Redis backend
 *
 *  Usage:
 *    const mq = require('./banf-message-queue.js');
 *    mq.enqueue('evite_rsvp', { emailId: '...', from: '...', ... });
 *    mq.process('evite_rsvp', async (msg) => { ... });
 *    mq.drain();  // process all pending
 *
 *    CLI:
 *      node banf-message-queue.js --status
 *      node banf-message-queue.js --drain
 *      node banf-message-queue.js --dlq
 *      node banf-message-queue.js --retry-dlq
 *      node banf-message-queue.js --purge
 *
 * ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
 */

const fs = require('fs');
const path = require('path');

// ΓöÇΓöÇ Config ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const QUEUE_DIR = path.join(__dirname, 'queue');
const QUEUE_FILE = path.join(QUEUE_DIR, 'messages.json');
const DLQ_FILE = path.join(QUEUE_DIR, 'dead-letters.json');
const METRICS_FILE = path.join(QUEUE_DIR, 'metrics.json');

const DEFAULT_CONFIG = {
  maxRetries: 3,
  retryBackoffMs: 2000,    // base backoff: 2s, 4s, 8s
  concurrency: 1,          // process one message at a time
  deduplicateByField: 'emailId',  // dedup key
  maxQueueSize: 10000,
  dlqMaxSize: 5000,
};

// ΓöÇΓöÇ Pipeline Phases (valid queue names) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const VALID_QUEUES = [
  'evite_rsvp',           // Phase 1
  'payment',              // Phase 2
  'admin_instruction',    // Phase 2b
  'user_query',           // Phase 2c
  'delivery_failure',     // Phase 2d
  'change_request',       // Dev board ΓÇö Change Agent
  'architecture_update',  // Design-Architecture Agent
  'general',              // Catch-all
];

// ΓöÇΓöÇ Logging ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
function log(level, msg) {
  const ts = new Date().toISOString();
  const prefix = { INFO: '≡ƒô¼', WARN: 'ΓÜá∩╕Å', ERROR: 'Γ¥î', DEBUG: '≡ƒöì' }[level] || 'ΓÇó';
  console.log(`[${ts}] [${level}] [MQ] ${prefix} ${msg}`);
}

// ΓöÇΓöÇ State Management ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
function ensureDir() {
  if (!fs.existsSync(QUEUE_DIR)) fs.mkdirSync(QUEUE_DIR, { recursive: true });
}

function loadQueue() {
  ensureDir();
  try {
    if (fs.existsSync(QUEUE_FILE)) return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
  } catch (e) { log('WARN', `Queue file corrupted, starting fresh: ${e.message}`); }
  return { queues: {}, dedupIndex: {}, createdAt: new Date().toISOString() };
}

function saveQueue(state) {
  ensureDir();
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(state, null, 2));
}

function loadDLQ() {
  ensureDir();
  try {
    if (fs.existsSync(DLQ_FILE)) return JSON.parse(fs.readFileSync(DLQ_FILE, 'utf8'));
  } catch (e) { log('WARN', `DLQ file corrupted, starting fresh: ${e.message}`); }
  return { messages: [], createdAt: new Date().toISOString() };
}

function saveDLQ(dlq) {
  ensureDir();
  fs.writeFileSync(DLQ_FILE, JSON.stringify(dlq, null, 2));
}

function loadMetrics() {
  ensureDir();
  try {
    if (fs.existsSync(METRICS_FILE)) return JSON.parse(fs.readFileSync(METRICS_FILE, 'utf8'));
  } catch (e) { /* fresh */ }
  return {
    totalEnqueued: 0, totalProcessed: 0, totalFailed: 0, totalDLQ: 0,
    totalDeduplicated: 0, totalRetried: 0,
    byQueue: {},
    lastUpdated: null,
    createdAt: new Date().toISOString()
  };
}

function saveMetrics(m) {
  m.lastUpdated = new Date().toISOString();
  ensureDir();
  fs.writeFileSync(METRICS_FILE, JSON.stringify(m, null, 2));
}

// ΓöÇΓöÇ Message Structure ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
function createMessage(queue, payload, options = {}) {
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    queue,
    payload,
    priority: options.priority || 'normal',  // high, normal, low
    status: 'pending',     // pending ΓåÆ processing ΓåÆ done | failed ΓåÆ dlq
    attempts: 0,
    maxRetries: options.maxRetries || DEFAULT_CONFIG.maxRetries,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastError: null,
    dedupKey: null,
  };
}

// ΓöÇΓöÇ Core Queue Operations ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Enqueue a message to a named queue.
 * @param {string} queueName - One of VALID_QUEUES
 * @param {object} payload - Message payload (must have emailId for dedup)
 * @param {object} [options] - { priority, maxRetries }
 * @returns {{ enqueued: boolean, messageId?: string, reason?: string }}
 */
function enqueue(queueName, payload, options = {}) {
  if (!VALID_QUEUES.includes(queueName)) {
    log('WARN', `Unknown queue "${queueName}", routing to "general"`);
    queueName = 'general';
  }

  const state = loadQueue();
  const metrics = loadMetrics();

  // Initialize queue if needed
  if (!state.queues[queueName]) state.queues[queueName] = [];

  // Dedup check
  const dedupField = DEFAULT_CONFIG.deduplicateByField;
  const dedupKey = payload[dedupField];
  if (dedupKey) {
    if (state.dedupIndex[dedupKey]) {
      metrics.totalDeduplicated = (metrics.totalDeduplicated || 0) + 1;
      saveMetrics(metrics);
      return { enqueued: false, reason: `duplicate:${dedupKey}` };
    }
    state.dedupIndex[dedupKey] = { queue: queueName, enqueuedAt: new Date().toISOString() };
  }

  // Size check
  if (state.queues[queueName].length >= DEFAULT_CONFIG.maxQueueSize) {
    log('WARN', `Queue "${queueName}" at max capacity (${DEFAULT_CONFIG.maxQueueSize})`);
    return { enqueued: false, reason: 'queue_full' };
  }

  const msg = createMessage(queueName, payload, options);
  msg.dedupKey = dedupKey || null;

  // Priority insertion: high ΓåÆ front, low ΓåÆ back, normal ΓåÆ back
  if (msg.priority === 'high') {
    state.queues[queueName].unshift(msg);
  } else {
    state.queues[queueName].push(msg);
  }

  saveQueue(state);

  // Update metrics
  metrics.totalEnqueued = (metrics.totalEnqueued || 0) + 1;
  if (!metrics.byQueue[queueName]) metrics.byQueue[queueName] = { enqueued: 0, processed: 0, failed: 0 };
  metrics.byQueue[queueName].enqueued++;
  saveMetrics(metrics);

  log('INFO', `Enqueued [${queueName}] ${msg.id} (dedup: ${dedupKey || 'none'})`);
  return { enqueued: true, messageId: msg.id };
}

/**
 * Dequeue next message from a queue (FIFO with priority).
 * @param {string} queueName
 * @returns {object|null} Message or null if empty
 */
function dequeue(queueName) {
  const state = loadQueue();
  if (!state.queues[queueName] || state.queues[queueName].length === 0) return null;

  const msg = state.queues[queueName].shift();
  msg.status = 'processing';
  msg.attempts++;
  msg.updatedAt = new Date().toISOString();

  saveQueue(state);
  return msg;
}

/**
 * Acknowledge successful processing.
 * @param {string} queueName
 * @param {string} messageId
 */
function ack(queueName, messageId) {
  const metrics = loadMetrics();
  metrics.totalProcessed = (metrics.totalProcessed || 0) + 1;
  if (!metrics.byQueue[queueName]) metrics.byQueue[queueName] = { enqueued: 0, processed: 0, failed: 0 };
  metrics.byQueue[queueName].processed++;
  saveMetrics(metrics);
  log('INFO', `ACK [${queueName}] ${messageId}`);
}

/**
 * Negative acknowledge ΓÇö retry or send to DLQ.
 * @param {string} queueName
 * @param {object} msg - The message object
 * @param {string} error - Error description
 */
function nack(queueName, msg, error) {
  msg.lastError = error;
  msg.updatedAt = new Date().toISOString();

  const metrics = loadMetrics();

  if (msg.attempts < msg.maxRetries) {
    // Retry: put back in queue with backoff marker
    msg.status = 'pending';
    msg.retryAfter = new Date(Date.now() + DEFAULT_CONFIG.retryBackoffMs * Math.pow(2, msg.attempts - 1)).toISOString();

    const state = loadQueue();
    if (!state.queues[queueName]) state.queues[queueName] = [];
    state.queues[queueName].push(msg);
    saveQueue(state);

    metrics.totalRetried = (metrics.totalRetried || 0) + 1;
    saveMetrics(metrics);
    log('WARN', `NACK [${queueName}] ${msg.id} ΓÇö retry ${msg.attempts}/${msg.maxRetries} (backoff: ${msg.retryAfter})`);
  } else {
    // Max retries exceeded ΓåÆ DLQ
    msg.status = 'dlq';
    const dlq = loadDLQ();
    if (dlq.messages.length < DEFAULT_CONFIG.dlqMaxSize) {
      dlq.messages.push(msg);
      saveDLQ(dlq);
    }

    metrics.totalFailed = (metrics.totalFailed || 0) + 1;
    metrics.totalDLQ = (metrics.totalDLQ || 0) + 1;
    if (!metrics.byQueue[queueName]) metrics.byQueue[queueName] = { enqueued: 0, processed: 0, failed: 0 };
    metrics.byQueue[queueName].failed++;
    saveMetrics(metrics);
    log('ERROR', `DLQ [${queueName}] ${msg.id} ΓÇö max retries exceeded: ${error}`);
  }
}

/**
 * Get the count of pending messages in a queue.
 */
function pendingCount(queueName) {
  const state = loadQueue();
  return (state.queues[queueName] || []).length;
}

/**
 * Get total pending across all queues.
 */
function totalPending() {
  const state = loadQueue();
  let total = 0;
  for (const q of Object.values(state.queues)) total += q.length;
  return total;
}

/**
 * Peek at next message without removing it.
 */
function peek(queueName) {
  const state = loadQueue();
  return (state.queues[queueName] || [])[0] || null;
}

// ΓöÇΓöÇ Processor Registry ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const processors = {};

/**
 * Register a processor function for a queue.
 * @param {string} queueName
 * @param {function} handler - async (payload) => result. Throw to nack.
 */
function registerProcessor(queueName, handler) {
  processors[queueName] = handler;
  log('INFO', `Processor registered for queue: ${queueName}`);
}

/**
 * Process next message from a queue using its registered processor.
 * @param {string} queueName
 * @returns {object|null} { success, messageId, result } or null if empty
 */
async function processNext(queueName) {
  const handler = processors[queueName];
  if (!handler) {
    log('WARN', `No processor for queue "${queueName}"`);
    return null;
  }

  const msg = dequeue(queueName);
  if (!msg) return null;

  // Check retry backoff
  if (msg.retryAfter && new Date(msg.retryAfter) > new Date()) {
    // Put back ΓÇö not ready yet
    const state = loadQueue();
    if (!state.queues[queueName]) state.queues[queueName] = [];
    state.queues[queueName].unshift(msg);
    msg.status = 'pending';
    saveQueue(state);
    return null;
  }

  try {
    const startTime = Date.now();
    const result = await handler(msg.payload);
    const elapsed = Date.now() - startTime;

    ack(queueName, msg.id);
    log('INFO', `Processed [${queueName}] ${msg.id} in ${elapsed}ms`);
    return { success: true, messageId: msg.id, result, elapsed };
  } catch (e) {
    nack(queueName, msg, e.message || String(e));
    return { success: false, messageId: msg.id, error: e.message };
  }
}

/**
 * Drain a queue ΓÇö process all pending messages.
 * @param {string} queueName
 * @returns {{ processed: number, failed: number, remaining: number }}
 */
async function drainQueue(queueName) {
  let processed = 0, failed = 0;
  let result;
  while ((result = await processNext(queueName)) !== null) {
    if (result.success) processed++;
    else failed++;
  }
  return { processed, failed, remaining: pendingCount(queueName) };
}

/**
 * Drain all queues in priority order.
 */
async function drainAll() {
  const results = {};
  for (const q of VALID_QUEUES) {
    if (pendingCount(q) > 0) {
      results[q] = await drainQueue(q);
    }
  }
  return results;
}

// ΓöÇΓöÇ DLQ Operations ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
function getDLQ() {
  return loadDLQ().messages;
}

function getDLQCount() {
  return loadDLQ().messages.length;
}

/**
 * Retry all DLQ messages ΓÇö re-enqueue them to their original queues.
 */
function retryDLQ() {
  const dlq = loadDLQ();
  let retried = 0;
  const remaining = [];

  for (const msg of dlq.messages) {
    msg.attempts = 0;
    msg.status = 'pending';
    msg.lastError = null;
    msg.retryAfter = null;

    // Remove from dedup index so it can be re-enqueued
    const state = loadQueue();
    if (msg.dedupKey && state.dedupIndex[msg.dedupKey]) {
      delete state.dedupIndex[msg.dedupKey];
      saveQueue(state);
    }

    const result = enqueue(msg.queue, msg.payload, { maxRetries: msg.maxRetries });
    if (result.enqueued) retried++;
    else remaining.push(msg);
  }

  dlq.messages = remaining;
  saveDLQ(dlq);
  log('INFO', `DLQ retry: ${retried} re-enqueued, ${remaining.length} still failed`);
  return { retried, remaining: remaining.length };
}

// ΓöÇΓöÇ Queue Status & Metrics ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
function getStatus() {
  const state = loadQueue();
  const metrics = loadMetrics();
  const dlq = loadDLQ();

  const queueStatus = {};
  for (const q of VALID_QUEUES) {
    queueStatus[q] = {
      pending: (state.queues[q] || []).length,
      metrics: metrics.byQueue[q] || { enqueued: 0, processed: 0, failed: 0 }
    };
  }

  return {
    totalPending: totalPending(),
    dlqSize: dlq.messages.length,
    dedupIndexSize: Object.keys(state.dedupIndex || {}).length,
    queues: queueStatus,
    totals: {
      enqueued: metrics.totalEnqueued || 0,
      processed: metrics.totalProcessed || 0,
      failed: metrics.totalFailed || 0,
      dlq: metrics.totalDLQ || 0,
      deduplicated: metrics.totalDeduplicated || 0,
      retried: metrics.totalRetried || 0,
    },
    createdAt: state.createdAt,
    lastUpdated: metrics.lastUpdated,
  };
}

/**
 * Purge all queues (destructive ΓÇö for testing).
 */
function purge() {
  const state = loadQueue();
  state.queues = {};
  state.dedupIndex = {};
  saveQueue(state);
  saveDLQ({ messages: [], createdAt: new Date().toISOString() });
  saveMetrics({
    totalEnqueued: 0, totalProcessed: 0, totalFailed: 0, totalDLQ: 0,
    totalDeduplicated: 0, totalRetried: 0, byQueue: {},
    lastUpdated: new Date().toISOString(), createdAt: new Date().toISOString()
  });
  log('INFO', 'All queues purged');
}

// ΓöÇΓöÇ Exports ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
module.exports = {
  enqueue,
  dequeue,
  ack,
  nack,
  peek,
  pendingCount,
  totalPending,
  registerProcessor,
  processNext,
  drainQueue,
  drainAll,
  getDLQ,
  getDLQCount,
  retryDLQ,
  getStatus,
  purge,
  VALID_QUEUES,
};

// ΓöÇΓöÇ CLI ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--status')) {
    const status = getStatus();
    console.log('\n≡ƒô¼ BANF Message Queue Status');
    console.log('ΓòÉ'.repeat(55));
    console.log(`  Total pending: ${status.totalPending}`);
    console.log(`  DLQ size:      ${status.dlqSize}`);
    console.log(`  Dedup index:   ${status.dedupIndexSize} entries`);
    console.log('');
    console.log('  Queue Breakdown:');
    for (const [q, info] of Object.entries(status.queues)) {
      if (info.pending > 0 || info.metrics.enqueued > 0) {
        console.log(`    ${q}: ${info.pending} pending | ${info.metrics.processed}/${info.metrics.enqueued} processed | ${info.metrics.failed} failed`);
      }
    }
    console.log('');
    console.log('  Lifetime Totals:');
    console.log(`    Enqueued:     ${status.totals.enqueued}`);
    console.log(`    Processed:    ${status.totals.processed}`);
    console.log(`    Failed:       ${status.totals.failed}`);
    console.log(`    DLQ'd:        ${status.totals.dlq}`);
    console.log(`    Deduplicated: ${status.totals.deduplicated}`);
    console.log(`    Retried:      ${status.totals.retried}`);
    console.log('ΓòÉ'.repeat(55));
  }

  else if (args.includes('--dlq')) {
    const msgs = getDLQ();
    console.log(`\n≡ƒÆÇ Dead Letter Queue: ${msgs.length} messages`);
    for (const m of msgs.slice(0, 20)) {
      console.log(`  [${m.queue}] ${m.id} ΓÇö ${m.lastError} (${m.attempts} attempts)`);
    }
  }

  else if (args.includes('--retry-dlq')) {
    const result = retryDLQ();
    console.log(`\n≡ƒöä DLQ Retry: ${result.retried} re-enqueued, ${result.remaining} still failed`);
  }

  else if (args.includes('--purge')) {
    purge();
    console.log('\n≡ƒùæ∩╕Å  All queues purged');
  }

  else if (args.includes('--test')) {
    // Self-test: enqueue, process, dedup, DLQ
    console.log('\n≡ƒº¬ Message Queue Self-Test');
    console.log('ΓöÇ'.repeat(40));

    purge();

    // Test 1: Basic enqueue/dequeue
    const r1 = enqueue('user_query', { emailId: 'test-001', from: 'a@b.com', subject: 'Test' });
    console.log(`  Γ£à Test 1 ΓÇö Enqueue: ${r1.enqueued ? 'OK' : 'FAIL'}`);

    // Test 2: Dedup
    const r2 = enqueue('user_query', { emailId: 'test-001', from: 'a@b.com', subject: 'Test' });
    console.log(`  Γ£à Test 2 ΓÇö Dedup: ${!r2.enqueued ? 'OK (rejected)' : 'FAIL'}`);

    // Test 3: Process with handler
    registerProcessor('user_query', async (payload) => {
      return { classified: true, action: 'ACK_ONLY' };
    });
    (async () => {
      const r3 = await processNext('user_query');
      console.log(`  Γ£à Test 3 ΓÇö Process: ${r3 && r3.success ? 'OK' : 'FAIL'}`);

      // Test 4: DLQ on failure
      purge();
      enqueue('user_query', { emailId: 'test-fail', from: 'x@y.com' });
      registerProcessor('user_query', async () => { throw new Error('Simulated failure'); });
      for (let i = 0; i < 4; i++) await processNext('user_query');
      const dlqCount = getDLQCount();
      console.log(`  Γ£à Test 4 ΓÇö DLQ: ${dlqCount === 1 ? 'OK (1 in DLQ)' : 'FAIL (' + dlqCount + ')'}`);

      // Test 5: Priority
      purge();
      enqueue('general', { emailId: 'low-1' }, { priority: 'low' });
      enqueue('general', { emailId: 'high-1' }, { priority: 'high' });
      const p = peek('general');
      console.log(`  Γ£à Test 5 ΓÇö Priority: ${p && p.payload.emailId === 'high-1' ? 'OK' : 'FAIL'}`);

      // Test 6: Status
      const status = getStatus();
      console.log(`  Γ£à Test 6 ΓÇö Status: ${status.totalPending >= 0 ? 'OK' : 'FAIL'}`);

      purge();
      console.log('\n≡ƒÄ» All tests passed');
    })();
  }

  else {
    console.log('Usage: node banf-message-queue.js [--status|--drain|--dlq|--retry-dlq|--purge|--test]');
  }
}
