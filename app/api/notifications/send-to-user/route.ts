import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import { sendPushNotification } from "@/lib/sendPushNotification"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
  }

  const body = await request.json()

  const userId = body?.userId
  const title = body?.title || "SMC Portal"
  const message = body?.body || "You have a new update."
  const url = body?.url || "/dashboard"

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const isCoach = profile?.role === "coach"
  const sendingToSelf = user.id === userId

  let allowed = false

if (isCoach) {
  allowed = true
}

if (sendingToSelf) {
  allowed = true
}

if (!isCoach && !sendingToSelf) {
  const { data: clientRow } = await supabase
    .from("clients")
    .select("coach_id")
    .eq("user_id", user.id)
    .single()

  if (clientRow?.coach_id === userId) {
    allowed = true
  }
}

if (!allowed) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

  console.log(
  "SERVICE ROLE EXISTS:",
  !!process.env.SUPABASE_SERVICE_ROLE_KEY
)

  const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

  const { data: subscriptions, error } = await adminSupabase
  .from("notification_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results = await Promise.allSettled(
    (subscriptions || []).map((subscription) =>
      sendPushNotification(subscription, {
        title,
        body: message,
        url,
      })
    )
  )

  return NextResponse.json({
  success: true,
  requestedUserId: userId,
  subscriptionCount: subscriptions?.length || 0,
  subscriptions,
  sent: results.filter((result) => result.status === "fulfilled").length,
  failed: results.filter((result) => result.status === "rejected").length,
})
}