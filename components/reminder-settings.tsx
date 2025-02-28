"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Bell, BellOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ReminderSettingsProps {
  reminderSettings: {
    enabled: boolean;
    minutesBefore: number;
  };
  onUpdate: (settings: { enabled?: boolean; minutesBefore?: number }) => void;
}

export default function ReminderSettings({ reminderSettings, onUpdate }: ReminderSettingsProps) {
  const [enabled, setEnabled] = useState(reminderSettings.enabled);
  const [minutesBefore, setMinutesBefore] = useState(reminderSettings.minutesBefore);
  const { toast } = useToast();

  useEffect(() => {
    setEnabled(reminderSettings.enabled);
    setMinutesBefore(reminderSettings.minutesBefore);
  }, [reminderSettings]);

  const handleToggleReminder = () => {
    const newState = !enabled;
    setEnabled(newState);
    onUpdate({ enabled: newState });
    
    toast({
      title: newState ? "Reminders Enabled" : "Reminders Disabled",
      description: newState 
        ? `You will receive a reminder ${minutesBefore} minutes before each prayer.` 
        : "You will not receive reminders before prayers.",
    });
    
    // Request notification permission if enabling reminders
    if (newState && "Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  };

  const handleMinutesChange = (value: number[]) => {
    const minutes = value[0];
    setMinutesBefore(minutes);
    onUpdate({ minutesBefore: minutes });
    
    if (enabled) {
      toast({
        title: "Reminder Time Updated",
        description: `You will now receive reminders ${minutes} minutes before each prayer.`,
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {enabled ? <Bell className="h-5 w-5 text-primary" /> : <BellOff className="h-5 w-5" />}
          Prayer Reminders
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="reminder-toggle" className="flex items-center gap-2">
              Enable reminders
            </Label>
            <Switch 
              id="reminder-toggle" 
              checked={enabled} 
              onCheckedChange={handleToggleReminder} 
            />
          </div>
          
          <div className={enabled ? "opacity-100" : "opacity-50 pointer-events-none"}>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Reminder time</Label>
                <span className="text-sm font-medium">{minutesBefore} minutes before</span>
              </div>
              <Slider
                defaultValue={[minutesBefore]}
                min={1}
                max={30}
                step={1}
                onValueChange={handleMinutesChange}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1 min</span>
                <span>15 min</span>
                <span>30 min</span>
              </div>
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground">
            {enabled 
              ? "You will receive notifications even when the browser is closed."
              : "Enable reminders to get notified before prayer times."}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}