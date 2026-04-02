# homepage

Static homepage for Azimuth Investments, deployed on Netlify.

## Contact Form

The homepage includes a contact form that:

1. **Captures submissions via Netlify Forms** — Netlify stores each submission and can send email notifications to any address you choose.
2. **Writes a row into Notion** — a Netlify Function (`netlify/functions/notion-contact.js`) calls the Notion API to create a new page in the **"Added Interest Data"** database.

### Required Environment Variables

Set these in the Netlify UI → **Site configuration → Environment variables**:

| Variable | Description |
|---|---|
| `NOTION_TOKEN` | Notion integration secret token (see _Notion setup_ below) |
| `NOTION_DATABASE_ID` | Notion database ID — defaults to `336d0009f91080e7a15ee39c09a8886f` (extracted from the "Added Interest Data" database URL); override here if it ever changes |

### Notion Setup

1. Go to [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations) and create a new **internal integration**.
2. Copy the **Internal Integration Token** and set it as `NOTION_TOKEN`.
3. Open the **"Added Interest Data"** database in Notion, click **"…" → Connections**, and add your integration so it has access.
4. The database ID is already pre-set in the function (`336d0009f91080e7a15ee39c09a8886f`). If you ever move the database, update `NOTION_DATABASE_ID` in Netlify env vars.

#### Notion Property Mapping

The function maps form fields to these Notion database column names (case-sensitive). If your column names differ, update `NOTION_PROPERTY_MAP` at the top of `netlify/functions/notion-contact.js`:

| Form field | Expected Notion column | Expected type |
|---|---|---|
| First + Last name | `Name` | Title |
| Email | `Email` | Email |
| Company / Project | `Company / Project` | Rich text |
| Service | `Service` | Select |
| Message | `Message` | Rich text |

> **Tip:** If `Service` is a Rich text column (not a Select), change the `select:` block in the function to `rich_text: [{ text: { content: service } }]` — there is a `TODO` comment at that line.

### Enabling Netlify Email Notifications

1. Deploy the site to Netlify (the form will be auto-detected on first deploy).
2. In the Netlify UI go to **Forms → contact → Form notifications**.
3. Click **"Add notification"** → **Email notification**.
4. Enter the recipient email address (e.g. `hello@azimuthinvestments.com`) and save.

From that point on, every valid form submission triggers an email to that address.

