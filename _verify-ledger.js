const https = require('https');
function httpsReq(url) {
  return new Promise((res, rej) => {
    const u = new URL(url);
    const req = https.request({ hostname: u.hostname, port: 443, path: u.pathname + u.search }, r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)); } catch { res(d); } });
    });
    req.on('error', rej); req.end();
  });
}
(async () => {
  const r = await httpsReq('https://www.jaxbengali.org/_functions/ledger?year=2026&limit=50');
  // Try both endpoints
  for (const ep of ['ledger?year=2026&limit=20', 'ledger_list?year=2026&limit=20']) {
    console.log('--- Trying:', ep, '---');
    const r = await httpsReq('https://www.jaxbengali.org/_functions/' + ep);
    console.log('Raw response type:', typeof r);
    if (typeof r === 'string') console.log('RAW:', r.substring(0, 300));
    if (r.success) {
      console.log('SUCCESS! Entries:', r.entries.length);
      const checkDep = r.entries.find(e => e.category === 'check');
      if (checkDep) console.log('CHECK DEPOSIT FOUND:', JSON.stringify(checkDep));
      r.entries.slice(0, 8).forEach(e => {
        const sign = e.type === 'income' ? '+' : '-';
        console.log(sign + '$' + e.amount, '|', e.description, '|', (e.entryDate || '').substring(0, 10), '|', e.category);
      });
    } else if (r.error) {
      console.log('Error:', r.error);
    }
  }
})().catch(e => console.error(e.message));
