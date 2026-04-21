import { NextResponse } from "next/server";
import { downloadBlob } from "@/lib/blob-storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
): Promise<NextResponse> {
  const { filename } = await params;

  // Prevent path traversal
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  try {
    const result = await downloadBlob(`images/${filename}`);

    if (!result) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(result.data), {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }
}
