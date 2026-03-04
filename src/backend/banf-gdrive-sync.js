/**
 * BANF Google Drive Sync — v1.0
 * ─────────────────────────────────────────────────────────────
 * Lists, downloads, and syncs files from the BANF Google Drive
 * folder into Wix CRM/data collections.
 *
 * Scopes required (must be in the refresh token):
 *   https://www.googleapis.com/auth/drive.readonly
 *   https://www.googleapis.com/auth/gmail.readonly
 *   https://www.googleapis.com/auth/contacts.readonly
 *
 * Drive API docs: https://developers.google.com/drive/api/v3/reference
 */

import wixData from 'wix-data';
import { fetch as wixFetch } from 'wix-fetch';
import { ok, badRequest, serverError } from 'wix-http-functions';

const SA = { suppressAuth: true };

// ─── Google credentials (re-uses the same getGoogleAccessToken
//     defined in http-functions.js via the shared secret store) ──────────────
// We duplicate the minimal token-fetch here so this module is self-contained.

const GOOGLE_CLIENT_ID     = '1020178199135-3usrl611ara38i7rhu2ub6sn6g1150ml.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';
const PLAYGROUND_CLIENT_ID = '407408718192.apps.googleusercontent.com';
const PLAYGROUND_SECRET    = 'kd-_2_AUosoGGTNYyMJiFL3j';

// ─── CORS helper ────────────────────────────────────────────────────────────
function cors(data) {
    return ok({
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
}
export function optionsCors() {
    return ok({ body: '', headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,x-user-email'
    }});
}

// ─── Get Google Access Token ─────────────────────────────────────────────────
async function getDriveToken() {
    // Try stored token
    let refreshToken = null;
    try {
        const r = await wixData.query('GoogleTokens').eq('key', 'refresh_token').find(SA);
        if (r.items.length > 0) refreshToken = r.items[0].value;
    } catch (_) {}
    if (!refreshToken) refreshToken = '1//04iXClX5dKpqhCgYIARAAGAQSNwF-L9IrCtEUhuup9COlH5wnvGtozgReO4E5ILylE9Jq4f8vw1YUXDT_ysiHcJ89g-PA96eh8Ko';

    // Try app credentials first
    for (const [cid, csec] of [[GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET], [PLAYGROUND_CLIENT_ID, PLAYGROUND_SECRET]]) {
        const r = await wixFetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `client_id=${encodeURIComponent(cid)}&client_secret=${encodeURIComponent(csec)}&refresh_token=${encodeURIComponent(refreshToken)}&grant_type=refresh_token`
        });
        const d = await r.json();
        if (d.access_token) return { accessToken: d.access_token };
    }
    return { error: 'Could not obtain Drive access token. Re-authorize at /gdrive_auth_url' };
}

// ─── Drive API helpers ───────────────────────────────────────────────────────

async function driveGet(path, accessToken) {
    const r = await wixFetch(`https://www.googleapis.com/drive/v3/${path}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    return r.json();
}

async function driveDownloadText(fileId, accessToken) {
    const r = await wixFetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        return { error: err.error?.message || `HTTP ${r.status}` };
    }
    return { content: await r.text() };
}

/**
 * Export a Google-native file (Sheets/Docs) OR a converted XLSX to CSV.
 * If the file is already a Google Sheet, use export endpoint.
 * Otherwise, copy file to Sheets first, then export CSV.
 */
async function exportAsCSV(fileId, mimeType, accessToken) {
    const SHEETS_MIME = 'application/vnd.google-apps.spreadsheet';

    if (mimeType === SHEETS_MIME) {
        // Native Sheets → direct CSV export
        const r = await wixFetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/csv`,
            { method: 'GET', headers: { 'Authorization': `Bearer ${accessToken}` } }
        );
        if (!r.ok) return { error: `Export failed: HTTP ${r.status}` };
        return { csv: await r.text() };
    }

    // Uploaded XLSX / ODS → copy to Sheets format then export
    const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    if (mimeType === XLSX_MIME || mimeType === 'application/vnd.ms-excel') {
        // Copy with mimeType conversion
        const copyResp = await wixFetch('https://www.googleapis.com/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: `_banf_temp_${fileId}`,
                mimeType: SHEETS_MIME,
                parents: []
            })
        });
        // Actually use files.copy endpoint
        const copy = await wixFetch(`https://www.googleapis.com/drive/v3/files/${fileId}/copy`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: `_banf_temp_${fileId}`, mimeType: SHEETS_MIME })
        });
        const copyData = await copy.json();
        if (copyData.error) return { error: 'Copy to Sheets failed: ' + (copyData.error.message || JSON.stringify(copyData.error)) };

        const sheetId = copyData.id;
        // Export as CSV
        const exportResp = await wixFetch(
            `https://www.googleapis.com/drive/v3/files/${sheetId}/export?mimeType=text/csv`,
            { method: 'GET', headers: { 'Authorization': `Bearer ${accessToken}` } }
        );
        const csv = exportResp.ok ? await exportResp.text() : null;

        // Clean up temp file
        await wixFetch(`https://www.googleapis.com/drive/v3/files/${sheetId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        }).catch(() => {});

        if (!csv) return { error: `CSV export failed after copy (HTTP ${exportResp.status})` };
        return { csv };
    }

    return { error: `MIME type ${mimeType} cannot be exported as CSV` };
}

// ─── CSV Parser ───────────────────────────────────────────────────────────────
function parseCSV(csvText) {
    const rows = [];
    const lines = csvText.split('\n');
    const headers = parseCsvLine(lines[0] || '');
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const vals = parseCsvLine(line);
        const row = {};
        headers.forEach((h, idx) => { row[h.trim()] = (vals[idx] || '').trim(); });
        rows.push(row);
    }
    return { headers, rows };
}

function parseCsvLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
            else inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
            result.push(current); current = '';
        } else {
            current += ch;
        }
    }
    result.push(current);
    return result;
}

// ─── Recursive Drive tree listing ────────────────────────────────────────────
async function listFolderRecursive(folderId, accessToken, depth = 0, maxDepth = 4) {
    if (depth > maxDepth) return [];
    const fields = 'files(id,name,mimeType,size,modifiedTime,parents,webViewLink)';
    const query = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
    const data = await driveGet(`files?q=${query}&fields=${fields}&pageSize=200`, accessToken);
    if (data.error) return [];

    const items = [];
    for (const f of (data.files || [])) {
        const item = { id: f.id, name: f.name, mimeType: f.mimeType, size: f.size, modifiedTime: f.modifiedTime, webViewLink: f.webViewLink, depth };
        if (f.mimeType === 'application/vnd.google-apps.folder') {
            item.type = 'folder';
            item.children = await listFolderRecursive(f.id, accessToken, depth + 1, maxDepth);
        } else {
            item.type = classifyMimeType(f.mimeType, f.name);
        }
        items.push(item);
    }
    return items;
}

function classifyMimeType(mime, name) {
    if (mime.includes('spreadsheet') || name.match(/\.(xlsx|xls|csv|ods)$/i)) return 'spreadsheet';
    if (mime.includes('pdf') || name.match(/\.pdf$/i)) return 'pdf';
    if (mime.includes('presentation') || name.match(/\.(pptx|ppt)$/i)) return 'presentation';
    if (mime.includes('document') || name.match(/\.(docx|doc)$/i)) return 'document';
    if (mime.includes('image') || name.match(/\.(png|jpg|jpeg|gif|webp)$/i)) return 'image';
    if (mime.includes('json') || name.match(/\.json$/i)) return 'json';
    if (mime.includes('text') || name.match(/\.(txt|md)$/i)) return 'text';
    return 'other';
}

// ─── Store Drive sync metadata ────────────────────────────────────────────────
async function storeDriveSyncRecord(record) {
    try {
        const existing = await wixData.query('DriveSync').eq('driveFileId', record.driveFileId).find(SA);
        if (existing.items.length > 0) {
            await wixData.update('DriveSync', { ...existing.items[0], ...record, lastSyncedAt: new Date() }, SA);
        } else {
            await wixData.insert('DriveSync', { ...record, lastSyncedAt: new Date(), firstSyncedAt: new Date() }, SA);
        }
    } catch (_) {}
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTED HTTP ENDPOINT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /gdrive_auth_url
 * Returns the OAuth URL to re-authorize with Drive scope included.
 */
export function get_gdrive_auth_url(request) {
    const scopes = [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/contacts.readonly'
    ].join(' ');
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}&redirect_uri=https%3A%2F%2Fdevelopers.google.com%2Foauthplayground&response_type=code&scope=${encodeURIComponent(scopes)}&access_type=offline&prompt=consent`;
    return cors({
        success: true,
        message: 'Open this URL in browser, authorize with banfjax@gmail.com, then POST the refresh token to /google_auth_manual',
        url: authUrl,
        steps: [
            '1. Open the URL in your browser',
            '2. Sign in with banfjax@gmail.com',
            '3. Authorize ALL scopes including Drive',
            '4. Copy the "code" parameter from the redirect URL',
            '5. Exchange: POST /google_auth_manual with {"refresh_token":"<YOUR_TOKEN>"}',
            'OR use OAuth Playground: https://developers.google.com/oauthplayground/ with custom credentials'
        ],
        requiredScopes: scopes.split(' ')
    });
}
export function options_gdrive_auth_url() { return optionsCors(); }

/**
 * GET /gdrive_list?folderId=...&maxDepth=3
 * Lists all files and sub-folders in a Google Drive folder.
 */
export async function get_gdrive_list(request) {
    try {
        const q = request.query || {};
        const folderId = q.folderId || 'root';
        const maxDepth = parseInt(q.maxDepth) || 2;

        const token = await getDriveToken();
        if (token.error) return cors({ success: false, error: token.error, fix: 'GET /gdrive_auth_url to re-authorize with drive.readonly scope' });

        // Get folder metadata first
        const meta = await driveGet(`files/${folderId}?fields=id,name,mimeType,webViewLink`, token.accessToken);

        const files = await listFolderRecursive(folderId, token.accessToken, 0, maxDepth);
        const stats = { totalFiles: 0, totalFolders: 0, spreadsheets: 0, pdfs: 0, presentations: 0, other: 0 };
        const flattenStats = (items) => {
            for (const i of items) {
                if (i.type === 'folder') { stats.totalFolders++; if (i.children) flattenStats(i.children); }
                else { stats.totalFiles++; stats[i.type + 's'] = (stats[i.type + 's'] || 0) + 1; }
            }
        };
        flattenStats(files);

        return cors({ success: true, folderId, folderName: meta.name, stats, tree: files });
    } catch (e) {
        return cors({ success: false, error: e.message });
    }
}
export function options_gdrive_list() { return optionsCors(); }

/**
 * GET /gdrive_file?fileId=...
 * Get metadata and optionally download a specific file.
 */
export async function get_gdrive_file(request) {
    try {
        const q = request.query || {};
        const { fileId, download } = q;
        if (!fileId) return cors({ success: false, error: 'fileId required' });

        const token = await getDriveToken();
        if (token.error) return cors({ success: false, error: token.error });

        const meta = await driveGet(`files/${fileId}?fields=id,name,mimeType,size,modifiedTime,webViewLink,parents`, token.accessToken);
        if (meta.error) return cors({ success: false, error: meta.error.message || JSON.stringify(meta.error) });

        const result = { success: true, file: meta };

        if (download === 'csv' || download === 'true') {
            const csvResult = await exportAsCSV(fileId, meta.mimeType, token.accessToken);
            if (csvResult.error) {
                result.csvError = csvResult.error;
            } else {
                const parsed = parseCSV(csvResult.csv);
                result.csvRows = parsed.rows.length;
                result.csvHeaders = parsed.headers;
                result.csvPreview = parsed.rows.slice(0, 5);
            }
        }
        return cors(result);
    } catch (e) {
        return cors({ success: false, error: e.message });
    }
}
export function options_gdrive_file() { return optionsCors(); }

/**
 * POST /gdrive_sync_csv  { fileId, collection, mappingProfile }
 * Download a CSV/XLSX from Drive and store raw rows in a Wix collection.
 * mappingProfile: 'family_universe' | 'membership' | 'events' | 'financial' | 'raw'
 */
export async function post_gdrive_sync_csv(request) {
    try {
        const body = await request.body.json();
        const { fileId, collection, mappingProfile = 'raw', sheetIndex = 0 } = body;
        if (!fileId) return cors({ success: false, error: 'fileId required' });

        const token = await getDriveToken();
        if (token.error) return cors({ success: false, error: token.error });

        // Get file metadata
        const meta = await driveGet(`files/${fileId}?fields=id,name,mimeType`, token.accessToken);
        if (meta.error) return cors({ success: false, error: meta.error.message });

        // Export to CSV
        const csvRes = await exportAsCSV(fileId, meta.mimeType, token.accessToken);
        if (csvRes.error) return cors({ success: false, error: csvRes.error });

        const { rows, headers } = parseCSV(csvRes.csv);

        // Store in DriveSync registry
        await storeDriveSyncRecord({
            driveFileId: fileId,
            fileName: meta.name,
            mimeType: meta.mimeType,
            rowCount: rows.length,
            headers: headers.join(','),
            targetCollection: collection || 'DriveImport_' + fileId.substring(0, 8),
            mappingProfile
        });

        // If raw mode — just return parsed data without storing
        if (mappingProfile === 'raw' || !collection) {
            return cors({
                success: true,
                fileId,
                fileName: meta.name,
                rowCount: rows.length,
                headers,
                preview: rows.slice(0, 10),
                message: 'CSV parsed. Pass mappingProfile + collection to store data.'
            });
        }

        // Otherwise import will be handled by banf-data-mapper
        return cors({
            success: true,
            fileId,
            fileName: meta.name,
            rowCount: rows.length,
            headers,
            rows: rows.slice(0, 200), // Return up to 200 rows for mapper
            mappingProfile,
            message: `${rows.length} rows ready. POST to /bulk_import_members to ingest into CRM.`
        });
    } catch (e) {
        return cors({ success: false, error: e.message });
    }
}
export function options_gdrive_sync_csv() { return optionsCors(); }

/**
 * GET /gdrive_search?q=...
 * Search for files across My Drive by name.
 */
export async function get_gdrive_search(request) {
    try {
        const q = (request.query || {}).q || '';
        if (!q) return cors({ success: false, error: 'q param required' });

        const token = await getDriveToken();
        if (token.error) return cors({ success: false, error: token.error });

        const query = encodeURIComponent(`name contains '${q}' and trashed=false`);
        const data = await driveGet(
            `files?q=${query}&fields=files(id,name,mimeType,size,modifiedTime,webViewLink)&pageSize=50`,
            token.accessToken
        );
        if (data.error) return cors({ success: false, error: data.error.message });

        return cors({
            success: true,
            query: q,
            count: (data.files || []).length,
            files: (data.files || []).map(f => ({ ...f, type: classifyMimeType(f.mimeType, f.name) }))
        });
    } catch (e) {
        return cors({ success: false, error: e.message });
    }
}
export function options_gdrive_search() { return optionsCors(); }

/**
 * GET /gdrive_status
 * Token health + sync history summary.
 */
export async function get_gdrive_status(request) {
    try {
        const token = await getDriveToken();
        const tokenOk = !token.error;

        let syncHistory = [];
        try {
            const r = await wixData.query('DriveSync').descending('lastSyncedAt').limit(20).find(SA);
            syncHistory = r.items;
        } catch (_) {}

        let driveAbout = null;
        if (tokenOk) {
            try {
                driveAbout = await driveGet('about?fields=user,storageQuota', token.accessToken);
            } catch (_) {}
        }

        return cors({
            success: true,
            driveTokenValid: tokenOk,
            tokenError: token.error || null,
            driveUser: driveAbout?.user?.emailAddress,
            storageUsed: driveAbout?.storageQuota?.usage,
            syncHistory: syncHistory.map(s => ({
                file: s.fileName,
                rows: s.rowCount,
                collection: s.targetCollection,
                profile: s.mappingProfile,
                lastSynced: s.lastSyncedAt
            })),
            requiredScopes: ['drive.readonly', 'gmail.readonly', 'contacts.readonly'],
            reAuthUrl: 'GET /gdrive_auth_url to get the re-authorization URL'
        });
    } catch (e) {
        return cors({ success: false, error: e.message });
    }
}
export function options_gdrive_status() { return optionsCors(); }

// Alias: test uses gdrive_sync_status, backend uses gdrive_status
export async function get_gdrive_sync_status(request) {
    return get_gdrive_status(request);
}
export function options_gdrive_sync_status() { return optionsCors(); }

/**
 * POST /gdrive_find_banf_folder
 * Searches for the BANF data folder in Drive by common names.
 */
export async function post_gdrive_find_banf_folder(request) {
    try {
        const token = await getDriveToken();
        if (token.error) return cors({ success: false, error: token.error });

        const searchTerms = ['BANF', 'banf-data', 'banf_data', 'Bengali Association'];
        const results = [];

        for (const term of searchTerms) {
            const q = encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and name contains '${term}' and trashed=false`);
            const data = await driveGet(`files?q=${q}&fields=files(id,name,mimeType,webViewLink,modifiedTime)&pageSize=20`, token.accessToken);
            if (data.files) {
                for (const f of data.files) {
                    if (!results.find(r => r.id === f.id)) results.push(f);
                }
            }
        }

        return cors({
            success: true,
            count: results.length,
            folders: results,
            usage: 'Use GET /gdrive_list?folderId=<id>&maxDepth=3 to explore a folder'
        });
    } catch (e) {
        return cors({ success: false, error: e.message });
    }
}
export function options_gdrive_find_banf_folder() { return optionsCors(); }

// Export CSV parsing utility for use by other backend modules
export { parseCSV, parseCsvLine, exportAsCSV, getDriveToken, driveGet };
