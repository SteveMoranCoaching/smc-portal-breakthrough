
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createSupabaseClient } from "@/lib/supabase"

type Props = {
  enquiryId: string
  initialStatus: string
  initialNotes: string
}

const statuses = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "consultation", label: "Consultation" },
  { value: "converted", label: "Converted" },
  { value: "closed", label: "Closed" },
]

export default function EnquiryManagement({
  enquiryId,
  initialStatus,
  initialNotes,
}: Props) {
  const router = useRouter()
  const [status, setStatus] = useState(initialStatus)
  const [notes, setNotes] = useState(initialNotes)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [isError, setIsError] = useState(false)

  async function saveChanges() {
    setSaving(true)
    setMessage("")
    setIsError(false)

    try {
      const supabase = createSupabaseClient()

      const { data, error } = await supabase
        .from("coaching_enquiries")
        .update({
          status,
          coach_notes: notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", enquiryId)
        .select("id")
        .single()

      if (error || !data) {
        throw new Error("Unable to save changes.")
      }

      setMessage("Changes saved successfully.")
      router.refresh()
    } catch {
      setIsError(true)
      setMessage("Unable to save changes. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-5">
      <h2 className="text-lg font-bold">
        Enquiry Management
      </h2>

      <p className="mt-2 text-sm text-white/50">
        Manage this enquiry and record private coaching notes.
      </p>

      <div className="mt-5 space-y-5">
        <div>
          <label
            htmlFor="enquiry-status"
            className="mb-2 block text-sm font-semibold"
          >
            Enquiry Status
          </label>

          <select
            id="enquiry-status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="w-full rounded-xl border border-white/20 bg-neutral-950 px-4 py-3 text-sm text-white"
          >
            {statuses.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="enquiry-notes"
            className="mb-2 block text-sm font-semibold"
          >
            Private Coach Notes
          </label>

          <textarea
            id="enquiry-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={5}
            maxLength={5000}
            placeholder="Consultation notes, follow-up dates, coaching preferences..."
            className="w-full resize-y rounded-xl border border-white/20 bg-neutral-950 px-4 py-3 text-sm leading-6 text-white placeholder:text-white/30"
          />

          <p className="mt-2 text-xs text-white/40">
            Only coaches with database access can view these notes.
          </p>
        </div>

        {message && (
          <p
            role="status"
            className={`text-sm ${
              isError ? "text-red-400" : "text-green-400"
            }`}
          >
            {message}
          </p>
        )}

        <button
          type="button"
          onClick={saveChanges}
          disabled={saving}
          className="rounded-xl bg-amber-400 px-6 py-3 text-sm font-bold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </section>
  )
}
