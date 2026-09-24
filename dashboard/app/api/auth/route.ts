import { NextRequest, NextResponse } from "next/server";
import { validatePassword } from "../../../lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const valid = validatePassword(password);

    if (valid) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: false }, { status: 401 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
