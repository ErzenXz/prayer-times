"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Clock, Volume2, VolumeX, MapPin, Bell, Info } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import CountrySelector from "@/components/country-selector"
import PrayerTimeCard from "@/components/prayer-time-card"
import NextPrayerCountdown from "@/components/next-prayer-countdown"
import ReminderSettings from "@/components/reminder-settings"
import { usePrayerTimes } from "@/hooks/use-prayer-times"
import { motion, AnimatePresence } from "framer-motion"

export default function Home() {
  const [showCountrySelector, setShowCountrySelector] = useState(true)
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [selectedCity, setSelectedCity] = useState<string | null>(null)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const { toast } = useToast()

  const {
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
  } = usePrayerTimes()

  useEffect(() => {
    // Check if country and city are already selected in localStorage
    const savedCountry = localStorage.getItem("selectedCountry")
    const savedCity = localStorage.getItem("selectedCity")

    if (savedCountry && savedCity) {
      setSelectedCountry(savedCountry)
      setSelectedCity(savedCity)
      setLocation(savedCountry, savedCity)
      setShowCountrySelector(false)
    }

    // Check audio preference
    const audioPreference = localStorage.getItem("audioEnabled")
    if (audioPreference !== null) {
      setAudioEnabled(audioPreference === "true")
    }

    // Request notification permission
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          toast({
            title: "Notifications Enabled",
            description: "You will receive notifications for prayer times.",
          })
        }
      })
    }

    // Register service worker for background notifications
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/service-worker.js")
        .then((registration) => {
          console.log("Service Worker registered with scope:", registration.scope)
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error)
        })
    }
  }, [setLocation, toast])

  const handleLocationSelect = (country: string, city: string) => {
    setSelectedCountry(country)
    setSelectedCity(city)
    setLocation(country, city)
    localStorage.setItem("selectedCountry", country)
    localStorage.setItem("selectedCity", city)
    setShowCountrySelector(false)

    toast({
      title: "Location Selected",
      description: `Prayer times for ${city}, ${country === "XK" ? "Kosovo" : country === "AL" ? "Albania" : "North Macedonia"} will be displayed.`,
    })
  }

  const toggleAudio = () => {
    const newState = !audioEnabled
    setAudioEnabled(newState)
    localStorage.setItem("audioEnabled", String(newState))

    toast({
      title: newState ? "Audio Enabled" : "Audio Disabled",
      description: newState
        ? "You will hear the adhan when prayer time starts."
        : "You will not hear the adhan when prayer time starts.",
    })
  }

  const resetLocation = () => {
    setShowCountrySelector(true)
    setSelectedCountry(null)
    setSelectedCity(null)
    localStorage.removeItem("selectedCountry")
    localStorage.removeItem("selectedCity")
  }

  if (showCountrySelector) {
    return <CountrySelector onSelect={handleLocationSelect} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 dark:from-background dark:via-background dark:to-background/80">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-between items-center mb-8"
        >
          <div className="flex items-center gap-2 bg-card/50 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm">
            <MapPin className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-medium">
              {cityName}, {countryName}
            </h2>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleAudio}
              title={audioEnabled ? "Disable adhan sound" : "Enable adhan sound"}
              className="rounded-full bg-card/50 backdrop-blur-sm shadow-sm"
            >
              {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={resetLocation}
              title="Change location"
              className="rounded-full bg-card/50 backdrop-blur-sm shadow-sm"
            >
              <MapPin className="h-4 w-4" />
            </Button>
          </div>
        </motion.header>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <NextPrayerCountdown
            nextPrayer={nextPrayer}
            timeUntilNextPrayer={timeUntilNextPrayer}
            currentTime={currentTime}
            loading={loading}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-8"
        >
          <Tabs defaultValue="daily" className="w-full">
            <TabsList className="grid w-full grid-cols-3 rounded-full p-1 bg-muted/50 backdrop-blur-sm">
              <TabsTrigger
                value="daily"
                className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Clock className="h-4 w-4 mr-2" />
                Daily Times
              </TabsTrigger>
              <TabsTrigger
                value="reminders"
                className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Bell className="h-4 w-4 mr-2" />
                Reminders
              </TabsTrigger>
              <TabsTrigger
                value="info"
                className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Info className="h-4 w-4 mr-2" />
                Information
              </TabsTrigger>
            </TabsList>

            <AnimatePresence mode="wait">
              <TabsContent value="daily" className="mt-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  {prayerTimes &&
                    Object.entries(prayerTimes).map(([name, time], index) => (
                      <motion.div
                        key={name}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <PrayerTimeCard name={name} time={time} isNext={nextPrayer === name} />
                      </motion.div>
                    ))}
                </motion.div>
              </TabsContent>

              <TabsContent value="reminders" className="mt-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <ReminderSettings reminderSettings={reminderSettings} onUpdate={updateReminderSettings} />
                </motion.div>
              </TabsContent>

              <TabsContent value="info" className="mt-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="overflow-hidden border-none shadow-lg bg-card/80 backdrop-blur-sm">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <h3 className="text-xl font-semibold flex items-center gap-2">
                          <Info className="h-5 w-5 text-primary" />
                          About Prayer Times
                        </h3>
                        <p className="text-muted-foreground">
                          Prayer times are calculated using the same method as takvimi-ks.com for maximum accuracy in
                          the Balkans region.
                        </p>
                        <p className="text-muted-foreground">
                          The adhan will play automatically when it&apos;s time for prayer if audio is enabled.
                        </p>
                        <p className="text-muted-foreground">
                          Notifications will work even when the browser is closed or the app is not active.
                        </p>

                        <div className="mt-6 p-4 border border-primary/20 rounded-lg bg-primary/5 dark:bg-primary/10">
                          <p className="text-sm italic text-center">
                            &quot;Indeed, prayer has been decreed upon the believers a decree of specified times.&quot;
                            [Quran 4:103]
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>
            </AnimatePresence>
          </Tabs>
        </motion.div>
      </div>
    </div>
  )
}

