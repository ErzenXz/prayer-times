"use client"

import { Card, CardContent } from "@/components/ui/card"
import { useEffect, useState, useRef } from "react"
import { Clock, Bell } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface NextPrayerCountdownProps {
  nextPrayer: string | null
  timeUntilNextPrayer: string | null
  currentTime: string
  loading: boolean
}

export default function NextPrayerCountdown({
  nextPrayer,
  timeUntilNextPrayer,
  currentTime,
  loading,
}: NextPrayerCountdownProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [isLastThirtySeconds, setIsLastThirtySeconds] = useState(false)
  const [timeComponents, setTimeComponents] = useState<{ hours: string; minutes: string; seconds: string }>({
    hours: "00",
    minutes: "00",
    seconds: "00",
  })
  const timerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!timeUntilNextPrayer) return

    // Parse the time components
    const [hours, minutes, seconds] = timeUntilNextPrayer.split(":").map(String)
    setTimeComponents({ hours, minutes, seconds })

    // Check if we're in the last 30 seconds
    const totalSeconds = Number.parseInt(hours) * 3600 + Number.parseInt(minutes) * 60 + Number.parseInt(seconds)
    setIsLastThirtySeconds(totalSeconds <= 30 && totalSeconds > 0)

    // If the time until next prayer is very short (less than 10 seconds), trigger animation
    if (timeUntilNextPrayer.startsWith("00:00:") && Number.parseInt(seconds) < 10) {
      setIsAnimating(true)
      setTimeout(() => setIsAnimating(false), 10000) // Animation lasts for 10 seconds
    }
  }, [timeUntilNextPrayer])

  const getLocalizedName = (name: string | null) => {
    if (!name) return ""

    switch (name) {
      case "Fajr":
        return "Fajr (Sabahu)"
      case "Sunrise":
        return "Sunrise (Lindja)"
      case "Dhuhr":
        return "Dhuhr (Dreka)"
      case "Asr":
        return "Asr (Ikindia)"
      case "Maghrib":
        return "Maghrib (Akshami)"
      case "Isha":
        return "Isha (Jacia)"
      default:
        return name
    }
  }

  return (
    <Card className={`overflow-hidden transition-all duration-300 ${isAnimating ? "prayer-time-alert" : ""}`}>
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-2xl font-bold flex items-center gap-2"
          >
            <Clock className="h-5 w-5 text-primary" />
            {currentTime}
          </motion.div>

          {loading ? (
            <div className="space-y-6 w-full">
              <div className="flex flex-col items-center space-y-2">
                <div className="h-5 bg-muted/60 rounded w-48 animate-pulse"></div>
                <div className="h-10 bg-muted/60 rounded-lg w-64 animate-pulse"></div>
              </div>
              <div className="grid grid-cols-3 gap-4 w-full max-w-xs mx-auto">
                <div className="h-16 bg-muted/40 rounded-lg animate-pulse"></div>
                <div className="h-16 bg-muted/40 rounded-lg animate-pulse"></div>
                <div className="h-16 bg-muted/40 rounded-lg animate-pulse"></div>
              </div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={`prayer-${nextPrayer}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="w-full"
              >
                <div className="text-lg text-muted-foreground flex items-center justify-center gap-2 mb-4">
                  {nextPrayer ? (
                    <>
                      <Bell className="h-4 w-4 text-primary" />
                      <span>Next Prayer: {getLocalizedName(nextPrayer)}</span>
                    </>
                  ) : (
                    "All prayers completed for today"
                  )}
                </div>

                {timeUntilNextPrayer && (
                  <div
                    ref={timerRef}
                    className={`transition-all duration-700 ease-in-out ${isLastThirtySeconds ? "scale-125 my-6" : ""}`}
                  >
                    <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
                      <TimeUnit label="Hours" value={timeComponents.hours} />
                      <TimeUnit label="Minutes" value={timeComponents.minutes} />
                      <TimeUnit label="Seconds" value={timeComponents.seconds} highlight={isLastThirtySeconds} />
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface TimeUnitProps {
  label: string
  value: string
  highlight?: boolean
}

function TimeUnit({ label, value, highlight = false }: TimeUnitProps) {
  return (
    <div className={`flex flex-col items-center ${highlight ? "text-primary" : ""}`}>
      <div
        className={`text-3xl md:text-4xl font-bold w-full py-2 rounded-lg ${
          highlight ? "bg-primary/10 text-primary animate-pulse" : "bg-muted/30"
        }`}
      >
        {value}
      </div>
      <div className="text-xs mt-1 text-muted-foreground">{label}</div>
    </div>
  )
}

