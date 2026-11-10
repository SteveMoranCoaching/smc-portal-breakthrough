
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

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

type Preview = {
  fileId: string
  filename: string
  mediaType: "image" | "video"
  mimeType: string
  url: string
  expiresIn: number
}

type InboxTab = "pending" | "history"

function formatFileSize(bytes: number) {
  if (bytes >= 1024 ** 3) {
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

export default function MediaReviewInbox({
  files,
}: {
  files: MediaFile[]
}) {
  const router = useRouter()

  const [expanded, setExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<InboxTab>("pending")

  const [selected, setSelected] = useState<MediaFile | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [reviewing, setReviewing] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)

  const pendingFiles = files.filter(
    (file) => file.status === "pending"
  )

  const historyFiles = files.filter(
    (file) => file.status !== "pending"
  )

  const visibleFiles =
    activeTab === "pending" ? pendingFiles : historyFiles

  function closePreview() {
    if (reviewing) return

    setSelected(null)
    setPreview(null)
    setError(null)
    setReviewError(null)
  }

  useEffect(() => {
    if (!selected) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelected(null)
        setPreview(null)
      }
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [selected])

  async function openFile(file: MediaFile) {
    if (file.status === "uploading") return

    setSelected(file)
    setPreview(null)
    setError(null)
    setReviewError(null)
    setLoading(true)

    try {
      const response = await fetch(
        "/api/coach/media/preview",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fileId: file.id }),
          cache: "no-store",
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error || "Unable to load preview."
        )
      }

      setPreview(result as Preview)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load preview."
      )
    } finally {
      setLoading(false)
    }
  }

  async function reviewFile(
    decision: "approved" | "rejected"
  ) {
    if (
      !selected ||
      selected.status !== "pending" ||
      reviewing
    ) {
      return
    }

    const fileId = selected.id

    setReviewing(true)
    setReviewError(null)

    try {
      const response = await fetch(
        "/api/coach/media/review",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileId,
            decision,
          }),
          cache: "no-store",
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error || "Unable to review media."
        )
      }

      setSelected(null)
      setPreview(null)
      setError(null)

      router.refresh()
    } catch (err) {
      setReviewError(
        err instanceof Error
          ? err.message
          : "Unable to review media."
      )
    } finally {
      setReviewing(false)
    }
  }

  return (
    <>
      <div className="space-y-3">
        {/* COMPACT INBOX HEADER */}
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
          aria-controls="smc-incoming-media-list"
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3 text-left transition hover:border-smc-gold/30"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-smc-gold/20 bg-smc-gold/10 text-sm text-smc-gold">
              ▧
            </span>

            <div className="min-w-0">
              <p className="text-xs font-black text-white">
                Review Uploads
              </p>

              <p className="mt-1 text-[11px] text-white/40">
                {pendingFiles.length === 0
                  ? "All caught up — no pending reviews"
                  : `${pendingFiles.length} waiting for review`}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {pendingFiles.length > 0 && (
              <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-1 text-[10px] font-black text-amber-200">
                {pendingFiles.length} pending
              </span>
            )}

            <span className="text-lg text-smc-gold">
              {expanded ? "⌃" : "⌄"}
            </span>
          </div>
        </button>

        {/* COLLAPSIBLE CONTENT */}
        {expanded && (
          <div
            id="smc-incoming-media-list"
            className="space-y-3"
          >
            {/* PENDING / HISTORY TABS */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("pending")}
                aria-pressed={activeTab === "pending"}
                className={`rounded-lg px-4 py-2 text-xs font-black transition ${
                  activeTab === "pending"
                    ? "bg-smc-gold text-black"
                    : "border border-white/10 bg-white/[0.035] text-white/55 hover:text-white"
                }`}
              >
                Pending ({pendingFiles.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("history")}
                aria-pressed={activeTab === "history"}
                className={`rounded-lg px-4 py-2 text-xs font-black transition ${
                  activeTab === "history"
                    ? "bg-smc-gold text-black"
                    : "border border-white/10 bg-white/[0.035] text-white/55 hover:text-white"
                }`}
              >
                History ({historyFiles.length})
              </button>
            </div>

            {/* HEIGHT-LIMITED MEDIA LIST */}
            <div className="max-h-[360px] space-y-2 overflow-y-auto overscroll-contain pr-1">
              {visibleFiles.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.015] px-5 py-8 text-center">
                  <p className="text-sm font-bold text-white/70">
                    {activeTab === "pending"
                      ? "All caught up!"
                      : "No upload history yet."}
                  </p>

                  <p className="mt-2 text-xs text-white/40">
                    {activeTab === "pending"
                      ? "New uploads will appear here when ready for review."
                      : "Approved, rejected and uploading records will appear here."}
                  </p>
                </div>
              ) : (
                visibleFiles.map((file) => (
                  <button
                    key={file.id}
                    type="button"
                    disabled={file.status === "uploading"}
                    onClick={() => openFile(file)}
                    className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 text-left transition hover:border-smc-gold/30 hover:bg-smc-gold/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-smc-gold/15 bg-smc-gold/[0.06] text-xl">
                        {file.media_type === "video"
                          ? "🎥"
                          : "📷"}
                      </div>

                      <div className="min-w-0">
                        <p className="break-all text-sm font-bold text-white">
                          {file.display_name ||
                            file.original_filename}
                        </p>

                        <p className="mt-1 text-[11px] text-white/40">
                          {file.uploader_name ||
                            "Unknown uploader"}{" "}
                          · {formatFileSize(file.file_size_bytes)} ·{" "}
                          {formatDate(file.created_at)}
                        </p>

                        {(file.athlete_name ||
                          file.event_name) && (
                          <p className="mt-1 text-[10px] text-smc-gold/65">
                            {[
                              file.event_name,
                              file.athlete_name,
                            ]
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
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* EXISTING MEDIA PREVIEW */}
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Media preview"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
          onClick={closePreview}
        >
          <div
            className="w-full max-w-5xl overflow-hidden rounded-2xl border border-smc-gold/25 bg-[#090909] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 p-4">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-smc-gold">
                  SMC Media Review
                </p>

                <h2 className="mt-1 break-all text-sm font-bold text-white">
                  {selected.display_name ||
                    selected.original_filename}
                </h2>
              </div>

              <button
                type="button"
                onClick={closePreview}
                className="rounded-lg border border-white/10 px-3 py-2 text-sm font-bold text-white hover:bg-white/10"
              >
                Close ✕
              </button>
            </div>

            <div className="flex min-h-[250px] items-center justify-center bg-black p-4">
              {loading ? (
                <p className="text-sm text-smc-gold">
                  Loading secure preview...
                </p>
              ) : error ? (
                <p className="text-sm text-red-300">
                  {error}
                </p>
              ) : preview?.mediaType === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview.url}
                  alt={preview.filename}
                  className="max-h-[65vh] max-w-full object-contain"
                />
              ) : preview?.mediaType === "video" ? (
                <video
                  src={preview.url}
                  controls
                  playsInline
                  className="max-h-[65vh] max-w-full"
                />
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 p-4">
              <div>
                <p className="text-xs font-bold text-white">
                  {selected.uploader_name ||
                    "Unknown uploader"}
                </p>

                <p className="mt-1 text-xs text-white/40">
                  {selected.event_name || "No event"} ·{" "}
                  {formatFileSize(selected.file_size_bytes)}
                </p>
              </div>

              <span className="rounded-full border border-smc-gold/20 bg-smc-gold/10 px-3 py-1.5 text-[10px] font-black uppercase text-smc-gold">
                {selected.status}
              </span>
            </div>

            {selected.status === "pending" && (
              <div className="border-t border-white/10 p-4">
                {reviewError && (
                  <p
                    role="alert"
                    className="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300"
                  >
                    {reviewError}
                  </p>
                )}

                <div className="flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    disabled={
                      reviewing || loading || !preview
                    }
                    onClick={() => reviewFile("rejected")}
                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-xs font-black uppercase tracking-wider text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Reject
                  </button>

                  <button
                    type="button"
                    disabled={
                      reviewing || loading || !preview
                    }
                    onClick={() => reviewFile("approved")}
                    className="rounded-xl border border-green-500/30 bg-green-500/15 px-5 py-3 text-xs font-black uppercase tracking-wider text-green-300 transition hover:bg-green-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {reviewing ? "Saving..." : "Approve"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
