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
  "relative overflow-hidden rounded-[1.2rem] border border-white/[0.07] bg-black p-2.5 shadow-[0_16px_40px_rgba(0,0,0,0.72)]"

const activityCard =
  "group block rounded-[0.95rem] border border-white/[0.065] bg-black/52 p-2.5 shadow-[0_8px_22px_rgba(0,0,0,0.38)] backdrop-blur-md transition hover:border-smc-gold/38 hover:bg-black/64 hover:shadow-[0_10px_28px_rgba(0,0,0,0.52)]"

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

    return `${day} ${month} · ${hours}:${minutes}`
  }

  function formatTopSet(sets?: SetEntry[] | null) {
    if (!sets || sets.length === 0) return "No sets logged"

    const firstSet = sets[0]

    return `${firstSet.weight || "?"}kg × ${firstSet.reps || "?"} @ ${
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
    if (type === "log") return "Log"
    return "Check-in"
  }

  function getTypeMeta(item: ActivityItem) {
    if (item.type === "check-in") return "Weekly check-in submitted"
    if (item.type === "video") return item.exercise_name || "Video uploaded"
    return item.exercise_name || "Workout logged"
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
      <div className="absolute inset-0 bg-[url('/images/coach-activity-placeholder.png')] bg-cover bg-center opacity-34 saturate-[0.95] contrast-[1.08]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_0%,rgba(212,175,55,0.18),transparent_30%),radial-gradient(circle_at_90%_16%,rgba(255,255,255,0.08),transparent_24%),linear-gradient(90deg,rgba(0,0,0,0.86),rgba(0,0,0,0.66)),linear-gradient(180deg,rgba(0,0,0,0.18),rgba(0,0,0,0.94))]" />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.045),transparent_34%,rgba(212,175,55,0.045)_78%,transparent)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-smc-gold/70 to-transparent" />
      <div className="pointer-events-none absolute inset-x-8 bottom-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />

      <div className="relative z-10">
        <div className="mb-2.5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.24em] text-smc-gold">
              Activity
            </p>

            <h2 className="mt-1 text-base font-black text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
              Recent Client Activity
            </h2>

            <p className="mt-1 text-[11px] leading-4 text-white/54">
              {newLogCount} logs · {newVideoCount} videos · {newCheckInCount}{" "}
              check-ins
            </p>
          </div>

          <span className="shrink-0 rounded-full border border-smc-gold/28 bg-smc-gold/14 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-smc-gold shadow-[0_0_18px_rgba(212,175,55,0.14)] backdrop-blur-md">
            {filteredItems.length}
          </span>
        </div>

        <div className="mb-2.5 flex flex-col gap-1.5">
          <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {filters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black transition ${
                  statusFilter === filter.value
                    ? "bg-smc-gold text-black shadow-[0_0_18px_rgba(212,175,55,0.22)]"
                    : "border border-white/[0.09] bg-black/46 text-white/56 backdrop-blur-md hover:border-smc-gold/25 hover:text-white/85"
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
                className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black transition ${
                  typeFilter === filter.value
                    ? "bg-smc-gold text-black shadow-[0_0_18px_rgba(212,175,55,0.22)]"
                    : "border border-white/[0.09] bg-black/46 text-white/56 backdrop-blur-md hover:border-smc-gold/25 hover:text-white/85"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="rounded-[0.95rem] border border-white/[0.07] bg-black/52 p-2.5 text-xs text-white/52 shadow-[0_8px_22px_rgba(0,0,0,0.35)] backdrop-blur-md">
            No activity matches these filters.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
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
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-smc-gold/28 bg-smc-gold/12 text-[11px] font-black text-smc-gold shadow-[0_0_18px_rgba(212,175,55,0.1)]">
                      {getInitials(item.clientName)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-black text-white">
                            {item.clientName}
                          </h3>

                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                            <span className="rounded-full border border-smc-gold/20 bg-smc-gold/12 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-smc-gold">
                              {getTypeLabel(item.type)}
                            </span>

                            <span className="text-[10px] text-white/38">
                              {formatDateTime(item.created_at)}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[8px] font-black uppercase ${
                            isNew
                              ? "bg-smc-gold text-black shadow-[0_0_16px_rgba(212,175,55,0.2)]"
                              : "border border-green-500/20 bg-green-500/10 text-green-400"
                          }`}
                        >
                          {isNew ? "New" : "Reviewed"}
                        </span>
                      </div>

                      <p className="mt-1.5 truncate text-xs text-white/54">
                        {getTypeMeta(item)}
                      </p>

                      {isCheckIn && (
                        <div className="mt-2 grid grid-cols-4 gap-1 text-[10px]">
                          <p className="rounded-[0.65rem] border border-white/[0.065] bg-black/42 px-1.5 py-1 text-white/48">
                            BW{" "}
                            <span className="font-black text-white/82">
                              {item.bodyweight ? `${item.bodyweight}kg` : "—"}
                            </span>
                          </p>

                          <p className="rounded-[0.65rem] border border-white/[0.065] bg-black/42 px-1.5 py-1 text-white/48">
                            T{" "}
                            <span className="font-black text-white/82">
                              {item.training_rating ?? "—"}/10
                            </span>
                          </p>

                          <p className="rounded-[0.65rem] border border-white/[0.065] bg-black/42 px-1.5 py-1 text-white/48">
                            R{" "}
                            <span className="font-black text-white/82">
                              {item.recovery_rating ?? "—"}/10
                            </span>
                          </p>

                          <p className="rounded-[0.65rem] border border-white/[0.065] bg-black/42 px-1.5 py-1 text-white/48">
                            N{" "}
                            <span className="font-black text-white/82">
                              {item.nutrition_rating ?? "—"}/10
                            </span>
                          </p>
                        </div>
                      )}

                      {isLog && (
                        <p className="mt-1.5 text-[11px] font-semibold text-smc-gold/84">
                          First set: {formatTopSet(item.sets_completed)}
                        </p>
                      )}

                      {item.cardio_steps && (
                        <p className="mt-1.5 text-[11px] text-white/48">
                          Steps/Cardio: {item.cardio_steps}
                        </p>
                      )}

                      {item.notes && (
                        <p className="mt-1.5 line-clamp-2 text-[11px] leading-4 text-white/56">
                          Notes: {item.notes}
                        </p>
                      )}
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