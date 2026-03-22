// Script to explore Wix REST APIs for page management
const https = require('https');
const fs = require('fs');

const acct = JSON.parse(fs.readFileSync('C:/Users/moumi/.wix/auth/account.json', 'utf8'));
const site = JSON.parse(fs.readFileSync('C:/Users/moumi/.wix/auth/6a4f0362-0394-4e28-8559-f6145dd414e0.json', 'utf8'));

const siteId = '6a4f0362-0394-4e28-8559-f6145dd414e0'; // metaSiteId
const htmlSiteId = '7c1629de-1358-490b-b768-f99fae428170';
const accountId = acct.userInfo.userId;

function apiCall(host, path, method, body, headers) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: host,
      path: path,
      method: method,
      headers: { 'Content-Type': 'application/json', ...headers }
    };
    if (body && method !== 'GET') {
      opts.headers['Content-Length'] = Buffer.byteLength(body);
    }
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body && method !== 'GET') req.write(body);
    req.end();
  });
}

async function main() {
  // Test with account token + wix-site-id (the metaSiteId)
  console.log('=== Testing with account token + metaSiteId as wix-site-id ===');

  const endpoints = [
    // URL Redirects
    ['POST', '/url-redirects/v2/redirects/query', JSON.stringify({ query: {} })],
    ['GET', '/url-redirects/v2/redirects', ''],
    // Site structure  
    ['GET', '/site-properties/v4/properties', ''],
    // Menus / Navigation
    ['POST', '/menus/v1/menus/query', JSON.stringify({ query: {} })],
    ['POST', '/site-menus/v1/menus/query', JSON.stringify({ query: {} })],
    // Pages
    ['POST', '/site-pages/v2/pages/query', JSON.stringify({ query: {} })],
    ['GET', '/site-pages/v2/pages', ''],
  ];

  for (const [method, path, body] of endpoints) {
    try {
      const res = await apiCall('www.wixapis.com', path, method, body, {
        'Authorization': acct.accessToken,
        'wix-site-id': siteId
      });
      const preview = res.body.substring(0, 200);
      const isHtml = preview.includes('<!DOCTYPE') || preview.includes('<html');
      console.log(`  ${method} ${path} => ${res.status} ${isHtml ? '[HTML]' : preview}`);
    } catch (e) {
      console.log(`  ${method} ${path} => ERROR: ${e.message}`);
    }
  }

  // Now test with wix-account-id instead
  console.log('\n=== Testing with account token + wix-account-id ===');
  for (const [method, path, body] of endpoints) {
    try {
      const res = await apiCall('www.wixapis.com', path, method, body, {
        'Authorization': acct.accessToken,
        'wix-account-id': accountId
      });
      const preview = res.body.substring(0, 200);
      const isHtml = preview.includes('<!DOCTYPE') || preview.includes('<html');
      console.log(`  ${method} ${path} => ${res.status} ${isHtml ? '[HTML]' : preview}`);
    } catch (e) {
      console.log(`  ${method} ${path} => ERROR: ${e.message}`);
    }
  }

  // Test with site token + htmlSiteId
  console.log('\n=== Testing with site token + htmlSiteId ===');
  for (const [method, path, body] of endpoints) {
    try {
      const res = await apiCall('www.wixapis.com', path, method, body, {
        'Authorization': site.accessToken,
        'wix-site-id': htmlSiteId
      });
      const preview = res.body.substring(0, 200);
      const isHtml = preview.includes('<!DOCTYPE') || preview.includes('<html');
      console.log(`  ${method} ${path} => ${res.status} ${isHtml ? '[HTML]' : preview}`);
    } catch (e) {
      console.log(`  ${method} ${path} => ERROR: ${e.message}`);
    }
  }
}

main().catch(console.error);
