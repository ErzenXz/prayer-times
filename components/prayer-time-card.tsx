import { Card, CardContent } from "@/components/ui/card";
import { Clock, Moon, Sun, Sunrise, Sunset } from "lucide-react";

interface PrayerTimeCardProps {
  name: string;
  time: string;
  isNext: boolean;
}

export default function PrayerTimeCard({ name, time, isNext }: PrayerTimeCardProps) {
  const getIcon = () => {
    switch (name) {
      case "Fajr":
        return <Sunrise className="h-5 w-5" />;
      case "Sunrise":
        return <Sun className="h-5 w-5" />;
      case "Dhuhr":
        return <Sun className="h-5 w-5" />;
      case "Asr":
        return <Sun className="h-5 w-5" />;
      case "Maghrib":
        return <Sunset className="h-5 w-5" />;
      case "Isha":
        return <Moon className="h-5 w-5" />;
      default:
        return <Clock className="h-5 w-5" />;
    }
  };

  const getLocalizedName = () => {
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
    <Card className={`${isNext ? "border-primary" : ""}`}>
      <CardContent className="p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          {getIcon()}
          <span className="font-medium">{getLocalizedName()}</span>
        </div>
        <div className="text-lg font-semibold">{time}</div>
        {isNext && (
          <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
            Next
          </div>
        )}
      </CardContent>
    </Card>
  );
}