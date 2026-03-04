import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getRecord, updateRecord } from "@/lib/airtable";

// GET /api/opportunities/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const record = await getRecord("Opportunities", params.id);
    return NextResponse.json(record);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/opportunities/[id]
// Body: { fields: { ... } }
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const updated = await updateRecord("Opportunities", params.id, body.fields);
    // Invalidate cached pages so the next GET reflects the update immediately
    revalidatePath(`/opportunity/${params.id}`);
    revalidatePath("/writing-queue");
    revalidatePath("/pipeline");
    revalidatePath("/");
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
