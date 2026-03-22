// Quick test: verify Gmail refresh token works
const https = require('https');
const s = require('./.banf-secrets.json');

const postData = [
  'grant_type=refresh_token',
  'refresh_token=' + encodeURIComponent(s.REFRESH_TOKEN),
  'client_id=' + encodeURIComponent(s.CLIENT_ID),
  'client_secret=' + encodeURIComponent(s.CLIENT_SECRET)
].join('&');

const req = https.request('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(postData)
  }
}, (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const j = JSON.parse(d);
    console.log('Status:', res.statusCode);
    console.log('Has access_token:', !!j.access_token);
    console.log('Error:', j.error || 'none');
    console.log('Desc:', j.error_description || 'none');
    console.log('Scope:', j.scope || 'N/A');
  });
});
req.write(postData);
req.end();
