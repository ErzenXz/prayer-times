"use client";

import { useState, useEffect, useCallback } from "react";

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

  // Function to sync time with server
  const syncTime = useCallback(async () => {
    try {
      // Use local time as fallback in case API fails
      const localTime = new Date().getTime();

      // Try to fetch time from API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch("https://worldtimeapi.org/api/ip", {
        signal: controller.signal,
      }).catch((err) => {
        console.log("Using local time due to API error");
        return null;
      });

      clearTimeout(timeoutId);

      if (!response || !response.ok) {
        return localTime;
      }

      const data = await response.json();
      const serverTime = new Date(data.utc_datetime);
      const clientTime = new Date();
      const timeDifference = serverTime.getTime() - clientTime.getTime();

      setTimeDiff(timeDifference);
      return serverTime.getTime();
    } catch (error) {
      console.log("Using local time due to sync error");
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
  const registerBackgroundSync = useCallback((times: PrayerTimes) => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      // Store prayer times in localStorage for service worker access
      localStorage.setItem("prayerTimes", JSON.stringify(times));
      localStorage.setItem("lastUpdated", new Date().toISOString());

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
  }, []);

  // Calculate next prayer and time until next prayer
  const calculateNextPrayer = useCallback(() => {
    if (!prayerTimes) return;

    const now = new Date(Date.now() + timeDiff);
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentSecond = now.getSeconds();

    // Format current time
    setCurrentTime(
      `${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(
        2,
        "0"
      )}:${String(currentSecond).padStart(2, "0")}`
    );

    // Find the next prayer
    let nextPrayerName: string | null = null;
    let minDiff = Infinity;
    let minutesUntilNextPrayer = Infinity;

    Object.entries(prayerTimes).forEach(([name, timeStr]) => {
      const [prayerHour, prayerMinute] = timeStr.split(":").map(Number);

      // Calculate time difference in minutes
      let diff =
        (prayerHour - currentHour) * 60 + (prayerMinute - currentMinute);

      // If the prayer time has passed today, add 24 hours
      if (diff < 0) {
        diff += 24 * 60;
      }

      if (diff < minDiff) {
        minDiff = diff;
        nextPrayerName = name;
        minutesUntilNextPrayer = diff;
      }
    });

    setNextPrayer(nextPrayerName);

    // Calculate time until next prayer
    if (nextPrayerName) {
      const [nextHour, nextMinute] = prayerTimes[nextPrayerName]
        .split(":")
        .map(Number);

      let diffHours = nextHour - currentHour;
      let diffMinutes = nextMinute - currentMinute;
      let diffSeconds = 0 - currentSecond;

      if (diffSeconds < 0) {
        diffSeconds += 60;
        diffMinutes--;
      }

      if (diffMinutes < 0) {
        diffMinutes += 60;
        diffHours--;
      }

      if (diffHours < 0) {
        diffHours += 24;
      }

      setTimeUntilNextPrayer(
        `${String(diffHours).padStart(2, "0")}:${String(diffMinutes).padStart(
          2,
          "0"
        )}:${String(diffSeconds).padStart(2, "0")}`
      );

      // Check if it's prayer time and play adhan
      if (
        diffHours === 0 &&
        diffMinutes === 0 &&
        diffSeconds === 0 &&
        !audioPlaying
      ) {
        playAdhan(nextPrayerName);
        setReminderSent(false); // Reset reminder flag for next prayer
      }

      // Check if it's time for reminder
      if (
        reminderSettings.enabled &&
        !reminderSent &&
        diffHours === 0 &&
        diffMinutes <= reminderSettings.minutesBefore &&
        diffMinutes > 0
      ) {
        sendReminderNotification(nextPrayerName, diffMinutes);
        setReminderSent(true);
      }
    } else {
      setTimeUntilNextPrayer(null);
    }
  }, [prayerTimes, timeDiff, audioPlaying, reminderSettings, reminderSent]);

  // Send reminder notification
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

  // Play adhan sound
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

  // Sync time on component mount
  useEffect(() => {
    syncTime();

    // Sync time every 5 minutes
    const syncInterval = setInterval(syncTime, 5 * 60 * 1000);

    return () => clearInterval(syncInterval);
  }, [syncTime]);

  // Fetch prayer times when location changes
  useEffect(() => {
    if (country && city) {
      fetchPrayerTimes();
    }
  }, [country, city, fetchPrayerTimes]);

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      calculateNextPrayer();
    }, 1000);

    return () => clearInterval(interval);
  }, [calculateNextPrayer]);

  // Set up periodic background refresh
  useEffect(() => {
    // Refresh prayer times every 6 hours
    const refreshInterval = setInterval(() => {
      fetchPrayerTimes();
    }, 6 * 60 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, [fetchPrayerTimes]);

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
