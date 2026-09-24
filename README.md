# Pixel Labs — LinkedIn Auto-Poster + Analytics Dashboard

> Founder: **Varad Agarwal** — Pixel Labs, a web design agency for local home-service contractors (landscapers, hardscapers, roofers) in the US.

All generated content reads like Varad's own first-person voice — not agency marketing copy.

---

## Architecture Overview

```
pixel-labs-linkedin/
├── generator/          # CLI tool — Groq text + image generation
│   ├── index.js        # CLI entry point
│   ├── groq-client.js  # Groq API client (llama-3.3-70b-versatile)
│   └── package.json
├── dashboard/          # Next.js analytics dashboard (Vercel-deployable)
│   ├── app/            # App Router pages & API routes
│   ├── components/     # React components
│   ├── lib/            # DB, auth, schema
│   └── package.json
├── shared/             # Shared utilities between CLI and dashboard
│   ├── prompts.js      # System prompts & few-shot examples
│   ├── ratio-tracker.js # 80/20 Hormozi ratio enforcement
│   ├── source-notes.js # Pixel Labs founder context
│   └── image-gen.js    # Image generation logic
├── .env.example        # Environment variable template
└── README.md
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
# === Required ===
GROQ_API_KEY=gsk_...          # Groq API key (console.groq.com)
DATABASE_URL=postgresql://... # Vercel Postgres or Supabase connection string
DASHBOARD_PASSWORD=...        # Single-user password for dashboard

# === Optional ===
IMAGE_PROVIDER=pollinations   # "pollinations" | "together" | "groq"
TOGETHER_API_KEY=...          # If using Together AI FLUX.1-schnell

# === LinkedIn API (v1 — manual copy only) ===
LINKEDIN_ACCESS_TOKEN=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
```

### Database Setup

**Vercel Postgres:**
```bash
npx vercel@latest link
npx vercel@latest dev # local dev with PG
```

Then run the schema:
```sql
-- Copy dashboard/lib/schema.sql contents into your database
```

**Supabase (free tier):**
1. Create a project at supabase.com
2. Go to SQL Editor and run the schema
3. Use the connection string from Settings → Database

---

## How the Ratio Logic Works

The 80/20 Hormozi ratio is enforced via `shared/ratio-tracker.js`:

1. **State file** (`generator/state.json`): Tracks all generated posts with labels.
2. **`getNextLabel()`**: Determines the next allowed label based on:
   - If current value% < 75% → forces VALUE
   - If 4+ value posts since last promo AND value% >= 80% → allows PROMO
   - Otherwise → VALUE
3. **`recordPost()`**: Updates state after each generation.
4. **Manual overrides**: `--force-value` and `--force-promo` bypass the tracker.
5. **Dashboard sync**: The dashboard API also calls `recordPost()` and reads the same state file.

The ratio is visualized in the dashboard's **Ratio** tab as a bar chart + trend indicator.

---

## CLI Usage (Generator)

```bash
cd generator
npm install

# Auto-generate a random value post
node index.js --auto

# Generate a specific topic
node index.js --topic "cold outreach lesson"

# Force a promo post
node index.js --force-promo

# Force a value post
node index.js --force-value

# Generate with quote-card image
node index.js --auto --with-image

# Dry run (no DB write)
node index.js --dry-run --topic "website teardown"
```

---

## Dashboard Usage

### Local Development
```bash
cd dashboard
npm install
cp ../.env .env.local  # or set env vars manually
npm run dev
```

Visit `http://localhost:3000`

### Vercel Deployment
```bash
# Install Vercel CLI
npm install -g vercel

# Link your project
vercel link

# Set environment variables
vercel env add GROQ_API_KEY development
vercel env add DATABASE_URL development
vercel env add DASHBOARD_PASSWORD development

# Deploy
vercel --prod
```

Or connect your GitHub repo in the Vercel dashboard for automatic deploys.

---

## Dashboard Views

| Tab | Description |
|-----|-------------|
| **Generator** | Trigger post generation, force value/promo, generate quote-card images |
| **Feed** | List all drafts/posts with label filters, one-click copy-to-clipboard |
| **Ratio** | Visual ratio tracker with bar chart + status flag |
| **Performance** | Engagement metrics per post with manual entry form |

---

## Image Generation

Image generation is optional (off by default). Three providers:

| Provider | Cost | Setup |
|----------|------|-------|
| **Pollinations.ai** | Free | No API key needed (default) |
| **Together AI FLUX.1-schnell** | Free tier | Needs `TOGETHER_API_KEY` |
| **Groq images** | TBD | Not yet available |

Image style: dark navy (#0a1628) background, electric lime green (#39FF14) accent, branded quote card with a punchy 1-liner from the post.

---

## Part 4 — Auto-Publish (Optional)

Currently **not implemented** — manual copy-to-clipboard from the dashboard is the v1 workflow. To add LinkedIn auto-publishing:

1. Create a LinkedIn Developer App at [linkedin.com/developers](https://www.linkedin.com/developers)
2. Request `w_member_social` scope
3. Add OAuth flow to the dashboard
4. Extend the `POST /api/posts` route to call the LinkedIn API

---

## Important Notes

⚠️ **Groq models**: `llama-3.3-70b-versatile` was retired from Groq in Aug 2026. The generator uses `openai/gpt-oss-120b` (primary) with `openai/gpt-oss-20b` fallback — verified working.

⚠️ **Image generation on Groq**: Groq primarily supports text generation. Image generation falls back to Pollinations.ai or Together AI.

---

## License

Pixel Labs — personal project. All rights reserved.
