import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabaseServer"

const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
]

function getStartOfWeekDate() {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)

  const monday = new Date(now)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)

  return monday
}

function formatDateForSupabase(date: Date) {
  return date.toISOString().split("T")[0]
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
  }

  const body = await request.json()
  const programmeId = body.programmeId
const scheduleRows = body.scheduleRows || []
const currentWeekNumber = Number(body.weekNumber || 1)

  if (!programmeId) {
    return NextResponse.json({ error: "Missing programme id" }, { status: 400 })
  }

  const startOfWeek = getStartOfWeekDate()
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(endOfWeek.getDate() + 7)

  const { error: deleteError } = await supabase
  .from("client_weekly_session_schedule")
  .delete()
  .eq("user_id", user.id)
  .eq("programme_id", programmeId)
  .eq("week_number", currentWeekNumber)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  const rows = scheduleRows.map((item: any) => {
  const plannedDate = new Date(startOfWeek)
  plannedDate.setDate(startOfWeek.getDate() + Number(item.dayIndex))

  return {
    user_id: user.id,
    programme_id: programmeId,
    session_id: item.sessionId,
    week_number: currentWeekNumber,
    planned_date: formatDateForSupabase(plannedDate),
    planned_order: Number(item.dayIndex) + 1,
  }
})
  .filter((row) => row !== null)

  if (rows.length > 0) {
    const { error: insertError } = await supabase
      .from("client_weekly_session_schedule")
      .insert(rows)

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }
  }

  return NextResponse.json({
    success: true,
    saved: rows.length,
  })
}