"use client"

import FileUploader from "@/components/FileUploader"

type UploadedVideo = {
  path: string
  name: string
  type: "image" | "video" | "file"
  size: number
}

type WorkoutVideoUploaderProps = {
  userId: string
  sessionId: string
  exerciseIndex: number
  videos: UploadedVideo[]
  disabled?: boolean
  onUploaded: (video: UploadedVideo) => void
  onClear: () => void
  onRemove: (videoIndex: number) => void
}

export default function WorkoutVideoUploader({
  userId,
  sessionId,
  exerciseIndex,
  videos,
  disabled = false,
  onUploaded,
  onClear,
  onRemove,
}: WorkoutVideoUploaderProps) {
  return (
    <details className="mt-2 rounded-xl border border-white/[0.055] bg-black/20">
      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/45">
            Training Video
          </p>

          {videos.length > 0 && (
            <p className="mt-0.5 text-[10px] text-smc-gold/65">
              {videos.length} {videos.length === 1 ? "video" : "videos"} attached
            </p>
          )}
        </div>

        <span className="text-sm font-black text-white/30">
          {videos.length > 0 ? "✓" : "＋"}
        </span>
      </summary>

      <div className="border-t border-white/[0.05] p-2">
        <FileUploader
          bucket="exercise-videos"
          pathPrefix={`${userId}/${sessionId}/${exerciseIndex}`}
          accept="video/*"
          label="Add training video"
          buttonLabel="Choose video"
          maxVideoMb={500}
          disabled={disabled}
          onUploaded={onUploaded}
          onClear={onClear}
        />

        {videos.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {videos.map((video, videoIndex) => (
              <div
                key={`${video.path}-${videoIndex}`}
                className="flex min-h-9 items-center justify-between gap-2 rounded-xl border border-smc-gold/20 bg-smc-gold/[0.06] px-2.5 py-1.5"
              >
                <p className="min-w-0 truncate text-[10px] font-bold text-smc-gold/80">
                  {video.name}
                </p>

                <button
                  type="button"
                  onClick={() => onRemove(videoIndex)}
                  disabled={disabled}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-red-500/15 bg-red-500/[0.07] text-sm font-black text-red-300/75 transition active:scale-95 disabled:opacity-40"
                  aria-label={`Remove ${video.name}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </details>
  )
}