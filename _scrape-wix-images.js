const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    // Collect all image requests
    const imageUrls = new Set();
    page.on('response', async (response) => {
        const ct = response.headers()['content-type'] || '';
        const url = response.url();
        if (ct.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)/i.test(url)) {
            const size = response.headers()['content-length'] || '?';
            imageUrls.add(url);
        }
    });
    
    console.log('Loading jaxbengali.org...');
    await page.goto('https://www.jaxbengali.org', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for lazy loading
    await new Promise(r => setTimeout(r, 3000));
    
    // Scroll down to trigger lazy loading
    console.log('Scrolling page...');
    await page.evaluate(() => {
        return new Promise(resolve => {
            let totalHeight = 0;
            const distance = 500;
            const timer = setInterval(() => {
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= document.body.scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 200);
        });
    });
    
    await new Promise(r => setTimeout(r, 3000));
    
    // Get all img src from DOM
    const domImages = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('img')).map(img => ({
            src: img.src,
            alt: img.alt || '',
            width: img.naturalWidth,
            height: img.naturalHeight
        }));
    });
    
    // Get all background images
    const bgImages = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        const bgs = [];
        for (const el of elements) {
            const style = window.getComputedStyle(el);
            const bg = style.backgroundImage;
            if (bg && bg !== 'none' && bg.includes('url(')) {
                const match = bg.match(/url\(["']?([^"')]+)/);
                if (match) bgs.push(match[1]);
            }
        }
        return bgs;
    });
    
    console.log('\n=== Network Image URLs (Wix) ===');
    for (const url of [...imageUrls].sort()) {
        if (url.includes('wixstatic.com') || url.includes('parastorage.com')) {
            console.log(url);
        }
    }
    
    console.log('\n=== DOM Images ===');
    for (const img of domImages) {
        console.log(`${img.src}  alt="${img.alt}"  ${img.width}x${img.height}`);
    }
    
    console.log('\n=== Background Images ===');
    for (const bg of bgImages) {
        if (bg.includes('wixstatic.com') || bg.includes('parastorage.com')) {
            console.log(bg);
        }
    }
    
    // Extract unique wix media file IDs 
    const allUrlStrings = [...imageUrls, ...domImages.map(i => i.src), ...bgImages];
    const wixIds = new Set();
    for (const url of allUrlStrings) {
        const match = String(url).match(/c62f94_([a-f0-9~]+)/);
        if (match) wixIds.add('c62f94_' + match[1]);
    }
    console.log('\n=== Unique Wix Media IDs: ' + wixIds.size + ' ===');
    for (const id of [...wixIds].sort()) console.log(id);

    // Now try other Wix pages
    const pages = [
        'https://www.jaxbengali.org/about',
        'https://www.jaxbengali.org/events',
        'https://www.jaxbengali.org/ec-team',
        'https://www.jaxbengali.org/contact',
        'https://www.jaxbengali.org/membership',
        'https://www.jaxbengali.org/gallery',
        'https://www.jaxbengali.org/photos',
        'https://www.jaxbengali.org/our-events',
        'https://www.jaxbengali.org/past-events',
    ];
    
    console.log('\n=== Checking other Wix pages ===');
    for (const pageUrl of pages) {
        try {
            const resp = await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 15000 });
            const status = resp.status();
            if (status === 200) {
                await new Promise(r => setTimeout(r, 2000));
                const imgs = await page.evaluate(() => {
                    return Array.from(document.querySelectorAll('img')).map(img => img.src).filter(s => s.includes('wixstatic'));
                });
                console.log(`${pageUrl} -> ${status} (${imgs.length} wix images)`);
                for (const img of imgs) {
                    console.log('  ' + img);
                    const m = img.match(/c62f94_([a-f0-9~]+)/);
                    if (m) wixIds.add('c62f94_' + m[1]);
                }
            } else {
                console.log(`${pageUrl} -> ${status}`);
            }
        } catch (e) {
            console.log(`${pageUrl} -> ERROR: ${e.message.substring(0, 80)}`);
        }
    }
    
    console.log('\n=== TOTAL Unique Wix Media IDs: ' + wixIds.size + ' ===');
    for (const id of [...wixIds].sort()) console.log(id);
    
    await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
