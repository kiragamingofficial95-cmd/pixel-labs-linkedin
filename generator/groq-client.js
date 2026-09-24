/**
 * Groq API client — generates LinkedIn post text.
 * Primary: openai/gpt-oss-120b, fallback: openai/gpt-oss-20b
 * (llama models were retired from Groq in Aug 2026).
 * Uses the OpenAI-compatible API endpoint.
 */

const Groq = require("groq-sdk");
const { buildSystemPrompt } = require("../shared/prompts");
const { loadState, getNextLabel } = require("../shared/ratio-tracker");

const PRIMARY_MODEL = "openai/gpt-oss-120b";
const FALLBACK_MODEL = "openai/gpt-oss-20b";

let groqClient = null;

function getClient() {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY is required. See .env.example");
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

/**
 * Generate a LinkedIn post via Groq.
 *
 * @param {object} options
 * @param {string} options.topic - The source note/topic to write about, or "auto"
 * @param {string} options.forcedLabel - "VALUE", "PROMO", or null
 * @returns {Promise<{text: string, label: string, model: string}>}
 */
async function generatePost({ topic = "auto", forcedLabel = null } = {}) {
  const client = getClient();
  const state = loadState();
  const systemPrompt = buildSystemPrompt(getRatioSummary(state));

  // Build the user message
  let userContent = `Generate a LinkedIn post.`;

  if (forcedLabel) {
    userContent += `\nFORCE LABEL: [${forcedLabel}]`;
  } else {
    const nextLabel = getNextLabel();
    if (nextLabel.allowed) {
      userContent += `\nTARGET LABEL: [${nextLabel.label}]`;
    }
  }

  if (topic === "auto") {
    // Pick a random value angle from source notes
    const sourceNotes = require("../shared/source-notes");
    const angles = sourceNotes.valueAngles;
    const angle = angles[Math.floor(Math.random() * angles.length)];
    const insight = sourceNotes.insights[Math.floor(Math.random() * sourceNotes.insights.length)];
    const build = sourceNotes.outreachBuilds[Math.floor(Math.random() * sourceNotes.outreachBuilds.length)];

    userContent += `\n\nTOPIC: ${angle}`;
    userContent += `\n\nCONTEXT: ${insight}`;
    userContent += `\n\nRELATED STORY: ${build.title} — ${build.lesson}`;
    userContent += `\n\nWrite this as a first-person post from Varad, founder of Pixel Labs.`;
  } else {
    userContent += `\n\nTOPIC: ${topic}`;
    userContent += `\n\nWrite this as a first-person post from Varad, founder of Pixel Labs, about: ${topic}`;
  }

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent },
  ];

  try {
    const completion = await client.chat.completions.create({
      model: PRIMARY_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 500,
      stream: false,
    });

    const text = completion.choices[0].message.content.trim();

    // Extract label from the text
    const labelMatch = text.match(/^\[(VALUE|PROMO)\]/);
    const label = labelMatch ? labelMatch[1] : "VALUE";

    return { text, label, model: PRIMARY_MODEL };
  } catch (err) {
    console.warn(PRIMARY_MODEL + " failed, trying fallback...", err.message);
    try {
      const fallbackCompletion = await client.chat.completions.create({
        model: FALLBACK_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 500,
        stream: false,
      });
      const text = fallbackCompletion.choices[0].message.content.trim();
      const labelMatch = text.match(/^\[(VALUE|PROMO)\]/);
      return {
        text,
        label: labelMatch ? labelMatch[1] : "VALUE",
        model: FALLBACK_MODEL,
      };
    } catch (fallbackErr) {
      throw new Error(`Groq generation failed: ${err.message}. Fallback also failed: ${fallbackErr.message}`);
    }
  }
}

function getRatioSummary(state) {
  if (state.totalPosts === 0) return "No posts generated yet. Start fresh.";
  const ratio = ((state.valuePosts / state.totalPosts) * 100).toFixed(0);
  return `${state.valuePosts} value / ${state.promoPosts} promo posts. Current ratio: ${ratio}% value. Target: 80/20.`;
}

module.exports = { generatePost, getClient, PRIMARY_MODEL, FALLBACK_MODEL };
