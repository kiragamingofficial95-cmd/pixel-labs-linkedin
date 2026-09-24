import { NextRequest, NextResponse } from "next/server";
import { generatePost } from "../../../lib/groq-client";
import { recordPost, getNextLabel, getSummary } from "../../../lib/ratio-tracker";
import { buildScenePrompt } from "../../../lib/image-gen";
import { query } from "../../../lib/db";

/**
 * POST /api/image
 * Returns the FULL package: generated post text + copy-paste image prompt.
 * No server-side image rendering — paste the prompt into any AI image tool.
 *
 * Body options:
 *   { postText }                    → build prompt from existing text (no generation, no save)
 *   { topic?, auto?, forceValue?, forcePromo? } → generate post via Groq, build prompt, save draft
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { postText, topic, auto, forceValue, forcePromo } = body || {};

    // Mode 1: prompt for an existing post — no generation, no save.
    if (postText) {
      const built = buildScenePrompt(postText);
      return NextResponse.json({
        success: true,
        imagePrompt: { prompt: built.prompt, insight: built.insight, metaphor: built.metaphor },
      });
    }

    // Mode 2: full package — generate the post, build its image prompt, save as draft.
    const forcedLabel = forceValue ? "VALUE" : forcePromo ? "PROMO" : null;
    const result = await generatePost({ topic: auto ? "auto" : topic || "auto", forcedLabel });
    await recordPost(result.label);

    const built = buildScenePrompt(result.text);

    try {
      await query("ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_prompt TEXT");
    } catch {}
    await query(
      `INSERT INTO posts (topic, generated_text, label, image_url, image_prompt, status) VALUES ($1, $2, $3, $4, $5, $6)`,
      [auto ? "auto" : topic || "auto", result.text, result.label, null, built.prompt, "draft"]
    );

    const next = await getNextLabel();
    const summary = await getSummary();

    return NextResponse.json({
      success: true,
      post: { text: result.text, label: result.label, model: result.model },
      imagePrompt: { prompt: built.prompt, insight: built.insight, metaphor: built.metaphor },
      ratioState: { label: next.label, reason: next.reason },
      ratioSummary: summary,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
    },
  });
}
