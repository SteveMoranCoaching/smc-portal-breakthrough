import Link from "next/link"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin"
import VideoGroup from "./VideoGroup"
import WorkoutLogReviewButton from "./WorkoutLogReviewButton"
import WorkoutLogFeedbackBox from "./WorkoutLogFeedbackBox"

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

export default async function ClientProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>
  searchParams: Promise<{ exercise?: string; updated?: string }>
}) {
  const { clientId } = await params
  const { exercise: selectedExercise, updated } = await searchParams

  const supabase = await createSupabaseServerClient()

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
      exercise_name,
      sets_completed,
      notes,
      created_at,
      reviewed,
      coach_feedback
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

  const workoutLogCount = workoutLogs?.length ?? 0
  const unreviewedLogCount =
    workoutLogs?.filter((log: any) => !log.reviewed).length ?? 0

  const videoCount = videos?.length ?? 0
  const unreviewedVideoCount =
    videos?.filter((video: any) => !video.reviewed).length ?? 0

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
                      total + (session.exercises?.length ?? 0),
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

                        <div className="space-y-3">
                          {weekEntries.map(([weekNumber, weekSessions]: any) => (
                            <div
                              key={weekNumber}
                              className="rounded-[1rem] border border-white/[0.055] bg-black/25 p-3"
                            >
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-smc-gold/75">
                                    Week {weekNumber}
                                  </p>
                                  <p className="mt-0.5 text-xs text-white/35">
                                    {weekSessions.length} session
                                    {weekSessions.length === 1 ? "" : "s"}
                                  </p>
                                </div>
                              </div>

                              <div className="grid gap-2.5 md:grid-cols-2">
                                {weekSessions.map((session: any) => (
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
                                            {session.title || "Untitled session"}
                                          </h4>
                                        </div>

                                        <span className="rounded-full border border-white/[0.06] bg-white/[0.025] px-2.5 py-1 text-[10px] font-bold text-white/40">
                                          {session.exercises?.length ?? 0}{" "}
                                          exercises
                                        </span>
                                      </div>
                                    </summary>

                                    <div className="space-y-1.5 border-t border-white/[0.05] p-3">
                                      {session.exercises?.map(
                                        (exercise: any, index: number) => (
                                          <div
                                            key={index}
                                            className="rounded-[0.8rem] border border-white/[0.045] bg-white/[0.025] px-3 py-2"
                                          >
                                            <p className="text-sm font-bold text-white">
                                              {exercise.name ||
                                                "Unnamed exercise"}
                                            </p>
                                            <p className="mt-0.5 text-xs leading-5 text-white/40">
                                              {exercise.prescription ||
                                                "No prescription"}
                                            </p>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </details>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </details>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        <section className={`${shellCard} p-4 sm:p-5`}>
          <div className="relative z-10">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className={labelStyle}>Training Review</p>
                <h2 className="mt-1 text-xl font-black text-white">
                  Workout Logs
                </h2>
              </div>

              <span className="rounded-full border border-smc-gold/20 bg-smc-gold/10 px-2.5 py-1 text-[10px] font-black uppercase text-smc-gold">
                {unreviewedLogCount} new
              </span>
            </div>

            {workoutLogsError && (
              <div className="mb-4 rounded-[1rem] border border-red-500/30 bg-red-950/40 p-4 text-sm text-red-200">
                {workoutLogsError.message}
              </div>
            )}

            {!workoutLogs || workoutLogs.length === 0 ? (
              <div className={`${innerPanel} p-4 text-sm text-white/45`}>
                No workout logs submitted yet.
              </div>
            ) : (
              <div className="space-y-3">
                {workoutLogs.map((log: any) => (
                  <div key={log.id} className={`${innerPanel} p-3.5`}>
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-black text-white">
                          {log.exercise_name}
                        </h3>

                        <p className="mt-0.5 text-xs text-white/35">
                          {formatDateTime(log.created_at)}
                        </p>
                      </div>

                      <WorkoutLogReviewButton
                        logId={log.id}
                        initialReviewed={log.reviewed}
                      />
                    </div>

                    <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                      {log.sets_completed?.map((set: any, index: number) => (
                        <div
                          key={index}
                          className="grid grid-cols-3 gap-2 rounded-[0.85rem] border border-white/[0.045] bg-black/35 p-2.5 text-xs"
                        >
                          <p>
                            <span className="block text-[9px] font-black uppercase tracking-[0.12em] text-white/30">
                              Weight
                            </span>
                            <span className="font-bold text-white/80">
                              {set.weight || "-"}kg
                            </span>
                          </p>

                          <p>
                            <span className="block text-[9px] font-black uppercase tracking-[0.12em] text-white/30">
                              Reps
                            </span>
                            <span className="font-bold text-white/80">
                              {set.reps || "-"}
                            </span>
                          </p>

                          <p>
                            <span className="block text-[9px] font-black uppercase tracking-[0.12em] text-white/30">
                              RPE
                            </span>
                            <span className="font-bold text-white/80">
                              {set.rpe || "-"}
                            </span>
                          </p>
                        </div>
                      ))}
                    </div>

                    {log.notes && (
                      <div className="mt-3 rounded-[0.95rem] border border-white/[0.05] bg-black/35 p-3">
                        <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-smc-gold/70">
                          Client notes
                        </p>
                        <p className="text-sm leading-5 text-white/55">
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
            )}
          </div>
        </section>

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
      </div>
    </main>
  )
}