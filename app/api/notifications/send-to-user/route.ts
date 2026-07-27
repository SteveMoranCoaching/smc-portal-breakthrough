import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import { notifyUser } from "@/lib/notifyUser"

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

  try {
  const result = await notifyUser({
    userId,
    title,
    body: message,
    url,
  })

  return NextResponse.json({
    success: true,
    ...result,
  })
} catch (error) {
  console.error("Push notification error:", error)

  return NextResponse.json(
    { error: "Failed to send notification" },
    { status: 500 }
  )
}
}