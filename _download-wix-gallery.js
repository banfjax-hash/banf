const fs = require('fs');
const path = require('path');

const GALLERY_DIR = path.join(__dirname, 'docs', 'gallery');

// All unique Wix media IDs found from Wayback Machine + live site
const wixImages = [
    { id: 'c62f94_0952d27ccef34ec2956583a3f57f6ece~mv2.jpg', name: 'Spandan 2', label: 'spandan-2' },
    { id: 'c62f94_138829e33fb14364aaad74dc4b580b2e~mv2.jpg', name: 'Tennis Summer Camp', label: 'tennis-summer-camp' },
    { id: 'c62f94_17be468e91114e25822f073d353c94e2~mv2.jpg', name: 'Unknown 1', label: 'wix-photo-01' },
    { id: 'c62f94_30dedd8311524477bc59b1bc0358f2ac~mv2.jpg', name: 'Unknown 2', label: 'wix-photo-02' },
    { id: 'c62f94_37e4ee0437314d13a196fb18c329cf71~mv2.jpg', name: 'Unknown 3', label: 'wix-photo-03' },
    { id: 'c62f94_3a053dcc9670470fba6fcf42809d9832~mv2.jpg', name: 'Unknown 4', label: 'wix-photo-04' },
    { id: 'c62f94_507763e28613450687535e99f696f0e2~mv2.jpg', name: 'Upcoming events', label: 'upcoming-events' },
    { id: 'c62f94_5298b80e1a48468e98b9cc637f2ecefb~mv2.jpg', name: 'Unknown 5', label: 'wix-photo-05' },
    { id: 'c62f94_56871234137542568c75a7239d1641bd~mv2.jpg', name: 'Unknown 6', label: 'wix-photo-06' },
    { id: 'c62f94_5793fbd3b7e342889cfd61b3722bccbd~mv2.jpg', name: 'Beach Clean Up', label: 'beach-cleanup' },
    { id: 'c62f94_65232c4675dd48218902c6a45aae7ab3~mv2_d_4582_4000_s_4_2.jpg', name: 'Large Event Photo', label: 'event-large-01' },
    { id: 'c62f94_8bf4a1e3c78a4b19a5b85db1f18db73a~mv2.jpg', name: 'Unknown 7', label: 'wix-photo-07' },
    { id: 'c62f94_9993e4988a16403cbe28f344846777c3~mv2.jpg', name: 'Spandan 1', label: 'spandan-1' },
    { id: 'c62f94_ac812f30f66d43e6b54822bc3cd297e4~mv2.jpg', name: 'Large Photo', label: 'event-large-02' },
    { id: 'c62f94_ca2edf826584470c9842cdac0a7c9047~mv2.jpg', name: 'Unknown 8', label: 'wix-photo-08' },
    { id: 'c62f94_d55598c8fdbd4247ac1169d41f9ae2af~mv2.jpg', name: 'Unknown 9', label: 'wix-photo-09' },
    { id: 'c62f94_d55a5f712d584451b44948594777a0cc~mv2.jpg', name: 'Unknown 10', label: 'wix-photo-10' },
    { id: 'c62f94_ebcb4b27815c47e68127d8922bad6c09~mv2.jpg', name: 'Sports Day', label: 'sports-day' },
    { id: 'c62f94_eecd306075b84d818cd76433feeb3d88~mv2_d_2048_1387_s_2.jpg', name: 'Large Group Photo', label: 'event-large-03' },
    { id: 'c62f94_9e58db92918340338d8902f14016a55f~mv2.jpg', name: 'Hero/President', label: 'hero-president' },
    { id: 'c62f94_6f4f1564e4dd4551926fe6cbe715a244~mv2.jpg', name: '2025 Event List', label: '2025-event-list' },
    // The ea26fd bucket image from the homepage
    { id: 'ea26fd_b98ad44cb7e04b4abd1a58f68251f9b9~mv2_d_1920_2902_s_2.png', name: 'Wix Stock', label: 'wix-stock', skip: true },
    // Icons to skip
    { id: 'c62f94_395da83b9460481698a1208fbb8df97d~mv2.jpg', name: 'Instagram Icon', label: 'insta-icon', skip: true },
    { id: 'c62f94_70c0b6cba3ca4cf0bafb8c824d4ae76c~mv2.jpg', name: 'Facebook Icon', label: 'fb-icon', skip: true },
    { id: 'c62f94_922b1eec2e9a4367980146aa83adc7c2~mv2.png', name: 'Small Icon', label: 'small-icon', skip: true },
    { id: 'c62f94_a31e6b728e52465cb72d2ef09aca017c~mv2.png', name: 'BANF Logo', label: 'banf-logo', skip: true },
];

async function downloadImage(id, label) {
    // Try direct Wix CDN URL first (original size up to 1200px)
    const baseUrl = `https://static.wixstatic.com/media/${id}`;
    
    // Try different URL formats
    const urls = [
        `${baseUrl}/v1/fill/w_1200,h_1200,al_c,q_85/${label}.jpg`,
        `${baseUrl}/v1/fit/w_1200,h_1200/${id}`,
        baseUrl,
    ];
    
    for (const url of urls) {
        try {
            const ctrl = new AbortController();
            setTimeout(() => ctrl.abort(), 15000);
            const resp = await fetch(url, { signal: ctrl.signal });
            if (resp.ok) {
                const ct = resp.headers.get('content-type') || '';
                if (ct.startsWith('image/')) {
                    const buffer = Buffer.from(await resp.arrayBuffer());
                    const ext = ct.includes('png') ? '.png' : '.jpg';
                    const filePath = path.join(GALLERY_DIR, label + ext);
                    fs.writeFileSync(filePath, buffer);
                    console.log(`OK: ${label} (${Math.round(buffer.length/1024)}KB) <- ${url.substring(0, 80)}`);
                    return true;
                }
            }
        } catch(e) {
            // try next
        }
    }
    console.log(`FAIL: ${label} - all URLs failed`);
    return false;
}

async function main() {
    // Create gallery directory
    if (!fs.existsSync(GALLERY_DIR)) {
        fs.mkdirSync(GALLERY_DIR, { recursive: true });
    }
    
    // Also search for more Wix images from Wayback Machine (PNG too)
    console.log('=== Searching Wayback Machine for more images ===');
    try {
        const r = await fetch('http://web.archive.org/cdx/search/cdx?url=static.wixstatic.com/media/c62f94_*&output=json&fl=original,mimetype,timestamp&filter=mimetype:image/.*&limit=500', { signal: AbortSignal.timeout(15000) });
        if (r.ok) {
            const data = await r.json();
            const seen = new Set();
            for (const row of data.slice(1)) {
                const url = row[0];
                const match = url.match(/c62f94_[a-f0-9]+[^/]*/);
                if (match && !seen.has(match[0])) {
                    seen.add(match[0]);
                }
            }
            console.log(`Total unique Wix media files from Wayback: ${seen.size}`);
            
            // Check if we're missing any
            const knownIds = new Set(wixImages.map(i => i.id.split('/')[0]));
            for (const id of seen) {
                if (!knownIds.has(id)) {
                    console.log(`NEW: ${id}`);
                }
            }
        }
    } catch(e) {
        console.log('Wayback search failed:', e.message);
    }
    
    // Also try Wayback for old banfjax.wixsite.com
    console.log('\n=== Searching old banfjax.wixsite.com ===');
    try {
        const r = await fetch('http://web.archive.org/cdx/search/cdx?url=banfjax.wixsite.com/*&output=json&fl=original,mimetype,timestamp,statuscode&limit=50&collapse=urlkey', { signal: AbortSignal.timeout(10000) });
        if (r.ok) {
            const data = await r.json();
            console.log(`Old site pages: ${data.length - 1}`);
            for (const row of data.slice(1)) {
                console.log(row[0], '|', row[2]);
            }
        }
    } catch(e) {
        console.log('Old site search failed:', e.message);
    }
    
    // Download all non-skip images
    console.log('\n=== Downloading images ===');
    let success = 0, fail = 0;
    const toDownload = wixImages.filter(i => !i.skip);
    
    // Download 3 at a time
    for (let i = 0; i < toDownload.length; i += 3) {
        const batch = toDownload.slice(i, i + 3);
        const results = await Promise.all(batch.map(img => downloadImage(img.id, img.label)));
        for (const r of results) {
            if (r) success++; else fail++;
        }
    }
    
    console.log(`\nDownloaded: ${success} OK, ${fail} failed`);
    
    // List what we got
    const files = fs.readdirSync(GALLERY_DIR);
    console.log(`\nGallery files (${files.length}):`);
    for (const f of files) {
        const stat = fs.statSync(path.join(GALLERY_DIR, f));
        console.log(`  ${f} (${Math.round(stat.size/1024)}KB)`);
    }
}

main().catch(e => console.error(e));
