
"use client"

import { useEffect, useState } from "react"

type InvitationDetails = {
  title: string
  description: string | null
  eventName: string | null
  expiresAt: string | null
  maxFileSizeBytes: number
  remainingFiles: number
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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  useEffect(() => {
    let cancelled = false

    async function loadInvitation() {
      try {
        const response = await fetch("/api/media/invitation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
          cache: "no-store",
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(
            result.error || "Unable to load invitation."
          )
        }

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
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadInvitation()

    return () => {
      cancelled = true
    }
  }, [token])

  const maxFileBytes =
    invitation?.maxFileSizeBytes || 1073741824

  function handleFiles(files: FileList | null) {
    if (!files) return

    setError("")

    const incoming = Array.from(files)

    const invalidFile = incoming.find(
      (file) =>
        (!file.type.startsWith("image/") &&
          !file.type.startsWith("video/")) ||
        file.size > maxFileBytes ||
        file.size === 0
    )

    if (invalidFile) {
      setError(
        `${invalidFile.name} isn't a supported image/video or exceeds the 1 GB limit.`
      )
      return
    }

    const combined = [...selectedFiles, ...incoming]

    if (
      invitation &&
      combined.length > invitation.remainingFiles
    ) {
      setError(
        `This invitation has space for ${invitation.remainingFiles} more files.`
      )
      return
    }

    setSelectedFiles(combined)
  }

  function removeFile(index: number) {
    setSelectedFiles((current) =>
      current.filter((_, i) => i !== index)
    )
  }

  function formatSize(bytes: number) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
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
            <h2 className="text-xl font-black text-white">
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
                You're Invited
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
                Share your photos and videos in their original quality.
                No account required.
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
                    onChange={(e) => setUploaderName(e.target.value)}
                    placeholder="Who's uploading?"
                    maxLength={120}
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
                    onChange={(e) => setAthleteName(e.target.value)}
                    placeholder="Who's in the footage?"
                    maxLength={120}
                    className="min-h-12 w-full rounded-xl border border-white/10 bg-black px-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-smc-gold/50"
                  />
                </div>
              </div>

              <label className="flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-smc-gold/25 bg-smc-gold/[0.035] p-6 text-center transition hover:border-smc-gold/50">
                <span className="text-4xl">⬆</span>

                <span className="mt-3 text-sm font-black text-white">
                  Choose Photos & Videos
                </span>

                <span className="mt-2 text-xs text-white/40">
                  Multiple files supported · 1 GB maximum per file
                </span>

                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    handleFiles(e.target.files)
                    e.target.value = ""
                  }}
                />
              </label>

              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-white/60">
                    {selectedFiles.length} selected files
                  </p>

                  {selectedFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-white">
                          {file.type.startsWith("video/")
                            ? "🎥"
                            : "📷"}{" "}
                          {file.name}
                        </p>

                        <p className="mt-1 text-[10px] text-white/40">
                          {formatSize(file.size)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="shrink-0 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-xl border border-smc-gold/15 bg-smc-gold/[0.04] p-3">
                <p className="text-xs font-bold text-smc-gold">
                  Private & Original Quality
                </p>

                <p className="mt-1 text-xs leading-5 text-white/45">
                  Your files will be sent privately to Steve Moran
                  Coaching for review and potential use in competition
                  highlights and promotional content.
                </p>
              </div>

              <button
                type="button"
                disabled
                className="min-h-12 w-full cursor-not-allowed rounded-xl bg-smc-gold px-5 py-3 text-sm font-black uppercase tracking-[0.1em] text-black opacity-45"
              >
                Upload Footage — Coming Next
              </button>

              <p className="text-center text-[11px] text-white/30">
                Uploads will be enabled once secure storage
                authorisation is connected.
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
