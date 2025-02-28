"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface NextPrayerCountdownProps {
  nextPrayer: string | null;
  timeUntilNextPrayer: string | null;
  currentTime: string;
  loading: boolean;
}

export default function NextPrayerCountdown({ 
  nextPrayer, 
  timeUntilNextPrayer, 
  currentTime,
  loading
}: NextPrayerCountdownProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // If the time until next prayer is very short (less than 1 minute), trigger animation
    if (timeUntilNextPrayer && timeUntilNextPrayer.startsWith("00:00:")) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 10000); // Animation lasts for 10 seconds
    }
  }, [timeUntilNextPrayer]);

  const getLocalizedName = (name: string | null) => {
    if (!name) return "";
    
    switch (name) {
      case "Fajr":
        return "Fajr (Sabahu)";
      case "Sunrise":
        return "Sunrise (Lindja)";
      case "Dhuhr":
        return "Dhuhr (Dreka)";
      case "Asr":
        return "Asr (Ikindia)";
      case "Maghrib":
        return "Maghrib (Akshami)";
      case "Isha":
        return "Isha (Jacia)";
      default:
        return name;
    }
  };

  return (
    <Card className={`overflow-hidden ${isAnimating ? "prayer-time-alert" : ""}`}>
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="text-2xl font-bold">{currentTime}</div>
          
          {loading ? (
            <div className="animate-pulse flex flex-col items-center space-y-4">
              <div className="h-4 bg-muted rounded w-48"></div>
              <div className="h-8 bg-muted rounded w-32"></div>
            </div>
          ) : (
            <>
              <div className="text-lg text-muted-foreground">
                {nextPrayer ? `Next Prayer: ${getLocalizedName(nextPrayer)}` : "All prayers completed for today"}
              </div>
              
              <div className="text-4xl font-bold mt-2 flex items-center gap-2">
                <Clock className="h-6 w-6" />
                {timeUntilNextPrayer || "—"}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}