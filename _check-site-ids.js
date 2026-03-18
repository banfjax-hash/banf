const https = require('https');
function fetchBody(url) {
  return new Promise((resolve, reject) => {
    https.get(url, r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => resolve(d));
    }).on('error', reject);
  });
}
(async () => {
  const jax = await fetchBody('https://www.jaxbengali.org/');
  const banfwix = await fetchBody('https://banfwix.wixsite.com/banf1/');
  
  for (const [name, html] of [['jaxbengali', jax], ['banfwix', banfwix]]) {
    const meta = html.match(/metaSiteId[^a-f\d]*([\da-f-]{36})/i);
    const site = html.match(/"siteId"[^a-f\d]*([\da-f-]{36})/i);
    console.log(name, 'metaSiteId:', meta ? meta[1] : 'not found');
    console.log(name, 'siteId:', site ? site[1] : 'not found');
  }
})();
