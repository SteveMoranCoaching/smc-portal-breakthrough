"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

type SetEntry = {
  weight: string
  reps: string
  rpe: string
}

type ActivityItem = {
  type: "video" | "log" | "check-in"
  id: string
  user_id: string
  clientId: string
  clientName: string
  exercise_name?: string
  created_at: string
  reviewed: boolean | null
  sets_completed?: SetEntry[] | null
  notes?: string | null
  bodyweight?: number | null
  training_rating?: number | null
  recovery_rating?: number | null
  nutrition_rating?: number | null
  cardio_steps?: string | null
}

type Props = {
  activityItems: ActivityItem[]
  newVideoCount: number
  newLogCount: number
  newCheckInCount?: number
}

const shellCard =
  "relative overflow-hidden rounded-[1.35rem] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.016))] p-3.5 shadow-[0_14px_34px_rgba(0,0,0,0.68)] before:pointer-events-none before:absolute before:inset-0 before:rounded-[1.35rem] before:bg-[linear-gradient(rgba(255,255,255,0.035),transparent)]"

const activityCard =
  "block rounded-[1.05rem] border border-white/[0.06] bg-[#070707] p-3 shadow-[0_8px_22px_rgba(0,0,0,0.32)] transition hover:border-smc-gold/35"

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
}

export default function CoachActivityFeed({
  activityItems,
  newVideoCount,
  newLogCount,
  newCheckInCount = 0,
}: Props) {
  const [statusFilter, setStatusFilter] = useState<"all" | "new" | "reviewed">(
    "all"
  )
  const [typeFilter, setTypeFilter] = useState<
    "all" | "video" | "log" | "check-in"
  >("all")

  const filteredItems = useMemo(() => {
    return activityItems.filter((item) => {
      const statusMatch =
        statusFilter === "all" ||
        (statusFilter === "new" && !item.reviewed) ||
        (statusFilter === "reviewed" && item.reviewed)

      const typeMatch = typeFilter === "all" || item.type === typeFilter

      return statusMatch && typeMatch
    })
  }, [activityItems, statusFilter, typeFilter])

  function formatDateTime(dateString: string) {
    const date = new Date(dateString)

    const day = date.getDate().toString().padStart(2, "0")
    const month = date.toLocaleString("en-GB", { month: "short" })
    const hours = date.getHours().toString().padStart(2, "0")
    const minutes = date.getMinutes().toString().padStart(2, "0")

    return `${day} ${month}, ${hours}:${minutes}`
  }

  function formatTopSet(sets?: SetEntry[] | null) {
    if (!sets || sets.length === 0) return "No sets logged"

    const firstSet = sets[0]

    return `${firstSet.weight || "?"}kg x ${firstSet.reps || "?"} @ ${
      firstSet.rpe || "?"
    }`
  }

  function getItemHref(item: ActivityItem) {
    if (item.type === "check-in") {
      return `/coach/check-ins/${item.id}`
    }

    return `/coach/${item.clientId}?exercise=${encodeURIComponent(
      item.exercise_name || ""
    )}`
  }

  function getTypeLabel(type: ActivityItem["type"]) {
    if (type === "video") return "Video"
    if (type === "log") return "Workout Log"
    return "Check-In"
  }

  function getTypeMeta(item: ActivityItem) {
    if (item.type === "check-in") return "Submitted weekly check-in"
    if (item.type === "video") return `Uploaded video: ${item.exercise_name}`
    return `Logged workout: ${item.exercise_name}`
  }

  const filters = [
    { label: "All", value: "all" },
    { label: "New", value: "new" },
    { label: "Reviewed", value: "reviewed" },
  ] as const

  const typeFilters = [
    { label: "All", value: "all" },
    { label: "Videos", value: "video" },
    { label: "Logs", value: "log" },
    { label: "Check-ins", value: "check-in" },
  ] as const

  return (
    <section className={shellCard}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-smc-gold/45 to-transparent" />

      <div className="relative z-10">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.24em] text-smc-gold/80">
              Activity
            </p>

            <h2 className="mt-1 text-lg font-black text-white">
              Recent Client Activity
            </h2>

            <p className="mt-1 text-xs leading-5 text-white/45">
              {newLogCount} new logs · {newVideoCount} new videos ·{" "}
              {newCheckInCount} new check-ins
            </p>
          </div>

          <span className="w-fit rounded-full border border-smc-gold/20 bg-smc-gold/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-smc-gold">
            {filteredItems.length} showing
          </span>
        </div>

        <div className="mb-3 flex flex-col gap-2">
          <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {filters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black transition ${
                  statusFilter === filter.value
                    ? "bg-smc-gold text-black"
                    : "border border-white/[0.07] bg-white/[0.03] text-white/45 hover:text-white/75"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {typeFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setTypeFilter(filter.value)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black transition ${
                  typeFilter === filter.value
                    ? "bg-smc-gold text-black"
                    : "border border-white/[0.07] bg-white/[0.03] text-white/45 hover:text-white/75"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="rounded-[1.05rem] border border-white/[0.06] bg-[#070707] p-3 text-sm text-white/45">
            No activity matches these filters.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filteredItems.map((item) => {
              const isLog = item.type === "log"
              const isCheckIn = item.type === "check-in"
              const isNew = !item.reviewed

              return (
                <Link
                  key={`${item.type}-${item.id}`}
                  href={getItemHref(item)}
                  className={activityCard}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-smc-gold/20 bg-smc-gold/10 text-xs font-black text-smc-gold">
                      {getInitials(item.clientName)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-black text-white">
                            {item.clientName}
                          </h3>

                          <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-smc-gold/75">
                            {getTypeLabel(item.type)}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[8px] font-black uppercase ${
                            isNew
                              ? "bg-smc-gold text-black"
                              : "border border-green-500/20 bg-green-500/10 text-green-400"
                          }`}
                        >
                          {isNew ? "New" : "Reviewed"}
                        </span>
                      </div>

                      <p className="mt-1 text-xs leading-5 text-white/45">
                        {getTypeMeta(item)}
                      </p>

                      {isCheckIn && (
                        <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px] sm:grid-cols-4">
                          <p className="rounded-[0.75rem] border border-white/[0.05] bg-white/[0.025] px-2 py-1 text-white/45">
                            BW{" "}
                            <span className="font-black text-white/75">
                              {item.bodyweight ? `${item.bodyweight}kg` : "—"}
                            </span>
                          </p>

                          <p className="rounded-[0.75rem] border border-white/[0.05] bg-white/[0.025] px-2 py-1 text-white/45">
                            Train{" "}
                            <span className="font-black text-white/75">
                              {item.training_rating ?? "—"}/10
                            </span>
                          </p>

                          <p className="rounded-[0.75rem] border border-white/[0.05] bg-white/[0.025] px-2 py-1 text-white/45">
                            Rec{" "}
                            <span className="font-black text-white/75">
                              {item.recovery_rating ?? "—"}/10
                            </span>
                          </p>

                          <p className="rounded-[0.75rem] border border-white/[0.05] bg-white/[0.025] px-2 py-1 text-white/45">
                            Nut{" "}
                            <span className="font-black text-white/75">
                              {item.nutrition_rating ?? "—"}/10
                            </span>
                          </p>
                        </div>
                      )}

                      {isLog && (
                        <p className="mt-1.5 text-xs text-smc-gold/75">
                          First set: {formatTopSet(item.sets_completed)}
                        </p>
                      )}

                      {item.cardio_steps && (
                        <p className="mt-1.5 text-xs text-white/45">
                          Steps/Cardio: {item.cardio_steps}
                        </p>
                      )}

                      {item.notes && (
                        <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-white/50">
                          Notes: {item.notes}
                        </p>
                      )}

                      <p className="mt-2 text-[11px] text-white/30">
                        {formatDateTime(item.created_at)}
                      </p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}