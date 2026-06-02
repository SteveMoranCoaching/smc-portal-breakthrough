import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabaseServer"

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      return NextResponse.json(
        { error: "User lookup failed", detail: userError.message },
        { status: 500 }
      )
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
    }

    const subscription = await request.json()

    const endpoint = subscription?.endpoint
    const p256dh = subscription?.keys?.p256dh
    const auth = subscription?.keys?.auth

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json(
        {
          error: "Invalid subscription",
          detail: {
            hasEndpoint: Boolean(endpoint),
            hasP256dh: Boolean(p256dh),
            hasAuth: Boolean(auth),
          },
        },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("notification_subscriptions")
      .upsert(
        {
          user_id: user.id,
          endpoint,
          p256dh,
          auth,
          user_agent: request.headers.get("user-agent"),
        },
        {
          onConflict: "endpoint",
        }
      )
      .select("id")
      .single()

    if (error) {
      return NextResponse.json(
        {
          error: "Subscription insert failed",
          detail: error.message,
          code: error.code,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, id: data?.id })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unexpected subscribe error",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}