import { NextResponse } from "next/server";
import { extname } from "path";
import { randomUUID } from "crypto";
import { uploadBlob } from "@/lib/blob-storage";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB (compressed)

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

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed. Accepted: JPEG, PNG, GIF, WebP" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    const originalName = file instanceof File ? file.name : "upload.jpg";
    const ext = extname(originalName) || ".webp";
    const filename = `${randomUUID()}${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadBlob(`images/${filename}`, buffer, file.type);

    return NextResponse.json(
      { 
        filename,
        size: buffer.length,
        url: `/api/uploads/${filename}`,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("POST /api/upload failed:", err);
    const message = err instanceof Error ? err.message : "Failed to upload file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
