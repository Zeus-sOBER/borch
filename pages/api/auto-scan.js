import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getGoogleAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.readonly']
  });
}

// File types the scanner will process
const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif'
];
const SUPPORTED_DOC_TYPES = [
  'application/vnd.google-apps.document',
  'application/vnd.google-apps.spreadsheet',
];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = getGoogleAuth();
    const drive = google.drive({ version: 'v3', auth });

    // Fetch all files from Drive folder
    const listRes = await drive.files.list({
      q: `'${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, modifiedTime, createdTime)',
      orderBy: 'createdTime desc',
      pageSize: 50
    });

    const allFiles = listRes.data.files || [];

    // Filter to only supported file types (images + Google Docs)
    const processableFiles = allFiles.filter(f =>
      SUPPORTED_IMAGE_TYPES.includes(f.mimeType) ||
      SUPPORTED_DOC_TYPES.includes(f.mimeType)
    );

    if (processableFiles.length === 0) {
      return res.status(200).json({
        message: 'No supported files found in Drive folder.',
        processed: 0,
        skipped: 0,
        results: []
      });
    }

    // Check scan_log to find files already processed
    // Note: the scan_log schema does not have a 'status' column — just check existence of file_id
    const fileIds = processableFiles.map(f => f.id);
    const { data: alreadyScanned } = await supabase
      .from('scan_log')
      .select('file_id')
      .in('file_id', fileIds);

    const scannedIds = new Set((alreadyScanned || []).map(r => r.file_id));
    const newFiles = processableFiles.filter(f => !scannedIds.has(f.id));

    if (newFiles.length === 0) {
      return res.status(200).json({
        message: 'All files already scanned. Upload new files to Drive to scan more.',
        processed: 0,
        skipped: processableFiles.length,
        results: []
      });
    }

    // Process each new file by calling parse-screenshot
    const results = [];
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    for (const file of newFiles) {
      try {
        const parseRes = await fetch(`${baseUrl}/api/parse-screenshot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileId: file.id,
            fileName: file.name,
            mimeType: file.mimeType
          })
        });

        const parseData = await parseRes.json();

        results.push({
          fileId: file.id,
          fileName: file.name,
          fileType: SUPPORTED_DOC_TYPES.includes(file.mimeType) ? 'Google Doc' : 'Image',
          detectedType: parseData.detectedType || 'unknown',
          summary: parseData.summary || '',
          saved: parseData.saved || {},
          success: parseRes.ok
        });

        // Small delay between files to avoid rate limits
        await new Promise(r => setTimeout(r, 800));

      } catch (fileErr) {
        results.push({
          fileId: file.id,
          fileName: file.name,
          detectedType: 'error',
          summary: fileErr.message,
          success: false
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    res.status(200).json({
      message: `Scanned ${successful} new file(s)${failed > 0 ? `, ${failed} failed` : ''}.`,
      processed: successful,
      skipped: scannedIds.size,
      failed,
      results
    });

  } catch (error) {
    console.error('Auto-scan error:', error);
    res.status(500).json({ error: 'Auto-scan failed', details: error.message });
  }
}
