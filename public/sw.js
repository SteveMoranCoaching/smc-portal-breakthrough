self.addEventListener("push", function (event) {
  const data = event.data ? event.data.json() : {}

  const title = data.title || "SMC Portal"
  const options = {
    body: data.body || "You have a new update.",
    icon: "/images/steve-avatar.jpeg",
    badge: "/images/steve-avatar.jpeg",
    data: {
      url: data.url || "/dashboard",
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", function (event) {
  event.notification.close()

  const url = event.notification.data?.url || "/dashboard"

  event.waitUntil(clients.openWindow(url))
})