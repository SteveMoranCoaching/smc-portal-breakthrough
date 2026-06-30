"use client"

import { ChangeEvent, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import {
  formatSecondsRemaining,
  uploadWithProgress,
} from "@/lib/uploadWithProgress"

type UploadedFile = {
  path: string
  name: string
  type: "image" | "video" | "file"
  size: number
}

type UploadStats = {
  percentage: number
  uploadedBytes: number
  totalBytes: number
  secondsRemaining: number | null
}

function formatMb(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

function formatUploadSpeed(bytesPerSecond: number | null) {
  if (!bytesPerSecond || !Number.isFinite(bytesPerSecond)) {
    return "Calculating speed..."
  }

  return `${(bytesPerSecond / 1024 / 1024).toFixed(1)}MB/s`
}

function getFileKind(file: File): UploadedFile["type"] {
  if (file.type.startsWith("image/")) return "image"
  if (file.type.startsWith("video/")) return "video"
  return "file"
}

function getFileIcon(type: UploadedFile["type"] | null) {
  if (type === "image") return "📷"
  if (type === "video") return "🎥"
  if (type === "file") return "📎"
  return "⬆️"
}

export default function FileUploader({
  bucket,
  pathPrefix,
  accept = "image/*,video/*",
  label = "Add file",
  buttonLabel = "Choose file",
  maxImageMb = 20,
  maxVideoMb = 500,
  maxFileMb = 50,
  disabled = false,
  onUploaded,
  onClear,
}: {
  bucket: string
  pathPrefix: string
  accept?: string
  label?: string
  buttonLabel?: string
  maxImageMb?: number
  maxVideoMb?: number
  maxFileMb?: number
  disabled?: boolean
  onUploaded: (file: UploadedFile) => void
  onClear?: () => void
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [stats, setStats] = useState<UploadStats | null>(null)
  const [speed, setSpeed] = useState<number | null>(null)
  const [error, setError] = useState("")
  const [uploaded, setUploaded] = useState<UploadedFile | null>(null)

  function getMaxSizeMb(file: File) {
    if (file.type.startsWith("image/")) return maxImageMb
    if (file.type.startsWith("video/")) return maxVideoMb
    return maxFileMb
  }

  function clear() {
    setFile(null)
    setUploaded(null)
    setStats(null)
    setSpeed(null)
    setError("")

    if (inputRef.current) {
      inputRef.current.value = ""
    }

    onClear?.()
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] || null

    setError("")
    setStats(null)
    setSpeed(null)
    setUploaded(null)

    if (!selectedFile) {
      clear()
      return
    }

    const maxSizeMb = getMaxSizeMb(selectedFile)
    const maxSizeBytes = maxSizeMb * 1024 * 1024

    if (selectedFile.size > maxSizeBytes) {
      setError(`File is too large. Max size is ${maxSizeMb}MB.`)
      event.target.value = ""
      return
    }

    setFile(selectedFile)
    setUploading(true)

    const uploadStartTime = Date.now()

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const accessToken = session?.access_token

      if (!accessToken) {
        setError("Upload failed: session expired. Please refresh and try again.")
        return
      }

      const safeFileName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "-")
      const filePath = `${pathPrefix}/${Date.now()}-${safeFileName}`

      await uploadWithProgress({
        bucket,
        file: selectedFile,
        path: filePath,
        accessToken,
        onProgress: (uploadProgress) => {
          const elapsedSeconds = (Date.now() - uploadStartTime) / 1000
          const uploadSpeed =
            elapsedSeconds > 0
              ? uploadProgress.uploadedBytes / elapsedSeconds
              : null

          setStats(uploadProgress)
          setSpeed(uploadSpeed)
        },
      })

      const uploadedFile: UploadedFile = {
        path: filePath,
        name: selectedFile.name,
        type: getFileKind(selectedFile),
        size: selectedFile.size,
      }

      setUploaded(uploadedFile)
      setStats({
        percentage: 100,
        uploadedBytes: selectedFile.size,
        totalBytes: selectedFile.size,
        secondsRemaining: 0,
      })
      onUploaded(uploadedFile)
    } catch (uploadError: any) {
      setError(
        uploadError?.message
          ? `Upload failed: ${uploadError.message}`
          : "Upload failed. Please try again."
      )
    } finally {
      setUploading(false)
    }
  }

  const fileType = file ? getFileKind(file) : uploaded?.type || null
  const percentage = stats?.percentage || 0
  const uploadedBytes = stats?.uploadedBytes || 0
  const totalBytes = stats?.totalBytes || file?.size || uploaded?.size || 0

  return (
    <div
      className={`overflow-hidden rounded-[1rem] border bg-[#05070c] transition ${
        error
          ? "border-red-500/30"
          : uploaded
            ? "border-green-500/30"
            : uploading
              ? "border-smc-gold/35"
              : "border-white/[0.07]"
      }`}
    >
      <label
        className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-sm ${
          disabled || uploading ? "pointer-events-none opacity-75" : ""
        }`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.85rem] border border-white/[0.06] bg-black/35 text-base">
            {getFileIcon(fileType)}
          </span>

          <div className="min-w-0">
            <p className="truncate font-black text-white/85">
              {file ? file.name : label}
            </p>

            <p className="mt-0.5 text-[10px] font-semibold text-white/35">
              {file
                ? `${formatMb(file.size)} ${uploaded ? "uploaded" : uploading ? "uploading" : "selected"}`
                : `Images up to ${maxImageMb}MB · videos up to ${maxVideoMb}MB`}
            </p>
          </div>
        </div>

        <span
          className={`shrink-0 rounded-[0.85rem] px-3 py-2 text-[11px] font-black ${
            uploaded
              ? "bg-green-400 text-black"
              : uploading
                ? "border border-smc-gold/30 bg-smc-gold/10 text-smc-gold"
                : "bg-smc-gold text-black"
          }`}
        >
          {uploaded ? "Add another file" : uploading ? `${percentage}%` : buttonLabel}
        </span>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled || uploading}
        />
      </label>

      {(uploading || uploaded) && (
        <div className="border-t border-white/[0.06] px-3 pb-3 pt-2.5">
          <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                uploaded ? "bg-green-400" : "bg-smc-gold"
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] font-semibold text-white/40">
            <p>
              {formatMb(uploadedBytes)} / {formatMb(totalBytes)}
            </p>

            <p className="text-right">
              {uploaded
                ? "Upload complete"
                : formatSecondsRemaining(stats?.secondsRemaining || null)}
            </p>

            <p>{formatUploadSpeed(speed)}</p>

            <p className="text-right">
              {uploading ? "Keep this page open" : "Ready to send"}
            </p>
          </div>
        </div>
      )}

      {file && !uploading && (
        <div className="border-t border-white/[0.06] px-3 py-2">
          <button
            type="button"
            onClick={clear}
            disabled={disabled}
            className="text-xs font-semibold text-white/45 underline disabled:opacity-50"
          >
            Remove file
          </button>
        </div>
      )}

      {error && (
        <div className="border-t border-red-500/20 bg-red-500/10 px-3 py-2.5">
          <p className="text-xs font-semibold text-red-300">{error}</p>
        </div>
      )}
    </div>
  )
}