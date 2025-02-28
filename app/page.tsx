"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Clock, 
  Volume2, 
  VolumeX, 
  MapPin, 
  Moon, 
  Sun, 
  Sunrise, 
  Sunset,
  Bell
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CountrySelector from "@/components/country-selector";
import PrayerTimeCard from "@/components/prayer-time-card";
import NextPrayerCountdown from "@/components/next-prayer-countdown";
import ReminderSettings from "@/components/reminder-settings";
import { usePrayerTimes } from "@/hooks/use-prayer-times";

export default function Home() {
  const [showCountrySelector, setShowCountrySelector] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const { toast } = useToast();
  
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
    updateReminderSettings
  } = usePrayerTimes();

  useEffect(() => {
    // Check if country and city are already selected in localStorage
    const savedCountry = localStorage.getItem("selectedCountry");
    const savedCity = localStorage.getItem("selectedCity");
    
    if (savedCountry && savedCity) {
      setSelectedCountry(savedCountry);
      setSelectedCity(savedCity);
      setLocation(savedCountry, savedCity);
      setShowCountrySelector(false);
    }
    
    // Check audio preference
    const audioPreference = localStorage.getItem("audioEnabled");
    if (audioPreference !== null) {
      setAudioEnabled(audioPreference === "true");
    }
    
    // Request notification permission
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          toast({
            title: "Notifications Enabled",
            description: "You will receive notifications for prayer times.",
          });
        }
      });
    }
    
    // Register service worker for background notifications
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          console.log('Service Worker registered with scope:', registration.scope);
          
          // Register for background sync if supported
          if ('sync' in registration) {
            navigator.serviceWorker.ready.then(registration => {
              // Type assertion for Background Sync API
              (registration as any).sync.register('sync-prayer-times')
                .then(() => console.log('Background sync registered!'))
                .catch((err: any) => console.error('Background sync registration failed:', err));
            });
          }
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, [setLocation, toast]);

  const handleLocationSelect = (country: string, city: string) => {
    setSelectedCountry(country);
    setSelectedCity(city);
    setLocation(country, city);
    localStorage.setItem("selectedCountry", country);
    localStorage.setItem("selectedCity", city);
    setShowCountrySelector(false);
    
    toast({
      title: "Location Selected",
      description: `Prayer times for ${city}, ${country === "XK" ? "Kosovo" : country === "AL" ? "Albania" : "North Macedonia"} will be displayed.`,
    });
  };

  const toggleAudio = () => {
    const newState = !audioEnabled;
    setAudioEnabled(newState);
    localStorage.setItem("audioEnabled", String(newState));
    
    toast({
      title: newState ? "Audio Enabled" : "Audio Disabled",
      description: newState 
        ? "You will hear the adhan when prayer time starts." 
        : "You will not hear the adhan when prayer time starts.",
    });
  };

  const resetLocation = () => {
    setShowCountrySelector(true);
    setSelectedCountry(null);
    setSelectedCity(null);
    localStorage.removeItem("selectedCountry");
    localStorage.removeItem("selectedCity");
  };

  if (showCountrySelector) {
    return <CountrySelector onSelect={handleLocationSelect} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary dark:from-background dark:to-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-medium">{cityName}, {countryName}</h2>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={toggleAudio}
              title={audioEnabled ? "Disable adhan sound" : "Enable adhan sound"}
            >
              {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={resetLocation}
              title="Change location"
            >
              <MapPin className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <NextPrayerCountdown 
          nextPrayer={nextPrayer} 
          timeUntilNextPrayer={timeUntilNextPrayer} 
          currentTime={currentTime}
          loading={loading}
        />

        <Tabs defaultValue="daily" className="mt-8">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="daily">Daily Times</TabsTrigger>
            <TabsTrigger value="reminders">Reminders</TabsTrigger>
            <TabsTrigger value="info">Information</TabsTrigger>
          </TabsList>
          <TabsContent value="daily" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {prayerTimes && Object.entries(prayerTimes).map(([name, time]) => (
                <PrayerTimeCard 
                  key={name} 
                  name={name} 
                  time={time} 
                  isNext={nextPrayer === name}
                />
              ))}
            </div>
          </TabsContent>
          <TabsContent value="reminders" className="mt-4">
            <ReminderSettings 
              reminderSettings={reminderSettings}
              onUpdate={updateReminderSettings}
            />
          </TabsContent>
          <TabsContent value="info">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">About Prayer Times</h3>
                  <p>Prayer times are calculated using the same method as takvimi-ks.com for maximum accuracy in the Balkans region.</p>
                  <p>The adhan will play automatically when it&apos;s time for prayer if audio is enabled.</p>
                  <p>Notifications will work even when the browser is closed or the app is not active.</p>
                  <p className="text-sm text-muted-foreground italic mt-4">
                  &quot;Indeed, prayer has been decreed upon the believers a decree of specified times.&quot; [Quran 4:103]
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}