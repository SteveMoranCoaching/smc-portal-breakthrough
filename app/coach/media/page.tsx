
import Link from "next/link"
import { requireCoach } from "@/lib/authGuards"

export const dynamic = "force-dynamic"

type MediaFile = {
  id: string
  original_filename: string
  display_name: string | null
  uploader_name: string | null
  athlete_name: string | null
  event_name: string | null
  media_type: "image" | "video"
  file_size_bytes: number
  status: "uploading" | "pending" | "approved" | "rejected"
  created_at: string
}

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / 1024 ** 3).toFixed(2)} GB`
  }

  return `${(bytes / 1024 ** 2).toFixed(1)} MB`
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export default async function CoachMediaPage() {
  const { supabase } = await requireCoach()

  const [
    { data: files, error: filesError },
    { count: invitationCount, error: invitationsError },
    { count: folderCount, error: foldersError },
  ] = await Promise.all([
    supabase
      .from("media_files")
      .select(
        "id, original_filename, display_name, uploader_name, athlete_name, event_name, media_type, file_size_bytes, status, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(100),

    supabase
      .from("media_upload_links")
      .select("id", { count: "exact", head: true }),

    supabase
      .from("media_folders")
      .select("id", { count: "exact", head: true }),
  ])

  if (filesError || invitationsError || foldersError) {
    console.error("SMC Media Manager query error:", {
      filesError,
      invitationsError,
      foldersError,
    })

    return (
      <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-5 text-red-300">
        Unable to load Media Manager. Check the server logs.
      </div>
    )
  }

  const mediaFiles = (files || []) as MediaFile[]

  const pending = mediaFiles.filter((file) => file.status === "pending")
  const approved = mediaFiles.filter((file) => file.status === "approved")
  const rejected = mediaFiles.filter((file) => file.status === "rejected")

  const cards = [
    {
      label: "Pending Review",
      value: pending.length,
      description: "Uploads waiting for approval",
      accent: "text-smc-gold",
    },
    {
      label: "Approved Media",
      value: approved.length,
      description: "Ready for your media library",
      accent: "text-green-300",
    },
    {
      label: "Invitations",
      value: invitationCount || 0,
      description: "Created upload invitations",
      accent: "text-white",
    },
    {
      label: "Folders",
      value: folderCount || 0,
      description: "Organised media collections",
      accent: "text-white",
    },
  ]

  return (
    <div className="relative space-y-5 pb-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 rounded-full bg-smc-gold/[0.07] blur-[90px]" />

      <header className="relative overflow-hidden rounded-[1.5rem] border border-smc-gold/25 bg-black p-5 shadow-[0_20px_50px_rgba(0,0,0,0.7)] sm:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_10%,rgba(212,175,55,0.18),transparent_40%)]" />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-smc-gold">
              SMC Portal / Media
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
              Media Manager
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-white/50">
              Competition footage, athlete highlights and event memories.
              Collected in original quality and organised in one place.
            </p>
          </div>

          <Link
            href="/coach/media/links"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-smc-gold px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-black transition hover:brightness-110"
          >
            + Upload Invitations
          </Link>
        </div>
      </header>

      <section className="relative grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-[1.2rem] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.012))] p-4"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/45">
              {card.label}
            </p>

            <p className={`mt-2 text-3xl font-black ${card.accent}`}>
              {card.value}
            </p>

            <p className="mt-1 text-[11px] leading-4 text-white/35">
              {card.description}
            </p>
          </div>
        ))}
      </section>

      <section className="relative overflow-hidden rounded-[1.25rem] border border-white/[0.07] bg-black p-4 shadow-[0_16px_38px_rgba(0,0,0,0.6)] sm:p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-smc-gold">
              Review Inbox
            </p>

            <h2 className="mt-1 text-xl font-black text-white">
              Incoming Media
            </h2>

            <p className="mt-1 text-xs text-white/40">
              {pending.length} pending · {approved.length} approved ·{" "}
              {rejected.length} rejected
            </p>
          </div>

          <span className="rounded-full border border-smc-gold/20 bg-smc-gold/10 px-3 py-1.5 text-[10px] font-black text-smc-gold">
            {mediaFiles.length} files loaded
          </span>
        </div>

        {mediaFiles.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[1rem] border border-dashed border-white/[0.1] bg-white/[0.015] px-5 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-smc-gold/20 bg-smc-gold/[0.07] text-3xl text-smc-gold">
              ▧
            </div>

            <h3 className="mt-4 text-lg font-black text-white">
              Your media library starts here
            </h3>

            <p className="mt-2 max-w-sm text-sm leading-6 text-white/45">
              Create an upload invitation and share the link with athletes,
              friends or family. Their photos and videos will arrive here
              ready for your review.
            </p>

            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.15em] text-smc-gold/65">
              Private Storage · Original Quality · Coach Approval
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {mediaFiles.map((file) => (
              <div
                key={file.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-smc-gold/15 bg-smc-gold/[0.06] text-xl">
                    {file.media_type === "video" ? "🎥" : "📷"}
                  </div>

                  <div className="min-w-0">
                    <p className="break-all text-sm font-bold text-white">
                      {file.display_name || file.original_filename}
                    </p>

                    <p className="mt-1 text-[11px] text-white/40">
                      {file.uploader_name || "Unknown uploader"} ·{" "}
                      {formatFileSize(file.file_size_bytes)} ·{" "}
                      {formatDate(file.created_at)}
                    </p>

                    {(file.athlete_name || file.event_name) && (
                      <p className="mt-1 text-[10px] text-smc-gold/65">
                        {[file.event_name, file.athlete_name]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                </div>

                <span
                  className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase ${
                    file.status === "pending"
                      ? "border-amber-400/25 bg-amber-400/10 text-amber-200"
                      : file.status === "approved"
                        ? "border-green-500/25 bg-green-500/10 text-green-300"
                        : file.status === "rejected"
                          ? "border-red-500/25 bg-red-500/10 text-red-300"
                          : "border-white/10 bg-white/5 text-white/45"
                  }`}
                >
                  {file.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="relative grid gap-3 md:grid-cols-2">
        <div className="rounded-[1.2rem] border border-white/[0.07] bg-black p-5">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-smc-gold">
            Media Organisation
          </p>

          <h2 className="mt-2 text-lg font-black text-white">
            Collections & Folders
          </h2>

          <p className="mt-2 text-sm leading-6 text-white/45">
            Organise footage by competition, athlete or content project.
            Your folders will appear here once created.
          </p>
        </div>

        <div className="rounded-[1.2rem] border border-white/[0.07] bg-black p-5">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-smc-gold">
            Share & Collect
          </p>

          <h2 className="mt-2 text-lg font-black text-white">
            Guest Upload Links
          </h2>

          <p className="mt-2 text-sm leading-6 text-white/45">
            Give friends, family and athletes a private upload link.
            No account required, and no access to your coaching portal.
          </p>
        </div>
      </section>
    </div>
  )
}
