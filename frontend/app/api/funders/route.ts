import { NextResponse } from "next/server";
import { getFunders } from "@/lib/airtable";

export const revalidate = 120;

export async function GET() {
  try {
    const records = await getFunders({ maxRecords: 200 });
    return NextResponse.json({ records });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
