import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getWhitelist, addUser, removeUser } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const whitelist = await getWhitelist();
    return NextResponse.json(whitelist);
  } catch (err) {
    console.error("[api/admin/whitelist] GET Error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { email, role } = await req.json();
    const newUser = await addUser(email, role);
    return NextResponse.json(newUser);
  } catch (err) {
    console.error("[api/admin/whitelist] POST Error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { email } = await req.json();
    const result = await removeUser(email);
    return NextResponse.json({ success: result });
  } catch (err) {
    console.error("[api/admin/whitelist] DELETE Error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}
