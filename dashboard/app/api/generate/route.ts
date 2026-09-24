import { NextRequest, NextResponse } from "next/server";
import { generatePost } from "../../../lib/groq-client";
import { recordPost, getNextLabel, getSummary } from "../../../lib/ratio-tracker";
import { buildScenePrompt } from "../../../lib/image-gen";
import { query } from "../../../lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { auto, forceValue, forcePromo, withImage } = body || {};

    const forcedLabel = forceValue ? "VALUE" : forcePromo ? "PROMO" : null;

    const result = await generatePost({ topic: "auto", forcedLabel });
    await recordPost(result.label);

    // withImage now means: include a copy-paste image prompt (no server-side rendering).
    let imagePrompt = null;
    if (withImage) {
      const built = buildScenePrompt(result.text);
      imagePrompt = { prompt: built.prompt, insight: built.insight, metaphor: built.metaphor };
    }

    try {
      await query("ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_prompt TEXT");
    } catch {}
    await query(
      `INSERT INTO posts (topic, generated_text, label, image_url, image_prompt, status) VALUES ($1, $2, $3, $4, $5, $6)`,
      ["auto", result.text, result.label, null, imagePrompt ? imagePrompt.prompt : null, "draft"]
    );

    const next = await getNextLabel();
    const summary = await getSummary();

    return NextResponse.json({
      success: true,
      post: {
        text: result.text,
        label: result.label,
        model: result.model,
        imageUrl: null,
      },
      imagePrompt,
      ratioState: {
        label: next.label,
        reason: next.reason,
      },
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
