import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const keys = {
    GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    ETHERSCAN_API_KEY: !!process.env.ETHERSCAN_API_KEY,
    COINGECKO_API_KEY: !!process.env.COINGECKO_API_KEY,
    X_BEARER_TOKEN: !!process.env.X_BEARER_TOKEN,
  };

  return NextResponse.json({ keys });
}
