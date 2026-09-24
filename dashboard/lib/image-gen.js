/**
 * Image Generator — scene-based visuals, Gemini primary.
 *
 * Chain (auto mode): Gemini Pro (Nano Banana Pro) → Gemini Flash (Nano Banana)
 *   → Ideogram (if key, default visual engine) → Pollinations.ai → skip (null).
 * Set IMAGE_PROVIDER to force one: "gemini" | "pollinations" | "together" | "ideogram".
 *
 * Strategy: scene-based visuals tied to the post's content — NOT flat quote cards.
 * A structured prompt is built from (1) the post's core insight, (2) a visual
 * metaphor matched to the topic, (3) a brand style directive (dark navy +
 * electric lime, clean SaaS-marketing illustration).
 */

const GEMINI_PRO_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-3-pro-image";
const GEMINI_FLASH_MODEL = "gemini-2.5-flash-image";

const STYLE_DIRECTIVE =
  "clean SaaS-marketing illustration style, flat vector look, deep dark navy (#0a1628) background, " +
  "electric lime green (#39FF14) accents with white details, generous negative space, no clutter, " +
  "no stock-photo look, no photorealistic people, minimal embedded text (at most a few words, only if essential)";

/**
 * Extract a punchy 1-liner insight from post text.
 */
function extractQuote(text) {
  const body = text.replace(/^\[(VALUE|PROMO)\]\s*/, "").trim();
  const sentences = body.split(/(?<=[.!?])\s+/).filter((s) => s.length > 10);
  if (sentences.length === 0) return body.slice(0, 140);
  const short = sentences.filter((s) => s.length < 160);
  if (short.length > 0) return short[0];
  return sentences[0].slice(0, 140);
}

/**
 * Pick a visual metaphor based on the post's topic keywords.
 */
function pickMetaphor(insight) {
  const s = insight.toLowerCase();
  if (/(before|after|redesign|teardown|website|site|homepage|landing page|gallery)/.test(s)) {
    return (
      "a split-screen before/after composition: on the left a dated, cluttered contractor homepage " +
      "mockup in dull gray, on the right the same page redesigned as a modern clean layout glowing " +
      "with lime-green accents, a subtle transformation arrow flowing between the two halves"
    );
  }
  if (/(review|lead scoring|signal|stars|rating|trust|gap|testimonial)/.test(s)) {
    return (
      "a clean analytics-dashboard-style visual: five gold review stars flowing through a funnel " +
      "into a laptop showing a contractor website, with an upward lime-green trend line"
    );
  }
  if (/(outreach|cold call|cold email|dm|message|funnel|reply|inbox|follow-up)/.test(s)) {
    return (
      "an isometric illustration of an outreach funnel: envelopes, phones and chat bubbles pouring " +
      "into the top of a wide funnel, booked consultation calls coming out the bottom"
    );
  }
  if (/(pricing|positioning|price|offer|trade|case study|audit)/.test(s)) {
    return (
      "a minimal pricing visual: three ascending service-tier cards arranged like steps, " +
      "the top step highlighted in electric lime green"
    );
  }
  return (
    "a minimal abstract growth composition: an ascending lime-green chart line rising " +
    "from the roofline of a small contractor house silhouette"
  );
}

/**
 * Build the structured scene prompt from a post.
 * Returns { insight, prompt }.
 */
function buildScenePrompt(postText) {
  const insight = extractQuote(postText);
  const metaphor = pickMetaphor(insight);
  const prompt =
    "LinkedIn post illustration, wide 16:9 landscape composition. " +
    "Subject: " + insight + " " +
    "Visual metaphor: " + metaphor + ". " +
    "Style: " + STYLE_DIRECTIVE + ".";
  return { insight, prompt };
}

/**
 * Gemini (Nano Banana) image generation via generateContent REST.
 * Returns a data URL (base64 PNG) — no upload step needed.
 */
async function generateGemini(postText, apiKey, model) {
  const built = buildScenePrompt(postText);
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent",
    {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: built.prompt }] }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
          imageConfig: { aspectRatio: "16:9" },
        },
      }),
    }
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error("Gemini " + res.status + ": " + t.slice(0, 200));
  }
  const data = await res.json();
  const parts = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
  const img = parts.find((p) => p.inlineData && p.inlineData.data);
  if (!img) throw new Error("Gemini returned no image data");
  return {
    url: "data:" + (img.inlineData.mimeType || "image/png") + ";base64," + img.inlineData.data,
    quote: built.insight,
    provider: "gemini:" + model,
  };
}

/**
 * Pollinations.ai — free, no key. Scene prompt instead of quote card.
 */
async function generatePollinationsScene(postText) {
  const built = buildScenePrompt(postText);
  const url =
    "https://image.pollinations.ai/prompt/" +
    encodeURIComponent(built.prompt) +
    "?width=1200&height=628&nologo=true&model=flux";
  return { url, quote: built.insight, provider: "pollinations" };
}

/**
 * Together AI FLUX.1-schnell — free tier, needs TOGETHER_API_KEY.
 */
async function generateTogetherAI(postText, apiKey) {
  const built = buildScenePrompt(postText);
  const res = await fetch("https://api.together.xyz/v1/images/generations", {
    method: "POST",
    headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "black-forest-labs/FLUX.1-schnell",
      prompt: built.prompt,
      width: 1200,
      height: 628,
      n: 1,
      response_format: "url",
    }),
  });
  if (!res.ok) throw new Error("Together AI error: " + res.status);
  const data = await res.json();
  const url = data.data && data.data[0] && data.data[0].url;
  if (!url) throw new Error("Together AI returned no URL");
  return { url, quote: built.insight, provider: "together" };
}

/**
 * Ideogram — free tier (10/day), best for embedded text. Needs IDEOGRAM_API_KEY.
 */
async function generateIdeogram(postText, apiKey) {
  const built = buildScenePrompt(postText);
  const res = await fetch("https://api.ideogram.ai/generate", {
    method: "POST",
    headers: { "Api-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      image_request: {
        prompt: built.prompt,
        aspect_ratio: "ASPECT_16_9",
        model: "V_2",
        magic_prompt_option: "AUTO",
        style_type: "DESIGN",
      },
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error("Ideogram " + res.status + ": " + t.slice(0, 200));
  }
  const data = await res.json();
  const url = data.data && data.data[0] && data.data[0].url;
  if (!url) throw new Error("Ideogram returned no URL");
  return { url, quote: built.insight, provider: "ideogram" };
}

/**
 * Main entry point.
 * provider "auto" (default): Gemini (pro then flash) → Ideogram → Pollinations → null.
 * Explicit provider: tries Gemini (pro then flash) / pollinations / together / ideogram once.
 */
async function generateImage(postText, options) {
  options = options || {};
  const provider = options.provider || process.env.IMAGE_PROVIDER || "auto";
  const geminiKey = options.geminiApiKey || process.env.GEMINI_API_KEY;
  const errors = [];

  async function attempt(name, fn) {
    try {
      return await fn();
    } catch (e) {
      errors.push(name + ": " + e.message);
      return null;
    }
  }

  async function tryGemini() {
    if (!geminiKey) {
      errors.push("gemini: GEMINI_API_KEY not set");
      return null;
    }
    let r = await attempt("gemini:" + GEMINI_PRO_MODEL, () =>
      generateGemini(postText, geminiKey, GEMINI_PRO_MODEL)
    );
    if (r) return r;
    return attempt("gemini:" + GEMINI_FLASH_MODEL, () =>
      generateGemini(postText, geminiKey, GEMINI_FLASH_MODEL)
    );
  }

  async function tryPollinations() {
    return attempt("pollinations", () => generatePollinationsScene(postText));
  }

  async function tryIdeogram() {
    const key = options.ideogramApiKey || process.env.IDEOGRAM_API_KEY;
    if (!key) {
      errors.push("ideogram: IDEOGRAM_API_KEY not set");
      return null;
    }
    return attempt("ideogram", () => generateIdeogram(postText, key));
  }

  if (provider === "auto") {
    let r = await tryGemini();
    if (r) return r;
    r = await tryIdeogram();
    if (r) return r;
    r = await tryPollinations();
    if (r) return r;
    console.error("All image providers failed:\n" + errors.join("\n"));
    return null;
  }

  switch (provider) {
    case "gemini": {
      const r = await tryGemini();
      if (!r) console.error(errors.join("\n"));
      return r;
    }
    case "pollinations": {
      const r = await tryPollinations();
      if (!r) console.error(errors.join("\n"));
      return r;
    }
    case "together": {
      const key = options.togetherApiKey || process.env.TOGETHER_API_KEY;
      if (!key) throw new Error("TOGETHER_API_KEY not set");
      return attempt("together", () => generateTogetherAI(postText, key));
    }
    case "ideogram": {
      const r = await tryIdeogram();
      if (!r) console.error(errors.join("\n"));
      return r;
    }
    default:
      throw new Error("Unknown image provider: " + provider);
  }
}

module.exports = {
  extractQuote,
  pickMetaphor,
  buildScenePrompt,
  generateImage,
  generateGemini,
  generatePollinationsScene,
  generateTogetherAI,
  generateIdeogram,
};
