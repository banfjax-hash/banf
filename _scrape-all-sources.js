const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const galleryDir = path.join(__dirname, 'docs/gallery');

async function scrapeYouTube(browser) {
    console.log('=== Scraping BANF YouTube channel ===');
    const page = await browser.newPage();
    try {
        await page.goto('https://www.youtube.com/@banfjacksonville/videos', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        await new Promise(r => setTimeout(r, 3000));

        // Scroll to load more videos
        for (let i = 0; i < 5; i++) {
            await page.evaluate(() => window.scrollBy(0, 1000));
            await new Promise(r => setTimeout(r, 1000));
        }

        // Extract video data
        const videos = await page.evaluate(() => {
            const items = document.querySelectorAll('ytd-rich-item-renderer, ytd-grid-video-renderer');
            const results = [];
            items.forEach(item => {
                const titleEl = item.querySelector('#video-title');
                const thumbEl = item.querySelector('img');
                const linkEl = item.querySelector('a#thumbnail');
                if (titleEl && linkEl) {
                    const href = linkEl.getAttribute('href') || '';
                    const match = href.match(/v=([A-Za-z0-9_-]+)/);
                    results.push({
                        title: titleEl.textContent.trim(),
                        videoId: match ? match[1] : '',
                        thumbnail: thumbEl ? thumbEl.src : ''
                    });
                }
            });
            return results;
        });

        console.log('Videos found:', videos.length);
        let downloaded = 0;
        for (const v of videos) {
            console.log('  ' + v.videoId + ': ' + v.title);
            if (v.videoId) {
                // Try to get max resolution thumbnail
                for (const res of ['maxresdefault', 'sddefault', 'hqdefault']) {
                    const url = `https://img.youtube.com/vi/${v.videoId}/${res}.jpg`;
                    try {
                        const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
                        if (r.ok) {
                            const buf = Buffer.from(await r.arrayBuffer());
                            if (buf.length > 5000) {
                                // Create safe filename from title
                                const safe = v.title.replace(/[^a-zA-Z0-9 ]/g, '').trim().substring(0, 40).replace(/ +/g, '-').toLowerCase();
                                const fname = 'yt-' + safe + '.jpg';
                                fs.writeFileSync(path.join(galleryDir, fname), buf);
                                console.log('    -> ' + fname + ' (' + Math.round(buf.length / 1024) + 'KB)');
                                downloaded++;
                                break;
                            }
                        }
                    } catch (e) { }
                }
            }
        }
        console.log('YouTube thumbnails downloaded:', downloaded);
    } catch (e) {
        console.log('YouTube scrape error:', e.message);
    }
    await page.close();
}

async function scrapeWaybackWix(browser) {
    console.log('\n=== Scraping old BANF Wix site from Wayback Machine ===');
    const page = await browser.newPage();
    
    // Try archived version of the old Wix homepage
    const waybackUrls = [
        'https://web.archive.org/web/2024/https://www.jaxbengali.org/',
        'https://web.archive.org/web/2023/https://www.jaxbengali.org/',
        'https://web.archive.org/web/2024/https://banfjax.wixsite.com/banf',
    ];

    for (const url of waybackUrls) {
        try {
            console.log('Trying: ' + url);
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
            
            // Get all image URLs
            const images = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('img')).map(img => ({
                    src: img.src,
                    alt: img.alt || '',
                    width: img.naturalWidth,
                    height: img.naturalHeight
                })).filter(i => i.src && (i.src.includes('wixstatic') || i.src.includes('web.archive.org')));
            });
            
            console.log('  Images found:', images.length);
            for (const img of images) {
                console.log('  ' + img.alt + ': ' + img.src.substring(0, 120));
            }
        } catch (e) {
            console.log('  Error: ' + e.message.substring(0, 80));
        }
    }
    await page.close();
}

async function scrapeBANFFacebook(browser) {
    console.log('\n=== Trying BANF Facebook via Wayback Machine ===');
    
    // Try to get archived Facebook page photos
    try {
        const r = await fetch('http://web.archive.org/cdx/search/cdx?url=facebook.com/banfofficial/photos*&output=json&fl=original,timestamp&limit=20&collapse=urlkey', 
            { signal: AbortSignal.timeout(10000) });
        if (r.ok) {
            const data = await r.json();
            console.log('Archived Facebook photo pages:', data.length - 1);
            for (const row of data.slice(1)) {
                console.log('  ' + row[0] + ' | ' + row[1]);
            }
        }
    } catch (e) {
        console.log('Facebook Wayback failed:', e.message);
    }
    
    // Also search for scontent (Facebook CDN) images related to BANF
    try {
        const r = await fetch('http://web.archive.org/cdx/search/cdx?url=scontent*.fbcdn.net/*banf*&output=json&fl=original,timestamp,mimetype&filter=mimetype:image/.*&limit=20', 
            { signal: AbortSignal.timeout(10000) });
        if (r.ok) {
            const data = await r.json();
            console.log('Facebook CDN images:', data.length - 1);
        }
    } catch (e) {
        console.log('FB CDN search:', e.message);
    }
}

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    await scrapeYouTube(browser);
    await scrapeWaybackWix(browser);
    await scrapeBANFFacebook(browser);
    await browser.close();

    // Final listing
    const files = fs.readdirSync(galleryDir);
    console.log('\n=== Final gallery inventory: ' + files.length + ' files ===');
    for (const f of files.sort()) {
        const s = fs.statSync(path.join(galleryDir, f));
        console.log('  ' + f + ' (' + Math.round(s.size / 1024) + 'KB)');
    }
})().catch(e => console.error(e));
