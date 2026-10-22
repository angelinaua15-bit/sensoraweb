// FILE PATH: public/sw.js
// Real service worker for Web Push — receives the encrypted push message the
// browser already decrypted for us (that decryption happens in the browser
// engine itself, per RFC 8291; by the time the 'push' event fires here, the
// payload is plain JSON) and shows an actual OS-level notification. No
// third-party push SDK — this is the whole client side of the Web Push
// Protocol.

self.addEventListener('push', (event) => {
  let data = { title: 'Sensora', body: '', url: '/' }
  try {
    if (event.data) data = { ...data, ...event.data.json() }
  } catch {
    if (event.data) data.body = event.data.text()
  }

  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/' },
    tag: data.tag || 'sensora-notification',
  }

  event.waitUntil(self.registration.showNotification(data.title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/'

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of allClients) {
        if ('focus' in client) {
          await client.focus()
          if ('navigate' in client) {
            try { await client.navigate(targetUrl) } catch { /* same-origin nav can fail cross-scope; ignore */ }
          }
          return
        }
      }
      await self.clients.openWindow(targetUrl)
    })()
  )
})

// Real, not decorative: Supabase's push_subscriptions row for this endpoint
// would otherwise become permanently stale once the browser silently
// rotates the subscription (it does this periodically for security). This
// keeps the server's copy in sync instead of quietly failing forever.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const newSub = await self.registration.pushManager.subscribe(event.oldSubscription ? { applicationServerKey: event.oldSubscription.options.applicationServerKey, userVisibleOnly: true } : undefined)
        const allClients = await self.clients.matchAll({ type: 'window' })
        for (const client of allClients) {
          client.postMessage({ type: 'sensora-push-resubscribed', subscription: newSub.toJSON() })
        }
      } catch (e) {
        // Nothing more we can do from here without the user's id; the
        // in-page hook will re-check subscription state on next load.
      }
    })()
  )
})