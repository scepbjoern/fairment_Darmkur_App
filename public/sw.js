/* eslint-env serviceworker */

self.addEventListener('install', (_event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (_event) => {
  _event.waitUntil(clients.claim())
})

// No fetch handler: rely on network. Add caching here if needed later.
