// Service Worker for Prayer Times App - Audio Caching Only

const CACHE_NAME = "prayer-times-cache-v3";
const AUDIO_FILES = [
  "/adhan1.mp3",
  "/adhan2.mp3",
  "/adhan3.mp3",
  "/adhan4.mp3",
];

// Install event - cache audio files
self.addEventListener("install", (event) => {
  console.log("Service Worker installing...");

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Caching audio files");
      return cache.addAll(AUDIO_FILES);
    })
  );

  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches and take control of clients
self.addEventListener("activate", (event) => {
  console.log("Service Worker activating...");

  event.waitUntil(
    Promise.all([
      // Clean old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients immediately
      self.clients.claim(),
    ])
  );
});

// Fetch event - only serve audio files from cache
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isAudioFile = AUDIO_FILES.some((file) => url.pathname.endsWith(file));

  if (isAudioFile) {
    // Cache-first strategy for audio files
    event.respondWith(
      caches.match(event.request).then((response) => {
        return (
          response ||
          fetch(event.request).then((fetchResponse) => {
            // Cache the fetched response
            const responseToCache = fetchResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
            return fetchResponse;
          })
        );
      })
    );
  }
});
