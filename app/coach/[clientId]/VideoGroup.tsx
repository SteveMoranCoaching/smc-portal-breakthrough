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

  const newVideoCount = videos.filter((video) => !video.reviewed).length
  const hasNewVideo = newVideoCount > 0

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
      className={`relative overflow-hidden rounded-[1.25rem] border bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.014))] shadow-[0_12px_30px_rgba(0,0,0,0.45)] transition ${
        defaultOpen
          ? "border-smc-gold/45 shadow-[0_0_24px_rgba(197,167,91,0.16)]"
          : "border-white/[0.065]"
      }`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-smc-gold/35 to-transparent" />

      <button
        onClick={() => setOpen(!open)}
        className="relative z-10 flex w-full items-center justify-between gap-3 p-3.5 text-left transition hover:bg-white/[0.025]"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-black text-white">
              {exerciseName}
            </h3>

            {hasNewVideo && (
              <span className="rounded-full bg-smc-gold px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-black">
                {newVideoCount} new
              </span>
            )}
          </div>

          <p className="mt-0.5 text-xs text-white/40">
            {videos.length} video{videos.length === 1 ? "" : "s"} uploaded
          </p>
        </div>

        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.07] bg-black/35 text-lg font-light text-white/55">
          {open ? "−" : "+"}
        </span>
      </button>

      {open && (
        <div className="relative z-10 grid gap-3 border-t border-white/[0.06] p-3.5 pt-3 md:grid-cols-2">
          {videos.map((video: any) => (
            <div
              key={video.id}
              className="overflow-hidden rounded-[1.1rem] border border-white/[0.06] bg-black/40 p-3 shadow-[0_8px_22px_rgba(0,0,0,0.35)]"
            >
              {video.signedUrl && (
                <div className="overflow-hidden rounded-[0.95rem] border border-white/[0.06] bg-black">
                  <video
                    src={video.signedUrl}
                    controls
                    className="mx-auto h-[280px] w-auto max-w-full object-contain sm:h-[320px]"
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