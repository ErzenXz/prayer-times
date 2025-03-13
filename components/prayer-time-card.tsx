"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Clock, Moon, Sun, Sunrise, Sunset } from "lucide-react"
import { motion } from "framer-motion"

interface PrayerTimeCardProps {
  name: string
  time: string
  isNext: boolean
}

export default function PrayerTimeCard({ name, time, isNext }: PrayerTimeCardProps) {
  const getIcon = () => {
    switch (name) {
      case "Fajr":
        return <Sunrise className="h-5 w-5" />
      case "Sunrise":
        return <Sun className="h-5 w-5 text-amber-500" />
      case "Dhuhr":
        return <Sun className="h-5 w-5 text-amber-500" />
      case "Asr":
        return <Sun className="h-5 w-5 text-amber-400" />
      case "Maghrib":
        return <Sunset className="h-5 w-5 text-orange-500" />
      case "Isha":
        return <Moon className="h-5 w-5 text-indigo-400" />
      default:
        return <Clock className="h-5 w-5" />
    }
  }

  const getLocalizedName = () => {
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ scale: 1.02 }}
      className="h-full"
    >
      <Card
        className={`h-full transition-all duration-300 ${
          isNext ? "border-primary shadow-lg shadow-primary/10 dark:shadow-primary/5" : "hover:border-primary/50"
        }`}
      >
        <CardContent className="p-4 flex justify-between items-center relative h-full">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${isNext ? "bg-primary/10" : "bg-muted"}`}>{getIcon()}</div>
            <div className="flex flex-col">
              <span className="font-medium">{getLocalizedName()}</span>
              <span className="text-xs text-muted-foreground">Prayer Time</span>
            </div>
          </div>
          <div className="text-lg font-semibold">{time}</div>
          {isNext && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full shadow-md"
            >
              Next
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

