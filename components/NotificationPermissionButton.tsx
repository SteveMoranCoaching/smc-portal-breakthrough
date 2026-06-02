"use client"

import { useEffect, useState } from "react"
import { showBrowserNotification } from "@/components/useBrowserNotifications"

type PermissionState = "unsupported" | "default" | "granted" | "denied"

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/")

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

export default function NotificationPermissionButton() {
  const [permission, setPermission] = useState<PermissionState>("unsupported")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (typeof window === "undefined") return

    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPermission("unsupported")
      return
    }

    setPermission(Notification.permission as PermissionState)
  }, [])

  async function registerPushSubscription() {
  const keyResponse = await fetch("/api/notifications/public-key")
const keyData = await keyResponse.json()
const publicKey = keyData.publicKey

console.log("Public key:", publicKey)

  if (!publicKey) {
    setMessage("Missing VAPID public key.")
    return
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js")

    console.log("SW registered", registration)

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })

    console.log("Subscription:", subscription)

    const response = await fetch("/api/notifications/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subscription),
    })

    console.log("Response status:", response.status)

    const data = await response.json()

    console.log("Response data:", data)

    if (!response.ok) {
      throw new Error("Subscription failed")
    }

    setMessage("Notifications are enabled.")
  } catch (error) {
    console.error(error)
    setMessage("Subscription failed.")
  }
}

  async function requestPermission() {
    if (typeof window === "undefined") return
    if (!("Notification" in window)) return

    try {
      setLoading(true)
      setMessage("")

      const result = await Notification.requestPermission()
      setPermission(result as PermissionState)

      if (result === "granted") {
        await registerPushSubscription()
      }
    } catch {
      setMessage("Could not enable notifications.")
    } finally {
      setLoading(false)
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
      <div>
        <p className="text-xs font-semibold text-gray-300">
          Notifications enabled
        </p>

        {message && (
          <p className="mt-1 text-[11px] text-gray-500">
            {message}
          </p>
        )}
      </div>

      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={registerPushSubscription}
          disabled={loading}
          className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-3 py-2 text-xs font-bold text-yellow-300 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save"}
        </button>

        <button
          type="button"
          onClick={testNotification}
          className="rounded-xl bg-yellow-400 px-3 py-2 text-xs font-bold text-black"
        >
          Test
        </button>
      </div>
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
      disabled={loading}
      className="w-full rounded-2xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-3 text-xs font-bold text-yellow-300 transition hover:border-yellow-400 hover:bg-yellow-400/15 disabled:opacity-50"
    >
      {loading ? "Enabling..." : "Enable notifications"}
    </button>
  )
}