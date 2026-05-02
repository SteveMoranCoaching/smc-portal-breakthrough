"use client"

import { useEffect, useRef, useState } from "react"
import FeedbackBox from "./FeedbackBox"

export default function VideoGroup({
  exerciseName,
  videos,
  defaultOpen = false,
}: {
  exerciseName: string
  videos: any[]
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const groupRef = useRef<HTMLDivElement | null>(null)

  const hasNewVideo = true

  useEffect(() => {
    if (defaultOpen && groupRef.current) {
      setTimeout(() => {
        groupRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        })
      }, 300)
    }
  }, [defaultOpen])

  return (
    <div
      ref={groupRef}
      className={`rounded-2xl border-2 bg-zinc-950 ${
        defaultOpen
          ? "border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.4)]"
          : "border-zinc-800"
      }`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-semibold">
  {exerciseName}
</h3>

            {hasNewVideo && (
              <span className="text-xs bg-yellow-500 text-black px-2 py-0.5 rounded-full font-semibold">
                NEW
              </span>
            )}
          </div>

          <p className="text-sm text-zinc-400">
            {videos.length} video{videos.length === 1 ? "" : "s"}
          </p>
        </div>

        <span className="text-zinc-400">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="grid gap-4 md:grid-cols-2 p-4 pt-0">
          {videos.map((video: any) => (
            <div
              key={video.id}
              className="rounded-2xl border border-zinc-800 bg-black p-4"
            >
              {video.signedUrl && (
                <div className="flex justify-center bg-black rounded-xl border border-zinc-800 overflow-hidden">
                  <video
                    src={video.signedUrl}
                    controls
                    className="h-[320px] w-auto max-w-full object-contain"
                  />
                </div>
              )}

              <FeedbackBox
  videoId={video.id}
  initialFeedback={video.feedback}
  initialReviewed={video.reviewed}
/>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}