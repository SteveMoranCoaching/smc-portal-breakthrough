import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabaseServer"

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
  }

  const formData = await request.formData()

  const id = formData.get("id")?.toString()
  const source = formData.get("source")?.toString()

  if (!id || !source) {
    return NextResponse.json(
      { error: "Missing feedback details" },
      { status: 400 }
    )
  }

  const table =
    source === "video" ? "exercise_videos" : "workout_logs"

  const { error } = await supabase
    .from(table)
    .update({ feedback_read: true })
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.redirect(
    new URL("/dashboard/history/feedback", request.url)
  )
}