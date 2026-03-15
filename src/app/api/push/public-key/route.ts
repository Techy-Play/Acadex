import { NextResponse } from "next/server";
import { getVapidPublicKey } from "@/lib/push/config";

export async function GET() {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return NextResponse.json(
      { error: "VAPID public key is not configured" },
      { status: 503 }
    );
  }

  return NextResponse.json({ publicKey });
}
