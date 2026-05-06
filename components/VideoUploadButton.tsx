"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"

type Props = {
  programmeId: string
  sessionId: string
  exerciseName: string
  exerciseIndex: number
}

export default function VideoUploadButton({
  programmeId,
  sessionId,
  exerciseName,
  exerciseIndex,
}: Props) {
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState("")

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setMessage("Uploading...")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const filePath = `${user?.id || "test-user"}/${Date.now()}-${file.name}`

    const { error: uploadError } = await supabase.storage
      .from("exercise-videos")
      .upload(filePath, file)

    if (uploadError) {
      setMessage(`Upload failed: ${uploadError.message}`)
      setUploading(false)
      return
    }

    const { error: dbError } = await supabase.from("exercise_videos").insert({
      user_id: user?.id || null,
      programme_id: programmeId,
      session_id: sessionId,
      exercise_name: exerciseName,
      exercise_index: exerciseIndex,
      video_path: filePath,
    })

    if (dbError) {
      setMessage(`Saved video failed: ${dbError.message}`)
      setUploading(false)
      return
    }

    setMessage("Video uploaded ✅")
    setUploading(false)
  }

  return (
    <div className="mt-3">
      <label className="inline-flex w-full cursor-pointer items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm font-extrabold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-smc-gold/40 hover:bg-smc-gold/[0.08] hover:text-smc-gold active:scale-[0.98]">
        {uploading ? "Uploading..." : "Upload video"}
        <input
          type="file"
          accept="video/*"
          onChange={handleUpload}
          className="hidden"
          disabled={uploading}
        />
      </label>

      {message && (
        <p className="mt-2 text-xs font-medium text-white/45">{message}</p>
      )}
    </div>
  )
}