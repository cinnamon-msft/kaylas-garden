import { NextResponse } from "next/server";
import { downloadBlob } from "@/lib/blob-storage";

/**
 * Serves images with caching headers for CDN
 * GET /api/images/[filename]
 */

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
): Promise<NextResponse> {
  try {
    const { filename } = await params;
    
    if (!filename) {
      return NextResponse.json({ error: "No filename provided" }, { status: 400 });
    }

    // Download the image from blob storage
    const result = await downloadBlob(`images/${filename}`);
    
    if (!result) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const { data: buffer, contentType } = result;
    const body = new Uint8Array(buffer);

    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable", // Cache for 1 year
        "CDN-Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (err: unknown) {
    console.error("GET /api/images/[filename] failed:", err);
    return NextResponse.json(
      { error: "Failed to serve image" },
      { status: 500 }
    );
  }
}
