import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { promises as fs } from "fs";
import path from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "/app/data/uploads";

export async function GET(_: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { path: parts } = await params;
  // cegah path traversal: hanya izinkan bukti/YYYY/MM/file
  if (!parts || parts.length !== 4 || parts[0] !== "bukti") return new NextResponse("Not found", { status: 404 });
  const safe = parts.every((p) => /^[a-zA-Z0-9._-]+$/.test(p));
  if (!safe) return new NextResponse("Not found", { status: 404 });
  const file = path.join(UPLOAD_DIR, ...parts);
  try {
    const buf = await fs.readFile(file);
    const ext = path.extname(file).toLowerCase();
    const type = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
    return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": type, "Cache-Control": "private, max-age=3600" } });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
