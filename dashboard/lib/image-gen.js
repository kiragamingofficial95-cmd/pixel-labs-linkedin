/**
 * Image Generator — duplicated from shared/image-gen.js for dashboard context.
 */

async function extractQuote(text) {
  const body = text.replace(/^\[(VALUE|PROMO)\]\s*/, "").trim();
  const sentences = body.split(/(?<=[.!?])\s+/).filter(s => s.length > 10);
  if (sentences.length === 0) return body.slice(0, 120);
  const short = sentences.filter(s => s.length < 160);
  if (short.length > 0) return short[0];
  return sentences[0].slice(0, 140);
}

async function generatePollinationsQuote(quoteText) {
  const encodedPrompt = encodeURIComponent(
    `Branded LinkedIn quote card, dark navy background (#0a1628), electric lime green accent (#39FF14), modern sans-serif typography, white text reading: "${quoteText}", clean minimalist design, professional B2B style, 1200x628 aspect ratio`
  );
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1200&height=628&nologo=true&model=flux`;
}

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

async function generateImage(postText, options = {}) {
  const provider = options.provider || process.env.IMAGE_PROVIDER || "pollinations";
  const quote = await extractQuote(postText);

  try {
    switch (provider) {
      case "pollinations": {
        return { url: await generatePollinationsQuote(quote), quote };
      }
      case "together": {
        if (!options.togetherApiKey && !process.env.TOGETHER_API_KEY) {
          throw new Error("TOGETHER_API_KEY not set");
        }
        return { url: await generateTogetherAI(quote, options.togetherApiKey || process.env.TOGETHER_API_KEY), quote };
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

module.exports = { extractQuote, generateImage };
