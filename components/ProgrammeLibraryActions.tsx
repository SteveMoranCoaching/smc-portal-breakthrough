"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { supabase } from "@/lib/supabase"

type ProgrammeLibraryActionsProps = {
  programmeId: string
  userId: string
  isActive: boolean
  programmeTitle: string
}

export default function ProgrammeLibraryActions({
  programmeId,
  userId,
  isActive,
  programmeTitle,
}: ProgrammeLibraryActionsProps) {
  const router = useRouter()
  const [isSettingActive, setIsSettingActive] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleSetActive() {
    if (isActive || isSettingActive) return

    setIsSettingActive(true)

    try {
      const { error: clearError } = await supabase
        .from("programmes")
        .update({ is_active: false })
        .eq("user_id", userId)

      if (clearError) throw clearError

      const { error: activeError } = await supabase
        .from("programmes")
        .update({ is_active: true })
        .eq("id", programmeId)

      if (activeError) throw activeError

      router.refresh()
    } catch (error: any) {
      console.error(error)
      alert(error?.message || "Could not set programme active.")
    } finally {
      setIsSettingActive(false)
    }
  }

  async function handleDelete() {
    if (isDeleting) return

    const confirmed = window.confirm(
      `Delete "${programmeTitle}"? This will also delete all sessions inside this programme.`
    )

    if (!confirmed) return

    setIsDeleting(true)

    try {
      const { data: deletedSessions, error: sessionsError } = await supabase
        .from("programme_sessions")
        .delete()
        .eq("programme_id", programmeId)
        .select("id")

      if (sessionsError) throw sessionsError

      const { data: deletedProgramme, error: programmeError } = await supabase
        .from("programmes")
        .delete()
        .eq("id", programmeId)
        .select("id")

      if (programmeError) throw programmeError

      if (!deletedProgramme || deletedProgramme.length === 0) {
        alert(
          "Delete request ran, but Supabase deleted 0 programmes. This is almost certainly an RLS delete policy issue."
        )
        return
      }

      console.log("Deleted sessions:", deletedSessions?.length ?? 0)
      console.log("Deleted programme:", deletedProgramme)

      router.refresh()
    } catch (error: any) {
      console.error(error)
      alert(error?.message || "Could not delete programme.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      {!isActive && (
        <button
          type="button"
          onClick={handleSetActive}
          disabled={isSettingActive || isDeleting}
          className="w-full rounded-full border border-smc-gold/25 bg-smc-gold/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-smc-gold transition hover:bg-smc-gold hover:text-black disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isSettingActive ? "Setting..." : "Set Active"}
        </button>
      )}

      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting || isSettingActive}
        className="w-full rounded-full border border-red-400/20 bg-red-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-red-200 transition hover:border-red-300/40 disabled:cursor-not-allowed disabled:opacity-45"
      >
        {isDeleting ? "Deleting..." : "Delete"}
      </button>
    </>
  )
}