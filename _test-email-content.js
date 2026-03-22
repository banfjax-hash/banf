#!/usr/bin/env node
const secrets = require('./.banf-secrets.json');

async function getGmailToken() {
  const body = `grant_type=refresh_token&refresh_token=${encodeURIComponent(secrets.REFRESH_TOKEN)}&client_id=${encodeURIComponent(secrets.CLIENT_ID)}&client_secret=${encodeURIComponent(secrets.CLIENT_SECRET)}`;
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  return (await r.json()).access_token;
}

async function main() {
  const token = await getGmailToken();

  // Get sent emails to president
  const listR = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?q=to%3Aranadhir.ghosh%40gmail.com+subject%3AInvited&maxResults=5', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const list = await listR.json();
  console.log('Found messages:', list.messages?.length || 0);
  if (!list.messages?.length) { console.log('No messages found'); return; }

  for (let i = 0; i < Math.min(list.messages.length, 3); i++) {
    const msgId = list.messages[i].id;
    console.log(`\n${'='.repeat(60)}`);
    console.log(`EMAIL #${i + 1} (ID: ${msgId})`);
    console.log('='.repeat(60));

    const msgR = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=full`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const msg = await msgR.json();

    // Get subject and date
    const headers = msg.payload?.headers || [];
    const subject = headers.find(h => h.name === 'Subject')?.value || 'N/A';
    const date = headers.find(h => h.name === 'Date')?.value || 'N/A';
    console.log('Subject:', subject);
    console.log('Date:', date);

    // Find HTML part
    function findPart(parts, mimeType) {
      for (const p of (parts || [])) {
        if (p.mimeType === mimeType && p.body?.data) return p;
        if (p.parts) { const r = findPart(p.parts, mimeType); if (r) return r; }
      }
      return null;
    }

    const htmlPart = findPart(msg.payload?.parts || [msg.payload], 'text/html');
    if (!htmlPart?.body?.data) { console.log('No HTML part'); continue; }

    const html = Buffer.from(htmlPart.body.data, 'base64url').toString('utf8');

    // Find all hrefs
    const hrefMatches = html.match(/href="([^"]+)"/g) || [];
    console.log('\nAll href values:');
    hrefMatches.forEach(h => console.log('  ', h));

    // Check for RSVP/GitHub links
    const rsvpLinks = hrefMatches.filter(h => /rsvp|github|evite/i.test(h));
    console.log('\nRSVP-related links:', rsvpLinks.length > 0 ? '' : 'NONE');
    rsvpLinks.forEach(h => console.log('  >>> ', h));

    // Check for href="#"
    const hashLinks = (html.match(/href="#"/g) || []).length;
    console.log('href="#" count:', hashLinks);
  }
}

main().catch(e => console.error(e));
