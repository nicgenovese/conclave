import { NextResponse } from "next/server";
import { getDataHealth } from "@/lib/data";

export async function GET() {
  try {
    const data = getDataHealth();

    const env = {
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      PORTAL_PASSPHRASE: !!process.env.PORTAL_PASSPHRASE,
      ETHERSCAN_API_KEY: !!process.env.ETHERSCAN_API_KEY,
      COINGECKO_API_KEY: !!process.env.COINGECKO_API_KEY,
      X_BEARER_TOKEN: !!process.env.X_BEARER_TOKEN,
      DUNE_API_KEY: !!process.env.DUNE_API_KEY,
    };

    // Status logic
    const requiredEnvSet = env.NEXTAUTH_SECRET && env.PORTAL_PASSPHRASE;
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
