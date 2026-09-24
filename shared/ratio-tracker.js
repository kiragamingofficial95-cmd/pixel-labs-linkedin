/**
 * Ratio Tracker — enforces the 80/20 value:promo Hormozi ratio.
 * Persists state to a JSON file so the generator self-corrects across runs.
 */

const fs = require("fs");
const path = require("path");

const STATE_FILE = path.join(__dirname, "..", "generator", "state.json");

/**
 * Load the current ratio state from disk.
 * Returns { totalPosts, valuePosts, promoPosts, lastAction, history }
 */
function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
    } catch {
      return createDefaultState();
    }
  }
  return createDefaultState();
}

/**
 * Save the current ratio state to disk.
 */
function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}

function createDefaultState() {
  return {
    totalPosts: 0,
    valuePosts: 0,
    promoPosts: 0,
    lastAction: null,
    history: [], // [{ label, timestamp }]
  };
}

/**
 * Determine the next allowed label based on the 80/20 ratio.
 * Rules:
 * - Never force a promo post unless the value backlog is deep enough.
 * - For every 4-5 value posts, allow 1 promo post.
 * - The ratio must be maintained at roughly 80% value / 20% promo.
 *
 * @param {string|null} forced - "value", "promo", or null
 * @returns {{ label: string, reason: string, allowed: boolean }}
 */
function getNextLabel(forced = null) {
  const state = loadState();

  if (forced === "value") {
    return { label: "VALUE", reason: "Forced value override", allowed: true };
  }
  if (forced === "promo") {
    return { label: "PROMO", reason: "Forced promo override", allowed: true };
  }

  const total = state.totalPosts;
  const valueCount = state.valuePosts;
  const promoCount = state.promoPosts;

  if (total === 0) {
    return { label: "VALUE", reason: "First post — start with value", allowed: true };
  }

  const currentRatio = valueCount / total;

  // If we're under 80% value, next must be value
  if (currentRatio < 0.75) {
    return {
      label: "VALUE",
      reason: `Ratio drift: value at ${(currentRatio * 100).toFixed(0)}%, need value to rebalance`,
      allowed: true,
    };
  }

  // If we're over 80% value AND we have enough value backlog (4+ value posts since last promo)
  // count value posts since last promo
  let valueSinceLastPromo = 0;
  for (let i = state.history.length - 1; i >= 0; i--) {
    if (state.history[i].label === "PROMO") break;
    if (state.history[i].label === "VALUE") valueSinceLastPromo++;
  }

  if (valueSinceLastPromo >= 4 && currentRatio >= 0.8) {
    return {
      label: "PROMO",
      reason: `Value backlog deep enough (${valueSinceLastPromo} value posts since last promo). Promo allowed.`,
      allowed: true,
    };
  }

  // Default: value
  return {
    label: "VALUE",
    reason: `Ratio at ${(currentRatio * 100).toFixed(0)}% value — next post should be value`,
    allowed: true,
  };
}

/**
 * Record a generated post's label in the state.
 */
function recordPost(label) {
  const state = loadState();
  state.totalPosts++;
  if (label === "VALUE") state.valuePosts++;
  else if (label === "PROMO") state.promoPosts++;
  state.lastAction = label;
  state.history.push({ label, timestamp: new Date().toISOString() });

  // Keep only last 50 entries to prevent file bloat
  if (state.history.length > 50) {
    state.history = state.history.slice(-50);
  }

  saveState(state);
  return state;
}

/**
 * Get a human-readable summary of the current ratio.
 */
function getSummary() {
  const state = loadState();
  if (state.totalPosts === 0) {
    return "No posts yet — ready to start.";
  }
  const ratio = ((state.valuePosts / state.totalPosts) * 100).toFixed(1);
  const target = "80%";
  const status = Math.abs(ratio - 80) < 5 ? "✅ On track" : ratio < 80 ? "⚠️ Below target" : "⚠️ Above target";
  return `${state.valuePosts} value / ${state.promoPosts} promo posts (${ratio}% value vs ${target}% target). ${status}`;
}

module.exports = { loadState, saveState, recordPost, getNextLabel, getSummary, createDefaultState };
