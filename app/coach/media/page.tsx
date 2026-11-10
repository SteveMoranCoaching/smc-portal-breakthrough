
import Link from "next/link"
import { requireCoach } from "@/lib/authGuards"
import MediaReviewInbox from "@/components/MediaReviewInbox"
import MediaFolderLibrary from "@/components/MediaFolderLibrary"

export const dynamic = "force-dynamic"

type MediaFile = {
  id: string
  folder_id: string | null
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

const MEDIA_COLUMNS =
  "id, folder_id, original_filename, display_name, uploader_name, athlete_name, event_name, media_type, file_size_bytes, status, created_at"

export default async function CoachMediaPage() {
  const { supabase } = await requireCoach()

  const [
  { count: invitationCount, error: invitationsError },
  { data: folders, error: foldersError },
  { count: pendingCount, error: pendingCountError },
  { count: approvedCount, error: approvedCountError },
  { data: history, error: historyError },
  { data: unsorted, error: unsortedError },
  { data: folderCounts, error: folderCountsError },
] = await Promise.all([
    supabase
      .from("media_upload_links")
      .select("id", { count: "exact", head: true }),

    supabase
      .from("media_folders")
      .select("id, name, parent_id")
      .order("name", { ascending: true }),

    supabase
      .from("media_files")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),

    supabase
      .from("media_files")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved"),

    supabase
      .from("media_files")
      .select(MEDIA_COLUMNS)
      .in("status", ["uploading", "approved", "rejected"])
      .order("created_at", { ascending: false })
      .limit(50),

    supabase
  .from("media_files")
  .select(MEDIA_COLUMNS)
  .eq("status", "approved")
  .is("folder_id", null)
  .limit(1),

supabase.rpc("smc_media_folder_counts"),
])

  if (
  invitationsError ||
  foldersError ||
  pendingCountError ||
  approvedCountError ||
  historyError ||
  unsortedError ||
  folderCountsError
) {
    console.error("SMC Media Manager query error:", {
  invitationsError,
  foldersError,
  pendingCountError,
  approvedCountError,
  historyError,
  unsortedError,
  folderCountsError,
})

    return (
      <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-5 text-red-300">
        Unable to load Media Manager. Check the server logs.
      </div>
    )
  }

  // Load pending uploads independently of approved media.
  // Fetch in batches to avoid Supabase's per-request row limit.
  const pendingFiles: MediaFile[] = []
  const batchSize = 500
  const totalPending = pendingCount ?? 0

  for (let offset = 0; offset < totalPending; offset += batchSize) {
    const { data, error } = await supabase
      .from("media_files")
      .select(MEDIA_COLUMNS)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + batchSize - 1)

    if (error) {
      console.error("SMC pending media query error:", error)

      return (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-5 text-red-300">
          Unable to load pending media. Check the server logs.
        </div>
      )
    }

    pendingFiles.push(...((data || []) as MediaFile[]))
  }

  const historyFiles = (history || []) as MediaFile[]
  const mediaFiles = [...pendingFiles, ...historyFiles]

  // Temporary compatibility prop for the existing gallery component.
  // The actual folder contents load through folder-files/route.ts.
  const unsortedFiles = ((unsorted || []) as MediaFile[]).map(
    (file) => ({
      id: file.id,
      folder_id: file.folder_id,
      original_filename: file.original_filename,
      display_name: file.display_name,
      media_type: file.media_type,
      athlete_name: file.athlete_name,
      event_name: file.event_name,
      file_size_bytes: file.file_size_bytes,
    })
  )

  const cards = [
    {
      label: "Pending Review",
      value: totalPending,
      description: "Uploads waiting for approval",
      accent: "text-smc-gold",
    },
    {
      label: "Approved Media",
      value: approvedCount ?? 0,
      description: "Ready for your media library",
      accent: "text-green-300",
    },
    {
      label: "Invitations",
      value: invitationCount ?? 0,
      description: "Created upload invitations",
      accent: "text-white",
    },
    {
      label: "Folders",
      value: folders?.length ?? 0,
      description: "Organised media collections",
      accent: "text-white",
    },
  ]

  return (
    <div className="relative space-y-5 pb-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 rounded-full bg-smc-gold/[0.07] blur-[90px]" />

      {/* MEDIA MANAGER HEADER */}
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

      {/* DASHBOARD STATISTICS */}
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

      {/* PRIMARY MEDIA LIBRARY */}
      <section className="relative">
        <div className="rounded-[1.25rem] border border-white/[0.07] bg-black p-4 shadow-[0_16px_38px_rgba(0,0,0,0.6)] sm:p-5">
          <MediaFolderLibrary
  folders={folders || []}
  files={unsortedFiles}
  folderCounts={(
    (folderCounts || []) as {
      folder_id: string | null
      file_count: number
    }[]
  ).map((row) => ({
    folder_id: row.folder_id,
    file_count: Number(row.file_count),
  }))}
/>
        </div>
      </section>

      {/* INCOMING MEDIA REVIEW INBOX */}
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
              {totalPending} pending · Recent review history
            </p>
          </div>

          <span className="rounded-full border border-smc-gold/20 bg-smc-gold/10 px-3 py-1.5 text-[10px] font-black text-smc-gold">
            {mediaFiles.length} inbox records loaded
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
          <MediaReviewInbox files={mediaFiles} />
        )}
      </section>

      {/* GUEST UPLOAD LINKS */}
      <section className="relative rounded-[1.2rem] border border-white/[0.07] bg-black p-5">
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
      </section>
    </div>
  )
}
