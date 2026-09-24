/**
 * Database layer with automatic fallback.
 * - If DATABASE_URL is set: uses Vercel Postgres / Supabase via pg.
 * - If not set: uses a local JSON file store (same query interface).
 *   On Vercel this lives in /tmp (ephemeral per instance); locally in .data-store.json.
 *   For persistent multi-instance storage, set DATABASE_URL.
 */

const fs = require("fs");
const path = require("path");

const USE_PG = !!process.env.DATABASE_URL;
let pool = null;

function getPool() {
  if (pool) return pool;
  const { Pool } = require("pg");
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
  pool.on("error", (err) => console.error("Unexpected error on idle client", err));
  return pool;
}

function isFileMode() {
  return !USE_PG;
}

// ---------------------------------------------------------------------------
// JSON file store (fallback when no DATABASE_URL)
// ---------------------------------------------------------------------------

const STORE_FILE = process.env.VERCEL
  ? "/tmp/pixel-labs-store.json"
  : path.join(process.cwd(), ".data-store.json");

function defaultStore() {
  return {
    posts: [],
    ratio_state: [
      { id: 1, total_posts: 0, value_posts: 0, promo_posts: 0, last_action: null, updated_at: new Date().toISOString() },
    ],
  };
}

function loadStore() {
  try {
    const raw = fs.readFileSync(STORE_FILE, "utf-8");
    const s = JSON.parse(raw);
    if (!Array.isArray(s.posts)) s.posts = [];
    if (!Array.isArray(s.ratio_state) || s.ratio_state.length === 0) {
      s.ratio_state = defaultStore().ratio_state;
    }
    return s;
  } catch {
    return defaultStore();
  }
}

function saveStore(s) {
  fs.writeFileSync(STORE_FILE, JSON.stringify(s, null, 2));
}

function stripWild(s) {
  return String(s == null ? "" : s).replace(/^%|%$/g, "");
}

/**
 * Minimal query emulator supporting exactly the statements this app issues.
 * Returns { rows, rowCount } like node-postgres.
 */
function localQuery(text, params) {
  params = params || [];
  const t = text.replace(/\s+/g, " ").trim();

  // SELECT * FROM posts ... (with optional label/status/ILIKE filters, ORDER, LIMIT/OFFSET)
  if (/^SELECT \* FROM posts/i.test(t)) {
    const store = loadStore();
    let rows = store.posts.slice();
    const labelM = t.match(/label = \$(\d+)/i);
    const statusM = t.match(/status = \$(\d+)/i);
    const topicM = t.match(/topic ILIKE \$(\d+)/i);
    const textM = t.match(/generated_text ILIKE \$(\d+)/i);
    if (labelM) rows = rows.filter((r) => r.label === params[+labelM[1] - 1]);
    if (statusM) rows = rows.filter((r) => r.status === params[+statusM[1] - 1]);
    if (topicM && textM) {
      const a = stripWild(params[+topicM[1] - 1]).toLowerCase();
      const b = stripWild(params[+textM[1] - 1]).toLowerCase();
      rows = rows.filter(
        (r) =>
          String(r.topic || "").toLowerCase().includes(a) ||
          String(r.generated_text || "").toLowerCase().includes(b)
      );
    } else if (topicM) {
      const a = stripWild(params[+topicM[1] - 1]).toLowerCase();
      rows = rows.filter((r) => String(r.topic || "").toLowerCase().includes(a));
    } else if (textM) {
      const b = stripWild(params[+textM[1] - 1]).toLowerCase();
      rows = rows.filter((r) => String(r.generated_text || "").toLowerCase().includes(b));
    }
    rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const limM = t.match(/LIMIT \$(\d+)/i);
    const offM = t.match(/OFFSET \$(\d+)/i);
    const limit = limM ? params[+limM[1] - 1] : rows.length;
    const offset = offM ? params[+offM[1] - 1] : 0;
    return { rows: rows.slice(offset, offset + limit), rowCount: rows.length };
  }

  // SELECT * FROM ratio_state LIMIT 1
  if (/^SELECT \* FROM ratio_state/i.test(t)) {
    return { rows: loadStore().ratio_state.slice(0, 1), rowCount: 1 };
  }

  // ALTER TABLE ... (no-op in file-store; real DBs execute it)
  if (/^ALTER TABLE/i.test(t)) {
    return { rows: [], rowCount: 0 };
  }

  // INSERT INTO posts (topic, generated_text, label, image_url, status) VALUES (...)
  if (/^INSERT INTO posts/i.test(t)) {
    const store = loadStore();
    const colsMatch = t.match(/INSERT INTO posts \(([^)]+)\)/i);
    const cols = colsMatch ? colsMatch[1].split(",").map((s) => s.trim()) : ["topic", "generated_text", "label", "image_url", "status"];
    const val = (name) => {
      const i = cols.indexOf(name);
      return i >= 0 ? params[i] : undefined;
    };
    const row = {
      id: require("crypto").randomUUID(),
      created_at: new Date().toISOString(),
      topic: val("topic") || "auto",
      generated_text: val("generated_text"),
      label: val("label"),
      image_url: val("image_url") || null,
      image_prompt: val("image_prompt") || null,
      status: val("status") || "draft",
      posted_at: null,
      impressions: 0,
      likes: 0,
      comments: 0,
      reposts: 0,
      profile_views_delta: 0,
    };
    store.posts.push(row);
    saveStore(store);
    return { rows: [row], rowCount: 1 };
  }

  // UPDATE posts SET col=$n, ... WHERE id = $m
  if (/^UPDATE posts SET/i.test(t)) {
    const store = loadStore();
    const idM = t.match(/WHERE id = \$(\d+)/i);
    const row = store.posts.find((r) => r.id === params[+idM[1] - 1]);
    if (!row) return { rows: [], rowCount: 0 };
    for (const m of t.matchAll(/(\w+) = \$(\d+)/gi)) {
      if (m[1].toLowerCase() !== "id") row[m[1]] = params[+m[2] - 1];
    }
    saveStore(store);
    return { rows: [row], rowCount: 1 };
  }

  // DELETE FROM posts WHERE id = $1
  if (/^DELETE FROM posts/i.test(t)) {
    const store = loadStore();
    const before = store.posts.length;
    store.posts = store.posts.filter((r) => r.id !== params[0]);
    saveStore(store);
    return { rows: [], rowCount: before - store.posts.length };
  }

  // UPDATE ratio_state SET col=$n, ... WHERE id = $m
  if (/^UPDATE ratio_state SET/i.test(t)) {
    const store = loadStore();
    const row = store.ratio_state[0];
    if (!row) return { rows: [], rowCount: 0 };
    for (const m of t.matchAll(/(\w+) = \$(\d+)/gi)) {
      row[m[1]] = params[+m[2] - 1];
    }
    saveStore(store);
    return { rows: [row], rowCount: 1 };
  }

  // INSERT INTO ratio_state (...) VALUES (...)
  if (/^INSERT INTO ratio_state/i.test(t)) {
    const store = loadStore();
    const cols = t.match(/\(([^)]+)\)/)[1].split(",").map((s) => s.trim());
    const row = {};
    cols.forEach((c, i) => {
      row[c] = params[i];
    });
    const ix = store.ratio_state.findIndex((r) => r.id === row.id);
    if (ix >= 0) store.ratio_state[ix] = Object.assign({}, store.ratio_state[ix], row);
    else store.ratio_state.push(row);
    saveStore(store);
    return { rows: [row], rowCount: 1 };
  }

  throw new Error("Unsupported query in file-store mode: " + t.slice(0, 80));
}

async function query(text, params) {
  if (!USE_PG) return localQuery(text, params || []);
  return getPool().query(text, params);
}

module.exports = { getPool, query, isFileMode };
