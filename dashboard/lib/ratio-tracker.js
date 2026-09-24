/**
 * Ratio Tracker — duplicated from shared/ratio-tracker.js
 * Dashboard-specific version that uses Vercel Postgres as state.
 */

const { query } = require("./db");
const { loadState: loadFileState } = require("./shared/ratio-tracker");

/**
 * Load the current ratio state from disk or DB.
 */
async function loadState() {
  try {
    const result = await query("SELECT * FROM ratio_state LIMIT 1");
    if (result.rows.length > 0) {
      return result.rows[0];
    }
  } catch {
    // Fallback to file-based state
    return loadFileState();
  }
  return loadFileState();
}

/**
 * Record a post label in the database state.
 */
async function recordPost(label) {
  const state = await loadState();
  const total = (state.totalPosts || 0) + 1;
  const valuePosts = (state.valuePosts || 0) + (label === "VALUE" ? 1 : 0);
  const promoPosts = (state.promoPosts || 0) + (label === "PROMO" ? 1 : 0);

  try {
    await query(
      `INSERT INTO ratio_state (total_posts, value_posts, promo_posts, last_action) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET total_posts = $1, value_posts = $2, promo_posts = $3, last_action = $4`,
      [total, valuePosts, promoPosts, label]
    );
  } catch {
    // Table might not exist yet — use file-based state
    const fs = require("fs");
    const path = require("path");
    const stateFile = path.join(__dirname, "..", "..", "..", "generator", "state.json");
    // Fall back to file-based
  }

  return { totalPosts: total, valuePosts, promoPosts, lastAction: label };
}

/**
 * Get the next allowed label.
 */
function getNextLabel() {
  return loadFileState().then(state => {
    const total = state.totalPosts;
    const valueCount = state.valuePosts;
    const promoCount = state.promoPosts;

    if (total === 0) return { label: "VALUE", reason: "First post — start with value", allowed: true };

    const currentRatio = valueCount / total;
    if (currentRatio < 0.75) {
      return { label: "VALUE", reason: `Ratio drift: value at ${(currentRatio * 100).toFixed(0)}%`, allowed: true };
    }

    let valueSinceLastPromo = 0;
    for (let i = state.history.length - 1; i >= 0; i--) {
      if (state.history[i].label === "PROMO") break;
      if (state.history[i].label === "VALUE") valueSinceLastPromo++;
    }

    if (valueSinceLastPromo >= 4 && currentRatio >= 0.8) {
      return { label: "PROMO", reason: `Value backlog deep enough`, allowed: true };
    }

    return { label: "VALUE", reason: `Ratio at ${(currentRatio * 100).toFixed(0)}%`, allowed: true };
  });
}

/**
 * Get human-readable summary.
 */
function getSummary() {
  const state = loadFileState();
  if (state.totalPosts === 0) return "No posts yet.";
  const ratio = ((state.valuePosts / state.totalPosts) * 100).toFixed(1);
  return `${state.valuePosts} value / ${state.promoPosts} promo (${ratio}% value).`;
}

module.exports = { loadState, recordPost, getNextLabel, getSummary };
