const fetch = globalThis.fetch;
async function main() {
  const urls = [
    'https://www.facebook.com/banfofficial/photos/',
    'https://m.facebook.com/banfofficial/photos/'
  ];
  for (const url of urls) {
    try {
      const r = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
        redirect: 'follow',
        signal: AbortSignal.timeout(15000)
      });
      const html = await r.text();
      const re = /https:\/\/scontent[^"'\s)]+/g;
      const imgs = [...html.matchAll(re)].map(m => m[0]);
      const unique = [...new Set(imgs)];
      console.log(url);
      console.log('  status:', r.status, '| size:', html.length, '| imgs:', unique.length);
      if (unique.length > 0) unique.slice(0, 5).forEach(u => console.log('  ', u.substring(0, 130)));
      if (html.includes('login_form') || html.includes('must log in')) console.log('  LOGIN WALL');
    } catch (e) {
      console.log(url, 'ERROR:', e.message);
    }
  }
}
main();
