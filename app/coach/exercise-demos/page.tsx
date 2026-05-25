import Link from "next/link"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireCoach } from "@/lib/authGuards"

export const dynamic = "force-dynamic"

const softBorder = "border-[rgba(255,255,255,0.08)]"

const glassCard =
  "relative overflow-hidden rounded-[1.45rem] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.052),rgba(255,255,255,0.018))] shadow-[0_14px_34px_rgba(0,0,0,0.68)]"

const labelStyle =
  "text-[9px] font-black uppercase tracking-[0.24em] text-smc-gold"

const inputStyle =
  "min-h-[44px] w-full rounded-[1rem] border border-[rgba(255,255,255,0.08)] bg-black/40 px-3 text-sm font-semibold text-white outline-none placeholder:text-white/25 focus:border-smc-gold/70"

const textareaStyle =
  "w-full rounded-[1rem] border border-[rgba(255,255,255,0.08)] bg-black/40 p-3 text-sm leading-6 text-white outline-none placeholder:text-white/25 focus:border-smc-gold/70"

function safeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

async function uploadFile({
  supabase,
  file,
  folder,
  exerciseName,
  fallbackContentType,
}: {
  supabase: any
  file: File | null
  folder: "videos" | "thumbnails"
  exerciseName: string
  fallbackContentType: string
}) {
  if (!file || file.size <= 0) return null

  const ext = file.name.split(".").pop() || (folder === "videos" ? "mp4" : "jpg")
  const path = `${folder}/${safeFileName(exerciseName)}-${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from("exercise-demo-videos")
    .upload(path, file, {
      upsert: true,
      contentType: file.type || fallbackContentType,
    })

  if (error) throw error

  return path
}

async function uploadExerciseDemo(formData: FormData) {
  "use server"

  const { supabase } = await requireCoach()

  const exerciseName = String(formData.get("exerciseName") || "").trim()
  const coachNotes = String(formData.get("coachNotes") || "").trim()
  const video = formData.get("video") as File | null
  const thumbnail = formData.get("thumbnail") as File | null

  if (!exerciseName) return

  const videoPath = await uploadFile({
    supabase,
    file: video,
    folder: "videos",
    exerciseName,
    fallbackContentType: "video/mp4",
  })

  const thumbnailPath = await uploadFile({
    supabase,
    file: thumbnail,
    folder: "thumbnails",
    exerciseName,
    fallbackContentType: "image/jpeg",
  })

  const existing = await supabase
    .from("exercise_demo_videos")
    .select("video_path, thumbnail_path")
    .eq("exercise_name", exerciseName)
    .maybeSingle()

  const { error } = await supabase.from("exercise_demo_videos").upsert(
    {
      exercise_name: exerciseName,
      coach_notes: coachNotes,
      video_path: videoPath || existing.data?.video_path || null,
      thumbnail_path: thumbnailPath || existing.data?.thumbnail_path || null,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "exercise_name",
    }
  )

  if (error) throw error

  revalidatePath("/coach/exercise-demos")
  redirect("/coach/exercise-demos?saved=true")
}

async function updateExerciseDemo(formData: FormData) {
  "use server"

  const { supabase } = await requireCoach()

  const id = String(formData.get("id") || "").trim()
  const exerciseName = String(formData.get("exerciseName") || "").trim()
  const coachNotes = String(formData.get("coachNotes") || "").trim()
  const video = formData.get("video") as File | null
  const thumbnail = formData.get("thumbnail") as File | null

  if (!id || !exerciseName) return

  const { data: existing } = await supabase
    .from("exercise_demo_videos")
    .select("video_path, thumbnail_path")
    .eq("id", id)
    .single()

  const videoPath = await uploadFile({
    supabase,
    file: video,
    folder: "videos",
    exerciseName,
    fallbackContentType: "video/mp4",
  })

  const thumbnailPath = await uploadFile({
    supabase,
    file: thumbnail,
    folder: "thumbnails",
    exerciseName,
    fallbackContentType: "image/jpeg",
  })

  const { error } = await supabase
    .from("exercise_demo_videos")
    .update({
      exercise_name: exerciseName,
      coach_notes: coachNotes,
      video_path: videoPath || existing?.video_path || null,
      thumbnail_path: thumbnailPath || existing?.thumbnail_path || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) throw error

  revalidatePath("/coach/exercise-demos")
  redirect("/coach/exercise-demos?saved=true")
}

async function deleteExerciseDemo(formData: FormData) {
  "use server"

  const { supabase } = await requireCoach()

  const id = String(formData.get("id") || "")
  if (!id) return

  const { error } = await supabase
    .from("exercise_demo_videos")
    .delete()
    .eq("id", id)

  if (error) throw error

  revalidatePath("/coach/exercise-demos")
  redirect("/coach/exercise-demos?deleted=true")
}

export default async function ExerciseDemosPage({
  searchParams,
}: {
  searchParams?:
    | { saved?: string; deleted?: string }
    | Promise<{ saved?: string; deleted?: string }>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {}

  const { supabase } = await requireCoach()

  const { data: demos } = await supabase
    .from("exercise_demo_videos")
    .select("*")
    .order("exercise_name", { ascending: true })

  const demosWithUrls = await Promise.all(
    (demos || []).map(async (demo) => {
      const videoUrl = demo.video_path
        ? await supabase.storage
            .from("exercise-demo-videos")
            .createSignedUrl(demo.video_path, 60 * 60)
        : null

      const thumbnailUrl = demo.thumbnail_path
        ? await supabase.storage
            .from("exercise-demo-videos")
            .createSignedUrl(demo.thumbnail_path, 60 * 60)
        : null

      return {
        ...demo,
        videoUrl: videoUrl?.data?.signedUrl || null,
        thumbnailUrl: thumbnailUrl?.data?.signedUrl || null,
      }
    })
  )

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.10),transparent_32%),#050505] px-3 py-6 pb-32 text-white sm:px-4">
      <div className="pointer-events-none absolute inset-x-[-80px] top-[-160px] h-[360px] rounded-full bg-smc-gold/10 blur-[100px]" />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-4">
        <section className="px-1">
          <Link
            href="/coach"
            className="mb-4 inline-flex rounded-full border border-white/[0.08] bg-black/35 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white/60 transition hover:border-smc-gold/35 hover:text-white"
          >
            Back to Coach
          </Link>

          <p className={labelStyle}>Coach Tools</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.055em] text-white">
            Exercise Demos
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/52">
            Create, edit and manage the demo videos that appear inside client
            workout panels.
          </p>
        </section>

        {resolvedSearchParams?.saved === "true" && (
          <div className="rounded-[1rem] border border-green-500/25 bg-green-500/10 px-3 py-2 text-sm text-green-300">
            Exercise demo saved.
          </div>
        )}

        {resolvedSearchParams?.deleted === "true" && (
          <div className="rounded-[1rem] border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            Exercise demo deleted.
          </div>
        )}

        <section className={`${glassCard} p-4`}>
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_32%,rgba(212,175,55,0.045)_78%,transparent)]" />

          <form action={uploadExerciseDemo} className="relative z-10 space-y-4">
            <div>
              <p className={labelStyle}>Create New</p>
              <h2 className="mt-1 text-xl font-black tracking-[-0.035em] text-white">
                Add Exercise Demo
              </h2>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-[0.22em] text-smc-gold/80">
                Exercise name
              </label>
              <input
                name="exerciseName"
                required
                placeholder="e.g. Low Bar Squat"
                className={`mt-2 ${inputStyle}`}
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-[0.22em] text-smc-gold/80">
                Coaching notes
              </label>
              <textarea
                name="coachNotes"
                rows={4}
                placeholder="Key cues, setup notes, common mistakes..."
                className={`mt-2 ${textareaStyle}`}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div
                className={`rounded-2xl border ${softBorder} bg-black/30 p-4`}
              >
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-white/35">
                  Demo video
                </p>
                <input
                  name="video"
                  type="file"
                  accept="video/*"
                  className="w-full text-sm text-white/65 file:mr-3 file:rounded-xl file:border-0 file:bg-[rgba(255,255,255,0.08)] file:px-3 file:py-2 file:text-sm file:font-bold file:text-white"
                />
              </div>

              <div
                className={`rounded-2xl border ${softBorder} bg-black/30 p-4`}
              >
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-white/35">
                  Thumbnail image
                </p>
                <input
                  name="thumbnail"
                  type="file"
                  accept="image/*"
                  className="w-full text-sm text-white/65 file:mr-3 file:rounded-xl file:border-0 file:bg-[rgba(255,255,255,0.08)] file:px-3 file:py-2 file:text-sm file:font-bold file:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="min-h-[44px] w-full rounded-2xl bg-smc-gold px-4 text-sm font-black text-black shadow-[0_0_22px_rgba(212,175,55,0.20)] transition hover:brightness-110 active:scale-[0.98]"
            >
              Save New Exercise Demo
            </button>
          </form>
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-end justify-between gap-3 px-1">
            <div>
              <p className={labelStyle}>Library</p>
              <h2 className="mt-1.5 text-2xl font-black tracking-[-0.04em] text-white">
                Uploaded Demos
              </h2>
            </div>

            <span className="rounded-full border border-smc-gold/25 bg-smc-gold/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-smc-gold">
              {demosWithUrls.length} demos
            </span>
          </div>

          {demosWithUrls.length > 0 ? (
            <div className="grid gap-3">
              {demosWithUrls.map((demo) => (
                <article key={demo.id} className={`${glassCard} p-3`}>
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.035),transparent_34%,rgba(212,175,55,0.035)_78%,transparent)]" />

                  <div className="relative z-10 grid gap-4 lg:grid-cols-[220px_1fr]">
                    <div className="relative min-h-[170px] overflow-hidden rounded-[1.2rem] border border-white/10 bg-black/45">
                      {demo.thumbnailUrl ? (
                        <img
                          src={demo.thumbnailUrl}
                          alt={demo.exercise_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full min-h-[170px] items-center justify-center px-4 text-center text-sm font-bold text-white/35">
                          No thumbnail yet
                        </div>
                      )}

                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                      {demo.videoUrl && (
                        <a
                          href={demo.videoUrl}
                          target="_blank"
                          className="absolute bottom-3 left-3 rounded-full border border-smc-gold/45 bg-black/70 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-smc-gold backdrop-blur-md"
                        >
                          View Video
                        </a>
                      )}
                    </div>

                    <form action={updateExerciseDemo} className="space-y-3">
                      <input type="hidden" name="id" value={demo.id} />

                      <div>
                        <label className="text-[9px] font-black uppercase tracking-[0.22em] text-smc-gold/80">
                          Exercise name
                        </label>
                        <input
                          name="exerciseName"
                          required
                          defaultValue={demo.exercise_name}
                          className={`mt-1.5 ${inputStyle}`}
                        />
                      </div>

                      <div>
                        <label className="text-[9px] font-black uppercase tracking-[0.22em] text-smc-gold/80">
                          Coach notes
                        </label>
                        <textarea
                          name="coachNotes"
                          rows={3}
                          defaultValue={demo.coach_notes || ""}
                          className={`mt-1.5 ${textareaStyle}`}
                        />
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        <div
                          className={`rounded-[1rem] border ${softBorder} bg-black/30 p-3`}
                        >
                          <p className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/35">
                            Replace video
                          </p>
                          <input
                            name="video"
                            type="file"
                            accept="video/*"
                            className="w-full text-xs text-white/60 file:mr-2 file:rounded-xl file:border-0 file:bg-[rgba(255,255,255,0.08)] file:px-2.5 file:py-1.5 file:text-xs file:font-bold file:text-white"
                          />
                        </div>

                        <div
                          className={`rounded-[1rem] border ${softBorder} bg-black/30 p-3`}
                        >
                          <p className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/35">
                            Replace thumbnail
                          </p>
                          <input
                            name="thumbnail"
                            type="file"
                            accept="image/*"
                            className="w-full text-xs text-white/60 file:mr-2 file:rounded-xl file:border-0 file:bg-[rgba(255,255,255,0.08)] file:px-2.5 file:py-1.5 file:text-xs file:font-bold file:text-white"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="submit"
                          className="inline-flex min-h-[38px] flex-1 items-center justify-center rounded-2xl bg-smc-gold px-4 text-sm font-black text-black shadow-[0_0_18px_rgba(212,175,55,0.18)] transition hover:brightness-110 active:scale-[0.98] sm:flex-none"
                        >
                          Save Changes
                        </button>
                      </div>
                    </form>

                    <form action={deleteExerciseDemo} className="lg:col-start-2">
                      <input type="hidden" name="id" value={demo.id} />
                      <button
                        type="submit"
                        className="inline-flex min-h-[36px] w-full items-center justify-center rounded-2xl border border-red-500/25 bg-red-500/10 px-4 text-sm font-black text-red-300 transition hover:border-red-400/45 hover:bg-red-500/15 sm:w-auto"
                      >
                        Delete Demo
                      </button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className={`${glassCard} p-5 text-center text-sm text-white/45`}>
              No exercise demos uploaded yet.
            </div>
          )}
        </section>
      </div>
    </main>
  )
}