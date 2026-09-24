import { NextRequest, NextResponse } from "next/server";
import { query } from "../../../lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const label = searchParams.get("label");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let whereClauses: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    if (label) {
      whereClauses.push(`label = $${paramIndex++}`);
      params.push(label);
    }
    if (status) {
      whereClauses.push(`status = $${paramIndex++}`);
      params.push(status);
    }
    if (search) {
      whereClauses.push(`topic ILIKE $${paramIndex++}`);
      params.push(`%${search}%`);
      whereClauses.push(`generated_text ILIKE $${paramIndex++}`);
      params.push(`%${search}%`);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
    params.push(limit, offset);

    const result = await query(
      `SELECT * FROM posts ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    return NextResponse.json({ posts: result.rows, total: result.rows.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, impressions, likes, comments, reposts, profile_views_delta, posted_at } = body;

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(status);
    }
    if (impressions !== undefined) {
      updates.push(`impressions = $${paramIndex++}`);
      params.push(impressions);
    }
    if (likes !== undefined) {
      updates.push(`likes = $${paramIndex++}`);
      params.push(likes);
    }
    if (comments !== undefined) {
      updates.push(`comments = $${paramIndex++}`);
      params.push(comments);
    }
    if (reposts !== undefined) {
      updates.push(`reposts = $${paramIndex++}`);
      params.push(reposts);
    }
    if (profile_views_delta !== undefined) {
      updates.push(`profile_views_delta = $${paramIndex++}`);
      params.push(profile_views_delta);
    }
    if (posted_at !== undefined) {
      updates.push(`posted_at = $${paramIndex++}`);
      params.push(posted_at);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    params.push(id);
    await query(`UPDATE posts SET ${updates.join(", ")} WHERE id = $${paramIndex}`, params);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await query(`DELETE FROM posts WHERE id = $1`, [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
