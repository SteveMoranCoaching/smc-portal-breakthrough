import Link from "next/link"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin"
import VideoGroup from "./VideoGroup"
import WorkoutLogReviewButton from "./WorkoutLogReviewButton"
import WorkoutLogFeedbackBox from "./WorkoutLogFeedbackBox"
import { requireCoach } from "@/lib/authGuards"

export const dynamic = "force-dynamic"

const shellCard =
  "relative overflow-hidden rounded-[1.45rem] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018))] shadow-[0_16px_38px_rgba(0,0,0,0.62)] before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.035),transparent)]"

const innerPanel =
  "rounded-[1.1rem] border border-white/[0.06] bg-black/35"

const labelStyle =
  "text-[9px] font-black uppercase tracking-[0.24em] text-smc-gold/80"

async function updateClientProfile(formData: FormData) {
  "use server"

  const clientId = String(formData.get("clientId") || "")
  const goal = String(formData.get("goal") || "Uncategorised")
  const status = String(formData.get("status") || "Active")
  const coachNotes = String(formData.get("coach_notes") || "")

  if (!clientId) return

  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "coach") redirect("/dashboard")

  const admin = createSupabaseAdminClient()

  await admin
    .from("clients")
    .update({
      goal,
      status,
      coach_notes: coachNotes,
    })
    .eq("id", clientId)

  revalidatePath(`/coach/${clientId}`)
  revalidatePath("/coach/clients")
  revalidatePath("/coach")

  redirect(`/coach/${clientId}?updated=true`)
}

async function addManualCheckIn(formData: FormData) {
  "use server"

  const clientId = String(formData.get("clientId") || "")

  if (!clientId) {
    redirect("/coach/clients?manualCheckInError=missing-client-id")
  }

  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "coach") redirect("/dashboard")

  const admin = createSupabaseAdminClient()

  const { data: client, error: clientError } = await admin
    .from("clients")
    .select("id, user_id")
    .eq("id", clientId)
    .single()

  if (clientError || !client?.user_id) {
    console.error("Manual check-in client lookup failed:", clientError)

    redirect(
      `/coach/${clientId}?manualCheckInError=${encodeURIComponent(
        clientError?.message || "Client user_id not found"
      )}`
    )
  }

  const { error } = await supabase.from("check_ins").insert({
    user_id: client.user_id,
    bodyweight: Number(formData.get("bodyweight")) || null,
    training_rating: Number(formData.get("training_rating")) || null,
    recovery_rating: Number(formData.get("recovery_rating")) || null,
    nutrition_rating: Number(formData.get("nutrition_rating")) || null,
    cardio_steps: String(formData.get("cardio_steps") || "").trim(),
    notes: String(formData.get("notes") || "").trim(),
    reviewed: true,
    feedback_seen: true,
    manual_entry: true,
    submitted_by: "coach",
    coach_id: user.id,
  })

  if (error) {
    console.error("Manual check-in insert failed:", error)

    redirect(
      `/coach/${clientId}?manualCheckInError=${encodeURIComponent(
        error.message
      )}`
    )
  }

  revalidatePath(`/coach/${clientId}`)
  revalidatePath("/coach")

  redirect(`/coach/${clientId}?manualCheckInAdded=true`)
}


async function updateProgrammeWeekOverride(formData: FormData) {
  "use server"

  const clientId = String(formData.get("clientId") || "")
  const programmeId = String(formData.get("programmeId") || "")
  const week = Number(formData.get("week") || 1)

  if (!clientId || !programmeId || !Number.isFinite(week)) {
    redirect(
      `/coach/${clientId || ""}?tab=programme&programmeWeekError=${encodeURIComponent(
        "Missing client, programme or week value"
      )}`
    )
  }

  await requireCoach()

  const admin = createSupabaseAdminClient()

  console.log("Programme week override payload:", {
    clientId,
    programmeId,
    week,
  })

  const { data: updatedProgramme, error: updateError } = await admin
    .from("programmes")
    .update({
      coach_current_week: week,
    })
    .eq("id", programmeId)
    .select("id, title, coach_current_week")
    .single()

  if (updateError || !updatedProgramme) {
    console.error("Programme week override failed:", {
      updateError,
      clientId,
      programmeId,
      week,
      updatedProgramme,
    })

    redirect(
      `/coach/${clientId}?tab=programme&programmeWeekError=${encodeURIComponent(
        updateError?.message || "No programme row was updated"
      )}`
    )
  }

  console.log("Programme week override updated:", updatedProgramme)

  revalidatePath(`/coach/${clientId}`)
  revalidatePath("/coach")
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/workouts")

  redirect(`/coach/${clientId}?tab=programme&programmeWeekUpdated=true`)
}

async function toggleSessionCompletionOverride(formData: FormData) {
  "use server"

  const clientId = String(formData.get("clientId") || "")
  const clientUserId = String(formData.get("clientUserId") || "")
  const programmeId = String(formData.get("programmeId") || "")
  const sessionId = String(formData.get("sessionId") || "")

  if (!clientId || !clientUserId || !programmeId || !sessionId) {
    redirect(`/coach/${clientId || ""}?tab=programme`)
  }

  const { user } = await requireCoach()
  const admin = createSupabaseAdminClient()

  const { data: existing } = await admin
    .from("session_completions")
    .select("id, completed")
    .eq("user_id", clientUserId)
    .eq("programme_id", programmeId)
    .eq("session_id", sessionId)
    .maybeSingle()

  if (existing?.id) {
    await admin
      .from("session_completions")
      .update({
        completed: !existing.completed,
        manual_entry: true,
        submitted_by: "coach",
        coach_id: user.id,
        source: existing.completed ? "coach_override_removed" : "coach_override",
      })
      .eq("id", existing.id)
  } else {
    await admin.from("session_completions").insert({
      user_id: clientUserId,
      programme_id: programmeId,
      session_id: sessionId,
      completed: true,
      manual_entry: true,
      submitted_by: "coach",
      coach_id: user.id,
      source: "coach_override",
    })
  }

  revalidatePath(`/coach/${clientId}`)
  revalidatePath("/coach")
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/workouts")

  redirect(`/coach/${clientId}?tab=programme&sessionCompletionUpdated=true`)
}

async function updateSessionCompletionFeedback(formData: FormData) {
  "use server"

  const clientId = String(formData.get("clientId") || "")
  const completionId = String(formData.get("completionId") || "")
  const coachFeedback = String(formData.get("coachFeedback") || "").trim()

  if (!clientId || !completionId) {
    redirect(`/coach/${clientId || ""}?tab=logs&sessionFeedbackError=${encodeURIComponent("Missing client or session completion")}`)
  }

  await requireCoach()

  const admin = createSupabaseAdminClient()

  const { error } = await admin
    .from("session_completions")
    .update({
      coach_feedback: coachFeedback || null,
      feedback_read: false,
    })
    .eq("id", completionId)

  if (error) {
    console.error("Session feedback update failed:", error)

    redirect(
      `/coach/${clientId}?tab=logs&sessionFeedbackError=${encodeURIComponent(
        error.message
      )}`
    )
  }

  revalidatePath(`/coach/${clientId}`)
  revalidatePath("/coach")
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/workouts")

  redirect(`/coach/${clientId}?tab=logs&sessionFeedbackUpdated=true`)
}


function formatDateTime(dateString?: string | null) {
  if (!dateString) return "No date"

  return new Date(dateString).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getInitials(name?: string | null) {
  if (!name) return "SMC"

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
}

function getDayOrder(day?: string | null) {
  const match = String(day || "").match(/\d+/)
  return match ? Number(match[0]) : 999
}

function groupSessionsByWeek(sessions: any[]) {
  const sortedSessions = [...sessions].sort((a, b) => {
    const weekA = Number(a.week_number || 1)
    const weekB = Number(b.week_number || 1)

    if (weekA !== weekB) return weekA - weekB

    return getDayOrder(a.day) - getDayOrder(b.day)
  })

  return sortedSessions.reduce((acc: Record<number, any[]>, session: any) => {
    const weekNumber = Number(session.week_number || 1)

    if (!acc[weekNumber]) {
      acc[weekNumber] = []
    }

    acc[weekNumber].push(session)

    return acc
  }, {})
}

function isCircuitExercise(exercise: any) {
  return String(exercise?.section || "").toLowerCase() === "circuit"
}

function getDisplayExerciseCount(session: any) {
  const exercises = Array.isArray(session?.exercises) ? session.exercises : []

  return exercises.reduce((total: number, exercise: any) => {
    if (isCircuitExercise(exercise) && exercise?.circuit?.exercises?.length) {
      return total + exercise.circuit.exercises.length
    }

    return total + 1
  }, 0)
}

function renderProgrammeExercise(exercise: any, index: number) {
  if (isCircuitExercise(exercise) && exercise?.circuit) {
    return (
      <div
        key={index}
        className="rounded-[0.8rem] border border-white/[0.045] bg-white/[0.025] px-3 py-2"
      >
        <div className="mb-2 flex flex-wrap gap-2">
          <span className="rounded-full border border-smc-gold/20 bg-smc-gold/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-smc-gold">
            Circuit
          </span>

          <span className="rounded-full border border-white/[0.07] bg-white/[0.035] px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/45">
            {exercise.circuit.rounds || 1} rounds
          </span>

          {exercise.circuit.workSeconds ? (
            <span className="rounded-full border border-white/[0.07] bg-white/[0.035] px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/45">
              {exercise.circuit.workSeconds}s work
            </span>
          ) : null}

          {exercise.circuit.restSeconds ? (
            <span className="rounded-full border border-white/[0.07] bg-white/[0.035] px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/45">
              {exercise.circuit.restSeconds}s rest
            </span>
          ) : null}
        </div>

        <p className="text-sm font-bold text-white">
          {exercise.name || "Circuit"}
        </p>

        {exercise.prescription ? (
          <p className="mt-0.5 text-xs leading-5 text-white/40">
            {exercise.prescription}
          </p>
        ) : null}

        <div className="mt-2 space-y-1.5">
          {exercise.circuit.exercises?.map((item: any, itemIndex: number) => (
            <div
              key={itemIndex}
              className="rounded-[0.7rem] border border-white/[0.045] bg-black/25 px-2.5 py-2"
            >
              <p className="text-xs font-black text-white">
                {item.name || `Circuit exercise ${itemIndex + 1}`}
              </p>

              {item.prescription ? (
                <p className="mt-0.5 text-[11px] text-white/40">
                  {item.prescription}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      key={index}
      className="rounded-[0.8rem] border border-white/[0.045] bg-white/[0.025] px-3 py-2"
    >
      <p className="text-sm font-bold text-white">
        {exercise.name || "Unnamed exercise"}
      </p>

      <p className="mt-0.5 text-xs leading-5 text-white/40">
        {exercise.prescription || "No prescription"}
      </p>
    </div>
  )
}

export default async function ClientProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>
  searchParams: Promise<{
    exercise?: string
    updated?: string
    manualCheckInAdded?: string
    manualCheckInError?: string
    coachSessionAdded?: string
    coachSessionError?: string
    programmeWeekUpdated?: string
    programmeWeekError?: string
    sessionCompletionUpdated?: string
    sessionFeedbackUpdated?: string
    sessionFeedbackError?: string
    tab?: string
  }>
}) {
  const { clientId } = await params
  const {
    exercise: selectedExercise,
    updated,
    manualCheckInAdded,
    manualCheckInError,
    coachSessionAdded,
    coachSessionError,
    programmeWeekUpdated,
    programmeWeekError,
    sessionCompletionUpdated,
    sessionFeedbackUpdated,
    sessionFeedbackError,
    tab,
  } = await searchParams

  const resolvedManualCheckInError = manualCheckInError
    ? decodeURIComponent(manualCheckInError)
    : ""

  const resolvedCoachSessionError = coachSessionError
  ? decodeURIComponent(coachSessionError)
  : ""

  const resolvedProgrammeWeekError = programmeWeekError
    ? decodeURIComponent(programmeWeekError)
    : ""

  const resolvedSessionFeedbackError = sessionFeedbackError
    ? decodeURIComponent(sessionFeedbackError)
    : ""

  const activeTab = tab || "overview"

  const { supabase } = await requireCoach()

  const { data: client } = await supabase
    .from("clients")
    .select("id, user_id, name, email, goal, status, coach_notes")
    .eq("id", clientId)
    .single()

  if (!client) {
    return (
      <main className="min-h-screen bg-black p-6 text-white">
        Client not found.
      </main>
    )
  }

  const { data: programmes } = await supabase
    .from("programmes")
    .select(`
      id,
      title,
      week_number,
      notes,
      start_date,
      end_date,
      coach_current_week,
      created_at,
      is_active,
      programme_sessions (
        id,
        week_number,
        day,
        title,
        exercises
      )
    `)
    .eq("user_id", client.user_id)
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: false })

  const { data: videos } = await supabase
    .from("exercise_videos")
    .select("*")
    .eq("user_id", client.user_id)
    .order("created_at", { ascending: false })

  const { data: workoutLogs, error: workoutLogsError } = await supabase
  .from("workout_logs")
  .select(`
    id,
    user_id,
    programme_id,
    session_id,
    exercise_name,
    sets_completed,
    notes,
    created_at,
    reviewed,
    coach_feedback,
    feedback_read,
    manual_entry,
    submitted_by,
    source
  `)
  .eq("user_id", client.user_id)
  .order("created_at", { ascending: false })

    const { data: sessionCompletions } = await supabase
  .from("session_completions")
  .select(`
    id,
    programme_id,
    session_id,
    created_at,
    session_rating,
    duration_minutes,
    notes,
    coach_feedback,
    feedback_read,
    completed,
    manual_entry,
    submitted_by,
    source
  `)
  .eq("user_id", client.user_id)
  .eq("completed", true)
  .order("created_at", { ascending: false })

  const { data: checkIns } = await supabase
  .from("check_ins")
  .select(`
    id,
    user_id,
    created_at,
    reviewed,
    manual_entry,
    submitted_by,
    bodyweight,
    training_rating,
    recovery_rating,
    nutrition_rating,
    cardio_steps,
    notes,
    coach_feedback,
    feedback_seen
  `)
  .eq("user_id", client.user_id)
  .order("created_at", { ascending: false })

  const videosWithUrls = await Promise.all(
    (videos ?? []).map(async (video) => {
      const { data } = await supabase.storage
        .from("exercise-videos")
        .createSignedUrl(video.video_path, 60 * 60)

      return {
        ...video,
        signedUrl: data?.signedUrl,
      }
    })
  )

  const groupedVideos = Object.entries(
    (videosWithUrls ?? []).reduce((acc: any, video) => {
      if (!acc[video.exercise_name]) {
        acc[video.exercise_name] = []
      }

      acc[video.exercise_name].unshift(video)
      return acc
    }, {})
  )

  const programmeCount = programmes?.length ?? 0
  const sessionCount =
    programmes?.reduce(
      (total: number, programme: any) =>
        total + (programme.programme_sessions?.length ?? 0),
      0
    ) ?? 0

  const workoutLogCount = sessionCompletions?.length ?? 0
  const unreviewedLogCount =
    workoutLogs?.filter((log: any) => !log.reviewed).length ?? 0

  const videoCount = videos?.length ?? 0
  const unreviewedVideoCount =
    videos?.filter((video: any) => !video.reviewed).length ?? 0

  const checkInCount = checkIns?.length ?? 0

  const unreviewedCheckInCount =
    checkIns?.filter((checkIn: any) => !checkIn.reviewed).length ?? 0


  const latestCheckIn = checkIns?.[0] || null

const latestWorkoutLog = workoutLogs?.[0] || null

const latestVideo = videos?.[0] || null

const attentionFlags = [
  ...(unreviewedLogCount > 0 ? ["Unreviewed logs"] : []),
  ...(unreviewedVideoCount > 0 ? ["Unreviewed videos"] : []),
  ...(unreviewedCheckInCount > 0 ? ["Unreviewed check-ins"] : []),
]
 
const latestCompletedSession = sessionCompletions?.[0] || null

const allProgrammeSessions =
  programmes?.flatMap((programme: any) => programme.programme_sessions || []) ||
  []

const groupedSessionLogs =
  sessionCompletions?.map((completion: any) => {
    const logsForSession =
      workoutLogs?.filter(
        (log: any) => log.session_id === completion.session_id
      ) || []

    const sessionInfo = allProgrammeSessions.find(
      (session: any) => session.id === completion.session_id
    )

    const unreviewedCount = logsForSession.filter(
      (log: any) => !log.reviewed
    ).length

    return {
      completion,
      sessionInfo,
      logs: logsForSession,
      unreviewedCount,
      allReviewed:
        logsForSession.length > 0 &&
        unreviewedCount === 0,
    }
  }) || []

const completedSessionIds = new Set(
  (sessionCompletions || []).map(
    (completion: any) => completion.session_id
  )
)

const orphanWorkoutLogs =
  workoutLogs?.filter(
    (log: any) =>
      log.session_id &&
      !completedSessionIds.has(log.session_id)
  ) || []

const latestCompletedSessionInfo = latestCompletedSession
  ? allProgrammeSessions.find(
      (session: any) => session.id === latestCompletedSession.session_id
    )
  : null

const latestBodyweight = latestCheckIn?.bodyweight || null

const previousBodyweightCheckIn =
  checkIns?.find(
    (checkIn: any) =>
      checkIn.id !== latestCheckIn?.id && checkIn.bodyweight
  ) || null

const bodyweightChange =
  latestBodyweight && previousBodyweightCheckIn?.bodyweight
    ? Number(latestBodyweight) - Number(previousBodyweightCheckIn.bodyweight)
    : null

const timelineEvents = [
  ...(sessionCompletions || []).map((session: any) => {
    const sessionInfo = allProgrammeSessions.find(
      (s: any) => s.id === session.session_id
    )

    const isCoachEntry =
      session.manual_entry || session.submitted_by === "coach"

    return {
      type: isCoachEntry ? "coach_session" : "session",
      created_at: session.created_at,
      title: isCoachEntry ? "Coach Added Session" : "Session Completed",
      subtitle: sessionInfo?.title || "Workout Session",
      meta: [
        session.session_rating ? `${session.session_rating}/10` : null,
        session.duration_minutes ? `${session.duration_minutes} mins` : null,
      ].filter(Boolean),
    }
  }),

  ...(checkIns || []).map((checkIn: any) => {
    const isCoachEntry =
      checkIn.manual_entry || checkIn.submitted_by === "coach"

    return {
      type: isCoachEntry ? "coach_checkin" : "checkin",
      created_at: checkIn.created_at,
      title: isCoachEntry ? "Coach Added Check-In" : "Check-In Submitted",
      subtitle: [
        checkIn.recovery_rating ? `Recovery ${checkIn.recovery_rating}/10` : null,
        checkIn.training_rating ? `Training ${checkIn.training_rating}/10` : null,
        checkIn.nutrition_rating ? `Nutrition ${checkIn.nutrition_rating}/10` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      meta: checkIn.bodyweight ? [`${checkIn.bodyweight}kg`] : [],
    }
  }),

  ...(videos || []).map((video: any) => ({
    type: "video",
    created_at: video.created_at,
    title: "Video Uploaded",
    subtitle: video.exercise_name,
    meta: [],
  })),
].sort(
  (a, b) =>
    new Date(b.created_at).getTime() -
    new Date(a.created_at).getTime()
)

const groupedTimeline = timelineEvents.reduce(
  (acc: Record<string, any[]>, event: any) => {
    const day = getTimelineDay(event.created_at)

    if (!acc[day]) {
      acc[day] = []
    }

    acc[day].push(event)

    return acc
  },
  {}
)


  const tabs = [
    { label: "Overview", value: "overview", badge: 0 },
    { label: "Timeline", value: "timeline", badge: 0 },
    { label: "Programme", value: "programme", badge: 0 },
    { label: "Check-ins", value: "check-ins", badge: unreviewedCheckInCount },
    { label: "Logs", value: "logs", badge: groupedSessionLogs.filter(
  (session) => !session.allReviewed
).length },
    { label: "Videos", value: "videos", badge: unreviewedVideoCount },
    { label: "Notes", value: "notes", badge: 0 },
  ]

  function getTimelineIcon(type: string) {
  if (type === "session") return "🏋️"
  if (type === "coach_session") return "✍️"
  if (type === "checkin") return "📋"
  if (type === "coach_checkin") return "📝"
  if (type === "video") return "🎥"

  return "•"
}

function getTimelineLabel(type: string) {
  if (type === "session") return "Session"
  if (type === "coach_session") return "Coach Entry"
  if (type === "checkin") return "Check-In"
  if (type === "coach_checkin") return "Coach Check-In"
  if (type === "video") return "Video"

  return "Activity"
}

function getTimelineDay(dateString: string) {
  const date = new Date(dateString)

  const today = new Date()
  const yesterday = new Date()

  yesterday.setDate(yesterday.getDate() - 1)

  const dateKey = date.toDateString()

  if (dateKey === today.toDateString()) return "Today"
  if (dateKey === yesterday.toDateString()) return "Yesterday"

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  })
}

  return (
    <main className="min-h-screen bg-black px-4 py-5 text-white sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <Link
          href="/coach/clients"
          className="inline-flex items-center rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-xs font-bold text-white/55 transition hover:border-smc-gold/35 hover:text-white"
        >
          ← Back to clients
        </Link>

        {updated === "true" && (
          <div className="rounded-[1rem] border border-green-500/25 bg-green-500/10 px-3 py-2 text-sm text-green-300">
            Client details updated.
          </div>
        )}

        {manualCheckInAdded === "true" && (
          <div className="rounded-[1rem] border border-green-500/25 bg-green-500/10 px-3 py-2 text-sm text-green-300">
            Manual check-in added.
          </div>
        )}

        {resolvedManualCheckInError && (
          <div className="rounded-[1rem] border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            Manual check-in failed: {resolvedManualCheckInError}
          </div>
        )}

        {coachSessionAdded === "true" && (
  <div className="rounded-[1rem] border border-green-500/25 bg-green-500/10 px-3 py-2 text-sm text-green-300">
    Coach session added.
  </div>
)}

{resolvedCoachSessionError && (
  <div className="rounded-[1rem] border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">
    Coach session failed: {resolvedCoachSessionError}
  </div>
)}

{programmeWeekUpdated === "true" && (
  <div className="rounded-[1rem] border border-green-500/25 bg-green-500/10 px-3 py-2 text-sm text-green-300">
    Programme current week updated.
  </div>
)}

{resolvedProgrammeWeekError && (
  <div className="rounded-[1rem] border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">
    Programme week update failed: {resolvedProgrammeWeekError}
  </div>
)}

{sessionCompletionUpdated === "true" && (
  <div className="rounded-[1rem] border border-green-500/25 bg-green-500/10 px-3 py-2 text-sm text-green-300">
    Session completion updated.
  </div>
)}

{sessionFeedbackUpdated === "true" && (
  <div className="rounded-[1rem] border border-green-500/25 bg-green-500/10 px-3 py-2 text-sm text-green-300">
    Session feedback saved.
  </div>
)}

{resolvedSessionFeedbackError && (
  <div className="rounded-[1rem] border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">
    Session feedback failed: {resolvedSessionFeedbackError}
  </div>
)}

        <section className={`${shellCard} p-4 sm:p-5`}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-smc-gold/45 to-transparent" />

          <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-smc-gold/25 bg-smc-gold/10 text-lg font-black text-smc-gold">
                {getInitials(client.name)}
              </div>

              <div>
                <p className={labelStyle}>Client Profile</p>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
                  {client.name}
                </h1>
                <p className="mt-0.5 text-sm text-white/45">{client.email}</p>

                <div className="mt-3 flex flex-wrap gap-2">

  <Link
    href={`/coach/${client.id}/session-entry`}
    className="inline-flex min-h-[40px] items-center rounded-[1rem] bg-smc-gold px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-black transition hover:brightness-110"
  >
    + Add Coach Session
  </Link>

  <Link
    href={`/coach/messages/${client.id}`}
    className="inline-flex min-h-[40px] items-center rounded-[1rem] border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white transition hover:border-smc-gold/35 hover:text-smc-gold"
  >
    Message Client
  </Link>

</div>

                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full border border-smc-gold/20 bg-smc-gold/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-smc-gold">
                    {client.goal || "Uncategorised"}
                  </span>

                  <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/55">
                    {client.status || "Active"}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[520px]">
              <div className={`${innerPanel} p-3`}>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">
                  Programmes
                </p>
                <p className="mt-1 text-xl font-black text-white">
                  {programmeCount}
                </p>
              </div>

              <div className={`${innerPanel} p-3`}>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">
                  Sessions
                </p>
                <p className="mt-1 text-xl font-black text-white">
                  {sessionCount}
                </p>
              </div>

              <div className={`${innerPanel} p-3`}>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">
                  Logs
                </p>
                <p className="mt-1 text-xl font-black text-white">
                  {unreviewedLogCount}
                  <span className="text-sm text-white/35">
                    /{workoutLogCount}
                  </span>
                </p>
              </div>

              <div className={`${innerPanel} p-3`}>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">
                  Videos
                </p>
                <p className="mt-1 text-xl font-black text-white">
                  {unreviewedVideoCount}
                  <span className="text-sm text-white/35">/{videoCount}</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className={`${shellCard} p-2`}>
          <div className="relative z-10 flex gap-2 overflow-x-auto">
            {tabs.map((item) => {
              const isActive = activeTab === item.value

              return (
                <Link
                  key={item.value}
                  href={`/coach/${client.id}?tab=${item.value}`}
                  className={`flex min-h-[42px] shrink-0 items-center gap-2 rounded-[1rem] px-3 py-2 text-xs font-black uppercase tracking-[0.12em] transition ${
                    isActive
                      ? "bg-smc-gold text-black"
                      : "border border-white/[0.07] bg-white/[0.035] text-white/55 hover:border-smc-gold/35 hover:text-white"
                  }`}
                >
                  {item.label}

                  {item.badge > 0 && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                        isActive
                          ? "bg-black/20 text-black"
                          : "bg-red-500/15 text-red-300"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </section>

        {activeTab === "overview" && (
          <section className={`${shellCard} p-4 sm:p-5`}>
            <div className="relative z-10">
              <div className="mb-4">
                <p className={labelStyle}>Overview</p>
                <h2 className="mt-1 text-xl font-black text-white">
                  Client Snapshot
                </h2>
                <p className="mt-1 text-sm leading-6 text-white/45">
                  Quick coaching summary. Use the tabs above to jump into the
                  full programme, check-ins, logs or videos.
                </p>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
  <div className={`${innerPanel} p-4`}>
    <p className={labelStyle}>Latest Check-In</p>

    {latestCheckIn ? (
      <>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div>
            <p className="text-[10px] uppercase text-white/30">Recovery</p>
            <p className="text-xl font-black text-white">
              {latestCheckIn.recovery_rating ?? "-"}
            </p>
          </div>

          <div>
            <p className="text-[10px] uppercase text-white/30">Training</p>
            <p className="text-xl font-black text-white">
              {latestCheckIn.training_rating ?? "-"}
            </p>
          </div>

          <div>
            <p className="text-[10px] uppercase text-white/30">Nutrition</p>
            <p className="text-xl font-black text-white">
              {latestCheckIn.nutrition_rating ?? "-"}
            </p>
          </div>
        </div>

        <div className="mt-3 rounded-[1rem] border border-white/[0.05] bg-black/30 p-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase text-white/30">
                Bodyweight
              </p>
              <p className="text-lg font-black text-white">
                {latestBodyweight ?? "-"}
              </p>
            </div>

            {bodyweightChange !== null && (
              <p
                className={`text-sm font-black ${
                  bodyweightChange <= 0 ? "text-green-300" : "text-smc-gold"
                }`}
              >
                {bodyweightChange > 0 ? "+" : ""}
                {bodyweightChange.toFixed(1)}kg
              </p>
            )}
          </div>

          <p className="mt-2 text-xs text-white/35">
            {formatDateTime(latestCheckIn.created_at)}
            {latestCheckIn.manual_entry ? " · Coach added" : " · Client submitted"}
          </p>
        </div>

        {latestCheckIn.notes && (
          <p className="mt-3 text-sm leading-5 text-white/55">
            {latestCheckIn.notes}
          </p>
        )}
      </>
    ) : (
      <p className="mt-2 text-sm text-white/45">
        No check-ins submitted yet.
      </p>
    )}
  </div>

  <div className={`${innerPanel} p-4`}>
  <p className={labelStyle}>Latest Completed Session</p>

  {latestCompletedSession ? (
    <>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-black text-white">
            {latestCompletedSessionInfo?.title || "Completed Session"}
          </h3>

          <p className="mt-1 text-sm text-white/45">
            {latestCompletedSessionInfo?.day
              ? `${latestCompletedSessionInfo.day} · `
              : ""}
            {formatDateTime(latestCompletedSession.created_at)}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${
            latestCompletedSession.manual_entry
              ? "border-smc-gold/25 bg-smc-gold/10 text-smc-gold"
              : "border-white/[0.08] bg-white/[0.04] text-white/45"
          }`}
        >
          {latestCompletedSession.manual_entry ? "Coach Entered" : "Client"}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-[1rem] border border-smc-gold/15 bg-smc-gold/[0.06] p-3">
          <p className="text-[10px] uppercase text-smc-gold/70">
            Session Rating
          </p>

          <p className="mt-1 text-2xl font-black text-white">
            {latestCompletedSession.session_rating ?? "-"} / 10
          </p>
        </div>

        <div className="rounded-[1rem] border border-white/[0.06] bg-black/30 p-3">
          <p className="text-[10px] uppercase text-white/30">
            Duration
          </p>

          <p className="mt-1 text-2xl font-black text-white">
            {latestCompletedSession.duration_minutes
              ? `${latestCompletedSession.duration_minutes}m`
              : "-"}
          </p>
        </div>
      </div>

      <p className="mt-3 text-xs text-white/35">
        Source:{" "}
        {latestCompletedSession.submitted_by === "coach"
          ? "Coach entered session"
          : "Client submitted session"}
      </p>

      {latestCompletedSession.notes && (
        <p className="mt-3 rounded-[1rem] border border-white/[0.05] bg-black/30 p-3 text-sm leading-5 text-white/55">
          {latestCompletedSession.notes}
        </p>
      )}
    </>
  ) : (
    <p className="mt-2 text-sm text-white/45">
      No completed sessions yet.
    </p>
  )}
</div>

  <div className={`${innerPanel} p-4`}>
    <p className={labelStyle}>Coach Attention</p>

    {attentionFlags.length > 0 ? (
      <>
        <div className="mt-3 flex flex-wrap gap-2">
          {attentionFlags.map((flag) => (
            <span
              key={flag}
              className="rounded-full border border-smc-gold/20 bg-smc-gold/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-smc-gold"
            >
              {flag}
            </span>
          ))}
        </div>

        <div className="mt-4 space-y-2 text-sm">
          {unreviewedLogCount > 0 && (
            <Link
              href={`/coach/${client.id}?tab=logs`}
              className="flex justify-between rounded-[0.9rem] border border-white/[0.05] bg-black/25 px-3 py-2 text-white/65 hover:text-white"
            >
              <span>Logs awaiting review</span>
              <span className="font-black text-smc-gold">{unreviewedLogCount}</span>
            </Link>
          )}

          {unreviewedVideoCount > 0 && (
            <Link
              href={`/coach/${client.id}?tab=videos`}
              className="flex justify-between rounded-[0.9rem] border border-white/[0.05] bg-black/25 px-3 py-2 text-white/65 hover:text-white"
            >
              <span>Videos awaiting review</span>
              <span className="font-black text-smc-gold">{unreviewedVideoCount}</span>
            </Link>
          )}
        </div>
      </>
    ) : (
      <p className="mt-2 text-sm text-green-300">
        Clear — no attention items.
      </p>
    )}
  </div>

  <div className={`${innerPanel} p-4`}>
    <p className={labelStyle}>Snapshot</p>

    <div className="mt-3 space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-white/45">Latest workout log</span>
        <span className="font-black text-white">
          {latestWorkoutLog ? formatDateTime(latestWorkoutLog.created_at) : "-"}
        </span>
      </div>

      <div className="flex justify-between">
        <span className="text-white/45">Latest video</span>
        <span className="font-black text-white">
          {latestVideo ? formatDateTime(latestVideo.created_at) : "-"}
        </span>
      </div>

      <div className="flex justify-between">
        <span className="text-white/45">Workout logs</span>
        <span className="font-black">{workoutLogCount}</span>
      </div>

      <div className="flex justify-between">
        <span className="text-white/45">Videos</span>
        <span className="font-black">{videoCount}</span>
      </div>

      <div className="flex justify-between">
        <span className="text-white/45">Check-ins</span>
        <span className="font-black">{checkInCount}</span>
      </div>
    </div>
  </div>
</div>
</div>
          </section>
        )}

        {activeTab === "notes" && (
          <section className={`${shellCard} p-4 sm:p-5`}>
            <div className="relative z-10">
              <div className="mb-4">
                <p className={labelStyle}>Client Management</p>
                <h2 className="mt-1 text-xl font-black text-white">
                  Goal, Status & Coach Notes
                </h2>
              </div>

              <form action={updateClientProfile} className="space-y-3">
                <input type="hidden" name="clientId" value={client.id} />

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                      Goal
                    </label>
                    <select
                      name="goal"
                      defaultValue={client.goal || "Uncategorised"}
                      className="min-h-[44px] w-full rounded-[1rem] border border-white/[0.07] bg-[#05070c] px-3 text-sm text-white outline-none focus:border-smc-gold/45"
                    >
                      <option>Powerlifting</option>
                      <option>Fat loss</option>
                      <option>Muscle build</option>
                      <option>General strength</option>
                      <option>Rehab / return to training</option>
                      <option>Other</option>
                      <option>Uncategorised</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                      Status
                    </label>
                    <select
                      name="status"
                      defaultValue={client.status || "Active"}
                      className="min-h-[44px] w-full rounded-[1rem] border border-white/[0.07] bg-[#05070c] px-3 text-sm text-white outline-none focus:border-smc-gold/45"
                    >
                      <option>Active</option>
                      <option>Onboarding</option>
                      <option>Paused</option>
                      <option>Inactive</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                    Private coach notes
                  </label>
                  <textarea
                    name="coach_notes"
                    defaultValue={client.coach_notes || ""}
                    rows={4}
                    placeholder="Anything useful for coaching this client..."
                    className="w-full resize-none rounded-[1rem] border border-white/[0.07] bg-[#05070c] px-3 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-smc-gold/45"
                  />
                </div>

                <button
                  type="submit"
                  className="min-h-[42px] rounded-[1rem] bg-smc-gold px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-black transition hover:brightness-110"
                >
                  Save Client Details
                </button>
              </form>
            </div>
          </section>
        )}

        {activeTab === "check-ins" && (
          <section className={`${shellCard} p-4 sm:p-5`}>
            <div className="relative z-10">
              <div className="mb-4">
                <p className={labelStyle}>Manual Check-In</p>
                <h2 className="mt-1 text-xl font-black text-white">
                  Add Coach Check-In
                </h2>
                <p className="mt-1 text-sm leading-6 text-white/45">
                  Use this after an in-person review, WhatsApp update, or verbal
                  check-in.
                </p>
              </div>

              <form action={addManualCheckIn} className="space-y-3">
                <input type="hidden" name="clientId" value={client.id} />

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                      Bodyweight
                    </label>
                    <input
                      name="bodyweight"
                      type="number"
                      step="0.1"
                      placeholder="e.g. 89.5"
                      className="min-h-[44px] w-full rounded-[1rem] border border-white/[0.07] bg-[#05070c] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-smc-gold/45"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                      Steps / Cardio
                    </label>
                    <input
                      name="cardio_steps"
                      type="text"
                      placeholder="e.g. 8k steps daily"
                      className="min-h-[44px] w-full rounded-[1rem] border border-white/[0.07] bg-[#05070c] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-smc-gold/45"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                      Training /10
                    </label>
                    <input
                      name="training_rating"
                      type="number"
                      min="1"
                      max="10"
                      placeholder="/10"
                      className="min-h-[44px] w-full rounded-[1rem] border border-white/[0.07] bg-[#05070c] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-smc-gold/45"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                      Recovery /10
                    </label>
                    <input
                      name="recovery_rating"
                      type="number"
                      min="1"
                      max="10"
                      placeholder="/10"
                      className="min-h-[44px] w-full rounded-[1rem] border border-white/[0.07] bg-[#05070c] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-smc-gold/45"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                      Nutrition /10
                    </label>
                    <input
                      name="nutrition_rating"
                      type="number"
                      min="1"
                      max="10"
                      placeholder="/10"
                      className="min-h-[44px] w-full rounded-[1rem] border border-white/[0.07] bg-[#05070c] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-smc-gold/45"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                    Coach notes
                  </label>
                  <textarea
                    name="notes"
                    rows={4}
                    placeholder="Notes from review, WhatsApp update, verbal check-in, issues, wins, changes needed..."
                    className="w-full resize-none rounded-[1rem] border border-white/[0.07] bg-[#05070c] px-3 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-smc-gold/45"
                  />
                </div>

                <button
                  type="submit"
                  className="min-h-[42px] rounded-[1rem] bg-smc-gold px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-black transition hover:brightness-110"
                >
                  Add Manual Check-In
                </button>
              </form>
              <div className="mt-6 border-t border-white/[0.06] pt-5">
  <div className="mb-4">
    <p className={labelStyle}>Submitted Check-Ins</p>

    <h3 className="mt-1 text-lg font-black text-white">
      Check-In History
    </h3>
  </div>

  {checkIns && checkIns.length > 0 ? (
    <div className="space-y-3">
      {checkIns.map((checkIn: any) => (
        <div
          key={checkIn.id}
          className={`${innerPanel} p-4`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h4 className="font-black text-white">
                {formatDateTime(checkIn.created_at)}
              </h4>

              <p className="mt-1 text-xs text-white/35">
                {checkIn.manual_entry
                  ? "Coach added"
                  : "Client submitted"}
              </p>
            </div>

            <span
              className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${
                checkIn.reviewed
                  ? "border-green-500/25 bg-green-500/10 text-green-300"
                  : "border-red-500/25 bg-red-500/10 text-red-300"
              }`}
            >
              {checkIn.reviewed ? "Reviewed" : "Needs Review"}
            </span>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            <div className="rounded-[0.9rem] border border-white/[0.05] bg-black/30 p-3">
              <p className="text-[10px] uppercase text-white/30">
                Bodyweight
              </p>
              <p className="mt-1 text-lg font-black text-white">
                {checkIn.bodyweight ?? "-"}
              </p>
            </div>

            <div className="rounded-[0.9rem] border border-white/[0.05] bg-black/30 p-3">
              <p className="text-[10px] uppercase text-white/30">
                Recovery
              </p>
              <p className="mt-1 text-lg font-black text-white">
                {checkIn.recovery_rating ?? "-"} / 10
              </p>
            </div>

            <div className="rounded-[0.9rem] border border-white/[0.05] bg-black/30 p-3">
              <p className="text-[10px] uppercase text-white/30">
                Training
              </p>
              <p className="mt-1 text-lg font-black text-white">
                {checkIn.training_rating ?? "-"} / 10
              </p>
            </div>

            <div className="rounded-[0.9rem] border border-white/[0.05] bg-black/30 p-3">
              <p className="text-[10px] uppercase text-white/30">
                Nutrition
              </p>
              <p className="mt-1 text-lg font-black text-white">
                {checkIn.nutrition_rating ?? "-"} / 10
              </p>
            </div>
          </div>

          {checkIn.cardio_steps && (
            <div className="mt-3 rounded-[1rem] border border-white/[0.05] bg-black/30 p-3">
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-smc-gold/70">
                Steps / Cardio
              </p>
              <p className="text-sm text-white/55">
                {checkIn.cardio_steps}
              </p>
            </div>
          )}

          {checkIn.notes && (
            <div className="mt-3 rounded-[1rem] border border-white/[0.05] bg-black/30 p-3">
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-smc-gold/70">
                Check-In Notes
              </p>
              <p className="whitespace-pre-wrap text-sm text-white/55">
                {checkIn.notes}
              </p>
            </div>
          )}

          {checkIn.coach_feedback && (
            <div className="mt-3 rounded-[1rem] border border-smc-gold/15 bg-smc-gold/[0.06] p-3">
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-smc-gold">
                Coach Feedback
              </p>
              <p className="whitespace-pre-wrap text-sm text-white/70">
                {checkIn.coach_feedback}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  ) : (
    <div className={`${innerPanel} p-4 text-sm text-white/45`}>
      No check-ins submitted yet.
    </div>
  )}
</div>
            </div>
          </section>
        )}

        {activeTab === "timeline" && (
          <section className={`${shellCard} p-4 sm:p-5`}>
            <div className="relative z-10">
              <div className="mb-4">
                <p className={labelStyle}>Client Activity</p>

                <h2 className="mt-1 text-xl font-black text-white">
                  Timeline
                </h2>

                <p className="mt-1 text-sm text-white/45">
                  Recent client activity and coach actions.
                </p>
              </div>

              {timelineEvents.length === 0 ? (
                <div className={`${innerPanel} p-4 text-sm text-white/45`}>
                  No timeline events yet.
                </div>
              ) : (
                <div className="space-y-5">
                  {Object.entries(groupedTimeline).map(([day, events]) => (
                    <div key={day} className="space-y-3">
                      <div className="sticky top-0 z-10">
                        <span className="rounded-full border border-smc-gold/20 bg-black/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-smc-gold backdrop-blur-xl">
                          {day}
                        </span>
                      </div>

                      {(events as any[]).map((event: any, index: number) => (
                        <div
                          key={`${event.type}-${event.created_at}-${index}`}
                          className={`${innerPanel} p-4`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-smc-gold/20 bg-smc-gold/10 text-lg">
                              {getTimelineIcon(event.type)}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <h3 className="font-black text-white">
                                    {event.title}
                                  </h3>

                                  {event.subtitle && (
                                    <p className="mt-1 text-sm text-white/45">
                                      {event.subtitle}
                                    </p>
                                  )}
                                </div>

                                <span className="shrink-0 whitespace-nowrap text-xs text-white/35">
                                  {formatDateTime(event.created_at)}
                                </span>
                              </div>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <span className="rounded-full border border-smc-gold/20 bg-smc-gold/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-smc-gold">
                                  {getTimelineLabel(event.type)}
                                </span>

                                {event.meta?.map((item: string) => (
                                  <span
                                    key={item}
                                    className="rounded-full border border-white/[0.07] bg-white/[0.035] px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/50"
                                  >
                                    {item}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === "programme" && (
          <section className={`${shellCard} p-4 sm:p-5`}>
            <div className="relative z-10">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <p className={labelStyle}>Programming</p>
                  <h2 className="mt-1 text-xl font-black text-white">
                    Current Programmes
                  </h2>
                </div>

                <Link
                  href="/coach/programmes/new"
                  className="rounded-full bg-smc-gold px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-black"
                >
                  New
                </Link>
              </div>

              {programmeCount === 0 ? (
                <div className={`${innerPanel} p-4 text-sm text-white/45`}>
                  No programmes uploaded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {programmes?.map((programme: any, programmeIndex: number) => {
                    const sessions = programme.programme_sessions ?? []
                    const sessionsByWeek = groupSessionsByWeek(sessions)
                    const weekEntries = Object.entries(sessionsByWeek).sort(
                      ([weekA], [weekB]) => Number(weekA) - Number(weekB)
                    )

                    const weekCount = weekEntries.length || 1

                    const exerciseCount = sessions.reduce(
                      (total: number, session: any) =>
                        total + getDisplayExerciseCount(session),
                      0
                    )

                    return (
                      <details
                        key={programme.id}
                        open={programmeIndex === 0}
                        className={`${innerPanel} group overflow-hidden`}
                      >
                        <summary className="cursor-pointer list-none p-3.5 transition hover:bg-white/[0.025]">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-smc-gold/75">
                                  {weekCount} week{weekCount === 1 ? "" : "s"}
                                </p>

                                <span
                                  className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] ${
                                    programme.is_active
                                      ? "border-smc-gold/25 bg-smc-gold/10 text-smc-gold"
                                      : "border-white/[0.07] bg-white/[0.03] text-white/35"
                                  }`}
                                >
                                  {programme.is_active ? "Active" : "Inactive"}
                                </span>
                              </div>

                              <h3 className="mt-1 truncate text-base font-black text-white">
                                {programme.title}
                              </h3>

                              <p className="mt-1 text-xs text-white/40">
                                {sessions.length} sessions · {exerciseCount}{" "}
                                exercises
                              </p>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                              <Link
                                href={`/coach/programmes/${programme.id}/edit`}
                                className="rounded-full border border-smc-gold/25 bg-smc-gold/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-smc-gold transition hover:bg-smc-gold hover:text-black"
                              >
                                Edit
                              </Link>

                              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.07] bg-black/35 text-lg text-white/45 group-open:hidden">
                                +
                              </span>

                              <span className="hidden h-8 w-8 items-center justify-center rounded-full border border-white/[0.07] bg-black/35 text-lg text-white/45 group-open:flex">
                                −
                              </span>
                            </div>
                          </div>
                        </summary>

                        <div className="space-y-3 border-t border-white/[0.06] p-3.5">
                          {programme.notes && (
                            <p className="rounded-[0.9rem] border border-white/[0.05] bg-white/[0.025] p-3 text-xs leading-5 text-white/50">
                              {programme.notes}
                            </p>
                          )}

                          <div className="rounded-[1rem] border border-smc-gold/15 bg-smc-gold/[0.055] p-3">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                              <div>
                                <p className={labelStyle}>Coach Override</p>
                                <h4 className="mt-1 text-sm font-black text-white">
                                  Current Programme Week
                                </h4>
                                <p className="mt-1 text-xs leading-5 text-white/45">
                                  Use this to repeat a week, move a client forward, or override date-based progression.
                                </p>
                              </div>

                              <form
                                action={updateProgrammeWeekOverride}
                                className="flex shrink-0 items-center gap-2"
                              >
                                <input type="hidden" name="clientId" value={client.id} />
                                <input type="hidden" name="programmeId" value={programme.id} />

                                <select
                                  name="week"
                                  defaultValue={programme.coach_current_week || programme.week_number || 1}
                                  className="min-h-[40px] rounded-[0.9rem] border border-white/[0.07] bg-[#05070c] px-3 text-sm text-white outline-none focus:border-smc-gold/45"
                                >
                                  {Array.from({ length: weekCount }, (_, index) => index + 1).map((week) => (
                                    <option key={week} value={week}>
                                      Week {week}
                                    </option>
                                  ))}
                                </select>

                                <button
                                  type="submit"
                                  className="min-h-[40px] rounded-[0.9rem] bg-smc-gold px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-black transition hover:brightness-110"
                                >
                                  Save
                                </button>
                              </form>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {weekEntries.map(
                              ([weekNumber, weekSessions]: any) => (
                                <div
                                  key={weekNumber}
                                  className="rounded-[1rem] border border-white/[0.055] bg-black/25 p-3"
                                >
                                  <div className="mb-3 flex items-center justify-between gap-3">
                                    <div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-smc-gold/75">
                                          Week {weekNumber}
                                        </p>

                                        {Number(weekNumber) === Number(programme.coach_current_week || programme.week_number || 1) && (
                                          <span className="rounded-full bg-smc-gold px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-black">
                                            Current
                                          </span>
                                        )}
                                      </div>
                                      <p className="mt-0.5 text-xs text-white/35">
                                        {weekSessions.length} session
                                        {weekSessions.length === 1 ? "" : "s"}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="grid gap-2.5 md:grid-cols-2">
                                    {weekSessions.map((session: any) => {
                                      const completion = sessionCompletions?.find(
                                        (item: any) => item.session_id === session.id
                                      )
                                      const completed = Boolean(completion?.completed)

                                      return (
                                      <details
                                        key={session.id}
                                        className="overflow-hidden rounded-[1rem] border border-white/[0.055] bg-black/35"
                                      >
                                        <summary className="cursor-pointer list-none p-3 transition hover:bg-white/[0.025]">
                                          <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-smc-gold/70">
                                                {session.day}
                                              </p>

                                              <h4 className="mt-0.5 truncate text-sm font-black text-white">
                                                {session.title ||
                                                  "Untitled session"}
                                              </h4>
                                            </div>

                                            <div className="flex shrink-0 flex-col items-end gap-2">
                                              <span className="rounded-full border border-white/[0.06] bg-white/[0.025] px-2.5 py-1 text-[10px] font-bold text-white/40">
                                                {getDisplayExerciseCount(session)}{" "}
                                                exercises
                                              </span>

                                              <form action={toggleSessionCompletionOverride}>
                                                <input type="hidden" name="clientId" value={client.id} />
                                                <input type="hidden" name="clientUserId" value={client.user_id} />
                                                <input type="hidden" name="programmeId" value={programme.id} />
                                                <input type="hidden" name="sessionId" value={session.id} />

                                                <button
                                                  type="submit"
                                                  className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] transition ${
                                                    completed
                                                      ? "border-green-500/25 bg-green-500/10 text-green-300"
                                                      : "border-white/[0.07] bg-white/[0.035] text-white/45 hover:border-smc-gold/25 hover:text-smc-gold"
                                                  }`}
                                                >
                                                  {completed ? "✓ Complete" : "Mark Complete"}
                                                </button>
                                              </form>
                                            </div>
                                          </div>
                                        </summary>

                                        <div className="space-y-1.5 border-t border-white/[0.05] p-3">
                                          {session.exercises?.map(
                                            (exercise: any, index: number) =>
                                              renderProgrammeExercise(exercise, index)
                                          )}
                                        </div>
                                      </details>
                                      )
                                    })}
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </details>
                    )
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === "logs" && (
  <section className={`${shellCard} p-4 sm:p-5`}>
    <div className="relative z-10">

      <div className="mb-5">
        <p className={labelStyle}>Training Review</p>

        <h2 className="mt-1 text-xl font-black text-white">
          Training Sessions
        </h2>

        <p className="mt-1 text-sm text-white/45">
          Completed sessions grouped by workout.
          Open a session to review individual exercises.
        </p>
      </div>

      {groupedSessionLogs.length === 0 ? (
        <div className={`${innerPanel} p-4 text-sm text-white/45`}>
          No completed sessions yet.
        </div>
      ) : (
        <div className="space-y-3">

          {groupedSessionLogs.map((group: any) => {
            const {
              completion,
              sessionInfo,
              logs,
              unreviewedCount,
              allReviewed,
            } = group

            return (
              <details
                key={completion.id}
                className={`${innerPanel} overflow-hidden`}
              >
                <summary className="cursor-pointer list-none p-4">

                  <div className="flex items-start justify-between gap-3">

                    <div>
                      <h3 className="text-base font-black text-white">
                        {sessionInfo?.title || "Completed Session"}
                      </h3>

                      <p className="mt-1 text-xs text-white/40">
                        {sessionInfo?.day
                          ? `${sessionInfo.day} · `
                          : ""}
                        {formatDateTime(completion.created_at)}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2">

                        <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[9px] font-black uppercase text-white/60">
                          {logs.length} exercises logged
                        </span>

                        {completion.session_rating && (
                          <span className="rounded-full border border-smc-gold/20 bg-smc-gold/10 px-2 py-1 text-[9px] font-black uppercase text-smc-gold">
                            {completion.session_rating}/10
                          </span>
                        )}

                        {completion.duration_minutes && (
                          <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[9px] font-black uppercase text-white/60">
                            {completion.duration_minutes} mins
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">

                      <span
                        className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em]
                        ${
                          completion.manual_entry ||
                          completion.submitted_by === "coach"
                            ? "border border-smc-gold/25 bg-smc-gold/10 text-smc-gold"
                            : "border border-white/[0.08] bg-white/[0.04] text-white/55"
                        }`}
                      >
                        {completion.manual_entry ||
                        completion.submitted_by === "coach"
                          ? "Coach Entered"
                          : "Client Submitted"}
                      </span>

                      <span
                        className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em]
                        ${
                          allReviewed
                            ? "border border-green-500/25 bg-green-500/10 text-green-300"
                            : "border border-red-500/25 bg-red-500/10 text-red-300"
                        }`}
                      >
                        {allReviewed
                          ? "Reviewed"
                          : `Needs Review (${unreviewedCount})`}
                      </span>
                    </div>
                  </div>

                </summary>

                <div className="border-t border-white/[0.06] p-4 space-y-3">

                  {completion.notes && (
                    <div className="rounded-[1rem] border border-white/[0.05] bg-black/30 p-3">
                      <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-smc-gold/70">
                        Session Notes
                      </p>

                      <p className="text-sm text-white/55">
                        {completion.notes}
                      </p>
                    </div>
                  )}

                  <form
                    action={updateSessionCompletionFeedback}
                    className="rounded-[1rem] border border-smc-gold/15 bg-smc-gold/[0.055] p-3"
                  >
                    <input type="hidden" name="clientId" value={client.id} />
                    <input type="hidden" name="completionId" value={completion.id} />

                    <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-smc-gold">
                      Overall Session Feedback
                    </p>

                    <textarea
                      name="coachFeedback"
                      defaultValue={completion.coach_feedback || ""}
                      rows={4}
                      placeholder="Overall feedback for the full session..."
                      className="w-full resize-none rounded-[0.95rem] border border-white/[0.07] bg-[#05070c] px-3 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-smc-gold/45"
                    />

                    <div className="mt-3 flex justify-end">
                      <button
                        type="submit"
                        className="rounded-full bg-smc-gold px-4 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-black transition hover:brightness-110"
                      >
                        Save Session Feedback
                      </button>
                    </div>
                  </form>

                  {logs.map((log: any) => (
                    <div
                      key={log.id}
                      className="rounded-[1rem] border border-white/[0.05] bg-black/30 p-3"
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">

                        <div>
                          <h4 className="font-black text-white">
                            {log.exercise_name}
                          </h4>

                          <p className="text-xs text-white/35">
                            {formatDateTime(log.created_at)}
                          </p>
                        </div>

                        <WorkoutLogReviewButton
                          logId={log.id}
                          initialReviewed={log.reviewed}
                        />
                      </div>

                      <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                        {log.sets_completed?.map(
                          (set: any, index: number) => (
                            <div
                              key={index}
                              className="grid grid-cols-3 gap-2 rounded-[0.85rem] border border-white/[0.045] bg-black/35 p-2.5 text-xs"
                            >
                              <div>
                                <p className="text-[9px] uppercase text-white/30">
                                  Weight
                                </p>
                                <p>{set.weight || "-"}kg</p>
                              </div>

                              <div>
                                <p className="text-[9px] uppercase text-white/30">
                                  Reps
                                </p>
                                <p>{set.reps || "-"}</p>
                              </div>

                              <div>
                                <p className="text-[9px] uppercase text-white/30">
                                  RPE
                                </p>
                                <p>{set.rpe || "-"}</p>
                              </div>
                            </div>
                          )
                        )}
                      </div>

                      {log.notes && (
                        <div className="mt-3 rounded-[0.95rem] border border-white/[0.05] bg-black/35 p-3">
                          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-smc-gold/70">
                            Client Notes
                          </p>

                          <p className="text-sm text-white/55">
                            {log.notes}
                          </p>
                        </div>
                      )}

                      <WorkoutLogFeedbackBox
                        logId={log.id}
                        initialFeedback={log.coach_feedback}
                        initialReviewed={log.reviewed}
                      />
                    </div>
                  ))}
                </div>
              </details>
            )
          })}
        </div>
      )}
    </div>
  </section>
)}

        {activeTab === "videos" && (
          <section className={`${shellCard} p-4 sm:p-5`}>
            <div className="relative z-10">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <p className={labelStyle}>Video Review</p>
                  <h2 className="mt-1 text-xl font-black text-white">
                    Uploaded Videos & Feedback
                  </h2>
                </div>

                <span className="rounded-full border border-smc-gold/20 bg-smc-gold/10 px-2.5 py-1 text-[10px] font-black uppercase text-smc-gold">
                  {groupedVideos.length} exercises
                </span>
              </div>

              {groupedVideos.length === 0 ? (
                <div className={`${innerPanel} p-4 text-sm text-white/45`}>
                  No videos uploaded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {groupedVideos.map(([exerciseName, videos]: any) => (
                    <VideoGroup
                      key={exerciseName}
                      exerciseName={exerciseName}
                      videos={videos}
                      defaultOpen={exerciseName === selectedExercise}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
