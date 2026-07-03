import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/security/rate-limit";

const KLAVIYO_LIST_ID = process.env.KLAVIYO_LIST_ID;
const KLAVIYO_API_KEY = process.env.KLAVIYO_API_KEY;

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, "newsletter", 5, 60_000);
  if (limited) return limited;

  let email: string | undefined;
  try {
    const body = await req.json() as { email?: string };
    email = body.email;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
  }

  // Gracefully succeed if Klaviyo is not configured (dev / demo without env vars)
  if (!KLAVIYO_API_KEY || !KLAVIYO_LIST_ID) {
    return NextResponse.json({ ok: true });
  }

  try {
    // Step 1: Upsert profile
    const profileRes = await fetch("https://a.klaviyo.com/api/profiles/", {
      method: "POST",
      headers: {
        Authorization: `Klaviyo-API-Key ${KLAVIYO_API_KEY}`,
        "Content-Type": "application/json",
        revision: "2024-02-15",
      },
      body: JSON.stringify({
        data: { type: "profile", attributes: { email } },
      }),
    });

    let profileId: string | undefined;
    if (profileRes.status === 409) {
      // Profile already exists — extract ID from conflict response
      const conflict = await profileRes.json() as { errors?: Array<{ meta?: { duplicate_profile_id?: string } }> };
      profileId = conflict.errors?.[0]?.meta?.duplicate_profile_id;
    } else if (profileRes.ok) {
      const created = await profileRes.json() as { data?: { id?: string } };
      profileId = created.data?.id;
    }

    // Step 2: Subscribe profile to list
    if (profileId) {
      await fetch(
        `https://a.klaviyo.com/api/lists/${KLAVIYO_LIST_ID}/relationships/profiles/`,
        {
          method: "POST",
          headers: {
            Authorization: `Klaviyo-API-Key ${KLAVIYO_API_KEY}`,
            "Content-Type": "application/json",
            revision: "2024-02-15",
          },
          body: JSON.stringify({
            data: [{ type: "profile", id: profileId }],
          }),
        },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[newsletter] subscribe error", err);
    return NextResponse.json({ error: "Failed to subscribe — please try again." }, { status: 500 });
  }
}
