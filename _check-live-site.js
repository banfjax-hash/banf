const https = require('https');
https.get('https://www.jaxbengali.org/', { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    // Find mainPageId
    let m = data.match(/mainPageId["']?\s*[:=]\s*["']([^"']+)/);
    console.log('mainPageId:', m ? m[1] : 'NOT FOUND');

    // Find pagesMap
    let pm = data.match(/pagesMap["']?\s*:\s*(\{[^}]*\})/);
    console.log('pagesMap:', pm ? pm[1] : 'NOT FOUND');

    // Find all page IDs
    let pages = [...data.matchAll(/["']pageId["']\s*:\s*["']([^"']+)["']/g)];
    console.log('pageIds found:', pages.map(p => p[1]));

    // Check for "ivuyv" references
    let ivCount = (data.match(/ivuyv/g) || []).length;
    console.log('ivuyv references:', ivCount);

    // Check for "mainPage" references
    let mpCount = (data.match(/mainPage/g) || []).length;
    console.log('mainPage references:', mpCount);

    // Find routing info
    let routes = data.match(/routes["']?\s*:\s*(\{[^}]*\})/);
    console.log('routes:', routes ? routes[1] : 'NOT FOUND');

    // Page slug mapping
    let slugs = [...data.matchAll(/["']pageUriSEO["']\s*:\s*["']([^"']+)["']/g)];
    console.log('slugs:', slugs.map(s => s[1]));

    // Check current page being rendered
    let currentPage = data.match(/currentPageId["']?\s*[:=]\s*["']([^"']+)/);
    console.log('currentPageId:', currentPage ? currentPage[1] : 'NOT FOUND');
  });
}).on('error', e => console.error('Error:', e.message));
