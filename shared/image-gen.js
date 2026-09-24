/**
 * Image Generator — generates branded quote-card images for LinkedIn posts.
 *
 * Strategy (primary → fallback):
 * 1. Groq hosted image models (if available on account — check at build time)
 * 2. Together AI FLUX.1-schnell (free tier, needs API key)
 * 3. Pollinations.ai (no API key, fully free — recommended default)
 * 4. HTML-to-image via @vercel/og / satori (for clean typographic quote cards)
 *
 * Default is Pollinations.ai since it requires zero configuration.
 */

const crypto = require("crypto");

/**
 * Extract a punchy 1-liner from post text for the quote card.
 * Picks the shortest impactful sentence from the post body.
 */
function extractQuote(text) {
  // Remove the [VALUE] or [PROMO] label first
  const body = text.replace(/^\[(VALUE|PROMO)\]\s*/, "").trim();

  // Split into sentences
  const sentences = body.split(/(?<=[.!?])\s+/).filter(s => s.length > 10);

  if (sentences.length === 0) return body.slice(0, 120);

  // Prefer a shorter sentence (under 140 chars) that has impact
  const short = sentences.filter(s => s.length < 160);
  if (short.length > 0) return short[0];

  return sentences[0].slice(0, 140);
}

/**
 * Generate a branded quote-card image URL using Pollinations.ai.
 * Dark navy background, electric lime green accent.
 */
async function generatePollinationsQuote(quoteText) {
  const encodedText = encodeURIComponent(quoteText);
  // Pollinations prompt-based image generation
  // Using a simple text-to-image with specific style instructions
  const prompt = `Branded LinkedIn quote card, dark navy background (#0a1628), electric lime green accent (#39FF14), modern sans-serif typography, white text reading: "${quoteText}", clean minimalist design, professional B2B style, 1200x628 aspect ratio`;
  const encodedPrompt = encodeURIComponent(prompt);

  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1200&height=628&nologo=true&model=flux`;
}

/**
 * Generate image via Together AI FLUX.1-schnell.
 */
async function generateTogetherAI(quoteText, apiKey) {
  const response = await fetch("https://api.together.ai/inference", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "black-forest-labs/FLUX.1-schnell",
      prompt: `Branded LinkedIn quote card, dark navy background (#0a1628), electric lime green accent (#39FF14), modern sans-serif typography, white text: "${quoteText}", clean minimalist design`,
      width: 1200,
      height: 628,
      output_format: "url",
    }),
  });

  if (!response.ok) throw new Error(`Together AI error: ${response.status}`);
  const data = await response.json();
  return data.output?.[0]?.url;
}

/**
 * Generate image via Groq (if image models are available).
 * Falls back if not.
 */
async function generateGroqImage(quoteText, apiKey) {
  // Groq primarily supports text generation; image models may not be available
  // This is a placeholder if Groq adds image support
  throw new Error("Groq image generation not yet available");
}

/**
 * Main image generation entry point.
 * Checks available providers in order and returns an image URL.
 *
 * @param {string} postText - The full generated post text
 * @param {object} options - { provider, togetherApiKey }
 * @returns {Promise<{url: string, quote: string} | null>}
 */
async function generateImage(postText, options = {}) {
  const provider = options.provider || process.env.IMAGE_PROVIDER || "pollinations";
  const quote = extractQuote(postText);

  try {
    switch (provider) {
      case "pollinations": {
        const url = await generatePollinationsQuote(quote);
        return { url, quote };
      }
      case "together": {
        if (!options.togetherApiKey && !process.env.TOGETHER_API_KEY) {
          throw new Error("TOGETHER_API_KEY not set");
        }
        const url = await generateTogetherAI(quote, options.togetherApiKey || process.env.TOGETHER_API_KEY);
        return { url, quote };
      }
      case "groq": {
        throw new Error("Groq image generation not yet available; use pollinations or together");
      }
      default: {
        throw new Error(`Unknown image provider: ${provider}`);
      }
    }
  } catch (err) {
    console.error(`Image generation failed (${provider}):`, err.message);
    return null;
  }
}

module.exports = { extractQuote, generateImage, generatePollinationsQuote, generateTogetherAI };
