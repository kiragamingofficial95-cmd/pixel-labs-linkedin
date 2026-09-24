/**
 * Groq API client — generated in dashboard context.
 * Duplicate of generator/groq-client.js but using dashboard's local paths.
 */

const Groq = require("groq-sdk");
const { buildSystemPrompt } = require("../shared/prompts");
const { loadState } = require("../shared/ratio-tracker");

let groqClient = null;

function getClient() {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY is required");
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

async function generatePost({ topic = "auto", forcedLabel = null } = {}) {
  const client = getClient();
  const state = loadState();
  const systemPrompt = buildSystemPrompt(getRatioSummary(state));

  let userContent = `Generate a LinkedIn post.`;

  if (forcedLabel) {
    userContent += `\nFORCE LABEL: [${forcedLabel}]`;
  } else {
    const nextLabel = getNextLabel();
    if (nextLabel && nextLabel.allowed) {
      userContent += `\nTARGET LABEL: [${nextLabel.label}]`;
    }
  }

  if (topic === "auto") {
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

  try {
    const completion = await client.chat.completions.create({
      model: "groq/llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      temperature: 0.7,
      max_tokens: 500,
      stream: false,
    });

    const text = completion.choices[0].message.content.trim();
    const labelMatch = text.match(/^\[(VALUE|PROMO)\]/);
    const label = labelMatch ? labelMatch[1] : "VALUE";

    return { text, label, model: "groq/llama-3.3-70b-versatile" };
  } catch (err) {
    console.warn("llama-3.3-70b-versatile failed, trying fallback...", err.message);
    try {
      const fallbackCompletion = await client.chat.completions.create({
        model: "groq/llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        temperature: 0.7,
        max_tokens: 500,
        stream: false,
      });
      const text = fallbackCompletion.choices[0].message.content.trim();
      const labelMatch = text.match(/^\[(VALUE|PROMO)\]/);
      return { text, label: labelMatch ? labelMatch[1] : "VALUE", model: "groq/llama-3.1-8b-instant" };
    } catch (fallbackErr) {
      throw new Error(`Groq generation failed: ${err.message}`);
    }
  }
}

function getRatioSummary(state) {
  if (state.totalPosts === 0) return "No posts generated yet. Start fresh.";
  const ratio = ((state.valuePosts / state.totalPosts) * 100).toFixed(0);
  return `${state.valuePosts} value / ${state.promoPosts} promo posts. Current ratio: ${ratio}%. Target: 80/20.`;
}

function getNextLabel() {
  return require("../shared/ratio-tracker").getNextLabel();
}

module.exports = { generatePost, getClient };
