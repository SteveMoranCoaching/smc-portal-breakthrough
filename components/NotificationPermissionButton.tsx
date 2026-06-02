"use client"

import { useEffect, useState } from "react"

type PermissionState = "unsupported" | "default" | "granted" | "denied"

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

export default function NotificationPermissionButton() {
  const [permission, setPermission] = useState<PermissionState>("unsupported")
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    async function checkStatus() {
      if (typeof window === "undefined") return

      if (!("Notification" in window) || !("serviceWorker" in navigator)) {
        setPermission("unsupported")
        return
      }

      setPermission(Notification.permission as PermissionState)

      const registration = await navigator.serviceWorker.getRegistration("/sw.js")
      const existingSubscription =
        await registration?.pushManager.getSubscription()

      setSubscribed(Boolean(existingSubscription))
    }

    checkStatus()
  }, [])

  async function registerPushSubscription() {
    setLoading(true)
    setMessage("")

    try {
      const keyResponse = await fetch("/api/notifications/public-key")
      const keyData = await keyResponse.json()
      const publicKey = keyData.publicKey

      if (!publicKey) {
        setMessage("Notifications could not be enabled.")
        return
      }

      const registration = await navigator.serviceWorker.register("/sw.js")

      let subscription = await registration.pushManager.getSubscription()

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        })
      }

      const response = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(subscription),
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage(data?.detail || data?.error || "Notifications could not be enabled.")
        return
      }

      setSubscribed(true)
      setMessage("")
    } catch {
      setMessage("Notifications could not be enabled.")
    } finally {
      setLoading(false)
    }
  }

  async function requestPermission() {
    if (typeof window === "undefined") return
    if (!("Notification" in window)) return

    setLoading(true)
    setMessage("")

    try {
      const result = await Notification.requestPermission()
      setPermission(result as PermissionState)

      if (result === "granted") {
        await registerPushSubscription()
      }
    } catch {
      setMessage("Notifications could not be enabled.")
    } finally {
      setLoading(false)
    }
  }

  async function disableNotifications() {
    setLoading(true)
    setMessage("")

    try {
      const registration = await navigator.serviceWorker.getRegistration("/sw.js")
      const subscription = await registration?.pushManager.getSubscription()

      if (subscription) {
        await subscription.unsubscribe()
      }

      await fetch("/api/notifications/unsubscribe", {
        method: "POST",
      })

      setSubscribed(false)
      setMessage("")
    } catch {
      setMessage("Notifications could not be disabled.")
    } finally {
      setLoading(false)
    }
  }

  if (permission === "unsupported") {
    return (
      <div className="rounded-[1.25rem] border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-xs text-white/45">
        Notifications are available from the Home Screen app.
      </div>
    )
  }

  if (permission === "denied") {
    return (
      <div className="rounded-[1.25rem] border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-xs text-white/45">
        Notifications are blocked in this browser.
      </div>
    )
  }

  if (permission === "granted" && subscribed) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-[1.25rem] border border-smc-gold/20 bg-smc-gold/[0.06] px-4 py-3">
        <div>
          <p className="text-xs font-black text-white">Notifications Enabled</p>
          <p className="mt-1 text-[11px] text-white/45">
            SMC alerts are active on this device.
          </p>
          {message && <p className="mt-1 text-[11px] text-white/45">{message}</p>}
        </div>

        <button
          type="button"
          onClick={disableNotifications}
          disabled={loading}
          className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs font-bold text-white/70 disabled:opacity-50"
        >
          {loading ? "..." : "Disable"}
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={permission === "granted" ? registerPushSubscription : requestPermission}
      disabled={loading}
      className="w-full rounded-[1.25rem] border border-smc-gold/25 bg-smc-gold/[0.08] px-4 py-3 text-left transition active:scale-[0.99] disabled:opacity-50"
    >
      <p className="text-xs font-black text-smc-gold">
        {loading ? "Enabling..." : "Enable Notifications"}
      </p>
      <p className="mt-1 text-[11px] text-white/45">
        Get message alerts, coach feedback and check-in reminders.
      </p>
      {message && <p className="mt-1 text-[11px] text-white/45">{message}</p>}
    </button>
  )
}