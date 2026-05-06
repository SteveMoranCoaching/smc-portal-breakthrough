"use client"

export function canUseBrowserNotifications() {
  if (typeof window === "undefined") return false
  if (!("Notification" in window)) return false
  if (Notification.permission !== "granted") return false

  return true
}

export function showBrowserNotification({
  title,
  body,
  force = false,
}: {
  title: string
  body: string
  force?: boolean
}) {
  if (!canUseBrowserNotifications()) return

  const pageIsFocused =
    typeof document !== "undefined" &&
    document.visibilityState === "visible" &&
    document.hasFocus()

  if (pageIsFocused && !force) return

  try {
    new Notification(title, {
      body,
      tag: `smc-message-${Date.now()}`,
      silent: false,
    })
  } catch {
    return
  }
}