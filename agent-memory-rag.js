#!/usr/bin/env node
/**
 * ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
 *  BANF AGENT MEMORY ΓÇö Vector RAG System for Long-Term Agent Learning
 * ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
 *
 *  A lightweight, file-based vector RAG (Retrieval-Augmented Generation) system
 *  that gives all BANF agents persistent long-term memory.
 *
 *  Vector Similarity: TF-IDF + Cosine Similarity (pure JS, no external deps)
 *
 *  Memory Types:
 *    EXPERIENCE  ΓÇö Lessons learned from processing emails (e.g. SubrataΓëáMahua)
 *    PATTERN     ΓÇö Detected patterns (e.g. name-email mismatches)
 *    CORRECTION  ΓÇö Human corrections to agent decisions
 *    CONTEXT     ΓÇö Organizational context (member relationships, history)
 *    DECISION    ΓÇö Past decisions and their outcomes
 *    FEEDBACK    ΓÇö Approval/rejection feedback from president
 *
 *  Usage:
 *    const memory = require('./agent-memory-rag.js');
 *
 *    // Store a memory
 *    memory.store({
 *      type: 'EXPERIENCE',
 *      content: 'Email robchatto@aol.com is registered to Mahua but used by Subrata',
 *      tags: ['name_mismatch', 'member_identity', 'chattopadhyay'],
 *      context: { email: 'robchatto@aol.com', crmName: 'Mahua', actualName: 'Subrata' },
 *      source: 'user_query_agent',
 *      impact: 'high'
 *    });
 *
 *    // Search memories (returns ranked results)
 *    const results = memory.search('name change request robchatto', { limit: 5 });
 *
 *    // Get memories by type
 *    const experiences = memory.getByType('EXPERIENCE');
 *
 *  CLI:
 *    node agent-memory-rag.js --stats          # Memory statistics
 *    node agent-memory-rag.js --search "query"  # Search memories
 *    node agent-memory-rag.js --dump            # Dump all memories
 *    node agent-memory-rag.js --compact         # Compact/optimize store
 *
 * ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// CONFIGURATION
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const CONFIG = {
  MEMORY_FILE: path.join(__dirname, 'agent-memory-store.json'),
  INDEX_FILE: path.join(__dirname, 'agent-memory-index.json'),
  MAX_MEMORIES: 10000,
  SIMILARITY_THRESHOLD: 0.15,    // Min cosine similarity for search results
  DEDUP_THRESHOLD: 0.92,         // Similarity above this = duplicate
  DECAY_DAYS: 180,               // Memories decay relevance after this many days
  BOOST_FACTOR_HIGH_IMPACT: 1.5, // Boost high-impact memories in search
  BOOST_FACTOR_CORRECTED: 1.3,   // Boost correction-type memories
};

const MEMORY_TYPES = {
  EXPERIENCE: 'experience',    // What agent learned from processing
  PATTERN: 'pattern',          // Detected behavioral/data patterns
  CORRECTION: 'correction',    // Human corrections to agent behavior
  CONTEXT: 'context',          // Organizational knowledge
  DECISION: 'decision',        // Past decisions + outcomes
  FEEDBACK: 'feedback',        // Approval/rejection feedback
  IDENTITY: 'identity',        // Member identity insights (nameΓëáemail, aliases)
  RELATIONSHIP: 'relationship' // Member relationships, household connections
};

const IMPACT_LEVELS = {
  CRITICAL: 'critical',  // Must always be retrieved (e.g., name mismatch causing wrong response)
  HIGH: 'high',          // Important for quality (e.g., payment corrections)
  MEDIUM: 'medium',      // Useful context
  LOW: 'low'             // Nice-to-have
};

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// VECTOR ENGINE ΓÇö TF-IDF + Cosine Similarity (pure JS)
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

class VectorEngine {
  constructor() {
    this.idfCache = {};
    this.stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
      'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
      'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
      'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
      'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'both',
      'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
      'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
      'because', 'but', 'and', 'or', 'if', 'while', 'although', 'that',
      'this', 'these', 'those', 'it', 'its', 'i', 'me', 'my', 'we', 'our',
      'you', 'your', 'he', 'him', 'his', 'she', 'her', 'they', 'them', 'their',
      'what', 'which', 'who', 'whom'
    ]);
  }

  /**
   * Tokenize text into meaningful terms
   */
  tokenize(text) {
    if (!text) return [];
    return text.toLowerCase()
      .replace(/[^a-z0-9@._\-]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1 && !this.stopWords.has(t));
  }

  /**
   * Compute term frequency for a document
   */
  tf(tokens) {
    const freq = {};
    for (const t of tokens) {
      freq[t] = (freq[t] || 0) + 1;
    }
    const max = Math.max(...Object.values(freq), 1);
    const normalized = {};
    for (const [term, count] of Object.entries(freq)) {
      normalized[term] = 0.5 + 0.5 * (count / max); // augmented TF
    }
    return normalized;
  }

  /**
   * Build IDF from all documents
   */
  buildIDF(documents) {
    const N = documents.length;
    const docFreq = {};
    
    for (const doc of documents) {
      const uniqueTerms = new Set(doc.tokens);
      for (const term of uniqueTerms) {
        docFreq[term] = (docFreq[term] || 0) + 1;
      }
    }
    
    this.idfCache = {};
    for (const [term, df] of Object.entries(docFreq)) {
      this.idfCache[term] = Math.log((N + 1) / (df + 1)) + 1; // smoothed IDF
    }
  }

  /**
   * Compute TF-IDF vector for a document
   */
  tfidf(tokens) {
    const tfScores = this.tf(tokens);
    const vector = {};
    for (const [term, tfVal] of Object.entries(tfScores)) {
      const idf = this.idfCache[term] || Math.log(1000); // default high IDF for unknown terms
      vector[term] = tfVal * idf;
    }
    return vector;
  }

  /**
   * Cosine similarity between two sparse vectors
   */
  cosineSimilarity(vecA, vecB) {
    const allTerms = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (const term of allTerms) {
      const a = vecA[term] || 0;
      const b = vecB[term] || 0;
      dotProduct += a * b;
      normA += a * a;
      normB += b * b;
    }
    
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Build searchable index from memories
   */
  buildIndex(memories) {
    const documents = memories.map(m => ({
      id: m.id,
      tokens: this.tokenize(this.getSearchableText(m))
    }));
    
    this.buildIDF(documents);
    
    return documents.map(doc => ({
      id: doc.id,
      tokens: doc.tokens,
      vector: this.tfidf(doc.tokens)
    }));
  }

  /**
   * Get all searchable text from a memory
   */
  getSearchableText(memory) {
    const parts = [
      memory.content || '',
      (memory.tags || []).join(' '),
      memory.type || '',
      memory.source || '',
      JSON.stringify(memory.context || {})
    ];
    return parts.join(' ');
  }

  /**
   * Search indexed documents by query
   */
  search(query, indexedDocs, options = {}) {
    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) return [];
    
    const queryVector = this.tfidf(queryTokens);
    
    const results = [];
    for (const doc of indexedDocs) {
      const similarity = this.cosineSimilarity(queryVector, doc.vector);
      if (similarity >= (options.threshold || CONFIG.SIMILARITY_THRESHOLD)) {
        results.push({ id: doc.id, similarity });
      }
    }
    
    return results.sort((a, b) => b.similarity - a.similarity);
  }
}

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// MEMORY STORE
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

class AgentMemory {
  constructor() {
    this.engine = new VectorEngine();
    this.memories = this._loadMemories();
    this.index = null; // Lazy-built
  }

  _loadMemories() {
    try {
      if (fs.existsSync(CONFIG.MEMORY_FILE)) {
        return JSON.parse(fs.readFileSync(CONFIG.MEMORY_FILE, 'utf8'));
      }
    } catch (e) {
      console.error('[MEMORY] Failed to load:', e.message);
    }
    return [];
  }

  _save() {
    fs.writeFileSync(CONFIG.MEMORY_FILE, JSON.stringify(this.memories, null, 2));
    this.index = null; // Invalidate index
  }

  _ensureIndex() {
    if (!this.index) {
      this.index = this.engine.buildIndex(this.memories);
    }
  }

  /**
   * Store a new memory
   * @param {object} memory - { type, content, tags[], context{}, source, impact, relatedEmails[] }
   * @returns {object} stored memory with id
   */
  store(memory) {
    // Generate ID
    const id = `MEM-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    
    const stored = {
      id,
      type: memory.type || MEMORY_TYPES.EXPERIENCE,
      content: memory.content,
      tags: memory.tags || [],
      context: memory.context || {},
      source: memory.source || 'unknown',
      impact: memory.impact || IMPACT_LEVELS.MEDIUM,
      relatedEmails: memory.relatedEmails || [],
      createdAt: new Date().toISOString(),
      accessCount: 0,
      lastAccessed: null,
      confidence: memory.confidence || 1.0,
      supersedes: memory.supersedes || null, // ID of memory this replaces
    };
    
    // Check for near-duplicates before storing
    this._ensureIndex();
    const searchText = this.engine.getSearchableText(stored);
    const queryTokens = this.engine.tokenize(searchText);
    const queryVector = this.engine.tfidf(queryTokens);
    
    for (const doc of this.index) {
      const similarity = this.engine.cosineSimilarity(queryVector, doc.vector);
      if (similarity >= CONFIG.DEDUP_THRESHOLD) {
        // Update existing memory instead of creating duplicate
        const existing = this.memories.find(m => m.id === doc.id);
        if (existing) {
          existing.accessCount++;
          existing.lastAccessed = new Date().toISOString();
          existing.confidence = Math.min(existing.confidence + 0.1, 1.0);
          // Merge tags
          const allTags = new Set([...(existing.tags || []), ...(stored.tags || [])]);
          existing.tags = [...allTags];
          // Merge context
          existing.context = { ...existing.context, ...stored.context };
          this._save();
          return existing;
        }
      }
    }
    
    // Enforce max memories
    if (this.memories.length >= CONFIG.MAX_MEMORIES) {
      this._compact();
    }
    
    this.memories.push(stored);
    this._save();
    return stored;
  }

  /**
   * Search memories using natural language query
   * @param {string} query - Search query
   * @param {object} options - { limit, type, minImpact, tags[] }
   * @returns {object[]} Ranked memory results with scores
   */
  search(query, options = {}) {
    if (this.memories.length === 0) return [];
    
    this._ensureIndex();
    
    const rawResults = this.engine.search(query, this.index, {
      threshold: options.threshold || CONFIG.SIMILARITY_THRESHOLD
    });
    
    // Enrich results with memory data and apply boosts
    const enriched = rawResults.map(r => {
      const memory = this.memories.find(m => m.id === r.id);
      if (!memory) return null;
      
      let score = r.similarity;
      
      // Boost by impact
      if (memory.impact === IMPACT_LEVELS.CRITICAL) score *= 2.0;
      else if (memory.impact === IMPACT_LEVELS.HIGH) score *= CONFIG.BOOST_FACTOR_HIGH_IMPACT;
      
      // Boost corrections
      if (memory.type === MEMORY_TYPES.CORRECTION) score *= CONFIG.BOOST_FACTOR_CORRECTED;
      if (memory.type === MEMORY_TYPES.IDENTITY) score *= CONFIG.BOOST_FACTOR_CORRECTED;
      
      // Time decay (slight preference for recent memories)
      const ageMs = Date.now() - new Date(memory.createdAt).getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      const decayFactor = Math.max(0.5, 1 - (ageDays / (CONFIG.DECAY_DAYS * 2)));
      score *= decayFactor;
      
      // Frequency boost (well-accessed memories are more relevant)
      if (memory.accessCount > 5) score *= 1.1;
      
      return { memory, score, rawSimilarity: r.similarity };
    }).filter(Boolean);
    
    // Apply filters
    let filtered = enriched;
    if (options.type) {
      filtered = filtered.filter(r => r.memory.type === options.type);
    }
    if (options.minImpact) {
      const impactOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const minLevel = impactOrder[options.minImpact] || 0;
      filtered = filtered.filter(r => (impactOrder[r.memory.impact] || 0) >= minLevel);
    }
    if (options.tags && options.tags.length > 0) {
      filtered = filtered.filter(r => 
        options.tags.some(t => r.memory.tags.includes(t))
      );
    }
    
    // Sort by score and limit
    filtered.sort((a, b) => b.score - a.score);
    const limit = options.limit || 10;
    const results = filtered.slice(0, limit);
    
    // Update access counts
    for (const r of results) {
      r.memory.accessCount++;
      r.memory.lastAccessed = new Date().toISOString();
    }
    if (results.length > 0) this._save();
    
    return results;
  }

  /**
   * Get memories by type
   */
  getByType(type, options = {}) {
    let results = this.memories.filter(m => m.type === type);
    if (options.source) {
      results = results.filter(m => m.source === options.source);
    }
    if (options.limit) {
      results = results.slice(0, options.limit);
    }
    return results;
  }

  /**
   * Get memories related to a specific email address
   */
  getByEmail(email) {
    const emailLower = email.toLowerCase();
    return this.memories.filter(m => {
      const ctx = JSON.stringify(m.context || {}).toLowerCase();
      const content = (m.content || '').toLowerCase();
      return ctx.includes(emailLower) || content.includes(emailLower);
    });
  }

  /**
   * Get memories related to a specific member name
   */
  getByName(name) {
    const nameLower = name.toLowerCase();
    return this.memories.filter(m => {
      const ctx = JSON.stringify(m.context || {}).toLowerCase();
      const content = (m.content || '').toLowerCase();
      return ctx.includes(nameLower) || content.includes(nameLower);
    });
  }

  /**
   * Get aggregate insights about a person by email or name
   */
  getPersonInsights(emailOrName) {
    const query = emailOrName.toLowerCase();
    const related = this.memories.filter(m => {
      const searchable = this.engine.getSearchableText(m).toLowerCase();
      return searchable.includes(query);
    });
    
    const identities = related.filter(m => m.type === MEMORY_TYPES.IDENTITY);
    const corrections = related.filter(m => m.type === MEMORY_TYPES.CORRECTION);
    const experiences = related.filter(m => m.type === MEMORY_TYPES.EXPERIENCE);
    
    // Build a consolidated profile
    const profile = {
      emailOrName: query,
      knownAliases: [],
      preferredName: null,
      corrections: corrections.map(c => c.content),
      insights: experiences.map(e => e.content),
      totalMemories: related.length,
      highImpact: related.filter(m => m.impact === 'critical' || m.impact === 'high'),
    };
    
    // Extract aliases/name info from identity memories
    for (const id of identities) {
      if (id.context.actualName) profile.preferredName = id.context.actualName;
      if (id.context.aliases) profile.knownAliases.push(...id.context.aliases);
      if (id.context.crmName && id.context.crmName !== id.context.actualName) {
        profile.knownAliases.push(id.context.crmName);
      }
    }
    
    return profile;
  }

  /**
   * Record that a specific experience led to a correction
   * Useful for tracking what went wrong and how it was fixed
   */
  recordCorrection(originalAction, correctedAction, reason, context = {}) {
    return this.store({
      type: MEMORY_TYPES.CORRECTION,
      content: `Correction: ${reason}. Original: ${originalAction}. Corrected: ${correctedAction}`,
      tags: ['correction', 'learning', ...(context.tags || [])],
      context: {
        originalAction,
        correctedAction,
        reason,
        ...context
      },
      source: context.source || 'human_feedback',
      impact: context.impact || IMPACT_LEVELS.HIGH,
      confidence: 1.0 // Human corrections are always high confidence
    });
  }

  /**
   * Record an identity insight (name-email mismatch, alias, etc.)
   */
  recordIdentity(email, crmName, actualName, evidence, context = {}) {
    return this.store({
      type: MEMORY_TYPES.IDENTITY,
      content: `Identity: ${email} ΓÇö CRM shows "${crmName}" but actual person is "${actualName}". Evidence: ${evidence}`,
      tags: ['identity', 'name_mismatch', (actualName || '').toLowerCase(), (crmName || '').toLowerCase()],
      context: {
        email,
        crmName,
        actualName,
        evidence,
        ...context
      },
      source: context.source || 'user_query_agent',
      impact: IMPACT_LEVELS.CRITICAL,
      confidence: 0.9
    });
  }

  /**
   * Record a pattern the agent detected
   */
  recordPattern(pattern, evidence, context = {}) {
    return this.store({
      type: MEMORY_TYPES.PATTERN,
      content: pattern,
      tags: ['pattern', ...(context.tags || [])],
      context: {
        evidence,
        detectedAt: new Date().toISOString(),
        ...context
      },
      source: context.source || 'pattern_detector',
      impact: context.impact || IMPACT_LEVELS.MEDIUM
    });
  }

  /**
   * Record a decision and its outcome for future reference
   */
  recordDecision(decision, outcome, context = {}) {
    return this.store({
      type: MEMORY_TYPES.DECISION,
      content: `Decision: ${decision}. Outcome: ${outcome}`,
      tags: ['decision', ...(context.tags || [])],
      context: {
        decision,
        outcome,
        ...context
      },
      source: context.source || 'agent_decision',
      impact: context.impact || IMPACT_LEVELS.MEDIUM
    });
  }

  /**
   * Compact memory store ΓÇö remove low-value old memories
   */
  _compact() {
    const now = Date.now();
    
    // Score each memory for retention
    const scored = this.memories.map(m => {
      let retentionScore = 0;
      
      // Impact weight
      const impactWeights = { critical: 100, high: 50, medium: 20, low: 5 };
      retentionScore += impactWeights[m.impact] || 10;
      
      // Access frequency
      retentionScore += (m.accessCount || 0) * 3;
      
      // Type weight (corrections are always valuable)
      const typeWeights = { correction: 40, identity: 40, pattern: 20, experience: 10, context: 15, decision: 10, feedback: 15, relationship: 20 };
      retentionScore += typeWeights[m.type] || 5;
      
      // Recency (fresher memories score higher)
      const ageMs = now - new Date(m.createdAt).getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      retentionScore -= Math.floor(ageDays / 30); // -1 per month old
      
      return { memory: m, retentionScore };
    });
    
    // Sort by retention score and keep top N
    scored.sort((a, b) => b.retentionScore - a.retentionScore);
    const keepCount = Math.floor(CONFIG.MAX_MEMORIES * 0.8);
    this.memories = scored.slice(0, keepCount).map(s => s.memory);
    
    this._save();
    return this.memories.length;
  }

  /**
   * Get memory statistics
   */
  stats() {
    const byType = {};
    const byImpact = {};
    const bySource = {};
    let totalAccess = 0;
    
    for (const m of this.memories) {
      byType[m.type] = (byType[m.type] || 0) + 1;
      byImpact[m.impact] = (byImpact[m.impact] || 0) + 1;
      bySource[m.source] = (bySource[m.source] || 0) + 1;
      totalAccess += m.accessCount || 0;
    }
    
    return {
      totalMemories: this.memories.length,
      byType,
      byImpact,
      bySource,
      totalAccesses: totalAccess,
      oldestMemory: this.memories.length > 0 ? this.memories[0].createdAt : null,
      newestMemory: this.memories.length > 0 ? this.memories[this.memories.length - 1].createdAt : null
    };
  }
}

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// SINGLETON INSTANCE (shared across all agents)
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

let _instance = null;
function getMemory() {
  if (!_instance) {
    _instance = new AgentMemory();
  }
  return _instance;
}

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// CLI
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function cmdStats() {
  const memory = getMemory();
  const stats = memory.stats();
  
  console.log('ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ');
  console.log('  ≡ƒºá BANF AGENT MEMORY ΓÇö Statistics');
  console.log('ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ\n');
  
  console.log(`  Total Memories: ${stats.totalMemories}`);
  console.log(`  Total Accesses: ${stats.totalAccesses}`);
  console.log(`  Oldest: ${stats.oldestMemory || 'N/A'}`);
  console.log(`  Newest: ${stats.newestMemory || 'N/A'}\n`);
  
  console.log('  By Type:');
  for (const [type, count] of Object.entries(stats.byType).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${type}: ${count}`);
  }
  
  console.log('\n  By Impact:');
  for (const [impact, count] of Object.entries(stats.byImpact).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${impact}: ${count}`);
  }
  
  console.log('\n  By Source:');
  for (const [source, count] of Object.entries(stats.bySource).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${source}: ${count}`);
  }
}

function cmdSearch(query) {
  const memory = getMemory();
  const results = memory.search(query, { limit: 10 });
  
  console.log('ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ');
  console.log(`  ≡ƒöì SEARCH: "${query}"`);
  console.log(`  Results: ${results.length}`);
  console.log('ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ\n');
  
  for (const r of results) {
    console.log(`  [${r.memory.type}] Score: ${r.score.toFixed(3)} | Impact: ${r.memory.impact}`);
    console.log(`  ${r.memory.content.substring(0, 120)}`);
    console.log(`  Tags: ${r.memory.tags.join(', ')}`);
    console.log(`  Created: ${r.memory.createdAt} | Accessed: ${r.memory.accessCount}x`);
    console.log('  ---');
  }
}

function cmdDump() {
  const memory = getMemory();
  console.log(JSON.stringify(memory.memories, null, 2));
}

function cmdCompact() {
  const memory = getMemory();
  const before = memory.memories.length;
  const after = memory._compact();
  console.log(`Compacted: ${before} ΓåÆ ${after} memories`);
}

// CLI entry
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--stats')) {
    cmdStats();
  } else if (args.includes('--search')) {
    const idx = args.indexOf('--search');
    const query = args.slice(idx + 1).join(' ');
    if (!query) {
      console.log('Usage: node agent-memory-rag.js --search "query text"');
    } else {
      cmdSearch(query);
    }
  } else if (args.includes('--dump')) {
    cmdDump();
  } else if (args.includes('--compact')) {
    cmdCompact();
  } else {
    console.log('BANF Agent Memory ΓÇö Vector RAG System');
    console.log('');
    console.log('  --stats           Memory statistics');
    console.log('  --search "query"  Search memories');
    console.log('  --dump            Dump all memories');
    console.log('  --compact         Compact/optimize store');
  }
}

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// EXPORTS
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

module.exports = {
  getMemory,
  AgentMemory,
  VectorEngine,
  MEMORY_TYPES,
  IMPACT_LEVELS,
  CONFIG: CONFIG,
  
  // Convenience functions (use singleton)
  store: (memory) => getMemory().store(memory),
  search: (query, options) => getMemory().search(query, options),
  getByType: (type, options) => getMemory().getByType(type, options),
  getByEmail: (email) => getMemory().getByEmail(email),
  getByName: (name) => getMemory().getByName(name),
  getPersonInsights: (emailOrName) => getMemory().getPersonInsights(emailOrName),
  recordCorrection: (...args) => getMemory().recordCorrection(...args),
  recordIdentity: (...args) => getMemory().recordIdentity(...args),
  recordPattern: (...args) => getMemory().recordPattern(...args),
  recordDecision: (...args) => getMemory().recordDecision(...args),
  stats: () => getMemory().stats()
};
