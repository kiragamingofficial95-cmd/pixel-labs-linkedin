/**
 * Ratio Tracker (dashboard) — enforces the 80/20 value:promo Hormozi ratio.
 * Persists via lib/db.js, which uses Postgres when DATABASE_URL is set
 * and a local JSON file store otherwise.
 */

const { query } = require("./db");

function normalize(row) {
  if (!row) return { id: 1, totalPosts: 0, valuePosts: 0, promoPosts: 0, lastAction: null, history: [] };
  return {
    id: row.id != null ? row.id : 1,
    totalPosts: row.total_posts || 0,
    valuePosts: row.value_posts || 0,
    promoPosts: row.promo_posts || 0,
    lastAction: row.last_action || null,
    history: [],
  };
}

async function loadState() {
  try {
    const result = await query("SELECT * FROM ratio_state LIMIT 1");
    if (result.rows.length > 0) return normalize(result.rows[0]);
  } catch (e) {
    console.error("ratio loadState error:", e.message);
  }
  return normalize(null);
}

async function recordPost(label) {
  const state = await loadState();
  const total = state.totalPosts + 1;
  const valuePosts = state.valuePosts + (label === "VALUE" ? 1 : 0);
  const promoPosts = state.promoPosts + (label === "PROMO" ? 1 : 0);

  const updated = await query(
    "UPDATE ratio_state SET total_posts = $1, value_posts = $2, promo_posts = $3, last_action = $4 WHERE id = $5",
    [total, valuePosts, promoPosts, label, state.id]
  );
  if (!updated || updated.rowCount === 0) {
    await query(
      "INSERT INTO ratio_state (id, total_posts, value_posts, promo_posts, last_action) VALUES ($1, $2, $3, $4, $5)",
      [state.id, total, valuePosts, promoPosts, label]
    );
  }
  return { totalPosts: total, valuePosts, promoPosts, lastAction: label };
}

async function getNextLabel(forced) {
  if (forced === "VALUE") return { label: "VALUE", reason: "Forced value override", allowed: true };
  if (forced === "PROMO") return { label: "PROMO", reason: "Forced promo override", allowed: true };

  const state = await loadState();
  const total = state.totalPosts;
  const valueCount = state.valuePosts;

  if (total === 0) {
    return { label: "VALUE", reason: "First post — start with value", allowed: true };
  }

  const currentRatio = valueCount / total;
  if (currentRatio < 0.75) {
    return {
      label: "VALUE",
      reason: "Ratio drift: value at " + (currentRatio * 100).toFixed(0) + "%, need value to rebalance",
      allowed: true,
    };
  }

  // DB-backed state has no per-post history; approximate "value since last promo".
  let valueSinceLastPromo;
  if (state.history && state.history.length > 0) {
    valueSinceLastPromo = 0;
    for (let i = state.history.length - 1; i >= 0; i--) {
      if (state.history[i].label === "PROMO") break;
      if (state.history[i].label === "VALUE") valueSinceLastPromo++;
    }
  } else {
    valueSinceLastPromo = state.lastAction === "PROMO" ? 0 : state.valuePosts;
  }

  if (valueSinceLastPromo >= 4 && currentRatio >= 0.8) {
    return {
      label: "PROMO",
      reason: "Value backlog deep enough (" + valueSinceLastPromo + " value posts since last promo). Promo allowed.",
      allowed: true,
    };
  }

  return {
    label: "VALUE",
    reason: "Ratio at " + (currentRatio * 100).toFixed(0) + "% value — next post should be value",
    allowed: true,
  };
}

async function getSummary() {
  const state = await loadState();
  if (state.totalPosts === 0) return "No posts yet.";
  const ratio = ((state.valuePosts / state.totalPosts) * 100).toFixed(1);
  const status = Math.abs(ratio - 80) < 5 ? "On track" : ratio < 80 ? "Below target" : "Above target";
  return state.valuePosts + " value / " + state.promoPosts + " promo (" + ratio + "% value). " + status;
}

module.exports = { loadState, recordPost, getNextLabel, getSummary };
