const https = require('https');
https.get('https://www.jaxbengali.org/', { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    // Get the full routes object
    let routesMatch = data.match(/routes["']\s*:\s*(\{(?:[^{}]|\{[^{}]*\})*\})/);
    console.log('=== ROUTES ===');
    console.log(routesMatch ? routesMatch[1] : 'NOT FOUND');

    // Get full pagesMap
    let pmMatch = data.match(/pagesMap["']\s*:\s*(\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\})/);
    console.log('\n=== PAGES MAP ===');
    console.log(pmMatch ? pmMatch[1] : 'NOT FOUND');

    // Find what page is associated with root route "./"
    let rootRoute = data.match(/['"]\.\/"?\s*:\s*\{[^}]*\}/);
    console.log('\n=== ROOT ROUTE ===');
    console.log(rootRoute ? rootRoute[0] : 'NOT FOUND');

    // Find what content ivuyv page renders (look for component refs)
    let ivuyvSection = data.indexOf('ivuyv');
    if (ivuyvSection > -1) {
      console.log('\n=== CONTEXT AROUND FIRST ivuyv ===');
      console.log(data.substring(Math.max(0, ivuyvSection - 100), ivuyvSection + 200));
    }

    // Find the title tag
    let title = data.match(/<title>([^<]+)<\/title>/);
    console.log('\n=== PAGE TITLE ===');
    console.log(title ? title[1] : 'NOT FOUND');

    // Check if there's a redirect URL in the HTML
    let redirects = data.match(/banfjax-hash\.github\.io[^'")\s]*/g);
    console.log('\n=== REDIRECT URLS IN HTML ===');
    console.log(redirects || 'NONE');
  });
}).on('error', e => console.error('Error:', e.message));
