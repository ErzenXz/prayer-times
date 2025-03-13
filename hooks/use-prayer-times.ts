"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface PrayerTimes {
  [key: string]: string;
}

interface ReminderSettings {
  enabled: boolean;
  minutesBefore: number;
}

export function usePrayerTimes() {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [nextPrayer, setNextPrayer] = useState<string | null>(null);
  const [timeUntilNextPrayer, setTimeUntilNextPrayer] = useState<string | null>(
    null
  );
  const [currentTime, setCurrentTime] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [country, setCountry] = useState<string>("XK"); // Default to Kosovo
  const [city, setCity] = useState<string>("Pristina"); // Default to Pristina
  const [countryName, setCountryName] = useState<string>("Kosovo");
  const [cityName, setCityName] = useState<string>("Pristina");
  const [timeDiff, setTimeDiff] = useState<number>(0);
  const [audioPlaying, setAudioPlaying] = useState<boolean>(false);
  const [reminderSent, setReminderSent] = useState<boolean>(false);
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>({
    enabled: false,
    minutesBefore: 5,
  });

  // References to track current state across intervals
  const lastPrayerRef = useRef<string | null>(null);
  const syncTimeRetryCount = useRef<number>(0);
  const timeSources = useRef<string[]>([
    "https://worldtimeapi.org/api/ip",
    "https://timeapi.io/api/Time/current/zone?timeZone=UTC",
    "https://www.timeapi.io/api/Time/current/coordinate",
  ]);

  // Need to define these functions before they're used in dependencies

  // Play adhan sound - defining early to avoid circular dependencies
  const playAdhan = useCallback((prayerName: string) => {
    const audioEnabled = localStorage.getItem("audioEnabled") !== "false";
    if (!audioEnabled) return;

    setAudioPlaying(true);

    const adhanFiles = [
      "/adhan1.mp3",
      "/adhan2.mp3",
      "/adhan3.mp3",
      "/adhan4.mp3",
    ];
    const randomIndex = Math.floor(Math.random() * adhanFiles.length);
    const audioFile = adhanFiles[randomIndex];

    const audio = new Audio(audioFile);
    audio.preload = "auto";

    audio.addEventListener("canplaythrough", () => {
      console.log("Audio loaded and ready to play - " + audioFile);
      audio.play().catch((err) => console.error("Error playing audio:", err));
    });

    audio.addEventListener("ended", () => {
      setAudioPlaying(false);
    });

    // Show notification if supported
    if ("Notification" in window && Notification.permission === "granted") {
      const notification = new Notification("Prayer Time", {
        body: `It's time for ${prayerName} prayer.`,
        icon: "/favicon.ico",
        tag: "prayer-time",
      });
    }
  }, []);

  // Send reminder notification - defining early to avoid circular dependencies
  const sendReminderNotification = useCallback(
    (prayerName: string, minutesLeft: number) => {
      if ("Notification" in window && Notification.permission === "granted") {
        const notification = new Notification("Prayer Time Reminder", {
          body: `${prayerName} prayer will start in ${minutesLeft} minute${
            minutesLeft === 1 ? "" : "s"
          }.`,
          icon: "/favicon.ico",
          tag: "prayer-reminder",
        });
      }
    },
    []
  );

  // Function to set location (country and city)
  const setLocation = useCallback((countryCode: string, cityCode: string) => {
    setCountry(countryCode);
    setCity(cityCode);

    // Set city name
    setCityName(cityCode);

    // Set country name
    switch (countryCode) {
      case "XK":
        setCountryName("Kosovo");
        break;
      case "AL":
        setCountryName("Albania");
        break;
      case "MK":
        setCountryName("North Macedonia");
        break;
      default:
        setCountryName("Kosovo");
    }
  }, []);

  // Function to update reminder settings
  const updateReminderSettings = useCallback(
    (settings: Partial<ReminderSettings>) => {
      setReminderSettings((prev) => {
        const newSettings = { ...prev, ...settings };
        localStorage.setItem("reminderSettings", JSON.stringify(newSettings));
        return newSettings;
      });
    },
    []
  );

  // Function to sync time with multiple server sources for redundancy
  const syncTime = useCallback(async () => {
    try {
      // Store local time as fallback
      const localTime = new Date().getTime();

      // Try multiple time sources with fallback
      let serverTime: number | null = null;
      let timeDifference = 0;
      let sourceIndex = syncTimeRetryCount.current % timeSources.current.length;

      // Use the current source based on retry count
      const timeSource = timeSources.current[sourceIndex];

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

        let response;

        if (timeSource.includes("worldtimeapi")) {
          response = await fetch(timeSource, { signal: controller.signal });
          if (response.ok) {
            const data = await response.json();
            serverTime = new Date(data.utc_datetime).getTime();
          }
        } else if (timeSource.includes("timeZone")) {
          response = await fetch(timeSource, { signal: controller.signal });
          if (response.ok) {
            const data = await response.json();
            serverTime = new Date(data.dateTime).getTime();
          }
        } else if (timeSource.includes("coordinate")) {
          // Try to get user's coordinates for more accurate time
          let latitude = 0,
            longitude = 0;
          if (navigator.geolocation) {
            const position = await new Promise<GeolocationPosition>(
              (resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                  timeout: 2000,
                  maximumAge: 600000, // 10 minutes
                });
              }
            ).catch(() => null);

            if (position) {
              latitude = position.coords.latitude;
              longitude = position.coords.longitude;
            }
          }

          response = await fetch(
            `${timeSource}?latitude=${latitude}&longitude=${longitude}`,
            { signal: controller.signal }
          );

          if (response.ok) {
            const data = await response.json();
            serverTime = new Date(data.dateTime).getTime();
          }
        }

        clearTimeout(timeoutId);
      } catch (err) {
        console.log(`Failed to fetch time from ${timeSource}`);
        syncTimeRetryCount.current++;

        // Try next time source immediately if this one failed
        if (syncTimeRetryCount.current < timeSources.current.length * 3) {
          return syncTime();
        }
      }

      if (serverTime) {
        const clientTime = new Date().getTime();
        timeDifference = serverTime - clientTime;

        // Only apply time difference if it's significant (>1 second)
        if (Math.abs(timeDifference) > 1000) {
          console.log(`Time synchronized. Difference: ${timeDifference}ms`);
          setTimeDiff(timeDifference);

          // Store time diff in localStorage for service worker
          localStorage.setItem("timeDiff", timeDifference.toString());

          // Reset retry count on success
          syncTimeRetryCount.current = 0;

          return serverTime;
        }
      }

      // Fallback to local time if all else fails
      return localTime;
    } catch (error) {
      console.log("Using local time due to sync error:", error);
      return new Date().getTime();
    }
  }, []);

  // Function to get prayer times
  const fetchPrayerTimes = useCallback(async () => {
    if (!country || !city) return;

    setLoading(true);
    try {
      // Use the current date for the API request
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1; // JavaScript months are 0-indexed
      const day = now.getDate();

      // First try to fetch from onehadith.org API which is used by takvimi-ks.com
      try {
        const timestamp = Math.floor(Date.now() / 1000);
        const response = await fetch(
          `https://onehadith.org/api/random?lan=al&country=${country}&timestamp=${timestamp}`
        );

        if (response.ok) {
          const data = await response.json();

          // Format the prayer times
          const times: PrayerTimes = {
            Fajr: data.timings.imsak, // Imsak is used for Fajr in this API
            Sunrise: data.timings.sunrise || "06:00",
            Dhuhr: data.timings.dhuhr,
            Asr: data.timings.asr,
            Maghrib: data.timings.maghrib,
            Isha: data.timings.isha,
          };

          // Add 30 minutes to Fajr to get the actual Sabahu time
          const [fajrHour, fajrMinute] = times.Fajr.split(":").map(Number);
          let newMinutes = fajrMinute + 30;
          let newHours = fajrHour;

          if (newMinutes >= 60) {
            newHours += 1;
            newMinutes -= 60;
          }

          times.Fajr = `${String(newHours).padStart(2, "0")}:${String(
            newMinutes
          ).padStart(2, "0")}`;

          setPrayerTimes(times);
          setLoading(false);

          // Register service worker for background notifications
          registerBackgroundSync(times);

          return;
        }
      } catch (error) {
        console.log(
          "Error fetching from onehadith.org, falling back to aladhan.com"
        );
      }

      // Fallback to aladhan.com API
      const response = await fetch(
        `https://api.aladhan.com/v1/calendarByCity/${year}/${month}?city=${city}&country=${
          country === "XK"
            ? "Kosovo"
            : country === "AL"
            ? "Albania"
            : "North Macedonia"
        }&method=4&adjustment=1`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch prayer times");
      }

      const data = await response.json();

      // Find today's data
      const todayData = data.data.find(
        (item: any) => parseInt(item.date.gregorian.day) === day
      );

      if (!todayData) {
        throw new Error("Could not find today's prayer times");
      }

      // Format the prayer times
      const times: PrayerTimes = {
        Fajr: todayData.timings.Fajr.split(" ")[0],
        Sunrise: todayData.timings.Sunrise.split(" ")[0],
        Dhuhr: todayData.timings.Dhuhr.split(" ")[0],
        Asr: todayData.timings.Asr.split(" ")[0],
        Maghrib: todayData.timings.Maghrib.split(" ")[0],
        Isha: todayData.timings.Isha.split(" ")[0],
      };

      setPrayerTimes(times);
      setLoading(false);

      // Register service worker for background notifications
      registerBackgroundSync(times);
    } catch (error) {
      console.error("Error fetching prayer times:", error);
      setLoading(false);
    }
  }, [country, city]);

  // Register service worker for background notifications
  const registerBackgroundSync = useCallback(
    (times: PrayerTimes) => {
      if ("serviceWorker" in navigator) {
        // Store prayer times in localStorage for service worker access
        localStorage.setItem("prayerTimes", JSON.stringify(times));
        localStorage.setItem("lastUpdated", new Date().toISOString());

        // Send data directly to service worker if already registered
        navigator.serviceWorker.ready.then((registration) => {
          navigator.serviceWorker.controller?.postMessage({
            type: "STORE_DATA",
            key: "prayerTimes",
            value: JSON.stringify(times),
          });

          // Also send reminder settings
          navigator.serviceWorker.controller?.postMessage({
            type: "STORE_DATA",
            key: "reminderSettings",
            value: JSON.stringify(reminderSettings),
          });

          // Send time difference to service worker
          navigator.serviceWorker.controller?.postMessage({
            type: "STORE_DATA",
            key: "timeDiff",
            value: timeDiff.toString(),
          });
        });

        // Register or update service worker
        navigator.serviceWorker
          .register("/service-worker.js")
          .then((registration) => {
            console.log(
              "Service Worker registered with scope:",
              registration.scope
            );
          })
          .catch((error) => {
            console.error("Service Worker registration failed:", error);
          });
      }
    },
    [reminderSettings, timeDiff]
  );

  // Calculate next prayer and time until next prayer with high precision
  const calculateNextPrayer = useCallback(() => {
    if (!prayerTimes) return;

    // Get current time with server time adjustment
    const now = new Date(Date.now() + timeDiff);

    // Calculate current time in milliseconds since start of day
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentSecond = now.getSeconds();
    const currentMs = now.getMilliseconds();

    const currentTimeMs =
      currentHour * 3600000 +
      currentMinute * 60000 +
      currentSecond * 1000 +
      currentMs;

    // Format current time
    setCurrentTime(
      `${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(
        2,
        "0"
      )}:${String(currentSecond).padStart(2, "0")}`
    );

    // Convert prayer times to milliseconds since start of day for more accurate comparison
    const prayerTimesMs: { [key: string]: number } = {};
    let earliestPrayer: string | null = null;
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
    let nextPrayerName: string | null = null;
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

    // Only update UI if the next prayer changed
    if (nextPrayerName !== lastPrayerRef.current) {
      setNextPrayer(nextPrayerName);
      lastPrayerRef.current = nextPrayerName;
      setReminderSent(false); // Reset reminder when prayer changes
    }

    // Calculate time until next prayer with high precision
    if (nextPrayerName) {
      let msUntilNextPrayer = minDiffMs;

      // Handle edge case when prayer is tomorrow
      if (msUntilNextPrayer > 24 * 3600000) {
        msUntilNextPrayer = msUntilNextPrayer % (24 * 3600000);
      }

      const hoursLeft = Math.floor(msUntilNextPrayer / 3600000);
      const minutesLeft = Math.floor((msUntilNextPrayer % 3600000) / 60000);
      const secondsLeft = Math.floor((msUntilNextPrayer % 60000) / 1000);

      const formattedTime = `${String(hoursLeft).padStart(2, "0")}:${String(
        minutesLeft
      ).padStart(2, "0")}:${String(secondsLeft).padStart(2, "0")}`;

      setTimeUntilNextPrayer(formattedTime);

      // Extract prayer time components
      const [nextHour, nextMinute] = prayerTimes[nextPrayerName]
        .split(":")
        .map(Number);

      // Check if it's prayer time with high precision
      const isPrayerTime =
        msUntilNextPrayer === 0 ||
        (hoursLeft === 0 && minutesLeft === 0 && secondsLeft === 0);

      if (isPrayerTime && !audioPlaying) {
        playAdhan(nextPrayerName);
        setReminderSent(false); // Reset reminder flag for next prayer
      }

      // Check if it's time for reminder with high precision
      const msUntilReminderTime = reminderSettings.minutesBefore * 60000;

      if (
        reminderSettings.enabled &&
        !reminderSent &&
        msUntilNextPrayer > 0 &&
        msUntilNextPrayer <= msUntilReminderTime
      ) {
        const minutesLeft = Math.ceil(msUntilNextPrayer / 60000);
        sendReminderNotification(nextPrayerName, minutesLeft);
        setReminderSent(true);
      }
    } else {
      setTimeUntilNextPrayer(null);
    }
  }, [
    prayerTimes,
    timeDiff,
    audioPlaying,
    reminderSettings,
    reminderSent,
    playAdhan,
    sendReminderNotification,
  ]);

  // Request notification permission
  useEffect(() => {
    if (
      "Notification" in window &&
      Notification.permission !== "granted" &&
      Notification.permission !== "denied"
    ) {
      Notification.requestPermission();
    }

    // Load reminder settings from localStorage
    const savedSettings = localStorage.getItem("reminderSettings");
    if (savedSettings) {
      try {
        setReminderSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error("Error parsing reminder settings:", e);
      }
    }
  }, []);

  // Initial time sync and set up periodic sync
  useEffect(() => {
    // Do immediate time sync on component mount
    syncTime();

    // Sync time every 30 minutes (more frequent than before)
    const syncInterval = setInterval(syncTime, 30 * 60 * 1000);

    return () => clearInterval(syncInterval);
  }, [syncTime]);

  // Fetch prayer times when location changes
  useEffect(() => {
    if (country && city) {
      fetchPrayerTimes();
    }
  }, [country, city, fetchPrayerTimes]);

  // Update prayer times calculation with shorter interval for more accuracy
  useEffect(() => {
    // Use requestAnimationFrame for smoother updates
    let frameId: number;
    let lastUpdate = 0;

    const updateFrame = (timestamp: number) => {
      // Update at most every 500ms for efficiency
      if (timestamp - lastUpdate >= 500) {
        calculateNextPrayer();
        lastUpdate = timestamp;
      }

      frameId = requestAnimationFrame(updateFrame);
    };

    frameId = requestAnimationFrame(updateFrame);

    return () => cancelAnimationFrame(frameId);
  }, [calculateNextPrayer]);

  // Set up periodic background refresh for prayer times
  useEffect(() => {
    // Refresh prayer times every 6 hours
    const refreshInterval = setInterval(() => {
      fetchPrayerTimes();
    }, 6 * 60 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, [fetchPrayerTimes]);

  // Update service worker whenever prayer times or settings change
  useEffect(() => {
    if (prayerTimes && "serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then(() => {
        registerBackgroundSync(prayerTimes);
      });
    }
  }, [prayerTimes, reminderSettings, registerBackgroundSync]);

  return {
    prayerTimes,
    nextPrayer,
    timeUntilNextPrayer,
    currentTime,
    loading,
    countryName,
    cityName,
    setLocation,
    reminderSettings,
    updateReminderSettings,
  };
}
