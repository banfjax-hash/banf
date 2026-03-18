const fs = require('fs');
const path = require('path');

const GALLERY = 'docs/gallery';

// Remove low-res FB thumbnails (we have full-size versions)
const thumbs = fs.readdirSync(GALLERY).filter(f => f.match(/^fb-\d{3}\.jpg$/));
let removed = 0;
for (const f of thumbs) {
  fs.unlinkSync(path.join(GALLERY, f));
  removed++;
}
console.log(`Removed ${removed} low-res FB thumbnails`);

// Remove duplicate 82KB page backgrounds (fb-full-003 through 006 are same image)
const dupes = ['fb-full-003.jpg', 'fb-full-004.jpg', 'fb-full-005.jpg', 'fb-full-006.jpg'];
for (const f of dupes) {
  const p = path.join(GALLERY, f);
  if (fs.existsSync(p)) { fs.unlinkSync(p); removed++; console.log(`Removed dupe: ${f}`); }
}

// Remove IG profile picture and tiny images
const igTiny = ['ig-001.jpg', 'ig-016.jpg'];
for (const f of igTiny) {
  const p = path.join(GALLERY, f);
  if (fs.existsSync(p)) { fs.unlinkSync(p); console.log(`Removed tiny: ${f}`); }
}

// List remaining
const remaining = fs.readdirSync(GALLERY).filter(f => f.endsWith('.jpg'));
console.log(`\nRemaining: ${remaining.length} photos`);
remaining.forEach(f => {
  const s = fs.statSync(path.join(GALLERY, f));
  console.log(`  ${f} (${(s.size/1024).toFixed(0)}KB)`);
});
