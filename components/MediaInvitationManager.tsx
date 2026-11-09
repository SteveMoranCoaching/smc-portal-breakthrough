
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type Invitation = {
  id: string
  title: string
  event_name: string | null
  description: string | null
  is_active: boolean
  expires_at: string | null
  max_files: number
  created_at: string
}

export default function MediaInvitationManager({
  invitations,
}: {
  invitations: Invitation[]
}) {
  const router = useRouter()

  const [title, setTitle] = useState("")
  const [eventName, setEventName] = useState("")
  const [description, setDescription] = useState("")
  const [expiryDays, setExpiryDays] = useState(7)
  const [maxFiles, setMaxFiles] = useState(100)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [uploadUrl, setUploadUrl] = useState("")
  const [copied, setCopied] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  async function createInvitation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (busy) return

    setBusy(true)
    setError("")
    setUploadUrl("")
    setCopied(false)

    try {
      const response = await fetch("/api/coach/media/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          action: "create",
          title,
          eventName,
          description,
          expiryDays,
          maxFiles,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Unable to create invitation.")
      }

      setUploadUrl(result.uploadUrl)
      setTitle("")
      setEventName("")
      setDescription("")
      setExpiryDays(7)
      setMaxFiles(100)

      router.refresh()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      )
    } finally {
      setBusy(false)
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(uploadUrl)
      setCopied(true)
    } catch {
      setError("Unable to copy automatically. Select the link instead.")
    }
  }

  async function revokeInvitation(id: string) {
    if (busy || revokingId) return

    const confirmed = window.confirm(
      "Revoke this invitation? Anyone using the link will be prevented from starting new uploads."
    )

    if (!confirmed) return

    setRevokingId(id)
    setError("")

    try {
      const response = await fetch("/api/coach/media/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action: "revoke", id }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Unable to revoke invitation.")
      }

      router.refresh()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to revoke invitation."
      )
    } finally {
      setRevokingId(null)
    }
  }

  const inputClass =
    "w-full min-h-11 rounded-xl border border-white/[0.1] bg-black/60 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-smc-gold/50"

  const labelClass =
    "mb-1.5 block text-[10px] font-black uppercase tracking-[0.15em] text-white/55"

  return (
    <div className="space-y-5">
      <section className="rounded-[1.25rem] border border-white/[0.08] bg-black p-4 sm:p-6">
        <p className="text-[9px] font-black uppercase tracking-[0.24em] text-smc-gold">
          Share & Collect
        </p>

        <h2 className="mt-1 text-xl font-black text-white">
          Create Upload Invitation
        </h2>

        <p className="mt-2 text-sm text-white/45">
          Create a private upload link for an event. Guests won't need
          an account.
        </p>

        <form onSubmit={createInvitation} className="mt-5 space-y-4">
          <div>
            <label htmlFor="media-title" className={labelClass}>
              Invitation Title
            </label>
            <input
              id="media-title"
              className={inputClass}
              placeholder="e.g. NCL Stag Qualifier Footage"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              required
            />
          </div>

          <div>
            <label htmlFor="media-event" className={labelClass}>
              Event Name (Optional)
            </label>
            <input
              id="media-event"
              className={inputClass}
              placeholder="e.g. NCL Stag Qualifier"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              maxLength={120}
            />
          </div>

          <div>
            <label htmlFor="media-description" className={labelClass}>
              Description (Optional)
            </label>
            <textarea
              id="media-description"
              className={`${inputClass} min-h-20 resize-y`}
              placeholder="A little context for the invitation..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="media-expiry" className={labelClass}>
                Expires After
              </label>
              <select
                id="media-expiry"
                className={inputClass}
                value={expiryDays}
                onChange={(e) => setExpiryDays(Number(e.target.value))}
              >
                <option value={1}>1 day</option>
                <option value={3}>3 days</option>
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
              </select>
            </div>

            <div>
              <label htmlFor="media-max-files" className={labelClass}>
                Maximum Files
              </label>
              <input
                id="media-max-files"
                type="number"
                min={1}
                max={1000}
                step={1}
                className={inputClass}
                value={maxFiles}
                onChange={(e) => setMaxFiles(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="rounded-xl border border-smc-gold/15 bg-smc-gold/[0.05] p-3">
            <p className="text-xs font-bold text-smc-gold">
              Private Storage · Original Quality
            </p>
            <p className="mt-1 text-xs leading-5 text-white/45">
              Maximum 1 GB per file. All uploads require coach approval.
              Invitations can be revoked at any time.
            </p>
          </div>

          <button
            type="submit"
            disabled={busy || !title.trim()}
            className="min-h-11 w-full rounded-xl bg-smc-gold px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Creating Invitation..." : "Generate Secure Upload Link"}
          </button>
        </form>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        {uploadUrl && (
          <div className="mt-5 rounded-xl border border-green-500/25 bg-green-500/[0.07] p-4">
            <p className="text-sm font-black text-green-300">
              Invitation Created Successfully
            </p>

            <p className="mt-2 text-xs leading-5 text-white/55">
              Copy and save this link now. For security, it cannot be
              retrieved again after you leave this page.
            </p>

            <input
              readOnly
              aria-label="New upload invitation URL"
              value={uploadUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="mt-3 w-full rounded-lg border border-white/10 bg-black/60 p-3 text-xs text-white"
            />

            <button
              type="button"
              onClick={copyLink}
              className="mt-3 min-h-10 rounded-xl bg-green-400 px-5 py-2 text-xs font-black text-black"
            >
              {copied ? "Copied!" : "Copy Upload Link"}
            </button>
          </div>
        )}
      </section>

      <section className="rounded-[1.25rem] border border-white/[0.08] bg-black p-4 sm:p-6">
        <div className="mb-4">
          <p className="text-[9px] font-black uppercase tracking-[0.24em] text-smc-gold">
            Invitation Library
          </p>
          <h2 className="mt-1 text-xl font-black text-white">
            Existing Invitations
          </h2>
          <p className="mt-1 text-xs text-white/40">
            {invitations.length} invitations
          </p>
        </div>

        {invitations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-white/40">
            No invitations created yet.
          </div>
        ) : (
          <div className="space-y-2">
            {invitations.map((invitation) => {
              const expired =
                !!invitation.expires_at &&
                new Date(invitation.expires_at).getTime() <= Date.now()

              const active = invitation.is_active && !expired

              return (
                <div
                  key={invitation.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.025] p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-black text-white">
                      {invitation.title}
                    </p>

                    {invitation.event_name && (
                      <p className="mt-1 text-xs text-smc-gold/75">
                        {invitation.event_name}
                      </p>
                    )}

                    <p className="mt-1 text-[11px] text-white/40">
                      {invitation.max_files} file limit ·{" "}
                      {invitation.expires_at
                        ? `Expires ${new Date(
                            invitation.expires_at
                          ).toLocaleString("en-GB")}`
                        : "No expiry"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${
                        active
                          ? "border-green-500/25 bg-green-500/10 text-green-300"
                          : "border-white/10 bg-white/5 text-white/40"
                      }`}
                    >
                      {!invitation.is_active
                        ? "Revoked"
                        : expired
                          ? "Expired"
                          : "Active"}
                    </span>

                    {invitation.is_active && (
                      <button
                        type="button"
                        disabled={revokingId !== null}
                        onClick={() => revokeInvitation(invitation.id)}
                        className="min-h-9 rounded-lg border border-red-500/25 bg-red-500/10 px-3 text-xs font-bold text-red-300 disabled:opacity-40"
                      >
                        {revokingId === invitation.id
                          ? "Revoking..."
                          : "Revoke"}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
