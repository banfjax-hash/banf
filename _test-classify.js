const puppeteer = require('puppeteer');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });
  const page = await browser.newPage();
  
  const fbids = [
    '1004971231671101',
    '1005488056458917',
    '1005625656445157',
    '1045648824270008',
    '1045650400936517'
  ];
  
  for (const fbid of fbids) {
    const url = `https://www.facebook.com/photo/?fbid=${fbid}`;
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
      await sleep(2000);
      
      const info = await page.evaluate(() => {
        const texts = [];
        
        // dir=auto elements for post text
        const dirEls = document.querySelectorAll('[dir="auto"]');
        for (const el of dirEls) {
          const t = el.innerText.trim();
          if (t.length > 10 && t.length < 2000 && !t.includes('Write a comment') && !t.includes('Press Enter')) {
            texts.push('TEXT: ' + t);
          }
        }
        
        // title
        texts.push('TITLE: ' + document.title);
        
        // timestamps  
        const timeLinks = document.querySelectorAll('a[aria-label]');
        for (const el of timeLinks) {
          const label = el.getAttribute('aria-label') || '';
          if (/\d{4}/.test(label) || /January|February|March|April|May|June|July|August|September|October|November|December/i.test(label)) {
            texts.push('DATE: ' + label);
          }
        }
        
        // Comments
        const comments = document.querySelectorAll('[role="article"]');
        for (const c of comments) {
          const t = c.innerText.trim();
          if (t.length > 5 && t.length < 500) {
            texts.push('COMMENT: ' + t.substring(0, 200));
          }
        }
        
        // Image alt text
        const imgs = document.querySelectorAll('img[alt]');
        for (const img of imgs) {
          const alt = img.alt.trim();
          if (alt.length > 10 && alt.length < 500 && alt !== 'No photo description available.') {
            texts.push('ALT: ' + alt);
          }
        }
        
        return texts.join('\n');
      });
      
      console.log(`\n=== fbid: ${fbid} ===`);
      console.log(info.substring(0, 600));
      
    } catch (e) {
      console.log(`ERROR ${fbid}: ${e.message}`);
    }
  }
  
  await page.close();
  browser.disconnect();
  console.log('\nDone!');
})();
