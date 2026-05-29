"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin"
import { requireCoach } from "@/lib/authGuards"

type SetEntry = {
  weight?: string
  reps?: string
  rpe?: string
}

type ExerciseEntry = {
  exerciseName?: string
  notes?: string
  sets?: SetEntry[]
}

function hasUsefulSet(set: SetEntry) {
  return Boolean(
    String(set.weight || "").trim() ||
      String(set.reps || "").trim() ||
      String(set.rpe || "").trim()
  )
}

export async function addCoachSession(formData: FormData) {
  const clientId = String(formData.get("clientId") || "")
  const programmeId = String(formData.get("programmeId") || "")
  const sessionId = String(formData.get("sessionId") || "")
  const sessionNotes = String(formData.get("sessionNotes") || "").trim()
  const sessionRatingRaw = String(formData.get("sessionRating") || "").trim()
  const durationMinutesRaw = String(formData.get("durationMinutes") || "").trim()
  const entriesJson = String(formData.get("entriesJson") || "[]")

  if (!clientId || !programmeId || !sessionId) {
    redirect(
      `/coach/${clientId || ""}?coachSessionError=${encodeURIComponent(
        "Missing client, programme or session"
      )}`
    )
  }

  const { user } = await requireCoach()
  const admin = createSupabaseAdminClient()

  const { data: client, error: clientError } = await admin
    .from("clients")
    .select("id, user_id")
    .eq("id", clientId)
    .single()

  if (clientError || !client?.user_id) {
    redirect(
      `/coach/${clientId}?coachSessionError=${encodeURIComponent(
        clientError?.message || "Client user_id not found"
      )}`
    )
  }

  let entries: ExerciseEntry[] = []

  try {
    entries = JSON.parse(entriesJson)
  } catch {
    redirect(
      `/coach/${clientId}?coachSessionError=${encodeURIComponent(
        "Could not read submitted session data"
      )}`
    )
  }

  const cleanEntries = entries
    .map((entry) => ({
      exerciseName: String(entry.exerciseName || "").trim(),
      notes: String(entry.notes || "").trim(),
      sets: Array.isArray(entry.sets)
        ? entry.sets
            .map((set) => ({
              weight: String(set.weight || "").trim(),
              reps: String(set.reps || "").trim(),
              rpe: String(set.rpe || "").trim(),
            }))
            .filter(hasUsefulSet)
        : [],
    }))
    .filter((entry) => entry.exerciseName && entry.sets.length > 0)

  if (cleanEntries.length === 0) {
    redirect(
      `/coach/${clientId}?coachSessionError=${encodeURIComponent(
        "No completed sets were entered"
      )}`
    )
  }

  for (const entry of cleanEntries) {
    const { data: existingLog } = await admin
      .from("workout_logs")
      .select("id")
      .eq("user_id", client.user_id)
      .eq("programme_id", programmeId)
      .eq("session_id", sessionId)
      .eq("exercise_name", entry.exerciseName)
      .maybeSingle()

    const payload = {
      user_id: client.user_id,
      programme_id: programmeId,
      session_id: sessionId,
      exercise_name: entry.exerciseName,
      sets_completed: entry.sets,
      notes: entry.notes || null,
      reviewed: true,
      coach_feedback: null,
      feedback_read: true,
      manual_entry: true,
      submitted_by: "coach",
      coach_id: user.id,
      source: "coach_session",
    }

    const { error: logError } = existingLog?.id
      ? await admin.from("workout_logs").update(payload).eq("id", existingLog.id)
      : await admin.from("workout_logs").insert(payload)

    if (logError) {
      redirect(
        `/coach/${clientId}?coachSessionError=${encodeURIComponent(
          logError.message
        )}`
      )
    }
  }

  const sessionRating = sessionRatingRaw ? Number(sessionRatingRaw) : null
  const durationMinutes = durationMinutesRaw ? Number(durationMinutesRaw) : null

  const { data: existingCompletion } = await admin
    .from("session_completions")
    .select("id")
    .eq("user_id", client.user_id)
    .eq("programme_id", programmeId)
    .eq("session_id", sessionId)
    .maybeSingle()

  const completionPayload = {
    user_id: client.user_id,
    programme_id: programmeId,
    session_id: sessionId,
    completed: true,
    session_rating: Number.isFinite(sessionRating) ? sessionRating : null,
    duration_minutes: Number.isFinite(durationMinutes) ? durationMinutes : null,
    notes: sessionNotes || null,
    manual_entry: true,
    submitted_by: "coach",
    coach_id: user.id,
    source: "coach_session",
  }

  const { error: completionError } = existingCompletion?.id
    ? await admin
        .from("session_completions")
        .update(completionPayload)
        .eq("id", existingCompletion.id)
    : await admin.from("session_completions").insert(completionPayload)

  if (completionError) {
    redirect(
      `/coach/${clientId}?coachSessionError=${encodeURIComponent(
        completionError.message
      )}`
    )
  }

  revalidatePath(`/coach/${clientId}`)
  revalidatePath("/coach")
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/workouts")

  redirect(`/coach/${clientId}?tab=overview&coachSessionAdded=true`)
}