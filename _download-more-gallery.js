const fs = require('fs');
const path = require('path');

async function main() {
    const galleryDir = path.join(__dirname, 'docs/gallery');
    
    // Try wix-photo-10 via Wayback Machine
    const id = 'c62f94_d55a5f712d584451b44948594777a0cc~mv2.jpg';
    const waybackUrl = 'https://web.archive.org/web/2024/https://static.wixstatic.com/media/' + id + '/v1/fill/w_960,h_929/' + id;
    
    try {
        const r = await fetch(waybackUrl, { signal: AbortSignal.timeout(15000), redirect: 'follow' });
        console.log('Wayback wix-photo-10:', r.status, r.headers.get('content-type'), r.headers.get('content-length'));
        if (r.ok && (r.headers.get('content-type') || '').startsWith('image/')) {
            const buf = Buffer.from(await r.arrayBuffer());
            fs.writeFileSync(path.join(galleryDir, 'wix-photo-10.jpg'), buf);
            console.log('Saved wix-photo-10.jpg (' + Math.round(buf.length / 1024) + 'KB)');
        }
    } catch (e) { console.log('wix-photo-10 wayback failed:', e.message); }

    // Try BANF YouTube channel for thumbnails
    try {
        const ytUrl = 'https://www.youtube.com/@banfjacksonville/videos';
        const r = await fetch(ytUrl, { signal: AbortSignal.timeout(10000) });
        const text = await r.text();

        // Extract video IDs
        const videoIdRe = /"videoId":"([A-Za-z0-9_-]+)"/g;
        const videoIds = new Set();
        let match;
        while ((match = videoIdRe.exec(text)) !== null) {
            videoIds.add(match[1]);
        }
        console.log('\nYouTube videos found:', videoIds.size);

        // Download thumbnails
        let count = 0;
        for (const vid of [...videoIds].slice(0, 20)) {
            const thumbUrl = 'https://img.youtube.com/vi/' + vid + '/maxresdefault.jpg';
            try {
                const tr = await fetch(thumbUrl, { signal: AbortSignal.timeout(5000) });
                if (tr.ok) {
                    const buf = Buffer.from(await tr.arrayBuffer());
                    if (buf.length > 5000) {
                        const fname = 'yt-' + vid + '.jpg';
                        fs.writeFileSync(path.join(galleryDir, fname), buf);
                        console.log('  ' + fname + ' (' + Math.round(buf.length / 1024) + 'KB)');
                        count++;
                    }
                }
            } catch (e) { }
        }
        console.log('YouTube thumbnails saved:', count);

        // Extract video titles
        const titleRe = /"title":\{"runs":\[\{"text":"([^"]+)"/g;
        const titles = [];
        while ((match = titleRe.exec(text)) !== null) {
            titles.push(match[1]);
        }
        console.log('\nVideo titles:');
        for (const t of titles.slice(0, 20)) {
            console.log('  - ' + t);
        }
    } catch (e) {
        console.log('YouTube fetch failed:', e.message);
    }

    // List final gallery contents
    const files = fs.readdirSync(galleryDir);
    console.log('\nFinal gallery files: ' + files.length);
    let totalSize = 0;
    for (const f of files.sort()) {
        const s = fs.statSync(path.join(galleryDir, f));
        totalSize += s.size;
        console.log('  ' + f + ' (' + Math.round(s.size / 1024) + 'KB)');
    }
    console.log('Total size: ' + Math.round(totalSize / 1024) + 'KB');
}
main().catch(e => console.error(e));
