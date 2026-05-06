"use client"

import { useEffect, useState } from "react"
import { showBrowserNotification } from "@/components/useBrowserNotifications"

type PermissionState = "unsupported" | "default" | "granted" | "denied"

export default function NotificationPermissionButton() {
  const [permission, setPermission] = useState<PermissionState>("unsupported")

  useEffect(() => {
    if (typeof window === "undefined") return

    if (!("Notification" in window)) {
      setPermission("unsupported")
      return
    }

    setPermission(Notification.permission as PermissionState)
  }, [])

  async function requestPermission() {
    if (typeof window === "undefined") return
    if (!("Notification" in window)) return

    try {
      const result = await Notification.requestPermission()
      setPermission(result as PermissionState)
    } catch {
      setPermission("unsupported")
    }
  }

  function testNotification() {
    showBrowserNotification({
      title: "SMC Portal",
      body: "Notifications are working.",
      force: true,
    })
  }

  if (permission === "unsupported") {
    return (
      <div className="rounded-2xl border border-gray-800 bg-gray-950 px-4 py-3 text-xs text-gray-400">
        Browser notifications are not supported here.
      </div>
    )
  }

  if (permission === "granted") {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-800 bg-gray-950 px-4 py-3">
        <p className="text-xs font-semibold text-gray-300">
          Notifications enabled
        </p>

        <button
          type="button"
          onClick={testNotification}
          className="rounded-xl bg-yellow-400 px-3 py-2 text-xs font-bold text-black"
        >
          Test
        </button>
      </div>
    )
  }

  if (permission === "denied") {
    return (
      <div className="rounded-2xl border border-gray-800 bg-gray-950 px-4 py-3 text-xs text-gray-400">
        Notifications are blocked in this browser.
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={requestPermission}
      className="w-full rounded-2xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-3 text-xs font-bold text-yellow-300 transition hover:border-yellow-400 hover:bg-yellow-400/15"
    >
      Enable notifications
    </button>
  )
}