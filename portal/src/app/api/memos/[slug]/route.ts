import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getMemo } from "@/lib/data";

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memo = await getMemo(params.slug);
  if (!memo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(memo);
}
