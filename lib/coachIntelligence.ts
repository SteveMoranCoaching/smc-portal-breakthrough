export type CoachAttentionFlag =
  | "inactive"
  | "missing_check_in"
  | "low_recovery"
  | "missed_sessions"
  | "unreviewed_logs"
  | "unreviewed_videos"
  | "incomplete_week"

export type CoachAttentionItem = {
  clientId: string
  userId: string
  name: string
  email?: string | null
  flags: CoachAttentionFlag[]
  score: number
  summary: string
}

function daysSince(dateString?: string | null) {
  if (!dateString) return null

  const date = new Date(dateString)
  const now = new Date()

  return Math.floor((now.getTime() - date.getTime()) / 86400000)
}

function isTuesdayOrLater() {
  const day = new Date().getDay()
  return day >= 2
}

export function getFlagLabel(flag: CoachAttentionFlag) {
  switch (flag) {
    case "inactive":
      return "Inactive 3+ days"

    case "missing_check_in":
      return "Missing check-in"

    case "low_recovery":
      return "Recovery ≤ 3/10"

    case "missed_sessions":
      return "Missed sessions"

    case "unreviewed_logs":
      return "Workout logs waiting"

    case "unreviewed_videos":
      return "Videos waiting"

    case "incomplete_week":
      return "Incomplete week"

    default:
      return flag
  }
}

export function buildCoachAttentionItems({
  clients,
  workoutLogs,
  videos,
  checkIns,
}: {
  clients: any[]
  workoutLogs: any[]
  videos: any[]
  checkIns: any[]
}): CoachAttentionItem[] {
  return clients
    .map((client) => {
      const clientLogs = workoutLogs.filter(
        (log) => log.user_id === client.user_id
      )

      const clientVideos = videos.filter(
        (video) => video.user_id === client.user_id
      )

      const clientCheckIns = checkIns.filter(
        (checkIn) => checkIn.user_id === client.user_id
      )

      const latestActivityDates = [
        ...clientLogs.map((log) => log.created_at),
        ...clientVideos.map((video) => video.created_at),
        ...clientCheckIns.map((checkIn) => checkIn.created_at),
      ].filter(Boolean)

      const latestActivity = latestActivityDates.sort(
        (a, b) => new Date(b).getTime() - new Date(a).getTime()
      )[0]

      const inactiveDays = daysSince(latestActivity)

      const unreviewedLogs = clientLogs.filter((log) => !log.reviewed)
      const unreviewedVideos = clientVideos.filter((video) => !video.reviewed)

      const latestCheckIn = clientCheckIns.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0]

      const latestRecovery = Number(latestCheckIn?.recovery_rating || 0)

      const flags: CoachAttentionFlag[] = []

      if (inactiveDays !== null && inactiveDays >= 3) flags.push("inactive")
      if (isTuesdayOrLater() && !latestCheckIn) flags.push("missing_check_in")
      if (latestRecovery > 0 && latestRecovery <= 3) flags.push("low_recovery")
      if (unreviewedLogs.length > 0) flags.push("unreviewed_logs")
      if (unreviewedVideos.length > 0) flags.push("unreviewed_videos")

      let score = 0

      if (flags.includes("low_recovery")) score += 30
      if (flags.includes("missing_check_in")) score += 25
      if (flags.includes("inactive")) score += 20
      if (flags.includes("unreviewed_logs")) score += unreviewedLogs.length * 3
      if (flags.includes("unreviewed_videos")) score += unreviewedVideos.length * 5

      const summary =
        flags.length === 0
          ? "Clear"
          : [
              unreviewedLogs.length
                ? `${unreviewedLogs.length} log${unreviewedLogs.length === 1 ? "" : "s"}`
                : null,
              unreviewedVideos.length
                ? `${unreviewedVideos.length} video${unreviewedVideos.length === 1 ? "" : "s"}`
                : null,
              flags.includes("missing_check_in") ? "missing check-in" : null,
              flags.includes("low_recovery") ? "low recovery" : null,
              flags.includes("inactive") ? "inactive" : null,
            ]
              .filter(Boolean)
              .join(" · ")

      return {
        clientId: client.id,
        userId: client.user_id,
        name: client.name,
        email: client.email,
        flags,
        score,
        summary,
      }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
}