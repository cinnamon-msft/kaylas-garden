import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join, extname } from "path";
import { randomUUID } from "crypto";

const UPLOADS_DIR = join(process.cwd(), "public", "uploads");

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const originalName = file instanceof File ? file.name : "upload.jpg";
    const ext = extname(originalName) || ".jpg";
    const filename = `${randomUUID()}${ext}`;

    await mkdir(UPLOADS_DIR, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(join(UPLOADS_DIR, filename), buffer);

    return NextResponse.json({ filename }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to upload file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
