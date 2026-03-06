/**
 * POST /api/opportunities/[id]/upload
 *
 * Upload a submission document (PDF, image, etc.) for a specific doc slot.
 * Body: multipart/form-data with:
 *   - file: the file
 *   - docId: the SubmissionDoc id (e.g. "narrative-1")
 *
 * Stores file in Vercel Blob, updates Writing Plan JSON with fileUrl + fileName,
 * and sets completed=true for that doc.
 */

import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getRecord, updateRecord } from "@/lib/airtable";

const TABLE = "Opportunities";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const docId = formData.get("docId") as string | null;

    if (!file || !docId?.trim()) {
      return NextResponse.json(
        { error: "Missing file or docId" },
        { status: 400 }
      );
    }

    // Upload to Vercel Blob
    const filename = `${id}/${docId}/${file.name}`.replace(/[^a-zA-Z0-9._/-]/g, "_");
    const blob = await put(filename, file, { access: "public" });

    // Load current record and Writing Plan
    const record = await getRecord(TABLE, id);
    const rawPlan = (record.fields["Writing Plan"] as string) ?? "{}";
    let plan: Record<string, unknown> = {};
    try {
      plan = JSON.parse(rawPlan);
    } catch {
      return NextResponse.json({ error: "Invalid Writing Plan" }, { status: 400 });
    }

    const sr = plan.submissionRequirements as {
      documents?: Array<{
        id: string;
        name?: string;
        type?: string;
        required?: boolean;
        notes?: string;
        completed?: boolean;
        fileUrl?: string;
        fileName?: string;
      }>;
    } | undefined;

    if (!sr?.documents?.length) {
      return NextResponse.json(
        { error: "No submission documents in plan" },
        { status: 400 }
      );
    }

    const updatedDocs = sr.documents.map((d) =>
      d.id === docId
        ? {
            ...d,
            fileUrl: blob.url,
            fileName: file.name,
            completed: true,
          }
        : d
    );

    const updatedPlan = {
      ...plan,
      submissionRequirements: { ...sr, documents: updatedDocs },
    };

    await updateRecord(TABLE, id, {
      "Writing Plan": JSON.stringify(updatedPlan),
    });

    return NextResponse.json({
      url: blob.url,
      fileName: file.name,
      docId,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
