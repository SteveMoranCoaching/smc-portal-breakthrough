import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabaseServer"

export const dynamic = "force-dynamic"

const softBorder = "border-[rgba(255,255,255,0.08)]"

const glassCard =
  "relative overflow-hidden rounded-[1.75rem] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.052),rgba(255,255,255,0.018))] shadow-[0_16px_42px_rgba(0,0,0,0.68)]"

const labelStyle =
  "text-[9px] font-semibold uppercase tracking-[0.24em] text-smc-gold"

async function uploadExerciseDemo(formData: FormData) {
  "use server"

  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "coach") redirect("/dashboard")

  const exerciseName = String(formData.get("exerciseName") || "").trim()
  const coachNotes = String(formData.get("coachNotes") || "").trim()
  const video = formData.get("video") as File | null
  const thumbnail = formData.get("thumbnail") as File | null

  if (!exerciseName) return

  let videoPath: string | null = null
  let thumbnailPath: string | null = null

  const safeName = exerciseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")

  if (video && video.size > 0) {
    const videoExt = video.name.split(".").pop() || "mp4"
    videoPath = `videos/${safeName}-${Date.now()}.${videoExt}`

    const { error: videoUploadError } = await supabase.storage
      .from("exercise-demo-videos")
      .upload(videoPath, video, {
        upsert: true,
        contentType: video.type || "video/mp4",
      })

    if (videoUploadError) throw videoUploadError
  }

  if (thumbnail && thumbnail.size > 0) {
    const thumbnailExt = thumbnail.name.split(".").pop() || "jpg"
    thumbnailPath = `thumbnails/${safeName}-${Date.now()}.${thumbnailExt}`

    const { error: thumbnailUploadError } = await supabase.storage
      .from("exercise-demo-videos")
      .upload(thumbnailPath, thumbnail, {
        upsert: true,
        contentType: thumbnail.type || "image/jpeg",
      })

    if (thumbnailUploadError) throw thumbnailUploadError
  }

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
}

async function deleteExerciseDemo(formData: FormData) {
  "use server"

  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "coach") redirect("/dashboard")

  const id = String(formData.get("id") || "")

  if (!id) return

  const { error } = await supabase
    .from("exercise_demo_videos")
    .delete()
    .eq("id", id)

  if (error) throw error

  revalidatePath("/coach/exercise-demos")
}

export default async function ExerciseDemosPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "coach") redirect("/dashboard")

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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.10),transparent_32%),#050505] px-3 py-6 pb-32 text-white sm:px-4">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <section className="px-1">
          <p className={labelStyle}>Coach Tools</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.055em] text-white">
            Exercise Demos
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">
            Upload demo videos and thumbnails for each exercise. These will be
            shown on client workout panels.
          </p>
        </section>

        <section className={`${glassCard} p-4`}>
          <form action={uploadExerciseDemo} className="relative z-10 space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-[0.22em] text-smc-gold/80">
                Exercise name
              </label>
              <input
                name="exerciseName"
                required
                placeholder="e.g. Low Bar Squat"
                className={`mt-2 min-h-[48px] w-full rounded-2xl border ${softBorder} bg-black/35 px-4 text-sm font-semibold text-white outline-none placeholder:text-white/25 focus:border-smc-gold/70`}
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
                className={`mt-2 w-full rounded-2xl border ${softBorder} bg-black/35 p-4 text-sm leading-6 text-white outline-none placeholder:text-white/25 focus:border-smc-gold/70`}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className={`rounded-2xl border ${softBorder} bg-black/30 p-4`}>
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

              <div className={`rounded-2xl border ${softBorder} bg-black/30 p-4`}>
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
              Save Exercise Demo
            </button>
          </form>
        </section>

        <section className="flex flex-col gap-3">
          <div className="px-1">
            <p className={labelStyle}>Library</p>
            <h2 className="mt-1.5 text-2xl font-black tracking-[-0.04em] text-white">
              Uploaded Demos
            </h2>
          </div>

          {demosWithUrls.length > 0 ? (
            demosWithUrls.map((demo) => (
              <article key={demo.id} className={`${glassCard} p-4`}>
                <div className="relative z-10 grid gap-4 sm:grid-cols-[180px_1fr]">
                  <div className="relative min-h-[160px] overflow-hidden rounded-[1.4rem] border border-white/10 bg-black/45">
                    {demo.thumbnailUrl ? (
                      <img
                        src={demo.thumbnailUrl}
                        alt={demo.exercise_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full min-h-[160px] items-center justify-center px-4 text-center text-sm font-bold text-white/35">
                        No thumbnail yet
                      </div>
                    )}

                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                  </div>

                  <div>
                    <p className={labelStyle}>Exercise</p>
                    <h3 className="mt-1.5 text-xl font-black tracking-[-0.03em] text-white">
                      {demo.exercise_name}
                    </h3>

                    {demo.coach_notes && (
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/50">
                        {demo.coach_notes}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {demo.videoUrl && (
                        <a
                          href={demo.videoUrl}
                          target="_blank"
                          className="inline-flex min-h-[38px] items-center justify-center rounded-2xl border border-smc-gold/45 px-4 text-sm font-black text-smc-gold"
                        >
                          View Video
                        </a>
                      )}

                      <form action={deleteExerciseDemo}>
                        <input type="hidden" name="id" value={demo.id} />
                        <button
                          type="submit"
                          className="inline-flex min-h-[38px] items-center justify-center rounded-2xl border border-red-500/25 bg-red-500/10 px-4 text-sm font-black text-red-300"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </article>
            ))
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