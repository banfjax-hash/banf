const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    const url = 'file:///' + path.join(__dirname, 'docs', 'index.html').replace(/\\/g, '/');
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    const results = {};
    
    // 1. Check gallery year tabs
    const yearTabs = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.gallery-year-tab')).map(t => t.textContent.trim());
    });
    results['year_tabs'] = yearTabs;
    console.log('Year tabs:', yearTabs.join(', '));
    
    // 2. Check 2025 gallery items (default view)
    const items2025 = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.gallery-item img')).map(img => ({
            src: img.getAttribute('src'),
            alt: img.getAttribute('alt')
        }));
    });
    results['items_2025'] = items2025.length;
    console.log('2025 items:', items2025.length);
    for (const item of items2025) {
        console.log('  ' + item.src + ' - ' + item.alt);
    }
    
    // 3. Check that NO event-images/ references remain
    const hasOldImages = await page.evaluate(() => {
        const html = document.documentElement.innerHTML;
        return html.includes('event-images/');
    });
    results['has_old_images'] = hasOldImages;
    console.log('Old event-images/ references in rendered HTML:', hasOldImages);
    
    // 4. Click 2024 tab
    await page.evaluate(() => {
        const tab = document.querySelector('.gallery-year-tab[data-year="2024"]');
        if (tab) tab.click();
    });
    await new Promise(r => setTimeout(r, 500));
    
    const items2024 = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.gallery-item img')).map(img => ({
            src: img.getAttribute('src'),
            alt: img.getAttribute('alt')
        }));
    });
    results['items_2024'] = items2024.length;
    console.log('2024 items:', items2024.length);
    for (const item of items2024) {
        console.log('  ' + item.src + ' - ' + item.alt);
    }
    
    // 5. Click 2023 tab
    await page.evaluate(() => {
        const tab = document.querySelector('.gallery-year-tab[data-year="2023"]');
        if (tab) tab.click();
    });
    await new Promise(r => setTimeout(r, 500));
    
    const items2023 = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.gallery-item img')).map(img => ({
            src: img.getAttribute('src'),
            alt: img.getAttribute('alt')
        }));
    });
    results['items_2023'] = items2023.length;
    console.log('2023 items:', items2023.length);
    for (const item of items2023) {
        console.log('  ' + item.src + ' - ' + item.alt);
    }
    
    // 6. Verify all image files exist on disk
    const fs = require('fs');
    const allSrcs = [...items2025, ...items2024, ...items2023].map(i => i.src);
    let missing = 0;
    for (const src of allSrcs) {
        const filePath = path.join(__dirname, 'docs', src);
        if (!fs.existsSync(filePath)) {
            console.log('MISSING: ' + filePath);
            missing++;
        }
    }
    results['missing_files'] = missing;
    console.log('Missing image files:', missing);
    
    // 7. Test lightbox
    await page.evaluate(() => {
        const tab = document.querySelector('.gallery-year-tab[data-year="2025"]');
        if (tab) tab.click();
    });
    await new Promise(r => setTimeout(r, 500));
    
    await page.evaluate(() => {
        const item = document.querySelector('.gallery-item');
        if (item) item.click();
    });
    await new Promise(r => setTimeout(r, 500));
    
    const lightboxVisible = await page.evaluate(() => {
        const lb = document.getElementById('galleryLightbox');
        return lb && lb.classList.contains('show');
    });
    results['lightbox_works'] = lightboxVisible;
    console.log('Lightbox opens:', lightboxVisible);
    
    // Summary
    const totalItems = items2025.length + items2024.length + items2023.length;
    console.log('\n=== SUMMARY ===');
    console.log('Tabs:', yearTabs.length, '(expected 3)');
    console.log('Total gallery items:', totalItems, '(expected 19)');
    console.log('No old event-images refs:', !hasOldImages);
    console.log('No missing files:', missing === 0);
    console.log('Lightbox works:', lightboxVisible);
    
    const allPass = yearTabs.length === 3 && totalItems === 19 && !hasOldImages && missing === 0 && lightboxVisible;
    console.log('\nALL PASS:', allPass);
    
    await browser.close();
    process.exit(allPass ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
