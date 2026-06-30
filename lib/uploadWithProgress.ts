import { supabase } from "@/lib/supabase"

type UploadWithProgressArgs = {
  bucket: string
  file: File
  path: string
  accessToken?: string
  onProgress?: (progress: {
    percentage: number
    uploadedBytes: number
    totalBytes: number
    secondsRemaining: number | null
  }) => void
}

export function formatSecondsRemaining(seconds: number | null) {
  if (!seconds || !Number.isFinite(seconds)) return "Calculating..."
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))}s left`

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)

  return `${minutes}m ${remainingSeconds}s left`
}

export async function uploadWithProgress({
  bucket,
  file,
  path,
  onProgress,
}: UploadWithProgressArgs) {
  const startTime = Date.now()
  let simulatedProgress = 0

  const interval = window.setInterval(() => {
    simulatedProgress = Math.min(simulatedProgress + 3, 92)

    const uploadedBytes = Math.round(file.size * (simulatedProgress / 100))
    const elapsedSeconds = (Date.now() - startTime) / 1000
    const bytesPerSecond =
      elapsedSeconds > 0 ? uploadedBytes / elapsedSeconds : 0

    const remainingBytes = file.size - uploadedBytes
    const secondsRemaining =
      bytesPerSecond > 0 ? remainingBytes / bytesPerSecond : null

    onProgress?.({
      percentage: simulatedProgress,
      uploadedBytes,
      totalBytes: file.size,
      secondsRemaining,
    })
  }, 600)

  try {
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: true,
      cacheControl: "3600",
    })

    if (error) throw error

    onProgress?.({
      percentage: 100,
      uploadedBytes: file.size,
      totalBytes: file.size,
      secondsRemaining: 0,
    })
  } finally {
    window.clearInterval(interval)
  }
}