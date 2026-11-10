
"use client"

import { useEffect, useRef, useState } from "react"
import * as tus from "tus-js-client"

type InvitationDetails = {
  title: string
  description: string | null
  eventName: string | null
  expiresAt: string | null
  maxFileSizeBytes: number
  remainingFiles: number
}

type UploadStatus =
  | "ready"
  | "reserving"
  | "uploading"
  | "verifying"
  | "complete"
  | "failed"

type UploadItem = {
  id: string
  file: File
  status: UploadStatus
  progress: number
  error?: string
}

const MAX_FILE_SIZE = 1073741824
const BUCKET = "smc-media"
const TUS_ENDPOINT =
  "https://kxnjumpwcnktpqtunndh.storage.supabase.co/storage/v1/upload/resumable/sign"

function formatSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

async function postJSON(
  endpoint: string,
  body: Record<string, unknown>
) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    credentials: "same-origin",
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(
      typeof result.error === "string"
        ? result.error
        : "Request failed."
    )
  }

  return result
}

export default function MediaGuestPage({
  token,
}: {
  token: string
}) {
  const [invitation, setInvitation] =
    useState<InvitationDetails | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [uploaderName, setUploaderName] = useState("")
  const [athleteName, setAthleteName] = useState("")
  const [items, setItems] = useState<UploadItem[]>([])
  const [uploading, setUploading] = useState(false)
  const [finished, setFinished] = useState(false)

  const activeUpload = useRef<tus.Upload | null>(null)
  const running = useRef(false)

  useEffect(() => {
    let cancelled = false

    async function loadInvitation() {
      try {
        const result = await postJSON(
          "/api/media/invitation",
          { token }
        )

        if (!cancelled) {
          setInvitation(result.invitation)
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load invitation."
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadInvitation()

    return () => {
      cancelled = true
      activeUpload.current?.abort()
    }
  }, [token])

  function updateItem(
    id: string,
    changes: Partial<UploadItem>
  ) {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, ...changes } : item
      )
    )
  }

  function handleFiles(files: FileList | null) {
    if (!files || uploading) return

    setError("")

    const incoming = Array.from(files)
    const limit = Math.min(
      invitation?.maxFileSizeBytes ?? MAX_FILE_SIZE,
      MAX_FILE_SIZE
    )

    const invalid = incoming.find(
      (file) =>
        file.size === 0 ||
        file.size > limit ||
        (!file.type.startsWith("image/") &&
          !file.type.startsWith("video/"))
    )

    if (invalid) {
      setError(
        `${invalid.name} is unsupported, empty or exceeds the ${formatSize(limit)} file limit.`
      )
      return
    }

    if (
      invitation &&
      items.length + incoming.length >
        invitation.remainingFiles
    ) {
      setError(
        `This invitation has space for ${invitation.remainingFiles} files.`
      )
      return
    }

    setItems((current) => [
      ...current,
      ...incoming.map((file) => ({
        id: crypto.randomUUID(),
        file,
        status: "ready" as const,
        progress: 0,
      })),
    ])
  }

  function removeFile(id: string) {
    if (uploading) return

    setItems((current) =>
      current.filter((item) => item.id !== id)
    )
  }

  function uploadWithTus(
    file: File,
    storagePath: string,
    uploadToken: string,
    itemId: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const upload = new tus.Upload(file, {
        endpoint: TUS_ENDPOINT,
        headers: {
          "x-signature": uploadToken,
        },
        metadata: {
          bucketName: BUCKET,
          objectName: storagePath,
          contentType: file.type,
          cacheControl: "3600",
        },
        chunkSize: 6 * 1024 * 1024,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        storeFingerprintForResuming: false,
        onProgress(bytesUploaded, bytesTotal) {
          const progress =
            bytesTotal > 0
              ? Math.round(
                  (bytesUploaded / bytesTotal) * 100
                )
              : 0

          updateItem(itemId, { progress })
        },
        onError(uploadError) {
          activeUpload.current = null
          reject(uploadError)
        },
        onSuccess() {
          activeUpload.current = null
          resolve()
        },
      })

      activeUpload.current = upload
      upload.start()
    })
  }

  async function uploadOne(item: UploadItem) {
    updateItem(item.id, {
      status: "reserving",
      progress: 0,
      error: undefined,
    })

    const reservation = await postJSON(
      "/api/media/reserve",
      {
        token,
        filename: item.file.name,
        mimeType: item.file.type,
        fileSize: item.file.size,
        uploaderName: uploaderName.trim(),
        athleteName: athleteName.trim() || null,
      }
    )

    if (
      typeof reservation.fileId !== "string" ||
      reservation.bucket !== BUCKET ||
      typeof reservation.storagePath !== "string" ||
      typeof reservation.uploadToken !== "string"
    ) {
      throw new Error("Invalid upload reservation.")
    }

    updateItem(item.id, { status: "uploading" })

    await uploadWithTus(
      item.file,
      reservation.storagePath,
      reservation.uploadToken,
      item.id
    )

    updateItem(item.id, {
      status: "verifying",
      progress: 100,
    })

    const result = await postJSON(
      "/api/media/complete",
      {
        token,
        fileId: reservation.fileId,
      }
    )

    if (
      result.success !== true ||
      result.status !== "pending"
    ) {
      throw new Error("Upload verification failed.")
    }

    updateItem(item.id, {
      status: "complete",
      progress: 100,
    })
  }

  async function handleUpload() {
    if (running.current || !invitation) return

    if (!uploaderName.trim()) {
      setError("Please enter your name.")
      return
    }

    const queue = items.filter(
      (item) => item.status === "ready"
    )

    if (queue.length === 0) {
      setError("Please select at least one file.")
      return
    }

    running.current = true
    setUploading(true)
    setFinished(false)
    setError("")

    let failures = 0

    try {
      for (const item of queue) {
        try {
          await uploadOne(item)
        } catch (err) {
          failures++

          updateItem(item.id, {
            status: "failed",
            error:
              err instanceof Error
                ? err.message
                : "Upload failed.",
          })
        }
      }

      setFinished(failures === 0)
      if (failures > 0) {
        setError(
          `${failures} file(s) could not be completed. Failed reservations may require a fresh invitation or cleanup before retrying.`
        )
      }
    } finally {
      running.current = false
      setUploading(false)
    }
  }

  const completedCount = items.filter(
    (item) => item.status === "complete"
  ).length

  const statusLabel: Record<UploadStatus, string> = {
    ready: "Ready",
    reserving: "Preparing secure upload...",
    uploading: "Uploading...",
    verifying: "Verifying upload...",
    complete: "Submitted for review",
    failed: "Upload failed",
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-4 py-8 text-white sm:px-6 sm:py-12">
      <div className="pointer-events-none absolute left-1/2 top-[-200px] h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-smc-gold/[0.12] blur-[130px]" />

      <div className="relative mx-auto max-w-[760px] space-y-5">
        <header className="overflow-hidden rounded-[1.5rem] border border-smc-gold/25 bg-[linear-gradient(135deg,#080808,#171306)] p-6 text-center sm:p-9">
          <p className="text-[11px] font-black uppercase tracking-[0.35em] text-smc-gold">
            Steve Moran Coaching
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
            SMC MEDIA DROP
          </h1>

          <p className="mt-3 text-sm text-white/50">
            Your moments. Our memories.
          </p>

          <div className="mx-auto mt-6 h-px max-w-[180px] bg-smc-gold/30" />

          <p className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-smc-gold/70">
            Original Quality · Private Uploads
          </p>
        </header>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-10 text-center text-sm text-white/50">
            Checking your invitation...
          </div>
        ) : !invitation ? (
          <div className="rounded-2xl border border-red-500/25 bg-red-500/[0.06] p-6 text-center">
            <h2 className="text-xl font-black">
              Invitation Unavailable
            </h2>
            <p className="mt-3 text-sm text-red-300">
              {error || "This invitation is no longer available."}
            </p>
          </div>
        ) : (
          <>
            <section className="rounded-[1.25rem] border border-white/[0.08] bg-[#080808] p-5 sm:p-7">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-smc-gold">
                You&apos;re Invited
              </p>

              <h2 className="mt-2 text-2xl font-black">
                {invitation.eventName || invitation.title}
              </h2>

              {invitation.description && (
                <p className="mt-3 text-sm leading-6 text-white/55">
                  {invitation.description}
                </p>
              )}

              <p className="mt-4 text-xs text-white/40">
                Share your photos and videos in their original
                quality. No account required.
              </p>
            </section>

            <section className="space-y-5 rounded-[1.25rem] border border-white/[0.08] bg-[#080808] p-5 sm:p-7">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-smc-gold">
                  Your Upload
                </p>
                <h2 className="mt-1 text-xl font-black">
                  Add Your Footage
                </h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="media-uploader"
                    className="mb-2 block text-xs font-bold text-white/60"
                  >
                    Your Name *
                  </label>

                  <input
                    id="media-uploader"
                    value={uploaderName}
                    onChange={(e) =>
                      setUploaderName(e.target.value)
                    }
                    disabled={uploading}
                    maxLength={120}
                    placeholder="Who's uploading?"
                    className="min-h-12 w-full rounded-xl border border-white/10 bg-black px-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-smc-gold/50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="media-athlete"
                    className="mb-2 block text-xs font-bold text-white/60"
                  >
                    Athlete Name (Optional)
                  </label>

                  <input
                    id="media-athlete"
                    value={athleteName}
                    onChange={(e) =>
                      setAthleteName(e.target.value)
                    }
                    disabled={uploading}
                    maxLength={120}
                    placeholder="Who's in the footage?"
                    className="min-h-12 w-full rounded-xl border border-white/10 bg-black px-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-smc-gold/50"
                  />
                </div>
              </div>

              <label
                className={`flex min-h-[150px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-smc-gold/25 bg-smc-gold/[0.035] p-6 text-center transition ${
                  uploading
                    ? "cursor-not-allowed opacity-50"
                    : "cursor-pointer hover:border-smc-gold/50"
                }`}
              >
                <span className="text-4xl">⬆</span>

                <span className="mt-3 text-sm font-black">
                  Choose Photos &amp; Videos
                </span>

                <span className="mt-2 text-xs text-white/40">
                  Multiple files supported · Up to{" "}
                  {formatSize(
                    Math.min(
                      invitation.maxFileSizeBytes,
                      MAX_FILE_SIZE
                    )
                  )}{" "}
                  per file
                </span>

                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  disabled={uploading}
                  className="hidden"
                  onChange={(e) => {
                    handleFiles(e.target.files)
                    e.target.value = ""
                  }}
                />
              </label>

              {items.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-white/60">
                    {items.length} selected files
                  </p>

                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold">
                            {item.file.type.startsWith("video/")
                              ? "🎥"
                              : "📷"}{" "}
                            {item.file.name}
                          </p>

                          <p className="mt-1 text-[10px] text-white/40">
                            {formatSize(item.file.size)} ·{" "}
                            {statusLabel[item.status]}
                          </p>
                        </div>

                        {item.status === "ready" &&
                          !uploading && (
                            <button
                              type="button"
                              onClick={() =>
                                removeFile(item.id)
                              }
                              className="shrink-0 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300"
                            >
                              Remove
                            </button>
                          )}
                      </div>

                      {(item.status === "uploading" ||
                        item.status === "verifying" ||
                        item.status === "complete") && (
                        <div className="mt-3">
                          <div className="h-2 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-smc-gold transition-all duration-200"
                              style={{
                                width: `${item.progress}%`,
                              }}
                            />
                          </div>
                          <p className="mt-1 text-right text-[10px] text-smc-gold">
                            {item.progress}%
                          </p>
                        </div>
                      )}

                      {item.error && (
                        <p className="mt-2 text-xs text-red-300">
                          {item.error}
                        </p>
                      )}
                    </div>
                  ))}

                  {completedCount > 0 && (
                    <p className="text-xs font-bold text-smc-gold">
                      {completedCount} file(s) submitted for
                      review.
                    </p>
                  )}
                </div>
              )}

              <div className="rounded-xl border border-smc-gold/15 bg-smc-gold/[0.04] p-3">
                <p className="text-xs font-bold text-smc-gold">
                  Private &amp; Original Quality
                </p>

                <p className="mt-1 text-xs leading-5 text-white/45">
                  Your files will be sent privately to Steve
                  Moran Coaching for review and potential use
                  in competition highlights and promotional
                  content.
                </p>
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-xl border border-red-500/25 bg-red-500/[0.06] p-3 text-xs text-red-300"
                >
                  {error}
                </p>
              )}

              {finished && (
                <div className="rounded-xl border border-smc-gold/30 bg-smc-gold/[0.08] p-4 text-center">
                  <p className="font-black text-smc-gold">
                    Upload Complete!
                  </p>
                  <p className="mt-2 text-xs text-white/60">
                    Your footage has been submitted for review.
                    Thank you for sharing!
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={handleUpload}
                disabled={
                  uploading ||
                  !uploaderName.trim() ||
                  !items.some(
                    (item) => item.status === "ready"
                  )
                }
                className="min-h-12 w-full rounded-xl bg-smc-gold px-5 py-3 text-sm font-black uppercase tracking-[0.1em] text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {uploading
                  ? "Uploading Footage..."
                  : "Upload Footage"}
              </button>

              <p className="text-center text-[11px] text-white/30">
                Files are uploaded privately and submitted for
                review before appearing in the Media Manager.
              </p>
            </section>
          </>
        )}

        <footer className="pb-4 pt-3 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-smc-gold/60">
            SMC · Strength · Community · Progress
          </p>

          <a
            href="https://stevemorancoaching.com"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-xs text-white/35 underline decoration-white/15 underline-offset-4 transition hover:text-smc-gold"
          >
            Discover Steve Moran Coaching
          </a>
        </footer>
      </div>
    </main>
  )
}
