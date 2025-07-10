import { NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await getUserByEmail(email);
    return NextResponse.json({
      exists: !!user,
      provider: user?.accounts[0]?.providerId,
      emailVerified: user?.emailVerified,
    });
  } catch (error) {
    console.error("Error checking user existence:", error);
    return NextResponse.json(
      { error: "Failed to check user existence" },
      { status: 500 },
    );
  }
}
