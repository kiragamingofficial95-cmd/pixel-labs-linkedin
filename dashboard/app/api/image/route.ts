import { NextRequest, NextResponse } from "next/server";
import { generateImage } from "../../../lib/image-gen";

export async function POST(req: NextRequest) {
  try {
    const { postText } = await req.json();
    if (!postText) return NextResponse.json({ error: "postText required" }, { status: 400 });

    const result = await generateImage(postText, {
      provider: process.env.IMAGE_PROVIDER || "auto",
    });

    if (result) return NextResponse.json({ success: true, image: result });
    return NextResponse.json({ error: "Image generation failed" }, { status: 500 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
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
