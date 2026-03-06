/**
 * POST /api/notify
 *
 * Thin endpoint so client components can fire push notifications
 * without exposing the ntfy topic to the browser.
 *
 * Body: { title, body, priority?, tags?, clickUrl? }
 */

import { NextRequest, NextResponse } from "next/server";
import { notify } from "@/lib/notify";
import type { NotifyPayload } from "@/lib/notify";

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json() as NotifyPayload;
    if (!payload.title || !payload.body) {
      return NextResponse.json({ error: "title and body are required" }, { status: 400 });
    }
    await notify(payload);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
