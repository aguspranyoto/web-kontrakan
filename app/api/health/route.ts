import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, db: "up" });
  } catch (e) {
    return NextResponse.json({ ok: false, db: "down" }, { status: 500 });
  }
}
