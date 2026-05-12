import Link from "next/link"
import { createSupabaseServerClient } from "@/lib/supabaseServer"

export const dynamic = "force-dynamic"

const softBorder = "border-[rgba(255,255,255,0.06)]"

const shellCard =
  "relative overflow-hidden rounded-[1.35rem] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.016))] p-3.5 shadow-[0_14px_34px_rgba(0,0,0,0.68)] before:pointer-events-none before:absolute before:inset-0 before:rounded-[1.35rem] before:bg-[linear-gradient(rgba(255,255,255,0.035),transparent)]"

function normaliseName(name: string) {
  return name.toLowerCase().trim()
}

function getExercisePrescription(exercise: any) {
  const sets = exercise?.sets || exercise?.target_sets || exercise?.set_count
  const reps = exercise?.reps || exercise?.target_reps || exercise?.rep_range
  const rpe = exercise?.rpe || exercise?.target_rpe

  const parts = []

  if (sets && reps) parts.push(`${sets} x ${reps}`)
  else if (sets) parts.push(`${sets} sets`)
  else if (reps) parts.push(`${reps} reps`)

  if (rpe) parts.push(`RPE ${rpe}`)

  return parts.length > 0 ? parts.join(" · ") : "Prescription inside session"
}

function getExerciseNotes(exercise: any) {
  return (
    exercise?.notes ||
    exercise?.coach_notes ||
    exercise?.instructions ||
    exercise?.description ||
    ""
  )
}

async function getStorageUrl(
  supabase: any,
  bucket: string,
  path?: string | null
) {
  if (!path) return null

  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("data:")
  ) {
    return path
  }

  const { data: signedData } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60)

  if (signedData?.signedUrl) return signedData.signedUrl

  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path)

  return publicData?.publicUrl || null
}

export default async function WorkoutPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>
  searchParams?: Promise<{ programmeId?: string }>
}) {
  const supabase = await createSupabaseServerClient()

  const { sessionId } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const programmeId = resolvedSearchParams?.programmeId

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className={`${shellCard} text-sm text-smc-muted`}>
        You must be logged in.
      </div>
    )
  }

  const { data: programmes, error } = await supabase
    .from("programmes")
    .select(`
      id,
      title,
      week_number,
      notes,
      programme_sessions (
        id,
        day,
        title,
        exercises
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    return (
      <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">
        <h1 className="mb-3 font-bold">Error loading workout</h1>
        <pre className="whitespace-pre-wrap text-xs">
          {JSON.stringify(error, null, 2)}
        </pre>
      </div>
    )
  }

  const selectedProgramme =
    programmes?.find((programme: any) => programme.id === programmeId) ||
    programmes?.find((programme: any) =>
      programme.programme_sessions?.some(
        (session: any) => session.id === sessionId
      )
    )

  const session = selectedProgramme?.programme_sessions?.find(
    (item: any) => item.id === sessionId
  )

  const exercises = Array.isArray(session?.exercises) ? session.exercises : []

  const exerciseNames = exercises
    .map((exercise: any) => exercise?.name)
    .filter(Boolean)

  const { data: previousLogs } = await supabase
    .from("workout_logs")
    .select("id, exercise_name, created_at")
    .eq("user_id", user.id)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })

  const { data: rawExerciseDemos } = await supabase
    .from("exercise_demo_videos")
    .select("id, exercise_name, video_path, thumbnail_path, coach_notes")
    .order("exercise_name", { ascending: true })

  const exerciseDemos = await Promise.all(
    (rawExerciseDemos || []).map(async (demo: any) => ({
      ...demo,
      video_url: await getStorageUrl(
        supabase,
        "exercise-demo-videos",
        demo.video_path
      ),
      thumbnail_url: await getStorageUrl(
        supabase,
        "exercise-demo-videos",
        demo.thumbnail_path
      ),
    }))
  )

  const matchedDemos = exerciseDemos.filter((demo: any) =>
    exercises.some(
      (exercise: any) =>
        normaliseName(exercise?.name || "") ===
        normaliseName(demo.exercise_name || "")
    )
  )

  const latestLog = previousLogs?.[0] || null

  if (!session || !selectedProgramme) {
    return (
      <div className={`${shellCard}`}>
        <div className="relative z-10">
          <h1 className="text-lg font-black text-white">Workout not found</h1>
          <p className="mt-2 text-sm text-smc-muted">
            This session could not be loaded.
          </p>

          <Link
            href="/dashboard/workouts"
            className="mt-4 inline-flex rounded-2xl border border-white/10 px-4 py-2.5 text-sm font-bold text-white"
          >
            Back to workouts
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 pb-6">
      <Link
        href="/dashboard/workouts"
        className="inline-flex w-fit items-center gap-2 rounded-full border border-smc-gold/15 bg-smc-gold/[0.06] px-3 py-2 text-xs font-black text-smc-gold"
      >
        ← Workouts
      </Link>

      <section className={shellCard}>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-smc-gold/40 to-transparent" />

        <div className="relative z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.24em] text-smc-gold/80">
                Workout Preview
              </p>

              <h1 className="mt-1.5 text-xl font-black leading-tight text-white">
                {session.title}
              </h1>

              <p className="mt-1 text-xs leading-5 text-white/45">
                Week {selectedProgramme.week_number || "—"} · {session.day} ·{" "}
                {exercises.length} exercises
              </p>
            </div>

            <span className="shrink-0 rounded-full border border-smc-gold/20 bg-smc-gold/10 px-2.5 py-1 text-[9px] font-black uppercase text-smc-gold">
              Preview
            </span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className={`rounded-[1rem] border ${softBorder} bg-black/25 p-2.5`}>
              <p className="text-[9px] uppercase tracking-[0.18em] text-white/35">
                Exercises
              </p>
              <p className="mt-1 text-lg font-black text-white">
                {exercises.length}
              </p>
            </div>

            <div className={`rounded-[1rem] border ${softBorder} bg-black/25 p-2.5`}>
              <p className="text-[9px] uppercase tracking-[0.18em] text-white/35">
                Demos
              </p>
              <p className="mt-1 text-lg font-black text-white">
                {matchedDemos.length}
              </p>
            </div>

            <div className={`rounded-[1rem] border ${softBorder} bg-black/25 p-2.5`}>
              <p className="text-[9px] uppercase tracking-[0.18em] text-white/35">
                Logs
              </p>
              <p className="mt-1 text-lg font-black text-white">
                {previousLogs?.length || 0}
              </p>
            </div>
          </div>

          {latestLog && (
            <p className="mt-3 rounded-[1rem] border border-smc-gold/15 bg-smc-gold/[0.06] px-3 py-2 text-xs leading-5 text-smc-gold/85">
              Previous work exists for this session. You can still start fresh
              or use previous numbers inside the logger.
            </p>
          )}

          <Link
            href={`/dashboard/session/${session.id}?programmeId=${selectedProgramme.id}`}
            className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-[1rem] bg-smc-gold px-4 py-2.5 text-xs font-black uppercase tracking-[0.16em] text-black shadow-[0_0_22px_rgba(212,175,55,0.25)] transition hover:brightness-110 active:scale-[0.99]"
          >
            Start Logging
          </Link>
        </div>
      </section>

      {selectedProgramme.notes && (
        <section className={shellCard}>
          <div className="relative z-10">
            <p className="text-[9px] font-black uppercase tracking-[0.24em] text-smc-gold/75">
              Programme Notes
            </p>

            <p className="mt-2 line-clamp-4 text-xs leading-5 text-white/55">
              {selectedProgramme.notes}
            </p>
          </div>
        </section>
      )}

      <section className={shellCard}>
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-black text-white">Exercise List</h2>

            <p className="text-[11px] text-white/35">
              Quick scan
            </p>
          </div>

          <div className="mt-3 flex flex-col gap-2.5">
            {exercises.map((exercise: any, index: number) => {
              const exerciseName = exercise?.name || `Exercise ${index + 1}`

              const matchingDemo = matchedDemos.find(
                (demo: any) =>
                  normaliseName(demo.exercise_name || "") ===
                  normaliseName(exerciseName)
              )

              const notes = getExerciseNotes(exercise)

              return (
                <div
                  key={`${exerciseName}-${index}`}
                  className={`rounded-[1.05rem] border ${softBorder} bg-[#070707] p-3 shadow-[0_8px_22px_rgba(0,0,0,0.32)]`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-smc-gold">
                        {String(index + 1).padStart(2, "0")}
                      </p>

                      <h3 className="mt-1.5 line-clamp-2 text-[0.95rem] font-black leading-tight text-white">
                        {exerciseName}
                      </h3>

                      <p className="mt-1 text-xs text-white/40">
                        {getExercisePrescription(exercise)}
                      </p>
                    </div>

                    {matchingDemo && (
                      <span className="shrink-0 rounded-full bg-smc-gold/90 px-2 py-0.5 text-[8px] font-black uppercase text-black">
                        Demo
                      </span>
                    )}
                  </div>

                  {notes && (
                    <p className="mt-2 line-clamp-2 rounded-[0.85rem] border border-white/[0.05] bg-white/[0.025] px-2.5 py-2 text-xs leading-5 text-white/45">
                      {notes}
                    </p>
                  )}

                  {matchingDemo?.coach_notes && (
                    <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-smc-gold/70">
                      Coach demo note: {matchingDemo.coach_notes}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <Link
        href={`/dashboard/session/${session.id}?programmeId=${selectedProgramme.id}`}
        className="sticky bottom-24 z-20 inline-flex min-h-[46px] w-full items-center justify-center rounded-[1.05rem] bg-smc-gold px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-black shadow-[0_0_28px_rgba(212,175,55,0.3)] transition hover:brightness-110 active:scale-[0.99]"
      >
        Start Logging
      </Link>
    </div>
  )
}