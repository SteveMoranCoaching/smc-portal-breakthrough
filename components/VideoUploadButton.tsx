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
    <div className="mt-2">
      <label className="inline-block cursor-pointer rounded-lg border border-zinc-700 px-3 py-2 text-sm font-medium text-white hover:border-yellow-400 hover:text-yellow-400">
        {uploading ? "Uploading..." : "Upload video"}
        <input
          type="file"
          accept="video/*"
          onChange={handleUpload}
          className="hidden"
          disabled={uploading}
        />
      </label>

      {message && <p className="mt-1 text-xs text-zinc-500">{message}</p>}
    </div>
  )
}