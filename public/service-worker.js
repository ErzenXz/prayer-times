// Service Worker for Prayer Times App

const CACHE_NAME = 'prayer-times-cache-v1';
const OFFLINE_URL = '/';

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        OFFLINE_URL,
        '/favicon.ico',
        '/adhan1.mp3',
        '/adhan2.mp3',
        '/adhan3.mp3',
        '/adhan4.mp3'
      ]);
    })
  );
  
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Claim clients immediately
  self.clients.claim();
});

// Fetch event - serve from cache if available
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).catch(() => {
        return caches.match(OFFLINE_URL);
      });
    })
  );
});

// Background sync for prayer times
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-prayer-times') {
    event.waitUntil(syncPrayerTimes());
  }
});

// Function to check prayer times and send notifications
async function syncPrayerTimes() {
  try {
    // Get prayer times from localStorage
    const prayerTimesStr = await getFromClient('prayerTimes');
    const reminderSettingsStr = await getFromClient('reminderSettings');
    
    if (!prayerTimesStr) return;
    
    const prayerTimes = JSON.parse(prayerTimesStr);
    const reminderSettings = reminderSettingsStr ? JSON.parse(reminderSettingsStr) : { enabled: false, minutesBefore: 5 };
    
    // Get current time
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Find the next prayer
    let nextPrayerName = null;
    let minDiff = Infinity;
    
    Object.entries(prayerTimes).forEach(([name, timeStr]) => {
      const [prayerHour, prayerMinute] = timeStr.split(':').map(Number);
      
      // Calculate time difference in minutes
      let diff = (prayerHour - currentHour) * 60 + (prayerMinute - currentMinute);
      
      // If the prayer time has passed today, add 24 hours
      if (diff < 0) {
        diff += 24 * 60;
      }
      
      if (diff < minDiff) {
        minDiff = diff;
        nextPrayerName = name;
      }
    });
    
    // Check if it's time for prayer
    if (nextPrayerName) {
      const [nextHour, nextMinute] = prayerTimes[nextPrayerName].split(':').map(Number);
      
      // If it's prayer time (within 1 minute)
      if (currentHour === nextHour && Math.abs(currentMinute - nextMinute) <= 1) {
        await sendNotification(
          'Prayer Time',
          `It's time for ${nextPrayerName} prayer.`,
          'prayer-time'
        );
      }
      
      // If it's time for reminder
      if (
        reminderSettings.enabled && 
        currentHour === nextHour && 
        nextMinute - currentMinute <= reminderSettings.minutesBefore && 
        nextMinute - currentMinute > 0
      ) {
        const minutesLeft = nextMinute - currentMinute;
        await sendNotification(
          'Prayer Time Reminder',
          `${nextPrayerName} prayer will start in ${minutesLeft} minute${minutesLeft === 1 ? '' : 's'}.`,
          'prayer-reminder'
        );
      }
    }
  } catch (error) {
    console.error('Error in syncPrayerTimes:', error);
  }
}

// Helper function to get data from client
async function getFromClient(key) {
  const clients = await self.clients.matchAll();
  
  if (clients.length === 0) {
    // If no clients are open, try to get from IndexedDB
    return localStorage.getItem(key);
  }
  
  // Ask the first client for the data
  return new Promise((resolve) => {
    const messageChannel = new MessageChannel();
    
    messageChannel.port1.onmessage = (event) => {
      resolve(event.data);
    };
    
    clients[0].postMessage({
      type: 'GET_DATA',
      key: key
    }, [messageChannel.port2]);
  });
}

// Function to send notification
async function sendNotification(title, body, tag) {
  const clients = await self.clients.matchAll();
  
  // If a client is visible, let the client handle the notification
  if (clients.some(client => client.visibilityState === 'visible')) {
    return;
  }
  
  // Otherwise, send a notification from the service worker
  return self.registration.showNotification(title, {
    body: body,
    icon: '/favicon.ico',
    vibrate: [200, 100, 200],
    tag: tag,
    renotify: true
  });
}

// Set up periodic background sync if supported
if ('periodicSync' in self.registration) {
  // Try to register for periodic sync
  const registerPeriodicSync = async () => {
    try {
      await self.registration.periodicSync.register('sync-prayer-times', {
        minInterval: 15 * 60 * 1000 // 15 minutes
      });
      console.log('Periodic sync registered');
    } catch (error) {
      console.error('Periodic sync could not be registered:', error);
    }
  };
  
  registerPeriodicSync();
}

// Set up a periodic check regardless of periodicSync support
setInterval(() => {
  syncPrayerTimes();
}, 60 * 1000); // Check every minute