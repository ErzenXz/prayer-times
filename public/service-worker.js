// Service Worker for Prayer Times App

const CACHE_NAME = "prayer-times-cache-v2";
const AUDIO_FILES = [
  "/adhan1.mp3",
  "/adhan2.mp3",
  "/adhan3.mp3",
  "/adhan4.mp3",
];

// IndexedDB setup for storing prayer times and settings
const DB_NAME = "prayer-times-db";
const DB_VERSION = 1;
let db;

// Initialize IndexedDB
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("IndexedDB error:", event.target.error);
      reject(event.target.error);
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      console.log("IndexedDB initialized");
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings");
      }
    };
  });
}

// Install event - cache essential files (only audio)
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

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("Service Worker activating...");

  event.waitUntil(
    Promise.all([
      // Clean old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Initialize IndexedDB
      initDB(),
      // Ensure we control all clients
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

// Listen for messages from the client
self.addEventListener("message", (event) => {
  const data = event.data;

  if (data.type === "STORE_DATA") {
    // Store data in IndexedDB
    storeInIndexedDB(data.key, data.value).then(() => {
      // Schedule immediate check
      syncPrayerTimes();
    });
  } else if (data.type === "REQUEST_NOTIFICATION_PERMISSION") {
    // Forward to all clients
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: "REQUEST_NOTIFICATION_PERMISSION",
        });
      });
    });
  }
});

// Background sync for prayer times
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-prayer-times") {
    event.waitUntil(syncPrayerTimes());
  }
});

// Store data in IndexedDB
function storeInIndexedDB(key, value) {
  return new Promise((resolve, reject) => {
    if (!db) {
      return initDB().then(() => storeInIndexedDB(key, value));
    }

    const transaction = db.transaction(["settings"], "readwrite");
    const store = transaction.objectStore("settings");
    const request = store.put(value, key);

    request.onsuccess = () => resolve();
    request.onerror = (err) => reject(err);
  });
}

// Get data from IndexedDB
function getFromIndexedDB(key) {
  return new Promise((resolve, reject) => {
    if (!db) {
      return initDB().then(() => getFromIndexedDB(key));
    }

    const transaction = db.transaction(["settings"], "readonly");
    const store = transaction.objectStore("settings");
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result);
    request.onerror = (err) => reject(err);
  });
}

// Function to check prayer times and send notifications
async function syncPrayerTimes() {
  try {
    // Get prayer times from IndexedDB or from client
    let prayerTimesStr = await getFromIndexedDB("prayerTimes");
    let reminderSettingsStr = await getFromIndexedDB("reminderSettings");
    let timeDiffStr = await getFromIndexedDB("timeDiff");

    // If not found in IndexedDB, try to get from client
    if (!prayerTimesStr || !reminderSettingsStr) {
      const clientData = await getFromClient();
      if (clientData.prayerTimes) {
        prayerTimesStr = JSON.stringify(clientData.prayerTimes);
        await storeInIndexedDB("prayerTimes", prayerTimesStr);
      }
      if (clientData.reminderSettings) {
        reminderSettingsStr = JSON.stringify(clientData.reminderSettings);
        await storeInIndexedDB("reminderSettings", reminderSettingsStr);
      }
      if (clientData.timeDiff) {
        timeDiffStr = clientData.timeDiff;
        await storeInIndexedDB("timeDiff", timeDiffStr);
      }
    }

    if (!prayerTimesStr) return;

    const prayerTimes = JSON.parse(prayerTimesStr);
    const reminderSettings = reminderSettingsStr
      ? JSON.parse(reminderSettingsStr)
      : { enabled: false, minutesBefore: 5 };
    const timeDiff = timeDiffStr ? parseInt(timeDiffStr) : 0;

    // Get current time with server time adjustment
    const now = new Date(Date.now() + timeDiff);
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentSecond = now.getSeconds();

    // Calculate current time in milliseconds since start of day
    const currentTimeMs =
      currentHour * 3600000 +
      currentMinute * 60000 +
      currentSecond * 1000 +
      now.getMilliseconds();

    // Convert prayer times to milliseconds since start of day for more accurate comparison
    const prayerTimesMs = {};
    let earliestPrayer = null;
    let earliestTime = Infinity;

    Object.entries(prayerTimes).forEach(([name, timeStr]) => {
      if (!timeStr) return;

      const [prayerHour, prayerMinute] = timeStr.split(":").map(Number);
      const prayerTimeMs = prayerHour * 3600000 + prayerMinute * 60000;

      prayerTimesMs[name] = prayerTimeMs;

      // Find earliest prayer in the day
      if (prayerTimeMs < earliestTime) {
        earliestTime = prayerTimeMs;
        earliestPrayer = name;
      }
    });

    // Find the next prayer
    let nextPrayerName = null;
    let nextPrayerTimeMs = Infinity;
    let minDiffMs = Infinity;

    // First, check for prayers later today
    Object.entries(prayerTimesMs).forEach(([name, timeMs]) => {
      if (timeMs > currentTimeMs && timeMs - currentTimeMs < minDiffMs) {
        minDiffMs = timeMs - currentTimeMs;
        nextPrayerName = name;
        nextPrayerTimeMs = timeMs;
      }
    });

    // If no prayer found later today, use the earliest prayer tomorrow
    if (!nextPrayerName && earliestPrayer) {
      nextPrayerName = earliestPrayer;
      nextPrayerTimeMs = prayerTimesMs[earliestPrayer];
      minDiffMs = nextPrayerTimeMs + (24 * 3600000 - currentTimeMs);
    }

    // Check if it's time for prayer with high precision
    if (nextPrayerName) {
      const [nextHour, nextMinute] = prayerTimes[nextPrayerName]
        .split(":")
        .map(Number);

      // If it's prayer time (within 30 seconds)
      const isPrayerTime =
        (currentHour === nextHour &&
          currentMinute === nextMinute &&
          currentSecond <= 30) ||
        minDiffMs <= 30000; // 30 seconds

      if (isPrayerTime) {
        console.log(`Time for ${nextPrayerName} prayer!`);
        await sendNotification(
          "Prayer Time",
          `It's time for ${nextPrayerName} prayer.`,
          "prayer-time"
        );
      }

      // If it's time for reminder with higher precision
      const msUntilReminderTime = reminderSettings.minutesBefore * 60000;

      if (
        reminderSettings.enabled &&
        minDiffMs > 0 &&
        minDiffMs <= msUntilReminderTime &&
        minDiffMs > msUntilReminderTime - 60000 // Only trigger once within a minute window
      ) {
        const minutesLeft = Math.ceil(minDiffMs / 60000);
        console.log(
          `Reminder: ${nextPrayerName} prayer in ${minutesLeft} minutes`
        );
        await sendNotification(
          "Prayer Time Reminder",
          `${nextPrayerName} prayer will start in ${minutesLeft} minute${
            minutesLeft === 1 ? "" : "s"
          }.`,
          "prayer-reminder"
        );
      }
    }
  } catch (error) {
    console.error("Error in syncPrayerTimes:", error);
  }
}

// Helper function to get data from client
async function getFromClient() {
  const clients = await self.clients.matchAll();

  if (clients.length === 0) {
    // If no clients are open, return empty result
    return {};
  }

  // Ask the first client for the data
  return new Promise((resolve) => {
    const messageChannel = new MessageChannel();

    messageChannel.port1.onmessage = (event) => {
      resolve(event.data || {});
    };

    clients[0].postMessage(
      {
        type: "GET_DATA",
      },
      [messageChannel.port2]
    );

    // Timeout after 1 second
    setTimeout(() => resolve({}), 1000);
  });
}

// Function to send notification
async function sendNotification(title, body, tag) {
  try {
    // Check if notification permission is granted
    if (Notification.permission !== "granted") {
      // Request permission via clients
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: "REQUEST_NOTIFICATION_PERMISSION",
          });
        });
      });
      return;
    }

    const showNotification = true;

    // Check if a client is visible
    const clients = await self.clients.matchAll();
    const isClientVisible = clients.some(
      (client) => client.visibilityState === "visible"
    );

    // If client is visible, forward the notification to the client
    if (isClientVisible) {
      clients.forEach((client) => {
        if (client.visibilityState === "visible") {
          client.postMessage({
            type: "SHOW_NOTIFICATION",
            title,
            body,
            tag,
          });
        }
      });
    }

    // Always send a notification from the service worker as well
    if (showNotification) {
      return self.registration.showNotification(title, {
        body: body,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        vibrate: [200, 100, 200],
        tag: tag,
        renotify: true,
        data: {
          createdAt: Date.now(),
        },
      });
    }
  } catch (error) {
    console.error("Error sending notification:", error);
  }
}

// Set up periodic background sync if supported
if ("periodicSync" in self.registration) {
  // Try to register for periodic sync
  const registerPeriodicSync = async () => {
    try {
      await self.registration.periodicSync.register("sync-prayer-times", {
        minInterval: 15 * 60 * 1000, // 15 minutes
      });
      console.log("Periodic sync registered");
    } catch (error) {
      console.error("Periodic sync could not be registered:", error);
    }
  };

  registerPeriodicSync();
}

// Set up a periodic check regardless of periodicSync support
setInterval(() => {
  syncPrayerTimes();
}, 60 * 1000); // Check every minute

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      // If a window client is already open, focus it
      for (const client of clientList) {
        if ("focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow("/");
      }
    })
  );
});
