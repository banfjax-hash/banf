const https = require('https');
const gc = require('./banf-gmail-config');
function httpsReq(url, opts = {}) {
  return new Promise((res, rej) => {
    const u = new URL(url);
    const o = { hostname: u.hostname, port: 443, path: u.pathname + u.search, method: opts.method || 'GET', headers: opts.headers || {} };
    const req = https.request(o, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)); } catch { res(d); } }); });
    req.on('error', rej);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}
(async () => {
  const token = await gc.getToken();
  const r = await httpsReq('https://gmail.googleapis.com/gmail/v1/users/me/messages?q=' + encodeURIComponent('from:wellsfargo subject:"card was used" after:2026/03/15') + '&maxResults=2', {
    headers: { Authorization: 'Bearer ' + token }
  });
  if (!r.messages || !r.messages.length) { console.log('No card purchase emails found'); return; }
  for (const m of r.messages) {
    const msg = await httpsReq('https://gmail.googleapis.com/gmail/v1/users/me/messages/' + m.id + '?format=full', {
      headers: { Authorization: 'Bearer ' + token }
    });
    const headers = (msg.payload && msg.payload.headers) || [];
    const getH = n => (headers.find(h => h.name.toLowerCase() === n.toLowerCase()) || {}).value || '';
    console.log('ID:', m.id);
    console.log('Subject:', getH('Subject'));
    console.log('Date:', getH('Date'));
    let body = '';
    function extractParts(part) {
      if (part.mimeType === 'text/plain' && part.body && part.body.data) {
        body += Buffer.from(part.body.data, 'base64').toString('utf8');
      }
      if (part.parts) part.parts.forEach(extractParts);
    }
    extractParts(msg.payload || {});
    if (!body) {
      function extractHtml(part) {
        if (part.mimeType === 'text/html' && part.body && part.body.data) {
          const h = Buffer.from(part.body.data, 'base64').toString('utf8');
          body += h.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
        }
        if (part.parts) part.parts.forEach(extractHtml);
      }
      extractHtml(msg.payload || {});
    }
    console.log('Body (first 1500):', body.substring(0, 1500));
    console.log('---');
  }
})().catch(e => console.error(e.message));
