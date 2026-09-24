#!/usr/bin/env node
/**
 * Pixel Labs — LinkedIn Post Generator (CLI)
 *
 * Usage:
 *   node index.js [--topic "<text>"] [--auto] [--force-value] [--force-promo] [--dry-run] [--with-image]
 *
 * Examples:
 *   node index.js --auto
 *   node index.js --topic "cold outreach lesson"
 *   node index.js --force-promo --with-image
 *   node index.js --dry-run --topic "website teardown"
 */

const fs = require("fs");
const path = require("path");

// Minimal .env loader (no dependency): loads ../.env so the CLI works out of the box.
(function loadEnv() {
  try {
    const envFile = path.join(__dirname, "..", ".env");
    if (!fs.existsSync(envFile)) return;
    for (const line of fs.readFileSync(envFile, "utf-8").split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {}
})();

const { generatePost } = require("./groq-client");
const { generateImage } = require("../shared/image-gen");
const { recordPost, getNextLabel, getSummary } = require("../shared/ratio-tracker");

// Parse CLI args
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { topic: null, auto: false, force: null, dryRun: false, withImage: false };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--topic":
        opts.topic = args[++i];
        break;
      case "--auto":
        opts.auto = true;
        break;
      case "--force-value":
        opts.force = "VALUE";
        break;
      case "--force-promo":
        opts.force = "PROMO";
        break;
      case "--dry-run":
        opts.dryRun = true;
        break;
      case "--with-image":
        opts.withImage = true;
        break;
      default:
        console.error(`Unknown flag: ${args[i]}`);
        process.exit(1);
    }
  }

  return opts;
}

async function main() {
  const opts = parseArgs();

  console.log("\n🟢 Pixel Labs LinkedIn Post Generator\n");
  console.log(`Ratio tracker: ${getSummary()}`);

  // Determine the forced label
  const forcedLabel = opts.force;

  // Determine topic
  let topic = opts.topic;
  if (opts.auto || (!opts.topic && !opts.force)) {
    topic = "auto";
  }

  if (!opts.topic && !opts.auto && !opts.force) {
    topic = "auto"; // default to auto
  }

  try {
    // Generate the post
    const result = await generatePost({ topic, forcedLabel });

    // Record to ratio tracker
    recordPost(result.label);

    // Process image if requested
    let imageResult = null;
    if (opts.withImage) {
      console.log("\n🎨 Generating quote-card image...");
      imageResult = await generateImage(result.text, {
        provider: process.env.IMAGE_PROVIDER || "pollinations",
      });
      if (imageResult) {
        console.log(`   Image URL: ${imageResult.url}`);
        console.log(`   Quote extracted: "${imageResult.quote}"`);
      } else {
        console.log("   ⚠️  Image generation failed — see error above");
      }
    }

    if (opts.dryRun) {
      console.log("\n--- DRY RUN OUTPUT ---");
      console.log(result.text);
      console.log(`\nLabel: [${result.label}]`);
      if (imageResult) {
        console.log(`Image: ${imageResult.url}`);
      }
      console.log("--- END DRY RUN ---\n");
      console.log("No database write in dry-run mode.");
    } else {
      // Save to database (see dashboard/lib/db.js for schema)
      await saveToDatabase({
        topic: topic === "auto" ? "auto" : opts.topic,
        generated_text: result.text,
        label: result.label,
        image_url: imageResult?.url || null,
        status: "draft",
      });

      console.log("\n✅ Post generated and saved as draft!");
      console.log(`Label: [${result.label}]`);
      console.log(`Model: ${result.model}`);
      console.log(`Ratio updated: ${getSummary()}`);
      if (imageResult) {
        console.log(`Image: ${imageResult.url}`);
      }
      console.log("\n📋 Post text:\n");
      console.log(result.text);
    }
  } catch (err) {
    console.error(`\n❌ Error: ${err.message}`);
    process.exit(1);
  }
}

/**
 * Save generated post to the database.
 * In the CLI context, this inserts directly via the DATABASE_URL.
 * The dashboard API route does the same thing.
 */
async function saveToDatabase(postData) {
  const { DATABASE_URL } = process.env;
  if (!DATABASE_URL) {
    console.warn("⚠️  DATABASE_URL not set — skipping database save. Use DASHBOARD only or set DATABASE_URL.");
    // Still save to a local fallback file for CLI-only use
    const localFile = path.join(__dirname, "drafts.json");
    let drafts = [];
    if (fs.existsSync(localFile)) {
      try { drafts = JSON.parse(fs.readFileSync(localFile, "utf-8")); } catch {}
    }
    drafts.push({
      ...postData,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      posted_at: null,
      impressions: null, likes: null, comments: null, reposts: null, profile_views_delta: null,
    });
    fs.writeFileSync(localFile, JSON.stringify(drafts, null, 2));
    console.log(`💾 Saved locally to drafts.json (${drafts.length} total drafts)`);
    return;
  }

  // Use Vercel Postgres / Supabase via fetch
  try {
    const response = await fetch(DATABASE_URL.replace(/\/$/, "") + "/insert", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.DB_TOKEN || ""}` },
      body: JSON.stringify({
        table: "posts",
        columns: ["topic", "generated_text", "label", "image_url", "status"],
        values: [[postData.topic, postData.generated_text, postData.label, postData.image_url, postData.status]],
      }),
    });
    if (!response.ok) throw new Error(`DB insert failed: ${response.status}`);
  } catch {
    // Fallback to local file
    const localFile = path.join(__dirname, "drafts.json");
    let drafts = [];
    if (fs.existsSync(localFile)) {
      try { drafts = JSON.parse(fs.readFileSync(localFile, "utf-8")); } catch {}
    }
    drafts.push({
      ...postData,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      posted_at: null,
      impressions: null, likes: null, comments: null, reposts: null, profile_views_delta: null,
    });
    fs.writeFileSync(localFile, JSON.stringify(drafts, null, 2));
    console.log(`💾 Saved locally to drafts.json (fallback)`);
  }
}

// Polyfill for crypto.randomUUID in older Node
if (!crypto.randomUUID) {
  crypto.randomUUID = () =>
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
}

main();
