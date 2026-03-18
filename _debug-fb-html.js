const fs = require('fs');
const html = fs.readFileSync('_debug-fb-desktop.html', 'utf8');

// Find all fbid occurrences
const fbidMatches = [...html.matchAll(/fbid=(\d+)/g)];
const uniqueFbids = [...new Set(fbidMatches.map(m => m[1]))];
console.log('Unique fbids in links:', uniqueFbids.length);
console.log('Fbids:', uniqueFbids.join(', '));

// Check for JSON photo IDs 
const idPattern = /"id":"(\d{10,20})"/g;
const idMatches = [...html.matchAll(idPattern)];
const uniqueIds = [...new Set(idMatches.map(m => m[1]))];
console.log('\nLarge numeric IDs in JSON:', uniqueIds.length);
if (uniqueIds.length > 0) console.log('Sample:', uniqueIds.slice(0, 30).join(', '));

// Check for photo_image patterns
const photoImageCount = (html.match(/photo_image/gi) || []).length;
console.log('\nphoto_image refs:', photoImageCount);

// Look for edges/node patterns (GraphQL relay style)
const edgesNodeCount = (html.match(/"edges"/gi) || []).length;
console.log('"edges" patterns:', edgesNodeCount);

// Find scontent URLs with fbid-like patterns
const scontentUrls = [...new Set([...html.matchAll(/(https?:\/\/scontent[^"'\s]+)/g)].map(m => m[1]))];
console.log('\nUnique scontent URLs:', scontentUrls.length);

// Check relay/graphql
console.log('relay refs:', (html.match(/relay/gi) || []).length);
console.log('graphql refs:', (html.match(/graphql/gi) || []).length);

// Check if there are cursor/pagination tokens in the JS
const cursorMatches = [...html.matchAll(/cursor['":\s]+['"]([^'"]+)['"]/gi)].slice(0, 5);
console.log('\nCursor tokens found:', cursorMatches.length);
cursorMatches.forEach(m => console.log('  Cursor:', m[1].substring(0, 60)));

// Look for the album set data
const setMatches = html.match(/set=a\.\d+/g);
console.log('\nset= refs:', setMatches ? setMatches.length : 0);
