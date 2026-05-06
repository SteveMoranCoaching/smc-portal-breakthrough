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

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-950 p-5">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Recent Activity</h2>
          <p className="mt-1 text-sm text-gray-400">
            {newLogCount} new logs · {newVideoCount} new videos ·{" "}
            {newCheckInCount} new check-ins
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {["all", "new", "reviewed"].map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter as typeof statusFilter)}
              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition ${
                statusFilter === filter
                  ? "bg-yellow-500 text-black"
                  : "bg-black text-gray-300 hover:bg-gray-900"
              }`}
            >
              {filter}
            </button>
          ))}

          {["all", "video", "log", "check-in"].map((filter) => (
            <button
              key={filter}
              onClick={() => setTypeFilter(filter as typeof typeFilter)}
              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition ${
                typeFilter === filter
                  ? "bg-yellow-500 text-black"
                  : "bg-black text-gray-300 hover:bg-gray-900"
              }`}
            >
              {filter === "log"
                ? "Logs"
                : filter === "check-in"
                  ? "Check-ins"
                  : filter}
            </button>
          ))}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <p className="text-gray-400">No activity matches these filters.</p>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const isVideo = item.type === "video"
            const isLog = item.type === "log"
            const isCheckIn = item.type === "check-in"
            const isNew = !item.reviewed

            return (
              <Link
                key={`${item.type}-${item.id}`}
                href={getItemHref(item)}
                className="block rounded-xl border border-gray-800 bg-black p-4 transition hover:border-yellow-500"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold">{item.clientName}</p>

                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-yellow-400">
                      {isVideo
                        ? "Video"
                        : isLog
                          ? "Workout Log"
                          : "Check-In"}
                    </p>

                    {isCheckIn ? (
                      <>
                        <p className="text-sm text-gray-400">
                          Submitted weekly check-in
                        </p>

                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                          <p className="text-gray-300">
                            BW:{" "}
                            <span className="font-bold text-yellow-400">
                              {item.bodyweight ? `${item.bodyweight}kg` : "-"}
                            </span>
                          </p>
                          <p className="text-gray-300">
                            Training:{" "}
                            <span className="font-bold text-yellow-400">
                              {item.training_rating ?? "-"}/10
                            </span>
                          </p>
                          <p className="text-gray-300">
                            Recovery:{" "}
                            <span className="font-bold text-yellow-400">
                              {item.recovery_rating ?? "-"}/10
                            </span>
                          </p>
                          <p className="text-gray-300">
                            Nutrition:{" "}
                            <span className="font-bold text-yellow-400">
                              {item.nutrition_rating ?? "-"}/10
                            </span>
                          </p>
                        </div>

                        {item.cardio_steps && (
                          <p className="mt-2 text-sm text-gray-300">
                            Steps/Cardio: {item.cardio_steps}
                          </p>
                        )}

                        {item.notes && (
                          <p className="mt-2 line-clamp-2 text-sm text-gray-300">
                            Notes: {item.notes}
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-gray-400">
                          {isVideo ? "Uploaded video:" : "Logged workout:"}{" "}
                          {item.exercise_name}
                        </p>

                        {isLog && (
                          <>
                            <p className="mt-1 text-sm text-yellow-400">
                              First set: {formatTopSet(item.sets_completed)}
                            </p>

                            {item.notes && (
                              <p className="mt-2 text-sm text-gray-300">
                                Notes: {item.notes}
                              </p>
                            )}
                          </>
                        )}
                      </>
                    )}

                    <p className="mt-2 text-xs text-gray-500">
                      {formatDateTime(item.created_at)}
                    </p>
                  </div>

                  <span
                    className={`inline-flex h-[18px] min-w-[70px] items-center justify-center rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase leading-none tracking-wide ${
                      isNew
                        ? "border-yellow-300 bg-yellow-500 text-black"
                        : "border-green-300 bg-green-500 text-black"
                    }`}
                  >
                    {isNew
                      ? isVideo
                        ? "New Video"
                        : isLog
                          ? "New Log"
                          : "New Check-In"
                      : "Reviewed"}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}