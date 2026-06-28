import Link from "next/link"
import { requireCoach } from "@/lib/authGuards"
import ReviewSession from "@/components/ReviewSession"
import { buildCoachAttentionItems } from "@/lib/coachIntelligence"

type SetEntry = {
  weight: string
  reps: string
  rpe: string
}

export default async function CoachReviewPage() {
  const { supabase } = await requireCoach()

  const { data: clients } = await supabase
    .from("clients")
    .select("id, user_id, name, email")

  const clientMap: Record<string, { id: string; name: string }> = {}

  clients?.forEach((client) => {
    clientMap[client.user_id] = {
      id: client.id,
      name: client.name,
    }
  })

  const { data: videos } = await supabase
    .from("exercise_videos")
    .select(
      "id, user_id, programme_id, session_id, exercise_name, video_path, feedback, reviewed, created_at"
    )
    .eq("reviewed", false)
    .order("created_at", { ascending: false })
    .limit(100)

  const { data: workoutLogs } = await supabase
    .from("workout_logs")
    .select(
      "id, user_id, programme_id, session_id, exercise_name, sets_completed, notes, coach_feedback, reviewed, created_at"
    )
    .eq("reviewed", false)
    .order("created_at", { ascending: false })
    .limit(100)

  const { data: sessionCompletions } = await supabase
    .from("session_completions")
    .select(
      "id, user_id, programme_id, session_id, completed, session_rating, notes, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(100)

  const sessionIds = Array.from(
    new Set([
      ...(videos || []).map((video) => video.session_id),
      ...(workoutLogs || []).map((log) => log.session_id),
    ])
  ).filter(Boolean)

  const { data: programmeSessions } = await supabase
    .from("programme_sessions")
    .select("id, title, day, exercises, week_number")
    .in("id", sessionIds)

  const programmeSessionById = (programmeSessions || []).reduce(
    (acc: Record<string, any>, session: any) => {
      acc[session.id] = session
      return acc
    },
    {}
  )

  const { data: checkIns } = await supabase
  .from("check_ins")
  .select(
  "id, user_id, created_at, bodyweight, training_rating, recovery_rating, nutrition_rating, cardio_steps, notes, reviewed, coach_feedback, feedback_seen"
)
  .eq("reviewed", false)
  .order("created_at", { ascending: false })
  .limit(100)

  const { data: previousCheckInsWithFeedback } = await supabase
  .from("check_ins")
  .select("id, user_id, created_at, coach_feedback")
  .not("coach_feedback", "is", null)
  .order("created_at", { ascending: false })
  .limit(300)

function getPreviousCheckInFeedback(userId: string, currentCreatedAt: string) {
  return (
    previousCheckInsWithFeedback?.find(
      (checkIn: any) =>
        checkIn.user_id === userId &&
        new Date(checkIn.created_at).getTime() <
          new Date(currentCreatedAt).getTime() &&
        String(checkIn.coach_feedback || "").trim()
    ) || null
  )
}

  const coachAttentionItems = buildCoachAttentionItems({
    clients: clients || [],
    workoutLogs: workoutLogs || [],
    videos: videos || [],
    checkIns: checkIns || [],
  })

  const attentionByUserId = coachAttentionItems.reduce(
    (acc: Record<string, any>, item) => {
      acc[item.userId] = item
      return acc
    },
    {}
  )

  const latestCheckInByUserId = (checkIns || []).reduce(
    (acc: Record<string, any>, checkIn: any) => {
      if (!acc[checkIn.user_id]) {
        acc[checkIn.user_id] = checkIn
      }

      return acc
    },
    {}
  )

  const completionBySessionId = (sessionCompletions || []).reduce(
    (acc: Record<string, any>, completion: any) => {
      const key = `${completion.user_id}-${completion.session_id}`

      if (!acc[key]) {
        acc[key] = completion
      }

      return acc
    },
    {}
  )

  const videosWithUrls = await Promise.all(
    (videos || []).map(async (video) => {
      const { data } = await supabase.storage
        .from("exercise-videos")
        .createSignedUrl(video.video_path, 60 * 60)

      return {
        type: "video" as const,
        id: video.id,
        user_id: video.user_id,
        programme_id: video.programme_id,
        session_id: video.session_id,
        clientId: clientMap[video.user_id]?.id,
        clientName: clientMap[video.user_id]?.name || "Unknown client",
        exercise_name: video.exercise_name,
        created_at: video.created_at,
        feedback: video.feedback || "",
        signedUrl: data?.signedUrl || "",
      }
    })
  )

  const logItems = (workoutLogs || []).map((log) => ({
    type: "log" as const,
    id: log.id,
    user_id: log.user_id,
    programme_id: log.programme_id,
    session_id: log.session_id,
    clientId: clientMap[log.user_id]?.id,
    clientName: clientMap[log.user_id]?.name || "Unknown client",
    exercise_name: log.exercise_name,
    created_at: log.created_at,
    coach_feedback: log.coach_feedback || "",
    sets_completed: log.sets_completed as SetEntry[] | null,
    notes: log.notes,
  }))

  const checkInItems = (checkIns || []).map((checkIn) => ({
  type: "check-in" as const,
  id: checkIn.id,
  user_id: checkIn.user_id,
  clientId: clientMap[checkIn.user_id]?.id,
  clientName: clientMap[checkIn.user_id]?.name || "Unknown client",
  created_at: checkIn.created_at,
  bodyweight: checkIn.bodyweight,
  training_rating: checkIn.training_rating,
  recovery_rating: checkIn.recovery_rating,
  nutrition_rating: checkIn.nutrition_rating,
  cardio_steps: checkIn.cardio_steps,
  notes: checkIn.notes,
  coach_feedback: checkIn.coach_feedback || "",
  feedback_seen: checkIn.feedback_seen,
  previousCheckInFeedback: getPreviousCheckInFeedback(
    checkIn.user_id,
    checkIn.created_at
  ),
}))

  const rawItems = [...videosWithUrls, ...logItems].filter(
    (item) => item.clientId && item.session_id
  )

  const standaloneCheckInItems = checkInItems
  .filter((item) => item.clientId)
  .map((item) => ({
    ...item,
    attention: attentionByUserId[item.user_id] || null,
  }))    

  const groupedReviewItems = Object.values(
    rawItems.reduce((acc: Record<string, any>, item: any) => {
      const key = `${item.user_id}-${item.session_id}`

      if (!acc[key]) {
        const completion = completionBySessionId[key]
        const latestCheckIn = latestCheckInByUserId[item.user_id]
        const attention = attentionByUserId[item.user_id]
        const programmeSession = programmeSessionById[item.session_id]

        acc[key] = {
  type: "session",
  id: key,
  session_id: item.session_id,
  programme_id: item.programme_id,
  user_id: item.user_id,
  clientId: item.clientId,
  clientName: item.clientName,
  created_at: item.created_at,

  session_title: programmeSession?.title || null,
  session_day: programmeSession?.day || null,
  week_number: programmeSession?.week_number || null,
  prescribed_exercises: programmeSession?.exercises || [],

  completion: completion || null,
  latestCheckIn: latestCheckIn || null,
  attention: attention || null,
  logs: [],
  videos: [],
}
      }

      if (new Date(item.created_at) > new Date(acc[key].created_at)) {
        acc[key].created_at = item.created_at
      }

            if (item.type === "log") acc[key].logs.push(item)
      if (item.type === "video") acc[key].videos.push(item)

      return acc
    }, {})
  )
    .map((session: any) => ({
      ...session,
      logs: session.logs.sort(
        (a: any, b: any) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
      videos: session.videos.sort(
        (a: any, b: any) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
    }))
    .sort((a: any, b: any) => {
      const scoreA = a.attention?.score || 0
      const scoreB = b.attention?.score || 0

      if (scoreB !== scoreA) return scoreB - scoreA

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-widest text-yellow-400">
              Coach Review Mode
            </p>
            <h1 className="mt-2 text-3xl font-bold">Review Session</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Clear completed sessions, exercise logs and videos in one place.
            </p>
          </div>

          <Link
            href="/coach"
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-yellow-500 hover:text-white"
          >
            Back to dashboard
          </Link>
        </div>

        <ReviewSession
  items={[...standaloneCheckInItems, ...(groupedReviewItems as any)]}
/>
      </div>
    </main>
  )
}