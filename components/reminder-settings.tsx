"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Bell, BellOff, Check } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { motion } from "framer-motion"

interface ReminderSettingsProps {
  reminderSettings: {
    enabled: boolean
    minutesBefore: number
  }
  onUpdate: (settings: { enabled?: boolean; minutesBefore?: number }) => void
}

export default function ReminderSettings({ reminderSettings, onUpdate }: ReminderSettingsProps) {
  const [enabled, setEnabled] = useState(reminderSettings.enabled)
  const [minutesBefore, setMinutesBefore] = useState(reminderSettings.minutesBefore)
  const [showSaveAnimation, setShowSaveAnimation] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    setEnabled(reminderSettings.enabled)
    setMinutesBefore(reminderSettings.minutesBefore)
  }, [reminderSettings])

  const handleToggleReminder = () => {
    const newState = !enabled
    setEnabled(newState)
    onUpdate({ enabled: newState })

    toast({
      title: newState ? "Reminders Enabled" : "Reminders Disabled",
      description: newState
        ? `You will receive a reminder ${minutesBefore} minutes before each prayer.`
        : "You will not receive reminders before prayers.",
    })

    // Request notification permission if enabling reminders
    if (newState && "Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission()
    }
  }

  const handleMinutesChange = (value: number[]) => {
    const minutes = value[0]
    setMinutesBefore(minutes)
    onUpdate({ minutesBefore: minutes })

    // Show save animation
    setShowSaveAnimation(true)
    setTimeout(() => setShowSaveAnimation(false), 1500)

    if (enabled) {
      toast({
        title: "Reminder Time Updated",
        description: `You will now receive reminders ${minutes} minutes before each prayer.`,
      })
    }
  }

  return (
    <Card className="overflow-hidden border-none shadow-lg bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          {enabled ? (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-primary">
              <Bell className="h-5 w-5" />
            </motion.div>
          ) : (
            <BellOff className="h-5 w-5" />
          )}
          Prayer Reminders
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="reminder-toggle" className="flex items-center gap-2 cursor-pointer">
              Enable reminders
              <span className="text-xs text-muted-foreground ml-2">(Receive notifications before prayer times)</span>
            </Label>
            <Switch
              id="reminder-toggle"
              checked={enabled}
              onCheckedChange={handleToggleReminder}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          <motion.div
            animate={{
              opacity: enabled ? 1 : 0.5,
              scale: enabled ? 1 : 0.98,
            }}
            transition={{ duration: 0.3 }}
            className={enabled ? "pointer-events-auto" : "pointer-events-none"}
          >
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Reminder time</Label>
                <div className="relative">
                  <span className="text-sm font-medium">{minutesBefore} minutes before</span>
                  {showSaveAnimation && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute -right-6 -top-6 bg-primary text-primary-foreground text-xs rounded-full p-1"
                    >
                      <Check className="h-3 w-3" />
                    </motion.div>
                  )}
                </div>
              </div>
              <Slider
                defaultValue={[minutesBefore]}
                min={1}
                max={30}
                step={1}
                onValueChange={handleMinutesChange}
                className="[&>span:first-child]:bg-primary/20 [&>span:first-child]:h-2 [&>span:first-child]:rounded-full [&_[role=slider]]:bg-primary [&_[role=slider]]:border-2 [&_[role=slider]]:border-background [&_[role=slider]]:w-5 [&_[role=slider]]:h-5 [&>span:first-child_span]:bg-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>1 min</span>
                <span>15 min</span>
                <span>30 min</span>
              </div>
            </div>
          </motion.div>

          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            {enabled
              ? "You will receive notifications even when the browser is closed or minimized."
              : "Enable reminders to get notified before prayer times."}
          </div>

          {enabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex justify-center"
            >
              <Button
                variant="outline"
                size="sm"
                className="mt-2 border-primary/20 text-primary hover:bg-primary/10"
                onClick={() => {
                  if ("Notification" in window) {
                    Notification.requestPermission().then((permission) => {
                      if (permission === "granted") {
                        toast({
                          title: "Notifications Enabled",
                          description: "You will receive notifications for prayer times.",
                        })
                      }
                    })
                  }
                }}
              >
                <Bell className="h-4 w-4 mr-2" />
                Test Notification
              </Button>
            </motion.div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

