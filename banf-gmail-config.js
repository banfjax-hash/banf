/**
 * BANF Gmail OAuth Config — centralized secrets loader
 * Reads from .banf-secrets.json (gitignored) or environment variables.
 * All agent scripts should require this instead of hardcoding tokens.
 */
const fs = require('fs');
const path = require('path');

let _secrets = {};
const secretsPath = path.join(__dirname, '.banf-secrets.json');
try {
  _secrets = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
} catch (e) {
  // Secrets file not found — fall back to env vars
}

module.exports = {
  CLIENT_ID: process.env.BANF_GMAIL_CLIENT_ID || _secrets.CLIENT_ID || '',
  CLIENT_SECRET: process.env.BANF_GMAIL_CLIENT_SECRET || _secrets.CLIENT_SECRET || '',
  REFRESH_TOKEN: process.env.BANF_GMAIL_REFRESH_TOKEN || _secrets.REFRESH_TOKEN || '',
};
