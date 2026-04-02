/**
 * Netlify Function: notion-contact
 *
 * Triggered by the contact form AJAX submission.
 * Parses form-encoded data and creates a new page in the
 * "Added Interest Data" Notion database.
 *
 * Required environment variables (set in Netlify UI → Site settings → Environment):
 *   NOTION_TOKEN          — Notion integration secret token
 *   NOTION_DATABASE_ID    — The Notion database ID (see README for extraction instructions)
 *
 * Notion database ID (for the "Added Interest Data" database):
 *   Extract it from the database URL:
 *   https://www.notion.so/<DATABASE_ID>?v=...
 *   Set NOTION_DATABASE_ID to that 32-character hex string in Netlify env vars.
 */

const https = require('https');

// ---------------------------------------------------------------------------
// TODO: Update these property names to match the exact column headers in your
//       "Added Interest Data" Notion database (they are case-sensitive).
//       Open the database in Notion, click "..." on each column, and copy the
//       exact name shown at the top of the property editor.
// ---------------------------------------------------------------------------
const NOTION_PROPERTY_MAP = {
  fullName: 'Name',          // Title property  (required by Notion)
  email:    'Email',         // Email property
  company:  'Company / Project', // Rich text property
  service:  'Service',       // Select property  (TODO: change to rich_text if not a Select column)
  message:  'Message',       // Rich text property
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Parse application/x-www-form-urlencoded body
  const params = new URLSearchParams(event.body || '');
  const firstName = params.get('first-name') || '';
  const lastName  = params.get('last-name')  || '';
  const email     = params.get('email')      || '';
  const company   = params.get('company')    || '';
  const service   = params.get('service')    || '';
  const message   = params.get('message')    || '';

  const notionToken      = process.env.NOTION_TOKEN;
  const notionDatabaseId = process.env.NOTION_DATABASE_ID;

  if (!notionToken || !notionDatabaseId) {
    const missing = [!notionToken && 'NOTION_TOKEN', !notionDatabaseId && 'NOTION_DATABASE_ID'].filter(Boolean).join(', ');
    console.error(`[notion-contact] Missing required environment variable(s): ${missing}`);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Server configuration error: missing ${missing}.` }),
    };
  }

  const fullName = `${firstName} ${lastName}`.trim();

  const properties = {
    [NOTION_PROPERTY_MAP.fullName]: {
      title: [{ text: { content: fullName } }],
    },
    [NOTION_PROPERTY_MAP.email]: {
      email: email || null,
    },
    [NOTION_PROPERTY_MAP.company]: {
      rich_text: [{ text: { content: company } }],
    },
    // TODO: If the "Service" column is Rich text instead of Select, replace the
    //       block below with:
    //         rich_text: [{ text: { content: service } }]
    [NOTION_PROPERTY_MAP.service]: {
      select: { name: service || 'Not specified' },
    },
    [NOTION_PROPERTY_MAP.message]: {
      rich_text: [{ text: { content: message } }],
    },
  };

  const requestBody = JSON.stringify({
    parent:     { database_id: notionDatabaseId },
    properties,
  });

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: 'api.notion.com',
        path:     '/v1/pages',
        method:   'POST',
        headers:  {
          Authorization:    `Bearer ${notionToken}`,
          'Notion-Version': '2022-06-28',
          'Content-Type':   'application/json',
          'Content-Length': Buffer.byteLength(requestBody),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('[notion-contact] Notion page created successfully.');
            resolve({ statusCode: 200, body: JSON.stringify({ success: true }) });
          } else {
            console.error(`[notion-contact] Notion API error ${res.statusCode}:`, data);
            resolve({
              statusCode: 500,
              body: JSON.stringify({ error: `Notion API responded with status ${res.statusCode}.` }),
            });
          }
        });
      },
    );

    req.on('error', (err) => {
      console.error('[notion-contact] HTTPS request error:', err);
      resolve({
        statusCode: 500,
        body: JSON.stringify({ error: 'Network request to Notion API failed.' }),
      });
    });

    req.write(requestBody);
    req.end();
  });
};
