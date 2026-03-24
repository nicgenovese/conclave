import { NextResponse } from "next/server";
import { getDataHealth } from "@/lib/data";

export async function GET() {
  try {
    const data = getDataHealth();

    const env = {
      GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      ETHERSCAN_API_KEY: !!process.env.ETHERSCAN_API_KEY,
      COINGECKO_API_KEY: !!process.env.COINGECKO_API_KEY,
      X_BEARER_TOKEN: !!process.env.X_BEARER_TOKEN,
    };

    // Status logic
    const requiredEnvSet = env.GOOGLE_CLIENT_ID && env.NEXTAUTH_SECRET;
    const allDataOk = data.portfolio.ok && data.risk.ok && data.macro.ok && data.memos.ok && data.briefs.ok;
    const allEnvSet = Object.values(env).every(Boolean);

    let status: "ok" | "degraded" | "error";
    if (!data.portfolio.ok) {
      status = "error";
    } else if (!allDataOk || !allEnvSet || !requiredEnvSet) {
      status = "degraded";
    } else {
      status = "ok";
    }

    return NextResponse.json({
      status,
      timestamp: new Date().toISOString(),
      data,
      env,
    });
  } catch (err) {
    console.error("[api/health] Error:", err);
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        error: err instanceof Error ? err.message : "Unknown",
      },
      { status: 500 }
    );
  }
}
