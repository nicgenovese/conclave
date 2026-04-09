import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const keys = {
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      PORTAL_PASSPHRASE: !!process.env.PORTAL_PASSPHRASE,
      ETHERSCAN_API_KEY: !!process.env.ETHERSCAN_API_KEY,
      COINGECKO_API_KEY: !!process.env.COINGECKO_API_KEY,
      X_BEARER_TOKEN: !!process.env.X_BEARER_TOKEN,
      DUNE_API_KEY: !!process.env.DUNE_API_KEY,
    };

    return NextResponse.json({ keys });
  } catch (err) {
    console.error("[api/admin/status] Error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}
